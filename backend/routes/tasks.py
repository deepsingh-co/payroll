from flask import Blueprint, request, jsonify
from extensions import db
from models import Task, Employee, Payroll
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from datetime import datetime

task_bp = Blueprint('tasks', __name__)

@task_bp.route('/', methods=['GET'])
@jwt_required()
def get_all_tasks():
    user_id = get_jwt_identity()
    claims = get_jwt()
    role = claims.get('role')

    if role == 'admin':
        tasks = Task.objects.all()
    else:
        employee = Employee.objects(user_id=user_id).first()
        if not employee:
            return jsonify([]), 200
        tasks = Task.objects(assigned_to=employee.id).all()

    result = []
    for task in tasks:
        assignee = Employee.objects(id=task.assigned_to.id).first() if task.assigned_to else None
        result.append({
            'id': str(task.id),
            'title': task.title,
            'assigned_to': str(task.assigned_to.id) if task.assigned_to else None,
            'assignee_name': assignee.name if assignee else 'Unassigned',
            'complexity_score': task.complexity_score,
            'estimated_hours': task.estimated_hours,
            'actual_hours': task.actual_hours,
            'deadline': task.deadline.isoformat() if task.deadline else None,
            'status': task.status,
            'created_at': task.created_at.isoformat() if task.created_at else None
        })
    return jsonify(result), 200

@task_bp.route('/', methods=['POST'])
@jwt_required()
def assign_task():
    claims = get_jwt()
    if claims.get('role') != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403

    data = request.get_json()
    title = data.get('title')
    assigned_to_id = data.get('assigned_to')
    complexity_score = data.get('complexity_score', 1)
    estimated_hours = data.get('estimated_hours', 1)
    deadline_str = data.get('deadline')

    if not title:
        return jsonify({'error': 'Task title is required'}), 400

    deadline = None
    if deadline_str:
        try:
            deadline = datetime.fromisoformat(deadline_str.replace('Z', '+00:00'))
        except ValueError:
            return jsonify({'error': 'Invalid date format. Use ISO format.'}), 400

    assigned_to = None
    if assigned_to_id:
        assigned_to = Employee.objects(id=assigned_to_id).first()

    task = Task(
        title=title,
        assigned_to=assigned_to,
        complexity_score=complexity_score,
        estimated_hours=estimated_hours,
        deadline=deadline
    )
    task.save()

    return jsonify({
        'id': str(task.id),
        'title': task.title,
        'assigned_to': str(task.assigned_to.id) if task.assigned_to else None,
        'assignee_name': task.assigned_to.name if task.assigned_to else 'Unassigned',
        'status': task.status
    }), 201

@task_bp.route('/my', methods=['GET'])
@jwt_required()
def my_tasks():
    user_id = get_jwt_identity()
    claims = get_jwt()

    employee = Employee.objects(user_id=user_id).first()
    if not employee:
        if claims.get('role') == 'admin':
            tasks = Task.objects.all()
        else:
            return jsonify({'error': 'Employee record not found'}), 404
    else:
        tasks = Task.objects(assigned_to=employee.id).all()

    result = []
    for task in tasks:
        result.append({
            'id': str(task.id),
            'title': task.title,
            'assigned_to': str(task.assigned_to.id) if task.assigned_to else None,
            'complexity_score': task.complexity_score,
            'estimated_hours': task.estimated_hours,
            'actual_hours': task.actual_hours,
            'deadline': task.deadline.isoformat() if task.deadline else None,
            'status': task.status
        })
    return jsonify(result), 200

@task_bp.route('/<string:id>', methods=['PUT'])
@jwt_required()
def update_task_status(id):
    user_id = get_jwt_identity()
    claims = get_jwt()
    task = Task.objects(id=id).first()
    if not task:
        return jsonify({'error': 'Task not found'}), 404

    employee = Employee.objects(user_id=user_id).first()
    if claims.get('role') != 'admin' and (not employee or task.assigned_to.id != employee.id):
        return jsonify({'error': 'Unauthorized'}), 403

    data = request.get_json()
    old_status = task.status
    
    if 'status' in data:
        task.status = data['status']
    if 'actual_hours' in data:
        task.actual_hours = data['actual_hours']
    if 'title' in data and claims.get('role') == 'admin':
        task.title = data['title']
    if 'assigned_to' in data and claims.get('role') == 'admin':
        task.assigned_to = Employee.objects(id=data['assigned_to']).first()

    task.save()

    # Auto salary calculation logic:
    # If task is marked as completed, calculate bonus and update/create payroll record
    if task.status == 'completed' and old_status != 'completed' and task.assigned_to:
        emp = task.assigned_to
        current_month = datetime.utcnow().strftime('%Y-%m')
        
        # Calculate bonus based on complexity and actual hours
        # Formula: complexity * 500 + (estimated - actual) * 100 (if positive)
        bonus_amount = task.complexity_score * 500
        if task.estimated_hours and task.actual_hours:
            if task.estimated_hours > task.actual_hours:
                bonus_amount += (task.estimated_hours - task.actual_hours) * 100
        
        # Find or create payroll record for this month
        payroll = Payroll.objects(employee=emp, month=current_month).first()
        if not payroll:
            payroll = Payroll(
                employee=emp,
                month=current_month,
                basic_salary=emp.salary or 0,
                bonus=bonus_amount,
                tax=0,
                deductions=0
            )
        else:
            payroll.bonus += bonus_amount
        
        payroll.net_salary = (payroll.basic_salary + payroll.bonus) - (payroll.tax + payroll.deductions)
        payroll.save()

    return jsonify({'message': 'Task updated successfully', 'status': task.status}), 200

@task_bp.route('/<string:id>', methods=['DELETE'])
@jwt_required()
def delete_task(id):
    claims = get_jwt()
    if claims.get('role') != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403

    task = Task.objects(id=id).first()
    if not task:
        return jsonify({'error': 'Task not found'}), 404
    
    task.delete()
    return jsonify({'message': 'Task deleted successfully'}), 200

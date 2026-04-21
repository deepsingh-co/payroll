from flask import Blueprint, request, jsonify
from extensions import db
from models import Task, Employee, Payroll
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from datetime import datetime
from mongoengine import Q

task_bp = Blueprint('tasks', __name__)

@task_bp.route('/', methods=['GET'])
@jwt_required()
def get_all_tasks():
    user_id = get_jwt_identity()
    claims = get_jwt()
    role = claims.get('role')

    employee = Employee.objects(user_id=user_id).first()

    if role == 'admin':
        tasks = Task.objects.all()
    else:
        if not employee:
            return jsonify([]), 200
        # Employees see tasks assigned TO them AND tasks assigned BY them (as managers)
        tasks = Task.objects(Q(assigned_to=employee.id) | Q(assigned_by=employee.id)).all()

    result = []
    for task in tasks:
        assignee = Employee.objects(id=task.assigned_to.id).first() if task.assigned_to else None
        assigner = Employee.objects(id=task.assigned_by.id).first() if task.assigned_by else None
        result.append({
            'id': str(task.id),
            'title': task.title,
            'assigned_to': str(task.assigned_to.id) if task.assigned_to else None,
            'assignee_name': assignee.name if assignee else 'Unassigned',
            'assigned_by': str(task.assigned_by.id) if task.assigned_by else None,
            'assigner_name': assigner.name if assigner else 'Admin',
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
    user_id = get_jwt_identity()
    claims = get_jwt()
    role = claims.get('role')
    
    current_employee = Employee.objects(user_id=user_id).first()
    
    # Only admins or team leaders can assign tasks
    is_leader = False
    from models import Team
    if current_employee:
        is_leader = Team.objects(leader=current_employee.id).first() is not None

    if role != 'admin' and not is_leader:
        return jsonify({'error': 'Only admins or team leaders can assign tasks'}), 403

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
        assigned_by=current_employee, # Track who assigned the task
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
        'assigned_by': str(task.assigned_by.id) if task.assigned_by else None,
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
    role = claims.get('role')
    task = Task.objects(id=id).first()
    if not task:
        return jsonify({'error': 'Task not found'}), 404

    employee = Employee.objects(user_id=user_id).first()
    is_admin = role == 'admin'
    is_assigned_employee = employee and task.assigned_to and str(task.assigned_to.id) == str(employee.id)
    is_assigner = employee and task.assigned_by and str(task.assigned_by.id) == str(employee.id)

    if not is_admin and not is_assigned_employee and not is_assigner:
        return jsonify({'error': 'Unauthorized'}), 403

    data = request.get_json()
    old_status = task.status
    new_status = data.get('status')

    # Employees can only submit for review (pending_review)
    # The person who ASSIGNED the task (or an Admin) can verify completion
    if new_status:
        is_assigner = employee and task.assigned_by and str(task.assigned_by.id) == str(employee.id)
        
        if is_admin or is_assigner:
            # Admins or the actual assigner can verify (move to completed / in_progress)
            task.status = new_status
        else:
            # Regular employee can ONLY move to pending_review
            if is_assigned_employee:
                if new_status != 'pending_review':
                    return jsonify({'error': 'You must submit tasks for review before completing them'}), 403
                task.status = new_status
            else:
                return jsonify({'error': 'Unauthorized to change status'}), 403

    if 'actual_hours' in data:
        task.actual_hours = data['actual_hours']
    if 'title' in data and is_admin:
        task.title = data['title']
    if 'assigned_to' in data and is_admin:
        task.assigned_to = Employee.objects(id=data['assigned_to']).first()

    task.save()

    # Auto salary calculation when admin approves completion
    if task.status == 'completed' and old_status != 'completed' and task.assigned_to:
        emp = task.assigned_to
        current_month = datetime.utcnow().strftime('%Y-%m')
        
        bonus_amount = task.complexity_score * 500
        if task.estimated_hours and task.actual_hours:
            if task.estimated_hours > task.actual_hours:
                bonus_amount += (task.estimated_hours - task.actual_hours) * 100
        
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


@task_bp.route('/pending-review', methods=['GET'])
@jwt_required()
def get_pending_review():
    """Admin-only: returns tasks submitted by employees that need approval."""
    claims = get_jwt()
    if claims.get('role') != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403

    tasks = Task.objects(status='pending_review').all()
    result = []
    for task in tasks:
        assignee = task.assigned_to
        result.append({
            'id': str(task.id),
            'title': task.title,
            'assigned_to': str(assignee.id) if assignee else None,
            'assignee_name': assignee.name if assignee else 'Unassigned',
            'complexity_score': task.complexity_score,
            'estimated_hours': task.estimated_hours,
            'actual_hours': task.actual_hours,
            'deadline': task.deadline.isoformat() if task.deadline else None,
            'status': task.status,
            'created_at': task.created_at.isoformat() if task.created_at else None
        })
    return jsonify(result), 200

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

@task_bp.route('/progress', methods=['GET'])
@jwt_required()
def get_progress():
    user_id = get_jwt_identity()
    claims = get_jwt()
    role = claims.get('role')

    now = datetime.utcnow()

    if role == 'admin':
        employees = Employee.objects.all()
        result = []
        for emp in employees:
            tasks = Task.objects(assigned_to=emp.id)
            total = tasks.count()
            completed = tasks.filter(status='completed').count()
            # missed deadline: not completed and deadline has passed
            missed = 0
            for t in tasks:
                if t.status != 'completed' and t.deadline and t.deadline < now:
                    missed += 1
            progress_pct = (completed / total * 100) if total > 0 else 0
            
            # Promotion logic
            promotion = False
            if total > 0 and progress_pct >= 85 and missed == 0:
                promotion = True
                
            result.append({
                'employee_id': str(emp.id),
                'name': emp.name,
                'total_tasks': total,
                'completed_tasks': completed,
                'missed_deadline': missed,
                'progress_percentage': round(progress_pct, 2),
                'promotion_recommended': promotion
            })
        return jsonify(result), 200
    else:
        employee = Employee.objects(user_id=user_id).first()
        if not employee:
            return jsonify({'error': 'Employee record not found'}), 404
        
        tasks = Task.objects(assigned_to=employee.id)
        total = tasks.count()
        completed = tasks.filter(status='completed').count()
        missed = 0
        for t in tasks:
            if t.status != 'completed' and t.deadline and t.deadline < now:
                missed += 1
        progress_pct = (completed / total * 100) if total > 0 else 0
        
        return jsonify({
            'employee_id': str(employee.id),
            'name': employee.name,
            'total_tasks': total,
            'completed_tasks': completed,
            'missed_deadline': missed,
            'progress_percentage': round(progress_pct, 2)
        }), 200


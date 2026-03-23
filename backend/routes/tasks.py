from flask import Blueprint, request, jsonify
from extensions import db
from models import Task, Employee
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
        tasks = Task.query.all()
    else:
        employee = Employee.query.filter_by(user_id=user_id).first()
        if not employee:
            return jsonify([]), 200
        tasks = Task.query.filter_by(assigned_to=employee.id).all()

    result = []
    for task in tasks:
        assignee = Employee.query.get(task.assigned_to) if task.assigned_to else None
        result.append({
            'id': task.id,
            'title': task.title,
            'assigned_to': task.assigned_to,
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
    assigned_to = data.get('assigned_to')
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

    task = Task(
        title=title,
        assigned_to=assigned_to,
        complexity_score=complexity_score,
        estimated_hours=estimated_hours,
        deadline=deadline
    )

    db.session.add(task)
    db.session.commit()

    assignee = Employee.query.get(assigned_to) if assigned_to else None
    return jsonify({
        'id': task.id,
        'title': task.title,
        'assigned_to': task.assigned_to,
        'assignee_name': assignee.name if assignee else 'Unassigned',
        'status': task.status
    }), 201

@task_bp.route('/my', methods=['GET'])
@jwt_required()
def my_tasks():
    user_id = get_jwt_identity()
    claims = get_jwt()

    employee = Employee.query.filter_by(user_id=user_id).first()
    if not employee:
        if claims.get('role') == 'admin':
            tasks = Task.query.all()
        else:
            return jsonify({'error': 'Employee record not found'}), 404
    else:
        tasks = Task.query.filter_by(assigned_to=employee.id).all()

    result = []
    for task in tasks:
        result.append({
            'id': task.id,
            'title': task.title,
            'assigned_to': task.assigned_to,
            'complexity_score': task.complexity_score,
            'estimated_hours': task.estimated_hours,
            'actual_hours': task.actual_hours,
            'deadline': task.deadline.isoformat() if task.deadline else None,
            'status': task.status
        })
    return jsonify(result), 200

@task_bp.route('/<int:id>', methods=['PUT'])
@jwt_required()
def update_task_status(id):
    user_id = get_jwt_identity()
    claims = get_jwt()
    task = Task.query.get_or_404(id)

    employee = Employee.query.filter_by(user_id=user_id).first()
    if claims.get('role') != 'admin' and (not employee or task.assigned_to != employee.id):
        return jsonify({'error': 'Unauthorized'}), 403

    data = request.get_json()

    if 'status' in data:
        task.status = data['status']
    if 'actual_hours' in data:
        task.actual_hours = data['actual_hours']
    if 'title' in data and claims.get('role') == 'admin':
        task.title = data['title']
    if 'assigned_to' in data and claims.get('role') == 'admin':
        task.assigned_to = data['assigned_to']

    db.session.commit()

    return jsonify({'message': 'Task updated successfully', 'status': task.status}), 200

@task_bp.route('/<int:id>', methods=['DELETE'])
@jwt_required()
def delete_task(id):
    claims = get_jwt()
    if claims.get('role') != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403

    task = Task.query.get_or_404(id)
    db.session.delete(task)
    db.session.commit()

    return jsonify({'message': 'Task deleted successfully'}), 200

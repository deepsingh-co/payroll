from flask import Blueprint, request, jsonify
from extensions import db
from models import Leave, Employee
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from datetime import datetime

leave_bp = Blueprint('leaves', __name__)

@leave_bp.route('/', methods=['POST'])
@jwt_required()
def apply_leave():
    user_id = get_jwt_identity()

    employee = Employee.objects(user_id=user_id).first()
    if not employee:
        return jsonify({'error': 'Employee record not found'}), 404

    data = request.get_json()
    leave_type = data.get('type')
    from_date_str = data.get('from_date')
    to_date_str = data.get('to_date')

    if not leave_type or not from_date_str or not to_date_str:
        return jsonify({'error': 'Type, from_date, and to_date are required'}), 400

    try:
        from_date = datetime.fromisoformat(from_date_str.replace('Z', '+00:00'))
        to_date = datetime.fromisoformat(to_date_str.replace('Z', '+00:00'))
    except ValueError:
        return jsonify({'error': 'Invalid date format. Use ISO format.'}), 400

    leave = Leave(
        employee=employee,
        type=leave_type,
        from_date=from_date,
        to_date=to_date,
        status='pending'
    )
    leave.save()

    return jsonify({'message': 'Leave applied successfully', 'id': str(leave.id)}), 201

@leave_bp.route('/', methods=['GET'])
@jwt_required()
def get_leaves():
    user_id = get_jwt_identity()
    claims = get_jwt()
    role = claims.get('role')

    if role == 'admin':
        leaves = Leave.objects.all()
    else:
        employee = Employee.objects(user_id=user_id).first()
        if not employee:
            return jsonify({'error': 'Employee record not found'}), 404
        leaves = Leave.objects(employee=employee.id).all()

    result = []
    for leave in leaves:
        emp = Employee.objects(id=leave.employee.id).first()
        result.append({
            'id': str(leave.id),
            'employee_id': str(leave.employee.id),
            'employee_name': emp.name if emp else 'Unknown',
            'type': leave.type,
            'from_date': leave.from_date.isoformat(),
            'to_date': leave.to_date.isoformat(),
            'status': leave.status
        })
    return jsonify(result), 200

@leave_bp.route('/<string:id>', methods=['PUT'])
@jwt_required()
def approve_leave(id):
    claims = get_jwt()
    if claims.get('role') != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403

    leave = Leave.objects(id=id).first()
    if not leave:
        return jsonify({'error': 'Leave request not found'}), 404
        
    data = request.get_json()

    status = data.get('status')
    if status not in ['approved', 'rejected']:
        return jsonify({'error': 'Invalid status'}), 400

    leave.status = status
    leave.save()

    return jsonify({'message': f'Leave {status} successfully'}), 200

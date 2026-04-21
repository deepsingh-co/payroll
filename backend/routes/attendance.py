from datetime import datetime
from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from extensions import db
from models import Attendance, Employee

attendance_bp = Blueprint('attendance', __name__)

def _get_employee_for_current_user():
    user_id = get_jwt_identity()
    employee = Employee.objects(user_id=user_id).first()
    return employee

@attendance_bp.route('/', methods=['GET'])
@jwt_required()
def get_attendance():
    claims = get_jwt()
    if claims.get('role') == 'admin':
        rows = Attendance.objects.order_by('-date', '-check_in').all()
    else:
        employee = _get_employee_for_current_user()
        if not employee:
            return jsonify({'error': 'Employee record not found for current user'}), 404
        rows = Attendance.objects(employee=employee.id).order_by('-date').all()

    data = []
    for r in rows:
        data.append({
            'id': str(r.id),
            'employee_id': str(r.employee.id),
            'employee_name': r.employee.name if r.employee else None,
            'date': r.date.isoformat(),
            'check_in': r.check_in.isoformat() if r.check_in else None,
            'check_out': r.check_out.isoformat() if r.check_out else None,
            'duration_hours': r.duration_hours,
            'status': r.status,
        })
    return jsonify(data), 200

@attendance_bp.route('/checkin', methods=['POST'])
@jwt_required()
def check_in():
    employee = _get_employee_for_current_user()
    if not employee:
        return jsonify({'error': 'Employee record not found for current user'}), 404

    now = datetime.utcnow()
    today_start = datetime(now.year, now.month, now.day)
    today_end = today_start.replace(hour=23, minute=59, second=59)
    
    record = Attendance.objects(employee=employee.id, date__gte=today_start, date__lte=today_end).first()

    if record and record.check_in:
        return jsonify({'error': 'Already checked in for today'}), 400

    if not record:
        record = Attendance(employee=employee, date=now)
    
    record.check_in = now
    record.status = 'present'
    record.save()

    return jsonify({'message': 'Check-in recorded successfully', 'attendance': {
        'id': str(record.id),
        'date': record.date.isoformat(),
        'check_in': record.check_in.isoformat(),
        'status': record.status,
    }}), 200

@attendance_bp.route('/checkout', methods=['POST'])
@jwt_required()
def check_out():
    employee = _get_employee_for_current_user()
    if not employee:
        return jsonify({'error': 'Employee record not found for current user'}), 404

    now = datetime.utcnow()
    
    # Find the most recent check-in that doesn't have a check-out yet
    record = Attendance.objects(employee=employee.id, check_in__ne=None, check_out=None).order_by('-check_in').first()

    if not record:
        return jsonify({'error': 'No active check-in found. Please check in first.'}), 400

    record.check_out = now
    duration = (record.check_out - record.check_in).total_seconds() / 3600
    record.duration_hours = round(duration, 2)
    record.save()

    return jsonify({'message': 'Check-out recorded successfully', 'attendance': {
        'id': str(record.id),
        'date': record.date.isoformat(),
        'check_in': record.check_in.isoformat(),
        'check_out': record.check_out.isoformat(),
        'duration_hours': record.duration_hours,
        'status': record.status,
    }}), 200

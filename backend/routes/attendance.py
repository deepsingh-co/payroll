from datetime import datetime, date
from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from extensions import db
from models import Attendance, Employee

attendance_bp = Blueprint('attendance', __name__)


def _get_employee_for_current_user():
    user_id = get_jwt_identity()
    employee = Employee.query.filter_by(user_id=user_id).first()
    return employee


@attendance_bp.route('/', methods=['GET'])
@jwt_required()
def get_attendance():
    claims = get_jwt()
    if claims.get('role') == 'admin':
        rows = Attendance.query.order_by(Attendance.date.desc(), Attendance.check_in.desc()).all()
    else:
        employee = _get_employee_for_current_user()
        if not employee:
            return jsonify({'error': 'Employee record not found for current user'}), 404
        rows = Attendance.query.filter_by(employee_id=employee.id).order_by(Attendance.date.desc()).all()

    data = []
    for r in rows:
        data.append({
            'id': r.id,
            'employee_id': r.employee_id,
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

    today = date.today()
    record = Attendance.query.filter_by(employee_id=employee.id, date=today).first()

    if record and record.check_in:
        return jsonify({'error': 'Already checked in for today'}), 400

    if not record:
        record = Attendance(employee_id=employee.id, date=today)
        db.session.add(record)

    record.check_in = datetime.utcnow()
    record.status = 'present'

    db.session.commit()

    return jsonify({'message': 'Check-in recorded successfully', 'attendance': {
        'id': record.id,
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

    today = date.today()
    record = Attendance.query.filter_by(employee_id=employee.id, date=today).first()

    if not record or not record.check_in:
        return jsonify({'error': 'Cannot check out before check-in'}), 400

    if record.check_out:
        return jsonify({'error': 'Already checked out for today'}), 400

    record.check_out = datetime.utcnow()
    duration = (record.check_out - record.check_in).total_seconds() / 3600
    record.duration_hours = round(duration, 2)

    db.session.commit()

    return jsonify({'message': 'Check-out recorded successfully', 'attendance': {
        'id': record.id,
        'date': record.date.isoformat(),
        'check_in': record.check_in.isoformat(),
        'check_out': record.check_out.isoformat(),
        'duration_hours': record.duration_hours,
        'status': record.status,
    }}), 200

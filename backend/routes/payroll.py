from flask import Blueprint, request, jsonify
from extensions import db
from models import Payroll, Employee
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt

payroll_bp = Blueprint('payroll', __name__)

@payroll_bp.route('/', methods=['GET'])
@jwt_required()
def get_all_payrolls():
    claims = get_jwt()
    role = claims.get('role')
    user_id = get_jwt_identity()

    if role == 'admin':
        payrolls = Payroll.objects.all()
    else:
        employee = Employee.objects(user_id=user_id).first()
        if not employee:
            return jsonify([]), 200
        payrolls = Payroll.objects(employee=employee.id).all()

    result = []
    for payroll in payrolls:
        emp = Employee.objects(id=payroll.employee.id).first()
        result.append({
            'id': str(payroll.id),
            'employee_id': str(payroll.employee.id),
            'employee_name': emp.name if emp else 'Unknown',
            'basic_salary': payroll.basic_salary,
            'bonus': payroll.bonus,
            'tax': payroll.tax,
            'deductions': payroll.deductions,
            'net_salary': payroll.net_salary,
            'month': payroll.month
        })
    return jsonify(result), 200

@payroll_bp.route('/', methods=['POST'])
@jwt_required()
def generate_payroll():
    claims = get_jwt()
    if claims.get('role') != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403

    data = request.get_json()
    employee_id = data.get('employee_id')
    month = data.get('month')
    bonus = data.get('bonus', 0)
    tax = data.get('tax', 0)
    deductions = data.get('deductions', 0)

    if not employee_id or not month:
        return jsonify({'error': 'Employee ID and month are required'}), 400

    employee = Employee.objects(id=employee_id).first()
    if not employee:
        return jsonify({'error': 'Employee not found'}), 404

    existing = Payroll.objects(employee=employee_id, month=month).first()
    if existing:
        return jsonify({'error': 'Payroll already generated for this month'}), 400

    basic_salary = employee.salary or 0
    net_salary = basic_salary + bonus - tax - deductions

    payroll = Payroll(
        employee=employee,
        basic_salary=basic_salary,
        bonus=bonus,
        tax=tax,
        deductions=deductions,
        net_salary=net_salary,
        month=month
    )
    payroll.save()

    return jsonify({
        'id': str(payroll.id),
        'employee_id': str(payroll.employee.id),
        'employee_name': employee.name,
        'basic_salary': payroll.basic_salary,
        'bonus': payroll.bonus,
        'tax': payroll.tax,
        'deductions': payroll.deductions,
        'net_salary': payroll.net_salary,
        'month': payroll.month
    }), 201

@payroll_bp.route('/<string:employee_id>', methods=['GET'])
@jwt_required()
def get_payroll_for_employee(employee_id):
    claims = get_jwt()
    user_id = get_jwt_identity()
    role = claims.get('role')

    if role != 'admin':
        employee = Employee.objects(user_id=user_id).first()
        if not employee or str(employee.id) != employee_id:
            return jsonify({'error': 'Unauthorized'}), 403

    payrolls = Payroll.objects(employee=employee_id).all()

    result = []
    for payroll in payrolls:
        result.append({
            'id': str(payroll.id),
            'basic_salary': payroll.basic_salary,
            'bonus': payroll.bonus,
            'tax': payroll.tax,
            'deductions': payroll.deductions,
            'net_salary': payroll.net_salary,
            'month': payroll.month
        })
    return jsonify(result), 200

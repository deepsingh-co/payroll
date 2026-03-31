from flask import Blueprint, request, jsonify
from extensions import db
from models import Payroll, Employee, Attendance, Task
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
            'overtime_pay': getattr(payroll, 'overtime_pay', 0),
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

    basic_salary = (employee.salary or 0) / 12

    # Calculate overtime
    overtime_hours = 0
    try:
        from datetime import datetime
        year, mth = map(int, month.split('-'))
        records = Attendance.objects(employee=employee_id).all()
        for r in records:
            if r.date and r.date.year == year and r.date.month == mth:
                if r.duration_hours and r.duration_hours > 8:
                    overtime_hours += (r.duration_hours - 8)
    except Exception as e:
        print(f"Error calculating overtime: {e}")
        pass

    hourly_rate = basic_salary / 160 if basic_salary > 0 else 0
    overtime_pay = round(overtime_hours * hourly_rate * 1.5, 2)

    net_salary = basic_salary + bonus + overtime_pay - tax - deductions

    payroll = Payroll(
        employee=employee,
        basic_salary=round(basic_salary, 2),
        bonus=bonus,
        overtime_pay=overtime_pay,
        tax=tax,
        deductions=deductions,
        net_salary=round(net_salary, 2),
        month=month
    )
    payroll.save()

    return jsonify({
        'id': str(payroll.id),
        'employee_id': str(payroll.employee.id),
        'employee_name': employee.name,
        'basic_salary': payroll.basic_salary,
        'bonus': payroll.bonus,
        'overtime_pay': payroll.overtime_pay,
        'tax': payroll.tax,
        'deductions': payroll.deductions,
        'net_salary': payroll.net_salary,
        'month': payroll.month
    }), 201

@payroll_bp.route('/generate_all', methods=['POST'])
@jwt_required()
def generate_all_payrolls():
    claims = get_jwt()
    if claims.get('role') != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403

    data = request.get_json()
    month = data.get('month')
    department = data.get('department')
    employee_id = data.get('employee_id')
    
    if not month:
        return jsonify({'error': 'Month is required'}), 400

    query = {'status': 'active'}
    if department:
        query['department'] = department
    if employee_id:
        query['id'] = employee_id

    employees = Employee.objects(**query).all()
    results = []

    try:
        from datetime import datetime
        year, mth = map(int, month.split('-'))
    except Exception:
        return jsonify({'error': 'Invalid month format. Use YYYY-MM.'}), 400

    for employee in employees:
        if Payroll.objects(employee=employee.id, month=month).first():
            continue

        basic_salary = (employee.salary or 0) / 12

        overtime_hours = 0
        records = Attendance.objects(employee=employee.id).all()
        for r in records:
            if r.date and r.date.year == year and r.date.month == mth:
                if r.duration_hours and r.duration_hours > 12:
                    overtime_hours += (r.duration_hours - 12)

        hourly_rate = basic_salary / 160 if basic_salary > 0 else 0
        overtime_pay = round(overtime_hours * hourly_rate * 1.5, 2)

        tasks = Task.objects(assigned_to=employee.id, status='completed').all()
        monthly_tasks = [t for t in tasks if t.deadline and t.deadline.year == year and t.deadline.month == mth]
        
        # Calculate totals
        auto_bonus = len(monthly_tasks) * 500
        manual_bonus = float(data.get('bonus', 0))
        total_bonus = auto_bonus + manual_bonus
        
        tax = round(basic_salary * 0.10, 2)
        manual_deductions = float(data.get('deductions', 0))

        net_salary = basic_salary + total_bonus + overtime_pay - tax - manual_deductions

        payroll = Payroll(
            employee=employee,
            basic_salary=round(basic_salary, 2),
            bonus=total_bonus,
            overtime_pay=overtime_pay,
            tax=tax,
            deductions=manual_deductions,
            net_salary=round(net_salary, 2),
            month=month
        )
        payroll.save()
        
        user_email = employee.user_id.email if hasattr(employee, 'user_id') and employee.user_id else "unknown@employee.com"
        print(f"--- EMAIL SENT ---")
        print(f"To: {user_email}\nSubject: Salary Credited\nBody: Hello {employee.name}, your salary of ₹{payroll.net_salary} for {month} has been credited from Smart Payroll Company.\n------------------")

        results.append({
            'id': str(payroll.id),
            'employee_id': str(employee.id),
            'employee_name': employee.name,
            'basic_salary': payroll.basic_salary,
            'bonus': payroll.bonus,
            'overtime_pay': payroll.overtime_pay,
            'tax': payroll.tax,
            'deductions': payroll.deductions,
            'net_salary': payroll.net_salary,
            'month': payroll.month
        })

    return jsonify({'message': f'Successfully generated and paid {len(results)} employees!', 'payrolls': results}), 201

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
            'overtime_pay': getattr(payroll, 'overtime_pay', 0),
            'tax': payroll.tax,
            'deductions': payroll.deductions,
            'net_salary': payroll.net_salary,
            'month': payroll.month
        })
    return jsonify(result), 200

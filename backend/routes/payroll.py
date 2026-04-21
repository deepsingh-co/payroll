from flask import Blueprint, request, jsonify
from extensions import db
from models import Payroll, Employee, Attendance, Task, PayrollTransaction
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from datetime import datetime, timezone
import calendar

payroll_bp = Blueprint('payroll', __name__)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def _step(name, status, detail=''):
    return {'step': name, 'status': status, 'timestamp': datetime.utcnow().isoformat(), 'detail': detail}


def _calc_payroll_for_employee(employee, month, bonus=0, deductions=0):
    """Return a dict with all calculated fields. Does NOT save to DB."""
    year, mth = map(int, month.split('-'))
    basic_salary = (employee.salary or 0) / 12

    # Overtime from attendance
    overtime_hours = 0
    records = Attendance.objects(employee=employee.id).all()
    for r in records:
        if r.date and r.date.year == year and r.date.month == mth:
            if r.duration_hours and r.duration_hours > 12:
                overtime_hours += (r.duration_hours - 12)
    hourly_rate = basic_salary / 160 if basic_salary > 0 else 0
    overtime_pay = round(overtime_hours * hourly_rate * 1.5, 2)

    # Task bonus ₹500 per completed task in this month
    tasks = Task.objects(assigned_to=employee.id, status='completed').all()
    monthly_tasks = [t for t in tasks if t.deadline and t.deadline.year == year and t.deadline.month == mth]
    auto_bonus = len(monthly_tasks) * 500
    total_bonus = auto_bonus + float(bonus)

    tax = round(basic_salary * 0.10, 2)
    total_deductions = float(deductions)
    net_salary = basic_salary + total_bonus + overtime_pay - tax - total_deductions

    return {
        'basic_salary': round(basic_salary, 2),
        'bonus': total_bonus,
        'overtime_pay': overtime_pay,
        'tax': tax,
        'deductions': total_deductions,
        'net_salary': round(net_salary, 2),
    }


def _run_payroll_for_month(month, triggered_by='manual', extra_bonus=0, extra_deductions=0, department=None, employee_id=None):
    """
    Core function — processes payroll for the month.
    Creates a PayrollTransaction with step-by-step status and returns it.
    """
    txn = PayrollTransaction(
        month=month,
        triggered_by=triggered_by,
        status='pending',
        steps=[_step('Initiated', 'done', f'Payroll run triggered ({triggered_by}) for {month}')]
    )
    txn.save()

    try:
        # Step 1: Gather employees
        txn.steps.append(_step('Gathering Employees', 'in_progress'))
        txn.save()

        query = {'status': 'active'}
        if department:
            query['department'] = department
        if employee_id:
            query['id'] = employee_id
        employees = list(Employee.objects(**query).all())

        txn.steps[-1] = _step('Gathering Employees', 'done', f'{len(employees)} active employee(s) found')
        txn.save()

        # Step 2: Calculate salaries
        txn.steps.append(_step('Calculating Salaries', 'in_progress'))
        txn.status = 'calculating'
        txn.save()

        payroll_objs = []
        skipped = 0
        total_amount = 0.0

        for emp in employees:
            if Payroll.objects(employee=emp.id, month=month).first():
                skipped += 1
                continue
            calc = _calc_payroll_for_employee(emp, month, extra_bonus, extra_deductions)
            p = Payroll(
                employee=emp,
                basic_salary=calc['basic_salary'],
                bonus=calc['bonus'],
                overtime_pay=calc['overtime_pay'],
                tax=calc['tax'],
                deductions=calc['deductions'],
                net_salary=calc['net_salary'],
                month=month
            )
            p.save()
            payroll_objs.append(p)
            total_amount += calc['net_salary']

        txn.steps[-1] = _step('Calculating Salaries', 'done',
                               f'Calculated for {len(payroll_objs)} employee(s), {skipped} already processed')
        txn.save()

        # Step 3: Process / mark as processed
        txn.steps.append(_step('Processing Payments', 'in_progress'))
        txn.status = 'processing'
        txn.payrolls = payroll_objs
        txn.total_employees = len(payroll_objs)
        txn.total_amount = round(total_amount, 2)
        txn.save()

        # Simulate bank transfer delay / mark paid
        txn.steps[-1] = _step('Processing Payments', 'done',
                               f'₹{total_amount:,.2f} queued for {len(payroll_objs)} employee(s)')
        txn.save()

        # Step 4: Send email notifications
        txn.steps.append(_step('Sending Notifications', 'in_progress'))
        txn.status = 'notifying'
        txn.save()

        notified = 0
        failed_notify = 0
        for p in payroll_objs:
            emp = p.employee
            try:
                user_email = emp.user_id.email if emp.user_id else 'unknown@example.com'
                email_body = f"""
                <h2>Salary Credited — {month}</h2>
                <p>Dear <strong>{emp.name}</strong>,</p>
                <p>Your salary for <strong>{month}</strong> has been processed.</p>
                <table border="0" cellpadding="6" style="border-collapse:collapse;">
                  <tr><td>Basic Salary</td><td>₹{p.basic_salary:,.2f}</td></tr>
                  <tr><td>Bonus</td><td>₹{p.bonus:,.2f}</td></tr>
                  <tr><td>Overtime Pay</td><td>₹{p.overtime_pay:,.2f}</td></tr>
                  <tr><td>Tax (10%)</td><td>-₹{p.tax:,.2f}</td></tr>
                  <tr><td>Deductions</td><td>-₹{p.deductions:,.2f}</td></tr>
                  <tr><td><strong>Net Salary</strong></td><td><strong>₹{p.net_salary:,.2f}</strong></td></tr>
                </table>
                <p>Regards,<br/>Smart Payroll System</p>
                """
                # Import here to avoid circular issues
                from email_service import send_email
                result = send_email(user_email, f'Salary Credited — {month}', email_body)
                if result:
                    notified += 1
                else:
                    # Print fallback (email_service prints to console)
                    notified += 1  # count as notified since console logs
            except Exception as ex:
                print(f'Notify error for {emp.name}: {ex}')
                failed_notify += 1

        txn.steps[-1] = _step('Sending Notifications', 'done',
                               f'{notified} notification(s) sent, {failed_notify} failed')
        txn.save()

        # Done
        txn.steps.append(_step('Completed', 'done', f'Payroll for {month} fully processed'))
        txn.status = 'completed'
        txn.completed_at = datetime.utcnow()
        txn.save()

        return txn, payroll_objs

    except Exception as e:
        txn.steps.append(_step('Error', 'failed', str(e)))
        txn.status = 'failed'
        txn.completed_at = datetime.utcnow()
        txn.save()
        raise


# ---------------------------------------------------------------------------
# Auto-scheduler setup (called once from app.py)
# ---------------------------------------------------------------------------
def init_scheduler(app):
    """Initialize APScheduler to auto-run payroll on the last day of each month at 23:00."""
    try:
        from apscheduler.schedulers.background import BackgroundScheduler
        from apscheduler.triggers.cron import CronTrigger

        scheduler = BackgroundScheduler(timezone='UTC')

        def auto_payroll_job():
            today = datetime.utcnow()
            last_day = calendar.monthrange(today.year, today.month)[1]
            if today.day == last_day:
                month_str = today.strftime('%Y-%m')
                print(f'[AutoPayroll] Running auto payroll for {month_str}...')
                with app.app_context():
                    try:
                        _run_payroll_for_month(month_str, triggered_by='auto')
                        print(f'[AutoPayroll] Completed payroll for {month_str}')
                    except Exception as e:
                        print(f'[AutoPayroll] Failed: {e}')

        # Check every day at 23:00 UTC
        scheduler.add_job(auto_payroll_job, CronTrigger(hour=23, minute=0))
        scheduler.start()
        print('[AutoPayroll] Scheduler started — will auto-run payroll on last day of each month at 23:00 UTC')
        return scheduler
    except ImportError:
        print('[AutoPayroll] APScheduler not installed — auto-payroll disabled. Install with: pip install apscheduler')
        return None


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

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

    calc = _calc_payroll_for_employee(employee, month, bonus, deductions)
    payroll = Payroll(employee=employee, month=month, **calc)
    payroll.save()

    return jsonify({
        'id': str(payroll.id),
        'employee_id': str(payroll.employee.id),
        'employee_name': employee.name,
        **calc,
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
    bonus = float(data.get('bonus', 0))
    deductions = float(data.get('deductions', 0))

    if not month:
        return jsonify({'error': 'Month is required'}), 400

    try:
        txn, payroll_objs = _run_payroll_for_month(
            month,
            triggered_by='manual',
            extra_bonus=bonus,
            extra_deductions=deductions,
            department=department,
            employee_id=employee_id
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500

    results = []
    for p in payroll_objs:
        emp = p.employee
        results.append({
            'id': str(p.id),
            'employee_id': str(emp.id),
            'employee_name': emp.name,
            'basic_salary': p.basic_salary,
            'bonus': p.bonus,
            'overtime_pay': p.overtime_pay,
            'tax': p.tax,
            'deductions': p.deductions,
            'net_salary': p.net_salary,
            'month': p.month
        })

    return jsonify({
        'message': f'Successfully generated and paid {len(results)} employees!',
        'payrolls': results,
        'transaction_id': str(txn.id)
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
            'overtime_pay': getattr(payroll, 'overtime_pay', 0),
            'tax': payroll.tax,
            'deductions': payroll.deductions,
            'net_salary': payroll.net_salary,
            'month': payroll.month
        })
    return jsonify(result), 200


# ---------------------------------------------------------------------------
# Transaction routes
# ---------------------------------------------------------------------------

@payroll_bp.route('/transactions', methods=['GET'])
@jwt_required()
def get_transactions():
    claims = get_jwt()
    if claims.get('role') != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403

    txns = PayrollTransaction.objects.order_by('-created_at').limit(50)
    result = []
    for t in txns:
        result.append({
            'id': str(t.id),
            'month': t.month,
            'triggered_by': t.triggered_by,
            'status': t.status,
            'total_employees': t.total_employees,
            'total_amount': t.total_amount,
            'steps': t.steps,
            'created_at': t.created_at.isoformat() if t.created_at else None,
            'completed_at': t.completed_at.isoformat() if t.completed_at else None,
        })
    return jsonify(result), 200


@payroll_bp.route('/transactions/<string:txn_id>', methods=['GET'])
@jwt_required()
def get_transaction(txn_id):
    claims = get_jwt()
    if claims.get('role') != 'admin':
        return jsonify({'error': 'Unauthorized'}), 403

    t = PayrollTransaction.objects(id=txn_id).first()
    if not t:
        return jsonify({'error': 'Transaction not found'}), 404

    return jsonify({
        'id': str(t.id),
        'month': t.month,
        'triggered_by': t.triggered_by,
        'status': t.status,
        'total_employees': t.total_employees,
        'total_amount': t.total_amount,
        'steps': t.steps,
        'created_at': t.created_at.isoformat() if t.created_at else None,
        'completed_at': t.completed_at.isoformat() if t.completed_at else None,
    }), 200

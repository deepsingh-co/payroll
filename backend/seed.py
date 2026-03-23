# -*- coding: utf-8 -*-
"""
Seed script - creates admin + demo employee accounts and sample data.
Run once with:  python seed.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app import create_app
from extensions import db, bcrypt
from models import User, Employee, Team, TeamMember, Task, Leave, Payroll
from datetime import datetime, timedelta, timezone

def now_utc():
    return datetime.now(timezone.utc).replace(tzinfo=None)

app = create_app()

def seed():
    with app.app_context():
        db.create_all()

        # ── Clear existing data ──────────────────────────────────────────────
        for model in [Payroll, Leave, Task, TeamMember, Team, Employee, User]:
            db.session.query(model).delete()
        db.session.commit()

        # ── Users ─────────────────────────────────────────────────────────────
        admin_pw = bcrypt.generate_password_hash('admin123').decode('utf-8')
        admin = User(name='Admin User', email='admin@company.com',
                     password=admin_pw, role='admin', is_verified=True)
        db.session.add(admin)

        emp_emails = [
            ('Alice Johnson',   'alice@company.com',   'employee'),
            ('Bob Smith',       'bob@company.com',     'employee'),
            ('Carol Williams',  'carol@company.com',   'employee'),
            ('David Brown',     'david@company.com',   'employee'),
            ('Eve Davis',       'eve@company.com',     'employee'),
        ]
        emp_users = []
        for name, email, role in emp_emails:
            pw = bcrypt.generate_password_hash('employee123').decode('utf-8')
            u = User(name=name, email=email, password=pw, role=role, is_verified=True)
            db.session.add(u)
            emp_users.append(u)

        db.session.flush()   # assign IDs

        # ── Employee records ──────────────────────────────────────────────────
        emp_details = [
            ('Senior Developer',  'Engineering', 95000),
            ('Product Manager',   'Product',     88000),
            ('UX Designer',       'Design',      78000),
            ('Data Analyst',      'Engineering', 82000),
            ('Marketing Lead',    'Marketing',   75000),
        ]
        employees = []
        for i, u in enumerate(emp_users):
            role, dept, salary = emp_details[i]
            e = Employee(user_id=u.id, name=u.name, role=role, department=dept,
                         salary=salary, status='active')
            db.session.add(e)
            employees.append(e)

        db.session.flush()

        # ── Teams ─────────────────────────────────────────────────────────────
        t1 = Team(name='Engineering', department='Engineering', leader_id=employees[0].id)
        t2 = Team(name='Product & Design', department='Design',    leader_id=employees[1].id)
        t3 = Team(name='Growth',       department='Marketing',  leader_id=employees[4].id)
        db.session.add_all([t1, t2, t3])
        db.session.flush()

        # Members
        for tid, emp in [(t1.id, employees[0]), (t1.id, employees[3]),
                         (t2.id, employees[1]), (t2.id, employees[2]),
                         (t3.id, employees[4])]:
            db.session.add(TeamMember(team_id=tid, employee_id=emp.id))

        # ── Tasks ─────────────────────────────────────────────────────────────
        tasks_data = [
            ('Build REST API endpoints', employees[0].id, 3, 8.0, 'completed'),
            ('Design new dashboard UI', employees[2].id, 2, 12.0, 'in_progress'),
            ('Analyse Q1 user metrics', employees[3].id, 2, 6.0, 'pending'),
            ('Launch email campaign',   employees[4].id, 1, 4.0, 'pending'),
            ('Refactor auth module',    employees[0].id, 3, 10.0, 'in_progress'),
            ('Write product spec docs', employees[1].id, 2, 5.0, 'completed'),
        ]
        for title, emp_id, complexity, hours, status in tasks_data:
            deadline = now_utc() + timedelta(days=7)
            db.session.add(Task(title=title, assigned_to=emp_id,
                                complexity_score=complexity,
                                estimated_hours=hours,
                                deadline=deadline, status=status))

        # ── Leaves ────────────────────────────────────────────────────────────
        leaves_data = [
            (employees[0].id, 'Annual',    3, 'pending'),
            (employees[1].id, 'Sick',      1, 'approved'),
            (employees[2].id, 'Annual',    5, 'approved'),
            (employees[3].id, 'Emergency', 2, 'rejected'),
            (employees[4].id, 'Annual',    3, 'pending'),
        ]
        for emp_id, ltype, days, status in leaves_data:
            frm = now_utc() + timedelta(days=5)
            to  = frm + timedelta(days=days - 1)
            db.session.add(Leave(employee_id=emp_id, type=ltype,
                                 from_date=frm, to_date=to, status=status))

        # ── Payroll (current month) ───────────────────────────────────────────
        month = now_utc().strftime('%Y-%m')
        payroll_data = [
            (employees[0].id, 5000, 300, 150),
            (employees[1].id, 2000, 250, 120),
            (employees[2].id, 1000, 200, 100),
            (employees[3].id, 1500, 220, 110),
            (employees[4].id, 800,  180,  90),
        ]
        for emp, bonus, tax, deductions in payroll_data:
            e = next(x for x in employees if x.id == emp)
            basic = e.salary / 12
            net   = basic + bonus - tax - deductions
            db.session.add(Payroll(employee_id=emp, basic_salary=round(basic, 2),
                                   bonus=bonus, tax=tax, deductions=deductions,
                                   net_salary=round(net, 2), month=month))

        db.session.commit()
        print("[OK] Database seeded successfully!")
        print("   Admin    -> admin@company.com   / admin123")
        print("   Employee -> alice@company.com   / employee123  (also bob, carol, david, eve)")


if __name__ == '__main__':
    seed()

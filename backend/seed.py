# -*- coding: utf-8 -*-
"""
Seed script for MongoDB - creates admin + demo employee accounts and sample data.
Run once with:  python seed.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app import create_app
from extensions import db, bcrypt
from models import User, Employee, Team, Task, Leave, Payroll
from datetime import datetime, timedelta, timezone

def now_utc():
    return datetime.now(timezone.utc).replace(tzinfo=None)

app = create_app()

def seed():
    with app.app_context():
        # ── Clear existing data ──────────────────────────────────────────────
        # MongoEngine/MongoDB approach
        Payroll.objects.delete()
        Leave.objects.delete()
        Task.objects.delete()
        Team.objects.delete()
        Employee.objects.delete()
        User.objects.delete()

        # ── Users ─────────────────────────────────────────────────────────────
        admin_pw = bcrypt.generate_password_hash('admin123').decode('utf-8')
        admin = User(name='Admin User', email='admin@company.com',
                     password=admin_pw, role='admin', is_verified=True)
        admin.save()

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
            u.save()
            emp_users.append(u)

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
            e = Employee(user_id=u, name=u.name, role=role, department=dept,
                         salary=salary, status='active')
            e.save()
            employees.append(e)

        # ── Teams ─────────────────────────────────────────────────────────────
        t1 = Team(name='Engineering', department='Engineering', leader=employees[0], 
                  members=[employees[0], employees[3]])
        t2 = Team(name='Product & Design', department='Design', leader=employees[1],
                  members=[employees[1], employees[2]])
        t3 = Team(name='Growth', department='Marketing', leader=employees[4],
                  members=[employees[4]])
        t1.save()
        t2.save()
        t3.save()

        # ── Tasks ─────────────────────────────────────────────────────────────
        tasks_data = [
            ('Build REST API endpoints', employees[0], 3, 8.0, 'completed'),
            ('Design new dashboard UI', employees[2], 2, 12.0, 'in-progress'),
            ('Analyse Q1 user metrics', employees[3], 2, 6.0, 'pending'),
            ('Launch email campaign',   employees[4], 1, 4.0, 'pending'),
            ('Refactor auth module',    employees[0], 3, 10.0, 'in-progress'),
            ('Write product spec docs', employees[1], 2, 5.0, 'completed'),
        ]
        for title, emp, complexity, hours, status in tasks_data:
            deadline = now_utc() + timedelta(days=7)
            task = Task(title=title, assigned_to=emp,
                        complexity_score=complexity,
                        estimated_hours=hours,
                        deadline=deadline, status=status)
            task.save()

        # ── Leaves ────────────────────────────────────────────────────────────
        leaves_data = [
            (employees[0], 'Annual',    3, 'pending'),
            (employees[1], 'Sick',      1, 'approved'),
            (employees[2], 'Annual',    5, 'approved'),
            (employees[3], 'Emergency', 2, 'rejected'),
            (employees[4], 'Annual',    3, 'pending'),
        ]
        for emp, ltype, days, status in leaves_data:
            frm = now_utc() + timedelta(days=5)
            to  = frm + timedelta(days=days - 1)
            leave = Leave(employee=emp, type=ltype,
                          from_date=frm, to_date=to, status=status)
            leave.save()

        # ── Payroll (current month) ───────────────────────────────────────────
        month = now_utc().strftime('%Y-%m')
        payroll_data = [
            (employees[0], 5000, 300, 150),
            (employees[1], 2000, 250, 120),
            (employees[2], 1000, 200, 100),
            (employees[3], 1500, 220, 110),
            (employees[4], 800,  180,  90),
        ]
        for emp, bonus, tax, deductions in payroll_data:
            basic = (emp.salary or 0) / 12
            net   = basic + bonus - tax - deductions
            p = Payroll(employee=emp, basic_salary=round(basic, 2),
                        bonus=bonus, tax=tax, deductions=deductions,
                        net_salary=round(net, 2), month=month)
            p.save()

        print("[OK] MongoDB seeded successfully!")
        print("   Admin    -> admin@company.com   / admin123")
        print("   Employee -> alice@company.com   / employee123  (also bob, carol, david, eve)")


if __name__ == '__main__':
    seed()

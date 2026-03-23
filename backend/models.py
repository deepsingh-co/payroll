from datetime import datetime
from extensions import db

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    role = db.Column(db.String(20), default='employee') # admin / employee
    is_verified = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    employee = db.relationship('Employee', backref='user', uselist=False)

class Employee(db.Model):
    __tablename__ = 'employees'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    role = db.Column(db.String(50))
    department = db.Column(db.String(50))
    salary = db.Column(db.Float)
    status = db.Column(db.String(20), default='active')
    
    tasks = db.relationship('Task', backref='assignee', lazy=True)
    payrolls = db.relationship('Payroll', backref='employee', lazy=True)
    leaves = db.relationship('Leave', backref='employee', lazy=True)
    teams_led = db.relationship('Team', backref='leader', lazy=True)

class Team(db.Model):
    __tablename__ = 'teams'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    department = db.Column(db.String(50))
    leader_id = db.Column(db.Integer, db.ForeignKey('employees.id'))
    
    members = db.relationship('Employee', secondary='team_members', backref='teams')

class TeamMember(db.Model):
    __tablename__ = 'team_members'
    id = db.Column(db.Integer, primary_key=True)
    team_id = db.Column(db.Integer, db.ForeignKey('teams.id'), nullable=False)
    employee_id = db.Column(db.Integer, db.ForeignKey('employees.id'), nullable=False)

class Task(db.Model):
    __tablename__ = 'tasks'
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    assigned_to = db.Column(db.Integer, db.ForeignKey('employees.id'))
    complexity_score = db.Column(db.Integer, default=1)
    estimated_hours = db.Column(db.Float)
    actual_hours = db.Column(db.Float)
    deadline = db.Column(db.DateTime)
    status = db.Column(db.String(20), default='pending')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Payroll(db.Model):
    __tablename__ = 'payrolls'
    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.Integer, db.ForeignKey('employees.id'), nullable=False)
    basic_salary = db.Column(db.Float)
    bonus = db.Column(db.Float, default=0)
    tax = db.Column(db.Float, default=0)
    deductions = db.Column(db.Float, default=0)
    net_salary = db.Column(db.Float)
    month = db.Column(db.String(20)) # e.g., '2023-10'

class Leave(db.Model):
    __tablename__ = 'leaves'
    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(db.Integer, db.ForeignKey('employees.id'), nullable=False)
    type = db.Column(db.String(50))
    from_date = db.Column(db.DateTime, nullable=False)
    to_date = db.Column(db.DateTime, nullable=False)
    status = db.Column(db.String(20), default='pending')

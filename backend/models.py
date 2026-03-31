from datetime import datetime, date
from extensions import db

class User(db.Document):
    meta = {'collection': 'users'}
    name = db.StringField(max_length=100, required=True)
    email = db.StringField(max_length=120, unique=True, required=True)
    password = db.StringField(max_length=200, required=True)
    role = db.StringField(max_length=20, default='employee') # admin / employee
    is_verified = db.BooleanField(default=False)
    created_at = db.DateTimeField(default=datetime.utcnow)

class Employee(db.Document):
    meta = {'collection': 'employees'}
    user_id = db.ReferenceField(User, required=True)
    name = db.StringField(max_length=100, required=True)
    role = db.StringField(max_length=50)
    department = db.StringField(max_length=50)
    salary = db.FloatField()
    status = db.StringField(max_length=20, default='active')

class Team(db.Document):
    meta = {'collection': 'teams'}
    name = db.StringField(max_length=100, required=True)
    department = db.StringField(max_length=50)
    leader = db.ReferenceField(Employee)
    members = db.ListField(db.ReferenceField(Employee))

class Task(db.Document):
    meta = {'collection': 'tasks'}
    title = db.StringField(max_length=200, required=True)
    assigned_to = db.ReferenceField(Employee)
    complexity_score = db.IntField(default=1)
    estimated_hours = db.FloatField()
    actual_hours = db.FloatField()
    deadline = db.DateTimeField()
    status = db.StringField(max_length=20, default='pending') # pending / in_progress / completed
    created_at = db.DateTimeField(default=datetime.utcnow)
    team = db.ReferenceField('Team')        # team that owns this task
    assigned_by = db.ReferenceField('Employee')  # team leader who assigned

class Payroll(db.Document):
    meta = {'collection': 'payrolls'}
    employee = db.ReferenceField(Employee, required=True)
    basic_salary = db.FloatField()
    bonus = db.FloatField(default=0)
    overtime_pay = db.FloatField(default=0)
    tax = db.FloatField(default=0)
    deductions = db.FloatField(default=0)
    net_salary = db.FloatField()
    month = db.StringField(max_length=20) # e.g., '2023-10'

class Leave(db.Document):
    meta = {'collection': 'leaves'}
    employee = db.ReferenceField(Employee, required=True)
    type = db.StringField(max_length=50)
    from_date = db.DateTimeField(required=True)
    to_date = db.DateTimeField(required=True)
    status = db.StringField(max_length=20, default='pending')

class Attendance(db.Document):
    meta = {'collection': 'attendances'}
    employee = db.ReferenceField(Employee, required=True)
    date = db.DateTimeField(default=datetime.utcnow)
    check_in = db.DateTimeField()
    check_out = db.DateTimeField()
    duration_hours = db.FloatField(default=0.0)
    status = db.StringField(max_length=20, default='absent')

class Message(db.Document):
    meta = {'collection': 'messages'}
    team = db.ReferenceField(Team, required=True)
    sender = db.ReferenceField(Employee, required=True)
    content = db.StringField(required=True)
    created_at = db.DateTimeField(default=datetime.utcnow)

class Issue(db.Document):
    meta = {'collection': 'issues'}
    team = db.ReferenceField(Team, required=True)
    raised_by = db.ReferenceField(Employee, required=True)
    title = db.StringField(max_length=200, required=True)
    description = db.StringField()
    status = db.StringField(max_length=20, default='open')  # open / resolved
    created_at = db.DateTimeField(default=datetime.utcnow)

class LeaderMessage(db.Document):
    meta = {'collection': 'leader_messages'}
    sender = db.ReferenceField(Employee, required=True)
    content = db.StringField(required=True)
    created_at = db.DateTimeField(default=datetime.utcnow)

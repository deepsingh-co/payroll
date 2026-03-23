from app import create_app
from models import User
from extensions import bcrypt

app = create_app()
with app.app_context():
    users = User.query.all()
    print(f"Total users: {len(users)}")
    for u in users:
        print(f"ID: {u.id}, Email: {u.email}, Hash: {u.password[:20]}...")
        # Test if password 'admin123' or 'employee123' works
        p = 'admin123' if u.role == 'admin' else 'employee123'
        match = bcrypt.check_password_hash(u.password, p)
        print(f"  Password '{p}' match: {match}")

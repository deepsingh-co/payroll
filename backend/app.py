from flask import Flask, jsonify
from extensions import db, jwt, cors, bcrypt
from routes.auth import auth_bp
from routes.employees import employee_bp
from routes.teams import team_bp
from routes.tasks import task_bp
from routes.payroll import payroll_bp
from routes.leaves import leave_bp
from routes.attendance import attendance_bp
from routes.chat import chat_bp
from routes.leaders_chat import leaders_chat_bp

def create_app():
    app = Flask(__name__)
    
    # Configuration
    app.config['SECRET_KEY'] = 'dev-secret-key-12345'
    app.config['MONGODB_SETTINGS'] = {
        'db': 'payroll_db',
        'host': 'localhost',
        'port': 27017
    }
    app.config['JWT_SECRET_KEY'] = 'jwt-secret-key-12345'
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = False # For dev testing
    
    # Initialize extensions
    # Connect to MongoDB
    db.connect(
        db=app.config['MONGODB_SETTINGS']['db'],
        host=app.config['MONGODB_SETTINGS']['host'],
        port=app.config['MONGODB_SETTINGS']['port']
    )
    
    jwt.init_app(app)
    cors.init_app(app)
    bcrypt.init_app(app)
    
    # Register blueprints
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(employee_bp, url_prefix='/api/employees')
    app.register_blueprint(team_bp, url_prefix='/api/teams')
    app.register_blueprint(task_bp, url_prefix='/api/tasks')
    app.register_blueprint(payroll_bp, url_prefix='/api/payroll')
    app.register_blueprint(leave_bp, url_prefix='/api/leaves')
    app.register_blueprint(attendance_bp, url_prefix='/api/attendance')
    app.register_blueprint(chat_bp, url_prefix='/api')
    app.register_blueprint(leaders_chat_bp, url_prefix='/api/leaders_chat')
    
    @app.route('/api/health')
    def health_check():
        return jsonify({'status': 'ok'}), 200
        
    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True)

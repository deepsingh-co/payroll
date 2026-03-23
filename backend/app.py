from flask import Flask, jsonify
from extensions import db, jwt, cors, bcrypt
from routes.auth import auth_bp
from routes.employees import employee_bp
from routes.teams import team_bp
from routes.tasks import task_bp
from routes.payroll import payroll_bp
from routes.leaves import leave_bp

def create_app():
    app = Flask(__name__)
    
    # Configuration
    app.config['SECRET_KEY'] = 'dev-secret-key-12345'
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///payroll.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['JWT_SECRET_KEY'] = 'jwt-secret-key-12345'
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = False # For dev testing
    
    # Initialize extensions
    db.init_app(app)
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
    
    @app.route('/api/health')
    def health_check():
        return jsonify({'status': 'ok'}), 200
        
    return app

if __name__ == '__main__':
    app = create_app()
    with app.app_context():
        db.create_all()
    app.run(debug=True)

"""
DocTrust - Authentication & Access Control
"""
from functools import wraps
from flask import session, jsonify, request
from werkzeug.security import generate_password_hash, check_password_hash
from backend.models import get_db

def hash_password(password: str) -> str:
    return generate_password_hash(password, method='pbkdf2:sha256')

def verify_password(stored_hash: str, password: str) -> bool:
    return check_password_hash(stored_hash, password)

def get_current_user():
    user_id = session.get('user_id')
    if not user_id:
        # Check authorization header for API clients / token support
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            token_user_id = auth_header.split(' ')[1]
            try:
                user_id = int(token_user_id)
            except ValueError:
                user_id = None

    if not user_id:
        return None

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT id, full_name, email, mobile, role, organization, department, agent_status, created_at, last_login
        FROM users WHERE id = ?
    ''', (user_id,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return dict(row)
    return None

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user = get_current_user()
        if not user:
            return jsonify({'success': False, 'message': 'Authentication required. Please log in.'}), 401
        return f(*args, **kwargs)
    return decorated_function

def role_required(*allowed_roles):
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            user = get_current_user()
            if not user:
                return jsonify({'success': False, 'message': 'Authentication required.'}), 401
            if user['role'] not in allowed_roles:
                return jsonify({'success': False, 'message': f"Access forbidden. Requires one of roles: {', '.join(allowed_roles)}"}), 403
            if user['role'] == 'agent' and user.get('agent_status') != 'active':
                return jsonify({'success': False, 'message': 'Your agent account is pending administrator approval or inactive.'}), 403
            return f(*args, **kwargs)
        return decorated_function
    return decorator

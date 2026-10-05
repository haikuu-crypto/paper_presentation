"""
DocTrust - Backend REST API Application
Centralized Digital Document Authentication System
"""
import os
import sys
import json
import uuid
from datetime import datetime
from flask import Flask, request, jsonify, session, send_file, render_template, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename

# Ensure backend directory is in python path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from backend.models import get_db, init_db
from backend.seed import seed_database
from backend.auth import hash_password, verify_password, get_current_user, login_required, role_required
from backend.utils import (
    UPLOAD_DIR, ALLOWED_EXTENSIONS, allowed_file, calculate_sha256,
    generate_request_code, log_audit, row_to_dict
)

app = Flask(
    __name__,
    template_folder=os.path.join(BASE_DIR, 'templates'),
    static_folder=os.path.join(BASE_DIR, 'static')
)
app.secret_key = os.environ.get('DOCTRUST_SECRET_KEY', 'doctrust-symposium-secure-key-2026')
CORS(app, supports_credentials=True)

# Ensure upload directory exists
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Auto-initialize database schema and seed data on startup
init_db()
seed_database()


# ============================================================================
# AUTHENTICATION API
# ============================================================================

@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    full_name = data.get('full_name', '').strip()
    email = data.get('email', '').strip().lower()
    mobile = data.get('mobile', '').strip()
    password = data.get('password', '')
    confirm_password = data.get('confirm_password', '')
    role = data.get('role', 'citizen')
    organization = data.get('organization', '').strip()
    department = data.get('department', '').strip()

    if not full_name or not email or not password:
        return jsonify({'success': False, 'message': 'Full name, email, and password are required.'}), 400

    if password != confirm_password:
        return jsonify({'success': False, 'message': 'Passwords do not match.'}), 400

    if len(password) < 6:
        return jsonify({'success': False, 'message': 'Password must be at least 6 characters long.'}), 400

    if role not in ['citizen', 'agent']:
        role = 'citizen'

    agent_status = 'pending' if role == 'agent' else 'active'

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM users WHERE email = ?", (email,))
    if cursor.fetchone():
        conn.close()
        return jsonify({'success': False, 'message': 'An account with this email already exists.'}), 409

    pwd_hash = hash_password(password)
    try:
        cursor.execute('''
            INSERT INTO users (full_name, email, mobile, password_hash, role, organization, department, agent_status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (full_name, email, mobile, pwd_hash, role, organization, department, agent_status))
        user_id = cursor.lastrowid
        conn.commit()
        conn.close()

        log_audit(user_id, role, 'USER_REGISTERED', 'AUTH', f"New {role} registered: {full_name} ({email})", 'user', user_id)

        if role == 'agent':
            return jsonify({
                'success': True,
                'message': 'Agent registration submitted successfully! Awaiting Administrator authorization approval.',
                'requires_approval': True
            })

        # Auto login citizen
        session['user_id'] = user_id
        return jsonify({
            'success': True,
            'message': 'Account created successfully! Welcome to DocTrust.',
            'user': {
                'id': user_id,
                'full_name': full_name,
                'email': email,
                'mobile': mobile,
                'role': role,
                'agent_status': agent_status
            }
        })
    except Exception as e:
        conn.close()
        return jsonify({'success': False, 'message': f'Registration error: {str(e)}'}), 500


@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not email or not password:
        return jsonify({'success': False, 'message': 'Email and password are required.'}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT id, full_name, email, mobile, password_hash, role, organization, department, agent_status
        FROM users WHERE email = ?
    ''', (email,))
    user = cursor.fetchone()

    if not user or not verify_password(user['password_hash'], password):
        conn.close()
        return jsonify({'success': False, 'message': 'Invalid email or password.'}), 401

    if user['role'] == 'agent' and user['agent_status'] == 'pending':
        conn.close()
        return jsonify({'success': False, 'message': 'Your Agent account is currently pending administrator verification. Please contact the DocTrust Governance Authority.'}), 403

    if user['role'] == 'agent' and user['agent_status'] in ['rejected', 'suspended']:
        conn.close()
        return jsonify({'success': False, 'message': f"Your Agent account has been {user['agent_status']} by Administrator."}), 403

    cursor.execute("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?", (user['id'],))
    conn.commit()
    conn.close()

    session['user_id'] = user['id']
    user_dict = {
        'id': user['id'],
        'full_name': user['full_name'],
        'email': user['email'],
        'mobile': user['mobile'],
        'role': user['role'],
        'organization': user['organization'],
        'department': user['department'],
        'agent_status': user['agent_status']
    }

    log_audit(user['id'], user['role'], 'USER_LOGIN', 'AUTH', f"User logged in: {user['full_name']} ({user['role']})", 'user', user['id'])

    return jsonify({
        'success': True,
        'message': f"Welcome back, {user['full_name']}!",
        'user': user_dict,
        'token': str(user['id']) # Lightweight token for client fallback
    })


@app.route('/api/auth/demo-login', methods=['POST'])
def demo_login():
    """Convenient one-click login for symposium demonstrations"""
    data = request.get_json() or {}
    role = data.get('role', 'citizen')

    email_map = {
        'citizen': 'rajesh.kumar@gmail.com',
        'agent': 'scholarship@gov.in',
        'bank_agent': 'loan.officer@sbi.co.in',
        'admin': 'admin@doctrust.gov.in'
    }

    target_email = email_map.get(role, 'rajesh.kumar@gmail.com')

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT id, full_name, email, mobile, role, organization, department, agent_status
        FROM users WHERE email = ?
    ''', (target_email,))
    user = cursor.fetchone()
    conn.close()

    if not user:
        return jsonify({'success': False, 'message': 'Demo account not found. Please run seed script.'}), 404

    session['user_id'] = user['id']
    user_dict = dict(user)

    log_audit(user['id'], user['role'], 'DEMO_LOGIN', 'AUTH', f"Demo switch to role: {user['role']} ({user['full_name']})", 'user', user['id'])

    return jsonify({
        'success': True,
        'message': f"Logged in as Demo {user['role'].capitalize()} ({user['full_name']})",
        'user': user_dict,
        'token': str(user['id'])
    })


@app.route('/api/auth/logout', methods=['POST'])
def logout():
    user = get_current_user()
    if user:
        log_audit(user['id'], user['role'], 'USER_LOGOUT', 'AUTH', f"User logged out: {user['full_name']}")
    session.clear()
    return jsonify({'success': True, 'message': 'Logged out successfully.'})


@app.route('/api/auth/me', methods=['GET'])
def get_me():
    user = get_current_user()
    if not user:
        return jsonify({'success': False, 'user': None}), 200
    return jsonify({'success': True, 'user': user})


# ============================================================================
# CITIZEN DOCUMENT MANAGEMENT API
# ============================================================================

@app.route('/api/documents', methods=['GET'])
@login_required
def list_documents():
    user = get_current_user()
    conn = get_db()
    cursor = conn.cursor()

    if user['role'] == 'citizen':
        cursor.execute('''
            SELECT id, doc_type, doc_name, description, original_filename, file_size, file_hash, mime_type, status, uploaded_at
            FROM documents
            WHERE citizen_id = ? AND status != 'archived'
            ORDER BY uploaded_at DESC
        ''', (user['id'],))
        docs = [dict(row) for row in cursor.fetchall()]
    elif user['role'] == 'admin':
        cursor.execute('''
            SELECT d.id, d.citizen_id, u.full_name as citizen_name, u.email as citizen_email,
                   d.doc_type, d.doc_name, d.description, d.original_filename, d.file_size,
                   d.file_hash, d.mime_type, d.status, d.uploaded_at
            FROM documents d
            JOIN users u ON d.citizen_id = u.id
            ORDER BY d.uploaded_at DESC
        ''')
        docs = [dict(row) for row in cursor.fetchall()]
    else:
        conn.close()
        return jsonify({'success': False, 'message': 'Agents cannot list unshared citizen documents.'}), 403

    conn.close()
    return jsonify({'success': True, 'documents': docs})


@app.route('/api/documents/upload', methods=['POST'])
@login_required
@role_required('citizen')
def upload_document():
    user = get_current_user()

    if 'file' not in request.files:
        return jsonify({'success': False, 'message': 'No file part in the request.'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'success': False, 'message': 'No file selected.'}), 400

    if not allowed_file(file.filename):
        return jsonify({'success': False, 'message': f"Unsupported file type. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"}), 400

    doc_type = request.form.get('doc_type', 'Other supporting documents').strip()
    doc_name = request.form.get('doc_name', '').strip()
    description = request.form.get('description', '').strip()

    if not doc_name:
        doc_name = file.filename.rsplit('.', 1)[0]

    original_filename = secure_filename(file.filename)
    extension = original_filename.rsplit('.', 1)[1].lower() if '.' in original_filename else 'bin'
    stored_filename = f"doc_{user['id']}_{uuid.uuid4().hex[:10]}.{extension}"
    filepath = os.path.join(UPLOAD_DIR, stored_filename)

    file.save(filepath)
    file_size = os.path.getsize(filepath)
    file_hash = calculate_sha256(filepath)
    mime_type = file.content_type or 'application/octet-stream'

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO documents (citizen_id, doc_type, doc_name, description, original_filename, stored_filename, file_size, file_hash, mime_type, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
    ''', (user['id'], doc_type, doc_name, description, original_filename, stored_filename, file_size, file_hash, mime_type))
    doc_id = cursor.lastrowid
    conn.commit()
    conn.close()

    log_audit(user['id'], user['role'], 'DOCUMENT_UPLOAD', 'DOCUMENT', 
              f"Uploaded {doc_name} ({doc_type}). SHA-256: {file_hash[:16]}...", 'document', doc_id)

    return jsonify({
        'success': True,
        'message': f"Document '{doc_name}' uploaded and verified successfully.",
        'document': {
            'id': doc_id,
            'doc_type': doc_type,
            'doc_name': doc_name,
            'description': description,
            'original_filename': original_filename,
            'file_size': file_size,
            'file_hash': file_hash,
            'uploaded_at': datetime.now().isoformat()
        }
    })


@app.route('/api/documents/<int:doc_id>/verify-hash', methods=['GET'])
@login_required
def verify_document_integrity(doc_id):
    """Recomputes SHA-256 on disk and compares with registered hash to prove authenticity."""
    user = get_current_user()
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM documents WHERE id = ?", (doc_id,))
    doc = cursor.fetchone()
    conn.close()

    if not doc:
        return jsonify({'success': False, 'message': 'Document not found.'}), 404

    # Security check: citizen owner, admin, or authorized agent with approved consent
    is_authorized = False
    if user['role'] == 'admin' or (user['role'] == 'citizen' and doc['citizen_id'] == user['id']):
        is_authorized = True
    elif user['role'] == 'agent':
        # Check active consent
        conn = get_db()
        c = conn.cursor()
        c.execute('''
            SELECT r.id FROM document_requests r
            JOIN request_approved_documents rad ON r.id = rad.request_id
            WHERE rad.document_id = ? AND r.agent_id = ? AND r.status IN ('approved', 'partially_approved') AND rad.is_revoked = 0
        ''', (doc_id, user['id']))
        if c.fetchone():
            is_authorized = True
        conn.close()

    if not is_authorized:
        return jsonify({'success': False, 'message': 'Access forbidden. Citizen consent not granted.'}), 403

    filepath = os.path.join(UPLOAD_DIR, doc['stored_filename'])
    if not os.path.exists(filepath):
        return jsonify({'success': False, 'message': 'Document storage file missing.'}), 404

    current_hash = calculate_sha256(filepath)
    stored_hash = doc['file_hash']
    is_tamper_free = (current_hash == stored_hash)

    return jsonify({
        'success': True,
        'doc_name': doc['doc_name'],
        'stored_hash': stored_hash,
        'computed_hash': current_hash,
        'is_tamper_free': is_tamper_free,
        'verification_algorithm': 'SHA-256 Cryptographic Hash',
        'status': 'VERIFIED AUTHENTIC & UNMODIFIED' if is_tamper_free else 'INTEGRITY MISMATCH DETECTED'
    })


@app.route('/api/documents/<int:doc_id>/view', methods=['GET'])
@login_required
def view_document(doc_id):
    """Secure preview with mandatory consent verification."""
    user = get_current_user()
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM documents WHERE id = ?", (doc_id,))
    doc = cursor.fetchone()

    if not doc:
        conn.close()
        return jsonify({'success': False, 'message': 'Document not found.'}), 404

    # Authorization Check
    authorized = False
    req_context = None

    if user['role'] == 'citizen' and doc['citizen_id'] == user['id']:
        authorized = True
    elif user['role'] == 'admin':
        authorized = True
    elif user['role'] == 'agent':
        # Must have citizen's active consent for this exact document!
        cursor.execute('''
            SELECT r.id, r.request_code, r.service_name, rad.id as rad_id, rad.access_count
            FROM document_requests r
            JOIN request_approved_documents rad ON r.id = rad.request_id
            WHERE rad.document_id = ? AND r.agent_id = ? AND r.status IN ('approved', 'partially_approved') AND rad.is_revoked = 0
        ''', (doc_id, user['id']))
        approved_link = cursor.fetchone()
        if approved_link:
            authorized = True
            req_context = dict(approved_link)
            # Update access count & timestamp
            cursor.execute('''
                UPDATE request_approved_documents
                SET access_count = access_count + 1, last_accessed = CURRENT_TIMESTAMP
                WHERE id = ?
            ''', (approved_link['rad_id'],))
            conn.commit()

    conn.close()

    if not authorized:
        log_audit(user['id'], user['role'], 'UNAUTHORIZED_ACCESS_ATTEMPT', 'SECURITY', 
                  f"Attempted to view document ID {doc_id} without citizen consent", 'document', doc_id)
        return jsonify({'success': False, 'message': 'Access Forbidden: Citizen consent not granted for this document.'}), 403

    filepath = os.path.join(UPLOAD_DIR, doc['stored_filename'])
    if not os.path.exists(filepath):
        return jsonify({'success': False, 'message': 'Physical file missing from secure storage.'}), 404

    log_audit(user['id'], user['role'], 'DOCUMENT_ACCESSED', 'ACCESS', 
              f"Viewed document '{doc['doc_name']}'" + (f" under request {req_context['request_code']}" if req_context else ""), 'document', doc_id)

    # Return file for inline preview
    return send_file(
        filepath,
        mimetype=doc['mime_type'],
        as_attachment=False,
        download_name=doc['original_filename']
    )


@app.route('/api/documents/<int:doc_id>/download', methods=['GET'])
@login_required
def download_document(doc_id):
    """Secure download with mandatory consent verification."""
    user = get_current_user()
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM documents WHERE id = ?", (doc_id,))
    doc = cursor.fetchone()

    if not doc:
        conn.close()
        return jsonify({'success': False, 'message': 'Document not found.'}), 404

    authorized = False
    req_context = None

    if user['role'] == 'citizen' and doc['citizen_id'] == user['id']:
        authorized = True
    elif user['role'] == 'admin':
        authorized = True
    elif user['role'] == 'agent':
        cursor.execute('''
            SELECT r.id, r.request_code, rad.id as rad_id
            FROM document_requests r
            JOIN request_approved_documents rad ON r.id = rad.request_id
            WHERE rad.document_id = ? AND r.agent_id = ? AND r.status IN ('approved', 'partially_approved') AND rad.is_revoked = 0
        ''', (doc_id, user['id']))
        approved_link = cursor.fetchone()
        if approved_link:
            authorized = True
            req_context = dict(approved_link)
            cursor.execute('''
                UPDATE request_approved_documents
                SET access_count = access_count + 1, last_accessed = CURRENT_TIMESTAMP
                WHERE id = ?
            ''', (approved_link['rad_id'],))
            conn.commit()

    conn.close()

    if not authorized:
        return jsonify({'success': False, 'message': 'Access Forbidden: Citizen consent not granted.'}), 403

    filepath = os.path.join(UPLOAD_DIR, doc['stored_filename'])
    if not os.path.exists(filepath):
        return jsonify({'success': False, 'message': 'File missing from secure storage.'}), 404

    log_audit(user['id'], user['role'], 'DOCUMENT_DOWNLOADED', 'ACCESS', 
              f"Downloaded document '{doc['doc_name']}'" + (f" under request {req_context['request_code']}" if req_context else ""), 'document', doc_id)

    return send_file(
        filepath,
        mimetype=doc['mime_type'],
        as_attachment=True,
        download_name=doc['original_filename']
    )


@app.route('/api/documents/<int:doc_id>', methods=['DELETE'])
@login_required
@role_required('citizen')
def delete_document(doc_id):
    user = get_current_user()
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM documents WHERE id = ? AND citizen_id = ?", (doc_id, user['id']))
    doc = cursor.fetchone()

    if not doc:
        conn.close()
        return jsonify({'success': False, 'message': 'Document not found or unauthorized.'}), 404

    # Remove file from disk
    filepath = os.path.join(UPLOAD_DIR, doc['stored_filename'])
    if os.path.exists(filepath):
        try:
            os.remove(filepath)
        except Exception as e:
            print(f"Error removing file: {e}")

    cursor.execute("DELETE FROM documents WHERE id = ?", (doc_id,))
    conn.commit()
    conn.close()

    log_audit(user['id'], user['role'], 'DOCUMENT_DELETED', 'DOCUMENT', f"Deleted document '{doc['doc_name']}'", 'document', doc_id)

    return jsonify({'success': True, 'message': f"Document '{doc['doc_name']}' deleted successfully."})


# ============================================================================
# DOCUMENT REQUEST & CONSENT SYSTEM API
# ============================================================================

@app.route('/api/citizens', methods=['GET'])
@login_required
@role_required('agent', 'admin')
def get_citizens_list():
    """Agent needs to select registered citizen when initiating request"""
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT id, full_name, email, mobile, created_at
        FROM users WHERE role = 'citizen' AND agent_status = 'active'
        ORDER BY full_name ASC
    ''')
    citizens = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify({'success': True, 'citizens': citizens})


@app.route('/api/requests', methods=['GET'])
@login_required
def get_requests():
    user = get_current_user()
    conn = get_db()
    cursor = conn.cursor()

    if user['role'] == 'citizen':
        cursor.execute('''
            SELECT r.*,
                   u.full_name as agent_name, u.organization as agent_org, u.department as agent_dept, u.email as agent_email
            FROM document_requests r
            JOIN users u ON r.agent_id = u.id
            WHERE r.citizen_id = ?
            ORDER BY r.created_at DESC
        ''', (user['id'],))
        raw_requests = cursor.fetchall()

    elif user['role'] == 'agent':
        cursor.execute('''
            SELECT r.*,
                   u.full_name as citizen_name, u.email as citizen_email, u.mobile as citizen_mobile
            FROM document_requests r
            JOIN users u ON r.citizen_id = u.id
            WHERE r.agent_id = ?
            ORDER BY r.created_at DESC
        ''', (user['id'],))
        raw_requests = cursor.fetchall()

    else: # admin
        cursor.execute('''
            SELECT r.*,
                   ag.full_name as agent_name, ag.organization as agent_org,
                   cit.full_name as citizen_name, cit.email as citizen_email
            FROM document_requests r
            JOIN users ag ON r.agent_id = ag.id
            JOIN users cit ON r.citizen_id = cit.id
            ORDER BY r.created_at DESC
        ''')
        raw_requests = cursor.fetchall()

    requests_list = []
    for r in raw_requests:
        req_item = row_to_dict(r)
        # Fetch approved documents for this request
        cursor.execute('''
            SELECT d.id, d.doc_name, d.doc_type, d.file_size, d.file_hash, d.uploaded_at,
                   rad.approved_at, rad.access_count, rad.last_accessed, rad.is_revoked
            FROM request_approved_documents rad
            JOIN documents d ON rad.document_id = d.id
            WHERE rad.request_id = ?
        ''', (req_item['id'],))
        req_item['approved_documents'] = [dict(d_row) for d_row in cursor.fetchall()]
        requests_list.append(req_item)

    conn.close()
    return jsonify({'success': True, 'requests': requests_list})


@app.route('/api/requests', methods=['POST'])
@login_required
@role_required('agent')
def create_request():
    user = get_current_user()
    data = request.get_json() or {}

    citizen_id = data.get('citizen_id')
    service_name = data.get('service_name', '').strip()
    purpose = data.get('purpose', '').strip()
    message = data.get('message', '').strip()
    required_doc_types = data.get('required_doc_types', [])
    expiry_date = data.get('expiry_date')

    if not citizen_id or not service_name or not purpose or not required_doc_types:
        return jsonify({'success': False, 'message': 'Citizen, Service Name, Purpose, and at least one required document type are mandatory.'}), 400

    if not isinstance(required_doc_types, list) or len(required_doc_types) == 0:
        return jsonify({'success': False, 'message': 'Please specify required document types.'}), 400

    conn = get_db()
    cursor = conn.cursor()
    # Check citizen exists
    cursor.execute("SELECT id, full_name, email FROM users WHERE id = ? AND role = 'citizen'", (citizen_id,))
    citizen = cursor.fetchone()
    if not citizen:
        conn.close()
        return jsonify({'success': False, 'message': 'Selected citizen not found.'}), 404

    request_code = generate_request_code()
    req_docs_json = json.dumps(required_doc_types)

    cursor.execute('''
        INSERT INTO document_requests (request_code, agent_id, citizen_id, service_name, purpose, message, required_doc_types, status, expiry_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)
    ''', (request_code, user['id'], citizen_id, service_name, purpose, message, req_docs_json, expiry_date))
    req_id = cursor.lastrowid
    conn.commit()
    conn.close()

    log_audit(user['id'], user['role'], 'REQUEST_CREATED', 'REQUEST', 
              f"Created request {request_code} for {citizen['full_name']} ({service_name})", 'request', req_id)

    return jsonify({
        'success': True,
        'message': f"Document sharing request {request_code} transmitted to citizen {citizen['full_name']}.",
        'request_code': request_code,
        'request_id': req_id
    })


@app.route('/api/requests/<int:req_id>/respond', methods=['POST'])
@login_required
@role_required('citizen')
def respond_request(req_id):
    """
    CRITICAL CORE PRINCIPLE: Citizen remains in control of document sharing!
    Citizen reviews requested items and selectively approves only chosen documents or rejects request.
    """
    user = get_current_user()
    data = request.get_json() or {}
    decision = data.get('decision') # 'approve' or 'reject'
    approved_doc_ids = data.get('approved_doc_ids', []) # List of document IDs approved by citizen
    rejection_reason = data.get('rejection_reason', '').strip()

    if decision not in ['approve', 'reject']:
        return jsonify({'success': False, 'message': "Decision must be 'approve' or 'reject'."}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT r.*, u.full_name as agent_name, u.organization as agent_org
        FROM document_requests r
        JOIN users u ON r.agent_id = u.id
        WHERE r.id = ? AND r.citizen_id = ?
    ''', (req_id, user['id']))
    req_data = cursor.fetchone()

    if not req_data:
        conn.close()
        return jsonify({'success': False, 'message': 'Request not found or access denied.'}), 404

    if req_data['status'] not in ['pending']:
        conn.close()
        return jsonify({'success': False, 'message': f"Request has already been {req_data['status']}."}), 400

    if decision == 'reject':
        cursor.execute('''
            UPDATE document_requests
            SET status = 'rejected', rejection_reason = ?, responded_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ''', (rejection_reason or "Rejected by citizen", req_id))
        conn.commit()
        conn.close()

        log_audit(user['id'], user['role'], 'CONSENT_REJECTED', 'CONSENT', 
                  f"Citizen rejected request {req_data['request_code']} from {req_data['agent_name']}. Reason: {rejection_reason}", 'request', req_id)

        return jsonify({'success': True, 'message': f"Request {req_data['request_code']} rejected."})

    # Decision == 'approve'
    if not approved_doc_ids or not isinstance(approved_doc_ids, list):
        conn.close()
        return jsonify({'success': False, 'message': 'Please select at least one document to share, or choose reject.'}), 400

    # Verify that all approved_doc_ids actually belong to this citizen
    placeholders = ','.join('?' for _ in approved_doc_ids)
    cursor.execute(f"SELECT id, doc_name, doc_type FROM documents WHERE id IN ({placeholders}) AND citizen_id = ?", (*approved_doc_ids, user['id']))
    valid_docs = cursor.fetchall()

    if len(valid_docs) != len(approved_doc_ids):
        conn.close()
        return jsonify({'success': False, 'message': 'Invalid documents selected.'}), 400

    # Determine if full or partial approval
    required_types = json.loads(req_data['required_doc_types']) if isinstance(req_data['required_doc_types'], str) else req_data['required_doc_types']
    approved_types = set(d['doc_type'] for d in valid_docs)
    is_partial = len(approved_types) < len(required_types)
    new_status = 'partially_approved' if is_partial else 'approved'

    # Record consent in request_approved_documents
    for doc in valid_docs:
        cursor.execute('''
            INSERT OR REPLACE INTO request_approved_documents (request_id, document_id, approved_at, access_count, is_revoked)
            VALUES (?, ?, CURRENT_TIMESTAMP, 0, 0)
        ''', (req_id, doc['id']))

    cursor.execute('''
        UPDATE document_requests
        SET status = ?, responded_at = CURRENT_TIMESTAMP
        WHERE id = ?
    ''', (new_status, req_id))
    conn.commit()
    conn.close()

    shared_names = ", ".join(d['doc_name'] for d in valid_docs)
    log_audit(user['id'], user['role'], 'CONSENT_GRANTED', 'CONSENT', 
              f"Citizen granted selective consent for [{shared_names}] to agent {req_data['agent_name']} ({req_data['agent_org']}) for {req_data['service_name']}", 'request', req_id)

    return jsonify({
        'success': True,
        'message': f"Selective consent granted successfully! Shared {len(valid_docs)} document(s) with {req_data['agent_name']}.",
        'status': new_status
    })


@app.route('/api/requests/<int:req_id>/revoke', methods=['POST'])
@login_required
@role_required('citizen')
def revoke_request(req_id):
    """Citizen actively revokes previously granted document access."""
    user = get_current_user()
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT r.*, u.full_name as agent_name
        FROM document_requests r
        JOIN users u ON r.agent_id = u.id
        WHERE r.id = ? AND r.citizen_id = ?
    ''', (req_id, user['id']))
    req_data = cursor.fetchone()

    if not req_data:
        conn.close()
        return jsonify({'success': False, 'message': 'Request not found.'}), 404

    cursor.execute("UPDATE request_approved_documents SET is_revoked = 1 WHERE request_id = ?", (req_id,))
    cursor.execute("UPDATE document_requests SET status = 'revoked' WHERE id = ?", (req_id,))
    conn.commit()
    conn.close()

    log_audit(user['id'], user['role'], 'CONSENT_REVOKED', 'CONSENT', 
              f"Citizen revoked document access from agent {req_data['agent_name']} for request {req_data['request_code']}", 'request', req_id)

    return jsonify({'success': True, 'message': f"Access revoked for request {req_data['request_code']}. The agent can no longer access these documents."})


# ============================================================================
# AUDIT LOGS & ACCESS HISTORY API
# ============================================================================

@app.route('/api/history', methods=['GET'])
@login_required
def get_sharing_history():
    user = get_current_user()
    conn = get_db()
    cursor = conn.cursor()

    if user['role'] == 'citizen':
        # Citizen view of shared history
        cursor.execute('''
            SELECT rad.id, rad.approved_at, rad.access_count, rad.last_accessed, rad.is_revoked,
                   d.id as doc_id, d.doc_name, d.doc_type, d.file_hash,
                   r.id as request_id, r.request_code, r.service_name, r.purpose, r.status as request_status, r.expiry_date,
                   ag.full_name as agent_name, ag.organization as agent_org, ag.department as agent_dept
            FROM request_approved_documents rad
            JOIN documents d ON rad.document_id = d.id
            JOIN document_requests r ON rad.request_id = r.id
            JOIN users ag ON r.agent_id = ag.id
            WHERE d.citizen_id = ?
            ORDER BY rad.approved_at DESC
        ''', (user['id'],))
        history = [dict(row) for row in cursor.fetchall()]

    elif user['role'] == 'agent':
        # Agent view of approved documents they can inspect
        cursor.execute('''
            SELECT rad.id, rad.approved_at, rad.access_count, rad.last_accessed, rad.is_revoked,
                   d.id as doc_id, d.doc_name, d.doc_type, d.file_size, d.file_hash, d.uploaded_at,
                   r.id as request_id, r.request_code, r.service_name, r.purpose, r.status as request_status, r.expiry_date,
                   cit.full_name as citizen_name, cit.email as citizen_email
            FROM request_approved_documents rad
            JOIN documents d ON rad.document_id = d.id
            JOIN document_requests r ON rad.request_id = r.id
            JOIN users cit ON r.citizen_id = cit.id
            WHERE r.agent_id = ? AND rad.is_revoked = 0 AND r.status IN ('approved', 'partially_approved')
            ORDER BY rad.approved_at DESC
        ''', (user['id'],))
        history = [dict(row) for row in cursor.fetchall()]
    else:
        history = []

    conn.close()
    return jsonify({'success': True, 'history': history})


# ============================================================================
# ADMINISTRATOR API
# ============================================================================

@app.route('/api/admin/stats', methods=['GET'])
@login_required
@role_required('admin')
def get_admin_stats():
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) FROM users WHERE role = 'citizen'")
    total_citizens = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM users WHERE role = 'agent'")
    total_agents = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM users WHERE role = 'agent' AND agent_status = 'pending'")
    pending_agents = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM documents WHERE status = 'active'")
    total_docs = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM document_requests")
    total_requests = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM request_approved_documents WHERE is_revoked = 0")
    total_shares = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM audit_logs")
    total_audit_events = cursor.fetchone()[0]

    conn.close()
    return jsonify({
        'success': True,
        'stats': {
            'total_citizens': total_citizens,
            'total_agents': total_agents,
            'pending_agents': pending_agents,
            'total_documents': total_docs,
            'total_requests': total_requests,
            'total_shares': total_shares,
            'total_audit_events': total_audit_events
        }
    })


@app.route('/api/admin/users', methods=['GET'])
@login_required
@role_required('admin')
def get_admin_users():
    role_filter = request.args.get('role', '')
    query = request.args.get('q', '').strip().lower()

    conn = get_db()
    cursor = conn.cursor()

    sql = "SELECT id, full_name, email, mobile, role, organization, department, agent_status, created_at, last_login FROM users WHERE 1=1"
    params = []

    if role_filter:
        sql += " AND role = ?"
        params.append(role_filter)

    if query:
        sql += " AND (LOWER(full_name) LIKE ? OR LOWER(email) LIKE ? OR LOWER(organization) LIKE ?)"
        params.extend([f"%{query}%", f"%{query}%", f"%{query}%"])

    sql += " ORDER BY created_at DESC"
    cursor.execute(sql, params)
    users = [dict(row) for row in cursor.fetchall()]
    conn.close()

    return jsonify({'success': True, 'users': users})


@app.route('/api/admin/agents/<int:agent_id>/status', methods=['POST'])
@login_required
@role_required('admin')
def update_agent_status(agent_id):
    user = get_current_user()
    data = request.get_json() or {}
    new_status = data.get('status') # 'active', 'rejected', 'suspended'

    if new_status not in ['active', 'rejected', 'suspended']:
        return jsonify({'success': False, 'message': 'Invalid status.'}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, full_name, email, role FROM users WHERE id = ? AND role = 'agent'", (agent_id,))
    agent = cursor.fetchone()

    if not agent:
        conn.close()
        return jsonify({'success': False, 'message': 'Agent not found.'}), 404

    cursor.execute("UPDATE users SET agent_status = ? WHERE id = ?", (new_status, agent_id))
    conn.commit()
    conn.close()

    log_audit(user['id'], 'admin', 'AGENT_STATUS_UPDATED', 'ADMIN', 
              f"Administrator changed agent {agent['full_name']} ({agent['email']}) status to {new_status}", 'user', agent_id)

    return jsonify({'success': True, 'message': f"Agent {agent['full_name']} status updated to '{new_status}'."})


@app.route('/api/admin/audit-logs', methods=['GET'])
@login_required
@role_required('admin')
def get_audit_logs():
    category = request.args.get('category', '')
    limit = int(request.args.get('limit', 100))

    conn = get_db()
    cursor = conn.cursor()

    if category:
        cursor.execute('''
            SELECT al.*, u.full_name as user_name, u.email as user_email
            FROM audit_logs al
            LEFT JOIN users u ON al.user_id = u.id
            WHERE al.category = ?
            ORDER BY al.timestamp DESC
            LIMIT ?
        ''', (category, limit))
    else:
        cursor.execute('''
            SELECT al.*, u.full_name as user_name, u.email as user_email
            FROM audit_logs al
            LEFT JOIN users u ON al.user_id = u.id
            ORDER BY al.timestamp DESC
            LIMIT ?
        ''', (limit,))

    logs = [dict(row) for row in cursor.fetchall()]
    conn.close()

    return jsonify({'success': True, 'logs': logs})


# ============================================================================
# SYSTEM HEALTH & RECENT ACTIVITY
# ============================================================================

@app.route('/api/activity', methods=['GET'])
@login_required
def get_recent_activity():
    """Recent timeline activity tailored for citizen, agent, or admin"""
    user = get_current_user()
    conn = get_db()
    cursor = conn.cursor()

    if user['role'] == 'citizen':
        cursor.execute('''
            SELECT al.action, al.category, al.details, al.timestamp
            FROM audit_logs al
            WHERE al.user_id = ? OR (al.category IN ('REQUEST', 'CONSENT', 'ACCESS') AND al.details LIKE ?)
            ORDER BY al.timestamp DESC LIMIT 15
        ''', (user['id'], f"%{user['full_name']}%"))
    elif user['role'] == 'agent':
        cursor.execute('''
            SELECT al.action, al.category, al.details, al.timestamp
            FROM audit_logs al
            WHERE al.user_id = ? OR (al.category IN ('CONSENT', 'REQUEST') AND al.details LIKE ?)
            ORDER BY al.timestamp DESC LIMIT 15
        ''', (user['id'], f"%{user['full_name']}%"))
    else:
        cursor.execute('''
            SELECT al.action, al.category, al.details, al.timestamp, u.full_name as user_name
            FROM audit_logs al
            LEFT JOIN users u ON al.user_id = u.id
            ORDER BY al.timestamp DESC LIMIT 20
        ''')

    activity = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return jsonify({'success': True, 'activity': activity})


# ============================================================================
# PUBLIC / SPA ROUTE
# ============================================================================

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_spa(path):
    # If file exists in static, let Flask serve it
    if path and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    return render_template('index.html')


if __name__ == '__main__':
    init_db()
    print("Starting DocTrust Server on http://127.0.0.1:5000 ...")
    app.run(host='127.0.0.1', port=5000, debug=True)

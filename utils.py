"""
DocTrust - Utility Functions & Security Helpers
"""
import os
import hashlib
import uuid
import json
from datetime import datetime
from backend.models import get_db

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'uploads')
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {'pdf', 'png', 'jpg', 'jpeg', 'webp', 'doc', 'docx', 'txt'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def calculate_sha256(filepath_or_bytes):
    sha256_hash = hashlib.sha256()
    if isinstance(filepath_or_bytes, bytes):
        sha256_hash.update(filepath_or_bytes)
    else:
        with open(filepath_or_bytes, "rb") as f:
            for byte_block in iter(lambda: f.read(65536), b""):
                sha256_hash.update(byte_block)
    return sha256_hash.hexdigest()

def generate_request_code():
    random_part = uuid.uuid4().hex[:6].upper()
    year = datetime.now().year
    return f"REQ-{year}-{random_part}"

def log_audit(user_id, user_role, action, category, details, target_type=None, target_id=None, ip_address="127.0.0.1"):
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO audit_logs (user_id, user_role, action, category, target_type, target_id, details, ip_address, timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        ''', (user_id, user_role, action, category, target_type, str(target_id) if target_id else None, details, ip_address))
        conn.commit()
        conn.close()
    except Exception as e:
        print(f"Error logging audit: {e}")

def row_to_dict(row):
    if row is None:
        return None
    d = dict(row)
    # Parse json fields if applicable
    if 'required_doc_types' in d and isinstance(d['required_doc_types'], str):
        try:
            d['required_doc_types'] = json.loads(d['required_doc_types'])
        except Exception:
            d['required_doc_types'] = [d['required_doc_types']]
    return d

"""
DocTrust - Database Models
Centralized Digital Document Authentication System
"""
import os
import sqlite3
from datetime import datetime, timezone

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'doctrust.db')

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()
    
    # 1. Users Table (Citizens, Agents, Admins)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        full_name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        mobile TEXT,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('citizen', 'agent', 'admin')),
        organization TEXT,
        department TEXT,
        agent_status TEXT DEFAULT 'active' CHECK(agent_status IN ('pending', 'active', 'rejected', 'suspended')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP
    )
    ''')

    # 2. Documents Table (Citizen documents)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        citizen_id INTEGER NOT NULL,
        doc_type TEXT NOT NULL,
        doc_name TEXT NOT NULL,
        description TEXT,
        original_filename TEXT NOT NULL,
        stored_filename TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        file_hash TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        status TEXT DEFAULT 'active' CHECK(status IN ('active', 'archived', 'revoked')),
        uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (citizen_id) REFERENCES users(id) ON DELETE CASCADE
    )
    ''')

    # 3. Document Requests Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS document_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        request_code TEXT UNIQUE NOT NULL,
        agent_id INTEGER NOT NULL,
        citizen_id INTEGER NOT NULL,
        service_name TEXT NOT NULL,
        purpose TEXT NOT NULL,
        message TEXT,
        required_doc_types TEXT NOT NULL, -- JSON array of strings
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'partially_approved', 'rejected', 'revoked', 'expired')),
        rejection_reason TEXT,
        expiry_date TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        responded_at TIMESTAMP,
        FOREIGN KEY (agent_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (citizen_id) REFERENCES users(id) ON DELETE CASCADE
    )
    ''')

    # 4. Request Approved Documents (Granular / Selective Consent Link)
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS request_approved_documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        request_id INTEGER NOT NULL,
        document_id INTEGER NOT NULL,
        approved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        access_count INTEGER DEFAULT 0,
        last_accessed TIMESTAMP,
        is_revoked INTEGER DEFAULT 0,
        FOREIGN KEY (request_id) REFERENCES document_requests(id) ON DELETE CASCADE,
        FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
        UNIQUE(request_id, document_id)
    )
    ''')

    # 5. Immutable Audit & Access Logs Table
    cursor.execute('''
    CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        user_role TEXT,
        action TEXT NOT NULL,
        category TEXT NOT NULL, -- AUTH, DOCUMENT, REQUEST, CONSENT, ACCESS, ADMIN
        target_type TEXT,
        target_id TEXT,
        details TEXT NOT NULL,
        ip_address TEXT DEFAULT '127.0.0.1',
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    )
    ''')

    conn.commit()
    conn.close()

if __name__ == '__main__':
    init_db()
    print("DocTrust database schema initialized successfully.")

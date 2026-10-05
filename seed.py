"""
DocTrust - Seed Data Generator
Initializes database with realistic citizens, agents, admin, documents, and requests.
"""
import os
import json
from datetime import datetime, timedelta
from backend.models import init_db, get_db, DB_PATH
from backend.auth import hash_password
from backend.utils import calculate_sha256, UPLOAD_DIR, log_audit

def create_sample_file(filename, content_title, citizen_name, doc_id_code):
    filepath = os.path.join(UPLOAD_DIR, filename)
    content = f"""================================================================================
                    GOVERNMENT OF INDIA / OFFICIAL DOCUMENT RECORD
================================================================================
Document Type    : {content_title}
Document ID      : {doc_id_code}
Issued To        : {citizen_name}
Issuing Authority: Digital Records Directorate, Government of India
Issue Date       : 2026-01-15
Status           : VERIFIED ORIGINAL RECORD

Security Notice:
This document is digitally registered in the DocTrust Centralized Authentication
System. Integrity verification hash is recorded in the immutable audit ledger.
The citizen retains sole discretionary authority to grant or revoke selective
access permissions to authorized agents.

Verification Watermark: [DOCTRUST-SECURE-HASH-AUTHENTICATED]
================================================================================
"""
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    
    file_hash = calculate_sha256(filepath)
    file_size = os.path.getsize(filepath)
    return filepath, file_hash, file_size

def seed_database():
    print("Initializing database schema...")
    init_db()
    
    conn = get_db()
    cursor = conn.cursor()

    # Check if admin already exists
    cursor.execute("SELECT id FROM users WHERE email = 'admin@doctrust.gov.in'")
    if cursor.fetchone():
        print("Database already contains seed data. Skipping re-seed.")
        conn.close()
        return

    print("Seeding users...")
    # Admin
    cursor.execute('''
        INSERT INTO users (full_name, email, mobile, password_hash, role, organization, department, agent_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        "Chief Security Administrator",
        "admin@doctrust.gov.in",
        "+91 9900112233",
        hash_password("Admin@123"),
        "admin",
        "DocTrust Governance Authority",
        "National Informatics & Security Division",
        "active"
    ))
    admin_id = cursor.lastrowid

    # Agents
    cursor.execute('''
        INSERT INTO users (full_name, email, mobile, password_hash, role, organization, department, agent_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        "Dr. Arvind Swaminathan",
        "scholarship@gov.in",
        "+91 9811223344",
        hash_password("Agent@123"),
        "agent",
        "National Scholarship Portal",
        "Higher Education Verification Cell",
        "active"
    ))
    agent_scholarship_id = cursor.lastrowid

    cursor.execute('''
        INSERT INTO users (full_name, email, mobile, password_hash, role, organization, department, agent_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        "Sunita Deshmukh",
        "loan.officer@sbi.co.in",
        "+91 9822334455",
        hash_password("Agent@123"),
        "agent",
        "State Bank of India",
        "Retail Credit & Mortgage Verification",
        "active"
    ))
    agent_bank_id = cursor.lastrowid

    cursor.execute('''
        INSERT INTO users (full_name, email, mobile, password_hash, role, organization, department, agent_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        "Karthik Raja",
        "passport.verify@mea.gov.in",
        "+91 9833445566",
        hash_password("Agent@123"),
        "agent",
        "Regional Passport Office",
        "Document Clearance Unit",
        "pending"
    ))
    agent_passport_id = cursor.lastrowid

    # Citizens
    cursor.execute('''
        INSERT INTO users (full_name, email, mobile, password_hash, role, organization, department, agent_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        "Rajesh Kumar",
        "rajesh.kumar@gmail.com",
        "+91 9876543210",
        hash_password("Citizen@123"),
        "citizen",
        None,
        None,
        "active"
    ))
    rajesh_id = cursor.lastrowid

    cursor.execute('''
        INSERT INTO users (full_name, email, mobile, password_hash, role, organization, department, agent_status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        "Priya Sharma",
        "priya.sharma@gmail.com",
        "+91 9845012345",
        hash_password("Citizen@123"),
        "citizen",
        None,
        None,
        "active"
    ))
    priya_id = cursor.lastrowid

    print("Seeding documents for Rajesh Kumar...")
    # Create sample documents
    doc_specs = [
        ("Aadhaar / ID Proof", "Aadhaar Identity Card", "Official Unique Identification Authority of India (UIDAI) Card", "doc_aadhaar_rajesh.txt", "AADHAAR-8921-4320-1123"),
        ("Marksheet", "B.Tech Final Consolidated Marksheet", "Department of Computer Science & Engineering, 8.92 CGPA", "doc_marksheet_rajesh.txt", "TRANSCRIPT-CSE-2026-904"),
        ("Address Proof", "Electricity Board Utility Statement", "Verified residential proof for 42, Green Park Avenue", "doc_address_rajesh.txt", "UTIL-EB-2026-5541"),
        ("Income Certificate", "Annual Family Income Certificate", "Issued by Tahsildar Revenue Office (Annual Income INR 2,40,000)", "doc_income_rajesh.txt", "REV-INC-2026-1188")
    ]

    doc_ids = {}
    for doc_type, doc_name, desc, filename, code in doc_specs:
        _, file_hash, file_size = create_sample_file(filename, doc_name, "Rajesh Kumar", code)
        cursor.execute('''
            INSERT INTO documents (citizen_id, doc_type, doc_name, description, original_filename, stored_filename, file_size, file_hash, mime_type, status, uploaded_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', datetime('now', '-5 days'))
        ''', (rajesh_id, doc_type, doc_name, desc, filename, filename, file_size, file_hash, "text/plain"))
        doc_ids[doc_type] = cursor.lastrowid
        
        # Audit log for upload
        cursor.execute('''
            INSERT INTO audit_logs (user_id, user_role, action, category, target_type, target_id, details, ip_address, timestamp)
            VALUES (?, 'citizen', 'DOCUMENT_UPLOAD', 'DOCUMENT', 'document', ?, ?, '127.0.0.1', datetime('now', '-5 days'))
        ''', (rajesh_id, str(cursor.lastrowid), f"Uploaded {doc_name} (SHA-256: {file_hash[:16]}...)"))

    print("Seeding document requests...")
    # 1. Pending Request from Scholarship Officer to Rajesh
    expiry_1 = (datetime.now() + timedelta(days=14)).strftime('%Y-%m-%d')
    req1_docs = json.dumps(["Marksheet", "Income Certificate", "Aadhaar / ID Proof"])
    cursor.execute('''
        INSERT INTO document_requests (request_code, agent_id, citizen_id, service_name, purpose, message, required_doc_types, status, expiry_date, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, datetime('now', '-2 hours'))
    ''', ("REQ-2026-SCH891", agent_scholarship_id, rajesh_id, "National Post-Matric Merit Scholarship", 
          "Annual scholarship renewal and eligibility verification", 
          "Please verify and provide your latest transcript, income proof, and identity card.", req1_docs, expiry_1))
    req1_id = cursor.lastrowid

    cursor.execute('''
        INSERT INTO audit_logs (user_id, user_role, action, category, target_type, target_id, details, ip_address, timestamp)
        VALUES (?, 'agent', 'REQUEST_CREATED', 'REQUEST', 'request', ?, ?, '127.0.0.1', datetime('now', '-2 hours'))
    ''', (agent_scholarship_id, str(req1_id), f"Agent Dr. Arvind Swaminathan initiated request REQ-2026-SCH891 for Rajesh Kumar"))

    # 2. Approved Request from SBI Bank Loan Officer to Rajesh
    expiry_2 = (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d')
    req2_docs = json.dumps(["Aadhaar / ID Proof", "Address Proof"])
    cursor.execute('''
        INSERT INTO document_requests (request_code, agent_id, citizen_id, service_name, purpose, message, required_doc_types, status, expiry_date, created_at, responded_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'approved', ?, datetime('now', '-2 days'), datetime('now', '-1 days'))
    ''', ("REQ-2026-SBI440", agent_bank_id, rajesh_id, "SBI Pre-Approved Home Loan #HL-88421", 
          "KYC Verification for mortgage loan disbursement", 
          "Standard identity and address verification required by RBI norms.", req2_docs, expiry_2))
    req2_id = cursor.lastrowid

    # Approved documents linkage
    cursor.execute('''
        INSERT INTO request_approved_documents (request_id, document_id, approved_at, access_count, last_accessed)
        VALUES (?, ?, datetime('now', '-1 days'), 2, datetime('now', '-4 hours'))
    ''', (req2_id, doc_ids["Aadhaar / ID Proof"]))

    cursor.execute('''
        INSERT INTO request_approved_documents (request_id, document_id, approved_at, access_count, last_accessed)
        VALUES (?, ?, datetime('now', '-1 days'), 1, datetime('now', '-4 hours'))
    ''', (req2_id, doc_ids["Address Proof"]))

    cursor.execute('''
        INSERT INTO audit_logs (user_id, user_role, action, category, target_type, target_id, details, ip_address, timestamp)
        VALUES (?, 'citizen', 'CONSENT_GRANTED', 'CONSENT', 'request', ?, ?, '127.0.0.1', datetime('now', '-1 days'))
    ''', (rajesh_id, str(req2_id), "Citizen Rajesh Kumar granted selective consent for Aadhaar & Address Proof to Sunita Deshmukh (SBI)"))

    cursor.execute('''
        INSERT INTO audit_logs (user_id, user_role, action, category, target_type, target_id, details, ip_address, timestamp)
        VALUES (?, 'agent', 'DOCUMENT_ACCESSED', 'ACCESS', 'document', ?, ?, '127.0.0.1', datetime('now', '-4 hours'))
    ''', (agent_bank_id, str(doc_ids["Aadhaar / ID Proof"]), "Agent Sunita Deshmukh viewed verified Aadhaar card under approved request REQ-2026-SBI440"))

    # 3. Rejected Request from Passport Officer
    req3_docs = json.dumps(["Aadhaar / ID Proof", "Marksheet", "Income Certificate"])
    cursor.execute('''
        INSERT INTO document_requests (request_code, agent_id, citizen_id, service_name, purpose, message, required_doc_types, status, rejection_reason, created_at, responded_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'rejected', 'Income certificate is not legally mandatory for passport renewal.', datetime('now', '-4 days'), datetime('now', '-3 days'))
    ''', ("REQ-2026-PAS019", agent_passport_id, rajesh_id, "Passport Re-issue Expedited", 
          "Background document cross-check", 
          "Provide all personal and financial documents.", req3_docs))
    req3_id = cursor.lastrowid

    cursor.execute('''
        INSERT INTO audit_logs (user_id, user_role, action, category, target_type, target_id, details, ip_address, timestamp)
        VALUES (?, 'citizen', 'CONSENT_REJECTED', 'CONSENT', 'request', ?, ?, '127.0.0.1', datetime('now', '-3 days'))
    ''', (rajesh_id, str(req3_id), "Citizen Rajesh Kumar rejected request REQ-2026-PAS019. Reason: Over-collection of documents"))

    conn.commit()
    conn.close()
    print("Seed data successfully populated!")

if __name__ == '__main__':
    seed_database()

# DocTrust – Centralized Digital Document Authentication System
**College Symposium Project 2026 • Live Functional Application**

> **Core Tagline:**  
> *“Share only what is required. Stay in control of your documents.”*

---

## 1. Project Overview & Purpose

**DocTrust** is an academic symposium project designed to solve the critical friction and vulnerabilities of repeated physical certificate and document submissions.

### The Problem
* Citizens repeatedly carry hard copies and photocopies of essential documents (Aadhaar/ID Proof, Marksheets, Income Certificates, Address Proof) to various government cells, banks, and scholarship centers.
* Physical documents are frequently misplaced, unnecessarily retained indefinitely by intermediaries, duplicated without oversight, or subjected to identity theft.
* Citizens lack real-time visibility into who viewed, copied, or stored their personal certificates.

### The Proposed Solution
DocTrust introduces a centralized, citizen-controlled digital document authentication architecture:
* Citizens maintain a private, encrypted digital document vault.
* Authorized officers/agents request specific certificates for designated services.
* Citizens review the exact purpose and grant **granular, selective consent**.
* File integrity is guaranteed using **SHA-256 cryptographic fingerprints**.
* Access is temporal (time-bounded) and instantly revokable by the citizen.
* Every operation is recorded in an immutable audit ledger.

---

## 2. Core Principle & Workflow

> ### **“The citizen remains in control of document sharing.”**

DocTrust visibly demonstrates this complete lifecycle across the entire application:

```
Register ➔ Upload ➔ Request ➔ Review ➔ Consent ➔ Selective Share ➔ Application Processing ➔ Access Tracking
```

1. **Register:** Citizen creates a secure account with salted PBKDF2-SHA256 password hashing.
2. **Upload:** Citizen uploads certificates to their private vault; SHA-256 hash is computed dynamically.
3. **Request:** Authorized Agent creates a purpose-bound request specifying required certificate types.
4. **Review:** Citizen inspects the agent’s department, service name, declared purpose, and expiry date.
5. **Consent:** Citizen evaluates the request and chooses to approve or reject.
6. **Selective Share:** Citizen checks **only** the specific documents they wish to disclose (withholding irrelevant certificates).
7. **Application Processing:** Authorized agent inspects the approved documents and verifies tamper-free hashes.
8. **Access Tracking & Revocation:** Every view/download is timestamped in the audit log; citizen can revoke access at any time with 1 click.

---

## 3. Technology Stack

* **Frontend:** React 18, Tailwind CSS, Lucide Icons, Modern Responsive SPA.
* **Backend:** Python 3.13, Flask REST API, Flask-CORS, Werkzeug Security.
* **Database:** SQLite with foreign-key cascade constraints and relational consent mapping.
* **Storage:** Isolated, secure private document storage (`uploads/`) with no direct public access.
* **Cryptography:** SHA-256 file integrity hashing, PBKDF2-SHA256 password salting.

---

## 4. Evaluation Credentials & Quick Demo

The system features **Instant 1-Click Role Switcher buttons** in the top navigation bar, allowing symposium evaluators to test all three user perspectives seamlessly.

| Role | Demo Email | Password | Primary Responsibility |
| :--- | :--- | :--- | :--- |
| **Citizen (Rajesh)** | `rajesh.kumar@gmail.com` | `Citizen@123` | Vault management, request review, selective consent, revocation |
| **Citizen (Priya)** | `priya.sharma@gmail.com` | `Citizen@123` | Alternate citizen for multi-user testing |
| **Agent (Scholarship)** | `scholarship@gov.in` | `Agent@123` | Merit Scholarship Portal verification, creates requests |
| **Agent (Bank Loan)** | `loan.officer@sbi.co.in` | `Agent@123` | State Bank of India KYC officer, inspects approved documents |
| **Administrator** | `admin@doctrust.gov.in` | `Admin@123` | Agent authorization queue, system-wide immutable audit trail |

---

## 5. How to Run the Application

From the project root:

```bash
cd DocTrust
python run.py
```

Open your browser to:
```
http://127.0.0.1:5000
```

---

## 6. Current Prototype vs Future Scope

To maintain rigorous scientific clarity for academic evaluation:

| Feature Dimension | Current Implemented Prototype | Future Scope & Roadmap |
| :--- | :--- | :--- |
| **Document Vault** | Centralized encrypted storage with metadata | Decentralized IPFS / Cloud HSM |
| **Integrity Check** | Dynamic SHA-256 hash recalculation | Asymmetric PKI Digital Signatures (X.509) |
| **Access Control** | Granular item-level selective citizen consent | Zero-Knowledge Proofs (ZKP verification) |
| **Physical Counter Verification** | Web-based officer inspection portal | QR Code & NFC tap-to-authenticate |
| **Government Integration** | Local simulated departmental records | Live DigiLocker & UIDAI e-KYC API bridge |

---

## 7. Viva Voce Cheat Sheet for Evaluators

* **Q: Why not just use Google Drive or DigiLocker?**  
  *A:* Standard cloud drives lack *purpose-bound request generation* and granular item checklists. DocTrust enforces a structured lifecycle where an agent must declare their service purpose, and access is time-bounded with an immutable access trail.

* **Q: Can an agent see documents the citizen did not select?**  
  *A:* No. The backend REST API strictly validates every view/download request against the `request_approved_documents` table. Attempting to view unapproved documents results in HTTP 403 Forbidden and an audit security flag.

* **Q: How does DocTrust prove file integrity?**  
  *A:* When a document is uploaded, a SHA-256 hash is stored in the database. During inspection, clicking **"Verify Tamper-Free"** re-hashes the physical file on disk and verifies that not a single byte has been altered.

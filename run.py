"""
DocTrust – Centralized Digital Document Authentication System
Main Application Launcher
"""
import os
import sys

# Ensure UTF-8 output encoding on Windows console
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

# Add current directory to path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from backend.models import init_db
from backend.seed import seed_database
from backend.app import app

def main():
    print("=" * 80)
    print("  DocTrust - Centralized Digital Document Authentication System")
    print("  College Symposium Project 2026")
    print("=" * 80)
    
    print("\n[1/3] Initializing Database Schema...")
    init_db()
    
    print("[2/3] Checking Seed Data...")
    seed_database()
    
    print("\n[3/3] Ready! Access Credentials for Evaluation:")
    print("  ------------------------------------------------------------------------")
    print("  ROLE           EMAIL                     PASSWORD      FUNCTION")
    print("  ------------------------------------------------------------------------")
    print("  Citizen        rajesh.kumar@gmail.com    Citizen@123   Review & Consent")
    print("  Citizen        priya.sharma@gmail.com    Citizen@123   Alternative Citizen")
    print("  Agent (Gov)    scholarship@gov.in        Agent@123     Create Requests")
    print("  Agent (Bank)   loan.officer@sbi.co.in    Agent@123     Verify KYC")
    print("  Administrator  admin@doctrust.gov.in     Admin@123     Audit & Authorize")
    print("  ------------------------------------------------------------------------")
    print("  TIP: You can also use the 1-Click Demo Buttons in the top navigation bar!\n")
    
    port = int(os.environ.get('PORT', 5000))
    print(f"Server running at: http://127.0.0.1:{port}")
    print("Press CTRL+C to stop the server.\n")

    app.run(host='127.0.0.1', port=port, debug=False)

if __name__ == '__main__':
    main()

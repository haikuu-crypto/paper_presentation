// DocTrust – Centralized Digital Document Authentication System
// Modern React 18 Application with Tailwind CSS & Lucide Icons

const { useState, useEffect, useMemo, useRef } = React;

// ============================================================================
// API SERVICE HELPERS
// ============================================================================
const api = {
  async get(url) {
    const res = await fetch(url, { credentials: 'include' });
    return res.json();
  },
  async post(url, data) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data)
    });
    return res.json();
  },
  async postForm(url, formData) {
    const res = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      body: formData
    });
    return res.json();
  },
  async delete(url) {
    const res = await fetch(url, {
      method: 'DELETE',
      credentials: 'include'
    });
    return res.json();
  }
};

// ============================================================================
// TOAST NOTIFICATION COMPONENT
// ============================================================================
function Toast({ message, type, onClose }) {
  if (!message) return null;
  const isSuccess = type === 'success';
  const isError = type === 'error';
  return (
    <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl border text-sm font-medium transition-all transform animate-bounce ${
      isSuccess ? 'bg-emerald-900 border-emerald-700 text-white' : 
      isError ? 'bg-rose-900 border-rose-700 text-white' : 
      'bg-slate-900 border-slate-700 text-white'
    }`}>
      <span>{isSuccess ? '✅' : isError ? '❌' : 'ℹ️'}</span>
      <span>{message}</span>
      <button onClick={onClose} className="ml-3 text-slate-300 hover:text-white font-bold">×</button>
    </div>
  );
}

// ============================================================================
// MAIN APPLICATION COMPONENT
// ============================================================================
function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('home'); // home, dashboard, documents, requests, history, agent-new-request, admin-agents, admin-audit, profile
  const [toast, setToast] = useState({ message: '', type: 'info' });
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'
  const [showSymposiumModal, setShowSymposiumModal] = useState(false);
  
  // Pending request count for notification badge
  const [pendingCount, setPendingCount] = useState(0);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: 'info' }), 4500);
  };

  const checkAuth = async () => {
    try {
      const res = await api.get('/api/auth/me');
      if (res.success && res.user) {
        setCurrentUser(res.user);
        if (activeTab === 'home') {
          setActiveTab('dashboard');
        }
      } else {
        setCurrentUser(null);
      }
    } catch (err) {
      console.error("Auth check failed:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  // Update pending request counts for citizen/agent
  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === 'citizen') {
        api.get('/api/requests').then(res => {
          if (res.success) {
            const pending = res.requests.filter(r => r.status === 'pending').length;
            setPendingCount(pending);
          }
        });
      } else if (currentUser.role === 'admin') {
        api.get('/api/admin/stats').then(res => {
          if (res.success) {
            setPendingCount(res.stats.pending_agents || 0);
          }
        });
      }
    }
  }, [currentUser, activeTab]);

  const handleDemoLogin = async (role) => {
    try {
      const res = await api.post('/api/auth/demo-login', { role });
      if (res.success) {
        setCurrentUser(res.user);
        setShowAuthModal(false);
        setActiveTab('dashboard');
        showToast(res.message, 'success');
      } else {
        showToast(res.message || 'Demo login failed', 'error');
      }
    } catch (err) {
      showToast('Connection error during demo login', 'error');
    }
  };

  const handleLogout = async () => {
    try {
      await api.post('/api/auth/logout', {});
      setCurrentUser(null);
      setActiveTab('home');
      showToast('Logged out successfully', 'info');
    } catch (err) {
      setCurrentUser(null);
      setActiveTab('home');
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'info' })} />

      {/* TOP DEMO SWITCHER BAR (Perfect for Symposium Judges & Evaluators) */}
      <div className="bg-slate-900 text-slate-200 text-xs px-4 py-2 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 shadow-inner">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
            Symposium Evaluator Mode
          </span>
          <span className="text-slate-400 hidden sm:inline">Instant Role Switcher:</span>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button 
            onClick={() => handleDemoLogin('citizen')}
            className={`px-2.5 py-1 rounded transition text-xs font-medium flex items-center gap-1.5 ${
              currentUser?.role === 'citizen' ? 'bg-emerald-600 text-white font-bold' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}>
            👤 Citizen (Rajesh)
          </button>
          <button 
            onClick={() => handleDemoLogin('agent')}
            className={`px-2.5 py-1 rounded transition text-xs font-medium flex items-center gap-1.5 ${
              currentUser?.role === 'agent' && currentUser?.email === 'scholarship@gov.in' ? 'bg-blue-600 text-white font-bold' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}>
            🏛️ Agent (Scholarship)
          </button>
          <button 
            onClick={() => handleDemoLogin('bank_agent')}
            className={`px-2.5 py-1 rounded transition text-xs font-medium flex items-center gap-1.5 ${
              currentUser?.role === 'agent' && currentUser?.email.includes('sbi') ? 'bg-indigo-600 text-white font-bold' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}>
            🏦 Agent (SBI Bank)
          </button>
          <button 
            onClick={() => handleDemoLogin('admin')}
            className={`px-2.5 py-1 rounded transition text-xs font-medium flex items-center gap-1.5 ${
              currentUser?.role === 'admin' ? 'bg-purple-600 text-white font-bold' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}>
            🛡️ Admin (Governance)
          </button>
          <button 
            onClick={() => setShowSymposiumModal(true)}
            className="px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 text-xs font-semibold flex items-center gap-1 ml-1">
            📜 Project Docs & Viva
          </button>
        </div>
      </div>

      {/* MAIN NAVIGATION BAR */}
      <nav className="sticky top-0 z-40 glass-nav border-b border-slate-200/80 shadow-sm transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            
            {/* Brand Logo */}
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab(currentUser ? 'dashboard' : 'home')}>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
                <span className="text-xl">🛡️</span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-display font-extrabold text-xl tracking-tight text-slate-900">DocTrust</span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">v1.0 Live</span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium hidden sm:block">Centralized Digital Document Authentication System</p>
              </div>
            </div>

            {/* Navigation Links according to User Role */}
            <div className="hidden md:flex items-center space-x-1 lg:space-x-2">
              {!currentUser ? (
                <>
                  <button onClick={() => setActiveTab('home')} className={`px-3 py-2 rounded-lg text-sm font-medium ${activeTab === 'home' ? 'text-emerald-700 bg-emerald-50 font-semibold' : 'text-slate-600 hover:text-slate-900'}`}>
                    Overview
                  </button>
                  <button onClick={() => { setActiveTab('home'); setTimeout(() => document.getElementById('workflow-section')?.scrollIntoView({behavior: 'smooth'}), 100); }} className="px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900">
                    How It Works
                  </button>
                  <button onClick={() => { setActiveTab('home'); setTimeout(() => document.getElementById('novelty-section')?.scrollIntoView({behavior: 'smooth'}), 100); }} className="px-3 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900">
                    Novelty & Security
                  </button>
                  <button onClick={() => setShowSymposiumModal(true)} className="px-3 py-2 rounded-lg text-sm font-medium text-amber-700 bg-amber-50 hover:bg-amber-100">
                    Symposium Guide
                  </button>
                </>
              ) : currentUser.role === 'citizen' ? (
                <>
                  <button onClick={() => setActiveTab('dashboard')} className={`px-3 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'dashboard' ? 'text-emerald-700 bg-emerald-50 font-semibold' : 'text-slate-600 hover:text-slate-900'}`}>
                    Dashboard
                  </button>
                  <button onClick={() => setActiveTab('documents')} className={`px-3 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'documents' ? 'text-emerald-700 bg-emerald-50 font-semibold' : 'text-slate-600 hover:text-slate-900'}`}>
                    📁 My Documents
                  </button>
                  <button onClick={() => setActiveTab('requests')} className={`px-3 py-2 rounded-lg text-sm font-medium transition relative ${activeTab === 'requests' ? 'text-emerald-700 bg-emerald-50 font-semibold' : 'text-slate-600 hover:text-slate-900'}`}>
                    📬 Document Requests
                    {pendingCount > 0 && (
                      <span className="ml-1.5 px-2 py-0.5 text-xs font-bold bg-amber-500 text-white rounded-full badge-pulse shadow-sm">
                        {pendingCount}
                      </span>
                    )}
                  </button>
                  <button onClick={() => setActiveTab('history')} className={`px-3 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'history' ? 'text-emerald-700 bg-emerald-50 font-semibold' : 'text-slate-600 hover:text-slate-900'}`}>
                    📜 Sharing History
                  </button>
                </>
              ) : currentUser.role === 'agent' ? (
                <>
                  <button onClick={() => setActiveTab('dashboard')} className={`px-3 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'dashboard' ? 'text-blue-700 bg-blue-50 font-semibold' : 'text-slate-600 hover:text-slate-900'}`}>
                    Agent Dashboard
                  </button>
                  <button onClick={() => setActiveTab('agent-new-request')} className={`px-3 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'agent-new-request' ? 'text-blue-700 bg-blue-50 font-semibold' : 'text-slate-600 hover:text-slate-900'}`}>
                    ➕ Request Documents
                  </button>
                  <button onClick={() => setActiveTab('requests')} className={`px-3 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'requests' ? 'text-blue-700 bg-blue-50 font-semibold' : 'text-slate-600 hover:text-slate-900'}`}>
                    📑 Track Requests
                  </button>
                  <button onClick={() => setActiveTab('history')} className={`px-3 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'history' ? 'text-blue-700 bg-blue-50 font-semibold' : 'text-slate-600 hover:text-slate-900'}`}>
                    🗃️ Received Documents
                  </button>
                </>
              ) : (
                // Administrator
                <>
                  <button onClick={() => setActiveTab('dashboard')} className={`px-3 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'dashboard' ? 'text-purple-700 bg-purple-50 font-semibold' : 'text-slate-600 hover:text-slate-900'}`}>
                    System Overview
                  </button>
                  <button onClick={() => setActiveTab('admin-agents')} className={`px-3 py-2 rounded-lg text-sm font-medium transition relative ${activeTab === 'admin-agents' ? 'text-purple-700 bg-purple-50 font-semibold' : 'text-slate-600 hover:text-slate-900'}`}>
                    🏢 Agent Governance
                    {pendingCount > 0 && (
                      <span className="ml-1.5 px-2 py-0.5 text-xs font-bold bg-purple-600 text-white rounded-full">
                        {pendingCount}
                      </span>
                    )}
                  </button>
                  <button onClick={() => setActiveTab('admin-audit')} className={`px-3 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'admin-audit' ? 'text-purple-700 bg-purple-50 font-semibold' : 'text-slate-600 hover:text-slate-900'}`}>
                    🔒 Audit Ledger
                  </button>
                  <button onClick={() => setActiveTab('documents')} className={`px-3 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'documents' ? 'text-purple-700 bg-purple-50 font-semibold' : 'text-slate-600 hover:text-slate-900'}`}>
                    🗄️ Document Vault
                  </button>
                </>
              )}
            </div>

            {/* User Controls & Auth Buttons */}
            <div className="flex items-center gap-3">
              {!currentUser ? (
                <>
                  <button 
                    onClick={() => { setAuthMode('login'); setShowAuthModal(true); }}
                    className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition">
                    Sign In
                  </button>
                  <button 
                    onClick={() => { setAuthMode('register'); setShowAuthModal(true); }}
                    className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-md shadow-emerald-600/20 transition">
                    Register Citizen
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="text-right hidden sm:block">
                    <div className="text-xs font-bold text-slate-900">{currentUser.full_name}</div>
                    <div className="text-[11px] text-slate-500 capitalize flex items-center justify-end gap-1">
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        currentUser.role === 'citizen' ? 'bg-emerald-500' :
                        currentUser.role === 'agent' ? 'bg-blue-500' : 'bg-purple-500'
                      }`}></span>
                      {currentUser.role} {currentUser.organization ? `• ${currentUser.organization}` : ''}
                    </div>
                  </div>
                  <button 
                    onClick={handleLogout}
                    title="Log Out"
                    className="p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition border border-slate-200">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      </nav>

      {/* CORE WORKFLOW HIGHLIGHT STRIP (Always Visible across pages as requested!) */}
      <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 border-b border-emerald-100 py-2.5 px-4 text-xs text-slate-700 overflow-x-auto shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 min-w-[760px]">
          <div className="flex items-center gap-2 font-semibold text-emerald-900 shrink-0">
            <span>🛡️ Core Workflow:</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600">
            <span className="px-2 py-0.5 rounded bg-white border border-emerald-200 shadow-2xs font-semibold text-emerald-800">1. Register</span>
            <span className="text-emerald-400">→</span>
            <span className="px-2 py-0.5 rounded bg-white border border-emerald-200 shadow-2xs font-semibold text-emerald-800">2. Upload</span>
            <span className="text-emerald-400">→</span>
            <span className="px-2 py-0.5 rounded bg-white border border-emerald-200 shadow-2xs font-semibold text-emerald-800">3. Request</span>
            <span className="text-emerald-400">→</span>
            <span className="px-2 py-0.5 rounded bg-white border border-amber-200 text-amber-800 font-bold shadow-2xs">4. Review</span>
            <span className="text-amber-500">→</span>
            <span className="px-2.5 py-0.5 rounded bg-emerald-600 text-white font-extrabold shadow-sm">5. Citizen Consent</span>
            <span className="text-emerald-600">→</span>
            <span className="px-2 py-0.5 rounded bg-white border border-emerald-200 shadow-2xs font-semibold text-emerald-800">6. Selective Share</span>
            <span className="text-emerald-400">→</span>
            <span className="px-2 py-0.5 rounded bg-white border border-emerald-200 shadow-2xs font-semibold text-emerald-800">7. App Processing</span>
            <span className="text-emerald-400">→</span>
            <span className="px-2 py-0.5 rounded bg-white border border-blue-200 text-blue-800 font-semibold shadow-2xs">8. Access Tracking</span>
          </div>
          <div className="text-[11px] text-emerald-800 font-medium shrink-0 italic hidden lg:block">
            “The citizen remains in control of document sharing.”
          </div>
        </div>
      </div>

      {/* MAIN VIEW CONTENT CONTAINER */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading ? (
          <div className="py-20 text-center">
            <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-sm text-slate-500">Connecting to secure document vault...</p>
          </div>
        ) : (
          <>
            {activeTab === 'home' && !currentUser && (
              <LandingPage 
                onStart={() => { setAuthMode('login'); setShowAuthModal(true); }}
                onDemoLogin={handleDemoLogin}
                onOpenSymposium={() => setShowSymposiumModal(true)}
              />
            )}

            {/* CITIZEN VIEWS */}
            {currentUser?.role === 'citizen' && (
              <>
                {activeTab === 'dashboard' && (
                  <CitizenDashboard 
                    user={currentUser} 
                    onNavigate={setActiveTab}
                    showToast={showToast}
                  />
                )}
                {activeTab === 'documents' && (
                  <MyDocuments 
                    user={currentUser} 
                    showToast={showToast} 
                  />
                )}
                {activeTab === 'requests' && (
                  <CitizenRequests 
                    user={currentUser} 
                    showToast={showToast} 
                    onUpdatePending={setPendingCount}
                  />
                )}
                {activeTab === 'history' && (
                  <CitizenHistory 
                    user={currentUser} 
                    showToast={showToast} 
                  />
                )}
              </>
            )}

            {/* AGENT VIEWS */}
            {currentUser?.role === 'agent' && (
              <>
                {activeTab === 'dashboard' && (
                  <AgentDashboard 
                    user={currentUser} 
                    onNavigate={setActiveTab}
                    showToast={showToast}
                  />
                )}
                {activeTab === 'agent-new-request' && (
                  <AgentNewRequest 
                    user={currentUser} 
                    showToast={showToast} 
                    onCreated={() => setActiveTab('requests')}
                  />
                )}
                {activeTab === 'requests' && (
                  <AgentRequests 
                    user={currentUser} 
                    showToast={showToast} 
                  />
                )}
                {activeTab === 'history' && (
                  <AgentReceivedDocs 
                    user={currentUser} 
                    showToast={showToast} 
                  />
                )}
              </>
            )}

            {/* ADMINISTRATOR VIEWS */}
            {currentUser?.role === 'admin' && (
              <>
                {activeTab === 'dashboard' && (
                  <AdminDashboard 
                    user={currentUser} 
                    onNavigate={setActiveTab}
                    showToast={showToast}
                  />
                )}
                {activeTab === 'admin-agents' && (
                  <AdminAgentGovernance 
                    user={currentUser} 
                    showToast={showToast} 
                  />
                )}
                {activeTab === 'admin-audit' && (
                  <AdminAuditLedger 
                    user={currentUser} 
                    showToast={showToast} 
                  />
                )}
                {activeTab === 'documents' && (
                  <AdminDocumentVault 
                    user={currentUser} 
                    showToast={showToast} 
                  />
                )}
              </>
            )}
          </>
        )}
      </main>

      {/* FOOTER */}
      <footer className="bg-slate-900 text-slate-400 text-xs py-8 border-t border-slate-800 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-white font-display font-bold text-sm">
                <span>🛡️ DocTrust</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Centralized Digital Document Authentication System designed to eliminate repetitive physical document submissions while guaranteeing citizen consent.
              </p>
            </div>
            <div>
              <div className="text-white font-semibold mb-2">College Symposium Project</div>
              <ul className="space-y-1 text-[11px]">
                <li>Department of Computer Science & Engineering</li>
                <li>Domain: Information Security & Digital Governance</li>
                <li>Architecture: Zero-Trust Selective Consent</li>
              </ul>
            </div>
            <div>
              <div className="text-white font-semibold mb-2">Security Architecture</div>
              <ul className="space-y-1 text-[11px]">
                <li>SHA-256 Cryptographic Integrity Hashing</li>
                <li>Granular Document-Level Consent Checklists</li>
                <li>Temporal Expiry & Instant Revocation</li>
                <li>Immutable Event Audit Trail</li>
              </ul>
            </div>
            <div>
              <div className="text-white font-semibold mb-2">Project Documentation</div>
              <button 
                onClick={() => setShowSymposiumModal(true)}
                className="w-full text-left px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 font-medium text-xs flex items-center justify-between">
                <span>View Abstract & Viva Q&A</span>
                <span>→</span>
              </button>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px] text-slate-500">
            <div>© 2026 DocTrust Prototype. Built for Academic Presentation & Innovation Demonstration.</div>
            <div className="flex items-center gap-4">
              <span className="text-emerald-400">● REST API Active</span>
              <span>● SQLite Database Live</span>
              <span>● Secure Hash Verification Active</span>
            </div>
          </div>
        </div>
      </footer>

      {/* AUTHENTICATION MODAL */}
      {showAuthModal && (
        <AuthModal 
          mode={authMode}
          setMode={setAuthMode}
          onClose={() => setShowAuthModal(false)}
          onSuccess={(user) => {
            setCurrentUser(user);
            setShowAuthModal(false);
            setActiveTab('dashboard');
            showToast(`Welcome, ${user.full_name}!`, 'success');
          }}
          onDemoLogin={handleDemoLogin}
          showToast={showToast}
        />
      )}

      {/* SYMPOSIUM PROJECT GUIDE MODAL */}
      {showSymposiumModal && (
        <SymposiumModal onClose={() => setShowSymposiumModal(false)} />
      )}
    </div>
  );
}

// ============================================================================
// PUBLIC LANDING PAGE
// ============================================================================
function LandingPage({ onStart, onDemoLogin, onOpenSymposium }) {
  return (
    <div className="space-y-16 pb-12">
      
      {/* HERO SECTION */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white p-8 sm:p-12 lg:p-16 shadow-2xl border border-slate-800">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-80 h-80 rounded-full bg-teal-500/10 blur-3xl pointer-events-none"></div>

        <div className="max-w-3xl relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/30">
            <span>🎓 College Symposium Project 2026</span>
            <span>•</span>
            <span>Live Functional Prototype</span>
          </div>

          <h1 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight leading-tight">
            DocTrust: <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-300 bg-clip-text text-transparent">Centralized Digital Document Authentication System</span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-300 font-light leading-relaxed">
            “<strong className="text-white font-semibold">Share only what is required. Stay in control of your documents.</strong>”
          </p>

          <p className="text-sm text-slate-400 leading-relaxed">
            Eliminates repeated physical submission of sensitive paper certificates. Authorized officers request specific documents for exact verification purposes; citizens review and grant granular, time-bounded selective consent.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-4 pt-4">
            <button 
              onClick={onStart}
              className="px-6 py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg shadow-emerald-600/30 transition transform hover:-translate-y-0.5 flex items-center gap-2">
              <span>🚀 Launch DocTrust Portal</span>
              <span>→</span>
            </button>
            <button 
              onClick={onOpenSymposium}
              className="px-5 py-3.5 rounded-xl font-semibold text-sm bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 transition flex items-center gap-2">
              <span>📜 Problem & Methodology</span>
            </button>
          </div>

          {/* Quick Demo Credentials Card */}
          <div className="pt-6 border-t border-slate-800/80 mt-8">
            <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-3">
              ⚡ Instant 1-Click Symposium Demo Logins:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div 
                onClick={() => onDemoLogin('citizen')}
                className="p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 cursor-pointer transition group">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-400 mb-1">
                  <span>👤 Citizen Portal</span>
                  <span className="text-[10px] bg-emerald-900/60 px-1.5 py-0.5 rounded text-emerald-300">Click to Test</span>
                </div>
                <div className="text-[11px] text-slate-300">Rajesh Kumar</div>
                <div className="text-[10px] text-slate-400">Review requests & grant selective consent</div>
              </div>

              <div 
                onClick={() => onDemoLogin('agent')}
                className="p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 cursor-pointer transition group">
                <div className="flex items-center justify-between text-xs font-bold text-blue-400 mb-1">
                  <span>🏛️ Scholarship Officer</span>
                  <span className="text-[10px] bg-blue-900/60 px-1.5 py-0.5 rounded text-blue-300">Click to Test</span>
                </div>
                <div className="text-[11px] text-slate-300">Dr. Arvind Swaminathan</div>
                <div className="text-[10px] text-slate-400">Create request & inspect approved docs</div>
              </div>

              <div 
                onClick={() => onDemoLogin('admin')}
                className="p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 cursor-pointer transition group">
                <div className="flex items-center justify-between text-xs font-bold text-purple-400 mb-1">
                  <span>🛡️ System Admin</span>
                  <span className="text-[10px] bg-purple-900/60 px-1.5 py-0.5 rounded text-purple-300">Click to Test</span>
                </div>
                <div className="text-[11px] text-slate-300">Governance Authority</div>
                <div className="text-[10px] text-slate-400">Authorize agents & monitor audit logs</div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* CORE WORKFLOW DIAGRAM */}
      <section id="workflow-section" className="space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-xs uppercase tracking-widest font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            System Methodology
          </span>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
            The DocTrust End-to-End Workflow
          </h2>
          <p className="text-sm text-slate-600">
            Every step is designed with cryptographic accountability, user consent, and minimum data disclosure.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-emerald-300 transition space-y-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 font-extrabold flex items-center justify-center text-sm">1</div>
            <h3 className="font-bold text-slate-900 text-sm">Citizen Vault & Upload</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Citizen uploads ID proof, academic marksheet, income certificates. System calculates SHA-256 cryptographic hashes immediately for tamper-evidence.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-emerald-300 transition space-y-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-800 font-extrabold flex items-center justify-center text-sm">2</div>
            <h3 className="font-bold text-slate-900 text-sm">Agent Service Request</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Authorized officer (Scholarship, Bank, Passport) creates a specific request with formal purpose, required doc types, and access expiration.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-amber-200 bg-amber-50/30 shadow-xs hover:border-amber-400 transition space-y-2">
            <div className="w-8 h-8 rounded-lg bg-amber-200 text-amber-900 font-extrabold flex items-center justify-center text-sm">3</div>
            <h3 className="font-bold text-amber-950 text-sm">Citizen Selective Consent</h3>
            <p className="text-xs text-slate-700 leading-relaxed">
              <strong>Core Feature:</strong> Citizen reviews the purpose and checks only the documents they wish to share. The citizen can reject or selectively approve.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-emerald-300 transition space-y-2">
            <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-800 font-extrabold flex items-center justify-center text-sm">4</div>
            <h3 className="font-bold text-slate-900 text-sm">Audited Access & Revocation</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Agent inspects verified documents. Every view/download is timestamped in the audit ledger. The citizen can revoke access at any time.
            </p>
          </div>
        </div>
      </section>

      {/* THE PROBLEM VS THE DOCTRUST SOLUTION */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
        {/* Traditional Problem Card */}
        <div className="p-8 rounded-3xl bg-rose-50/50 border border-rose-200 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-100 text-rose-800 text-xs font-bold">
            <span>❌ The Traditional Physical Process</span>
          </div>
          <h3 className="font-display text-xl font-bold text-slate-900">
            Pain Points of Repeated Physical Submission
          </h3>
          <ul className="space-y-3 text-xs sm:text-sm text-slate-700">
            <li className="flex items-start gap-2.5">
              <span className="text-rose-500 font-bold">✕</span>
              <span><strong>Paper Loss & Duplication:</strong> Citizens repeatedly carry hard copies and photocopies to different centers where papers get misplaced.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="text-rose-500 font-bold">✕</span>
              <span><strong>Unnecessary Retention:</strong> Agents retain physical files indefinitely even after verification is finished, causing privacy breaches.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="text-rose-500 font-bold">✕</span>
              <span><strong>Lack of Access Transparency:</strong> Citizens have zero visibility into who viewed, copied, or stored their personal certificates.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="text-rose-500 font-bold">✕</span>
              <span><strong>High Friction & Environmental Waste:</strong> Repeated printing of photocopies wastes reams of paper and government administrative hours.</span>
            </li>
          </ul>
        </div>

        {/* Proposed Solution Card */}
        <div className="p-8 rounded-3xl bg-emerald-50/60 border border-emerald-200 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
            <span>✅ The DocTrust Innovation</span>
          </div>
          <h3 className="font-display text-xl font-bold text-slate-900">
            Citizen-Controlled Centralized Authentication
          </h3>
          <ul className="space-y-3 text-xs sm:text-sm text-slate-700">
            <li className="flex items-start gap-2.5">
              <span className="text-emerald-600 font-bold">✓</span>
              <span><strong>Citizen Remains in Full Control:</strong> No agent can browse or access citizen documents without explicit, granular consent.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="text-emerald-600 font-bold">✓</span>
              <span><strong>Selective Document Sharing:</strong> Share only the ID and Marksheet; withhold address or income certificate if not relevant to the service.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="text-emerald-600 font-bold">✓</span>
              <span><strong>Cryptographic Integrity (SHA-256):</strong> Every file upload registers a cryptographic hash ensuring files cannot be tampered with.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="text-emerald-600 font-bold">✓</span>
              <span><strong>Instant Revocation & Full Audit:</strong> See every view and download in real-time and revoke permissions with a single click.</span>
            </li>
          </ul>
        </div>
      </section>

      {/* KEY FEATURES & NOVELTY GRID */}
      <section id="novelty-section" className="space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-xs uppercase tracking-widest font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
            Core Novelty
          </span>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-slate-900">
            Why DocTrust Matters in Real-World Governance
          </h2>
          <p className="text-sm text-slate-600">
            Balancing citizen privacy with authorized administrative verification.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
            <div className="text-2xl">🛡️</div>
            <h4 className="font-bold text-slate-900 text-sm">Selective Consent Engine</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Unlike traditional all-or-nothing cloud drives, DocTrust enforces granular item-by-item consent. Citizens inspect the requesting agent's purpose and choose exact files.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
            <div className="text-2xl">🔐</div>
            <h4 className="font-bold text-slate-900 text-sm">SHA-256 Tamper Detection</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Calculates a unique cryptographic fingerprint for every file upon upload. Real-time verification proves the file on disk matches the exact byte sequence originally submitted.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
            <div className="text-2xl">⏳</div>
            <h4 className="font-bold text-slate-900 text-sm">Time-Bounded Access</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Sharing requests include an expiration date. Once the verification window elapses, the agent's view and download privileges automatically expire.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
            <div className="text-2xl">🚫</div>
            <h4 className="font-bold text-slate-900 text-sm">Zero-Trust Agent Guard</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Agents cannot browse citizen documents. Every file access requires an active, approved request ID validated against the relational database permissions.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
            <div className="text-2xl">📜</div>
            <h4 className="font-bold text-slate-900 text-sm">Immutable Audit Trail</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Every critical event (registration, document upload, request issuance, consent granted, file accessed, access revoked) is permanently logged with timestamps.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
            <div className="text-2xl">🏛️</div>
            <h4 className="font-bold text-slate-900 text-sm">Three-Tier Role Governance</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Distinct roles for Citizens, Authorized Agents (who require administrative authorization before operating), and System Administrators.
            </p>
          </div>
        </div>
      </section>

      {/* PROTOTYPE VS FUTURE SCOPE (Crucial Prompt Requirement!) */}
      <section className="bg-slate-900 text-white rounded-3xl p-8 sm:p-10 shadow-xl space-y-6">
        <div className="max-w-3xl space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-semibold border border-cyan-500/30">
            <span>🔬 Research & Project Evaluation Clarity</span>
          </div>
          <h3 className="font-display text-2xl font-bold">
            Current Prototype Capabilities vs. Future Scope
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            As a genuine research project, DocTrust clearly delineates implemented functional capabilities from future production enhancements.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          <div className="p-5 rounded-2xl bg-slate-800/80 border border-emerald-500/30 space-y-3">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
              <span>✅ Implemented in Current Prototype</span>
            </div>
            <ul className="space-y-2 text-xs text-slate-300">
              <li className="flex items-center gap-2">
                <span className="text-emerald-400">✓</span> Centralized encrypted document vault & metadata catalog
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-400">✓</span> Granular item-level selective citizen consent engine
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-400">✓</span> SHA-256 cryptographic file integrity verification
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-400">✓</span> Temporal expiration and citizen one-click revocation
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-400">✓</span> Comprehensive immutable access and sharing audit ledger
              </li>
              <li className="flex items-center gap-2">
                <span className="text-emerald-400">✓</span> Agent vetting and administrative verification workflow
              </li>
            </ul>
          </div>

          <div className="p-5 rounded-2xl bg-slate-800/80 border border-cyan-500/30 space-y-3">
            <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
              <span>🚀 Future Scope & Production Roadmap</span>
            </div>
            <ul className="space-y-2 text-xs text-slate-300">
              <li className="flex items-center gap-2">
                <span className="text-cyan-400">⟡</span> QR Code & NFC tap-to-authenticate for rapid physical counter checks
              </li>
              <li className="flex items-center gap-2">
                <span className="text-cyan-400">⟡</span> Asymmetric PKI Digital Signatures (X.509 certificates / e-Sign)
              </li>
              <li className="flex items-center gap-2">
                <span className="text-cyan-400">⟡</span> Direct API bridge with Government DigiLocker and UIDAI
              </li>
              <li className="flex items-center gap-2">
                <span className="text-cyan-400">⟡</span> Automated OCR and AI-assisted document validity inspection
              </li>
              <li className="flex items-center gap-2">
                <span className="text-cyan-400">⟡</span> Zero-Knowledge Proofs (ZKP) for attribute verification without exposing documents
              </li>
            </ul>
          </div>
        </div>
      </section>

    </div>
  );
}

// ============================================================================
// CITIZEN DASHBOARD
// ============================================================================
function CitizenDashboard({ user, onNavigate, showToast }) {
  const [stats, setStats] = useState({ totalDocs: 0, pendingRequests: 0, approvedShares: 0, rejectedRequests: 0 });
  const [pendingList, setPendingList] = useState([]);
  const [recentDocs, setRecentDocs] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [docsRes, reqsRes, actRes] = await Promise.all([
        api.get('/api/documents'),
        api.get('/api/requests'),
        api.get('/api/activity')
      ]);

      if (docsRes.success) {
        setRecentDocs(docsRes.documents.slice(0, 4));
      }

      if (reqsRes.success) {
        const reqs = reqsRes.requests;
        const pending = reqs.filter(r => r.status === 'pending');
        const approved = reqs.filter(r => r.status === 'approved' || r.status === 'partially_approved');
        const rejected = reqs.filter(r => r.status === 'rejected');

        setPendingList(pending);
        setStats({
          totalDocs: docsRes.documents ? docsRes.documents.length : 0,
          pendingRequests: pending.length,
          approvedShares: approved.length,
          rejectedRequests: rejected.length
        });
      }

      if (actRes.success) {
        setActivities(actRes.activity);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="space-y-6">
      
      {/* CITIZEN CONTROL BANNER (Prompt Requirement!) */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-200 text-xs font-bold uppercase tracking-wider">
            <span>🛡️ Core Guarantee</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-display font-extrabold mt-0.5">
            You control which documents are shared.
          </h2>
          <p className="text-xs sm:text-sm text-emerald-100 font-light mt-1">
            Welcome, <strong>{user.full_name}</strong>. No agent or department can access your documents without your explicit review and selective consent.
          </p>
        </div>
        <button 
          onClick={() => onNavigate('documents')}
          className="px-4 py-2.5 rounded-xl bg-white text-emerald-900 font-bold text-xs shadow-md hover:bg-emerald-50 transition shrink-0">
          + Upload Document
        </button>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs hover:shadow-sm transition">
          <div className="text-xs font-semibold text-slate-500">Total Documents</div>
          <div className="text-3xl font-display font-extrabold text-slate-900 mt-1">{stats.totalDocs}</div>
          <div className="text-[11px] text-emerald-600 font-medium mt-1">Stored securely</div>
        </div>

        <div className={`p-5 rounded-2xl border transition ${
          stats.pendingRequests > 0 ? 'bg-amber-50/60 border-amber-300 shadow-sm' : 'bg-white border-slate-200 shadow-2xs'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Pending Requests</span>
            {stats.pendingRequests > 0 && <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>}
          </div>
          <div className="text-3xl font-display font-extrabold text-amber-600 mt-1">{stats.pendingRequests}</div>
          <div className="text-[11px] text-amber-700 font-medium mt-1">
            {stats.pendingRequests > 0 ? 'Action required!' : 'Up to date'}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs hover:shadow-sm transition">
          <div className="text-xs font-semibold text-slate-500">Approved Shares</div>
          <div className="text-3xl font-display font-extrabold text-emerald-600 mt-1">{stats.approvedShares}</div>
          <div className="text-[11px] text-slate-400 mt-1">Active authorizations</div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs hover:shadow-sm transition">
          <div className="text-xs font-semibold text-slate-500">Rejected Requests</div>
          <div className="text-3xl font-display font-extrabold text-rose-600 mt-1">{stats.rejectedRequests}</div>
          <div className="text-[11px] text-slate-400 mt-1">Consent withheld</div>
        </div>
      </div>

      {/* PENDING REQUESTS ACTION BANNER */}
      {pendingList.length > 0 && (
        <div className="p-6 rounded-2xl bg-amber-50 border border-amber-200 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">⚠️</span>
              <div>
                <h3 className="font-bold text-amber-900 text-sm">
                  Document Sharing Request Awaiting Your Consent ({pendingList.length})
                </h3>
                <p className="text-xs text-amber-800">
                  An authorized agent has requested specific certificates for an official service.
                </p>
              </div>
            </div>
            <button 
              onClick={() => onNavigate('requests')}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm transition">
              Review & Respond →
            </button>
          </div>

          <div className="divide-y divide-amber-200/60 bg-white rounded-xl border border-amber-200 overflow-hidden">
            {pendingList.map(req => (
              <div key={req.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">{req.service_name}</span>
                    <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{req.request_code}</span>
                  </div>
                  <div className="text-xs text-slate-600 mt-0.5">
                    Requested by: <strong>{req.agent_name}</strong> ({req.agent_org})
                  </div>
                  <div className="text-xs text-slate-500 mt-1 italic">
                    Purpose: “{req.purpose}”
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {req.required_doc_types.map((type, idx) => (
                      <span key={idx} className="text-[11px] px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded font-medium">
                        📋 {type}
                      </span>
                    ))}
                  </div>
                </div>

                <button 
                  onClick={() => onNavigate('requests')}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition shrink-0">
                  Review & Give Consent
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TWO COLUMN GRID: RECENT DOCUMENTS & RECENT ACTIVITY */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: My Documents Preview */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <span>📁 My Registered Documents</span>
              <span className="text-xs font-normal text-slate-400">({recentDocs.length})</span>
            </h3>
            <button 
              onClick={() => onNavigate('documents')}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700">
              View All Documents →
            </button>
          </div>

          {recentDocs.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
              <p className="text-xs text-slate-500 mb-3">No documents uploaded yet.</p>
              <button 
                onClick={() => onNavigate('documents')}
                className="px-3.5 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold">
                Upload First Document
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {recentDocs.map(doc => (
                <div key={doc.id} className="p-4 rounded-xl bg-white border border-slate-200 hover:border-emerald-300 transition space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-bold text-slate-900 truncate" title={doc.doc_name}>{doc.doc_name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200 shrink-0">
                      {doc.doc_type}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-2">{doc.description || 'Verified original record'}</p>
                  
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                    <span className="font-mono text-emerald-700 bg-emerald-50 px-1 rounded">
                      SHA: {doc.file_hash.substring(0, 10)}...
                    </span>
                    <span>{(doc.file_size / 1024).toFixed(1)} KB</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Recent Activity Timeline */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <span>🕒 Recent Activity</span>
            </h3>
            <button 
              onClick={() => onNavigate('history')}
              className="text-xs font-semibold text-emerald-600 hover:text-emerald-700">
              Audit Log →
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
            {activities.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No recent actions logged.</p>
            ) : (
              <div className="space-y-3">
                {activities.slice(0, 6).map((act, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs pb-2 border-b border-slate-100 last:border-0 last:pb-0">
                    <span className="text-sm mt-0.5">
                      {act.category === 'CONSENT' ? '🤝' :
                       act.category === 'DOCUMENT' ? '📄' :
                       act.category === 'ACCESS' ? '👁️' : '🔔'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-800 text-[11px] font-medium leading-tight">{act.details}</p>
                      <span className="text-[10px] text-slate-400">{act.timestamp}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}

// ============================================================================
// CITIZEN "MY DOCUMENTS" COMPONENT
// ============================================================================
function MyDocuments({ user, showToast }) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [verifyDocResult, setVerifyDocResult] = useState(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  const docTypes = [
    "Aadhaar / ID Proof",
    "Marksheet",
    "Address Proof",
    "Community Certificate",
    "Income Certificate",
    "Other supporting documents"
  ];

  const fetchDocs = async () => {
    try {
      const res = await api.get('/api/documents');
      if (res.success) {
        setDocs(res.documents);
      }
    } catch (err) {
      showToast('Error loading documents', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  const handleDelete = async (docId, docName) => {
    if (!confirm(`Are you sure you want to delete "${docName}" from your vault?`)) return;
    try {
      const res = await api.delete(`/api/documents/${docId}`);
      if (res.success) {
        showToast(res.message, 'success');
        fetchDocs();
      } else {
        showToast(res.message, 'error');
      }
    } catch (err) {
      showToast('Error deleting document', 'error');
    }
  };

  const handleVerifyIntegrity = async (docId) => {
    try {
      const res = await api.get(`/api/documents/${docId}/verify-hash`);
      if (res.success) {
        setVerifyDocResult(res);
      } else {
        showToast(res.message, 'error');
      }
    } catch (err) {
      showToast('Integrity verification failed', 'error');
    }
  };

  const filteredDocs = useMemo(() => {
    return docs.filter(doc => {
      const matchesSearch = doc.doc_name.toLowerCase().includes(searchFilter.toLowerCase()) ||
                            (doc.description && doc.description.toLowerCase().includes(searchFilter.toLowerCase()));
      const matchesType = typeFilter === 'ALL' || doc.doc_type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [docs, searchFilter, typeFilter]);

  return (
    <div className="space-y-6">
      
      {/* Header with Title & Upload CTA */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-display font-bold text-slate-900">My Document Vault</h2>
          <p className="text-xs text-slate-500">
            Securely manage your identity and educational records. Files are hashed with SHA-256 for tamper detection.
          </p>
        </div>
        <button 
          onClick={() => setShowUploadModal(true)}
          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition flex items-center gap-1.5">
          <span>📤 Upload Document</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200">
        <div className="relative w-full sm:w-72">
          <input 
            type="text" 
            placeholder="Search documents..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500"
          />
          <span className="absolute left-3 top-2 text-slate-400 text-xs">🔍</span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          <button 
            onClick={() => setTypeFilter('ALL')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              typeFilter === 'ALL' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}>
            All ({docs.length})
          </button>
          {docTypes.map(t => {
            const count = docs.filter(d => d.doc_type === t).length;
            if (count === 0 && typeFilter !== t) return null;
            return (
              <button 
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                  typeFilter === t ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}>
                {t} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Document Cards Grid */}
      {loading ? (
        <div className="py-12 text-center text-slate-400 text-xs">Loading documents...</div>
      ) : filteredDocs.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
          <div className="text-3xl">📂</div>
          <h3 className="font-bold text-slate-800 text-sm">No documents found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchFilter || typeFilter !== 'ALL' ? 'Try adjusting your search filters.' : 'Upload your Aadhaar, marksheets, and certificates to get started.'}
          </p>
          <button 
            onClick={() => setShowUploadModal(true)}
            className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs">
            Upload Document Now
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocs.map(doc => (
            <div key={doc.id} className="bg-white rounded-2xl border border-slate-200 p-5 hover:border-emerald-300 transition shadow-2xs hover:shadow-sm flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                    {doc.doc_type}
                  </span>
                  <span className="text-[10px] text-slate-400">{doc.uploaded_at?.split(' ')[0]}</span>
                </div>
                <h4 className="font-bold text-slate-900 text-sm leading-snug">{doc.doc_name}</h4>
                <p className="text-xs text-slate-500 line-clamp-2">{doc.description || 'Verified citizen record'}</p>
              </div>

              {/* Tamper-Evident SHA-256 Hash Display */}
              <div className="space-y-2 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-slate-400 font-medium">Cryptographic Hash (SHA-256)</span>
                  <button 
                    onClick={() => handleVerifyIntegrity(doc.id)}
                    className="text-emerald-700 hover:text-emerald-800 font-bold bg-emerald-50 hover:bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-200">
                    Verify Tamper-Free
                  </button>
                </div>
                <div className="font-mono text-[10px] bg-slate-50 p-1.5 rounded border border-slate-200 text-slate-700 break-all select-all">
                  {doc.file_hash}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                <div className="text-[10px] text-slate-400">
                  Size: {(doc.file_size / 1024).toFixed(1)} KB
                </div>
                <div className="flex items-center gap-1.5">
                  <a 
                    href={`/api/documents/${doc.id}/view`} 
                    target="_blank"
                    className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition">
                    View
                  </a>
                  <a 
                    href={`/api/documents/${doc.id}/download`} 
                    className="px-2.5 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold text-xs transition">
                    Download
                  </a>
                  <button 
                    onClick={() => handleDelete(doc.id, doc.doc_name)}
                    className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                    title="Delete Document">
                    🗑️
                  </button>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* UPLOAD DOCUMENT MODAL */}
      {showUploadModal && (
        <UploadModal 
          docTypes={docTypes}
          onClose={() => setShowUploadModal(false)}
          onSuccess={() => {
            setShowUploadModal(false);
            fetchDocs();
            showToast('Document uploaded and registered successfully!', 'success');
          }}
          showToast={showToast}
        />
      )}

      {/* VERIFY INTEGRITY MODAL */}
      {verifyDocResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-scale">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🛡️</span>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Cryptographic Integrity Audit</h3>
                  <p className="text-[11px] text-slate-500">{verifyDocResult.doc_name}</p>
                </div>
              </div>
              <button onClick={() => setVerifyDocResult(null)} className="text-slate-400 hover:text-slate-600 font-bold">×</button>
            </div>

            <div className={`p-4 rounded-2xl border ${
              verifyDocResult.is_tamper_free ? 'bg-emerald-50 border-emerald-200 text-emerald-950' : 'bg-rose-50 border-rose-200 text-rose-950'
            }`}>
              <div className="flex items-center gap-2 font-bold text-sm mb-1">
                <span>{verifyDocResult.is_tamper_free ? '✅' : '❌'}</span>
                <span>{verifyDocResult.status}</span>
              </div>
              <p className="text-xs text-slate-600">
                {verifyDocResult.is_tamper_free 
                  ? 'Server recomputed the physical file hash on disk in real time. It perfectly matches the immutable ledger hash. No byte alteration detected.'
                  : 'Warning: Hash discrepancy detected! Document file may have been altered.'}
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 font-medium block mb-1">Registered SHA-256 Hash in Database:</span>
                <div className="font-mono text-[10px] bg-slate-50 p-2 rounded border text-slate-700 break-all select-all">
                  {verifyDocResult.stored_hash}
                </div>
              </div>
              <div>
                <span className="text-slate-400 font-medium block mb-1">Live Computed SHA-256 Hash on Server:</span>
                <div className="font-mono text-[10px] bg-slate-50 p-2 rounded border text-slate-700 break-all select-all">
                  {verifyDocResult.computed_hash}
                </div>
              </div>
            </div>

            <div className="pt-2 text-right">
              <button 
                onClick={() => setVerifyDocResult(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs">
                Close Verification
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// ============================================================================
// UPLOAD DOCUMENT MODAL COMPONENT
// ============================================================================
function UploadModal({ docTypes, onClose, onSuccess, showToast }) {
  const [docType, setDocType] = useState(docTypes[0]);
  const [docName, setDocName] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      showToast('Please select a file to upload', 'error');
      return;
    }

    setSubmitting(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('doc_type', docType);
    formData.append('doc_name', docName || file.name.split('.')[0]);
    formData.append('description', description);

    try {
      const res = await api.postForm('/api/documents/upload', formData);
      if (res.success) {
        onSuccess();
      } else {
        showToast(res.message, 'error');
      }
    } catch (err) {
      showToast('Error uploading document', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">📤</span>
            <h3 className="font-bold text-slate-900 text-sm">Upload Document to Vault</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold">×</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Document Category *</label>
            <select 
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500">
              {docTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Document Title *</label>
            <input 
              type="text" 
              placeholder="e.g. Aadhaar Card, B.Tech Consolidated Marksheet"
              value={docName}
              onChange={(e) => setDocName(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Description / Notes</label>
            <textarea 
              rows="2"
              placeholder="Optional issuing details, year, or certificate number"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Document File *</label>
            <div className="border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-4 text-center cursor-pointer transition">
              <input 
                type="file" 
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setFile(e.target.files[0]);
                    if (!docName) {
                      setDocName(e.target.files[0].name.replace(/\.[^/.]+$/, ""));
                    }
                  }
                }}
                className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                required
              />
              <p className="text-[10px] text-slate-400 mt-2">
                Supported: PDF, JPG, PNG, TXT, DOCX. Max 10MB.
              </p>
            </div>
            {file && (
              <div className="mt-2 text-[11px] text-emerald-700 bg-emerald-50 p-2 rounded-lg font-medium flex items-center justify-between">
                <span>Selected: {file.name}</span>
                <span>{(file.size / 1024).toFixed(1)} KB</span>
              </div>
            )}
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 space-y-1">
            <span className="font-semibold text-slate-700">🔒 Security Notice:</span>
            <p>Files are stored in private storage and never exposed publicly. An immutable SHA-256 hash is computed immediately.</p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-xs">
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 disabled:opacity-50">
              {submitting ? 'Calculating Hash & Uploading...' : 'Register & Upload'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// CITIZEN CONSENT SCREEN & REQUESTS (THE MOST IMPORTANT FEATURE!)
// ============================================================================
function CitizenRequests({ user, showToast, onUpdatePending }) {
  const [requests, setRequests] = useState([]);
  const [myDocs, setMyDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeReqTab, setActiveReqTab] = useState('pending'); // pending, approved, history
  
  // Selected request for the Consent Modal
  const [consentModalReq, setConsentModalReq] = useState(null);
  const [selectedDocIds, setSelectedDocIds] = useState([]);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [processing, setProcessing] = useState(false);

  const loadData = async () => {
    try {
      const [reqRes, docRes] = await Promise.all([
        api.get('/api/requests'),
        api.get('/api/documents')
      ]);

      if (reqRes.success) {
        setRequests(reqRes.requests);
        const pending = reqRes.requests.filter(r => r.status === 'pending').length;
        if (onUpdatePending) onUpdatePending(pending);
      }
      if (docRes.success) {
        setMyDocs(docRes.documents);
      }
    } catch (err) {
      showToast('Error loading requests', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openConsentModal = (req) => {
    setConsentModalReq(req);
    setShowRejectInput(false);
    setRejectionReason('');

    // Pre-select matching uploaded documents
    const matchingIds = [];
    req.required_doc_types.forEach(reqType => {
      const matched = myDocs.find(d => d.doc_type.toLowerCase() === reqType.toLowerCase());
      if (matched) matchingIds.push(matched.id);
    });
    setSelectedDocIds(matchingIds);
  };

  const handleConsentDecision = async (decision) => {
    if (!consentModalReq) return;
    
    if (decision === 'approve' && selectedDocIds.length === 0) {
      showToast('Please select at least one document to share, or choose reject.', 'error');
      return;
    }

    setProcessing(true);
    try {
      const payload = {
        decision,
        approved_doc_ids: selectedDocIds,
        rejection_reason: rejectionReason
      };
      const res = await api.post(`/api/requests/${consentModalReq.id}/respond`, payload);
      if (res.success) {
        showToast(res.message, 'success');
        setConsentModalReq(null);
        loadData();
      } else {
        showToast(res.message, 'error');
      }
    } catch (err) {
      showToast('Error recording consent', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleRevoke = async (reqId, reqCode) => {
    if (!confirm(`Are you sure you want to revoke access for ${reqCode}? The agent will immediately lose access.`)) return;
    try {
      const res = await api.post(`/api/requests/${reqId}/revoke`, {});
      if (res.success) {
        showToast(res.message, 'success');
        loadData();
      } else {
        showToast(res.message, 'error');
      }
    } catch (err) {
      showToast('Error revoking consent', 'error');
    }
  };

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const approvedRequests = requests.filter(r => r.status === 'approved' || r.status === 'partially_approved');
  const historyRequests = requests.filter(r => r.status === 'rejected' || r.status === 'revoked' || r.status === 'expired');

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div>
        <h2 className="text-xl font-display font-bold text-slate-900">Document Sharing Requests & Consent</h2>
        <p className="text-xs text-slate-500">
          Review incoming verification requests from authorized agents. You have total authority to grant selective consent or reject requests.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button 
          onClick={() => setActiveReqTab('pending')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeReqTab === 'pending' ? 'bg-amber-500 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}>
          <span>Action Required (Pending)</span>
          <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-white text-[10px]">{pendingRequests.length}</span>
        </button>

        <button 
          onClick={() => setActiveReqTab('approved')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeReqTab === 'approved' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}>
          <span>Active Consents (Approved)</span>
          <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-white text-[10px]">{approvedRequests.length}</span>
        </button>

        <button 
          onClick={() => setActiveReqTab('history')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeReqTab === 'history' ? 'bg-slate-800 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}>
          <span>Past / Rejected Requests</span>
          <span className="px-1.5 py-0.2 rounded-full bg-white/20 text-white text-[10px]">{historyRequests.length}</span>
        </button>
      </div>

      {/* TAB CONTENT: PENDING REQUESTS */}
      {activeReqTab === 'pending' && (
        <div className="space-y-4">
          {pendingRequests.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-2">
              <span className="text-3xl">✨</span>
              <h3 className="font-bold text-slate-800 text-sm">No Pending Requests</h3>
              <p className="text-xs text-slate-500">You are all caught up! When an authorized agent requests documents, it will appear here for your consent.</p>
            </div>
          ) : (
            pendingRequests.map(req => (
              <div key={req.id} className="bg-white rounded-2xl border border-amber-200 p-6 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-display font-bold text-slate-900 text-base">{req.service_name}</span>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">{req.request_code}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">Pending Your Consent</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Requested by: <strong className="text-slate-800">{req.agent_name}</strong> • {req.agent_org} ({req.agent_dept || 'Verification Unit'})
                    </p>
                  </div>
                  <div className="text-right text-xs text-slate-400">
                    <div>Issued: {req.created_at?.split(' ')[0]}</div>
                    {req.expiry_date && <div className="text-amber-600 font-medium">Valid until: {req.expiry_date}</div>}
                  </div>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="font-semibold text-slate-700 block">Stated Purpose of Request:</span>
                    <p className="text-slate-600 mt-0.5 font-medium">“{req.purpose}”</p>
                    {req.message && (
                      <p className="text-slate-500 mt-1 italic border-t border-slate-200/60 pt-1">
                        Agent Note: {req.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <span className="font-semibold text-slate-700 block mb-1.5">Required Document Types:</span>
                    <div className="flex flex-wrap gap-2">
                      {req.required_doc_types.map((type, idx) => {
                        const hasDoc = myDocs.some(d => d.doc_type.toLowerCase() === type.toLowerCase());
                        return (
                          <span key={idx} className={`px-2.5 py-1 rounded-lg text-xs font-medium border flex items-center gap-1.5 ${
                            hasDoc ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'
                          }`}>
                            <span>{hasDoc ? '✅' : '⚠️'}</span>
                            <span>{type}</span>
                            <span className="text-[10px] opacity-75">{hasDoc ? '(Uploaded)' : '(Not in Vault)'}</span>
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button 
                    onClick={() => openConsentModal(req)}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition flex items-center gap-2">
                    <span>🛡️ Review & Give Selective Consent</span>
                    <span>→</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB CONTENT: ACTIVE APPROVED CONSENTS */}
      {activeReqTab === 'approved' && (
        <div className="space-y-4">
          {approvedRequests.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
              <p className="text-xs text-slate-500">No active document shares currently authorized.</p>
            </div>
          ) : (
            approvedRequests.map(req => (
              <div key={req.id} className="bg-white rounded-2xl border border-emerald-200 p-5 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{req.service_name}</span>
                      <span className="text-[10px] font-mono bg-slate-100 px-2 py-0.5 rounded">{req.request_code}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        {req.status === 'partially_approved' ? 'Selective Consent Granted' : 'Fully Approved'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Recipient: <strong>{req.agent_name}</strong> ({req.agent_org})
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleRevoke(req.id, req.request_code)}
                      className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs border border-rose-200 transition">
                      Revoke Access Now
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-slate-500">Documents Shared Under This Consent:</span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {req.approved_documents?.map(doc => (
                      <div key={doc.id} className="p-2.5 rounded-xl bg-emerald-50/50 border border-emerald-200 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-bold text-slate-900 text-xs">{doc.doc_name}</div>
                          <div className="text-[10px] text-emerald-800">{doc.doc_type}</div>
                        </div>
                        <div className="text-right text-[10px] text-slate-500">
                          <div>Views: <strong>{doc.access_count}</strong></div>
                          {doc.last_accessed && <div>Last: {doc.last_accessed.split(' ')[0]}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            ))
          )}
        </div>
      )}

      {/* TAB CONTENT: PAST / REJECTED REQUESTS */}
      {activeReqTab === 'history' && (
        <div className="space-y-4">
          {historyRequests.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
              <p className="text-xs text-slate-500">No rejected or revoked requests recorded.</p>
            </div>
          ) : (
            historyRequests.map(req => (
              <div key={req.id} className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2 opacity-85">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-900">{req.service_name} ({req.request_code})</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    req.status === 'rejected' ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {req.status.toUpperCase()}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500">
                  Agent: {req.agent_name} ({req.agent_org}) • Responded: {req.responded_at || req.created_at}
                </div>
                {req.rejection_reason && (
                  <div className="text-[11px] text-rose-700 bg-rose-50 p-2 rounded">
                    Rejection Rationale: {req.rejection_reason}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* THE CITIZEN CONSENT MODAL (EXACT SPECIFICATION FROM PROMPT!) */}
      {consentModalReq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 animate-scale max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b pb-4">
              <div>
                <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Document Sharing Request
                </span>
                <h3 className="font-display text-xl font-extrabold text-slate-900 mt-1">
                  Citizen Consent & Review
                </h3>
              </div>
              <button onClick={() => setConsentModalReq(null)} className="text-slate-400 hover:text-slate-600 font-bold text-lg">×</button>
            </div>

            {/* Request Summary Box */}
            <div className="space-y-3 bg-slate-50 rounded-2xl p-4 border border-slate-200 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-400 font-medium block">Requested By:</span>
                  <span className="font-bold text-slate-900 text-sm">{consentModalReq.agent_name}</span>
                  <div className="text-[11px] text-slate-500">{consentModalReq.agent_org}</div>
                </div>
                <div>
                  <span className="text-slate-400 font-medium block">Service / Application:</span>
                  <span className="font-bold text-slate-900 text-sm">{consentModalReq.service_name}</span>
                  <div className="text-[11px] text-slate-500 font-mono">{consentModalReq.request_code}</div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200">
                <span className="text-slate-400 font-medium block">Declared Purpose:</span>
                <span className="font-semibold text-slate-800">“{consentModalReq.purpose}”</span>
              </div>
            </div>

            {/* Granular Selective Document Checklist */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-900 text-sm">
                  Requested Documents & Selective Consent:
                </label>
                <span className="text-[11px] text-slate-500">
                  {selectedDocIds.length} of {consentModalReq.required_doc_types.length} selected
                </span>
              </div>

              <div className="space-y-2">
                {consentModalReq.required_doc_types.map((type, idx) => {
                  const matchingDocs = myDocs.filter(d => d.doc_type.toLowerCase() === type.toLowerCase());
                  const hasMatch = matchingDocs.length > 0;
                  const firstDoc = matchingDocs[0];
                  const isChecked = firstDoc ? selectedDocIds.includes(firstDoc.id) : false;

                  return (
                    <div 
                      key={idx}
                      onClick={() => {
                        if (!firstDoc) return;
                        if (isChecked) {
                          setSelectedDocIds(selectedDocIds.filter(id => id !== firstDoc.id));
                        } else {
                          setSelectedDocIds([...selectedDocIds, firstDoc.id]);
                        }
                      }}
                      className={`p-3.5 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                        isChecked 
                          ? 'bg-emerald-50/70 border-emerald-400 shadow-2xs' 
                          : hasMatch 
                            ? 'bg-white border-slate-200 hover:border-slate-300' 
                            : 'bg-rose-50/50 border-rose-200 cursor-not-allowed'
                      }`}>
                      <div className="flex items-center gap-3">
                        <input 
                          type="checkbox" 
                          checked={isChecked}
                          disabled={!hasMatch}
                          onChange={() => {}} // handled by div click
                          className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300"
                        />
                        <div>
                          <div className="font-bold text-slate-900 text-xs flex items-center gap-2">
                            <span>{type}</span>
                            {!hasMatch && <span className="text-[10px] text-rose-600 font-semibold">(Missing from vault)</span>}
                          </div>
                          {firstDoc && (
                            <div className="text-[11px] text-slate-500">
                              Matched: <strong>{firstDoc.doc_name}</strong> (Uploaded {firstDoc.uploaded_at?.split(' ')[0]})
                            </div>
                          )}
                        </div>
                      </div>

                      {firstDoc && (
                        <span className="text-[10px] font-mono text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-200">
                          {firstDoc.file_hash.substring(0, 8)}...
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* REJECTION REASON ACCORDION (If user wishes to reject) */}
            {showRejectInput && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 space-y-2 text-xs">
                <label className="font-bold text-rose-900 block">Reason for Withholding Consent (Optional):</label>
                <textarea 
                  rows="2"
                  placeholder="e.g. Excessive documents requested, service already completed, or privacy preference"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full p-2 rounded-lg border border-rose-300 text-xs focus:ring-2 focus:ring-rose-500"
                />
              </div>
            )}

            {/* MANDATORY PROMPT CITIZEN GUARANTEE BANNER */}
            <div className="p-3.5 rounded-xl bg-emerald-900 text-white text-xs flex items-start gap-2.5 shadow-inner">
              <span className="text-emerald-400 text-base">🛡️</span>
              <p className="text-[11px] leading-relaxed text-emerald-100">
                <strong>You are sharing only the documents you have checked.</strong> The requesting agent ({consentModalReq.agent_name}) will NOT have access to any other documents in your digital vault.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              {!showRejectInput ? (
                <button 
                  type="button"
                  onClick={() => setShowRejectInput(true)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-rose-600 hover:bg-rose-50 font-bold text-xs transition border border-rose-200">
                  ✕ Reject Request
                </button>
              ) : (
                <button 
                  type="button"
                  disabled={processing}
                  onClick={() => handleConsentDecision('reject')}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition">
                  Confirm Rejection
                </button>
              )}

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button 
                  type="button"
                  onClick={() => setConsentModalReq(null)}
                  className="px-4 py-2.5 rounded-xl text-slate-500 hover:bg-slate-100 font-semibold text-xs">
                  Cancel
                </button>
                <button 
                  type="button"
                  disabled={processing || selectedDocIds.length === 0}
                  onClick={() => handleConsentDecision('approve')}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 disabled:opacity-50 transition">
                  {processing ? 'Recording Consent...' : `Approve Selected (${selectedDocIds.length})`}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

// ============================================================================
// CITIZEN SHARING HISTORY & AUDIT LOG
// ============================================================================
function CitizenHistory({ user, showToast }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    try {
      const res = await api.get('/api/history');
      if (res.success) {
        setHistory(res.history);
      }
    } catch (err) {
      showToast('Error loading sharing history', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleRevoke = async (reqId, reqCode) => {
    if (!confirm(`Revoke document access for ${reqCode}? Agent will be denied future access.`)) return;
    try {
      const res = await api.post(`/api/requests/${reqId}/revoke`, {});
      if (res.success) {
        showToast(res.message, 'success');
        fetchHistory();
      }
    } catch (err) {
      showToast('Error revoking consent', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-display font-bold text-slate-900">Document Sharing & Access History</h2>
        <p className="text-xs text-slate-500">
          Complete, tamper-evident log of all documents you have selectively shared with authorized agents.
        </p>
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading audit history...</div>
      ) : history.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <p className="text-xs text-slate-500">No documents have been shared yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] tracking-wider border-b">
                <tr>
                  <th className="px-4 py-3">Document Shared</th>
                  <th className="px-4 py-3">Recipient Agent & Organization</th>
                  <th className="px-4 py-3">Service & Purpose</th>
                  <th className="px-4 py-3">Consent Granted</th>
                  <th className="px-4 py-3">Agent Views</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {history.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      <div>{item.doc_name}</div>
                      <div className="text-[10px] text-emerald-700 font-mono">
                        SHA: {item.file_hash?.substring(0, 10)}...
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-800">{item.agent_name}</div>
                      <div className="text-[10px] text-slate-500">{item.agent_org}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800">{item.service_name}</div>
                      <div className="text-[10px] text-slate-500 line-clamp-1">{item.purpose}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                      {item.approved_at}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold text-[11px]">
                        {item.access_count} views
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        item.is_revoked || item.request_status === 'revoked' ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {item.is_revoked || item.request_status === 'revoked' ? 'Revoked' : 'Active Access'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!item.is_revoked && item.request_status !== 'revoked' && (
                        <button 
                          onClick={() => handleRevoke(item.request_id, item.request_code)}
                          className="px-2.5 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-[11px] border border-rose-200">
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// AGENT DASHBOARD & SCREENS
// ============================================================================
function AgentDashboard({ user, onNavigate, showToast }) {
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, total: 0 });
  const [approvedList, setApprovedList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/requests').then(res => {
      if (res.success) {
        const reqs = res.requests;
        const pending = reqs.filter(r => r.status === 'pending');
        const approved = reqs.filter(r => r.status === 'approved' || r.status === 'partially_approved');
        const rejected = reqs.filter(r => r.status === 'rejected');

        setStats({
          pending: pending.length,
          approved: approved.length,
          rejected: rejected.length,
          total: reqs.length
        });
        setApprovedList(approved.slice(0, 4));
      }
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-6">
      
      {/* Agent Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-800 text-white shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-blue-200 uppercase tracking-wider">
            Authorized Agent Console • {user.organization || 'Government Department'}
          </span>
          <h2 className="text-2xl font-display font-extrabold mt-1">
            Welcome, {user.full_name}
          </h2>
          <p className="text-xs text-blue-100 mt-1 max-w-xl">
            You are operating under the <strong>DocTrust Consent Protocol</strong>. Document access is granted strictly after citizen review and selective authorization.
          </p>
        </div>
        <button 
          onClick={() => onNavigate('agent-new-request')}
          className="px-5 py-2.5 rounded-xl bg-white text-blue-900 font-bold text-xs shadow-md hover:bg-blue-50 transition shrink-0">
          + Request Documents
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <div className="text-xs font-semibold text-slate-500">Total Requests Sent</div>
          <div className="text-3xl font-display font-extrabold text-slate-900 mt-1">{stats.total}</div>
        </div>

        <div className="p-5 rounded-2xl bg-amber-50/60 border border-amber-200 shadow-2xs">
          <div className="text-xs font-semibold text-amber-800">Pending Citizen Review</div>
          <div className="text-3xl font-display font-extrabold text-amber-600 mt-1">{stats.pending}</div>
        </div>

        <div className="p-5 rounded-2xl bg-emerald-50/60 border border-emerald-200 shadow-2xs">
          <div className="text-xs font-semibold text-emerald-800">Consented & Accessible</div>
          <div className="text-3xl font-display font-extrabold text-emerald-600 mt-1">{stats.approved}</div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <div className="text-xs font-semibold text-slate-500">Rejected Requests</div>
          <div className="text-3xl font-display font-extrabold text-rose-600 mt-1">{stats.rejected}</div>
        </div>
      </div>

      {/* Approved Documents Ready for Verification */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm">
            Recently Approved Requests Ready for Inspection
          </h3>
          <button 
            onClick={() => onNavigate('requests')}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700">
            View All Requests →
          </button>
        </div>

        {approvedList.length === 0 ? (
          <div className="p-10 text-center bg-white rounded-2xl border border-slate-200">
            <p className="text-xs text-slate-500">No approved citizen requests at this moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {approvedList.map(req => (
              <div key={req.id} className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{req.service_name}</h4>
                    <div className="text-xs text-slate-500">Citizen: <strong>{req.citizen_name}</strong></div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold">
                    {req.request_code}
                  </span>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <span className="text-[11px] font-semibold text-slate-500">Consented Documents:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {req.approved_documents?.map(doc => (
                      <span key={doc.id} className="text-[11px] px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium">
                        ✓ {doc.doc_name}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button 
                    onClick={() => onNavigate('requests')}
                    className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition">
                    Inspect & Verify Documents
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

// ============================================================================
// AGENT: CREATE DOCUMENT REQUEST FORM
// ============================================================================
function AgentNewRequest({ user, showToast, onCreated }) {
  const [citizens, setCitizens] = useState([]);
  const [citizenId, setCitizenId] = useState('');
  const [serviceName, setServiceName] = useState('');
  const [purpose, setPurpose] = useState('');
  const [message, setMessage] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [selectedTypes, setSelectedTypes] = useState(['Marksheet', 'Aadhaar / ID Proof']);
  const [submitting, setSubmitting] = useState(false);

  const availableDocTypes = [
    "Aadhaar / ID Proof",
    "Marksheet",
    "Address Proof",
    "Community Certificate",
    "Income Certificate",
    "Other supporting documents"
  ];

  useEffect(() => {
    // Default expiry 30 days from now
    const d = new Date();
    d.setDate(d.getDate() + 30);
    setExpiryDate(d.toISOString().split('T')[0]);

    api.get('/api/citizens').then(res => {
      if (res.success && res.citizens.length > 0) {
        setCitizens(res.citizens);
        setCitizenId(res.citizens[0].id);
      }
    });
  }, []);

  const toggleDocType = (type) => {
    if (selectedTypes.includes(type)) {
      if (selectedTypes.length === 1) {
        showToast('At least one document type must be requested', 'error');
        return;
      }
      setSelectedTypes(selectedTypes.filter(t => t !== type));
    } else {
      setSelectedTypes([...selectedTypes, type]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!citizenId || !serviceName || !purpose || selectedTypes.length === 0) {
      showToast('Please fill all required fields', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        citizen_id: parseInt(citizenId),
        service_name: serviceName,
        purpose: purpose,
        message: message,
        required_doc_types: selectedTypes,
        expiry_date: expiryDate
      };

      const res = await api.post('/api/requests', payload);
      if (res.success) {
        showToast(res.message, 'success');
        onCreated();
      } else {
        showToast(res.message, 'error');
      }
    } catch (err) {
      showToast('Error transmitting request', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-display font-bold text-slate-900">Initiate Document Sharing Request</h2>
        <p className="text-xs text-slate-500">
          Request specific documents from a registered citizen for service processing. The citizen will review your purpose and selectively grant consent.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-5 text-xs">
        
        {/* Select Citizen */}
        <div>
          <label className="block font-bold text-slate-800 mb-1">Target Citizen *</label>
          <select 
            value={citizenId}
            onChange={(e) => setCitizenId(e.target.value)}
            className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500"
            required>
            {citizens.map(c => (
              <option key={c.id} value={c.id}>
                {c.full_name} ({c.email}) {c.mobile ? `• ${c.mobile}` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Service / Application Name */}
        <div>
          <label className="block font-bold text-slate-800 mb-1">Service / Application Name *</label>
          <input 
            type="text" 
            placeholder="e.g. State Post-Matric Merit Scholarship, Home Loan Application, Passport Clearance"
            value={serviceName}
            onChange={(e) => setServiceName(e.target.value)}
            className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        {/* Stated Purpose */}
        <div>
          <label className="block font-bold text-slate-800 mb-1">Formal Purpose of Verification *</label>
          <textarea 
            rows="2"
            placeholder="Clearly explain why these certificates are required for this government / financial service"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        {/* Required Document Types Checkboxes */}
        <div>
          <label className="block font-bold text-slate-800 mb-2">Required Document Types *</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {availableDocTypes.map(t => {
              const selected = selectedTypes.includes(t);
              return (
                <div 
                  key={t}
                  onClick={() => toggleDocType(t)}
                  className={`p-3 rounded-xl border transition cursor-pointer flex items-center gap-2.5 ${
                    selected ? 'bg-blue-50 border-blue-400 text-blue-900 font-bold' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}>
                  <input 
                    type="checkbox" 
                    checked={selected}
                    onChange={() => {}}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                  />
                  <span>{t}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Expiry Date & Message */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block font-bold text-slate-800 mb-1">Access Expiration Date</label>
            <input 
              type="date" 
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-800 mb-1">Optional Officer Message</label>
            <input 
              type="text" 
              placeholder="e.g. Please provide your latest 2026 statement"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-[11px] leading-relaxed">
          <strong>DocTrust Security Policy:</strong> This request will be placed in the citizen's personal review queue. You will receive access only to documents the citizen explicitly checks and approves.
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button 
            type="submit" 
            disabled={submitting}
            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 disabled:opacity-50 transition">
            {submitting ? 'Transmitting Request...' : 'Send Request to Citizen'}
          </button>
        </div>

      </form>
    </div>
  );
}

// ============================================================================
// AGENT: TRACK & INSPECT REQUESTS
// ============================================================================
function AgentRequests({ user, showToast }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('approved');
  const [inspectModalDoc, setInspectModalDoc] = useState(null);

  const fetchRequests = async () => {
    try {
      const res = await api.get('/api/requests');
      if (res.success) {
        setRequests(res.requests);
      }
    } catch (err) {
      showToast('Error loading requests', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const pending = requests.filter(r => r.status === 'pending');
  const approved = requests.filter(r => r.status === 'approved' || r.status === 'partially_approved');
  const rejected = requests.filter(r => r.status === 'rejected' || r.status === 'revoked');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-display font-bold text-slate-900">Track Document Requests & Consents</h2>
        <p className="text-xs text-slate-500">
          Inspect citizen-consented certificates, verify cryptographic hashes, and download authentic documents.
        </p>
      </div>

      <div className="flex items-center gap-2 border-b pb-2">
        <button 
          onClick={() => setActiveTab('approved')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'approved' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}>
          <span>Approved Documents ({approved.length})</span>
        </button>

        <button 
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'pending' ? 'bg-amber-500 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}>
          <span>Pending Citizen Review ({pending.length})</span>
        </button>

        <button 
          onClick={() => setActiveTab('rejected')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
            activeTab === 'rejected' ? 'bg-slate-800 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}>
          <span>Rejected / Revoked ({rejected.length})</span>
        </button>
      </div>

      {/* APPROVED REQUESTS LIST */}
      {activeTab === 'approved' && (
        <div className="space-y-4">
          {approved.length === 0 ? (
            <div className="p-10 text-center bg-white rounded-2xl border border-slate-200">
              <p className="text-xs text-slate-500">No approved requests yet.</p>
            </div>
          ) : (
            approved.map(req => (
              <div key={req.id} className="bg-white rounded-2xl border border-emerald-200 p-6 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-base">{req.service_name}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600">{req.request_code}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        {req.status === 'partially_approved' ? 'Selective Consent' : 'Fully Approved'}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Citizen: <strong>{req.citizen_name}</strong> ({req.citizen_email})
                    </div>
                  </div>
                  <div className="text-xs text-slate-400">
                    Consent Date: {req.responded_at || req.created_at}
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="font-bold text-slate-800 text-xs block">
                    Citizen-Approved Documents Available for Inspection:
                  </span>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {req.approved_documents?.map(doc => (
                      <div key={doc.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-3">
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 text-xs">{doc.doc_name}</span>
                            <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                              {doc.doc_type}
                            </span>
                          </div>
                          <div className="font-mono text-[10px] text-slate-500 mt-1 break-all bg-white p-1 rounded border">
                            SHA: {doc.file_hash}
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs">
                          <span className="text-[10px] text-slate-400">Views: {doc.access_count}</span>
                          <div className="flex items-center gap-2">
                            <a 
                              href={`/api/documents/${doc.id}/view`} 
                              target="_blank"
                              className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-2xs">
                              Inspect File
                            </a>
                            <a 
                              href={`/api/documents/${doc.id}/download`} 
                              className="px-3 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs">
                              Download
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            ))
          )}
        </div>
      )}

      {/* PENDING REQUESTS LIST */}
      {activeTab === 'pending' && (
        <div className="space-y-3">
          {pending.length === 0 ? (
            <div className="p-10 text-center bg-white rounded-2xl border border-slate-200">
              <p className="text-xs text-slate-500">No requests pending citizen response.</p>
            </div>
          ) : (
            pending.map(req => (
              <div key={req.id} className="p-4 rounded-xl bg-white border border-slate-200 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-slate-900">{req.service_name} ({req.request_code})</div>
                  <div className="text-slate-500">Target Citizen: {req.citizen_name} • Purpose: {req.purpose}</div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 font-bold text-[10px]">
                  Awaiting Citizen Review
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {/* REJECTED REQUESTS LIST */}
      {activeTab === 'rejected' && (
        <div className="space-y-3">
          {rejected.length === 0 ? (
            <div className="p-10 text-center bg-white rounded-2xl border border-slate-200">
              <p className="text-xs text-slate-500">No rejected or revoked requests.</p>
            </div>
          ) : (
            rejected.map(req => (
              <div key={req.id} className="p-4 rounded-xl bg-white border border-slate-200 flex items-center justify-between text-xs opacity-75">
                <div>
                  <div className="font-bold text-slate-900">{req.service_name} ({req.request_code})</div>
                  <div className="text-slate-500">Citizen: {req.citizen_name} • {req.rejection_reason || 'Access denied by citizen'}</div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 font-bold text-[10px]">
                  {req.status.toUpperCase()}
                </span>
              </div>
            ))
          )}
        </div>
      )}

    </div>
  );
}

// ============================================================================
// AGENT: RECEIVED DOCUMENTS GALLERY
// ============================================================================
function AgentReceivedDocs({ user, showToast }) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/history').then(res => {
      if (res.success) {
        setDocs(res.history);
      }
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-display font-bold text-slate-900">Received Verified Documents</h2>
        <p className="text-xs text-slate-500">
          Documents currently approved by citizens for your inspection. Access is monitored and logged in the immutable audit ledger.
        </p>
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading received documents...</div>
      ) : docs.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200">
          <p className="text-xs text-slate-500">No documents currently authorized by citizens.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {docs.map((doc, idx) => (
            <div key={idx} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                    {doc.doc_type}
                  </span>
                  <span className="text-[10px] text-slate-400">From: {doc.citizen_name}</span>
                </div>
                <h4 className="font-bold text-slate-900 text-sm mt-2">{doc.doc_name}</h4>
                <div className="text-[11px] text-slate-500 mt-1">Service: {doc.service_name}</div>
                <div className="font-mono text-[10px] text-slate-600 bg-slate-50 p-1 rounded mt-2 border break-all">
                  SHA: {doc.file_hash}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-[10px] text-slate-400">Expires: {doc.expiry_date || 'N/A'}</span>
                <div className="flex items-center gap-1.5">
                  <a 
                    href={`/api/documents/${doc.doc_id}/view`} 
                    target="_blank"
                    className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-2xs">
                    View
                  </a>
                  <a 
                    href={`/api/documents/${doc.doc_id}/download`} 
                    className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs">
                    Download
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// ADMINISTRATOR DASHBOARD & SCREENS
// ============================================================================
function AdminDashboard({ user, onNavigate, showToast }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/admin/stats').then(res => {
      if (res.success) {
        setStats(res.stats);
      }
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-purple-900 via-indigo-950 to-slate-900 text-white shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-purple-300 uppercase tracking-wider">
            DocTrust Governance Authority • Master Administrator
          </span>
          <h2 className="text-2xl font-display font-extrabold mt-1">
            System Security & Access Oversight
          </h2>
          <p className="text-xs text-purple-200 mt-1 max-w-xl">
            Read-oriented administrative control. Administrators verify authorized agents and inspect immutable audit logs without bypassing citizen consent.
          </p>
        </div>
        <button 
          onClick={() => onNavigate('admin-agents')}
          className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md transition shrink-0">
          Manage Agents ({stats?.pending_agents || 0} Pending)
        </button>
      </div>

      {/* High-Level Metrics Grid */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-4 rounded-xl bg-white border border-slate-200">
            <div className="text-[11px] text-slate-500 font-medium">Citizens</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{stats.total_citizens}</div>
          </div>
          <div className="p-4 rounded-xl bg-white border border-slate-200">
            <div className="text-[11px] text-slate-500 font-medium">Agents</div>
            <div className="text-2xl font-bold text-blue-600 mt-1">{stats.total_agents}</div>
          </div>
          <div className={`p-4 rounded-xl border ${
            stats.pending_agents > 0 ? 'bg-amber-50 border-amber-300' : 'bg-white border-slate-200'
          }`}>
            <div className="text-[11px] text-amber-800 font-medium">Pending Agents</div>
            <div className="text-2xl font-bold text-amber-600 mt-1">{stats.pending_agents}</div>
          </div>
          <div className="p-4 rounded-xl bg-white border border-slate-200">
            <div className="text-[11px] text-slate-500 font-medium">Vault Docs</div>
            <div className="text-2xl font-bold text-emerald-600 mt-1">{stats.total_documents}</div>
          </div>
          <div className="p-4 rounded-xl bg-white border border-slate-200">
            <div className="text-[11px] text-slate-500 font-medium">Total Requests</div>
            <div className="text-2xl font-bold text-indigo-600 mt-1">{stats.total_requests}</div>
          </div>
          <div className="p-4 rounded-xl bg-white border border-slate-200">
            <div className="text-[11px] text-slate-500 font-medium">Audit Events</div>
            <div className="text-2xl font-bold text-purple-600 mt-1">{stats.total_audit_events}</div>
          </div>
        </div>
      )}

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div 
          onClick={() => onNavigate('admin-agents')}
          className="p-6 rounded-2xl bg-white border border-slate-200 hover:border-purple-300 transition cursor-pointer shadow-2xs space-y-2">
          <div className="text-2xl">🏢</div>
          <h3 className="font-bold text-slate-900 text-sm">Agent Authorization Cell</h3>
          <p className="text-xs text-slate-500">
            Review and approve government officers, bank agents, and verification authorities before they can request citizen records.
          </p>
        </div>

        <div 
          onClick={() => onNavigate('admin-audit')}
          className="p-6 rounded-2xl bg-white border border-slate-200 hover:border-purple-300 transition cursor-pointer shadow-2xs space-y-2">
          <div className="text-2xl">🔒</div>
          <h3 className="font-bold text-slate-900 text-sm">Immutable Audit Ledger</h3>
          <p className="text-xs text-slate-500">
            Inspect cryptographic logs of logins, uploads, requests, selective consents, file accesses, and revocations.
          </p>
        </div>

        <div 
          onClick={() => onNavigate('documents')}
          className="p-6 rounded-2xl bg-white border border-slate-200 hover:border-purple-300 transition cursor-pointer shadow-2xs space-y-2">
          <div className="text-2xl">🗄️</div>
          <h3 className="font-bold text-slate-900 text-sm">System Document Registry</h3>
          <p className="text-xs text-slate-500">
            System-wide inventory of all citizen uploaded documents with cryptographic SHA-256 integrity verification.
          </p>
        </div>
      </div>

    </div>
  );
}

// ============================================================================
// ADMIN: AGENT AUTHORIZATION & GOVERNANCE
// ============================================================================
function AdminAgentGovernance({ user, showToast }) {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchAgents = async () => {
    try {
      const res = await api.get('/api/admin/users?role=agent');
      if (res.success) {
        setAgents(res.users);
      }
    } catch (err) {
      showToast('Error loading agents', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  const handleUpdateStatus = async (agentId, status) => {
    try {
      const res = await api.post(`/api/admin/agents/${agentId}/status`, { status });
      if (res.success) {
        showToast(res.message, 'success');
        fetchAgents();
      } else {
        showToast(res.message, 'error');
      }
    } catch (err) {
      showToast('Error updating status', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-display font-bold text-slate-900">Authorized Agent Governance</h2>
        <p className="text-xs text-slate-500">
          Only approved agents can initiate document requests to citizens. Approve or suspend departmental credentials.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] tracking-wider border-b">
              <tr>
                <th className="px-4 py-3">Agent Name & Email</th>
                <th className="px-4 py-3">Organization & Dept</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Registered At</th>
                <th className="px-4 py-3">Authorization Status</th>
                <th className="px-4 py-3 text-right">Administrative Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {agents.map(ag => (
                <tr key={ag.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3">
                    <div className="font-bold text-slate-900">{ag.full_name}</div>
                    <div className="text-[11px] text-slate-500">{ag.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-800">{ag.organization || 'Independent'}</div>
                    <div className="text-[10px] text-slate-400">{ag.department || 'N/A'}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{ag.mobile || 'N/A'}</td>
                  <td className="px-4 py-3 text-slate-400">{ag.created_at?.split(' ')[0]}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      ag.agent_status === 'active' ? 'bg-emerald-100 text-emerald-800' :
                      ag.agent_status === 'pending' ? 'bg-amber-100 text-amber-800 font-extrabold animate-pulse' :
                      'bg-rose-100 text-rose-800'
                    }`}>
                      {ag.agent_status?.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-1.5">
                    {ag.agent_status !== 'active' && (
                      <button 
                        onClick={() => handleUpdateStatus(ag.id, 'active')}
                        className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px]">
                        Approve Agent
                      </button>
                    )}
                    {ag.agent_status === 'active' && (
                      <button 
                        onClick={() => handleUpdateStatus(ag.id, 'suspended')}
                        className="px-2.5 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-[11px] border border-rose-200">
                        Suspend
                      </button>
                    )}
                    {ag.agent_status === 'pending' && (
                      <button 
                        onClick={() => handleUpdateStatus(ag.id, 'rejected')}
                        className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px]">
                        Reject
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// ADMIN: IMMUTABLE AUDIT & ACCESS LEDGER
// ============================================================================
function AdminAuditLedger({ user, showToast }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('');

  const fetchLogs = async () => {
    try {
      const url = categoryFilter ? `/api/admin/audit-logs?category=${categoryFilter}` : '/api/admin/audit-logs';
      const res = await api.get(url);
      if (res.success) {
        setLogs(res.logs);
      }
    } catch (err) {
      showToast('Error loading audit ledger', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [categoryFilter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-display font-bold text-slate-900">Immutable System Audit Ledger</h2>
          <p className="text-xs text-slate-500">
            Real-time event recording of logins, uploads, consent decisions, and document view operations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select 
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="p-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-purple-500">
            <option value="">All Categories</option>
            <option value="CONSENT">CONSENT Events</option>
            <option value="ACCESS">ACCESS Events</option>
            <option value="DOCUMENT">DOCUMENT Events</option>
            <option value="REQUEST">REQUEST Events</option>
            <option value="AUTH">AUTH Events</option>
            <option value="ADMIN">ADMIN Events</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] tracking-wider border-b">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">User & Role</th>
                <th className="px-4 py-3">Details / Audit Description</th>
                <th className="px-4 py-3">IP Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {logs.map(log => (
                <tr key={log.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                    {log.timestamp}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      log.category === 'CONSENT' ? 'bg-emerald-100 text-emerald-800' :
                      log.category === 'ACCESS' ? 'bg-blue-100 text-blue-800' :
                      log.category === 'DOCUMENT' ? 'bg-teal-100 text-teal-800' :
                      log.category === 'AUTH' ? 'bg-purple-100 text-purple-800' :
                      'bg-slate-100 text-slate-800'
                    }`}>
                      {log.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono font-semibold text-[11px] text-slate-900">
                    {log.action}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-800">{log.user_name || 'System / Guest'}</div>
                    <div className="text-[10px] text-slate-400 capitalize">{log.user_role || 'anonymous'}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-800 max-w-md">
                    {log.details}
                  </td>
                  <td className="px-4 py-3 font-mono text-[10px] text-slate-400">
                    {log.ip_address}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// ADMIN: GLOBAL DOCUMENT REGISTRY
// ============================================================================
function AdminDocumentVault({ user, showToast }) {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/documents').then(res => {
      if (res.success) {
        setDocs(res.documents);
      }
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-display font-bold text-slate-900">System Document Registry & SHA-256 Ledger</h2>
        <p className="text-xs text-slate-500">
          Master cryptographic index of citizen documents stored in the system.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold text-[10px] tracking-wider border-b">
              <tr>
                <th className="px-4 py-3">Citizen Owner</th>
                <th className="px-4 py-3">Document Title & Category</th>
                <th className="px-4 py-3">Cryptographic SHA-256 Hash</th>
                <th className="px-4 py-3">Size</th>
                <th className="px-4 py-3">Uploaded</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {docs.map(doc => (
                <tr key={doc.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3">
                    <div className="font-bold text-slate-900">{doc.citizen_name}</div>
                    <div className="text-[10px] text-slate-400">{doc.citizen_email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-800">{doc.doc_name}</div>
                    <span className="text-[10px] px-2 py-0.2 rounded bg-emerald-50 text-emerald-800 font-medium">
                      {doc.doc_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-[10px] text-emerald-800 select-all max-w-xs break-all">
                    {doc.file_hash}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {(doc.file_size / 1024).toFixed(1)} KB
                  </td>
                  <td className="px-4 py-3 text-slate-400">{doc.uploaded_at?.split(' ')[0]}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                      {doc.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// AUTHENTICATION MODAL (LOGIN & REGISTRATION)
// ============================================================================
function AuthModal({ mode, setMode, onClose, onSuccess, onDemoLogin, showToast }) {
  const [role, setRole] = useState('citizen');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [org, setOrg] = useState('');
  const [dept, setDept] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    if (mode === 'login') {
      try {
        const res = await api.post('/api/auth/login', { email, password });
        if (res.success) {
          onSuccess(res.user);
        } else {
          showToast(res.message, 'error');
        }
      } catch (err) {
        showToast('Login failed', 'error');
      } finally {
        setSubmitting(false);
      }
    } else {
      // Register
      if (password !== confirmPassword) {
        showToast('Passwords do not match', 'error');
        setSubmitting(false);
        return;
      }
      try {
        const payload = {
          full_name: fullName,
          email,
          mobile,
          password,
          confirm_password: confirmPassword,
          role,
          organization: org,
          department: dept
        };
        const res = await api.post('/api/auth/register', payload);
        if (res.success) {
          if (res.requires_approval) {
            showToast(res.message, 'info');
            onClose();
          } else {
            onSuccess(res.user);
          }
        } else {
          showToast(res.message, 'error');
        }
      } catch (err) {
        showToast('Registration failed', 'error');
      } finally {
        setSubmitting(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5 animate-scale max-h-[90vh] overflow-y-auto">
        
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">🛡️</span>
            <div>
              <h3 className="font-display font-bold text-slate-900 text-base">
                {mode === 'login' ? 'Sign In to DocTrust' : 'Create DocTrust Account'}
              </h3>
              <p className="text-[11px] text-slate-500">Centralized Digital Document Authentication</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold">×</button>
        </div>

        {/* Demo Fast Logins */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            ⚡ 1-Click Symposium Demo Logins:
          </span>
          <div className="grid grid-cols-3 gap-1.5">
            <button 
              type="button"
              onClick={() => onDemoLogin('citizen')}
              className="px-2 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-emerald-500 text-emerald-800 font-bold text-[11px] shadow-2xs">
              👤 Citizen
            </button>
            <button 
              type="button"
              onClick={() => onDemoLogin('agent')}
              className="px-2 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-blue-500 text-blue-800 font-bold text-[11px] shadow-2xs">
              🏛️ Agent
            </button>
            <button 
              type="button"
              onClick={() => onDemoLogin('admin')}
              className="px-2 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-purple-500 text-purple-800 font-bold text-[11px] shadow-2xs">
              🛡️ Admin
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          
          {mode === 'register' && (
            <>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Account Role *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    type="button"
                    onClick={() => setRole('citizen')}
                    className={`py-2 rounded-xl font-bold border text-xs ${
                      role === 'citizen' ? 'bg-emerald-50 border-emerald-500 text-emerald-900' : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}>
                    👤 Citizen
                  </button>
                  <button 
                    type="button"
                    onClick={() => setRole('agent')}
                    className={`py-2 rounded-xl font-bold border text-xs ${
                      role === 'agent' ? 'bg-blue-50 border-blue-500 text-blue-900' : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}>
                    🏛️ Authorized Agent
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Full Name *</label>
                <input 
                  type="text" 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Rajesh Kumar"
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              {role === 'agent' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Organization *</label>
                    <input 
                      type="text" 
                      value={org}
                      onChange={(e) => setOrg(e.target.value)}
                      placeholder="e.g. National Scholarship Portal"
                      className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Department</label>
                    <input 
                      type="text" 
                      value={dept}
                      onChange={(e) => setDept(e.target.value)}
                      placeholder="e.g. Higher Education Cell"
                      className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">Mobile Number</label>
                <input 
                  type="tel" 
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="+91 9876543210"
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </>
          )}

          <div>
            <label className="block font-bold text-slate-700 mb-1">Email Address *</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. citizen@gmail.com"
              className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Password *</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500"
              required
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              Passwords are salted and securely hashed using PBKDF2-SHA256.
            </span>
          </div>

          {mode === 'register' && (
            <div>
              <label className="block font-bold text-slate-700 mb-1">Confirm Password *</label>
              <input 
                type="password" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>
          )}

          <div className="pt-2">
            <button 
              type="submit" 
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 disabled:opacity-50 transition">
              {submitting ? 'Authenticating...' : mode === 'login' ? 'Sign In to Account' : 'Create Account'}
            </button>
          </div>

          <div className="text-center pt-2">
            {mode === 'login' ? (
              <p className="text-slate-500">
                Don't have an account?{' '}
                <button 
                  type="button" 
                  onClick={() => setMode('register')}
                  className="font-bold text-emerald-600 hover:underline">
                  Register as Citizen
                </button>
              </p>
            ) : (
              <p className="text-slate-500">
                Already registered?{' '}
                <button 
                  type="button" 
                  onClick={() => setMode('login')}
                  className="font-bold text-emerald-600 hover:underline">
                  Sign In
                </button>
              </p>
            )}
          </div>

        </form>

      </div>
    </div>
  );
}

// ============================================================================
// SYMPOSIUM PROJECT GUIDE & VIVA MODAL
// ============================================================================
function SymposiumModal({ onClose }) {
  const [tab, setTab] = useState('overview'); // overview, architecture, viva, roadmap

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5 animate-scale max-h-[90vh] overflow-y-auto">
        
        <div className="flex items-start justify-between border-b pb-3">
          <div>
            <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-full border border-amber-300">
              College Symposium Presentation Package
            </span>
            <h3 className="font-display text-xl font-extrabold text-slate-900 mt-1">
              DocTrust Project Architecture & Evaluator Guide
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold text-lg">×</button>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1.5 border-b pb-2 text-xs">
          <button 
            onClick={() => setTab('overview')}
            className={`px-3 py-1.5 rounded-lg font-bold transition ${tab === 'overview' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
            Project Abstract
          </button>
          <button 
            onClick={() => setTab('architecture')}
            className={`px-3 py-1.5 rounded-lg font-bold transition ${tab === 'architecture' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
            Methodology & Security
          </button>
          <button 
            onClick={() => setTab('viva')}
            className={`px-3 py-1.5 rounded-lg font-bold transition ${tab === 'viva' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
            Viva Voce Q&A Cheat Sheet
          </button>
          <button 
            onClick={() => setTab('roadmap')}
            className={`px-3 py-1.5 rounded-lg font-bold transition ${tab === 'roadmap' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
            Prototype vs Future Scope
          </button>
        </div>

        {/* TAB 1: ABSTRACT */}
        {tab === 'overview' && (
          <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
            <div>
              <h4 className="font-bold text-slate-900 text-sm mb-1">1. The Real-World Problem</h4>
              <p>
                In the traditional governance and commercial landscape, citizens repeatedly carry photocopies or hard copies of sensitive documents (Aadhaar cards, transcripts, income proofs) to service centers, banks, and scholarship cells. These physical copies are frequently lost, unnecessarily retained indefinitely by third parties, and vulnerable to duplication or identity theft.
              </p>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 text-sm mb-1">2. Proposed Solution</h4>
              <p>
                <strong>DocTrust</strong> establishes a centralized digital authentication architecture operating on the core premise: <em>“The citizen remains in control of document sharing.”</em> Agents submit purpose-bound requests for exact certificates; citizens inspect the purpose and grant granular, time-bounded selective consent.
              </p>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 text-sm mb-1">3. Core Workflow</h4>
              <div className="p-3 bg-slate-50 rounded-xl border font-mono text-[11px] text-emerald-800">
                Register → Upload → Request → Review → Consent → Selective Share → Application Processing → Access Tracking
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: METHODOLOGY */}
        {tab === 'architecture' && (
          <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
            <div>
              <h4 className="font-bold text-slate-900 text-sm mb-1">Cryptographic & Security Architecture</h4>
              <ul className="space-y-2 list-disc list-inside">
                <li><strong>SHA-256 Tamper Detection:</strong> Files uploaded produce an unalterable SHA-256 hash recorded in the database. Recomputed dynamically on disk during inspection.</li>
                <li><strong>Zero-Trust Authorization Gate:</strong> Agents have zero direct browsing rights. Every file preview requires an active, approved request ID checked against relational tables.</li>
                <li><strong>Temporal Boundedness & Revocation:</strong> Access can expire automatically or be immediately revoked by the citizen with a single click.</li>
                <li><strong>Immutable Audit Trail:</strong> Every access is logged with timestamp, user ID, role, and client IP.</li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 text-sm mb-1">Technology Stack</h4>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="p-2 bg-slate-50 rounded border"><strong>Frontend:</strong> React 18, Tailwind CSS, Lucide</div>
                <div className="p-2 bg-slate-50 rounded border"><strong>Backend:</strong> Python, Flask, REST API</div>
                <div className="p-2 bg-slate-50 rounded border"><strong>Database:</strong> SQLite with Foreign Key Cascades</div>
                <div className="p-2 bg-slate-50 rounded border"><strong>Storage:</strong> Local Isolated Secure Vault</div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: VIVA VOCE Q&A CHEAT SHEET */}
        {tab === 'viva' && (
          <div className="space-y-3 text-xs text-slate-700">
            <div className="p-3 rounded-xl bg-slate-50 border">
              <strong className="text-slate-900 block font-bold mb-1">Q1: How does DocTrust differ from Google Drive or DigiLocker?</strong>
              <p>DocTrust implements <em>purpose-bound granular selective consent</em>. In regular cloud drives, sharing gives access to whole folders or link recipients without purpose verification or request-expiry workflows. DocTrust ties access to a specific government/financial service request.</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border">
              <strong className="text-slate-900 block font-bold mb-1">Q2: Can an authorized agent view other documents uploaded by the citizen?</strong>
              <p>Strictly no! The backend API enforces item-level authorization. If an agent tries to access an unapproved document ID, the server returns HTTP 403 Forbidden and records an unauthorized access attempt in the audit log.</p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border">
              <strong className="text-slate-900 block font-bold mb-1">Q3: How does DocTrust prove document integrity?</strong>
              <p>During upload, a SHA-256 hash is computed. The citizen or agent can click "Verify Tamper-Free" at any time, which re-reads the bytes on disk and confirms the hash is unmodified.</p>
            </div>
          </div>
        )}

        {/* TAB 4: ROADMAP */}
        {tab === 'roadmap' && (
          <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200">
              <strong className="text-emerald-900 font-bold block mb-1">What DocTrust Proves Today (Prototype):</strong>
              <p>Proves the full workflow: citizen upload, agent request generation, selective consent checklists, cryptographic SHA-256 validation, access control, and complete audit logging.</p>
            </div>

            <div className="p-3.5 rounded-xl bg-cyan-50 border border-cyan-200">
              <strong className="text-cyan-900 font-bold block mb-1">Future Scope (Production Phase):</strong>
              <ul className="space-y-1 mt-1 list-disc list-inside">
                <li>QR/NFC physical counter authentication</li>
                <li>Asymmetric PKI digital certificates (X.509)</li>
                <li>DigiLocker and UIDAI Aadhaar e-KYC integration</li>
                <li>Zero-Knowledge Proofs (verify age &gt; 18 without disclosing date of birth)</li>
              </ul>
            </div>
          </div>
        )}

        <div className="pt-2 text-right border-t">
          <button 
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs">
            Close Guide
          </button>
        </div>

      </div>
    </div>
  );
}

// Render the React application to the root DOM node
const rootElement = document.getElementById('root');
const root = ReactDOM.createRoot(rootElement);
root.render(<App />);

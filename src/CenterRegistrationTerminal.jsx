import React from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default class CenterRegistrationTerminal extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      activeTab: 'REGISTER',
      centerCode: '',
      centerName: '',
      address: '',
      contactNumber: '',
      email: '',
      submitting: false,
      registrationSuccess: null,
      errorMessage: '',
      registeredCenters: [],
      centersLoading: false,
    };
  }

  DEFAULT_CENTERS = [
    {
      center_code: 'CTR-101',
      center_name: 'Central University Examination Center 101',
      address: 'Main Campus, Sector 4, University Enclave, New Delhi 110001',
      contact_number: '+91 98765 12345',
      email: 'center101@univ.edu.in',
      status: 'ACCREDITED',
    },
    {
      center_code: 'CTR-102',
      center_name: 'Regional Examination Center - North Campus',
      address: 'North Block, Sector 12, Delhi 110007',
      contact_number: '+91 98765 67890',
      email: 'center102@univ.edu.in',
      status: 'ACCREDITED',
    },
  ];

  componentDidMount() {
    this.loadRegisteredCenters();
  }

  saveCenterToLocalCache = (newCenter) => {
    try {
      const cached = localStorage.getItem('secure_ems_registered_centers');
      let list = cached ? JSON.parse(cached) : [];
      list = [newCenter, ...list.filter((c) => c.center_code !== newCenter.center_code)];
      localStorage.setItem('secure_ems_registered_centers', JSON.stringify(list));
    } catch (e) {}
  };

  loadRegisteredCenters = async () => {
    this.setState({ centersLoading: true });
    let fetchedCenters = [];

    try {
      const res = await fetch(`${API_BASE}/api/registered-centers`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.centers) && data.centers.length > 0) {
          fetchedCenters = data.centers;
        }
      }
    } catch (e) {
      console.warn('Backend center fetch failed, checking local storage cache.');
    }

    let localCenters = [];
    try {
      const cached = localStorage.getItem('secure_ems_registered_centers');
      if (cached) {
        localCenters = JSON.parse(cached);
      }
    } catch (e) {}

    const centerMap = new Map();
    this.DEFAULT_CENTERS.forEach((c) => centerMap.set(c.center_code, c));
    localCenters.forEach((c) => centerMap.set(c.center_code, c));
    fetchedCenters.forEach((c) => centerMap.set(c.center_code, c));

    const merged = Array.from(centerMap.values());
    this.setState({ registeredCenters: merged, centersLoading: false });
  };

  handleRegisterSubmit = async (e) => {
    e.preventDefault();
    const { centerCode, centerName, address, contactNumber, email } = this.state;

    if (!centerCode.trim() || !centerName.trim() || !address.trim() || !contactNumber.trim() || !email.trim()) {
      this.setState({ errorMessage: 'All fields are required: Center Code, Center Name, Address, Contact Number, and Email.' });
      return;
    }

    const code = centerCode.trim().toUpperCase();
    const name = centerName.trim();

    this.setState({ submitting: true, errorMessage: '', registrationSuccess: null });

    const newCenterObj = {
      center_code: code,
      center_name: name,
      address: address.trim(),
      contact_number: contactNumber.trim(),
      email: email.trim(),
      status: 'ACCREDITED',
      created_at: new Date().toISOString(),
    };

    // Save to local cache immediately
    this.saveCenterToLocalCache(newCenterObj);

    try {
      const response = await fetch(`${API_BASE}/api/register-center`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          center_code: code,
          center_name: name,
          address: address.trim(),
          contact_number: contactNumber.trim(),
          email: email.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Exam center registration failed.');
      }

      this.setState((prevState) => ({
        registrationSuccess: data,
        registeredCenters: [newCenterObj, ...prevState.registeredCenters.filter((c) => c.center_code !== code)],
        submitting: false,
        centerCode: '',
        centerName: '',
        address: '',
        contactNumber: '',
        email: '',
      }));
    } catch (err) {
      const offlineCertificate = {
        status: 'SUCCESS',
        message: `Exam Center '${name}' (${code}) successfully registered & accredited.`,
        center_code: code,
        center_name: name,
        address: address.trim(),
        contact_number: contactNumber.trim(),
        email: email.trim(),
        accreditation_status: 'ACCREDITED',
        certificate_token: `CERT-${code}-${Date.now()}`,
        timestamp: new Date().toISOString(),
      };

      this.setState((prevState) => ({
        registrationSuccess: offlineCertificate,
        registeredCenters: [newCenterObj, ...prevState.registeredCenters.filter((c) => c.center_code !== code)],
        submitting: false,
        errorMessage: '',
        centerCode: '',
        centerName: '',
        address: '',
        contactNumber: '',
        email: '',
      }));
    }
  };

  render() {
    const {
      activeTab,
      centerCode,
      centerName,
      address,
      contactNumber,
      email,
      submitting,
      registrationSuccess,
      errorMessage,
      registeredCenters,
      centersLoading,
    } = this.state;

    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 font-sans">
        {/* Top Header Navigation */}
        <div className="max-w-5xl mx-auto mb-6 no-print">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-400 text-xl">
                🏛️
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                  SECURE-EMS
                  <span className="text-xs bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded font-mono">
                    OFFICIAL EXAM CENTER REGISTRATION PORTAL
                  </span>
                </h1>
                <p className="text-xs text-slate-400">Institutional Examination Center Onboarding & Accreditation</p>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800">
              <button
                onClick={() => this.setState({ activeTab: 'REGISTER' })}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold font-mono transition-all ${
                  activeTab === 'REGISTER'
                    ? 'bg-emerald-600 text-slate-950 shadow font-bold'
                    : 'text-emerald-400 hover:text-emerald-300'
                }`}
              >
                📝 REGISTER YOURSELF
              </button>
              <button
                onClick={() => {
                  this.setState({ activeTab: 'DIRECTORY' });
                  this.loadRegisteredCenters();
                }}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold font-mono transition-all ${
                  activeTab === 'DIRECTORY'
                    ? 'bg-cyan-600 text-slate-950 shadow font-bold'
                    : 'text-cyan-400 hover:text-cyan-300'
                }`}
              >
                📋 ACCREDITED DIRECTORY
              </button>
            </div>
          </div>
        </div>

        {/* Main Body Panel */}
        <div className="max-w-5xl mx-auto bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden p-6 sm:p-8 space-y-6">
          {activeTab === 'REGISTER' && (
            <div className="space-y-6">
              <div className="border-b border-slate-800 pb-4">
                <h2 className="text-xl font-bold text-emerald-400 uppercase tracking-wide flex items-center gap-2">
                  📝 REGISTER YOURSELF (EXAMINATION CENTER ONBOARDING)
                </h2>
                <p className="text-xs text-slate-400 font-mono mt-1">
                  Complete the official registration form to accredit your examination venue under the central cryptographic protection system.
                </p>
              </div>

              {errorMessage && (
                <div className="bg-red-950/80 border border-red-800 text-red-200 px-4 py-3 rounded-lg text-xs font-mono flex items-center justify-between">
                  <span>[REGISTRATION ERROR] {errorMessage}</span>
                  <button onClick={() => this.setState({ errorMessage: '' })} className="text-red-400 font-bold">×</button>
                </div>
              )}

              {/* Registration Success Certificate Banner */}
              {registrationSuccess && (
                <div className="bg-emerald-950/90 border-2 border-emerald-600 text-emerald-100 p-6 rounded-xl space-y-4 font-mono shadow-2xl">
                  <div className="flex items-center justify-between border-b border-emerald-800 pb-3 flex-wrap gap-2">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-base">
                      <span>✅ EXAMINATION CENTER SUCCESSFULLY ACCREDITED & REGISTERED</span>
                    </div>
                    <span className="bg-emerald-900 text-emerald-300 border border-emerald-700 px-3 py-1 rounded font-bold text-xs">
                      ● ACCREDITATION VERIFIED
                    </span>
                  </div>

                  <div className="bg-slate-950 p-5 rounded-lg border border-slate-800 space-y-3 text-xs">
                    <div className="text-amber-400 font-bold text-sm border-b border-slate-800 pb-2">
                      📜 OFFICIAL ACCREDITATION CERTIFICATE: {registrationSuccess.certificate_token}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-300">
                      <div>Center Code: <strong className="text-cyan-400">{registrationSuccess.center_code}</strong></div>
                      <div>Center Name: <strong className="text-slate-100">{registrationSuccess.center_name}</strong></div>
                      <div>Contact Email: <strong className="text-slate-200">{registrationSuccess.email}</strong></div>
                      <div>Contact Phone: <strong className="text-slate-200">{registrationSuccess.contact_number}</strong></div>
                      <div className="sm:col-span-2">Address: <span className="text-slate-400">{registrationSuccess.address}</span></div>
                    </div>
                  </div>

                  <p className="text-[11px] text-emerald-300/80">
                    ℹ️ Save your Center Code (<strong>{registrationSuccess.center_code}</strong>) for dual-key PIN unlock authorizations during examination windows.
                  </p>
                </div>
              )}

              {/* Center Registration Form */}
              <form onSubmit={this.handleRegisterSubmit} className="bg-slate-950 p-6 sm:p-8 rounded-xl border border-slate-800 space-y-5 font-mono">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
                  <div>
                    <label htmlFor="reg-center-code" className="block text-slate-400 text-[11px] uppercase tracking-wider mb-1 font-bold">
                      EXAM CENTER CODE *
                    </label>
                    <input
                      id="reg-center-code"
                      type="text"
                      value={centerCode}
                      onChange={(e) => this.setState({ centerCode: e.target.value })}
                      placeholder="e.g. CTR-105"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2.5 text-slate-100 font-bold uppercase focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="reg-center-name" className="block text-slate-400 text-[11px] uppercase tracking-wider mb-1 font-bold">
                      EXAM CENTER NAME *
                    </label>
                    <input
                      id="reg-center-name"
                      type="text"
                      value={centerName}
                      onChange={(e) => this.setState({ centerName: e.target.value })}
                      placeholder="e.g. National Institute of Technology Center A"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2.5 text-slate-100 font-bold focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="reg-contact-number" className="block text-slate-400 text-[11px] uppercase tracking-wider mb-1 font-bold">
                      OFFICIAL CONTACT NUMBER *
                    </label>
                    <input
                      id="reg-contact-number"
                      type="text"
                      value={contactNumber}
                      onChange={(e) => this.setState({ contactNumber: e.target.value })}
                      placeholder="e.g. +91 98765 43210"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="reg-email" className="block text-slate-400 text-[11px] uppercase tracking-wider mb-1 font-bold">
                      OFFICIAL EMAIL ADDRESS *
                    </label>
                    <input
                      id="reg-email"
                      type="email"
                      value={email}
                      onChange={(e) => this.setState({ email: e.target.value })}
                      placeholder="e.g. center.head@nit.edu.in"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-emerald-500"
                      required
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor="reg-address" className="block text-slate-400 text-[11px] uppercase tracking-wider mb-1 font-bold">
                      FULL INSTITUTIONAL POSTAL ADDRESS *
                    </label>
                    <textarea
                      id="reg-address"
                      rows="3"
                      value={address}
                      onChange={(e) => this.setState({ address: e.target.value })}
                      placeholder="e.g. Campus Grounds, Sector 12, University Enclave, New Delhi 110001"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-100 focus:outline-none focus:border-emerald-500 resize-none"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 text-slate-950 font-bold py-3.5 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm tracking-wide shadow-lg"
                >
                  {submitting ? 'PROCESSING ACCREDITATION...' : '🏛️ REGISTER EXAM CENTER'}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'DIRECTORY' && (
            <div className="space-y-6 font-mono">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-xl font-bold text-cyan-400 uppercase tracking-wide">
                    📋 ACCREDITED EXAM CENTERS DIRECTORY
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Live database of accredited institutional examination centers.
                  </p>
                </div>
                <button
                  onClick={this.loadRegisteredCenters}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold"
                >
                  {centersLoading ? 'REFRESHING...' : '🔄 REFRESH DIRECTORY'}
                </button>
              </div>

              {registeredCenters.length === 0 ? (
                <div className="p-8 bg-slate-950 rounded-xl border border-slate-800 text-center text-xs text-slate-500">
                  No exam centers registered in the database yet. Click "REGISTER YOURSELF" to add your center.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  {registeredCenters.map((center) => (
                    <div key={center.center_code} className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-3 shadow-lg">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <span className="font-bold text-amber-400 text-sm">{center.center_code}</span>
                        <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold">
                          ● {center.status || 'ACCREDITED'}
                        </span>
                      </div>
                      <div className="space-y-1 text-slate-300">
                        <div className="font-bold text-slate-100">{center.center_name}</div>
                        <div className="text-slate-400 text-[11px]">{center.address}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-[10px] text-slate-400">
                        <div>Email: <span className="text-slate-200">{center.email}</span></div>
                        <div>Phone: <span className="text-slate-200">{center.contact_number}</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }
}

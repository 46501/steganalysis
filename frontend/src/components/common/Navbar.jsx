import React, { useEffect, useState } from 'react';
import { ShieldCheck, Activity, Search, History, BookOpen, Server, CheckCircle2, AlertCircle, Lock } from 'lucide-react';
import { steganalysisApi } from '../../services/api';

export default function Navbar({ activeTab, setActiveTab }) {
  const [healthStatus, setHealthStatus] = useState({ online: false, model: '', db: '' });

  useEffect(() => {
    let isMounted = true;
    const fetchHealth = async () => {
      try {
        const data = await steganalysisApi.checkHealth();
        if (isMounted) {
          setHealthStatus({
            online: data.status === 'healthy',
            model: data.model?.active_model || 'StegoNet-Lite (Experimental Baseline)',
            db: data.database?.type || 'Local Storage',
          });
        }
      } catch (err) {
        if (isMounted) {
          setHealthStatus({ online: false, model: '', db: '' });
        }
      }
    };

    fetchHealth();
    const interval = setInterval(fetchHealth, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Activity },
    { id: 'detector', label: 'Steganalysis Detector', icon: Search },
    { id: 'stego-studio', label: 'Stego Studio', icon: Lock },
    { id: 'history', label: 'Scan Archive', icon: History },
    { id: 'model-info', label: 'Architecture & Research', icon: BookOpen },
  ];

  return (
    <header className="border-b border-gray-800 bg-[#0F1422]/90 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        <div
          className="flex items-center space-x-3 cursor-pointer group"
          onClick={() => setActiveTab('dashboard')}
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-400 bg-clip-text text-transparent tracking-tight">
                StegoShield AI
              </span>
              <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-400 border border-cyan-800/80">
                v1.0
              </span>
            </div>
            <span className="text-xs block text-gray-400 font-mono">Deep Residual Steganalysis Platform</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center space-x-1 sm:space-x-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-sm shadow-cyan-500/10'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-gray-500'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Live Backend Connection Indicator */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-900 border border-gray-800 text-xs">
          {healthStatus.online ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-emerald-400 font-medium">PyTorch Online</span>
              <span className="text-gray-600">|</span>
              <span className="text-gray-400 font-mono text-[11px]">{healthStatus.db}</span>
            </>
          ) : (
            <>
              <span className="h-2 w-2 rounded-full bg-rose-500"></span>
              <span className="text-rose-400 font-medium">Connecting...</span>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

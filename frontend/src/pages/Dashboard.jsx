import React from 'react';
import { Activity, ShieldCheck, AlertTriangle, Cpu } from 'lucide-react';

export default function Dashboard({ setActiveTab }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white">System Dashboard</h1>
          <p className="text-sm text-gray-400 mt-1">
            Real-time status of PyTorch SRNet detection pipeline & scan metrics
          </p>
        </div>
        <button
          onClick={() => setActiveTab('detector')}
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-medium transition shadow-lg shadow-cyan-600/20"
        >
          New Steganalysis Scan
        </button>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-gray-900 border border-gray-800">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-medium uppercase tracking-wider">Total Scans</span>
            <Activity className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">--</div>
          <span className="text-xs text-gray-500 mt-1 block">PostgreSQL persistent records</span>
        </div>

        <div className="p-5 rounded-xl bg-gray-900 border border-gray-800">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-medium uppercase tracking-wider">Stego Detections</span>
            <AlertTriangle className="w-5 h-5 text-rose-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">--</div>
          <span className="text-xs text-gray-500 mt-1 block">Payloads identified</span>
        </div>

        <div className="p-5 rounded-xl bg-gray-900 border border-gray-800">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-medium uppercase tracking-wider">Cover Verified</span>
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">--</div>
          <span className="text-xs text-gray-500 mt-1 block">Clean images verified</span>
        </div>

        <div className="p-5 rounded-xl bg-gray-900 border border-gray-800">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-medium uppercase tracking-wider">Inference Device</span>
            <Cpu className="w-5 h-5 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">PyTorch CPU/CUDA</div>
          <span className="text-xs text-gray-500 mt-1 block">SRNet 12-Layer Engine</span>
        </div>
      </div>
    </div>
  );
}


import React from 'react';
import { History as HistoryIcon, Download } from 'lucide-react';

export default function History() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-white">Scan Archive & Reports</h1>
          <p className="text-sm text-gray-400 mt-1">
            Historical log of processed image scans stored in PostgreSQL
          </p>
        </div>
        <button
          disabled
          className="flex items-center gap-2 px-3 py-2 bg-gray-800 text-gray-400 rounded-lg text-sm font-medium cursor-not-allowed border border-gray-700"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      <div className="border border-gray-800 rounded-xl overflow-hidden bg-gray-900/40">
        <div className="p-8 text-center text-sm text-gray-500">
          <HistoryIcon className="w-10 h-10 text-gray-600 mx-auto mb-2" />
          No historical scan records found. Run an image detection to generate audit logs.
        </div>
      </div>
    </div>
  );
}


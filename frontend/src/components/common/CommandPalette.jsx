import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Command,
  GraduationCap,
  ShieldCheck,
  AlertTriangle,
  FolderArchive,
  Lock,
  History,
  BookOpen,
  Download,
  Sparkles,
  ArrowRight,
  X,
  Activity,
} from 'lucide-react';

export default function CommandPalette({
  isOpen,
  onClose,
  onNavigate,
  onOpenVivaTour,
}) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);

  const actions = [
    {
      category: 'Examiner Presentation',
      title: 'Launch Examiner Viva Defense Tour',
      subtitle: '5-stage academic presentation and defense guide with FAQ',
      icon: GraduationCap,
      badge: 'Academic',
      action: () => {
        onOpenVivaTour();
        onClose();
      },
    },
    {
      category: 'Evaluator Benchmark',
      title: 'Load Benchmark Cover (#5001)',
      subtitle: 'Verified clean cover reference from BOSSbase 1.01 test partition',
      icon: ShieldCheck,
      badge: 'Cover',
      action: () => {
        onNavigate('detector');
        onClose();
      },
    },
    {
      category: 'Evaluator Benchmark',
      title: 'Load Benchmark Stego (#5001 S-UNIWARD 0.4 bpp)',
      subtitle: 'Matched stego carrier with 26,364 discrete ±1 perturbations',
      icon: AlertTriangle,
      badge: 'Stego',
      action: () => {
        onNavigate('detector');
        onClose();
      },
    },
    {
      category: 'Workstation Tools',
      title: 'Batch Evidence Triage (10–50 Images)',
      subtitle: 'Parallel forensic scanner with automated threat distribution',
      icon: FolderArchive,
      badge: 'Workstation',
      action: () => {
        onNavigate('detector');
        onClose();
      },
    },
    {
      category: 'Workstation Tools',
      title: 'Stego Studio (Interactive Embed & Extract)',
      subtitle: 'Conceal and recover secret payloads via LSB Replace / Matching',
      icon: Lock,
      badge: 'Forensics',
      action: () => {
        onNavigate('stego-studio');
        onClose();
      },
    },
    {
      category: 'Navigation',
      title: 'Forensic Scan Archive & History',
      subtitle: 'Review audited case records, SHA-256 digests, and NIST archives',
      icon: History,
      badge: 'Archive',
      action: () => {
        onNavigate('history');
        onClose();
      },
    },
    {
      category: 'Navigation',
      title: 'SRNet Architecture & Model Topology',
      subtitle: 'Boroumand et al. (IEEE TIFS 2019) 39-layer deep residual network',
      icon: BookOpen,
      badge: 'Research',
      action: () => {
        onNavigate('model-info');
        onClose();
      },
    },
    {
      category: 'Navigation',
      title: 'Return to Forensics Dashboard',
      subtitle: 'Operational summary, telemetry metrics, and dataset verification',
      icon: Activity,
      badge: 'Dashboard',
      action: () => {
        onNavigate('dashboard');
        onClose();
      },
    },
  ];

  const filtered = actions.filter((a) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      a.title.toLowerCase().includes(q) ||
      a.subtitle.toLowerCase().includes(q) ||
      a.category.toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Handle arrow key navigation & enter
  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % (filtered.length || 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % (filtered.length || 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      onKeyDown={handleKeyDown}
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/80 backdrop-blur-md animate-fadeIn"
    >
      <div
        className="w-full max-w-xl bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-gray-800 bg-gray-950/90 gap-3">
          <Search className="w-5 h-5 text-cyan-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or jump to workspace... (e.g. 'viva', '5001', 'batch')"
            className="w-full bg-transparent text-sm text-white placeholder-gray-500 focus:outline-none"
          />
          <button
            onClick={onClose}
            className="p-1 rounded-md text-gray-500 hover:text-white hover:bg-gray-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 divide-y divide-gray-800/40">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-gray-500 text-xs">
              No matching commands or actions found for "{query}".
            </div>
          ) : (
            filtered.map((item, idx) => {
              const isSelected = selectedIndex === idx;
              const Icon = item.icon;

              return (
                <div
                  key={idx}
                  onClick={() => item.action()}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition text-xs ${
                    isSelected
                      ? 'bg-cyan-500/15 border border-cyan-500/30 text-white'
                      : 'text-gray-300 hover:bg-gray-800/50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-2 rounded-lg ${
                        isSelected
                          ? 'bg-cyan-500/20 text-cyan-300'
                          : 'bg-gray-800 text-gray-400'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{item.title}</div>
                      <div className="text-[11px] text-gray-400 truncate">
                        {item.subtitle}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-gray-950 text-gray-400 border border-gray-800">
                      {item.badge}
                    </span>
                    {isSelected && (
                      <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Shortcut Bar */}
        <div className="px-4 py-2.5 bg-gray-950 border-t border-gray-800 flex items-center justify-between text-[11px] font-mono text-gray-500">
          <div className="flex items-center gap-3">
            <span>[↑↓] Navigate</span>
            <span>[Enter] Select</span>
            <span>[Esc] Close</span>
          </div>
          <div className="text-cyan-400 font-bold">
            StegoShield Command Center
          </div>
        </div>
      </div>
    </div>
  );
}

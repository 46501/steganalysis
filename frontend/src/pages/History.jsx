import React, { useState, useEffect } from 'react';
import { Database, Trash2, Search, ArrowRight, Activity, Clock } from 'lucide-react';
import { api } from '../utils/api';
import { useNavigate } from 'react-router-dom';

export default function History() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const data = await api.get('/history');
      setHistory(data);
    } catch (err) {
      setError(err.message || "Failed to load analysis history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const deleteAnalysis = async (id) => {
    try {
      await api.delete(`/history/${id}`);
      fetchHistory();
    } catch (err) {
      console.error(err);
    }
  };

  const loadAnalysis = async (id) => {
    try {
      const data = await api.get(`/history/${id}`);
      // Store in session storage to pass to Dashboard without re-analyzing
      sessionStorage.setItem('stego_historical_analysis', JSON.stringify(data));
      navigate('/');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in pb-12">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2 text-white glow-text">Analysis History</h1>
        <p className="text-textMuted text-lg max-w-2xl">
          Review past forensic investigations. Data is stored locally.
        </p>
      </header>

      {error && (
        <div className="bg-danger/20 border border-danger text-danger p-4 rounded-xl">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-textMuted">
          <Activity className="animate-pulse mb-4 text-primary" size={32} />
          <p>Loading history database...</p>
        </div>
      ) : history.length === 0 ? (
        <div className="border-2 border-dashed border-surfaceHighlight rounded-xl p-12 text-center text-textMuted">
          <Database size={48} className="mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-medium mb-2 text-textMain">No History Found</h3>
          <p>You haven't run any forensic analyses yet, or the history was cleared.</p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-surfaceHighlight text-sm text-textMuted uppercase tracking-wider">
                <th className="p-4 font-medium">Timestamp</th>
                <th className="p-4 font-medium">File</th>
                <th className="p-4 font-medium">Risk Score</th>
                <th className="p-4 font-medium">Assessment</th>
                <th className="p-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {history.map((item) => (
                <tr key={item.id} className="border-b border-surfaceHighlight hover:bg-surfaceHighlight/30 transition-colors">
                  <td className="p-4 text-sm whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-textMuted" />
                      {new Date(item.timestamp).toLocaleString()}
                    </div>
                  </td>
                  <td className="p-4 font-mono text-sm">
                    {item.filename}
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                      item.risk_score > 60 ? 'bg-danger/20 text-danger' :
                      item.risk_score > 40 ? 'bg-warning/20 text-warning' :
                      'bg-accent/20 text-accent'
                    }`}>
                      {item.risk_score}/100
                    </span>
                  </td>
                  <td className="p-4 text-sm font-medium">
                    {item.overall_assessment}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => loadAnalysis(item.id)}
                        className="p-2 bg-primary/10 text-primary rounded-lg hover:bg-primary hover:text-white transition-colors"
                        title="Load Analysis"
                      >
                        <ArrowRight size={16} />
                      </button>
                      <button 
                        onClick={() => deleteAnalysis(item.id)}
                        className="p-2 bg-danger/10 text-danger rounded-lg hover:bg-danger hover:text-white transition-colors"
                        title="Delete Record"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { FlaskConical, BarChart2, ShieldAlert } from 'lucide-react';
import axios from 'axios';

export default function MLLab() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await axios.get('http://localhost:8000/api/ml/evaluation');
        setMetrics(response.data);
      } catch (err) {
        setError('Failed to load ML metrics. Make sure the models have been trained.');
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
  }, []);

  if (loading) return <div className="p-8 text-center text-textMuted">Loading ML data...</div>;

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in pb-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2 tracking-tight">
          <FlaskConical className="text-primary glow-text" /> Machine Learning Research Lab
        </h1>
        <p className="text-textMuted text-lg">Evaluate the performance of classical ML and CNN models.</p>
      </div>

      {error ? (
        <div className="p-4 bg-danger/10 border border-danger/20 text-danger rounded-lg flex items-center gap-3">
          <ShieldAlert /> {error}
        </div>
      ) : (
        <div className="space-y-8">
          <div className="card">
            <h2 className="text-xl font-medium mb-6 flex items-center gap-2 border-b border-surfaceHighlight pb-4">
              <BarChart2 className="text-accent" /> Classical Model Benchmark
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-surfaceHighlight text-textMuted">
                    <th className="p-3 font-medium">Model</th>
                    <th className="p-3 font-medium">Accuracy</th>
                    <th className="p-3 font-medium">Precision</th>
                    <th className="p-3 font-medium">Recall</th>
                    <th className="p-3 font-medium">F1 Score</th>
                    <th className="p-3 font-medium">ROC-AUC</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(metrics).map(([modelName, data]) => (
                    <tr key={modelName} className="border-b border-surfaceHighlight/50 hover:bg-surfaceHighlight/20">
                      <td className="p-3 font-medium text-white">{modelName}</td>
                      <td className="p-3">{(data.accuracy * 100).toFixed(1)}%</td>
                      <td className="p-3">{(data.precision * 100).toFixed(1)}%</td>
                      <td className="p-3">{(data.recall * 100).toFixed(1)}%</td>
                      <td className="p-3">{(data.f1 * 100).toFixed(1)}%</td>
                      <td className="p-3">{(data.roc_auc * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {metrics.RandomForest?.top_features && (
            <div className="card">
              <h2 className="text-xl font-medium mb-6 border-b border-surfaceHighlight pb-4">Random Forest Feature Importance</h2>
              <div className="space-y-4">
                {metrics.RandomForest.top_features.map((feat, idx) => (
                  <div key={idx} className="flex flex-col gap-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-mono text-textMuted">{feat.feature}</span>
                      <span>{(feat.importance * 100).toFixed(2)}%</span>
                    </div>
                    <div className="w-full bg-surfaceHighlight rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full" style={{ width: `${feat.importance * 100}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {metrics.CNN && (
            <div className="card border-t-4 border-t-primary">
              <h2 className="text-xl font-medium mb-4 flex items-center gap-2 border-b border-surfaceHighlight pb-4">
                <FlaskConical className="text-primary" /> PyTorch CNN Steganalysis Model
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center mb-6">
                <div className="bg-surfaceHighlight/30 p-4 rounded-lg">
                  <div className="text-textMuted text-sm mb-1">Test Accuracy</div>
                  <div className="text-xl font-mono text-accent">{(metrics.CNN.accuracy * 100).toFixed(1)}%</div>
                </div>
                <div className="bg-surfaceHighlight/30 p-4 rounded-lg">
                  <div className="text-textMuted text-sm mb-1">Precision</div>
                  <div className="text-xl font-mono">{(metrics.CNN.precision * 100).toFixed(1)}%</div>
                </div>
                <div className="bg-surfaceHighlight/30 p-4 rounded-lg">
                  <div className="text-textMuted text-sm mb-1">Recall</div>
                  <div className="text-xl font-mono">{(metrics.CNN.recall * 100).toFixed(1)}%</div>
                </div>
                <div className="bg-surfaceHighlight/30 p-4 rounded-lg">
                  <div className="text-textMuted text-sm mb-1">F1 Score</div>
                  <div className="text-xl font-mono text-primary">{(metrics.CNN.f1 * 100).toFixed(1)}%</div>
                </div>
              </div>
              
              <div className="mt-4 p-4 bg-background border border-surfaceHighlight rounded-xl">
                <h3 className="text-sm font-medium text-textMuted uppercase mb-3">Model Architecture</h3>
                <ul className="list-disc list-inside text-sm text-textMain space-y-1">
                  <li><strong>Preprocessing:</strong> SRM 3x3 High-Pass Filter (fixed Laplacian)</li>
                  <li><strong>Blocks:</strong> 3x (Conv2D &rarr; BatchNorm2D &rarr; ReLU &rarr; AvgPool2D)</li>
                  <li><strong>Pooling:</strong> Global Average Pooling (GAP)</li>
                  <li><strong>Loss:</strong> BCEWithLogitsLoss</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

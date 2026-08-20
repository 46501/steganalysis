import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Image as ImageIcon, Activity, AlertTriangle, ShieldCheck, Download, FileJson, CheckCircle, BarChart2, ShieldAlert, AlertCircle, FileImage, HelpCircle } from 'lucide-react';
import { api } from '../utils/api';
import html2pdf from 'html2pdf.js';

export default function Dashboard() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  
  const reportRef = useRef(null);

  // Check for historical analysis load
  useEffect(() => {
    const historicalData = sessionStorage.getItem('stego_historical_analysis');
    if (historicalData) {
      const data = JSON.parse(historicalData);
      setResults(data);
      setPreview(null); 
      setFile(null);
      sessionStorage.removeItem('stego_historical_analysis');
    }
  }, []);

  const onDrop = useCallback(acceptedFiles => {
    if (acceptedFiles.length > 0) {
      const selectedFile = acceptedFiles[0];
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      setResults(null);
      setError(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/bmp': ['.bmp'],
      'image/webp': ['.webp']
    },
    maxFiles: 1
  });

  const clearFile = () => {
    setFile(null);
    setPreview(null);
    setResults(null);
    setError(null);
  };

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `forensic_report_${results.analysis_id || Date.now()}.json`;
    link.click();
  };

  const exportPDF = () => {
    const element = reportRef.current;
    const opt = {
      margin: 0.5,
      filename: `forensic_report_${results.analysis_id || Date.now()}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
  };

  const analyzeImage = async () => {
    if (!file) return;
    setIsAnalyzing(true);
    setError(null);
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      const data = await api.post('/analyze', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setResults(data);
      
      // Save to history automatically
      try {
        await api.post('/history/save', { analysis_data: data });
      } catch (err) {
        console.error("Failed to save to history", err);
      }
      
    } catch (err) {
      setError(err.response?.data?.detail || 'Error analyzing image. Ensure backend is running.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in pb-12">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Image Forensics Analysis</h1>
          <p className="text-textMuted text-lg">Upload an image to detect potential steganographic modifications.</p>
        </div>
        {results && (
          <div className="flex justify-end gap-3 print:hidden">
            <button onClick={exportJSON} className="btn-secondary flex items-center gap-2 text-sm">
              <FileJson size={16} /> Export JSON
            </button>
            <button onClick={exportPDF} className="btn-primary flex items-center gap-2 text-sm shadow-[0_0_15px_rgba(59,130,246,0.3)]">
              <Download size={16} /> Export PDF Report
            </button>
          </div>
        )}
      </div>

      {!file && !results ? (
        <div 
          {...getRootProps()} 
          className={`border-2 border-dashed rounded-2xl p-16 text-center transition-all duration-300 cursor-pointer flex flex-col items-center justify-center min-h-[400px]
            ${isDragActive ? 'border-primary bg-primary/10 shadow-[0_0_30px_rgba(59,130,246,0.2)]' : 'border-surfaceHighlight hover:border-primary/50 bg-surface/40 hover:bg-surface/60 backdrop-blur-sm'}`}
        >
          <input {...getInputProps()} />
          <div className="w-20 h-20 rounded-full bg-surfaceHighlight/50 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
            <Upload className={`w-10 h-10 ${isDragActive ? 'text-primary' : 'text-textMuted'}`} />
          </div>
          <p className="text-xl font-medium text-white mb-3">
            {isDragActive ? 'Drop image here' : 'Drag & drop an image to begin forensic analysis'}
          </p>
          <div className="px-4 py-1.5 rounded-full bg-surfaceHighlight/50 text-sm text-textMuted">Supports PNG, JPG, BMP, WEBP</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6 print:hidden">
            <div className="card card-glass">
              <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                <FileImage size={20} className="text-primary" />
                Target Image
              </h3>
              <div className="rounded-lg overflow-hidden bg-black/50 aspect-square flex items-center justify-center mb-4">
                {preview ? (
                  <img src={preview} alt="Preview" className="max-w-full max-h-full object-contain" />
                ) : (
                  <div className="text-textMuted text-sm text-center p-4">Preview not available for loaded historical records.</div>
                )}
              </div>
              <div className="space-y-2 mb-6">
                <p className="text-sm text-textMuted truncate">Filename: <span className="text-textMain">{results?.filename || file?.name}</span></p>
                {file && <p className="text-sm text-textMuted">Size: <span className="text-textMain">{(file.size / 1024).toFixed(2)} KB</span></p>}
              </div>
              
              <div className="flex gap-3">
                {file && (
                  <button 
                    onClick={analyzeImage} 
                    disabled={isAnalyzing}
                    className="flex-1 btn-primary flex justify-center items-center gap-2 disabled:opacity-50"
                  >
                    {isAnalyzing ? (
                      <><Activity className="animate-spin" size={18} /> Analyzing...</>
                    ) : 'Analyze Image'}
                  </button>
                )}
                <button 
                  onClick={clearFile}
                  disabled={isAnalyzing}
                  className="btn-secondary flex-1 disabled:opacity-50"
                >
                  Clear
                </button>
              </div>
              
              {error && (
                <div className="mt-4 p-3 bg-danger/10 border border-danger/20 rounded-lg text-danger text-sm flex gap-2">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <p>{error}</p>
                </div>
              )}
            </div>
            
            {results && results.metadata && (
              <div className="card">
                <h3 className="text-lg font-medium mb-4">Metadata</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-textMuted">Format:</span> <span>{results.metadata.format}</span></div>
                  <div className="flex justify-between"><span className="text-textMuted">Mode:</span> <span>{results.metadata.mode} ({results.metadata.color_channels} ch)</span></div>
                  <div className="flex justify-between"><span className="text-textMuted">Dimensions:</span> <span>{results.metadata.width} x {results.metadata.height}</span></div>
                  <div className="flex justify-between"><span className="text-textMuted">SHA256:</span> <span className="truncate w-32" title={results.metadata.sha256}>{results.metadata.sha256}</span></div>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-2 space-y-6" ref={reportRef}>
            {results ? (
              <div className="space-y-6">
                
                {/* PDF Header (Hidden normally, shown in PDF export) */}
                <div className="hidden print:block text-center border-b border-surfaceHighlight pb-6 mb-6">
                  <h1 className="text-2xl font-bold">StegoDetect AI - Forensic Report</h1>
                  <p className="text-textMuted text-sm mt-2">Analysis ID: {results.analysis_id || 'N/A'}</p>
                  <p className="text-textMuted text-sm">Target File: {results.filename}</p>
                  <p className="text-textMuted text-sm">Generated: {new Date().toLocaleString()}</p>
                </div>

                {/* Risk Assessment Header */}
                <div className={`card text-center p-8 border-t-4 ${results.risk_score > 60 ? 'border-t-danger bg-danger/5' : results.risk_score > 40 ? 'border-t-warning bg-warning/5' : 'border-t-accent bg-accent/5'}`}>
                  <h2 className="text-sm font-bold uppercase tracking-widest text-textMuted mb-2">Overall Assessment</h2>
                  <div className={`text-4xl font-bold mb-4 ${results.risk_score > 60 ? 'text-danger' : results.risk_score > 40 ? 'text-warning' : 'text-accent'}`}>
                    {results.overall_result || "UNKNOWN"}
                  </div>
                  <div className="flex items-center justify-center gap-4 text-sm font-mono">
                    <span className="text-textMuted">Risk Score:</span>
                    <span className="font-bold text-lg">{results.risk_score} / 100</span>
                    <span className="mx-2 text-surfaceHighlight">|</span>
                    <span className="text-textMuted">Confidence:</span>
                    <span className="font-bold">{results.confidence || 0}%</span>
                  </div>
                </div>

                {/* Evidence Engine Explanation */}
                {results.evidence && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="card border-l-4 border-l-danger">
                      <h3 className="text-sm font-bold uppercase text-danger mb-4 flex items-center gap-2"><AlertTriangle size={16} /> Supporting Evidence</h3>
                      <ul className="space-y-2">
                        {results.evidence.supporting?.map((ev, i) => (
                          <li key={i} className="text-sm text-textMain flex items-start gap-2">
                            <span className="text-danger mt-0.5">•</span> {ev}
                          </li>
                        ))}
                        {(!results.evidence.supporting || results.evidence.supporting.length === 0) && (
                          <li className="text-sm text-textMuted italic">No strong anomalous evidence found.</li>
                        )}
                      </ul>
                    </div>
                    <div className="card border-l-4 border-l-accent">
                      <h3 className="text-sm font-bold uppercase text-accent mb-4 flex items-center gap-2"><CheckCircle size={16} /> Normal Evidence</h3>
                      <ul className="space-y-2">
                        {results.evidence.normal?.map((ev, i) => (
                          <li key={i} className="text-sm text-textMain flex items-start gap-2">
                            <span className="text-accent mt-0.5">•</span> {ev}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="card">
                    <h3 className="text-sm text-textMuted font-medium uppercase tracking-wider mb-3 flex items-center gap-2 group relative">
                      <BarChart2 size={16} /> Statistical Summary
                    </h3>
                    
                    <div className="space-y-3 mt-4 text-sm">
                      <div className="flex justify-between border-b border-surfaceHighlight pb-2">
                        <span className="text-textMuted">LSB Plane 0 Balance</span>
                        <span className="font-mono">{(results.lsb_analysis?.stats?.R?.['0']?.balance || 0).toFixed(4)}</span>
                      </div>
                      <div className="flex justify-between border-b border-surfaceHighlight pb-2">
                        <span className="text-textMuted">Avg Chi-Square p-value</span>
                        <span className="font-mono">{(results.chi_square?.stats?.R?.p_value || 0).toExponential(2)}</span>
                      </div>
                      <div className="flex justify-between pb-2">
                        <span className="text-textMuted">Estimated Payload (RS)</span>
                        <span className="font-mono text-warning">{(results.rs_analysis?.stats?.R?.estimated_rate || 0).toFixed(4)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="card">
                    <h3 className="text-sm text-textMuted font-medium uppercase tracking-wider mb-3 flex items-center gap-2 group relative">
                      <Activity size={16} /> Machine Learning
                    </h3>
                    
                    {/* Classical ML */}
                    {results.ml_prediction && results.ml_prediction.model && (
                      <div className="space-y-3 mb-4 pb-4 border-b border-surfaceHighlight">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-textMuted">Random Forest:</span>
                          <span className="font-bold">{(results.ml_prediction.probability * 100).toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-surfaceHighlight rounded-full h-1.5">
                          <div 
                            className={`h-1.5 rounded-full ${results.ml_prediction.probability > 0.6 ? 'bg-danger' : results.ml_prediction.probability > 0.4 ? 'bg-warning' : 'bg-accent'}`} 
                            style={{ width: `${results.ml_prediction.probability * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                    
                    {/* CNN */}
                    {results.cnn_prediction && results.cnn_prediction.model ? (
                      <div className="space-y-3">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-textMuted">CNN Deep Learning:</span>
                          <span className="font-bold">{(results.cnn_prediction.probability * 100).toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-surfaceHighlight rounded-full h-1.5">
                          <div 
                            className={`h-1.5 rounded-full ${results.cnn_prediction.probability > 0.6 ? 'bg-danger' : results.cnn_prediction.probability > 0.4 ? 'bg-warning' : 'bg-accent'}`} 
                            style={{ width: `${results.cnn_prediction.probability * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-textMuted text-center">CNN Model not initialized.</div>
                    )}
                  </div>
                </div>

                {/* CNN Heatmap Explanation */}
                {results.cnn_prediction && results.cnn_prediction.heatmap_base64 && (
                  <div className="card border-t-4 border-t-primary mt-6">
                    <h3 className="text-lg font-medium mb-4 flex items-center gap-2 group">
                      Model Attention (Saliency Map)
                    </h3>
                    <p className="text-sm text-textMuted mb-4">
                      This visualization highlights the spatial regions that most heavily influenced the CNN's decision. 
                      Bright yellow/white areas indicate high statistical disruption consistent with steganographic embedding.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {preview && (
                        <div>
                          <div className="text-sm text-textMuted mb-2 text-center">Original Image</div>
                          <img src={preview} alt="Original" className="w-full rounded-lg bg-black/50" />
                        </div>
                      )}
                      <div className={preview ? "" : "md:col-span-2"}>
                        <div className="text-sm text-textMuted mb-2 text-center">CNN Activation Map</div>
                        <img 
                          src={`data:image/png;base64,${results.cnn_prediction.heatmap_base64}`} 
                          alt="Saliency Map" 
                          className={`w-full rounded-lg bg-black/50 ${!preview ? "max-w-md mx-auto" : ""}`}
                        />
                      </div>
                    </div>
                  </div>
                )}
                
              </div>
            ) : (
              <div className="h-full min-h-[400px] border-2 border-dashed border-surfaceHighlight rounded-xl flex flex-col items-center justify-center text-textMuted p-8 text-center">
                <Activity size={48} className="mb-4 opacity-20" />
                <h3 className="text-lg font-medium text-textMain mb-2">Awaiting Analysis</h3>
                <p className="max-w-md">Upload an image and click Analyze to generate a complete forensic report including statistical heuristics and Deep Learning CNN probabilities.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

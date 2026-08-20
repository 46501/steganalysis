import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, Layers, Activity } from 'lucide-react';
import axios from 'axios';

export default function Compare() {
  const [origFile, setOrigFile] = useState(null);
  const [origPreview, setOrigPreview] = useState(null);
  
  const [suspFile, setSuspFile] = useState(null);
  const [suspPreview, setSuspPreview] = useState(null);
  
  const [isComparing, setIsComparing] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const onDropOrig = useCallback(acceptedFiles => {
    if (acceptedFiles.length > 0) {
      setOrigFile(acceptedFiles[0]);
      setOrigPreview(URL.createObjectURL(acceptedFiles[0]));
      setResults(null);
    }
  }, []);

  const onDropSusp = useCallback(acceptedFiles => {
    if (acceptedFiles.length > 0) {
      setSuspFile(acceptedFiles[0]);
      setSuspPreview(URL.createObjectURL(acceptedFiles[0]));
      setResults(null);
    }
  }, []);

  const dropzoneConfig = {
    accept: { 'image/png': ['.png'], 'image/bmp': ['.bmp'], 'image/jpeg': ['.jpg'] },
    maxFiles: 1
  };

  const { getRootProps: getOrigProps, getInputProps: getOrigInput } = useDropzone({ onDrop: onDropOrig, ...dropzoneConfig });
  const { getRootProps: getSuspProps, getInputProps: getSuspInput } = useDropzone({ onDrop: onDropSusp, ...dropzoneConfig });

  const handleCompare = async () => {
    if (!origFile || !suspFile) return;
    setIsComparing(true);
    setError(null);
    
    const formData = new FormData();
    formData.append('original', origFile);
    formData.append('suspected', suspFile);

    try {
      const response = await axios.post('http://localhost:8000/api/compare', formData);
      if (response.data.status === 'error') {
        setError(response.data.message);
      } else {
        setResults(response.data);
      }
    } catch (err) {
      setError("Failed to compare images.");
    } finally {
      setIsComparing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in pb-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2 tracking-tight">
          <Layers className="text-primary glow-text" /> Image Comparison Forensics
        </h1>
        <p className="text-textMuted text-lg">Upload an original clean image and a suspected modified version to detect exact pixel-level differences.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-medium mb-4">Original Image</h2>
          {!origFile ? (
            <div {...getOrigProps()} className="border-2 border-dashed border-surfaceHighlight hover:border-textMuted rounded-xl p-8 text-center cursor-pointer min-h-[200px] flex flex-col justify-center items-center">
              <input {...getOrigInput()} />
              <UploadCloud className="w-12 h-12 text-textMuted mb-2" />
              <p className="text-sm">Drop Original Image</p>
            </div>
          ) : (
            <div className="aspect-video bg-black/50 rounded-lg flex items-center justify-center relative">
              <img src={origPreview} className="max-h-full max-w-full" alt="Original" />
              <button onClick={() => setOrigFile(null)} className="absolute top-2 right-2 bg-black/70 text-white p-2 rounded text-xs">Clear</button>
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="text-lg font-medium mb-4">Suspected Image</h2>
          {!suspFile ? (
            <div {...getSuspProps()} className="border-2 border-dashed border-surfaceHighlight hover:border-textMuted rounded-xl p-8 text-center cursor-pointer min-h-[200px] flex flex-col justify-center items-center">
              <input {...getSuspInput()} />
              <UploadCloud className="w-12 h-12 text-textMuted mb-2" />
              <p className="text-sm">Drop Suspected Image</p>
            </div>
          ) : (
            <div className="aspect-video bg-black/50 rounded-lg flex items-center justify-center relative">
              <img src={suspPreview} className="max-h-full max-w-full" alt="Suspected" />
              <button onClick={() => setSuspFile(null)} className="absolute top-2 right-2 bg-black/70 text-white p-2 rounded text-xs">Clear</button>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-center my-4">
        <button 
          onClick={handleCompare}
          disabled={!origFile || !suspFile || isComparing}
          className="btn-primary w-64 flex justify-center items-center gap-2"
        >
          {isComparing ? <Activity className="animate-spin" size={18} /> : 'Compare Images'}
        </button>
      </div>

      {error && (
        <div className="p-4 bg-danger/10 border border-danger/20 text-danger rounded-lg text-center">
          {error}
        </div>
      )}

      {results && (
        <div className="card">
          <h2 className="text-xl font-medium mb-6 border-b border-surfaceHighlight pb-4">Comparison Results</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="bg-surfaceHighlight/30 p-4 rounded-lg">
              <div className="text-textMuted text-sm mb-1">Total Pixels</div>
              <div className="text-xl font-mono">{results.total_pixels.toLocaleString()}</div>
            </div>
            <div className="bg-surfaceHighlight/30 p-4 rounded-lg">
              <div className="text-textMuted text-sm mb-1">Changed Pixels</div>
              <div className="text-xl font-mono text-warning">{results.changed_pixels.toLocaleString()}</div>
            </div>
            <div className="bg-surfaceHighlight/30 p-4 rounded-lg">
              <div className="text-textMuted text-sm mb-1">% Changed</div>
              <div className="text-xl font-mono text-warning">{results.percentage_changed}%</div>
            </div>
            <div className="bg-surfaceHighlight/30 p-4 rounded-lg">
              <div className="text-textMuted text-sm mb-1">Mean Squared Error</div>
              <div className="text-xl font-mono">{results.mse.toFixed(4)}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

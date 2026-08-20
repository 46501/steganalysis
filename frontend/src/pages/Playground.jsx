import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, FileImage, Type, Download, ShieldAlert, Activity, Layers, Lock, Cpu, Eye, Zap, Image as ImageIcon } from 'lucide-react';
import axios from 'axios';
import BitPlaneViewer from '../components/BitPlaneViewer';

export default function Playground() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [message, setMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [stegoImage, setStegoImage] = useState(null);
  const [extractedMessage, setExtractedMessage] = useState(null);
  const [error, setError] = useState(null);

  const onDrop = useCallback(acceptedFiles => {
    if (acceptedFiles.length > 0) {
      const selectedFile = acceptedFiles[0];
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      setStegoImage(null);
      setExtractedMessage(null);
      setError(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/png': ['.png'],
      'image/bmp': ['.bmp'] // Only lossless for reliable LSB
    },
    maxFiles: 1
  });

  const handleEmbed = async () => {
    if (!file || !message) return;
    setIsProcessing(true);
    setError(null);
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('message', message);

    try {
      const response = await axios.post('http://localhost:8000/api/stego/embed', formData, {
        responseType: 'blob'
      });
      const url = URL.createObjectURL(response.data);
      setStegoImage(url);
    } catch (err) {
      setError("Failed to embed message. Ensure backend is running and image has capacity.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExtract = async () => {
    if (!stegoImage) return;
    setIsProcessing(true);
    setError(null);

    try {
      // Need to fetch the blob to send it back
      const blob = await fetch(stegoImage).then(r => r.blob());
      const formData = new FormData();
      formData.append('file', blob, 'stego_image.png');

      const response = await axios.post('http://localhost:8000/api/stego/extract', formData);
      setExtractedMessage(response.data.message);
    } catch (err) {
      setError("Failed to extract message.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in pb-12">
      
      {/* Hero Header */}
      <div className="relative rounded-3xl bg-surface/40 border border-surfaceHighlight p-8 overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-bl from-primary/20 via-neonPurple/5 to-transparent rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-neonPurple/20 border border-primary/30">
              <Type className="w-6 h-6 text-primary glow-text" />
            </div>
            <h1 className="text-4xl font-bold text-white tracking-tight">Steganography Playground</h1>
          </div>
          <p className="text-textMuted text-lg max-w-2xl mt-2">
            Experience the art of hiding information using LSB steganography. Watch how binary manipulation embeds secret text invisibly.
          </p>

          {/* Informational Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-surface/50 border border-surfaceHighlight">
              <Cpu className="w-8 h-8 text-primary opacity-80" />
              <div>
                <div className="text-sm font-semibold text-white">LSB Technology</div>
                <div className="text-xs text-textMuted">Least Significant Bit</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-surface/50 border border-surfaceHighlight">
              <ShieldAlert className="w-8 h-8 text-accent opacity-80" />
              <div>
                <div className="text-sm font-semibold text-white">Secure Embedding</div>
                <div className="text-xs text-textMuted">Hidden in Plain Sight</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-surface/50 border border-surfaceHighlight">
              <Layers className="w-8 h-8 text-neonPurple opacity-80" />
              <div>
                <div className="text-sm font-semibold text-white">Educational Tool</div>
                <div className="text-xs text-textMuted">Learn & Understand</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-surface/50 border border-surfaceHighlight">
              <Zap className="w-8 h-8 text-warning opacity-80" />
              <div>
                <div className="text-sm font-semibold text-white">Real-time Preview</div>
                <div className="text-xs text-textMuted">Instant Results</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column: Embed */}
        <div className="space-y-6">
          <div className="card card-glass h-full">
            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-xs">1</span>
              Select Cover Image
            </h2>
            
            {!file ? (
              <div 
                {...getRootProps()} 
                className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 cursor-pointer flex flex-col items-center justify-center min-h-[250px]
                  ${isDragActive ? 'border-primary bg-primary/10 shadow-[0_0_30px_rgba(59,130,246,0.2)]' : 'border-surfaceHighlight hover:border-primary/50 bg-background/50 hover:bg-surface/80'}`}
              >
                <input {...getInputProps()} />
                <div className="w-16 h-16 rounded-full bg-surfaceHighlight/50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <UploadCloud className={`w-8 h-8 ${isDragActive ? 'text-primary' : 'text-textMuted'}`} />
                </div>
                <p className="text-lg font-medium text-white mb-2">Drag & drop your image here</p>
                <p className="text-sm text-textMuted mb-2">or click to browse</p>
                <div className="px-3 py-1 rounded-full bg-surfaceHighlight/50 text-xs text-textMuted">Supports PNG, BMP (Max 10MB)</div>
              </div>
            ) : (
              <div className="rounded-2xl overflow-hidden bg-background/80 border border-surfaceHighlight aspect-video flex items-center justify-center mb-6 relative group shadow-inner">
                <img src={preview} alt="Cover" className="max-w-full max-h-full object-contain" />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                  <button onClick={() => setFile(null)} className="btn-secondary">
                    Change Image
                  </button>
                </div>
              </div>
            )}
            
            <div className="mt-8 space-y-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-neonPurple/20 text-neonPurple text-xs">2</span>
                Enter Secret Message
              </h2>
              <div className="relative">
                <textarea 
                  className="w-full bg-background/80 border border-surfaceHighlight focus:border-neonPurple focus:ring-1 focus:ring-neonPurple rounded-xl p-4 text-white placeholder-textMuted/50 transition-all h-32 resize-none shadow-inner"
                  placeholder="Type your secret message here..."
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                />
                <div className="absolute bottom-3 right-3 text-xs text-textMuted font-mono">
                  {message.length} / 5000 characters
                </div>
              </div>
              
              <button 
                onClick={handleEmbed}
                disabled={!file || !message || isProcessing}
                className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 h-14 mt-4 text-lg"
              >
                {isProcessing ? (
                  <><Activity className="animate-spin" size={20} /> Processing...</>
                ) : (
                  <>Embed Message <Lock size={18} /></>
                )}
              </button>
            </div>
            
            {error && (
              <div className="mt-4 p-4 bg-danger/10 border border-danger/20 rounded-xl text-danger text-sm flex gap-3">
                <ShieldAlert size={18} className="shrink-0" />
                <p>{error}</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Extract */}
        <div className="space-y-6">
          <div className="card card-glass h-full flex flex-col relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px] pointer-events-none"></div>
            
            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2 relative z-10">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-xs">3</span>
              Generated Stego Image
            </h2>
            
            {stegoImage ? (
              <div className="flex-1 flex flex-col relative z-10 animate-fade-in">
                <div className="rounded-2xl overflow-hidden bg-background/80 border border-surfaceHighlight aspect-video flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(59,130,246,0.15)] relative">
                  <img src={stegoImage} alt="Stego" className="max-w-full max-h-full object-contain relative z-10" />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/10 to-transparent pointer-events-none"></div>
                </div>
                
                <div className="flex gap-4 mt-auto">
                  <a href={stegoImage} download="stego_image.png" className="btn-secondary flex-1 flex justify-center items-center gap-2 h-12">
                    <Download size={18} /> Download Image
                  </a>
                  <button onClick={handleExtract} disabled={isProcessing} className="btn-secondary border-primary/50 text-primary hover:bg-primary/10 flex-1 h-12 flex justify-center items-center gap-2">
                    <Eye size={18} /> View Details
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex-1 border-2 border-dashed border-surfaceHighlight/50 rounded-2xl flex flex-col items-center justify-center text-textMuted p-8 text-center min-h-[300px] relative z-10 bg-background/30">
                <div className="relative mb-6">
                  <ImageIcon size={64} className="opacity-20 drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]" />
                  <div className="absolute top-0 right-0 w-3 h-3 bg-primary rounded-full animate-ping"></div>
                </div>
                <h3 className="text-lg font-medium text-white mb-2">Your stego image will appear here</h3>
                <p className="text-sm opacity-80">Embed a message to generate</p>
              </div>
            )}
          </div>
          
          {extractedMessage && (
            <div className="card bg-accent/5 border-accent/20 animate-fade-in">
              <h3 className="text-sm font-bold text-accent uppercase tracking-widest mb-3 flex items-center gap-2">
                <Lock size={16} /> Extracted Payload
              </h3>
              <p className="text-textMain break-words bg-background/80 p-5 rounded-xl font-mono text-sm border border-surfaceHighlight shadow-inner">
                {extractedMessage}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Educational Section & Warning */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-6">
        
        {/* Educational Warning Card */}
        <div className="card bg-warning/10 border-warning/30 flex flex-col justify-center">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-warning/20 rounded-xl">
              <ShieldAlert className="w-6 h-6 text-warning" />
            </div>
            <div>
              <h3 className="text-white font-bold mb-1">Educational Use Only</h3>
              <p className="text-sm text-warning/90 leading-relaxed">
                This tool is strictly for demonstrating steganographic concepts. Do not use for malicious payloads.
              </p>
            </div>
          </div>
        </div>

        {/* How LSB Steganography Works */}
        <div className="lg:col-span-2 card bg-surface/40 border-surfaceHighlight flex items-center justify-between p-8">
          <div className="max-w-md">
            <h3 className="text-white font-bold mb-2 flex items-center gap-2">
              <Zap className="w-5 h-5 text-neonPurple" /> How LSB Steganography Works
            </h3>
            <p className="text-sm text-textMuted leading-relaxed">
              Least Significant Bit (LSB) steganography works by modifying the least significant bits of image pixels to store secret information. The changes are imperceptible to the human eye, making the message completely hidden.
            </p>
          </div>
          
          <div className="flex items-center gap-6 font-mono text-lg shrink-0">
            <div className="text-center">
              <div className="text-white tracking-[0.2em]">1011011<span className="text-textMuted">0</span></div>
              <div className="text-xs text-textMuted mt-2 font-sans tracking-normal uppercase font-bold">Original Pixel</div>
            </div>
            <div className="text-surfaceHighlight">→</div>
            <div className="text-center">
              <div className="text-white tracking-[0.2em]">1011011<span className="text-accent glow-text font-bold">1</span></div>
              <div className="text-xs text-textMuted mt-2 font-sans tracking-normal uppercase font-bold">Modified Pixel</div>
            </div>
          </div>
        </div>
        
      </div>

      <div className="pt-12 mt-12 border-t border-surfaceHighlight/50">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <Layers className="text-primary" /> Visual Forensic Tools
        </h2>
        <div className="card-glass rounded-2xl overflow-hidden border border-surfaceHighlight">
          <BitPlaneViewer />
        </div>
      </div>
    </div>
  );
}

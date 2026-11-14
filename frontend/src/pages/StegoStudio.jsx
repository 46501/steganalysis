import React, { useState, useRef } from 'react';
import {
  Lock,
  Unlock,
  KeyRound,
  Download,
  ArrowRight,
  Sparkles,
  FileText,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  Cpu,
  Layers,
  Sliders,
  ShieldAlert,
  Info,
} from 'lucide-react';
import { steganalysisApi } from '../services/api';
import { formatApiError } from '../utils/errorUtils';

export default function StegoStudio({ onSendToDetector }) {
  const [activeMode, setActiveMode] = useState('embed'); // 'embed' | 'extract'

  // Embed State
  const [embedFile, setEmbedFile] = useState(null);
  const [embedPreviewUrl, setEmbedPreviewUrl] = useState(null);
  const [secretText, setSecretText] = useState('CONFIDENTIAL: Operation StegoShield active verification token #2026-X7.');
  const [algorithm, setAlgorithm] = useState('lsb_replace'); // 'lsb_replace' | 'lsb_matching'
  const [embedPassword, setEmbedPassword] = useState('');
  const [showEmbedPassword, setShowEmbedPassword] = useState(false);
  const [isEmbedding, setIsEmbedding] = useState(false);
  const [embedResult, setEmbedResult] = useState(null);
  const [embedError, setEmbedError] = useState(null);

  // Extract State
  const [extractFile, setExtractFile] = useState(null);
  const [extractPreviewUrl, setExtractPreviewUrl] = useState(null);
  const [extractPassword, setExtractPassword] = useState('');
  const [showExtractPassword, setShowExtractPassword] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractResult, setExtractResult] = useState(null);
  const [extractError, setExtractError] = useState(null);
  const [copied, setCopied] = useState(false);

  const embedFileInputRef = useRef(null);
  const extractFileInputRef = useRef(null);

  // Preset sample messages
  const sampleMessages = [
    { label: 'Tactical Intel', text: 'CONFIDENTIAL: Operation StegoShield active verification token #2026-X7.' },
    { label: 'Academic Attestation', text: 'College Capstone Project: Spatial Steganalysis on S-UNIWARD 0.4 bpp (BOSSbase 1.01).' },
    { label: 'Cryptographic Digest', text: 'SHA-256 Digest: 8f4b23c91a0b5d7e6f8a2c1b9e0d3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e' },
  ];

  // Helper to create synthetic demo cover image in browser if user doesn't have one handy
  const handleGenerateSyntheticCover = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Create a natural-looking gradient + noise pattern
    const grad = ctx.createLinearGradient(0, 0, 512, 512);
    grad.addColorStop(0, '#2d3748');
    grad.addColorStop(0.5, '#4a5568');
    grad.addColorStop(1, '#1a202c');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    // Draw some geometric shapes resembling photographic textures
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    for (let i = 0; i < 40; i++) {
      ctx.beginPath();
      ctx.arc(
        (i * 37) % 512,
        (i * 59) % 512,
        20 + ((i * 13) % 60),
        0,
        Math.PI * 2
      );
      ctx.fill();
    }

    canvas.toBlob((blob) => {
      const file = new File([blob], 'synthetic_carrier_cover.png', { type: 'image/png' });
      handleEmbedFileSelect(file);
    }, 'image/png');
  };

  const handleEmbedFileSelect = (file) => {
    if (!file) return;
    setEmbedFile(file);
    setEmbedError(null);
    setEmbedResult(null);
    if (file.type.startsWith('image/')) {
      setEmbedPreviewUrl(URL.createObjectURL(file));
    } else {
      setEmbedPreviewUrl(null);
    }
  };

  const handleExtractFileSelect = (file) => {
    if (!file) return;
    setExtractFile(file);
    setExtractError(null);
    setExtractResult(null);
    if (file.type.startsWith('image/')) {
      setExtractPreviewUrl(URL.createObjectURL(file));
    } else {
      setExtractPreviewUrl(null);
    }
  };

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleRunEmbedding = async () => {
    if (!embedFile) {
      setEmbedError('Please select or generate a cover carrier image first.');
      return;
    }
    if (!secretText.trim()) {
      setEmbedError('Secret message payload cannot be empty.');
      return;
    }

    setIsEmbedding(true);
    setEmbedError(null);
    try {
      let res;
      if (embedPassword.trim()) {
        const b64 = await fileToBase64(embedFile);
        res = await steganalysisApi.embedLabSecret(b64, secretText.trim(), embedPassword.trim());
      } else {
        res = await steganalysisApi.embedSecretMessage(embedFile, secretText, algorithm);
      }
      setEmbedResult(res);
    } catch (err) {
      setEmbedError(formatApiError(err, 'Embedding failed.'));
    } finally {
      setIsEmbedding(false);
    }
  };

  const handleRunExtraction = async () => {
    if (!extractFile) {
      setExtractError('Please upload a stego image to inspect.');
      return;
    }

    setIsExtracting(true);
    setExtractError(null);
    try {
      let res;
      if (extractPassword.trim()) {
        const b64 = await fileToBase64(extractFile);
        res = await steganalysisApi.extractLabSecret(b64, extractPassword.trim());
      } else {
        res = await steganalysisApi.extractSecretMessage(extractFile);
      }
      setExtractResult(res);
    } catch (err) {
      setExtractError(formatApiError(err, 'Extraction failed.'));
    } finally {
      setIsExtracting(false);
    }
  };

  const handleLoadLastStegoToExtract = async () => {
    if (!embedResult?.stego_image_b64) return;
    // Convert base64 to File
    const res = await fetch(embedResult.stego_image_b64);
    const blob = await res.blob();
    const file = new File([blob], 'stego_carrier_from_studio.png', { type: 'image/png' });
    setActiveMode('extract');
    handleExtractFileSelect(file);
  };

  const handleSendToDetector = async () => {
    if (!embedResult?.stego_image_b64 || !onSendToDetector) return;
    const res = await fetch(embedResult.stego_image_b64);
    const blob = await res.blob();
    const file = new File([blob], `stego_${algorithm}_512x512.png`, { type: 'image/png' });
    onSendToDetector(file);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#111111] rounded-2xl p-6 border border-[#292929] relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-xl bg-[#151515] text-white border border-[#292929]">
                <Lock className="w-5 h-5" />
              </span>
              <h1 className="text-2xl font-bold text-white tracking-tight">Interactive Steganography Studio</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#151515] text-[#B3B3B3] border border-[#292929]">
                Live Embed & Extract
              </span>
            </div>
            <p className="mt-2 text-sm text-[#777777] max-w-2xl leading-relaxed">
              Embed arbitrary secret messages into carrier images using Spatial LSB Replacement or ±1 Matching, observe pixel-level imperceptibility, and pipe the resulting stego image directly into the StegoShield Detector to evaluate neural & statistical detectability.
            </p>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center bg-[#0A0A0A] p-1 rounded-xl border border-[#292929]">
            <button
              onClick={() => setActiveMode('embed')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeMode === 'embed'
                  ? 'bg-[#242424] text-white border border-[#383838]'
                  : 'text-[#777777] hover:text-white'
              }`}
            >
              <Lock className="w-4 h-4" />
              Conceal Message
            </button>
            <button
              onClick={() => setActiveMode('extract')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeMode === 'extract'
                  ? 'bg-[#242424] text-white border border-[#383838]'
                  : 'text-[#777777] hover:text-white'
              }`}
            >
              <Unlock className="w-4 h-4" />
              Extract Secret
            </button>
          </div>
        </div>
      </div>

      {/* EMBED MODE */}
      {activeMode === 'embed' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Carrier & Payload Input */}
          <div className="lg:col-span-6 space-y-6">
            {/* Carrier Image Selection Card */}
            <div className="bg-[#111111] rounded-2xl p-6 border border-[#292929] space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-white" />
                  1. Select Carrier Image (Cover)
                </h3>
                <button
                  type="button"
                  onClick={handleGenerateSyntheticCover}
                  className="text-xs px-2.5 py-1 rounded bg-[#1C1C1C] hover:bg-[#242424] text-white border border-[#292929] flex items-center gap-1 transition-colors"
                >
                  <Sparkles className="w-3 h-3 text-white" />
                  Quick Demo Carrier
                </button>
              </div>

              <input
                ref={embedFileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleEmbedFileSelect(e.target.files?.[0])}
              />

              <div
                onClick={() => embedFileInputRef.current?.click()}
                className="border-2 border-dashed border-[#292929] hover:border-[#383838] rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors bg-[#0A0A0A] min-h-[160px]"
              >
                {embedPreviewUrl ? (
                  <div className="flex items-center gap-4">
                    <img
                      src={embedPreviewUrl}
                      alt="Cover Preview"
                      className="w-24 h-24 object-cover rounded-lg border border-[#292929] shadow-md"
                    />
                    <div>
                      <p className="text-sm font-medium text-white truncate max-w-[200px]">{embedFile?.name}</p>
                      <p className="text-xs text-[#777777] font-mono mt-1">
                        {(embedFile?.size / 1024).toFixed(1)} KB
                      </p>
                      <span className="inline-block mt-2 text-[11px] text-[#B3B3B3] bg-[#151515] px-2 py-0.5 rounded border border-[#292929]">
                        Click to change image
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="w-10 h-10 rounded-full bg-[#151515] text-white border border-[#292929] flex items-center justify-center mx-auto mb-2">
                      <Layers className="w-5 h-5" />
                    </div>
                    <p className="text-sm font-medium text-white">Click to upload cover image</p>
                    <p className="text-xs text-[#777777] mt-1">PNG, PGM, JPG, or BMP (Grayscale or Color)</p>
                  </div>
                )}
              </div>
            </div>

            {/* Secret Payload Input Card */}
            <div className="bg-[#111111] rounded-2xl p-6 border border-[#292929] space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-white" />
                  2. Secret Message Payload
                </h3>
                <span className="text-xs text-[#777777] font-mono">
                  {secretText.length} chars | {new Blob([secretText]).size} bytes
                </span>
              </div>

              {/* Sample Payload Presets */}
              <div className="flex flex-wrap gap-2">
                <span className="text-xs text-[#777777] flex items-center gap-1">Presets:</span>
                {sampleMessages.map((msg, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSecretText(msg.text)}
                    className="text-xs px-2.5 py-1 rounded bg-[#151515] hover:bg-[#1E1E1E] text-[#B3B3B3] hover:text-white border border-[#292929] transition-colors"
                  >
                    {msg.label}
                  </button>
                ))}
              </div>

              <textarea
                value={secretText}
                onChange={(e) => setSecretText(e.target.value)}
                rows={4}
                placeholder="Enter secret text to conceal inside the carrier image..."
                className="w-full bg-[#0A0A0A] border border-[#292929] rounded-xl p-3 text-sm text-white placeholder-[#777777] focus:outline-none focus:border-[#555555] transition-colors font-mono resize-none"
              />

              {/* Algorithm Selection */}
              <div className="pt-2 border-t border-[#292929]">
                <label className="text-xs font-semibold text-[#777777] uppercase tracking-wider block mb-2">
                  Embedding Algorithm
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setAlgorithm('lsb_replace')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      algorithm === 'lsb_replace'
                        ? 'bg-[#1C1C1C] border-[#555555] text-white shadow-sm'
                        : 'bg-[#151515] border-[#292929] text-[#777777] hover:text-white'
                    }`}
                  >
                    <div className="text-xs font-bold text-white">Spatial LSB Replacement</div>
                    <div className="text-[11px] text-[#777777] mt-1">Direct 1-bit substitution. Fast, classical baseline.</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAlgorithm('lsb_matching')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      algorithm === 'lsb_matching'
                        ? 'bg-[#1C1C1C] border-[#555555] text-white shadow-sm'
                        : 'bg-[#151515] border-[#292929] text-[#777777] hover:text-white'
                    }`}
                  >
                    <div className="text-xs font-bold text-white">Spatial LSB Matching (±1)</div>
                    <div className="text-[11px] text-[#777777] mt-1">Symmetric ±1 addition. Evades PoV & Chi-Square.</div>
                  </button>
                </div>
              </div>

              {/* Optional AES Password Encryption */}
              <div className="pt-2 border-t border-[#292929]">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-[#777777] uppercase tracking-wider flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Optional AES-256 Encryption Key</span>
                  </label>
                  <span className="text-[10px] text-[#555555]">Optional</span>
                </div>
                <div className="relative">
                  <input
                    type={showEmbedPassword ? 'text' : 'password'}
                    value={embedPassword}
                    onChange={(e) => setEmbedPassword(e.target.value)}
                    placeholder="Enter passkey to cryptographically seal payload..."
                    className="w-full bg-[#0A0A0A] border border-[#292929] rounded-xl px-3 py-2 text-xs text-white placeholder-[#555555] focus:outline-none focus:border-[#555555] font-mono pr-16"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEmbedPassword(!showEmbedPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-[#777777] hover:text-white"
                  >
                    {showEmbedPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              {embedError && (
                <div className="p-3 bg-[#151515] border border-[#383838] text-white text-xs rounded-xl flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-white" />
                  <span>{typeof embedError === 'string' ? embedError : formatApiError(embedError)}</span>
                </div>
              )}

              <button
                type="button"
                onClick={handleRunEmbedding}
                disabled={isEmbedding || !embedFile}
                className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                  isEmbedding || !embedFile
                    ? 'bg-[#1A1A1A] text-[#555555] cursor-not-allowed border border-[#292929]'
                    : 'bg-white hover:bg-[#E5E5E5] text-black shadow-md theme-btn-primary'
                }`}
              >
                {isEmbedding ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-black" />
                    <span>Embedding Bitstream...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 text-black" />
                    <span>Conceal Message in Image</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right Column: Output Stego Image & Telemetry */}
          <div className="lg:col-span-6 space-y-6">
            <div className="bg-[#111111] rounded-2xl p-6 border border-[#292929] h-full flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-semibold text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-white" />
                    Generated Stego Carrier Output
                  </h3>
                  {embedResult && (
                    <span className="text-xs px-2 py-0.5 rounded bg-[#151515] border border-[#292929] text-[#B3B3B3] font-mono">
                      100% Bit-Accurate
                    </span>
                  )}
                </div>

                {embedResult ? (
                  <div className="space-y-5">
                    {/* Stego Image Visual Preview */}
                    <div className="relative rounded-xl overflow-hidden border border-[#292929] bg-black flex items-center justify-center p-2 group">
                      <img
                        src={embedResult.stego_image_b64}
                        alt="Stego Output"
                        className="max-h-72 w-auto object-contain rounded-lg shadow-2xl"
                      />
                      <div className="absolute bottom-3 left-3 bg-black/85 backdrop-blur px-3 py-1 rounded text-xs text-white font-mono border border-[#292929]">
                        {embedResult.dimensions} • {embedResult.algorithm}
                      </div>
                    </div>

                    {/* Steganographic Telemetry Metrics */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="bg-[#151515] p-3 rounded-xl border border-[#292929]">
                        <div className="text-[10px] text-[#777777] uppercase">Modified Pixels</div>
                        <div className="text-base font-bold text-white font-mono mt-0.5">
                          {embedResult.modified_pixel_count.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-[#B3B3B3] font-mono">
                          {embedResult.modified_pixel_percent}% altered
                        </div>
                      </div>

                      <div className="bg-[#151515] p-3 rounded-xl border border-[#292929]">
                        <div className="text-[10px] text-[#777777] uppercase">Embedding Rate</div>
                        <div className="text-base font-bold text-white font-mono mt-0.5">
                          {embedResult.embedding_rate_bpp}
                        </div>
                        <div className="text-[10px] text-[#777777]">bpp (bits/pixel)</div>
                      </div>

                      <div className="bg-[#151515] p-3 rounded-xl border border-[#292929]">
                        <div className="text-[10px] text-[#777777] uppercase">Payload Size</div>
                        <div className="text-base font-bold text-white font-mono mt-0.5">
                          {embedResult.payload_bytes} B
                        </div>
                        <div className="text-[10px] text-[#B3B3B3]">
                          {((embedResult.payload_bytes / embedResult.capacity_bytes) * 100).toFixed(2)}% capacity
                        </div>
                      </div>

                      <div className="bg-[#151515] p-3 rounded-xl border border-[#292929]">
                        <div className="text-[10px] text-[#777777] uppercase">Carrier Max Cap</div>
                        <div className="text-base font-bold text-white font-mono mt-0.5">
                          {(embedResult.capacity_bytes / 1024).toFixed(1)} KB
                        </div>
                        <div className="text-[10px] text-[#777777] font-mono">
                          {embedResult.capacity_bytes.toLocaleString()} bytes
                        </div>
                      </div>
                    </div>

                    {/* Cryptographic SHA-256 */}
                    <div className="p-3 bg-[#151515] rounded-xl border border-[#292929] flex items-center justify-between text-xs">
                      <div className="truncate mr-2 font-mono text-[#777777]">
                        <span className="text-[#B3B3B3]">SHA-256: </span>
                        {embedResult.sha256_hash}
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(embedResult.sha256_hash)}
                        className="text-[#777777] hover:text-white shrink-0 p-1"
                        title="Copy SHA-256"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="h-64 rounded-xl border border-dashed border-[#292929] flex flex-col items-center justify-center text-center p-6 text-[#777777]">
                    <Lock className="w-8 h-8 text-[#555555] mb-2" />
                    <p className="text-sm font-medium text-white">Awaiting Secret Message Embedding</p>
                    <p className="text-xs text-[#777777] mt-1 max-w-xs">
                      Select or generate a carrier image, type your secret text, and click Conceal to inspect the stego output.
                    </p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              {embedResult && (
                <div className="pt-6 border-t border-[#292929] space-y-3 mt-4">
                  <div className="grid grid-cols-2 gap-3">
                    <a
                      href={embedResult.stego_image_b64}
                      download={`stego_${algorithm}_512x512.png`}
                      className="py-2.5 px-4 rounded-xl bg-[#1C1C1C] hover:bg-[#242424] text-white font-semibold text-xs flex items-center justify-center gap-2 border border-[#292929] transition-colors"
                    >
                      <Download className="w-4 h-4 text-white" />
                      Download Stego Image
                    </a>

                    <button
                      type="button"
                      onClick={handleLoadLastStegoToExtract}
                      className="py-2.5 px-4 rounded-xl bg-[#1C1C1C] hover:bg-[#242424] text-white font-semibold text-xs flex items-center justify-center gap-2 border border-[#292929] transition-colors"
                    >
                      <Unlock className="w-4 h-4 text-white" />
                      Test Secret Extraction
                    </button>
                  </div>

                  {/* Send to StegoShield Detector */}
                  <button
                    type="button"
                    onClick={handleSendToDetector}
                    className="w-full py-3 rounded-xl bg-white hover:bg-[#E5E5E5] text-black font-semibold text-sm flex items-center justify-center gap-2 shadow-md transition-all theme-btn-primary"
                  >
                    <ArrowRight className="w-4 h-4 text-black" />
                    Send to StegoShield Detector Workspace
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* EXTRACT MODE */}
      {activeMode === 'extract' && (
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="bg-[#111111] rounded-2xl p-6 border border-[#292929] space-y-6">
            <div>
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-white" />
                Upload Suspected Stego Image for Extraction
              </h3>
              <p className="text-xs text-[#777777] mt-1">
                Reads the binary LSB structure and decodes embedded secret text payloads.
              </p>
            </div>

            <input
              ref={extractFileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleExtractFileSelect(e.target.files?.[0])}
            />

            <div
              onClick={() => extractFileInputRef.current?.click()}
              className="border-2 border-dashed border-[#292929] hover:border-[#383838] rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors bg-[#0A0A0A] min-h-[180px]"
            >
              {extractPreviewUrl ? (
                <div className="flex items-center gap-4">
                  <img
                    src={extractPreviewUrl}
                    alt="Carrier Preview"
                    className="w-24 h-24 object-cover rounded-lg border border-[#292929] shadow-md"
                  />
                  <div>
                    <p className="text-sm font-medium text-white truncate max-w-[240px]">{extractFile?.name}</p>
                    <p className="text-xs text-[#777777] font-mono mt-1">
                      {(extractFile?.size / 1024).toFixed(1)} KB
                    </p>
                    <span className="inline-block mt-2 text-[11px] text-[#B3B3B3] bg-[#151515] px-2 py-0.5 rounded border border-[#292929]">
                      Click to choose another image
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full bg-[#151515] text-white border border-[#292929] flex items-center justify-center mx-auto mb-2">
                    <Unlock className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-medium text-white">Click or Drag & Drop Stego Image</p>
                  <p className="text-xs text-[#777777] mt-1">Supports PNG, PGM, BMP</p>
                </div>
              )}
            </div>

            {/* Optional AES Password Decryption */}
            <div className="pt-2 border-t border-[#292929]">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-[#777777] uppercase tracking-wider flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Optional Decryption Passkey</span>
                </label>
                <span className="text-[10px] text-[#555555]">Leave blank if unencrypted</span>
              </div>
              <div className="relative">
                <input
                  type={showExtractPassword ? 'text' : 'password'}
                  value={extractPassword}
                  onChange={(e) => setExtractPassword(e.target.value)}
                  placeholder="Enter passkey if payload was sealed with encryption..."
                  className="w-full bg-[#0A0A0A] border border-[#292929] rounded-xl px-3 py-2 text-xs text-white placeholder-[#555555] focus:outline-none focus:border-[#555555] font-mono pr-16"
                />
                <button
                  type="button"
                  onClick={() => setShowExtractPassword(!showExtractPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-[#777777] hover:text-white"
                >
                  {showExtractPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {extractError && (
              <div className="p-4 bg-[#151515] border border-[#383838] text-white text-xs rounded-xl flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 shrink-0 text-white mt-0.5" />
                <div>
                  <div className="font-semibold text-white">Extraction Notice</div>
                  <div className="mt-0.5 text-[#B3B3B3]">
                    {typeof extractError === 'string' ? extractError : formatApiError(extractError)}
                  </div>
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleRunExtraction}
              disabled={isExtracting || !extractFile}
              className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                isExtracting || !extractFile
                  ? 'bg-[#1A1A1A] text-[#555555] cursor-not-allowed border border-[#292929]'
                  : 'bg-white hover:bg-[#E5E5E5] text-black shadow-md theme-btn-primary'
              }`}
            >
              {isExtracting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-black" />
                  <span>Scanning LSB Channels...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4 text-black" />
                  <span>Recover Hidden Secret Plaintext</span>
                </>
              )}
            </button>

            {/* Extracted Payload Output */}
            {extractResult && (
              <div className="pt-6 border-t border-[#292929] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-white" />
                    <span className="text-sm font-semibold text-white">Concealed Payload Recovered</span>
                  </div>
                  <span className="text-xs font-mono text-white bg-[#151515] px-2 py-0.5 rounded border border-[#292929]">
                    {extractResult.payload_bytes} bytes decoded
                  </span>
                </div>

                <div className="relative bg-[#0A0A0A] border border-[#292929] rounded-xl p-4 group">
                  <pre className="text-sm font-mono text-white whitespace-pre-wrap break-all leading-relaxed">
                    {extractResult.secret_text}
                  </pre>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(extractResult.secret_text)}
                    className="absolute top-3 right-3 p-1.5 rounded-lg bg-[#1C1C1C] hover:bg-[#242424] text-[#777777] hover:text-white transition-colors"
                    title="Copy Text"
                  >
                    {copied ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4 text-[#777777]" />}
                  </button>
                </div>

                <div className="text-[11px] text-[#777777] font-mono flex items-center justify-between">
                  <span>Scanned: {extractResult.total_pixels_scanned} pixels</span>
                  <span className="text-white font-sans">
                    {typeof extractResult.status === 'string'
                      ? extractResult.status
                      : formatApiError(extractResult.status, 'Operation complete')}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


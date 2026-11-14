import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  Binary,
  Layers,
  Activity,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  Sparkles,
  Info,
  ChevronDown,
  ChevronUp,
  Cpu,
  Sliders,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { steganalysisApi } from '../../services/api';

export default function PixelMicroscope({
  originalMeta,
  originalImageB64,
  modifiedImageB64,
  modifiedHash,
  onImageUpload,
  onLoadSample,
  onToggleBit,
  onBulkMutate,
  onRestoreOriginal,
  selectedPixel,
  onSelectPixel,
  pixelDetails,
  inspectLoading,
  bulkProcessing,
  lastBulkResult,
  showStatus,
}) {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [activePlane, setActivePlane] = useState(0);
  const [activeChannel, setActiveChannel] = useState('gray');
  const [bitplaneData, setBitplaneData] = useState(null);
  const [bitplaneLoading, setBitplaneLoading] = useState(false);

  // Collapsible sub-panels
  const [showBitplane, setShowBitplane] = useState(true);
  const [showBulkMutation, setShowBulkMutation] = useState(false);
  const [showFft, setShowFft] = useState(false);

  // Bulk mutation form state
  const [bulkMode, setBulkMode] = useState('lsb_only');
  const [bulkPlane, setBulkPlane] = useState(0);
  const [bulkPercentage, setBulkPercentage] = useState(10);
  const [bulkSeed, setBulkSeed] = useState(42);
  const [bulkAction, setBulkAction] = useState('toggle');

  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  // Active image source (modified if modified, else original)
  const currentImageB64 = modifiedImageB64 || originalImageB64;
  const isModified = originalImageB64 && modifiedImageB64 && originalImageB64 !== modifiedImageB64;

  // Draw canvas image when source or zoom changes
  useEffect(() => {
    if (!currentImageB64 || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, 0, 0);

      // Draw crosshair overlay on selected pixel
      if (selectedPixel) {
        ctx.strokeStyle = '#00F0FF';
        ctx.lineWidth = 1;
        ctx.strokeRect(selectedPixel.x - 2.5, selectedPixel.y - 2.5, 6, 6);
        ctx.fillStyle = '#00F0FF';
        ctx.fillRect(selectedPixel.x, selectedPixel.y, 1, 1);
      }
    };
    img.src = currentImageB64;
  }, [currentImageB64, selectedPixel, zoomLevel]);

  // Load bitplane when activePlane or activeChannel changes
  useEffect(() => {
    if (!currentImageB64 || !showBitplane) return;

    let isMounted = true;
    const fetchBitplane = async () => {
      try {
        setBitplaneLoading(true);
        const res = await steganalysisApi.getLabBitplane(currentImageB64, activePlane, activeChannel);
        if (isMounted) setBitplaneData(res);
      } catch (err) {
        console.warn('Bitplane fetch error:', err);
      } finally {
        if (isMounted) setBitplaneLoading(false);
      }
    };
    fetchBitplane();
    return () => {
      isMounted = false;
    };
  }, [currentImageB64, activePlane, activeChannel, showBitplane]);

  const handleCanvasClick = (e) => {
    if (!canvasRef.current || !originalMeta) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;

    const imgX = Math.floor(clickX * scaleX);
    const imgY = Math.floor(clickY * scaleY);

    if (imgX >= 0 && imgX < originalMeta.width && imgY >= 0 && imgY < originalMeta.height) {
      onSelectPixel(imgX, imgY);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) onImageUpload(file);
  };

  const handleRunBulk = () => {
    onBulkMutate({
      mode: bulkMode,
      plane: parseInt(bulkPlane, 10),
      percentage: parseFloat(bulkPercentage),
      seed: parseInt(bulkSeed, 10),
      action: bulkAction,
    });
  };

  const handleDownloadModified = () => {
    if (!currentImageB64) return;
    const link = document.createElement('a');
    link.href = currentImageB64;
    link.download = `stego_microscope_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Top Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#070D1A] border border-[#1B2B48]">
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black text-xs font-bold transition shadow-[0_0_12px_rgba(0,240,255,0.3)]"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload Image</span>
          </button>

          <button
            type="button"
            onClick={onLoadSample}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0A1224] hover:bg-[#0F1C36] text-cyan-300 border border-cyan-500/30 text-xs font-semibold transition"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Load Sample Cover</span>
          </button>

          {isModified && (
            <button
              type="button"
              onClick={onRestoreOriginal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 border border-amber-500/40 text-xs font-semibold transition"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span>Restore Baseline Cover</span>
            </button>
          )}
        </div>

        {/* Right side metadata badge & actions */}
        <div className="flex items-center gap-3">
          {originalMeta && (
            <div className="hidden sm:flex items-center gap-2 font-mono text-[11px] text-[#94A3B8]">
              <span className="text-white font-semibold truncate max-w-[150px]">{originalMeta.filename}</span>
              <span>•</span>
              <span className="text-cyan-400">{originalMeta.dimensions}</span>
              <span>•</span>
              <span className="text-emerald-400">Entropy {originalMeta.entropy_shannon?.toFixed(2) || '7.98'}</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleDownloadModified}
            disabled={!currentImageB64}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#0A1224] hover:bg-[#0F1C36] text-[#94A3B8] hover:text-white border border-[#1B2B48] text-xs font-semibold transition disabled:opacity-40"
            title="Download current lossless raster"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Download Raster</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Interactive Canvas (Left) + Telemetry & Bit Slicer (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* LEFT: Canvas Viewport */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-3">
          <div className="p-4 rounded-2xl bg-[#070D1A] border border-[#1B2B48] flex flex-col items-center justify-center relative min-h-[460px] overflow-hidden">
            {/* Viewport Zoom Bar */}
            <div className="absolute top-3 left-3 z-10 flex items-center gap-1 bg-[#050914]/90 backdrop-blur-md p-1 rounded-xl border border-[#1B2B48] text-xs font-mono">
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.max(1, z - 1))}
                disabled={zoomLevel <= 1}
                className="p-1 rounded text-[#94A3B8] hover:text-white hover:bg-[#142036] disabled:opacity-30"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="px-2 text-cyan-300 font-bold">{zoomLevel}x</span>
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.min(8, z + 1))}
                disabled={zoomLevel >= 8}
                className="p-1 rounded text-[#94A3B8] hover:text-white hover:bg-[#142036] disabled:opacity-30"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Canvas Container */}
            <div
              className="max-w-full max-h-[500px] overflow-auto flex items-center justify-center border border-[#142036] rounded-xl bg-black/60 shadow-inner"
              style={{
                transform: `scale(${zoomLevel > 1 ? 1 : 1})`,
              }}
            >
              <canvas
                ref={canvasRef}
                onClick={handleCanvasClick}
                className="cursor-crosshair max-w-full h-auto transition-transform duration-100"
                style={{
                  width: zoomLevel > 1 ? `${originalMeta?.width ? originalMeta.width * zoomLevel : 512}px` : 'auto',
                  imageRendering: zoomLevel > 1 ? 'pixelated' : 'auto',
                }}
              />
            </div>

            {/* Coordinate Overlay Banner */}
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between px-3 py-1.5 rounded-xl bg-[#050914]/90 backdrop-blur-md border border-[#1B2B48] text-[11px] font-mono text-[#94A3B8]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                <span>Click anywhere on canvas to inspect pixel bits</span>
              </div>
              <div className="text-white font-bold">
                Target: ({selectedPixel?.x ?? 0}, {selectedPixel?.y ?? 0})
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Telemetry & Controls Sidebar */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-3">
          {/* 1. Selected Pixel Bit Register */}
          <div className="p-4 rounded-2xl bg-[#070D1A] border border-[#1B2B48] space-y-3">
            <div className="flex items-center justify-between border-b border-[#142036] pb-2">
              <div className="flex items-center gap-2">
                <Binary className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Pixel Bit Register
                </h3>
              </div>
              <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-500/30">
                X: {selectedPixel?.x ?? 0} &bull; Y: {selectedPixel?.y ?? 0}
              </span>
            </div>

            {inspectLoading ? (
              <div className="flex items-center justify-center py-6 gap-2 text-cyan-400 text-xs font-mono">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Reading byte array...</span>
              </div>
            ) : pixelDetails ? (
              <div className="space-y-3 font-mono text-xs">
                {/* Channel Values & Color Swatch */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#050914] border border-[#142036]">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-lg border border-[#1B2B48] shadow-inner"
                      style={{
                        backgroundColor: `rgb(${pixelDetails.red ?? pixelDetails.gray ?? 0}, ${pixelDetails.green ?? pixelDetails.gray ?? 0}, ${pixelDetails.blue ?? pixelDetails.gray ?? 0})`,
                      }}
                    />
                    <div>
                      <div className="text-[10px] text-[#64748B]">
                        {pixelDetails.is_color ? 'RGB Values' : 'Grayscale Intensity'}
                      </div>
                      <div className="text-white font-bold">
                        {pixelDetails.is_color
                          ? `R:${pixelDetails.red} G:${pixelDetails.green} B:${pixelDetails.blue}`
                          : `${pixelDetails.gray} / 255`}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-[#64748B]">Luminance</div>
                    <div className="text-cyan-300 font-bold">{pixelDetails.luminance ?? '--'}</div>
                  </div>
                </div>

                {/* Interactive 8-Bit Registers */}
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] text-[#64748B]">
                    <span>Interactive Byte (MSB $\to$ LSB)</span>
                    <span className="text-cyan-400">Click bit to toggle</span>
                  </div>

                  {/* Red / Gray Channel */}
                  <div>
                    <div className="text-[10px] text-[#94A3B8] mb-1 flex justify-between">
                      <span>{pixelDetails.is_color ? 'Red Channel Byte' : 'Luminance Byte'}</span>
                      <span className="text-white font-bold">{pixelDetails.red ?? pixelDetails.gray}</span>
                    </div>
                    <div className="grid grid-cols-8 gap-1">
                      {(pixelDetails.binary_bits_red || pixelDetails.binary_bits_gray || '00000000')
                        .split('')
                        .map((bit, idx) => {
                          const bitPos = 7 - idx; // 7 = MSB, 0 = LSB
                          const isLsb = bitPos === 0;
                          return (
                            <button
                              key={`r-${bitPos}`}
                              type="button"
                              onClick={() => onToggleBit(pixelDetails.is_color ? 'red' : 'gray', bitPos)}
                              className={`p-1.5 rounded-lg text-center font-bold text-xs transition border cursor-pointer ${
                                bit === '1'
                                  ? 'bg-cyan-500 text-black border-cyan-400 shadow-[0_0_8px_rgba(0,240,255,0.4)]'
                                  : 'bg-[#0A1224] text-[#94A3B8] border-[#142036] hover:border-cyan-500/40'
                              } ${isLsb ? 'ring-1 ring-amber-400/60' : ''}`}
                              title={`Bit ${bitPos} (${isLsb ? 'LSB - Primary Stego Target' : 'Plane ' + bitPos})`}
                            >
                              <div>{bit}</div>
                              <div className="text-[8px] opacity-60">b{bitPos}</div>
                            </button>
                          );
                        })}
                    </div>
                  </div>

                  {/* Green Channel (if color) */}
                  {pixelDetails.is_color && (
                    <div>
                      <div className="text-[10px] text-[#94A3B8] mb-1 flex justify-between">
                        <span>Green Channel Byte</span>
                        <span className="text-white font-bold">{pixelDetails.green}</span>
                      </div>
                      <div className="grid grid-cols-8 gap-1">
                        {(pixelDetails.binary_bits_green || '00000000')
                          .split('')
                          .map((bit, idx) => {
                            const bitPos = 7 - idx;
                            return (
                              <button
                                key={`g-${bitPos}`}
                                type="button"
                                onClick={() => onToggleBit('green', bitPos)}
                                className={`p-1.5 rounded-lg text-center font-bold text-xs transition border cursor-pointer ${
                                  bit === '1'
                                    ? 'bg-emerald-500 text-black border-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.4)]'
                                    : 'bg-[#0A1224] text-[#94A3B8] border-[#142036] hover:border-emerald-500/40'
                                }`}
                                title={`Bit ${bitPos}`}
                              >
                                <div>{bit}</div>
                                <div className="text-[8px] opacity-60">b{bitPos}</div>
                              </button>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  {/* Blue Channel (if color) */}
                  {pixelDetails.is_color && (
                    <div>
                      <div className="text-[10px] text-[#94A3B8] mb-1 flex justify-between">
                        <span>Blue Channel Byte</span>
                        <span className="text-white font-bold">{pixelDetails.blue}</span>
                      </div>
                      <div className="grid grid-cols-8 gap-1">
                        {(pixelDetails.binary_bits_blue || '00000000')
                          .split('')
                          .map((bit, idx) => {
                            const bitPos = 7 - idx;
                            return (
                              <button
                                key={`b-${bitPos}`}
                                type="button"
                                onClick={() => onToggleBit('blue', bitPos)}
                                className={`p-1.5 rounded-lg text-center font-bold text-xs transition border cursor-pointer ${
                                  bit === '1'
                                    ? 'bg-indigo-500 text-white border-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.4)]'
                                    : 'bg-[#0A1224] text-[#94A3B8] border-[#142036] hover:border-indigo-500/40'
                                }`}
                                title={`Bit ${bitPos}`}
                              >
                                <div>{bit}</div>
                                <div className="text-[8px] opacity-60">b{bitPos}</div>
                              </button>
                            );
                          })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-xs text-[#64748B]">Click canvas to inspect pixel bits</div>
            )}
          </div>

          {/* 2. Bitplane Slicer Panel */}
          <div className="p-4 rounded-2xl bg-[#070D1A] border border-[#1B2B48] space-y-3">
            <button
              type="button"
              onClick={() => setShowBitplane(!showBitplane)}
              className="w-full flex items-center justify-between text-xs font-bold text-white uppercase tracking-wider font-mono"
            >
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span>Bit-Plane Slicer (Planes 0–7)</span>
              </div>
              {showBitplane ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showBitplane && (
              <div className="space-y-3 font-mono text-xs pt-1">
                {/* Plane 0 - 7 Selector */}
                <div className="grid grid-cols-8 gap-1">
                  {[0, 1, 2, 3, 4, 5, 6, 7].map((plane) => (
                    <button
                      key={`plane-${plane}`}
                      type="button"
                      onClick={() => setActivePlane(plane)}
                      className={`py-1.5 rounded-lg text-center font-bold text-xs transition border ${
                        activePlane === plane
                          ? 'bg-cyan-500 text-black border-cyan-400 shadow-[0_0_8px_rgba(0,240,255,0.4)]'
                          : 'bg-[#0A1224] text-[#94A3B8] border-[#142036] hover:border-cyan-500/30'
                      }`}
                    >
                      P{plane}
                    </button>
                  ))}
                </div>

                {/* Channel Selector */}
                <div className="grid grid-cols-4 gap-1 text-[11px]">
                  {['gray', 'red', 'green', 'blue'].map((ch) => (
                    <button
                      key={`ch-${ch}`}
                      type="button"
                      onClick={() => setActiveChannel(ch)}
                      className={`py-1 rounded-lg capitalize border font-semibold ${
                        activeChannel === ch
                          ? 'bg-[#142036] text-cyan-300 border-cyan-500/40'
                          : 'bg-[#050914] text-[#64748B] border-[#142036] hover:text-[#94A3B8]'
                      }`}
                    >
                      {ch}
                    </button>
                  ))}
                </div>

                {/* Bitplane Preview & Stats */}
                {bitplaneLoading ? (
                  <div className="flex items-center justify-center py-6 gap-2 text-cyan-400 text-xs">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Extracting bitplane raster...</span>
                  </div>
                ) : bitplaneData ? (
                  <div className="space-y-2">
                    <div className="w-full h-36 rounded-xl overflow-hidden border border-[#142036] bg-black">
                      <img
                        src={bitplaneData.bitplane_image_b64}
                        alt={`Bitplane ${activePlane}`}
                        className="w-full h-full object-contain"
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-[#94A3B8]">
                      <span>White Pixels: <strong className="text-white">{bitplaneData.white_pixel_percent?.toFixed(1) || '--'}%</strong></span>
                      <span>Plane Entropy: <strong className="text-cyan-400">{bitplaneData.entropy_shannon?.toFixed(3) || '--'}</strong></span>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {/* 3. Bulk Mutations (Collapsible) */}
          <div className="p-4 rounded-2xl bg-[#070D1A] border border-[#1B2B48] space-y-3">
            <button
              type="button"
              onClick={() => setShowBulkMutation(!showBulkMutation)}
              className="w-full flex items-center justify-between text-xs font-bold text-white uppercase tracking-wider font-mono"
            >
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" />
                <span>Bulk Bit Mutations</span>
              </div>
              {showBulkMutation ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showBulkMutation && (
              <div className="space-y-3 font-mono text-xs pt-1">
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-[#94A3B8]">
                    <span>Mutation Rate:</span>
                    <strong className="text-cyan-300">{bulkPercentage}%</strong>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="100"
                    value={bulkPercentage}
                    onChange={(e) => setBulkPercentage(e.target.value)}
                    className="w-full accent-cyan-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <label className="text-[10px] text-[#64748B] block mb-1">Target Plane</label>
                    <select
                      value={bulkPlane}
                      onChange={(e) => setBulkPlane(e.target.value)}
                      className="w-full p-1.5 rounded-lg bg-[#050914] border border-[#142036] text-white"
                    >
                      {[0, 1, 2, 3, 4, 5, 6, 7].map((p) => (
                        <option key={p} value={p}>
                          Plane {p} {p === 0 ? '(LSB)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-[#64748B] block mb-1">Action</label>
                    <select
                      value={bulkAction}
                      onChange={(e) => setBulkAction(e.target.value)}
                      className="w-full p-1.5 rounded-lg bg-[#050914] border border-[#142036] text-white"
                    >
                      <option value="toggle">Toggle (Flip Bit)</option>
                      <option value="randomize">Randomize (Noise)</option>
                      <option value="set_0">Clear (Set to 0)</option>
                      <option value="set_1">Set (Set to 1)</option>
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRunBulk}
                  disabled={bulkProcessing || !currentImageB64}
                  className="w-full py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs transition disabled:opacity-40 shadow-[0_0_12px_rgba(0,240,255,0.25)] flex items-center justify-center gap-1.5"
                >
                  {bulkProcessing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Injecting mutations...</span>
                    </>
                  ) : (
                    <span>Execute Bulk Perturbation</span>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* 4. High-Frequency Fourier Spectrum (Collapsible) */}
          {originalMeta?.fft_spectrum_b64 && (
            <div className="p-4 rounded-2xl bg-[#070D1A] border border-[#1B2B48] space-y-3">
              <button
                type="button"
                onClick={() => setShowFft(!showFft)}
                className="w-full flex items-center justify-between text-xs font-bold text-white uppercase tracking-wider font-mono"
              >
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400" />
                  <span>2D Fourier (FFT) Spectrum</span>
                </div>
                {showFft ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showFft && (
                <div className="space-y-2 font-mono text-xs pt-1">
                  <div className="w-full h-36 rounded-xl overflow-hidden border border-[#142036] bg-black">
                    <img
                      src={originalMeta.fft_spectrum_b64}
                      alt="FFT Spectrum"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="text-[10px] text-[#94A3B8] flex justify-between">
                    <span>High-Pass Energy Ratio:</span>
                    <strong className="text-cyan-300">
                      {originalMeta.fft_stats?.high_freq_ratio?.toFixed(3) || '0.142'}
                    </strong>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


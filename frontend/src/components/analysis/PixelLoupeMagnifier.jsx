import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Crosshair,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  ZoomIn,
  Sparkles,
  Layers,
  ArrowRight,
  Eye,
  Binary,
} from 'lucide-react';

const to8Bit = (val) => {
  const safeVal = typeof val === 'number' && !isNaN(val) ? val : 0;
  const binaryStr = (safeVal & 0xff).toString(2).padStart(8, '0');
  return binaryStr.split('').map((bit, idx) => ({
    bitIndex: 7 - idx,
    value: Number(bit),
  }));
};

/**
 * PixelLoupeMagnifier
 *
 * Microscopic 8x Synchronized Dual Loupe Lens for Steganalysis Inspection.
 * Renders exact integer pixel values (0-255), LSB bitplanes, and highlights
 * discrete +/-1 S-UNIWARD perturbations between cover and stego carriers.
 */
export default function PixelLoupeMagnifier({
  coverSrc = '/samples/sample_cover.png',
  stegoSrc = '/samples/sample_stego.png',
  currentSrc = null,
  isPaired = true,
}) {
  // Cursor position on the 512x512 grid (default to dense perturbation region)
  const [coords, setCoords] = useState({ x: 190, y: 410 });
  const [windowSize, setWindowSize] = useState(9); // 9x9 grid around center
  const [loupeMode, setLoupeMode] = useState('diff'); // 'diff' | 'dual' | 'cover' | 'stego'

  // Pixel data caches
  const [coverPixels, setCoverPixels] = useState(null);
  const [stegoPixels, setStegoPixels] = useState(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const containerRef = useRef(null);

  // Load image data into memory offscreen
  useEffect(() => {
    let active = true;

    const loadImages = async () => {
      try {
        const cImg = new Image();
        const sImg = new Image();
        cImg.crossOrigin = 'anonymous';
        sImg.crossOrigin = 'anonymous';

        const loadPromise = (img, src) =>
          new Promise((resolve, reject) => {
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
          });

        const coverUrl = coverSrc || currentSrc;
        const stegoUrl = isPaired ? (stegoSrc || currentSrc) : (currentSrc || coverSrc);

        const [loadedC, loadedS] = await Promise.all([
          loadPromise(cImg, coverUrl),
          loadPromise(sImg, stegoUrl),
        ]);

        if (!active) return;

        const canvasC = document.createElement('canvas');
        canvasC.width = 512;
        canvasC.height = 512;
        const ctxC = canvasC.getContext('2d', { willReadFrequently: true });
        ctxC.drawImage(loadedC, 0, 0, 512, 512);
        const dataC = ctxC.getImageData(0, 0, 512, 512).data;

        const canvasS = document.createElement('canvas');
        canvasS.width = 512;
        canvasS.height = 512;
        const ctxS = canvasS.getContext('2d', { willReadFrequently: true });
        ctxS.drawImage(loadedS, 0, 0, 512, 512);
        const dataS = ctxS.getImageData(0, 0, 512, 512).data;

        setCoverPixels(dataC);
        setStegoPixels(dataS);
        setIsLoaded(true);
      } catch (err) {
        console.warn('PixelLoupeMagnifier: image load fallback', err);
      }
    };

    loadImages();
    return () => {
      active = false;
    };
  }, [coverSrc, stegoSrc, currentSrc, isPaired]);

  // Handle pointer interaction over the preview container
  const handlePointerMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = e.clientX ?? e.touches?.[0]?.clientX;
    const clientY = e.clientY ?? e.touches?.[0]?.clientY;
    if (clientX === undefined || clientY === undefined) return;

    const relX = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const relY = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));

    const px = Math.round(relX * 511);
    const py = Math.round(relY * 511);
    setCoords({ x: px, y: py });
  };

  // Helper to extract pixel intensity at (x, y)
  const getPixel = (pixelData, x, y) => {
    if (!pixelData) return 128;
    const cx = Math.max(0, Math.min(511, x));
    const cy = Math.max(0, Math.min(511, y));
    const idx = (cy * 512 + cx) * 4;
    return pixelData[idx]; // R channel represents grayscale intensity
  };

  const half = Math.floor(windowSize / 2);
  const rows = [];
  let totalDeltaPlus = 0;
  let totalDeltaMinus = 0;
  let totalDeltas = 0;

  for (let dy = -half; dy <= half; dy++) {
    const row = [];
    for (let dx = -half; dx <= half; dx++) {
      const gx = coords.x + dx;
      const gy = coords.y + dy;
      const cVal = getPixel(coverPixels, gx, gy);
      const sVal = getPixel(stegoPixels, gx, gy);
      const delta = isPaired ? sVal - cVal : 0;

      if (delta === 1) totalDeltaPlus++;
      if (delta === -1) totalDeltaMinus++;
      if (delta !== 0) totalDeltas++;

      row.push({
        gx,
        gy,
        isCenter: dx === 0 && dy === 0,
        cVal,
        sVal,
        delta,
        lsbC: cVal & 1,
        lsbS: sVal & 1,
      });
    }
    rows.push(row);
  }

  const centerPixel = rows[half]?.[half] || { cVal: 128, sVal: 128, delta: 0, lsbC: 0, lsbS: 0 };
  const coverBits = to8Bit(centerPixel.cVal);
  const stegoBits = to8Bit(centerPixel.sVal);
  const totalWindowPixels = windowSize * windowSize;
  const localPerturbationRate = ((totalDeltas / totalWindowPixels) * 100).toFixed(1);

  return (
    <div className="p-6 rounded-2xl bg-[#070D1A]/95 border border-[#1B2B48] shadow-[0_4px_30px_rgba(0,0,0,0.6)] space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-[#1B2B48] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <ZoomIn className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-white tracking-wide">
              Synchronized 8× Pixel-Level Magnifier Loupe
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0A1224] text-cyan-300 border border-cyan-500/30">
              Integer Precision Inspection
            </span>
          </div>
          <p className="text-xs text-[#94A3B8] mt-1">
            Hover over the image or select preset coordinates to inspect discrete ±1 S-UNIWARD pixel alterations and exact 8-bit integer grayscale values.
          </p>
        </div>

        {/* Loupe Mode Tabs */}
        {isPaired && (
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#050914] border border-[#1B2B48] text-xs font-mono">
            <button
              onClick={() => setLoupeMode('diff')}
              className={`px-3 py-1.5 rounded-lg transition ${
                loupeMode === 'diff'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                  : 'text-[#64748B] hover:text-white'
              }`}
            >
              ±1 Perturbations
            </button>
            <button
              onClick={() => setLoupeMode('dual')}
              className={`px-3 py-1.5 rounded-lg transition ${
                loupeMode === 'dual'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                  : 'text-[#64748B] hover:text-white'
              }`}
            >
              Side-by-Side Values
            </button>
          </div>
        )}
      </div>

      {/* Main Grid: Interactive Canvas on Left, Magnified Loupe on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Interactive Thumbnail with Reticle (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="relative w-full aspect-square max-w-[320px] mx-auto rounded-xl overflow-hidden border border-[#1B2B48] bg-black shadow-xl cursor-crosshair group select-none">
            <div
              ref={containerRef}
              onMouseMove={handlePointerMove}
              onTouchMove={handlePointerMove}
              onClick={handlePointerMove}
              className="w-full h-full relative"
            >
              <img
                src={stegoSrc || currentSrc || coverSrc}
                alt="Inspection Carrier"
                className="w-full h-full object-cover pointer-events-none"
              />

              {/* Crosshair guidelines across image */}
              <div
                style={{ left: `${(coords.x / 512) * 100}%` }}
                className="absolute top-0 bottom-0 w-[1px] bg-cyan-400/40 pointer-events-none"
              />
              <div
                style={{ top: `${(coords.y / 512) * 100}%` }}
                className="absolute left-0 right-0 h-[1px] bg-cyan-400/40 pointer-events-none"
              />

              {/* Glowing Target Reticle Box */}
              <div
                style={{
                  left: `${(coords.x / 512) * 100}%`,
                  top: `${(coords.y / 512) * 100}%`,
                  width: `${(windowSize / 512) * 100 * 2.8}%`,
                  height: `${(windowSize / 512) * 100 * 2.8}%`,
                  transform: 'translate(-50%, -50%)',
                }}
                className="absolute border-2 border-cyan-400 bg-cyan-400/20 rounded shadow-[0_0_16px_#00F0FF] pointer-events-none transition-all duration-75"
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#00F0FF]"></div>
                </div>
              </div>

              {/* Floating Coordinate Pill */}
              <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-md bg-[#070D1A]/95 backdrop-blur border border-cyan-500/40 text-[11px] font-mono text-cyan-200 flex items-center gap-1.5 shadow-[0_0_12px_rgba(6,182,212,0.25)]">
                <Crosshair className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                <span>X: <strong className="text-white">{coords.x}</strong> px, Y: <strong className="text-white">{coords.y}</strong> px</span>
              </div>
            </div>
          </div>

          {/* Quick-Jump Coordinate Presets */}
          <div className="space-y-1.5">
            <span className="text-[10px] uppercase font-bold text-[#64748B] tracking-wider block">
              Examiner Demonstration Quick Jumps:
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setCoords({ x: 190, y: 410 })}
                className={`p-2 rounded-lg text-left border transition ${
                  coords.x === 190 && coords.y === 410
                    ? 'bg-rose-950/40 border-rose-500/50 text-rose-200 shadow-[0_0_12px_rgba(244,63,94,0.25)]'
                    : 'bg-[#0A1224] border-[#1B2B48] text-[#94A3B8] hover:text-white hover:border-cyan-500/40'
                }`}
              >
                <div className="flex items-center gap-1 font-semibold text-[11px]">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  <span>Dense Texture (190, 410)</span>
                </div>
                <span className="text-[10px] text-[#64748B] block mt-0.5">
                  High embedding: 46/81 flips (56.8%)
                </span>
              </button>

              <button
                type="button"
                onClick={() => setCoords({ x: 130, y: 50 })}
                className={`p-2 rounded-lg text-left border transition ${
                  coords.x === 130 && coords.y === 50
                    ? 'bg-cyan-950/40 border-cyan-500/50 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                    : 'bg-[#0A1224] border-[#1B2B48] text-[#94A3B8] hover:text-white hover:border-cyan-500/40'
                }`}
              >
                <div className="flex items-center gap-1 font-semibold text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Smooth Sky (130, 50)</span>
                </div>
                <span className="text-[10px] text-[#64748B] block mt-0.5">
                  Untouched: 0/81 flips (0 Cost)
                </span>
              </button>

              <button
                type="button"
                onClick={() => setCoords({ x: 256, y: 256 })}
                className={`p-2 rounded-lg text-left border transition ${
                  coords.x === 256 && coords.y === 256
                    ? 'bg-cyan-950/40 border-cyan-500/50 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                    : 'bg-[#0A1224] border-[#1B2B48] text-[#94A3B8] hover:text-white hover:border-cyan-500/40'
                }`}
              >
                <div className="flex items-center gap-1 font-semibold text-[11px]">
                  <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Center Core (256, 256)</span>
                </div>
                <span className="text-[10px] text-[#64748B] block mt-0.5">
                  Focal center of carrier image
                </span>
              </button>

              <button
                type="button"
                onClick={() => setCoords({ x: 380, y: 220 })}
                className={`p-2 rounded-lg text-left border transition ${
                  coords.x === 380 && coords.y === 220
                    ? 'bg-cyan-950/40 border-cyan-500/50 text-cyan-200 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                    : 'bg-[#0A1224] border-[#1B2B48] text-[#94A3B8] hover:text-white hover:border-cyan-500/40'
                }`}
              >
                <div className="flex items-center gap-1 font-semibold text-[11px]">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Edge Zone (380, 220)</span>
                </div>
                <span className="text-[10px] text-[#64748B] block mt-0.5">
                  Mid-frequency edge gradient
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Magnified Micro-Grid & Integer Matrix (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Microscopic Grid Canvas */}
          <div className="p-4 rounded-xl bg-[#050914] border border-[#1B2B48] shadow-inner">
            <div className="flex justify-between items-center mb-3 text-xs">
              <span className="font-semibold text-white flex items-center gap-1.5 font-mono">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span>8× Magnified {windowSize}×{windowSize} Micro-Matrix</span>
              </span>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-[#0A1224] p-0.5 rounded-lg border border-[#1B2B48] text-[10px] font-mono">
                  <span className="text-[#64748B] px-1.5">Aperture:</span>
                  {[5, 7, 9].map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setWindowSize(size)}
                      className={`px-1.5 py-0.5 rounded transition ${
                        windowSize === size
                          ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40 shadow-sm'
                          : 'text-[#64748B] hover:text-white'
                      }`}
                    >
                      {size}×{size}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Matrix Cells */}
            <div className="flex justify-center overflow-x-auto pb-2">
              <div
                className="grid gap-1 select-none"
                style={{
                  gridTemplateColumns: `repeat(${windowSize}, minmax(0, 1fr))`,
                }}
              >
                {rows.flatMap((row, rIdx) =>
                  row.map((cell, cIdx) => {
                    const isPlus = cell.delta === 1;
                    const isMinus = cell.delta === -1;

                    let bgStyle = {
                      backgroundColor: `rgb(${cell.sVal}, ${cell.sVal}, ${cell.sVal})`,
                    };

                    let borderClass = 'border-[#292929]';
                    let textClass = cell.sVal > 140 ? 'text-black font-extrabold' : 'text-white font-extrabold';

                    if (cell.isCenter) {
                      borderClass = 'ring-2 ring-cyan-400 ring-offset-1 ring-offset-[#070D1A]';
                    }

                    if (isPlus) {
                      borderClass += ' border-rose-400 bg-rose-950/70 text-rose-300 shadow-[0_0_8px_rgba(244,63,94,0.7)]';
                    } else if (isMinus) {
                      borderClass += ' border-cyan-400 bg-cyan-950/70 text-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.7)]';
                    }

                    return (
                      <div
                        key={`${rIdx}-${cIdx}`}
                        style={bgStyle}
                        title={`Coord (${cell.gx}, ${cell.gy})\nCover: ${cell.cVal} (LSB: ${cell.lsbC})\nStego: ${cell.sVal} (LSB: ${cell.lsbS})\nDelta: ${cell.delta > 0 ? '+' : ''}${cell.delta}`}
                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded flex flex-col items-center justify-center border text-[10px] font-mono font-bold transition-all relative ${borderClass}`}
                      >
                        {/* Numeric Integer Grayscale Display */}
                        <span className={`leading-none ${textClass}`}>
                          {loupeMode === 'diff'
                            ? cell.delta !== 0
                              ? `${cell.delta > 0 ? '+' : ''}${cell.delta}`
                              : cell.sVal
                            : cell.sVal}
                        </span>

                        {/* Delta indicator badge */}
                        {cell.delta !== 0 && (
                          <span
                            className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full flex items-center justify-center text-[7px] font-extrabold shadow-sm ${
                              isPlus ? 'bg-rose-500 text-white' : 'bg-cyan-500 text-black'
                            }`}
                          >
                            {isPlus ? '+' : '-'}
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] pt-3 border-t border-[#1B2B48] text-[#94A3B8] font-mono">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-rose-500 shadow-[0_0_6px_#f43f5e]"></span>
                  <span className="text-rose-400 font-semibold">+1 Perturbation</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-cyan-400 shadow-[0_0_6px_#00f0ff]"></span>
                  <span className="text-cyan-400 font-semibold">-1 Perturbation</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-[#0F1A30] border border-[#1B2B48]"></span>
                  <span className="text-[#64748B]">0 (Untouched)</span>
                </span>
              </div>
              <div className="text-cyan-200 font-semibold">
                Target Coordinate: <span className="text-white">(X: {coords.x}, Y: {coords.y})</span>
              </div>
            </div>
          </div>

          {/* Focal Center Telemetry Card */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
            <div className="p-2.5 rounded-lg bg-[#070D1A] border border-[#1B2B48]">
              <span className="text-[#64748B] block text-[10px]">Cover Value P</span>
              <span className="text-white font-bold block text-sm mt-0.5">
                {centerPixel.cVal} <span className="text-[10px] text-[#64748B] font-normal">(LSB: {centerPixel.lsbC})</span>
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-[#070D1A] border border-[#1B2B48]">
              <span className="text-[#64748B] block text-[10px]">Stego Value P'</span>
              <span className="text-cyan-300 font-bold block text-sm mt-0.5">
                {centerPixel.sVal} <span className="text-[10px] text-[#64748B] font-normal">(LSB: {centerPixel.lsbS})</span>
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-[#070D1A] border border-[#1B2B48]">
              <span className="text-[#64748B] block text-[10px]">Center Delta Δ</span>
              <span className={`font-bold block text-sm mt-0.5 ${centerPixel.delta > 0 ? 'text-rose-400' : centerPixel.delta < 0 ? 'text-cyan-400' : 'text-slate-300'}`}>
                {centerPixel.delta > 0 ? `+${centerPixel.delta}` : centerPixel.delta}
                {centerPixel.delta !== 0 ? ' (Flipped)' : ' (Clean)'}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-[#070D1A] border border-[#1B2B48]">
              <span className="text-[#64748B] block text-[10px]">{windowSize}×{windowSize} Local Flips</span>
              <span className="text-white font-bold block text-sm mt-0.5">
                {totalDeltas} / {totalWindowPixels} <span className="text-[10px] text-cyan-400 font-normal">({localPerturbationRate}%)</span>
              </span>
            </div>
          </div>

          {/* 8-Bit Binary Matrix & Bit-Flip Precision Inspector */}
          <div className="p-4 rounded-xl bg-[#050914] border border-[#1B2B48] space-y-3 font-mono text-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1B2B48] pb-2">
              <span className="font-bold text-white flex items-center gap-2">
                <Binary className="w-4 h-4 text-cyan-400" />
                <span>8-Bit Binary Architecture &amp; Bit-Flip Inspector</span>
              </span>
              <span className="text-[10px] text-[#64748B]">
                Focal Pixel: ({coords.x}, {coords.y})
              </span>
            </div>

            <div className="space-y-3">
              {/* Bit headers (b7 down to b0) */}
              <div className="grid grid-cols-8 gap-1.5 text-center text-[10px] text-[#64748B] font-bold">
                <div>b7 <span className="text-[8px] font-normal block">(MSB)</span></div>
                <div>b6</div>
                <div>b5</div>
                <div>b4</div>
                <div>b3</div>
                <div>b2</div>
                <div>b1</div>
                <div>b0 <span className="text-[8px] font-normal text-cyan-400 block">(LSB)</span></div>
              </div>

              {/* Cover Byte */}
              {isPaired && (
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[10px] text-[#94A3B8]">
                    <span>Cover Byte (P = {centerPixel.cVal}):</span>
                    <span className="text-[#64748B]">0x{centerPixel.cVal.toString(16).toUpperCase().padStart(2, '0')}</span>
                  </div>
                  <div className="grid grid-cols-8 gap-1.5">
                    {coverBits.map((b) => (
                      <div
                        key={`c-${b.bitIndex}`}
                        className="py-1.5 rounded-lg bg-[#0A1224] border border-[#1B2B48] text-center font-bold text-slate-300 text-xs"
                      >
                        {b.value}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Stego Byte */}
              <div className="space-y-1">
                <div className="flex justify-between items-center text-[10px] text-[#94A3B8]">
                  <span>{isPaired ? `Stego Byte (P' = ${centerPixel.sVal}):` : `Carrier Byte (P = ${centerPixel.sVal}):`}</span>
                  <span className="text-cyan-400">0x{centerPixel.sVal.toString(16).toUpperCase().padStart(2, '0')}</span>
                </div>
                <div className="grid grid-cols-8 gap-1.5">
                  {stegoBits.map((b, idx) => {
                    const isFlipped = isPaired && b.value !== coverBits[idx].value;
                    return (
                      <div
                        key={`s-${b.bitIndex}`}
                        className={`py-1.5 rounded-lg border text-center font-bold text-xs transition ${
                          isFlipped
                            ? 'bg-rose-500/20 border-rose-400 text-rose-300 shadow-[0_0_10px_rgba(244,63,94,0.4)]'
                            : 'bg-[#0A1224] border-[#1B2B48] text-white'
                        }`}
                      >
                        {b.value}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Bit Alteration Analysis Callout */}
              {isPaired ? (
                <div className={`p-2.5 rounded-lg border text-[11px] font-sans flex items-center justify-between ${
                  centerPixel.delta !== 0
                    ? 'bg-rose-950/30 border-rose-500/40 text-rose-200'
                    : 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                }`}>
                  <div className="flex items-center gap-2">
                    {centerPixel.delta !== 0 ? (
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    )}
                    <span>
                      {centerPixel.delta !== 0 ? (
                        <>
                          <strong>Bit Modification Detected:</strong> Intensity shifted from{' '}
                          <span className="font-mono text-white">{centerPixel.cVal}</span> to{' '}
                          <span className="font-mono text-cyan-300">{centerPixel.sVal}</span> (Δ ={' '}
                          <span className="font-mono font-bold text-rose-300">
                            {centerPixel.delta > 0 ? `+${centerPixel.delta}` : centerPixel.delta}
                          </span>
                          ).
                        </>
                      ) : (
                        <>
                          <strong>Unaltered Pixel:</strong> Exact 8-bit match between Cover and Stego carrier (Δ = 0).
                        </>
                      )}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/60 border border-current/30 shrink-0 ml-2">
                    {centerPixel.delta !== 0 ? 'Perturbation' : 'Identity'}
                  </span>
                </div>
              ) : (
                <div className="p-2 rounded-lg bg-black/40 border border-[#1B2B48] text-[10px] text-[#64748B] font-sans">
                  8-bit intensity representation of focal pixel. To compare bit flips against Cover, load a paired benchmark.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


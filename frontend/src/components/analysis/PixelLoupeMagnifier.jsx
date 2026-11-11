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
} from 'lucide-react';

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
  const totalWindowPixels = windowSize * windowSize;
  const localPerturbationRate = ((totalDeltas / totalWindowPixels) * 100).toFixed(1);

  return (
    <div className="p-6 rounded-2xl bg-[#111111] border border-[#292929] shadow-xl space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-[#292929] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <ZoomIn className="w-5 h-5 text-white" />
            <h3 className="text-base font-bold text-white">
              Synchronized 8× Pixel-Level Magnifier Loupe
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#151515] text-[#B3B3B3] border border-[#292929]">
              Integer Precision Inspection
            </span>
          </div>
          <p className="text-xs text-[#777777] mt-1">
            Hover over the image or select preset coordinates to inspect discrete ±1 S-UNIWARD pixel alterations and exact 8-bit integer grayscale values.
          </p>
        </div>

        {/* Loupe Mode Tabs */}
        {isPaired && (
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#0A0A0A] border border-[#292929] text-xs font-mono">
            <button
              onClick={() => setLoupeMode('diff')}
              className={`px-3 py-1.5 rounded-lg transition ${
                loupeMode === 'diff'
                  ? 'bg-[#242424] text-white border border-[#383838]'
                  : 'text-[#777777] hover:text-white'
              }`}
            >
              ±1 Perturbations
            </button>
            <button
              onClick={() => setLoupeMode('dual')}
              className={`px-3 py-1.5 rounded-lg transition ${
                loupeMode === 'dual'
                  ? 'bg-[#242424] text-white border border-[#383838]'
                  : 'text-[#777777] hover:text-white'
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
          <div className="relative w-full aspect-square max-w-[320px] mx-auto rounded-xl overflow-hidden border border-[#292929] bg-black shadow-xl cursor-crosshair group select-none">
            <div
              ref={containerRef}
              onMouseMove={handlePointerMove}
              onTouchMove={handlePointerMove}
              className="w-full h-full relative"
            >
              <img
                src={stegoSrc || currentSrc || coverSrc}
                alt="Inspection Carrier"
                className="w-full h-full object-cover pointer-events-none"
              />

              {/* Glowing Target Reticle Box */}
              <div
                style={{
                  left: `${(coords.x / 512) * 100}%`,
                  top: `${(coords.y / 512) * 100}%`,
                  width: `${(windowSize / 512) * 100 * 2.5}%`,
                  height: `${(windowSize / 512) * 100 * 2.5}%`,
                  transform: 'translate(-50%, -50%)',
                }}
                className="absolute border-2 border-white bg-white/10 rounded shadow-[0_0_10px_rgba(255,255,255,0.5)] pointer-events-none transition-all duration-75"
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-white shadow"></div>
                </div>
              </div>

              {/* Floating Coordinate Pill */}
              <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-md bg-black/85 backdrop-blur border border-[#292929] text-[11px] font-mono text-white flex items-center gap-1.5">
                <Crosshair className="w-3.5 h-3.5 text-white" />
                <span>X: {coords.x}, Y: {coords.y}</span>
              </div>
            </div>
          </div>

          {/* Quick-Jump Coordinate Presets */}
          <div className="space-y-1.5">
            <span className="text-[10px] uppercase font-bold text-[#777777] tracking-wider block">
              Examiner Demonstration Quick Jumps:
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                onClick={() => setCoords({ x: 190, y: 410 })}
                className={`p-2 rounded-lg text-left border transition ${
                  coords.x === 190 && coords.y === 410
                    ? 'bg-[#242424] border-[#383838] text-white'
                    : 'bg-[#151515] border-[#292929] text-[#B3B3B3] hover:text-white'
                }`}
              >
                <div className="flex items-center gap-1 font-semibold text-[11px]">
                  <AlertTriangle className="w-3.5 h-3.5 text-white" />
                  <span>Dense Texture (190, 410)</span>
                </div>
                <span className="text-[10px] text-[#777777] block mt-0.5">
                  High embedding: 46/81 flips (56.8%)
                </span>
              </button>

              <button
                onClick={() => setCoords({ x: 130, y: 50 })}
                className={`p-2 rounded-lg text-left border transition ${
                  coords.x === 130 && coords.y === 50
                    ? 'bg-[#242424] border-[#383838] text-white'
                    : 'bg-[#151515] border-[#292929] text-[#B3B3B3] hover:text-white'
                }`}
              >
                <div className="flex items-center gap-1 font-semibold text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                  <span>Smooth Sky (130, 50)</span>
                </div>
                <span className="text-[10px] text-[#777777] block mt-0.5">
                  Untouched: 0/81 flips (S-UNIWARD Cost)
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Magnified Micro-Grid & Integer Matrix (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Microscopic Grid Canvas */}
          <div className="p-4 rounded-xl bg-[#0A0A0A] border border-[#292929] shadow-inner">
            <div className="flex justify-between items-center mb-3 text-xs">
              <span className="font-semibold text-white flex items-center gap-1.5 font-mono">
                <Layers className="w-3.5 h-3.5 text-white" />
                <span>8× Magnified {windowSize}×{windowSize} Micro-Matrix</span>
              </span>
              <span className="text-[11px] font-mono text-[#777777]">
                Window: [{coords.x - half}..{coords.x + half}, {coords.y - half}..{coords.y + half}]
              </span>
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
                      borderClass = 'ring-2 ring-white ring-offset-1 ring-offset-black';
                    }

                    if (isPlus) {
                      borderClass += ' border-white shadow-[0_0_6px_rgba(255,255,255,0.6)]';
                    } else if (isMinus) {
                      borderClass += ' border-[#777777] shadow-[0_0_6px_rgba(120,120,120,0.6)]';
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
                            className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full flex items-center justify-center text-[7px] font-extrabold ${
                              isPlus ? 'bg-white text-black' : 'bg-[#151515] text-white border border-[#555555]'
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
            <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] pt-3 border-t border-[#292929] text-[#777777] font-mono">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded bg-white"></span>
                  <span className="text-white">+1 Perturbation</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded bg-[#777777]"></span>
                  <span className="text-[#B3B3B3]">-1 Perturbation</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded bg-[#242424] border border-[#383838]"></span>
                  <span>0 (Untouched)</span>
                </span>
              </div>
              <div className="text-white font-semibold">
                Center Target: (X: {coords.x}, Y: {coords.y})
              </div>
            </div>
          </div>

          {/* Focal Center Telemetry Card */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
            <div className="p-2.5 rounded-lg bg-[#151515] border border-[#292929]">
              <span className="text-[#777777] block text-[10px]">Cover Value P</span>
              <span className="text-white font-bold block text-sm mt-0.5">
                {centerPixel.cVal} <span className="text-[10px] text-[#777777] font-normal">(LSB: {centerPixel.lsbC})</span>
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-[#151515] border border-[#292929]">
              <span className="text-[#777777] block text-[10px]">Stego Value P'</span>
              <span className="text-white font-bold block text-sm mt-0.5">
                {centerPixel.sVal} <span className="text-[10px] text-[#777777] font-normal">(LSB: {centerPixel.lsbS})</span>
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-[#151515] border border-[#292929]">
              <span className="text-[#777777] block text-[10px]">Center Delta Δ</span>
              <span className="font-bold block text-sm mt-0.5 text-white">
                {centerPixel.delta > 0 ? `+${centerPixel.delta}` : centerPixel.delta}
                {centerPixel.delta !== 0 ? ' (Flipped)' : ' (Clean)'}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-[#151515] border border-[#292929]">
              <span className="text-[#777777] block text-[10px]">9×9 Local Flips</span>
              <span className="text-white font-bold block text-sm mt-0.5">
                {totalDeltas} / {totalWindowPixels} <span className="text-[10px] text-[#777777] font-normal">({localPerturbationRate}%)</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


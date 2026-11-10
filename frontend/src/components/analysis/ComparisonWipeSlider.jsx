import React, { useState, useRef, useEffect } from 'react';
import {
  Split,
  Eye,
  Sliders,
  Sparkles,
  Layers,
  Play,
  Pause,
  RefreshCw,
  Maximize2,
} from 'lucide-react';

/**
 * ComparisonWipeSlider
 *
 * Interactive split-screen curtain wipe slider.
 * Allows examiners to sweep a vertical divider across the image to reveal
 * the high-pass residual heatmap or amplified +/-1 perturbation map
 * directly overlaid on the original photographic carrier.
 */
export default function ComparisonWipeSlider({
  originalSrc,
  heatmapSrc,
  diffMapSrc,
  coverSrc = '/samples/sample_cover.png',
  stegoSrc = '/samples/sample_stego.png',
  isPaired = false,
}) {
  const [sliderPos, setSliderPos] = useState(50); // percentage 0 - 100
  const [isDragging, setIsDragging] = useState(false);
  const [activeOverlay, setActiveOverlay] = useState(heatmapSrc ? 'heatmap' : 'diff'); // 'heatmap' | 'diff' | 'cover_stego'
  const [isAutoSweeping, setIsAutoSweeping] = useState(false);

  const containerRef = useRef(null);
  const sweepDirRef = useRef(1); // 1 = right, -1 = left

  // Auto sweep animation
  useEffect(() => {
    let animId;
    if (isAutoSweeping) {
      const step = () => {
        setSliderPos((prev) => {
          let next = prev + sweepDirRef.current * 0.4;
          if (next >= 95) {
            sweepDirRef.current = -1;
            next = 95;
          } else if (next <= 5) {
            sweepDirRef.current = 1;
            next = 5;
          }
          return next;
        });
        animId = requestAnimationFrame(step);
      };
      animId = requestAnimationFrame(step);
    }
    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [isAutoSweeping]);

  // Pointer event handlers
  const handlePointerDown = (e) => {
    setIsDragging(true);
    setIsAutoSweeping(false);
    updatePosition(e);
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    updatePosition(e);
  };

  const handlePointerUp = () => {
    setIsDragging(false);
  };

  const updatePosition = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = e.clientX ?? e.touches?.[0]?.clientX;
    if (clientX === undefined) return;
    const x = clientX - rect.left;
    const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPos(pct);
  };

  // Determine left and right images based on selected mode
  let leftImage = originalSrc;
  let rightImage = heatmapSrc || originalSrc;
  let leftLabel = 'Original Carrier';
  let rightLabel = 'Residual Heatmap';

  if (activeOverlay === 'diff' && diffMapSrc) {
    rightImage = diffMapSrc;
    rightLabel = 'Amplified Diff (±1 Perturbations)';
  } else if (activeOverlay === 'cover_stego') {
    leftImage = coverSrc;
    rightImage = stegoSrc;
    leftLabel = 'Clean Cover Baseline (#5001)';
    rightLabel = 'Stego Carrier (0.4 bpp)';
  }

  return (
    <div className="p-6 rounded-2xl bg-gray-900/90 border border-gray-800 shadow-xl space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-gray-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Split className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-white">
              Interactive Split-Screen Curtain Wipe
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
              Direct Spatial Superimposition
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Drag the vertical divider across the image to reveal forensic noise residuals and discrete perturbations directly aligned with image texture.
          </p>
        </div>

        {/* Overlay Mode Switcher */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-gray-950 border border-gray-800 text-xs font-mono">
          {heatmapSrc && (
            <button
              onClick={() => {
                setActiveOverlay('heatmap');
                setIsAutoSweeping(false);
              }}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeOverlay === 'heatmap'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Residual Heatmap
            </button>
          )}

          {diffMapSrc && (
            <button
              onClick={() => {
                setActiveOverlay('diff');
                setIsAutoSweeping(false);
              }}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeOverlay === 'diff'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              ±1 Perturbations
            </button>
          )}

          {isPaired && (
            <button
              onClick={() => {
                setActiveOverlay('cover_stego');
                setIsAutoSweeping(false);
              }}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeOverlay === 'cover_stego'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Cover vs Stego
            </button>
          )}
        </div>
      </div>

      {/* Main Wipe Viewport */}
      <div className="max-w-2xl mx-auto space-y-4">
        <div
          ref={containerRef}
          onMouseDown={handlePointerDown}
          onMouseMove={handlePointerMove}
          onMouseUp={handlePointerUp}
          onTouchStart={handlePointerDown}
          onTouchMove={handlePointerMove}
          onTouchEnd={handlePointerUp}
          className="relative w-full aspect-square max-w-[480px] mx-auto rounded-2xl overflow-hidden border-2 border-gray-700 bg-black shadow-2xl select-none cursor-ew-resize group"
        >
          {/* Base Layer: Left Image */}
          <img
            src={leftImage}
            alt={leftLabel}
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          />

          {/* Top Layer: Right Image (Clipped via clip-path) */}
          <div
            style={{
              clipPath: `inset(0 0 0 ${sliderPos}%)`,
            }}
            className="absolute inset-0 w-full h-full pointer-events-none"
          >
            <img
              src={rightImage}
              alt={rightLabel}
              className="w-full h-full object-cover pointer-events-none"
            />
          </div>

          {/* Draggable Divider Line */}
          <div
            style={{ left: `${sliderPos}%` }}
            className="absolute top-0 bottom-0 w-0.5 bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.9)] pointer-events-none"
          >
            {/* Center Circular Grabber Handle */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-gray-900 border-2 border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.7)] flex items-center justify-center text-cyan-300">
              <Split className="w-4 h-4 transform rotate-90" />
            </div>
          </div>

          {/* Left Label Pill */}
          <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-black/75 backdrop-blur border border-gray-800 text-[10px] font-mono text-cyan-300 pointer-events-none">
            {leftLabel} ({sliderPos.toFixed(0)}%)
          </div>

          {/* Right Label Pill */}
          <div className="absolute top-3 right-3 px-2.5 py-1 rounded-md bg-black/75 backdrop-blur border border-gray-800 text-[10px] font-mono text-rose-300 pointer-events-none">
            {rightLabel} ({(100 - sliderPos).toFixed(0)}%)
          </div>

          {/* Bottom Coordinate Bar */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/80 backdrop-blur border border-gray-800 text-[10px] font-mono text-gray-300 pointer-events-none">
            Curtain Split Position: <span className="text-cyan-400 font-bold">{sliderPos.toFixed(1)}%</span>
          </div>
        </div>

        {/* Playback Controls & Quick Presets */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-gray-950 border border-gray-800 text-xs font-mono">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAutoSweeping((prev) => !prev)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition ${
                isAutoSweeping
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-cyan-600/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-600/30'
              }`}
            >
              {isAutoSweeping ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>Pause Sweep</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span>Auto Radar Sweep</span>
                </>
              )}
            </button>
            <button
              onClick={() => {
                setIsAutoSweeping(false);
                setSliderPos(50);
              }}
              className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition"
              title="Reset to 50%"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick Jump Buttons */}
          <div className="flex items-center gap-1 text-[11px]">
            <span className="text-gray-500 mr-1 hidden sm:inline">Position:</span>
            {[25, 50, 75].map((pos) => (
              <button
                key={pos}
                onClick={() => {
                  setIsAutoSweeping(false);
                  setSliderPos(pos);
                }}
                className={`px-2.5 py-1 rounded transition ${
                  Math.round(sliderPos) === pos
                    ? 'bg-cyan-500 text-gray-950 font-bold'
                    : 'bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white'
                }`}
              >
                {pos}%
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


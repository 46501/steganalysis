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
    <div className="p-6 rounded-2xl bg-[#111111] border border-[#292929] shadow-xl space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-[#292929] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Split className="w-5 h-5 text-white" />
            <h3 className="text-base font-bold text-white">
              Interactive Split-Screen Curtain Wipe
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#151515] text-[#B3B3B3] border border-[#292929]">
              Direct Spatial Superimposition
            </span>
          </div>
          <p className="text-xs text-[#777777] mt-1">
            Drag the vertical divider across the image to reveal forensic noise residuals and discrete perturbations directly aligned with image texture.
          </p>
        </div>

        {/* Overlay Mode Switcher */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-[#0A0A0A] border border-[#292929] text-xs font-mono">
          {heatmapSrc && (
            <button
              onClick={() => {
                setActiveOverlay('heatmap');
                setIsAutoSweeping(false);
              }}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeOverlay === 'heatmap'
                  ? 'bg-[#242424] text-white border border-[#383838] shadow-sm'
                  : 'text-[#777777] hover:text-white'
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
                  ? 'bg-[#242424] text-white border border-[#383838] shadow-sm'
                  : 'text-[#777777] hover:text-white'
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
                  ? 'bg-[#242424] text-white border border-[#383838] shadow-sm'
                  : 'text-[#777777] hover:text-white'
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
          className="relative w-full aspect-square max-w-[480px] mx-auto rounded-2xl overflow-hidden border border-[#292929] bg-black shadow-2xl select-none cursor-ew-resize group"
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
            className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_10px_rgba(255,255,255,0.7)] pointer-events-none"
          >
            {/* Center Circular Grabber Handle */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-[#111111] border-2 border-white shadow-[0_0_12px_rgba(255,255,255,0.5)] flex items-center justify-center text-white">
              <Split className="w-4 h-4 transform rotate-90" />
            </div>
          </div>

          {/* Left Label Pill */}
          <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-black/85 backdrop-blur border border-[#292929] text-[10px] font-mono text-white pointer-events-none">
            {leftLabel} ({sliderPos.toFixed(0)}%)
          </div>

          {/* Right Label Pill */}
          <div className="absolute top-3 right-3 px-2.5 py-1 rounded-md bg-black/85 backdrop-blur border border-[#292929] text-[10px] font-mono text-[#B3B3B3] pointer-events-none">
            {rightLabel} ({(100 - sliderPos).toFixed(0)}%)
          </div>

          {/* Bottom Coordinate Bar */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/90 backdrop-blur border border-[#292929] text-[10px] font-mono text-[#B3B3B3] pointer-events-none">
            Curtain Split Position: <span className="text-white font-bold">{sliderPos.toFixed(1)}%</span>
          </div>
        </div>

        {/* Playback Controls & Quick Presets */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-[#0A0A0A] border border-[#292929] text-xs font-mono">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAutoSweeping((prev) => !prev)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition bg-[#1C1C1C] hover:bg-[#242424] text-white border border-[#292929]"
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
              className="p-1.5 rounded-lg bg-[#151515] hover:bg-[#222222] text-[#B3B3B3] hover:text-white border border-[#292929] transition"
              title="Reset to 50%"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick Jump Buttons */}
          <div className="flex items-center gap-1 text-[11px]">
            <span className="text-[#777777] mr-1 hidden sm:inline">Position:</span>
            {[25, 50, 75].map((pos) => (
              <button
                key={pos}
                onClick={() => {
                  setIsAutoSweeping(false);
                  setSliderPos(pos);
                }}
                className={`px-2.5 py-1 rounded transition ${
                  Math.round(sliderPos) === pos
                    ? 'bg-white text-black font-bold'
                    : 'bg-[#151515] hover:bg-[#222222] text-[#777777] hover:text-white border border-[#292929]'
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


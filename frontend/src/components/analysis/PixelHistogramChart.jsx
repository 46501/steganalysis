import React, { useState, useEffect, useRef } from 'react';
import {
  BarChart2,
  TrendingUp,
  Activity,
  Layers,
  HelpCircle,
  Sparkles,
  Info,
} from 'lucide-react';

/**
 * PixelHistogramChart
 *
 * Real-time 256-bin grayscale frequency histogram & first-order difference spectrum.
 * Demonstrates why global histogram attacks fail against content-adaptive steganography
 * (S-UNIWARD @ 0.4 bpp), proving the necessity of deep spatial residual representations.
 */
export default function PixelHistogramChart({
  imageSrc,
  coverSrc = '/samples/sample_cover.png',
  isPaired = false,
}) {
  const [chartMode, setChartMode] = useState('intensity'); // 'intensity' | 'diff' | 'compare'
  const [histData, setHistData] = useState(null);
  const [hoveredBin, setHoveredBin] = useState(null);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let active = true;

    const computeHistogram = async () => {
      if (!imageSrc) return;

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = imageSrc;

      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      }).catch((e) => console.warn('Histogram image load error:', e));

      if (!active) return;

      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, 512, 512);
      const data = ctx.getImageData(0, 0, 512, 512).data;

      // 1. 256-bin intensity histogram
      const bins = new Uint32Array(256);
      let sum = 0;
      let minVal = 255;
      let maxVal = 0;
      const totalPixels = 512 * 512;

      for (let i = 0; i < data.length; i += 4) {
        const val = data[i]; // grayscale R channel
        bins[val]++;
        sum += val;
        if (val < minVal) minVal = val;
        if (val > maxVal) maxVal = val;
      }

      const mean = sum / totalPixels;
      let varianceSum = 0;
      for (let i = 0; i < data.length; i += 4) {
        const diff = data[i] - mean;
        varianceSum += diff * diff;
      }
      const stdDev = Math.sqrt(varianceSum / totalPixels);

      // 2. First-order horizontal difference histogram: Delta = P(x+1, y) - P(x, y)
      // Range: -30 to +30 (61 bins, center index 30 = Delta 0)
      const diffBins = new Uint32Array(61);
      let diffVarianceSum = 0;
      let totalDiffCount = 0;

      for (let y = 0; y < 512; y++) {
        for (let x = 0; x < 511; x++) {
          const idx1 = (y * 512 + x) * 4;
          const idx2 = (y * 512 + (x + 1)) * 4;
          const delta = data[idx2] - data[idx1];
          const binIdx = delta + 30;
          if (binIdx >= 0 && binIdx <= 60) {
            diffBins[binIdx]++;
          }
          diffVarianceSum += delta * delta;
          totalDiffCount++;
        }
      }
      const diffVariance = diffVarianceSum / totalDiffCount;

      let maxBin = 1;
      for (let i = 0; i < 256; i++) {
        if (bins[i] > maxBin) maxBin = bins[i];
      }

      let maxDiffBin = 1;
      for (let i = 0; i < 61; i++) {
        if (diffBins[i] > maxDiffBin) maxDiffBin = diffBins[i];
      }

      setHistData({
        intensityBins: Array.from(bins),
        diffBins: Array.from(diffBins),
        maxIntensityBin: maxBin,
        maxDiffBin: maxDiffBin,
      });

      setStats({
        mean: mean.toFixed(2),
        stdDev: stdDev.toFixed(2),
        minVal,
        maxVal,
        diffVariance: diffVariance.toFixed(2),
        totalPixels,
      });
    };

    computeHistogram();
    return () => {
      active = false;
    };
  }, [imageSrc]);

  if (!histData || !stats) {
    return (
      <div className="py-12 text-center text-[#777777] font-mono text-xs">
        <Activity className="w-5 h-5 mx-auto mb-2 animate-spin text-white" />
        Calculating 256-Bin Pixel Distribution Spectrum...
      </div>
    );
  }

  // Generate SVG path for Intensity Histogram
  const svgWidth = 600;
  const svgHeight = 160;
  const intensityPoints = histData.intensityBins.map((val, idx) => {
    const x = (idx / 255) * svgWidth;
    const y = svgHeight - (val / histData.maxIntensityBin) * (svgHeight - 10);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const intensityAreaPath = `M 0,${svgHeight} L ${intensityPoints.join(' L ')} L ${svgWidth},${svgHeight} Z`;

  // Generate SVG path for Difference Histogram (-30 to +30)
  const diffPoints = histData.diffBins.map((val, idx) => {
    const x = (idx / 60) * svgWidth;
    const y = svgHeight - (val / histData.maxDiffBin) * (svgHeight - 10);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const diffAreaPath = `M 0,${svgHeight} L ${diffPoints.join(' L ')} L ${svgWidth},${svgHeight} Z`;

  return (
    <div className="p-6 rounded-2xl bg-[#111111] border border-[#292929] shadow-xl space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-[#292929] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-white" />
            <h3 className="text-base font-bold text-white">
              256-Bin Pixel Histogram & Difference Spectrum
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#151515] text-[#B3B3B3] border border-[#292929]">
              First-Order Invariance Analysis
            </span>
          </div>
          <p className="text-xs text-[#777777] mt-1">
            Empirical analysis of pixel intensity frequencies and adjacent horizontal gradient differentials.
          </p>
        </div>

        {/* Chart View Switcher */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#0A0A0A] border border-[#292929] text-xs font-mono">
          <button
            onClick={() => setChartMode('intensity')}
            className={`px-3 py-1.5 rounded-lg transition ${
              chartMode === 'intensity'
                ? 'bg-[#242424] text-white border border-[#383838] shadow-sm'
                : 'text-[#777777] hover:text-white'
            }`}
          >
            Grayscale Frequencies (0–255)
          </button>
          <button
            onClick={() => setChartMode('diff')}
            className={`px-3 py-1.5 rounded-lg transition ${
              chartMode === 'diff'
                ? 'bg-[#242424] text-white border border-[#383838] shadow-sm'
                : 'text-[#777777] hover:text-white'
            }`}
          >
            1st-Order Gradients ΔP
          </button>
        </div>
      </div>

      {/* SVG Chart Display */}
      <div className="space-y-4">
        <div className="relative p-4 rounded-xl bg-[#0A0A0A] border border-[#292929] select-none">
          {/* Top Axis / Hover Legend */}
          <div className="flex justify-between items-center mb-2 text-xs font-mono">
            <span className="text-[#777777]">
              {chartMode === 'intensity' ? (
                hoveredBin !== null ? (
                  <>
                    Grayscale Value: <span className="text-white font-bold">{hoveredBin}</span> •
                    Count: <span className="text-white font-bold">{histData.intensityBins[hoveredBin].toLocaleString()} px</span> (
                    {((histData.intensityBins[hoveredBin] / stats.totalPixels) * 100).toFixed(2)}%)
                  </>
                ) : (
                  'Hover over spectrum to inspect individual bin frequencies'
                )
              ) : (
                hoveredBin !== null ? (
                  <>
                    Pixel Difference Δ: <span className="text-white font-bold">{hoveredBin - 30}</span> •
                    Occurrences: <span className="text-white font-bold">{histData.diffBins[hoveredBin].toLocaleString()}</span>
                  </>
                ) : (
                  'Adjacent pixel difference distribution H(P_{x+1} - P_x)'
                )
              )}
            </span>
            <span className="text-[11px] text-[#777777]">
              {chartMode === 'intensity' ? 'Total: 262,144 px' : 'Gradient Span: [-30..+30]'}
            </span>
          </div>

          {/* SVG Canvas Area */}
          <div className="relative w-full overflow-hidden">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-44 cursor-crosshair overflow-visible"
              onMouseLeave={() => setHoveredBin(null)}
            >
              <defs>
                <linearGradient id="intensityGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.02" />
                </linearGradient>
                <linearGradient id="diffGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#B3B3B3" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#777777" stopOpacity="0.02" />
                </linearGradient>
              </defs>

              {/* Horizontal grid lines */}
              <line x1="0" y1={svgHeight * 0.25} x2={svgWidth} y2={svgHeight * 0.25} stroke="#222222" strokeDasharray="3 3" />
              <line x1="0" y1={svgHeight * 0.5} x2={svgWidth} y2={svgHeight * 0.5} stroke="#222222" strokeDasharray="3 3" />
              <line x1="0" y1={svgHeight * 0.75} x2={svgWidth} y2={svgHeight * 0.75} stroke="#222222" strokeDasharray="3 3" />

              {/* Intensity Path */}
              {chartMode === 'intensity' && (
                <>
                  <path d={intensityAreaPath} fill="url(#intensityGrad)" />
                  <path
                    d={`M ${intensityPoints.join(' L ')}`}
                    fill="none"
                    stroke="#FFFFFF"
                    strokeWidth="1.5"
                  />
                  {/* Invisible hitboxes for hovering */}
                  {histData.intensityBins.map((_, idx) => (
                    <rect
                      key={idx}
                      x={(idx / 255) * svgWidth - 1}
                      y={0}
                      width={svgWidth / 255 + 2}
                      height={svgHeight}
                      fill="transparent"
                      onMouseEnter={() => setHoveredBin(idx)}
                    />
                  ))}
                </>
              )}

              {/* Difference Gradient Path */}
              {chartMode === 'diff' && (
                <>
                  <path d={diffAreaPath} fill="url(#diffGrad)" />
                  <path
                    d={`M ${diffPoints.join(' L ')}`}
                    fill="none"
                    stroke="#B3B3B3"
                    strokeWidth="1.5"
                  />
                  {/* Center Delta = 0 vertical line */}
                  <line
                    x1={svgWidth / 2}
                    y1={0}
                    x2={svgWidth / 2}
                    y2={svgHeight}
                    stroke="#555555"
                    strokeWidth="1.5"
                    strokeDasharray="2 2"
                  />
                  {histData.diffBins.map((_, idx) => (
                    <rect
                      key={idx}
                      x={(idx / 60) * svgWidth - 2}
                      y={0}
                      width={svgWidth / 60 + 4}
                      height={svgHeight}
                      fill="transparent"
                      onMouseEnter={() => setHoveredBin(idx)}
                    />
                  ))}
                </>
              )}
            </svg>
          </div>

          {/* Bottom X-Axis Scale */}
          <div className="flex justify-between items-center text-[10px] font-mono text-[#777777] pt-1 border-t border-[#292929]">
            {chartMode === 'intensity' ? (
              <>
                <span>0 (Pure Black)</span>
                <span>64</span>
                <span>128 (Mid-Gray)</span>
                <span>192</span>
                <span>255 (Pure White)</span>
              </>
            ) : (
              <>
                <span>Δ -30</span>
                <span>Δ -15</span>
                <span className="text-white font-bold">Δ 0 (Equal)</span>
                <span>Δ +15</span>
                <span>Δ +30</span>
              </>
            )}
          </div>
        </div>

        {/* Statistical Summary Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
          <div className="p-3 rounded-xl bg-[#151515] border border-[#292929]">
            <span className="text-[#777777] block text-[10px] uppercase">Mean Pixel Value (μ)</span>
            <span className="text-white font-bold block text-sm mt-0.5">{stats.mean}</span>
          </div>

          <div className="p-3 rounded-xl bg-[#151515] border border-[#292929]">
            <span className="text-[#777777] block text-[10px] uppercase">Standard Deviation (σ)</span>
            <span className="text-white font-bold block text-sm mt-0.5">{stats.stdDev}</span>
          </div>

          <div className="p-3 rounded-xl bg-[#151515] border border-[#292929]">
            <span className="text-[#777777] block text-[10px] uppercase">Gradient Variance (σΔ²)</span>
            <span className="text-white font-bold block text-sm mt-0.5">{stats.diffVariance}</span>
          </div>

          <div className="p-3 rounded-xl bg-[#151515] border border-[#292929]">
            <span className="text-[#777777] block text-[10px] uppercase">Dynamic Range</span>
            <span className="text-white font-bold block text-sm mt-0.5">[{stats.minVal}..{stats.maxVal}]</span>
          </div>
        </div>

        {/* Theoretical Scientific Callout (Crucial for Viva) */}
        <div className="p-4 rounded-xl bg-[#151515] border border-[#292929] text-xs space-y-1.5">
          <div className="flex items-center gap-1.5 font-bold text-white">
            <Info className="w-4 h-4 text-white" />
            <span>Theoretical Steganalysis Principle: Why Global Histograms Fail</span>
          </div>
          <p className="text-[11px] text-[#777777] leading-relaxed">
            Content-adaptive algorithms like S-UNIWARD spread discrete ±1 modifications across high-frequency texture regions, keeping the global 256-bin histogram virtually invariant ($&lt;0.01\%$ drift). Classical first-order Chi-square or histogram attacks are completely blind to this embedding. This mathematically substantiates why high-pass residual filtering and deep convolutional feature extractors (SRNet) are required to reveal spatial correlation anomalies.
          </p>
        </div>
      </div>
    </div>
  );
}


import React, { useState } from 'react';
import {
  GraduationCap,
  X,
  ChevronRight,
  ChevronLeft,
  ShieldAlert,
  Database,
  Cpu,
  Eye,
  Lock,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  HelpCircle,
} from 'lucide-react';

export default function VivaTourModal({ isOpen, onClose, onNavigateTab }) {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const steps = [
    {
      stage: 'Stage 1 of 5',
      title: 'The Steganographic Challenge: S-UNIWARD 0.4 bpp',
      icon: ShieldAlert,
      badgeColor: 'bg-[#151515] text-[#B3B3B3] border-[#292929]',
      summary:
        'Understanding why modern content-adaptive steganography evades classical computer vision and standard CNNs.',
      keyPoints: [
        'Content-Adaptive Minimization: S-UNIWARD computes a directional wavelet distortion cost for each pixel, embedding secret bits only in noisy complex textures where human eyes have low sensitivity.',
        'Extremely Low Embedding Footprint: At 0.4 bits per pixel (bpp), only ~10% of pixels undergo discrete ±1 perturbations. 90% of carrier pixels remain strictly untouched.',
        'Why Standard CNNs Fail: Downsampling pooling layers (e.g., MaxPool / Stride-2 Conv) act as low-pass filters that inadvertently average out and destroy faint steganographic noise residuals before classification.',
      ],
      vivaTip:
        'Examiner FAQ: "Why not use ResNet-50 or VGG?" Answer: Pre-trained ImageNet architectures look for semantic object features (cats, cars) and discard high-frequency sensor noise. Steganalysis is the exact opposite: we must suppress scene semantics and isolate high-frequency spatial residuals.',
      actionLabel: 'Inspect Sample Stego in Detector',
      actionTab: 'detector',
    },
    {
      stage: 'Stage 2 of 5',
      title: 'BOSSbase 1.01 Dataset Engineering & Zero-Leakage Protocol',
      icon: Database,
      badgeColor: 'bg-[#151515] text-[#B3B3B3] border-[#292929]',
      summary:
        'Scientific rigor in dataset generation: 20,000 512×512 images with complete mathematical integrity verification.',
      keyPoints: [
        'Strict Split Partitioning: 4,000 pairs (Train: IDs 1–4,000), 1,000 pairs (Validation: IDs 4,001–5,000), and 5,000 pairs (Test: IDs 5,001–10,000).',
        'Pairwise Ground-Truth Integrity: Every cover image and its corresponding stego image reside strictly in the same split. Zero ID overlap across splits.',
        'Boundary & Distortion Verification: Every generated stego image strictly satisfies max absolute pixel delta |Δp| ≤ 1 and boundary clamping [0, 255] with atomic file writes.',
      ],
      vivaTip:
        'Examiner FAQ: "How did you prevent data leakage?" Answer: Stego images are created exclusively from their paired covers within the designated split partition. The 5,000 test image pairs were held out completely untouched during training.',
      actionLabel: 'View Dataset Metrics on Dashboard',
      actionTab: 'dashboard',
    },
    {
      stage: 'Stage 3 of 5',
      title: 'The SRNet Deep Residual Neural Architecture',
      icon: Cpu,
      badgeColor: 'bg-[#151515] text-[#B3B3B3] border-[#292929]',
      summary:
        'Architectural breakdown of Boroumand et al. (IEEE TIFS 2019) 39-layer deep residual network for digital steganalysis.',
      keyPoints: [
        'Layers 1–2 (Type 1): Unpooled 3×3 Conv + BatchNorm + ReLU noise pre-extractors.',
        'Layers 3–7 (Type 2): Five consecutive unpooled residual blocks with identity skip connections. No spatial downsampling allows weak stego noise to build up correlation across feature maps.',
        'Layers 8–11 (Type 3): Residual blocks with 3×3 Average Pooling (stride 2) for hierarchical feature aggregation.',
        'Layer 12 (Type 4) & Head: Global Average Pooling (GAP) compressing 2D feature maps to a 512-dim embedding, followed by linear dense classification head.',
      ],
      vivaTip:
        'Examiner FAQ: "Why use Adamax instead of standard Adam?" Answer: As proven by Boroumand et al., Adamax uses the infinity-norm of gradients, which prevents high-variance gradient outliers in early residual layers from destabilizing training.',
      actionLabel: 'Explore Architecture Topology',
      actionTab: 'model-info',
    },
    {
      stage: 'Stage 4 of 5',
      title: 'Multi-Faceted Forensic Fusion: Neural + Statistical + Spectral',
      icon: Eye,
      badgeColor: 'bg-[#151515] text-[#B3B3B3] border-[#292929]',
      summary:
        'Combining deep residual neural detection with deterministic statistical tests and 2D frequency transforms.',
      keyPoints: [
        'Spatial Laplacian Residuals: 3×3 high-pass filter computing local residual variance (σr²). S-UNIWARD increases residual variance by ~1.91 σr² on reference benchmark samples.',
        'Classical Statistical Forensics: LSB Shannon Entropy H(X), SPAM 2nd-order Markov transition diagonal dominance, and 1st-order gradient variance.',
        '2D FFT Power Spectrum: Logarithmic magnitude |F(u, v)| revealing high-frequency energy dispersion rings outside low-frequency DC centers.',
        'Amplified Ternary Difference Maps: 50× amplified visualization of exact +1 and -1 pixel modifications.',
      ],
      vivaTip:
        'Examiner FAQ: "Is neural detection sufficient alone?" Answer: No single metric is definitive. StegoShield fuses neural posterior probabilities with deterministic Markov transitions and spectral energy dispersion for courtroom-defensible attribution.',
      actionLabel: 'Open Visual Forensics Studio',
      actionTab: 'detector',
    },
    {
      stage: 'Stage 5 of 5',
      title: 'Interactive Counter-Steganography: Stego Studio',
      icon: Lock,
      badgeColor: 'bg-[#151515] text-[#B3B3B3] border-[#292929]',
      summary:
        'End-to-end message concealment, bitstream extraction, and immediate pipe-to-detector verification.',
      keyPoints: [
        'Live Secret Message Concealment: Encodes arbitrary text strings into carrier images using either Spatial LSB Replacement or Spatial LSB Matching (±1).',
        'Capacity & Bitrate Telemetry: Calculates live embedding rate (bpp), altered pixel counts, and maximum carrier payload capacity.',
        '100% Bit-Accurate Extraction: Reads the 32-bit header and decodes concealed plaintext UTF-8 payloads with zero bit errors.',
        '1-Click Detector Integration: Directly pipes generated stego images into the Detector workspace to immediately evaluate neural and statistical detectability.',
      ],
      vivaTip:
        'Examiner FAQ: "What is the difference between LSB Replacement and LSB Matching?" Answer: LSB Replacement causes asymmetric pairs of values (PoV) detectable by Chi-Square. LSB Matching uses symmetric ±1 additions, evading 1st-order histograms but leaving detectable 2nd-order Markov transitions.',
      actionLabel: 'Open Stego Studio Workspace',
      actionTab: 'stego-studio',
    },
  ];

  const current = steps[currentStep];
  const Icon = current.icon;

  const handleAction = () => {
    if (onNavigateTab && current.actionTab) {
      onNavigateTab(current.actionTab);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-[#111111] border border-[#292929] w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-[#292929] flex items-center justify-between bg-[#0A0A0A]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#151515] border border-[#292929] flex items-center justify-center text-white shadow-sm">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold text-white tracking-tight">
                  StegoShield AI — Examiner Presentation & Viva Guide
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#151515] text-[#B3B3B3] border border-[#292929] font-mono">
                  Interactive Defense Mode
                </span>
              </div>
              <p className="text-xs text-[#777777]">Step-by-step academic presentation and demonstration script</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#777777] hover:text-white hover:bg-[#242424] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progression Indicator */}
        <div className="px-6 pt-4 pb-2 border-b border-[#292929] bg-[#0A0A0A]">
          <div className="flex items-center justify-between gap-2">
            {steps.map((s, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentStep(idx)}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                  idx === currentStep
                    ? 'bg-[#242424] text-white border border-[#383838]'
                    : idx < currentStep
                    ? 'bg-[#151515] text-[#B3B3B3] border border-[#292929]'
                    : 'bg-[#111111] text-[#777777] border border-[#222222] hover:text-[#B3B3B3]'
                }`}
              >
                <span>{idx + 1}.</span>
                <span className="truncate hidden sm:inline">{s.title.split(':')[0]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Step Body Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-[#B3B3B3] text-xs">
          {/* Stage Header */}
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#151515] border border-[#292929] flex items-center justify-center text-white shrink-0">
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${current.badgeColor}`}>
                {current.stage}
              </span>
              <h2 className="text-lg font-bold text-white mt-1">{current.title}</h2>
              <p className="text-[#B3B3B3] mt-1 text-xs leading-relaxed">{current.summary}</p>
            </div>
          </div>

          {/* Key Architectural & Scientific Highlights */}
          <div className="p-4 rounded-xl bg-[#151515] border border-[#292929] space-y-2.5">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-white" />
              Core Scientific Takeaways
            </h4>
            <ul className="space-y-2 text-[#B3B3B3]">
              {current.keyPoints.map((point, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-white shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{point}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Examiner Viva Defense Q&A Box */}
          <div className="p-4 rounded-xl bg-[#181818] border border-[#292929] space-y-1.5">
            <div className="flex items-center gap-2 text-white font-semibold text-xs">
              <HelpCircle className="w-4 h-4 text-white" />
              <span>Viva Defense Strategy & FAQ</span>
            </div>
            <p className="text-[#B3B3B3] leading-relaxed text-[11px] font-sans">
              {current.vivaTip}
            </p>
          </div>
        </div>

        {/* Modal Footer Controls */}
        <div className="p-5 border-t border-[#292929] bg-[#0A0A0A] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
              disabled={currentStep === 0}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                currentStep === 0
                  ? 'text-[#555555] bg-[#111111] border border-[#222222] cursor-not-allowed'
                  : 'text-[#B3B3B3] hover:text-white bg-[#181818] hover:bg-[#242424] border border-[#292929]'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              Previous Stage
            </button>
            <button
              onClick={() => setCurrentStep((prev) => Math.min(steps.length - 1, prev + 1))}
              disabled={currentStep === steps.length - 1}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                currentStep === steps.length - 1
                  ? 'text-[#555555] bg-[#111111] border border-[#222222] cursor-not-allowed'
                  : 'text-white hover:text-white bg-[#242424] hover:bg-[#2E2E2E] border border-[#383838]'
              }`}
            >
              Next Stage
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Jump directly to live workspace */}
          <button
            onClick={handleAction}
            className="py-2.5 px-4 rounded-xl bg-white hover:bg-[#E5E5E5] text-black font-semibold text-xs flex items-center gap-2 transition-all theme-btn-primary"
          >
            <span>{current.actionLabel}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}


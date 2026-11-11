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
  Award,
  BookOpen,
  Check,
  CheckCircle,
  Flame,
} from 'lucide-react';
import { playCyberClick, playCyberSuccess } from '../../utils/cyberSoundEffects';

export default function VivaTourModal({ isOpen, onClose, onNavigateTab }) {
  const [activeMode, setActiveMode] = useState('presentation'); // 'presentation' | 'drill' | 'quiz'
  const [currentStep, setCurrentStep] = useState(0);

  // Drill State
  const [drillExpanded, setDrillExpanded] = useState({});
  const [drillFilter, setDrillFilter] = useState('all'); // 'all' | 'math' | 'dataset' | 'architecture'

  // Quiz State
  const [quizIndex, setQuizIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [showQuizResult, setShowQuizResult] = useState(false);

  if (!isOpen) return null;

  const presentationSteps = [
    {
      stage: 'Stage 1 of 5',
      title: 'The Steganographic Challenge: S-UNIWARD 0.4 bpp',
      icon: ShieldAlert,
      badgeColor: 'bg-rose-950/40 text-rose-300 border-rose-500/40',
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
      badgeColor: 'bg-cyan-950/40 text-cyan-300 border-cyan-500/40',
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
      badgeColor: 'bg-cyan-950/40 text-cyan-300 border-cyan-500/40',
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
      badgeColor: 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40',
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
      title: 'Interactive Counter-Steganography: Stego Studio & ISO/IEC 27037',
      icon: Lock,
      badgeColor: 'bg-indigo-950/40 text-indigo-300 border-indigo-500/40',
      summary:
        'End-to-end message concealment, bitstream extraction, and immediate courtroom-admissible evidence reporting.',
      keyPoints: [
        'Direct Bitstream Embedding: Hide encrypted arbitrary payloads using LSB replacement with secret-key PRNG pseudo-random coordinate dispersal.',
        'Live Re-Analysis Loop: Instantly pipe manipulated images back into the forensic detection pipeline to empirically verify detectability thresholds.',
        'ISO/IEC 27037 & NIST SP 800-86 Audit Trail: Generates SHA-256 hashed forensic evidence packages with official examiner sign-off certificates.',
      ],
      vivaTip:
        'Examiner FAQ: "How is chain-of-custody guaranteed?" Answer: All raw byte uploads, intermediate high-pass residuals, and classification outputs are tagged with cryptographic SHA-256 hashes stored in SQLite with atomic transactions.',
      actionLabel: 'Launch Forensics Laboratory',
      actionTab: 'forensics-lab',
    },
  ];

  const drillQuestions = [
    {
      id: 1,
      category: 'math',
      q: 'Why does S-UNIWARD minimize distortion in the wavelet domain rather than directly in pixel values?',
      a: 'Human visual system (HVS) sensitivity is lowest in high-frequency textured regions. S-UNIWARD uses 2D Daubechies wavelets (LH, HL, HH subbands) to compute embedding costs: pixels in smooth flat areas have high relative distortion cost, while edge/texture pixels have low cost, preventing visual or first-order statistical anomalies.',
    },
    {
      id: 2,
      category: 'dataset',
      q: 'Why is paired dataset partitioning mandatory on BOSSbase 1.01?',
      a: 'If a cover image is in the Training set while its stego pair is in the Test set, the neural network learns image content semantics (identity leakage) rather than steganographic noise residuals. Paired splitting guarantees zero ID overlap and pure generalizability.',
    },
    {
      id: 3,
      category: 'architecture',
      q: 'Why are pooling layers omitted from the first 7 layers of SRNet?',
      a: 'Standard pooling (max/average) acts as a low-pass filter that suppresses weak stego signals (±1 bit changes). Keeping layers 1–7 unpooled allows weak spatial noise correlations to propagate and amplify across residual skip connections.',
    },
    {
      id: 4,
      category: 'math',
      q: 'Why does StegoShield enforce a three-state decision boundary [0.45, 0.55] instead of binary argmax?',
      a: 'In digital forensics, a forced binary choice in the uncertainty zone leads to unacceptable false positives in court. The interval [0.45, 0.55] is classified as INCONCLUSIVE under ASTM E3150 and NIST SP 800-86 standards, prompting secondary manual examination.',
    },
    {
      id: 5,
      category: 'architecture',
      q: 'What is the role of the 30 Spatial Rich Model (SRM) high-pass filters?',
      a: 'Natural images are dominated by low-frequency scene content. SRM filters subtract surrounding pixel neighbors to cancel out the image content, leaving only the noise residual where embedding footprints remain visible.',
    },
    {
      id: 6,
      category: 'math',
      q: 'How does Laplacian residual energy σr² correlate with image texture complexity?',
      a: 'Smooth images (like clear skies) have low residual variance (σr² ~ 40–50), making even tiny embedding detectable. Dense images (like foliage) have high natural variance (σr² ~ 850), which provides natural camouflage for S-UNIWARD perturbations.',
    },
  ];

  const quizQuestions = [
    {
      question: 'At an embedding rate of 0.4 bpp in S-UNIWARD, approximately what percentage of pixels are altered?',
      options: ['~100% of all pixels', '~10% to 13% of pixels', '~50% of pixels', '~1% of pixels'],
      correct: 1,
      explanation: 'Because S-UNIWARD embeds ternarily (±1, 0), at 0.4 bpp only roughly 1/3 of the capacity is modified, modifying only ~10-13% of carrier pixels.',
    },
    {
      question: 'Why does SRNet use Adamax instead of standard Adam optimizer?',
      options: [
        'Adamax requires 50% less RAM',
        'Adamax uses the infinity-norm of gradients to stabilize early unpooled layers',
        'Adam is deprecated in PyTorch',
        'Adamax is only for CPU training',
      ],
      correct: 1,
      explanation: 'Boroumand et al. proved that Adamax’s infinity norm bounds extreme gradient outliers in unpooled residual layers, preventing training divergence.',
    },
    {
      question: 'Which international standard governs digital evidence acquisition and chain-of-custody in StegoShield AI?',
      options: ['ISO 9001:2015', 'ISO/IEC 27037:2012 & NIST SP 800-86', 'IEEE 802.11ax', 'RFC 2616'],
      correct: 1,
      explanation: 'ISO/IEC 27037:2012 provides formal guidelines for digital evidence handling, hash verification, and examiner audit trails.',
    },
  ];

  const handleAction = (tab) => {
    playCyberClick();
    onClose();
    if (onNavigateTab) onNavigateTab(tab);
  };

  const currentPresentation = presentationSteps[currentStep];
  const Icon = currentPresentation.icon;

  const handleQuizAnswer = (qIdx, optIdx) => {
    playCyberClick();
    setSelectedAnswers((prev) => ({ ...prev, [qIdx]: optIdx }));
  };

  const calculateScore = () => {
    let score = 0;
    quizQuestions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correct) score += 1;
    });
    return score;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div className="bg-[#070D1A] border border-[#1B2B48] rounded-2xl max-w-3xl w-full shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden my-6 flex flex-col max-h-[90vh]">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1B2B48] bg-[#050914] shrink-0">
          <div className="flex items-center gap-2.5">
            <GraduationCap className="w-5 h-5 text-cyan-400" />
            <div>
              <span className="font-extrabold text-white text-sm block">
                Academic Defense &amp; Oral Viva Examination Master
              </span>
              <span className="text-[10px] font-mono text-cyan-400/80">
                Steganalysis Scientific Rigor &bull; BOSSbase 1.01 &bull; SRNet
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#64748B] hover:text-white hover:bg-[#0F1C36] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="px-6 py-2.5 border-b border-[#1B2B48] bg-[#070D1A] flex items-center gap-2 shrink-0 text-xs font-mono">
          <button
            onClick={() => {
              playCyberClick();
              setActiveMode('presentation');
            }}
            className={`px-3 py-1.5 rounded-xl transition ${
              activeMode === 'presentation'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold shadow-[0_0_8px_rgba(6,182,212,0.2)]'
                : 'text-[#64748B] hover:text-white'
            }`}
          >
            Defense Walkthrough (5 Stages)
          </button>
          <button
            onClick={() => {
              playCyberClick();
              setActiveMode('drill');
            }}
            className={`px-3 py-1.5 rounded-xl transition ${
              activeMode === 'drill'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold shadow-[0_0_8px_rgba(6,182,212,0.2)]'
                : 'text-[#64748B] hover:text-white'
            }`}
          >
            Examiner Q&amp;A Drill
          </button>
          <button
            onClick={() => {
              playCyberClick();
              setActiveMode('quiz');
            }}
            className={`px-3 py-1.5 rounded-xl transition ${
              activeMode === 'quiz'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold shadow-[0_0_8px_rgba(6,182,212,0.2)]'
                : 'text-[#64748B] hover:text-white'
            }`}
          >
            Defense Readiness Quiz
          </button>
        </div>

        {/* MODE 1: PRESENTATION WALKTHROUGH */}
        {activeMode === 'presentation' && (
          <>
            {/* Step Progression Indicator */}
            <div className="px-6 pt-3 pb-2 border-b border-[#1B2B48] bg-[#050914] shrink-0">
              <div className="flex items-center justify-between gap-1.5 overflow-x-auto">
                {presentationSteps.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      playCyberClick();
                      setCurrentStep(idx);
                    }}
                    className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all ${
                      idx === currentStep
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_8px_rgba(6,182,212,0.2)]'
                        : idx < currentStep
                        ? 'bg-[#0A1224] text-cyan-400 border border-[#1B2B48]'
                        : 'bg-[#050914] text-[#64748B] border border-[#1B2B48] hover:text-[#94A3B8]'
                    }`}
                  >
                    <span>{idx + 1}.</span>
                    <span className="truncate hidden sm:inline">{s.title.split(':')[0]}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Step Body Content */}
            <div className="p-6 overflow-y-auto space-y-5 text-[#94A3B8] text-xs">
              {/* Stage Header */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#0A1224] border border-[#1B2B48] flex items-center justify-center text-cyan-400 shrink-0 shadow-[0_0_12px_rgba(6,182,212,0.15)]">
                  <Icon className="w-6 h-6 text-cyan-400" />
                </div>
                <div>
                  <span className={`text-[10px] uppercase font-bold font-mono px-2 py-0.5 rounded-lg border ${currentPresentation.badgeColor}`}>
                    {currentPresentation.stage}
                  </span>
                  <h2 className="text-lg font-bold text-white mt-1">{currentPresentation.title}</h2>
                  <p className="text-[#94A3B8] mt-1 text-xs leading-relaxed font-sans">{currentPresentation.summary}</p>
                </div>
              </div>

              {/* Key Architectural & Scientific Highlights */}
              <div className="p-4 rounded-xl bg-[#050914] border border-[#1B2B48] space-y-2.5">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 font-mono">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  Core Scientific Takeaways
                </h4>
                <ul className="space-y-2 text-[#94A3B8] font-sans">
                  {currentPresentation.keyPoints.map((point, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{point}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Examiner Viva Defense Q&A Box */}
              <div className="p-4 rounded-xl bg-[#0A1224] border border-cyan-500/30 space-y-1.5 shadow-[0_0_12px_rgba(6,182,212,0.08)]">
                <div className="flex items-center gap-2 text-cyan-300 font-bold text-xs font-mono">
                  <HelpCircle className="w-4 h-4 text-cyan-400" />
                  <span>Examiner Defense Strategy &amp; Model Defense Response:</span>
                </div>
                <p className="text-white/90 leading-relaxed text-[11px] font-sans">
                  {currentPresentation.vivaTip}
                </p>
              </div>
            </div>

            {/* Footer Navigation */}
            <div className="p-4 border-t border-[#1B2B48] bg-[#050914] flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    playCyberClick();
                    setCurrentStep((prev) => Math.max(0, prev - 1));
                  }}
                  disabled={currentStep === 0}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                    currentStep === 0
                      ? 'text-[#64748B] bg-[#070D1A] border border-[#1B2B48] cursor-not-allowed'
                      : 'text-[#94A3B8] hover:text-white bg-[#0A1224] hover:bg-[#0F1C36] border border-[#1B2B48]'
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>
                <button
                  onClick={() => {
                    playCyberClick();
                    setCurrentStep((prev) => Math.min(presentationSteps.length - 1, prev + 1));
                  }}
                  disabled={currentStep === presentationSteps.length - 1}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${
                    currentStep === presentationSteps.length - 1
                      ? 'text-[#64748B] bg-[#070D1A] border border-[#1B2B48] cursor-not-allowed'
                      : 'text-white bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  }`}
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={() => handleAction(currentPresentation.actionTab)}
                className="py-2 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs flex items-center gap-2 transition-all shadow-[0_0_12px_rgba(6,182,212,0.3)]"
              >
                <span>{currentPresentation.actionLabel}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </>
        )}

        {/* MODE 2: ORAL EXAMINER Q&A DRILL */}
        {activeMode === 'drill' && (
          <div className="p-6 overflow-y-auto space-y-4 text-xs font-mono">
            <div className="flex items-center justify-between border-b border-[#1B2B48] pb-3">
              <span className="text-white font-bold flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-cyan-400" />
                <span>EXAMINER QUESTION DRILL ARCHIVE ({drillQuestions.length} Topics)</span>
              </span>
              <span className="text-[10px] text-cyan-400 font-sans">
                Click question to reveal academic answer &amp; mathematical proof
              </span>
            </div>

            <div className="space-y-3">
              {drillQuestions.map((item) => {
                const isOpenQ = Boolean(drillExpanded[item.id]);
                return (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl bg-[#050914] border border-[#1B2B48] space-y-2.5 transition hover:border-cyan-500/40"
                  >
                    <button
                      onClick={() => {
                        playCyberClick();
                        setDrillExpanded((prev) => ({ ...prev, [item.id]: !prev[item.id] }));
                      }}
                      className="w-full text-left flex items-start justify-between gap-3 font-bold text-white text-xs"
                    >
                      <span className="text-cyan-300 flex items-center gap-2">
                        <span className="w-5 h-5 rounded-md bg-[#0A1224] border border-cyan-500/30 flex items-center justify-center text-[10px] text-cyan-400">
                          {item.id}
                        </span>
                        {item.q}
                      </span>
                      <ChevronRight
                        className={`w-4 h-4 text-cyan-400 shrink-0 transition-transform ${
                          isOpenQ ? 'rotate-90' : ''
                        }`}
                      />
                    </button>

                    {isOpenQ && (
                      <div className="p-3 rounded-lg bg-[#070D1A] border border-cyan-500/20 text-[#94A3B8] text-[11px] font-sans leading-relaxed animate-fadeIn">
                        <strong className="text-white block font-mono text-[10px] uppercase mb-1">
                          Defensible Oral Defense Answer:
                        </strong>
                        {item.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* MODE 3: TIMED VIVA DEFENSE QUIZ */}
        {activeMode === 'quiz' && (
          <div className="p-6 overflow-y-auto space-y-5 text-xs font-mono">
            <div className="flex items-center justify-between border-b border-[#1B2B48] pb-3">
              <span className="text-white font-bold flex items-center gap-1.5">
                <Award className="w-4 h-4 text-cyan-400" />
                <span>DEFENSE READINESS SELF-TEST</span>
              </span>
              <span className="text-cyan-300 font-bold">
                Progress: {Object.keys(selectedAnswers).length} / {quizQuestions.length} answered
              </span>
            </div>

            <div className="space-y-5">
              {quizQuestions.map((q, qIdx) => (
                <div key={qIdx} className="p-4 rounded-xl bg-[#050914] border border-[#1B2B48] space-y-3">
                  <div className="font-bold text-white text-xs flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 flex items-center justify-center text-[10px]">
                      Q{qIdx + 1}
                    </span>
                    <span>{q.question}</span>
                  </div>

                  <div className="space-y-1.5">
                    {q.options.map((opt, optIdx) => {
                      const isSelected = selectedAnswers[qIdx] === optIdx;
                      return (
                        <button
                          key={optIdx}
                          onClick={() => handleQuizAnswer(qIdx, optIdx)}
                          className={`w-full text-left p-2.5 rounded-lg border text-xs transition flex items-center justify-between ${
                            isSelected
                              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 font-bold shadow-[0_0_8px_rgba(6,182,212,0.2)]'
                              : 'bg-[#070D1A] border-[#1B2B48] text-[#94A3B8] hover:text-white'
                          }`}
                        >
                          <span>{opt}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                        </button>
                      );
                    })}
                  </div>

                  {showQuizResult && (
                    <div
                      className={`p-2.5 rounded-lg text-[11px] font-sans ${
                        selectedAnswers[qIdx] === q.correct
                          ? 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-300'
                          : 'bg-rose-950/40 border border-rose-500/40 text-rose-300'
                      }`}
                    >
                      <strong>{selectedAnswers[qIdx] === q.correct ? 'Correct! ' : 'Incorrect: '}</strong>
                      {q.explanation}
                    </div>
                  )}
                </div>
              ))}

              <div className="pt-2 flex justify-between items-center">
                <button
                  onClick={() => {
                    playCyberSuccess();
                    setShowQuizResult(true);
                  }}
                  disabled={Object.keys(selectedAnswers).length < quizQuestions.length}
                  className="py-2.5 px-5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs transition shadow-[0_0_12px_rgba(6,182,212,0.3)] disabled:opacity-50"
                >
                  Verify My Score &amp; Grade
                </button>

                {showQuizResult && (
                  <div className="text-right">
                    <span className="text-[#64748B] block text-[10px]">Defense Readiness Score:</span>
                    <span className="text-cyan-300 font-extrabold text-sm">
                      {calculateScore()} / {quizQuestions.length} (
                      {Math.round((calculateScore() / quizQuestions.length) * 100)}% Grade)
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

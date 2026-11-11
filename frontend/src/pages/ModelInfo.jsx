import React, { useState } from 'react';
import {
  Layers,
  Shield,
  Cpu,
  Code2,
  Database,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  FileCode,
  Terminal,
  Activity,
} from 'lucide-react';

export default function ModelInfo() {
  const [activeSubTab, setActiveSubTab] = useState('srnet');

  const srnetLayers = [
    {
      type: 'Layer 1 – 2 (Type 1)',
      name: 'High-Pass Residual Extraction',
      desc: '3x3 Conv (64 filters) -> BatchNorm -> ReLU without pooling. Suppresses low-frequency image scene content to amplify weak steganographic embedding noise.',
      tag: 'No Pooling',
      color: 'border-[#383838] text-white bg-[#151515]',
    },
    {
      type: 'Layer 3 – 7 (Type 2)',
      name: 'Unpooled Residual Preserving Blocks',
      desc: 'Residual blocks (Conv -> BN -> ReLU -> Conv -> BN + Identity) without pooling. Maintains the weak spatial noise residuals without spatial decimation.',
      tag: '5 Blocks',
      color: 'border-[#383838] text-white bg-[#151515]',
    },
    {
      type: 'Layer 8 – 11 (Type 3)',
      name: 'Downsampling Residual Blocks',
      desc: 'Residual blocks paired with 3x3 Average Pooling (stride 2) on the skip connection and main path. Gradually compresses spatial dimensions from 256x256 to 16x16.',
      tag: '4 Blocks',
      color: 'border-[#383838] text-white bg-[#151515]',
    },
    {
      type: 'Layer 12 (Type 4)',
      name: 'Global Aggregation & Softmax',
      desc: '512-filter Conv -> BatchNorm followed by Global Average Pooling (GAP) and fully-connected layer with LogSoftmax output for binary classification [Cover, Stego].',
      tag: 'GAP + FC',
      color: 'border-[#383838] text-white bg-[#151515]',
    },
  ];

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="border-b border-[#292929] pb-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-[#151515] text-[#B3B3B3] border border-[#292929]">
            Technical Specification
          </span>
          <span className="text-xs text-[#777777] font-mono">• Scientific Foundations</span>
        </div>
        <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
          Steganalysis Architecture & Research
        </h1>
        <p className="text-sm text-[#777777] mt-1 max-w-3xl">
          Deep residual neural network architecture, S-UNIWARD distortion theory, and BOSSbase 1.01 benchmark validation.
        </p>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex flex-wrap gap-2 p-1.5 rounded-xl bg-[#0A0A0A] border border-[#292929]">
        {[
          { id: 'srnet', label: 'SRNet Research Architecture (IEEE TIFS)', icon: Layers },
          { id: 'stegonet', label: 'StegoNet-Lite (Demonstration Baseline)', icon: Cpu },
          { id: 'dataset', label: 'BOSSbase & S-UNIWARD Dataset', icon: Database },
          { id: 'theory', label: 'Steganographic Theory & Residuals', icon: BookOpen },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition ${
                isActive
                  ? 'bg-[#242424] text-white border border-[#383838] shadow-sm'
                  : 'text-[#777777] hover:text-white hover:bg-[#1A1A1A]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: SRNet Architecture */}
      {activeSubTab === 'srnet' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-[#111111] border border-[#292929] space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-white" />
                <span>SRNet: Spatial Residual Network (Boroumand et al., 2018)</span>
              </h2>
              <span className="text-xs font-mono text-[#B3B3B3] bg-[#151515] px-2.5 py-0.5 rounded border border-[#292929]">
                PyTorch Architecture Implemented (GPU Training Pending)
              </span>
            </div>
            <p className="text-xs text-[#B3B3B3] leading-relaxed">
              Standard deep convolutional architectures (e.g. ResNet, VGG) fail at digital image steganalysis because pooling layers treat steganographic embedding noise as high-frequency clutter and destroy it. SRNet is specifically designed with unpooled residual layers (Layers 1-7) to preserve minute ±1 pixel modifications. The complete 39-layer architecture is implemented in PyTorch within StegoShield AI; full training requires 500,000 optimization iterations on a dedicated CUDA GPU cluster (~360 GPU hours).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {srnetLayers.map((layer, idx) => (
              <div
                key={idx}
                className="p-5 rounded-2xl bg-[#111111] border border-[#292929] hover:border-[#383838] transition space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono text-[#777777]">{layer.type}</span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${layer.color}`}>
                    {layer.tag}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white">{layer.name}</h3>
                <p className="text-xs text-[#777777] leading-relaxed">{layer.desc}</p>
              </div>
            ))}
          </div>

          <div className="p-6 rounded-2xl bg-[#111111] border border-[#292929] space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Code2 className="w-4 h-4 text-white" />
              <span>SRNet PyTorch Implementation Details</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
              <div className="p-3.5 rounded-xl bg-[#151515] border border-[#292929]">
                <span className="text-[#777777] block text-[10px] uppercase">Input Tensor</span>
                <span className="text-white mt-1 block">Shape: (B, 1, 256, 256)</span>
                <span className="text-[#777777] text-[10px] block mt-0.5">Single-channel grayscale</span>
              </div>
              <div className="p-3.5 rounded-xl bg-[#151515] border border-[#292929]">
                <span className="text-[#777777] block text-[10px] uppercase">Mini-Batch Scheme</span>
                <span className="text-white mt-1 block">Paired Collation</span>
                <span className="text-[#777777] text-[10px] block mt-0.5">Cover-stego matched pairs</span>
              </div>
              <div className="p-3.5 rounded-xl bg-[#151515] border border-[#292929]">
                <span className="text-[#777777] block text-[10px] uppercase">Full GPU Cost</span>
                <span className="text-white mt-1 block">50 Epochs / 12 Hours</span>
                <span className="text-[#777777] text-[10px] block mt-0.5">~360 hrs on standard CPU</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: StegoNet-Lite */}
      {activeSubTab === 'stegonet' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-[#111111] border border-[#292929] space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Cpu className="w-5 h-5 text-white" />
                <span>StegoNet-Lite: Experimental CPU Baseline</span>
              </h2>
              <span className="text-xs font-mono text-[#B3B3B3] bg-[#151515] px-2.5 py-0.5 rounded border border-[#292929]">
                Experimental Baseline
              </span>
            </div>
            <p className="text-xs text-[#B3B3B3] leading-relaxed">
              StegoNet-Lite is a compact 4-stage residual convolutional neural network engineered for real-time CPU evaluation and pipeline demonstration. Note: Content-adaptive S-UNIWARD steganography embeds discrete ±1 changes that cancel across spatial pooling, rendering lightweight CNNs incapable of autonomous classification without deep unpooled GPU-trained representations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 rounded-2xl bg-[#111111] border border-[#292929] space-y-3">
              <h3 className="text-sm font-bold text-white">Network Architecture Profile</h3>
              <ul className="space-y-2 text-xs text-[#B3B3B3] font-mono">
                <li className="flex justify-between py-1 border-b border-[#222222]">
                  <span className="text-[#777777]">Stages:</span>
                  <span className="text-white">4 Stages (Prefilter + 3 ResBlocks)</span>
                </li>
                <li className="flex justify-between py-1 border-b border-[#222222]">
                  <span className="text-[#777777]">Parameters:</span>
                  <span className="text-white">304,220 trainable weights</span>
                </li>
                <li className="flex justify-between py-1 border-b border-[#222222]">
                  <span className="text-[#777777]">Prefilter:</span>
                  <span className="text-white">3x3 Conv (16 filters, no bias)</span>
                </li>
                <li className="flex justify-between py-1 border-b border-[#222222]">
                  <span className="text-[#777777]">Pooling:</span>
                  <span className="text-white">Adaptive Global Average Pooling</span>
                </li>
                <li className="flex justify-between py-1 border-b border-[#222222]">
                  <span className="text-[#777777]">Classification Head:</span>
                  <span className="text-white">Linear(128, 2) + LogSoftmax</span>
                </li>
                <li className="flex justify-between py-1">
                  <span className="text-[#777777]">Inference Latency:</span>
                  <span className="text-white font-bold">&lt; 20 ms / image (CPU)</span>
                </li>
              </ul>
            </div>

            <div className="p-5 rounded-2xl bg-[#111111] border border-[#292929] space-y-3">
              <h3 className="text-sm font-bold text-white">Scientific Evaluation & Baseline Findings</h3>
              <ul className="space-y-2 text-xs text-[#B3B3B3] font-mono">
                <li className="flex justify-between py-1 border-b border-[#222222]">
                  <span className="text-[#777777]">Model Role:</span>
                  <span className="text-white">Experimental Demonstration Baseline</span>
                </li>
                <li className="flex justify-between py-1 border-b border-[#222222]">
                  <span className="text-[#777777]">Untouched Test Acc:</span>
                  <span className="text-white">50.00% (Balanced 100 Imgs)</span>
                </li>
                <li className="flex justify-between py-1 border-b border-[#222222]">
                  <span className="text-[#777777]">Architectural Limit:</span>
                  <span className="text-[#B3B3B3]">Stride-2 pooling cancels ±1 noise</span>
                </li>
                <li className="flex justify-between py-1 border-b border-[#222222]">
                  <span className="text-[#777777]">Checkpoint:</span>
                  <span className="text-white">stegonet_lite_demo.pt</span>
                </li>
                <li className="flex justify-between py-1 border-b border-[#222222]">
                  <span className="text-[#777777]">Auxiliary Metric:</span>
                  <span className="text-white">Residual Energy σr² (Paired)</span>
                </li>
                <li className="flex justify-between py-1">
                  <span className="text-[#777777]">Recommended Next Step:</span>
                  <span className="text-white">Full SRNet GPU Cluster Training</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Dataset Benchmark */}
      {activeSubTab === 'dataset' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-[#111111] border border-[#292929] space-y-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Database className="w-5 h-5 text-white" />
              <span>Certified Dataset Inventory (BOSSbase 1.01 S-UNIWARD)</span>
            </h2>
            <p className="text-xs text-[#B3B3B3] leading-relaxed">
              The dataset contains 10,000 matched cover-stego pairs (20,000 PGM images) embedded with S-UNIWARD at 0.4 bits per pixel. Every image pair underwent strict validation: correct format, 512x512 resolution, maximum pixel difference of ±1, and zero overlap between train, validation, and test sets.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-[#111111] border border-[#292929] text-center space-y-2">
              <div className="text-xs font-semibold text-[#777777] uppercase tracking-wider">
                Train Partition
              </div>
              <div className="text-3xl font-extrabold text-white">4,000 Pairs</div>
              <div className="text-xs font-mono text-[#B3B3B3]">8,000 PGM Images</div>
              <p className="text-[11px] text-[#777777]">Images 1 – 4,000</p>
            </div>

            <div className="p-5 rounded-2xl bg-[#111111] border border-[#292929] text-center space-y-2">
              <div className="text-xs font-semibold text-[#777777] uppercase tracking-wider">
                Validation Partition
              </div>
              <div className="text-3xl font-extrabold text-white">1,000 Pairs</div>
              <div className="text-xs font-mono text-[#B3B3B3]">2,000 PGM Images</div>
              <p className="text-[11px] text-[#777777]">Images 4,001 – 5,000</p>
            </div>

            <div className="p-5 rounded-2xl bg-[#111111] border border-[#292929] text-center space-y-2">
              <div className="text-xs font-semibold text-[#777777] uppercase tracking-wider">
                Test Partition
              </div>
              <div className="text-3xl font-extrabold text-white">5,000 Pairs</div>
              <div className="text-xs font-mono text-[#B3B3B3]">10,000 PGM Images</div>
              <p className="text-[11px] text-[#777777]">Images 5,001 – 10,000</p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#111111] border border-[#292929] text-xs space-y-2">
            <h4 className="font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-white" />
              <span>Dataset Integrity Audit Certifications</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[#777777] font-mono">
              <div>• Format: P5 8-bit Binary Grayscale PGM</div>
              <div>• Dimensions: Exactly 512 x 512 pixels</div>
              <div>• Max Absolute Pixel Difference: ≤ 1.0</div>
              <div>• Partition Overlap / Leakage: Exactly 0.00%</div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Theoretical Foundations */}
      {activeSubTab === 'theory' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-[#111111] border border-[#292929] space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-white" />
              <span>S-UNIWARD & Spatial Residual Steganalysis Theory</span>
            </h2>
            <p className="text-xs text-[#B3B3B3] leading-relaxed">
              S-UNIWARD (Spatial Universal Wavelet Relative Distortion) calculates distortion by measuring changes in directional wavelet subbands (LH, HL, HH) computed using 2D Daubechies 8-tap wavelet filter banks. Pixels in complex texture areas have higher suitability and lower distortion cost, directing payload bits away from smooth regions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 rounded-2xl bg-[#111111] border border-[#292929] space-y-3">
              <h3 className="text-sm font-bold text-white">Ternary Embedding Simulation</h3>
              <p className="text-xs text-[#777777] leading-relaxed">
                For cover pixel C(i,j), stego pixel S(i,j) is chosen from {'{C(i,j)-1, C(i,j), C(i,j)+1}'} with modification probabilities governed by the Gibbs distribution:
              </p>
              <div className="p-3 rounded-xl bg-[#0A0A0A] border border-[#292929] font-mono text-[11px] text-white">
                P(±1) = exp(-λ · ρ±) / (1 + exp(-λ · ρ+) + exp(-λ · ρ-))
              </div>
              <p className="text-xs text-[#777777] leading-relaxed">
                Parameter λ is solved via bisection search until ternary entropy equals target payload α = 0.4 bpp.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-[#111111] border border-[#292929] space-y-3">
              <h3 className="text-sm font-bold text-white">Auxiliary Metric: Spatial Residual Energy (σr²)</h3>
              <p className="text-xs text-[#777777] leading-relaxed">
                The platform computes the high-pass Laplacian spatial residual energy:
              </p>
              <div className="p-3 rounded-xl bg-[#0A0A0A] border border-[#292929] font-mono text-[11px] text-white">
                σr² = (1 / HW) · Σ [ 4·I(i,j) - I(i+1,j) - I(i-1,j) - I(i,j+1) - I(i,j-1) ]²
              </div>
              <p className="text-xs text-[#777777] leading-relaxed">
                On matched cover-stego pairs, S-UNIWARD perturbations elevate high-pass variance by ~+1.8 σr² on 100% of tested pairs. However, natural scene variance spans from ~20 to 6,800 across different scenes, making residual energy an auxiliary paired comparison metric rather than an absolute standalone classifier.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

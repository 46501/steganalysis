import React from 'react';
import { Layers, Shield, Cpu, Code2 } from 'lucide-react';

export default function ModelInfo() {
  const layerTypes = [
    {
      name: 'Type 1 (Initial Layers)',
      desc: '3x3 Conv -> BatchNorm -> ReLU without pooling. Computes early spatial noise residuals.',
      layers: 'Layers 1 - 2',
    },
    {
      name: 'Type 2 (Unpooled Residuals)',
      desc: 'Residual block without pooling. Preserves weak steganographic modification artifacts.',
      layers: 'Layers 3 - 7',
    },
    {
      name: 'Type 3 (Downsampling Residuals)',
      desc: 'Residual block combined with 3x3 Average Pooling (stride 2) for spatial reduction.',
      layers: 'Layers 8 - 11',
    },
    {
      name: 'Type 4 (Global Aggregation)',
      desc: 'Conv -> BatchNorm followed by Global Average Pooling (GAP) producing 512-dim embedding.',
      layers: 'Layer 12',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-800 pb-5">
        <h1 className="text-2xl font-bold text-white">SRNet Architecture Reference</h1>
        <p className="text-sm text-gray-400 mt-1">
          Deep Residual Network for Steganalysis of Digital Images (Boroumand et al., IEEE TIFS 2018)
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {layerTypes.map((item, idx) => (
          <div key={idx} className="p-5 rounded-xl bg-gray-900 border border-gray-800">
            <div className="flex items-center justify-between text-cyan-400 font-semibold text-sm">
              <span>{item.name}</span>
              <span className="text-xs bg-cyan-950/60 border border-cyan-800 text-cyan-300 px-2 py-0.5 rounded">
                {item.layers}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-2 leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </div>

      <div className="p-5 rounded-xl bg-gray-900/60 border border-gray-800 text-xs text-gray-400 space-y-2">
        <div className="flex items-center gap-2 text-white font-medium">
          <Code2 className="w-4 h-4 text-cyan-400" />
          Technical Specifications
        </div>
        <p>• Input: Single-channel 8-bit grayscale tensor (1 x 1 x 256 x 256)</p>
        <p>• Output: Binary class LogSoftmax probabilities [0: Cover, 1: Stego]</p>
        <p>• Optimization: PyTorch implementation strictly adhering to IEEE TIFS paper specifications</p>
      </div>
    </div>
  );
}


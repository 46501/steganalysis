import React, { useState } from 'react';
import { UploadCloud, Image as ImageIcon, Zap } from 'lucide-react';

export default function Detector() {
  const [selectedFile, setSelectedFile] = useState(null);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="border-b border-gray-800 pb-5">
        <h1 className="text-2xl font-bold text-white">Steganalysis Detection Workspace</h1>
        <p className="text-sm text-gray-400 mt-1">
          Upload digital images (PNG, BMP, PGM, JPG) for PyTorch SRNet residual steganalysis
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Zone */}
        <div className="lg:col-span-2 space-y-4">
          <div className="border-2 border-dashed border-gray-800 hover:border-cyan-500/50 transition-colors rounded-xl p-8 text-center bg-gray-900/50">
            <UploadCloud className="w-12 h-12 text-gray-500 mx-auto mb-3" />
            <p className="text-sm text-gray-300 font-medium">Drag & drop image here or click to browse</p>
            <p className="text-xs text-gray-500 mt-1">Supports PNG, BMP, PGM, JPG up to 25MB</p>
            <input
              type="file"
              accept=".png,.bmp,.pgm,.jpg,.jpeg"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="mt-4 inline-block px-4 py-2 bg-gray-800 hover:bg-gray-700 text-sm text-cyan-400 rounded-lg cursor-pointer transition font-medium border border-gray-700"
            >
              Select Image File
            </label>
            {selectedFile && (
              <div className="mt-4 text-xs text-cyan-300">
                Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
              </div>
            )}
          </div>
        </div>

        {/* Prediction / Status Panel */}
        <div className="p-6 rounded-xl bg-gray-900 border border-gray-800 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-cyan-400" />
              Analysis Engine
            </h3>
            <p className="text-xs text-gray-400 mt-2">
              Image will be scaled to 256x256 single-channel grayscale and evaluated through SRNet 12-layer deep residual architecture.
            </p>
          </div>
          <div className="mt-8 text-center py-6 border border-gray-800 rounded-lg bg-gray-950/40 text-xs text-gray-500">
            Awaiting image submission
          </div>
        </div>
      </div>
    </div>
  );
}


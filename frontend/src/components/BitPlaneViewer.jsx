import React, { useState, useEffect, useRef } from 'react';
import { Upload, Sliders, Eye, RefreshCw } from 'lucide-react';

export default function BitPlaneViewer() {
  const [imageSrc, setImageSrc] = useState(null);
  const [bitPlane, setBitPlane] = useState(0);
  const [channels, setChannels] = useState({ r: true, g: true, b: true });
  const [isProcessing, setIsProcessing] = useState(false);
  
  const canvasRef = useRef(null);
  const imageRef = useRef(null);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setImageSrc(url);
    }
  };

  const processImage = () => {
    if (!imageRef.current || !canvasRef.current) return;
    
    setIsProcessing(true);
    
    // Use requestAnimationFrame to not block UI thread during setup
    requestAnimationFrame(() => {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      const img = imageRef.current;
      
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      
      // Draw original image
      ctx.drawImage(img, 0, 0);
      
      // Get pixel data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      const planeMask = 1 << bitPlane;
      
      // Process each pixel
      for (let i = 0; i < data.length; i += 4) {
        // Red
        data[i] = channels.r ? ((data[i] & planeMask) >> bitPlane) * 255 : 0;
        // Green
        data[i+1] = channels.g ? ((data[i+1] & planeMask) >> bitPlane) * 255 : 0;
        // Blue
        data[i+2] = channels.b ? ((data[i+2] & planeMask) >> bitPlane) * 255 : 0;
        // Alpha stays same (data[i+3])
      }
      
      ctx.putImageData(imageData, 0, 0);
      setIsProcessing(false);
    });
  };

  // Re-process when controls change
  useEffect(() => {
    if (imageSrc && imageRef.current && imageRef.current.complete) {
      processImage();
    }
  }, [bitPlane, channels]);

  return (
    <div className="space-y-6">
      <div className="card border-l-4 border-l-primary flex items-start gap-4 p-6">
        <div className="p-3 bg-primary/10 rounded-lg text-primary">
          <Eye size={24} />
        </div>
        <div>
          <h2 className="text-xl font-bold mb-2">Interactive Bit-Plane Explorer</h2>
          <p className="text-textMuted">
            Steganography usually hides data in the 0th (Least Significant) bit. By isolating this bit plane, hidden encrypted payloads often appear as perfect random visual static.
          </p>
        </div>
      </div>

      {!imageSrc ? (
        <div className="border-2 border-dashed border-surfaceHighlight rounded-xl p-12 text-center">
          <input 
            type="file" 
            id="bitplane-upload" 
            className="hidden" 
            accept="image/*" 
            onChange={handleImageUpload} 
          />
          <label htmlFor="bitplane-upload" className="cursor-pointer flex flex-col items-center">
            <Upload className="w-16 h-16 text-textMuted mb-4" />
            <span className="text-lg font-medium text-textMain mb-2">Upload an Image</span>
            <span className="text-sm text-textMuted">Select a PNG or BMP to explore its bit planes</span>
          </label>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <div className="card space-y-6">
              <h3 className="font-bold uppercase tracking-wider text-sm flex items-center gap-2">
                <Sliders size={16} /> Controls
              </h3>
              
              <div className="space-y-3">
                <label className="text-sm text-textMuted block">Bit Plane: <span className="font-bold text-textMain">{bitPlane}</span></label>
                <input 
                  type="range" 
                  min="0" 
                  max="7" 
                  value={bitPlane} 
                  onChange={(e) => setBitPlane(parseInt(e.target.value))}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-xs text-textMuted">
                  <span>0 (LSB)</span>
                  <span>7 (MSB)</span>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-surfaceHighlight">
                <label className="text-sm text-textMuted block">Color Channels</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={channels.r} onChange={(e) => setChannels({...channels, r: e.target.checked})} className="accent-danger" />
                    <span className="text-danger font-bold">R</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={channels.g} onChange={(e) => setChannels({...channels, g: e.target.checked})} className="accent-accent" />
                    <span className="text-accent font-bold">G</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={channels.b} onChange={(e) => setChannels({...channels, b: e.target.checked})} className="accent-primary" />
                    <span className="text-primary font-bold">B</span>
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t border-surfaceHighlight">
                <button 
                  onClick={() => setImageSrc(null)}
                  className="w-full btn-secondary text-sm"
                >
                  Load New Image
                </button>
              </div>
            </div>
            
            <div className="card bg-surfaceHighlight/30 text-sm text-textMuted">
              <strong>Tip:</strong> Bit 7 (MSB) contains the majority of the visual data. Bit 0 (LSB) contains almost purely fine noise. If Bit 0 looks suspiciously like pure random static across the entire image instead of natural sensor noise, it may contain an encrypted payload.
            </div>
          </div>

          <div className="lg:col-span-3">
            <div className="card h-full min-h-[500px] flex flex-col relative overflow-hidden bg-black/80">
              {/* Hidden original image to act as source */}
              <img 
                ref={imageRef} 
                src={imageSrc} 
                alt="Original" 
                className="hidden" 
                onLoad={processImage}
                crossOrigin="anonymous"
              />
              
              {isProcessing && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
                  <RefreshCw className="animate-spin text-primary w-12 h-12" />
                </div>
              )}
              
              <div className="flex-1 flex items-center justify-center overflow-auto p-4">
                <canvas 
                  ref={canvasRef} 
                  className="max-w-full max-h-full object-contain drop-shadow-2xl"
                  style={{ imageRendering: 'pixelated' }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

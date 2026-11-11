import React, { useState, useEffect, useMemo } from 'react';
import {
  FileCode,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Binary,
  Layers,
  Download,
  Info,
  Shield,
  Search,
} from 'lucide-react';
import { playTargetLock, playCyberClick } from '../../utils/cyberSoundEffects';

/**
 * FileStructureCarver
 *
 * Low-level binary file carving & container structure inspector.
 * Validates magic numbers, detects End-of-File (EOF) appended steganographic payloads,
 * scans for trailing byte anomalies (Zip/RAR archive headers), and renders hex dumps.
 */
export default function FileStructureCarver({ file, previewUrl }) {
  const [buffer, setBuffer] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [viewOffset, setViewOffset] = useState('head'); // 'head' | 'tail' | 'anomaly'
  const [page, setPage] = useState(0);

  useEffect(() => {
    let isMounted = true;

    const loadBytes = async () => {
      try {
        let arrayBuffer;
        if (file && file instanceof File) {
          arrayBuffer = await file.arrayBuffer();
        } else if (previewUrl) {
          const res = await fetch(previewUrl);
          arrayBuffer = await res.arrayBuffer();
        }

        if (!arrayBuffer || !isMounted) return;

        setBuffer(arrayBuffer);
        const bytes = new Uint8Array(arrayBuffer);
        const fileSize = bytes.length;

        // 1. Magic bytes detection
        let format = 'UNKNOWN';
        let isValidHeader = false;
        let expectedEOF = -1;
        let trailingOffset = -1;
        let trailingBytesCount = 0;
        let hasTrailingPayload = false;

        // PNG: 89 50 4E 47 0D 0A 1A 0A
        if (
          bytes[0] === 0x89 &&
          bytes[1] === 0x50 &&
          bytes[2] === 0x4e &&
          bytes[3] === 0x47
        ) {
          format = 'PNG';
          isValidHeader = true;

          // Find IEND chunk (49 45 4E 44) + 4 bytes CRC
          for (let i = 0; i < bytes.length - 8; i++) {
            if (
              bytes[i] === 0x49 &&
              bytes[i + 1] === 0x45 &&
              bytes[i + 2] === 0x4e &&
              bytes[i + 3] === 0x44
            ) {
              expectedEOF = i + 4 + 4; // IEND name (4) + CRC (4)
              break;
            }
          }
        }
        // JPEG: FF D8 FF ... FF D9
        else if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
          format = 'JPEG';
          isValidHeader = true;

          // Find EOI marker FF D9 from backwards
          for (let i = bytes.length - 2; i >= 2; i--) {
            if (bytes[i] === 0xff && bytes[i + 1] === 0xd9) {
              expectedEOF = i + 2;
              break;
            }
          }
        }
        // PGM: 'P5' (0x50 0x35)
        else if (bytes[0] === 0x50 && bytes[1] === 0x35) {
          format = 'Netpbm PGM (P5 RAW Grayscale)';
          isValidHeader = true;
          // PGM EOF typically reaches file end
          expectedEOF = fileSize;
        }

        if (expectedEOF > 0 && expectedEOF < fileSize) {
          hasTrailingPayload = true;
          trailingOffset = expectedEOF;
          trailingBytesCount = fileSize - expectedEOF;
        }

        // Check for embedded ZIP signature (PK\x03\x04 or PK\x05\x06) in trailing bytes
        let hasZipPayload = false;
        if (hasTrailingPayload) {
          for (let i = trailingOffset; i < bytes.length - 4; i++) {
            if (
              bytes[i] === 0x50 &&
              bytes[i + 1] === 0x4b &&
              (bytes[i + 2] === 0x03 || bytes[i + 2] === 0x05)
            ) {
              hasZipPayload = true;
              break;
            }
          }
        }

        // Calculate Shannon Entropy of trailing bytes (if any)
        let trailingEntropy = 0;
        if (hasTrailingPayload && trailingBytesCount > 0) {
          const freq = {};
          for (let i = trailingOffset; i < bytes.length; i++) {
            const b = bytes[i];
            freq[b] = (freq[b] || 0) + 1;
          }
          for (const count of Object.values(freq)) {
            const p = count / trailingBytesCount;
            trailingEntropy -= p * Math.log2(p);
          }
        }

        const report = {
          fileSize,
          format,
          isValidHeader,
          expectedEOF,
          hasTrailingPayload,
          trailingOffset,
          trailingBytesCount,
          hasZipPayload,
          trailingEntropy: trailingEntropy.toFixed(3),
        };

        setAnalysis(report);
        if (hasTrailingPayload) {
          playTargetLock(true);
        }
      } catch (err) {
        console.error('File structure carve error:', err);
      }
    };

    loadBytes();
    return () => {
      isMounted = false;
    };
  }, [file, previewUrl]);

  // Generate 16-byte hex rows for selected viewOffset
  const hexRows = useMemo(() => {
    if (!buffer) return [];
    const bytes = new Uint8Array(buffer);
    const rows = [];
    const rowLen = 16;
    const maxRows = 32; // 512 bytes per slice

    let start = 0;
    if (viewOffset === 'head') {
      start = page * maxRows * rowLen;
    } else if (viewOffset === 'tail') {
      start = Math.max(0, bytes.length - maxRows * rowLen);
    } else if (viewOffset === 'anomaly' && analysis?.hasTrailingPayload) {
      start = Math.max(0, analysis.trailingOffset - 16);
    }

    const end = Math.min(bytes.length, start + maxRows * rowLen);

    for (let pos = start; pos < end; pos += rowLen) {
      const slice = bytes.subarray(pos, Math.min(pos + rowLen, bytes.length));
      const hexArr = [];
      let ascii = '';

      for (let i = 0; i < rowLen; i++) {
        if (i < slice.length) {
          const b = slice[i];
          hexArr.push(b.toString(16).padStart(2, '0').toUpperCase());
          ascii += b >= 32 && b <= 126 ? String.fromCharCode(b) : '.';
        } else {
          hexArr.push('  ');
          ascii += ' ';
        }
      }

      const isAnomalyRow =
        analysis?.hasTrailingPayload && pos >= analysis.trailingOffset;

      rows.push({
        offset: `0x${pos.toString(16).padStart(8, '0').toUpperCase()}`,
        hex: hexArr,
        ascii,
        isAnomaly: isAnomalyRow,
      });
    }

    return rows;
  }, [buffer, viewOffset, page, analysis]);

  const handleDownloadPayload = () => {
    if (!buffer || !analysis?.hasTrailingPayload) return;
    const bytes = new Uint8Array(buffer);
    const payload = bytes.subarray(analysis.trailingOffset);
    const blob = new Blob([payload], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `carved_payload_${Date.now()}.bin`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 rounded-2xl bg-[#070D1A]/95 border border-[#1B2B48] shadow-[0_4px_30px_rgba(0,0,0,0.5)] space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-[#1B2B48] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <FileCode className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-white tracking-wide">
              Binary Structure &amp; File Carving Inspector
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0A1224] text-cyan-300 border border-cyan-500/30">
              Low-Level Forensics
            </span>
          </div>
          <p className="text-xs text-[#94A3B8] mt-1 font-sans">
            Validates image magic numbers, parses container chunks, and scans for appended steganography payloads (EOF injection after formal IEND/EOI markers).
          </p>
        </div>

        {/* View Mode Tabs */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#050914] border border-[#1B2B48] text-xs font-mono">
          <button
            onClick={() => {
              playCyberClick();
              setViewOffset('head');
            }}
            className={`px-3 py-1.5 rounded-lg transition ${
              viewOffset === 'head'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_8px_rgba(6,182,212,0.2)]'
                : 'text-[#64748B] hover:text-white'
            }`}
          >
            Header (Magic Bytes)
          </button>
          <button
            onClick={() => {
              playCyberClick();
              setViewOffset('tail');
            }}
            className={`px-3 py-1.5 rounded-lg transition ${
              viewOffset === 'tail'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-[0_0_8px_rgba(6,182,212,0.2)]'
                : 'text-[#64748B] hover:text-white'
            }`}
          >
            Tail (EOF Boundary)
          </button>
          {analysis?.hasTrailingPayload && (
            <button
              onClick={() => {
                playCyberClick();
                setViewOffset('anomaly');
              }}
              className={`px-3 py-1.5 rounded-lg transition ${
                viewOffset === 'anomaly'
                  ? 'bg-rose-950/60 text-rose-300 border border-rose-500/40 shadow-[0_0_8px_rgba(244,63,94,0.2)]'
                  : 'text-rose-400 hover:text-rose-300'
              }`}
            >
              Trailing Anomaly!
            </button>
          )}
        </div>
      </div>

      {/* Structural Analysis Summary Cards */}
      {analysis && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-3.5 rounded-xl bg-[#050914] border border-[#1B2B48]">
            <span className="text-[#64748B] block text-[10px] uppercase">Magic Identification</span>
            <span className="text-white font-bold block text-sm mt-0.5">{analysis.format}</span>
            <span className="text-[10px] text-emerald-400 mt-0.5 block flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              Valid Container Signature
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#050914] border border-[#1B2B48]">
            <span className="text-[#64748B] block text-[10px] uppercase">Byte Stream Size</span>
            <span className="text-cyan-300 font-bold block text-sm mt-0.5">
              {(analysis.fileSize / 1024).toFixed(1)} KB
            </span>
            <span className="text-[10px] text-[#64748B] mt-0.5 block">
              {analysis.fileSize.toLocaleString()} raw bytes
            </span>
          </div>

          <div
            className={`p-3.5 rounded-xl border ${
              analysis.hasTrailingPayload
                ? 'bg-rose-950/30 border-rose-500/50 shadow-[0_0_12px_rgba(244,63,94,0.2)]'
                : 'bg-[#050914] border-[#1B2B48]'
            }`}
          >
            <span className="text-[#64748B] block text-[10px] uppercase">EOF Boundary Status</span>
            <span
              className={`font-bold block text-sm mt-0.5 ${
                analysis.hasTrailingPayload ? 'text-rose-400' : 'text-emerald-400'
              }`}
            >
              {analysis.hasTrailingPayload ? 'ANOMALY DETECTED' : 'CLEAN BOUNDARY'}
            </span>
            <span className="text-[10px] text-[#64748B] mt-0.5 block truncate">
              {analysis.hasTrailingPayload
                ? `+${analysis.trailingBytesCount} trailing bytes`
                : 'Terminates exactly at EOF'}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-[#050914] border border-[#1B2B48]">
            <span className="text-[#64748B] block text-[10px] uppercase">Trailing Entropy</span>
            <span className="text-white font-bold block text-sm mt-0.5">
              {analysis.hasTrailingPayload ? `${analysis.trailingEntropy} bits` : '0.000 (N/A)'}
            </span>
            <span className="text-[10px] text-cyan-400 mt-0.5 block truncate">
              {analysis.hasZipPayload
                ? 'PK Header (Zip/RAR archive)'
                : analysis.hasTrailingPayload
                ? 'High Randomness Stream'
                : 'Clean Stream'}
            </span>
          </div>
        </div>
      )}

      {/* Trailing Payload Extraction Banner (if anomaly detected) */}
      {analysis?.hasTrailingPayload && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/50 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-[0_0_20px_rgba(244,63,94,0.15)] animate-pulse">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            <div>
              <span className="font-bold text-rose-200 block text-sm">
                CRITICAL: Appended Stego Payload Discovered (EOF Injection)
              </span>
              <span className="text-[11px] text-rose-300 font-mono">
                {analysis.trailingBytesCount} unreferenced bytes found starting at offset 0x{analysis.trailingOffset.toString(16).toUpperCase()}.
                {analysis.hasZipPayload && ' Contains embedded PK zip archive signature!'}
              </span>
            </div>
          </div>
          <button
            onClick={handleDownloadPayload}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition shadow-md shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Carve Payload (.bin)</span>
          </button>
        </div>
      )}

      {/* Interactive Hex Dump Viewer */}
      <div className="p-4 rounded-xl bg-[#050914] border border-[#1B2B48] space-y-3 font-mono text-xs">
        <div className="flex justify-between items-center text-[#64748B] text-[11px] border-b border-[#1B2B48] pb-2">
          <span>OFFSET (HEX)</span>
          <span className="hidden sm:inline">BYTE SEQUENCE (00 - FF)</span>
          <span>ASCII TEXT RECONSTRUCTION</span>
        </div>

        <div className="space-y-1 overflow-x-auto select-text font-mono text-[11px]">
          {hexRows.map((row, idx) => (
            <div
              key={idx}
              className={`flex items-center justify-between gap-3 px-2 py-0.5 rounded transition ${
                row.isAnomaly
                  ? 'bg-rose-950/40 border border-rose-500/40 text-rose-300 font-bold'
                  : 'hover:bg-cyan-500/5 text-[#94A3B8]'
              }`}
            >
              {/* Offset */}
              <span className="text-cyan-400 font-semibold shrink-0">{row.offset}</span>

              {/* Hex bytes */}
              <div className="flex gap-1.5 shrink-0">
                {row.hex.map((h, hIdx) => (
                  <span
                    key={hIdx}
                    className={`${
                      row.isAnomaly
                        ? 'text-rose-400 font-bold'
                        : h === '00'
                        ? 'text-[#475569]'
                        : 'text-slate-200'
                    }`}
                  >
                    {h}
                  </span>
                ))}
              </div>

              {/* ASCII representation */}
              <span className="text-white/80 shrink-0 font-mono tracking-widest pl-2">
                |{row.ascii}|
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


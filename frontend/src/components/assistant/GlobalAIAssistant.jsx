import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Sparkles,
  X,
  Minus,
  Maximize2,
  Minimize2,
  Send,
  Trash2,
  Copy,
  Check,
  RefreshCw,
  AlertTriangle,
  Code,
  CornerDownLeft,
} from 'lucide-react';
import { useAssistant } from '../../context/AssistantContext';

/**
 * GlobalAIAssistant
 *
 * Fully functional floating chatbot widget fixed at bottom-right corner.
 * Accessible across all pages of the StegoShield AI application.
 * Connects directly to FastAPI `/api/v1/assistant/chat` with deep domain knowledge.
 */
export default function GlobalAIAssistant() {
  const {
    isOpen,
    setIsOpen,
    isMinimized,
    setIsMinimized,
    isMaximized,
    setIsMaximized,
    connectionStatus,
    messages,
    isLoading,
    suggestedPrompts,
    sendMessage,
    retryMessage,
    clearChat,
    getRouteLabel,
  } = useAssistant();

  const [input, setInput] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [copiedCodeIdx, setCopiedCodeIdx] = useState(null);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Auto-scroll to bottom whenever messages change or loading state toggles
  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isMinimized, isLoading]);

  // Auto-focus input when the chat panel is opened
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => textareaRef.current?.focus(), 150);
    }
  }, [isOpen, isMinimized]);

  // Auto-adjust textarea height up to 100px
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(scrollHeight, 96)}px`;
    }
  }, [input]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    sendMessage(input);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopyText = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyCode = (codeText, idx) => {
    navigator.clipboard.writeText(codeText);
    setCopiedCodeIdx(idx);
    setTimeout(() => setCopiedCodeIdx(null), 2000);
  };

  const currentRoute = getRouteLabel();

  // Helper to render inline markdown (bold, code, links)
  const renderInline = (text) => {
    const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="text-white font-bold">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code
            key={i}
            className="px-1.5 py-0.5 rounded bg-[#101D38] text-cyan-300 font-mono text-[10px] border border-cyan-500/30"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  // Structured Markdown renderer (code blocks, headers, bullet lists, numbered lists)
  const renderMarkdown = (content, messageId) => {
    // Check for fenced code blocks ```code```
    const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
    let match;
    const segments = [];
    let lastIndex = 0;
    let blockCount = 0;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        segments.push({
          type: 'text',
          val: content.substring(lastIndex, match.index),
        });
      }
      segments.push({
        type: 'code',
        lang: match[1] || 'bash',
        code: match[2].trim(),
        blockId: `${messageId}-code-${blockCount++}`,
      });
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < content.length) {
      segments.push({
        type: 'text',
        val: content.substring(lastIndex),
      });
    }

    return segments.map((seg, sIdx) => {
      if (seg.type === 'code') {
        const isCopied = copiedCodeIdx === seg.blockId;
        return (
          <div
            key={sIdx}
            className="my-2 rounded-xl bg-[#050B18] border border-cyan-500/30 overflow-hidden font-mono text-[11px]"
          >
            <div className="flex items-center justify-between px-3 py-1 bg-[#091326] border-b border-cyan-500/20 text-[#64748B] text-[10px]">
              <span className="flex items-center gap-1.5 uppercase font-bold text-cyan-400">
                <Code className="w-3 h-3 text-cyan-400" />
                <span>{seg.lang}</span>
              </span>
              <button
                type="button"
                onClick={() => handleCopyCode(seg.code, seg.blockId)}
                className="flex items-center gap-1 hover:text-white transition"
              >
                {isCopied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-3 text-cyan-200 overflow-x-auto leading-relaxed select-text">
              <code>{seg.code}</code>
            </pre>
          </div>
        );
      }

      // Normal text lines
      const lines = seg.val.split('\n');
      return (
        <div key={sIdx} className="space-y-1">
          {lines.map((line, lIdx) => {
            const trimmed = line.trim();
            if (!trimmed) {
              return <div key={lIdx} className="h-1.5" />;
            }
            if (line.startsWith('### ')) {
              return (
                <h4
                  key={lIdx}
                  className="font-bold text-cyan-300 text-xs mt-2.5 mb-1 flex items-center gap-1.5"
                >
                  <span>{line.replace('### ', '')}</span>
                </h4>
              );
            }
            if (line.startsWith('## ')) {
              return (
                <h3
                  key={lIdx}
                  className="font-bold text-white text-sm mt-3 mb-1 border-b border-cyan-500/20 pb-0.5"
                >
                  {line.replace('## ', '')}
                </h3>
              );
            }
            if (line.startsWith('- ') || line.startsWith('* ')) {
              return (
                <div key={lIdx} className="flex items-start gap-2 ml-1 text-[#CBD5E1] text-[11px] leading-relaxed">
                  <span className="text-cyan-400 mt-1 text-[8px]">&bull;</span>
                  <div className="flex-1">{renderInline(line.replace(/^[-*]\s+/, ''))}</div>
                </div>
              );
            }
            const numMatch = line.match(/^(\d+)\.\s+(.*)$/);
            if (numMatch) {
              return (
                <div key={lIdx} className="flex items-start gap-2 ml-1 text-[#CBD5E1] text-[11px] leading-relaxed">
                  <span className="text-cyan-400 font-mono text-[10px] font-bold shrink-0 mt-0.5">
                    {numMatch[1]}.
                  </span>
                  <div className="flex-1">{renderInline(numMatch[2])}</div>
                </div>
              );
            }
            return (
              <p key={lIdx} className="text-[#CBD5E1] text-[11px] leading-relaxed">
                {renderInline(line)}
              </p>
            );
          })}
        </div>
      );
    });
  };

  return (
    <>
      {/* ------------------------------------------------------------------ */}
      {/* 1. Global Floating Circular Chatbot Launcher Button                */}
      {/* ------------------------------------------------------------------ */}
      <div className="fixed bottom-6 right-6 z-50 group font-sans">
        {/* Hover Tooltip (displayed only when chat window is closed) */}
        {!isOpen && (
          <div className="absolute right-full mr-3.5 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-xl bg-[#070D1A] border border-cyan-500/40 text-cyan-300 text-xs font-mono font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-[0_4px_20px_rgba(0,0,0,0.8)] pointer-events-none flex flex-col items-start gap-0.5">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              <span>StegoShield AI Assistant</span>
            </div>
            <span className="text-[10px] text-[#64748B]">
              Active Page: <strong className="text-white">{currentRoute}</strong>
            </span>
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            if (isOpen && isMinimized) {
              setIsMinimized(false);
            } else {
              setIsOpen(!isOpen);
            }
          }}
          className={`relative w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer shadow-[0_0_25px_rgba(0,240,255,0.4)] hover:shadow-[0_0_35px_rgba(0,240,255,0.7)] ${
            isOpen && !isMinimized
              ? 'bg-[#070D1A] text-cyan-300 border-2 border-cyan-400 scale-95'
              : 'bg-gradient-to-tr from-cyan-500 via-indigo-600 to-cyan-400 text-black hover:scale-105 active:scale-95'
          }`}
          title="AI Assistant"
          aria-label="Toggle StegoShield AI Assistant"
        >
          {isOpen && !isMinimized ? (
            <X className="w-6 h-6 text-cyan-300 transition-transform duration-200" />
          ) : (
            <>
              <Bot className="w-7 h-7 text-black drop-shadow-sm" />
              {/* Pulsing online status indicator on button */}
              <span
                className={`absolute top-1.5 right-1.5 w-3 h-3 rounded-full border-2 border-[#070D1A] ${
                  connectionStatus === 'online'
                    ? 'bg-emerald-400 animate-pulse'
                    : connectionStatus === 'checking'
                    ? 'bg-amber-400 animate-pulse'
                    : 'bg-rose-400'
                }`}
              />
            </>
          )}
        </button>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 2. Expandable Floating Chat Window                                 */}
      {/* ------------------------------------------------------------------ */}
      {isOpen && (
        <div
          className={`fixed z-50 font-sans transition-all duration-200 ${
            isMinimized
              ? 'bottom-24 right-6 w-72 h-12 rounded-xl bg-[#070D1A] border border-[#1B2B48] shadow-2xl flex items-center justify-between px-3.5 select-none'
              : isMaximized
              ? 'inset-3 sm:inset-10 rounded-2xl bg-[#070D1A] border border-[#1B2B48] shadow-[0_0_60px_rgba(0,0,0,0.95)] flex flex-col overflow-hidden'
              : 'bottom-24 right-3 sm:right-6 w-[calc(100vw-1.5rem)] sm:w-[390px] md:w-[410px] h-[520px] max-h-[calc(100vh-7.5rem)] rounded-2xl bg-[#070D1A] border border-[#1B2B48] shadow-[0_16px_50px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden'
          }`}
        >
          {/* Header Bar */}
          <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#050914] border-b border-[#142036] shrink-0 select-none">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-cyan-950/80 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0 shadow-[0_0_10px_rgba(0,240,255,0.2)]">
                <Bot className="w-4.5 h-4.5 text-cyan-400" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white tracking-wide truncate">
                    StegoShield AI Assistant
                  </span>
                  {/* Live Connection Status Badge */}
                  <span
                    className={`text-[9px] font-mono px-1.5 py-0.5 rounded flex items-center gap-1 font-bold shrink-0 ${
                      connectionStatus === 'online'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                        : connectionStatus === 'checking'
                        ? 'bg-amber-950 text-amber-300 border border-amber-500/40'
                        : 'bg-rose-950 text-rose-300 border border-rose-500/40'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        connectionStatus === 'online'
                          ? 'bg-emerald-400 animate-pulse'
                          : connectionStatus === 'checking'
                          ? 'bg-amber-400 animate-pulse'
                          : 'bg-rose-400'
                      }`}
                    />
                    <span>
                      {connectionStatus === 'online'
                        ? 'Online'
                        : connectionStatus === 'checking'
                        ? 'Connecting'
                        : 'Offline'}
                    </span>
                  </span>
                </div>
                <div className="text-[10px] text-[#64748B] font-mono truncate flex items-center gap-1">
                  <span>Page:</span>
                  <span className="text-cyan-400 font-semibold">{currentRoute}</span>
                </div>
              </div>
            </div>

            {/* Window Controls */}
            <div className="flex items-center gap-1 text-[#64748B]">
              <button
                type="button"
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 rounded-lg hover:text-white hover:bg-[#142036] transition cursor-pointer"
                title={isMinimized ? 'Expand' : 'Minimize'}
                aria-label="Minimize Chat"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              {!isMinimized && (
                <button
                  type="button"
                  onClick={() => setIsMaximized(!isMaximized)}
                  className="p-1.5 rounded-lg hover:text-white hover:bg-[#142036] transition cursor-pointer"
                  title={isMaximized ? 'Restore' : 'Maximize'}
                  aria-label="Maximize Chat"
                >
                  {isMaximized ? (
                    <Minimize2 className="w-3.5 h-3.5" />
                  ) : (
                    <Maximize2 className="w-3.5 h-3.5" />
                  )}
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg hover:text-white hover:bg-[#142036] transition cursor-pointer"
                title="Close"
                aria-label="Close Chat"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Full Body (Hidden when Minimized) */}
          {!isMinimized && (
            <>
              {/* Message Feed Scroll Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#070D1A]/95 text-xs">
                {messages.map((m) => {
                  const isUser = m.role === 'user';
                  const isErr = Boolean(m.isError);

                  return (
                    <div
                      key={m.id}
                      className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                    >
                      {!isUser && (
                        <div
                          className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                            isErr
                              ? 'bg-rose-950 border border-rose-500/40 text-rose-400'
                              : 'bg-cyan-950 border border-cyan-500/30 text-cyan-400'
                          }`}
                        >
                          {isErr ? (
                            <AlertTriangle className="w-3.5 h-3.5" />
                          ) : (
                            <Sparkles className="w-3.5 h-3.5" />
                          )}
                        </div>
                      )}

                      <div
                        className={`relative group max-w-[86%] rounded-2xl p-3 font-sans shadow-sm ${
                          isUser
                            ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white rounded-tr-none'
                            : isErr
                            ? 'bg-[#180B0F] border border-rose-500/40 text-rose-200 rounded-tl-none'
                            : 'bg-[#0B1222] border border-[#17253E] text-[#E2E8F0] rounded-tl-none'
                        }`}
                      >
                        {isUser ? (
                          <p className="text-[11px] leading-relaxed whitespace-pre-wrap">
                            {m.content}
                          </p>
                        ) : (
                          <div className="space-y-1">
                            {renderMarkdown(m.content, m.id)}
                            {/* Inline Retry Button for errors */}
                            {isErr && m.failedQuery && (
                              <div className="pt-2">
                                <button
                                  type="button"
                                  onClick={() => retryMessage(m.failedQuery, m.id)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-950/80 hover:bg-rose-900 border border-rose-500/50 text-rose-200 text-[11px] font-bold transition cursor-pointer"
                                >
                                  <RefreshCw className="w-3 h-3 text-rose-300" />
                                  <span>Retry Question</span>
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Copy entire message reply button on hover */}
                        {!isUser && !isErr && (
                          <button
                            type="button"
                            onClick={() => handleCopyText(m.content, m.id)}
                            className="absolute top-2 right-2 p-1 rounded-md bg-[#070D1A]/90 text-[#64748B] hover:text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer border border-[#142036]"
                            title="Copy reply text"
                          >
                            {copiedId === m.id ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Typing / Loading Indicator */}
                {isLoading && (
                  <div className="flex items-center gap-2.5 text-cyan-400 text-xs font-mono">
                    <div className="w-6 h-6 rounded-lg bg-cyan-950 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                      <Sparkles className="w-3.5 h-3.5 animate-spin" />
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#0B1222] border border-[#17253E] flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" />
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce [animation-delay:0.2s]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce [animation-delay:0.4s]" />
                      </div>
                      <span className="text-[10px] text-[#94A3B8]">
                        Analyzing forensic query...
                      </span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Contextual Suggested Prompts Bar */}
              {suggestedPrompts.length > 0 && !isLoading && (
                <div className="px-3 py-2 bg-[#050914] border-t border-[#142036] flex items-center gap-1.5 overflow-x-auto text-[10px] font-mono no-scrollbar">
                  <span className="text-[#64748B] shrink-0 font-bold">Suggestions:</span>
                  {suggestedPrompts.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => sendMessage(p)}
                      className="px-2.5 py-1 rounded-lg bg-[#0A1224] hover:bg-cyan-950 text-cyan-300 border border-cyan-500/30 whitespace-nowrap transition cursor-pointer hover:border-cyan-400 shrink-0"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}

              {/* Input Area */}
              <div className="p-3 bg-[#050914] border-t border-[#142036] space-y-2 shrink-0">
                <div className="flex items-end gap-2 bg-[#0A1224] border border-[#17253E] focus-within:border-cyan-400 rounded-xl p-1.5 transition">
                  <textarea
                    ref={textareaRef}
                    rows={1}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask me anything..."
                    className="flex-1 bg-transparent px-2 py-1 text-xs text-white placeholder-[#64748B] focus:outline-none resize-none max-h-24 font-sans leading-relaxed"
                    disabled={isLoading}
                  />

                  <div className="flex items-center gap-1 shrink-0 pb-0.5">
                    {/* Clear Chat Button */}
                    <button
                      type="button"
                      onClick={clearChat}
                      className="p-1.5 rounded-lg text-[#64748B] hover:text-white hover:bg-[#142036] transition cursor-pointer"
                      title="Clear conversation history"
                      aria-label="Clear chat"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Send Button */}
                    <button
                      type="button"
                      onClick={handleSend}
                      disabled={!input.trim() || isLoading}
                      className="p-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-black font-bold transition disabled:opacity-30 disabled:cursor-not-allowed shadow-[0_0_12px_rgba(0,240,255,0.3)] cursor-pointer"
                      title="Send (Enter)"
                      aria-label="Send message"
                    >
                      <Send className="w-3.5 h-3.5 text-black" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[9px] font-mono text-[#475569] px-1">
                  <span className="flex items-center gap-1">
                    <CornerDownLeft className="w-2.5 h-2.5" />
                    <span>Enter to send &bull; Shift+Enter for new line</span>
                  </span>
                  <span>StegoNet AI &bull; ISO/IEC 27037</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}

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
  HelpCircle,
  Copy,
  Check,
  ChevronDown,
  ArrowUpRight,
  ShieldCheck,
  MessageSquare,
} from 'lucide-react';
import { useAssistant } from '../../context/AssistantContext';

/**
 * GlobalAIAssistant
 *
 * Professional floating AI forensic assistant accessible across all authenticated pages.
 * Supports context-aware guidance, markdown rendering, minimize/maximize controls,
 * and persistent session memory across navigation.
 */
export default function GlobalAIAssistant() {
  const {
    isOpen,
    setIsOpen,
    isMinimized,
    setIsMinimized,
    isMaximized,
    setIsMaximized,
    messages,
    isLoading,
    suggestedPrompts,
    sendMessage,
    clearChat,
    getRouteLabel,
  } = useAssistant();

  const [input, setInput] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, isMinimized, isLoading]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, isMinimized]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    sendMessage(input);
    setInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Helper to render simple markdown formatting (headers, bold, code blocks)
  const renderFormattedContent = (content) => {
    const lines = content.split('\n');
    return lines.map((line, idx) => {
      // Headers
      if (line.startsWith('### ')) {
        return (
          <h4 key={idx} className="font-bold text-white text-xs mt-2 mb-1 text-cyan-300">
            {line.replace('### ', '')}
          </h4>
        );
      }
      if (line.startsWith('## ')) {
        return (
          <h3 key={idx} className="font-bold text-white text-sm mt-2 mb-1 text-cyan-200">
            {line.replace('## ', '')}
          </h3>
        );
      }
      // List items
      if (line.startsWith('- ') || line.startsWith('* ')) {
        const itemText = line.replace(/^[-*]\s+/, '');
        return (
          <li key={idx} className="ml-3 list-disc text-[11px] leading-relaxed text-[#CBD5E1]">
            {renderInlineMarkdown(itemText)}
          </li>
        );
      }
      // Empty line / paragraph break
      if (!line.trim()) {
        return <div key={idx} className="h-1.5" />;
      }
      return (
        <p key={idx} className="text-[11px] leading-relaxed text-[#CBD5E1]">
          {renderInlineMarkdown(line)}
        </p>
      );
    });
  };

  const renderInlineMarkdown = (text) => {
    // Bold: **text**
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
          <code key={i} className="px-1 py-0.5 rounded bg-[#101D38] text-cyan-300 font-mono text-[10px] border border-cyan-500/20">
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  const currentRoute = getRouteLabel();

  return (
    <>
      {/* ------------------------------------------------------------------ */}
      {/* 1. Global Floating Circular Chat Trigger Button                    */}
      {/* ------------------------------------------------------------------ */}
      <div className="fixed bottom-6 right-6 z-50 group font-sans">
        {/* Subtle Tooltip */}
        {!isOpen && (
          <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-[#070D1A] border border-cyan-500/30 text-cyan-300 text-xs font-mono font-semibold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity shadow-[0_0_12px_rgba(0,0,0,0.8)] pointer-events-none">
            StegoShield AI Assistant
            <div className="text-[9px] text-[#64748B]">Context: {currentRoute}</div>
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
          className={`relative w-13 h-13 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer shadow-[0_0_25px_rgba(0,240,255,0.35)] hover:shadow-[0_0_35px_rgba(0,240,255,0.6)] ${
            isOpen && !isMinimized
              ? 'bg-[#0A1628] text-cyan-400 border border-cyan-500/50 scale-95'
              : 'bg-gradient-to-r from-cyan-500 via-indigo-500 to-cyan-400 text-black hover:scale-105'
          }`}
          title="AI Assistant"
          aria-label="StegoShield AI Assistant"
        >
          {isOpen && !isMinimized ? (
            <X className="w-5 h-5 text-cyan-300" />
          ) : (
            <>
              <Bot className="w-6 h-6 text-black drop-shadow-sm" />
              <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#070D1A] animate-pulse" />
            </>
          )}
        </button>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* 2. Expandable Chat Window                                          */}
      {/* ------------------------------------------------------------------ */}
      {isOpen && (
        <div
          className={`fixed z-50 transition-all duration-200 font-sans ${
            isMinimized
              ? 'bottom-22 right-6 w-72 h-12 rounded-xl bg-[#070D1A] border border-[#1B2B48] shadow-lg flex items-center justify-between px-4'
              : isMaximized
              ? 'inset-3 sm:inset-10 rounded-2xl bg-[#070D1A] border border-[#1B2B48] shadow-[0_0_60px_rgba(0,0,0,0.95)] flex flex-col overflow-hidden'
              : 'bottom-22 right-4 sm:right-6 w-[94vw] sm:w-[420px] max-w-[440px] h-[580px] max-h-[calc(100vh-7rem)] rounded-2xl bg-[#070D1A] border border-[#1B2B48] shadow-[0_0_50px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden'
          }`}
        >
          {/* Top Header Bar */}
          <div className="flex items-center justify-between px-4 py-3 bg-[#050914] border-b border-[#142036] shrink-0 select-none">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-cyan-950 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white truncate">StegoShield AI</span>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30 font-bold shrink-0">
                    Online
                  </span>
                </div>
                <div className="text-[10px] text-[#64748B] font-mono truncate flex items-center gap-1">
                  <span>Context:</span>
                  <span className="text-cyan-400 font-semibold">{currentRoute}</span>
                </div>
              </div>
            </div>

            {/* Window Controls */}
            <div className="flex items-center gap-1 text-[#64748B]">
              <button
                type="button"
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1 rounded hover:text-white hover:bg-[#142036] transition"
                title={isMinimized ? 'Expand' : 'Minimize'}
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              {!isMinimized && (
                <button
                  type="button"
                  onClick={() => setIsMaximized(!isMaximized)}
                  className="p-1 rounded hover:text-white hover:bg-[#142036] transition"
                  title={isMaximized ? 'Restore' : 'Maximize'}
                >
                  {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded hover:text-white hover:bg-[#142036] transition"
                title="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Full Body (Hidden when Minimized) */}
          {!isMinimized && (
            <>
              {/* Messages Scroll Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#070D1A]/95 text-xs">
                {messages.map((m) => {
                  const isUser = m.role === 'user';
                  return (
                    <div
                      key={m.id}
                      className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                    >
                      {!isUser && (
                        <div className="w-6 h-6 rounded-md bg-cyan-950 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5">
                          <Sparkles className="w-3.5 h-3.5" />
                        </div>
                      )}

                      <div
                        className={`relative group max-w-[85%] rounded-2xl p-3 font-sans shadow-sm ${
                          isUser
                            ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white rounded-tr-none'
                            : 'bg-[#0B1222] border border-[#17253E] text-[#E2E8F0] rounded-tl-none'
                        }`}
                      >
                        {isUser ? (
                          <p className="text-[11px] leading-relaxed whitespace-pre-wrap">{m.content}</p>
                        ) : (
                          <div className="space-y-1">{renderFormattedContent(m.content)}</div>
                        )}

                        {/* Copy button on hover */}
                        {!isUser && (
                          <button
                            type="button"
                            onClick={() => handleCopy(m.content, m.id)}
                            className="absolute top-2 right-2 p-1 rounded bg-[#070D1A]/80 text-[#64748B] hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Copy reply"
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

                {/* Typing Indicator */}
                {isLoading && (
                  <div className="flex items-center gap-2 text-cyan-400 text-xs font-mono">
                    <div className="w-6 h-6 rounded-md bg-cyan-950 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                      <Sparkles className="w-3.5 h-3.5 animate-spin" />
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#0B1222] border border-[#17253E] flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" />
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce [animation-delay:0.2s]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Suggested Quick Prompts */}
              {suggestedPrompts.length > 0 && !isLoading && (
                <div className="px-3 py-2 bg-[#050914] border-t border-[#142036] flex items-center gap-1.5 overflow-x-auto text-[10px] font-mono no-scrollbar">
                  <span className="text-[#64748B] shrink-0">Suggestions:</span>
                  {suggestedPrompts.map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => sendMessage(p)}
                      className="px-2 py-1 rounded-md bg-[#0A1224] hover:bg-[#142036] text-cyan-300 border border-cyan-500/20 whitespace-nowrap transition shrink-0"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}

              {/* Input & Action Bar */}
              <div className="p-3 bg-[#050914] border-t border-[#142036] space-y-2 shrink-0">
                <div className="flex items-center gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask about forensics, metrics, or workflows..."
                    className="flex-1 bg-[#0A1224] border border-[#17253E] focus:border-cyan-400 rounded-xl px-3 py-2 text-xs text-white placeholder-[#64748B] focus:outline-none transition font-sans"
                    disabled={isLoading}
                  />

                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={!input.trim() || isLoading}
                    className="p-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold transition disabled:opacity-30 disabled:cursor-not-allowed shadow-[0_0_10px_rgba(0,240,255,0.3)] shrink-0"
                    title="Send message"
                  >
                    <Send className="w-4 h-4 text-black" />
                  </button>

                  <button
                    type="button"
                    onClick={clearChat}
                    className="p-2 rounded-xl text-[#64748B] hover:text-white hover:bg-[#142036] transition shrink-0"
                    title="Clear conversation"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center justify-between text-[9px] font-mono text-[#475569] px-1">
                  <span>Enter to send &bull; Context-aware</span>
                  <span>ISO/IEC 27037 &bull; StegoNet AI</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}

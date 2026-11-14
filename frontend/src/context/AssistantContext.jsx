import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { assistantApi } from '../services/api';

const AssistantContext = createContext(null);

const STORAGE_KEY = 'stegoshield_assistant_messages';

export function AssistantProvider({ children }) {
  const location = useLocation();

  // Window state: open/closed, minimized, maximized
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Conversation history (saved to sessionStorage so navigation preserves it)
  const [messages, setMessages] = useState(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // ignore
    }
    return [
      {
        id: 'welcome',
        role: 'assistant',
        content:
          "👋 Hello! I am the **StegoShield AI Forensic Assistant**.\n\nI can help you navigate tools, inspect pixel bits, interpret steganalysis verdicts, and explain digital forensics.\n\n*How can I help you today?*",
        timestamp: new Date().toISOString(),
      },
    ];
  });

  // Dynamic contextual suggestions based on current route
  const [suggestedPrompts, setSuggestedPrompts] = useState([]);

  // Active analysis data context (can be pushed by Detector or Lab)
  const [activeAnalysisContext, setActiveAnalysisContext] = useState(null);

  // Persist messages in sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch (e) {
      // ignore
    }
  }, [messages]);

  // Derive current route label for UI badge
  const getRouteLabel = useCallback(() => {
    const path = location.pathname.toLowerCase();
    if (path.includes('detector')) return 'Detector';
    if (path.includes('lab')) return 'Forensics Lab';
    if (path.includes('studio')) return 'Stego Studio';
    if (path.includes('history')) return 'Audit Ledger';
    if (path.includes('profile')) return 'User Profile';
    if (path.includes('model')) return 'Model Architecture';
    return 'Dashboard';
  }, [location.pathname]);

  // Send a message to the assistant
  const sendMessage = async (text) => {
    if (!text || !text.trim() || isLoading) return;

    const userText = text.trim();
    const userMsg = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: userText,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      // Build history payload (last 6 turns)
      const historyPayload = messages
        .filter((m) => m.id !== 'welcome')
        .slice(-6)
        .map((m) => ({ role: m.role, content: m.content }));

      // Build context payload
      const contextPayload = {
        current_page: location.pathname,
        workflow_step: activeAnalysisContext?.step ?? null,
        analysis_data: activeAnalysisContext || null,
      };

      const res = await assistantApi.sendMessage(userText, historyPayload, contextPayload);

      const assistantMsg = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: res.reply,
        timestamp: res.timestamp || new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
      if (res.suggested_prompts && res.suggested_prompts.length > 0) {
        setSuggestedPrompts(res.suggested_prompts);
      }
    } catch (err) {
      console.warn('Assistant error:', err);
      const errorMsg = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content:
          "⚠️ I encountered a temporary connection issue. You can still ask me questions, or try asking about PSNR, LSB embedding, or how to use the current page.",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    const initial = [
      {
        id: 'welcome',
        role: 'assistant',
        content:
          "👋 Conversation cleared. What forensic concept or StegoShield workflow would you like to explore?",
        timestamp: new Date().toISOString(),
      },
    ];
    setMessages(initial);
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
    } catch (e) {
      // ignore
    }
  };

  return (
    <AssistantContext.Provider
      value={{
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
        activeAnalysisContext,
        setActiveAnalysisContext,
      }}
    >
      {children}
    </AssistantContext.Provider>
  );
}

export function useAssistant() {
  const ctx = useContext(AssistantContext);
  if (!ctx) {
    throw new Error('useAssistant must be used within an AssistantProvider');
  }
  return ctx;
}

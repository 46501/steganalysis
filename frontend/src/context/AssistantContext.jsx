import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { assistantApi, steganalysisApi } from '../services/api';
import { formatApiError } from '../utils/errorUtils';

const AssistantContext = createContext(null);

const STORAGE_KEY = 'stegoshield_assistant_messages';

const INITIAL_WELCOME = {
  id: 'welcome',
  role: 'assistant',
  content:
    "Hi! I'm your StegoShield AI Assistant. How can I help you?\n\nI can assist you with:\n- **Dashboard & Navigation**: Choosing the right forensic workflow\n- **Image Upload & Inspection**: Ingesting PNG/BMP images and reading dimensions/hashes\n- **Modify Bits**: Selecting pixels and toggling, setting, or clearing individual bits ($b_0$ to $b_7$)\n- **Add Hidden Message**: LSB concealment with optional AES encryption & recovery verification\n- **Run Steganalysis**: StegoNet-Lite model inference, residual noise analysis, and verdicts\n- **Metrics Interpretation**: Chi-Square (χ²), RS Steganalysis, Shannon Entropy, and PSNR",
  timestamp: new Date().toISOString(),
};

export function AssistantProvider({ children }) {
  const location = useLocation();

  // Window state: open/closed, minimized, maximized
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Backend connection status: 'online' | 'checking' | 'offline'
  const [connectionStatus, setConnectionStatus] = useState('checking');

  // Conversation history (saved to sessionStorage so navigation preserves it)
  const [messages, setMessages] = useState(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      // ignore
    }
    return [INITIAL_WELCOME];
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

  // Check health and set live connection status on mount and periodically
  const checkBackendHealth = useCallback(async () => {
    try {
      const res = await steganalysisApi.checkHealth();
      if (res && (res.status === 'healthy' || res.status === 'ok' || res.model)) {
        setConnectionStatus('online');
      } else {
        setConnectionStatus('offline');
      }
    } catch (err) {
      setConnectionStatus('offline');
    }
  }, []);

  useEffect(() => {
    checkBackendHealth();
    const interval = setInterval(checkBackendHealth, 45000);
    return () => clearInterval(interval);
  }, [checkBackendHealth]);

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
  const sendMessage = async (text, customHistory = null) => {
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
      const baseMessages = customHistory || messages;
      const historyPayload = baseMessages
        .filter((m) => m.id !== 'welcome' && !m.isError)
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
      setConnectionStatus('online');
      if (res.suggested_prompts && res.suggested_prompts.length > 0) {
        setSuggestedPrompts(res.suggested_prompts);
      }
    } catch (err) {
      console.warn('Assistant error:', err);
      setConnectionStatus('offline');
      const formattedError = formatApiError(err, 'Temporary connection failure');
      const errorMsg = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        isError: true,
        failedQuery: userText,
        content: `⚠️ **Connection Issue**: Unable to reach the StegoShield assistant backend (${formattedError}). You can retry your question or verify the backend service is running.`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  // Retry a failed query
  const retryMessage = (failedQuery, errorMsgId = null) => {
    if (!failedQuery) return;
    // Remove the error message from the feed if errorMsgId is provided
    if (errorMsgId) {
      setMessages((prev) => prev.filter((m) => m.id !== errorMsgId));
    }
    sendMessage(failedQuery);
  };

  const clearChat = () => {
    setMessages([INITIAL_WELCOME]);
    setSuggestedPrompts([]);
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify([INITIAL_WELCOME]));
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
        connectionStatus,
        checkBackendHealth,
        messages,
        isLoading,
        suggestedPrompts,
        sendMessage,
        retryMessage,
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

export default AssistantContext;

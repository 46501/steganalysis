import axios from 'axios';

/**
 * Resolves the backend API base URL with full normalization.
 * Checks VITE_API_BASE_URL and VITE_API_URL if explicitly configured.
 * Defaults cleanly to relative '/api/v1':
 * - In local dev: Proxied by Vite to http://localhost:8000.
 * - In production: Proxied by Vercel edge rewrite (vercel.json) to Render backend,
 *   guaranteeing same-origin requests with zero CORS preflight overhead or Network Errors.
 */
function resolveApiBaseUrl() {
  const envUrl = (
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    ''
  ).trim();

  if (envUrl) {
    let url = envUrl.replace(/\/+$/, '');
    if (!url.endsWith('/api/v1')) {
      if (url.endsWith('/api')) {
        url = `${url}/v1`;
      } else {
        url = `${url}/api/v1`;
      }
    }
    return url;
  }

  // Same-origin default proxied seamlessly by Vite (dev) and Vercel edge rewrites (prod)
  return '/api/v1';
}

const API_BASE_URL = resolveApiBaseUrl();

// In-memory token storage (never stored in localStorage for XSS immunity)
let memoryAccessToken = null;

export const setAuthToken = (token) => {
  memoryAccessToken = token;
};

export const getAuthToken = () => memoryAccessToken;

export const getApiBaseUrl = () => API_BASE_URL;

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
  withCredentials: true, // Enables HttpOnly refresh cookies across origins
  headers: {
    'X-StegoShield-Client': '1',
  },
});

// Request interceptor: Attach JWT bearer token to headers if authenticated
apiClient.interceptors.request.use(
  (config) => {
    config.headers['X-StegoShield-Client'] = '1';
    if (memoryAccessToken) {
      config.headers.Authorization = `Bearer ${memoryAccessToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Automatic silent refresh token rotation on 401
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Do not attempt refresh on auth endpoints to avoid infinite loops
    const isAuthEndpoint = originalRequest.url?.includes('/auth/');

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshResponse = await axios.post(
          `${API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );
        const newToken = refreshResponse.data.access_token;
        setAuthToken(newToken);
        processQueue(null, newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        setAuthToken(null);
        window.dispatchEvent(new CustomEvent('stego-auth-expired'));
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export const steganalysisApi = {
  checkHealth: async () => {
    const response = await apiClient.get('/health');
    return response.data;
  },

  analyzeImage: async (file, modelName = null) => {
    const formData = new FormData();
    formData.append('file', file);
    if (modelName) {
      formData.append('model_name', modelName);
    }
    const response = await apiClient.post('/analyze', formData);
    return response.data;
  },

  analyzeBatch: async (files) => {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    const response = await apiClient.post('/batch', formData);
    return response.data;
  },

  analyzeBenchmarkBatch: async (countPerClass = 5) => {
    const response = await apiClient.post(`/batch/benchmark?count_per_class=${countPerClass}`);
    return response.data;
  },

  comparePair: async (coverFile, stegoFile) => {
    const formData = new FormData();
    formData.append('cover_file', coverFile);
    formData.append('stego_file', stegoFile);
    const response = await apiClient.post('/analyze/compare', formData);
    return response.data;
  },

  extractBitplane: async (file, plane = 0) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post(`/analyze/bitplane?plane=${plane}`, formData);
    return response.data;
  },

  getHistory: async (params = {}) => {
    const response = await apiClient.get('/history', { params });
    return response.data;
  },

  getHistoryItem: async (recordId) => {
    const response = await apiClient.get(`/history/${recordId}`);
    return response.data;
  },

  downloadEvidenceArchive: async (recordId) => {
    const response = await apiClient.get(`/history/${recordId}/evidence-archive`, {
      responseType: 'blob',
    });
    return response.data;
  },

  exportLiveEvidenceArchive: async (analysisData) => {
    const response = await apiClient.post('/history/evidence-archive', analysisData, {
      responseType: 'blob',
    });
    return response.data;
  },

  deleteHistoryItem: async (recordId) => {
    const response = await apiClient.delete(`/history/${recordId}`);
    return response.data;
  },

  clearAllHistory: async () => {
    const response = await apiClient.delete('/history');
    return response.data;
  },

  embedSecretMessage: async (file, secretText, algorithm = 'lsb_replace') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('secret_text', secretText);
    formData.append('algorithm', algorithm);
    const response = await apiClient.post('/stego/embed', formData);
    return response.data;
  },

  extractSecretMessage: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post('/stego/extract', formData);
    return response.data;
  },

  // --------------------------------------------------------------------------
  // Interactive Steganography & Forensics Laboratory Endpoints
  // --------------------------------------------------------------------------
  inspectLabImage: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post('/lab/inspect', formData);
    return response.data;
  },

  inspectLabPixel: async (imageB64, x, y) => {
    const response = await apiClient.post('/lab/pixel-inspect', {
      image_b64: imageB64,
      x,
      y,
    });
    return response.data;
  },

  toggleLabBit: async (pixelValue, bitPosition) => {
    const response = await apiClient.post('/lab/toggle-bit', {
      pixel_value: pixelValue,
      bit_position: bitPosition,
    });
    return response.data;
  },

  applyLabPixel: async (imageB64, x, y, channelIndex, newValue) => {
    const response = await apiClient.post('/lab/apply-pixel', {
      image_b64: imageB64,
      x,
      y,
      channel_index: channelIndex,
      new_value: newValue,
    });
    return response.data;
  },

  manipulateLabBulk: async (params) => {
    const response = await apiClient.post('/lab/manipulate-bulk', params);
    return response.data;
  },

  getLabBitplane: async (imageB64, plane = 0, channel = 'gray') => {
    const response = await apiClient.post('/lab/bitplane', {
      image_b64: imageB64,
      plane,
      channel,
    });
    return response.data;
  },

  embedLabSecret: async (imageB64, secretText, password = null) => {
    const response = await apiClient.post('/lab/embed', {
      image_b64: imageB64,
      secret_text: secretText,
      password: password || null,
    });
    return response.data;
  },

  extractLabSecret: async (imageB64, password = null) => {
    const response = await apiClient.post('/lab/extract', {
      image_b64: imageB64,
      password: password || null,
    });
    return response.data;
  },

  compareLabPair: async (originalB64, modifiedB64) => {
    const response = await apiClient.post('/lab/compare', {
      original_image_b64: originalB64,
      modified_image_b64: modifiedB64,
    });
    return response.data;
  },

  analyzeLabImage: async (imageB64, modelName = 'StegoNet-Lite') => {
    const formData = new FormData();
    formData.append('image_b64', imageB64);
    formData.append('model_name', modelName);
    const response = await apiClient.post('/lab/analyze', formData);
    return response.data;
  },

  saveLabExperiment: async (data) => {
    const response = await apiClient.post('/lab/experiments', data);
    return response.data;
  },

  listLabExperiments: async (limit = 50) => {
    const response = await apiClient.get(`/lab/experiments?limit=${limit}`);
    return response.data;
  },

  getLabExperiment: async (id) => {
    const response = await apiClient.get(`/lab/experiments/${id}`);
    return response.data;
  },

  deleteLabExperiment: async (id) => {
    const response = await apiClient.delete(`/lab/experiments/${id}`);
    return response.data;
  },

  getLabDownloadUrl: (id) => `${API_BASE_URL}/lab/experiments/${id}/download`,
};

export const authApi = {
  register: async (payload) => {
    const response = await apiClient.post('/auth/register', payload);
    return response.data;
  },

  login: async (payload) => {
    const response = await apiClient.post('/auth/login', payload);
    return response.data;
  },

  logout: async () => {
    const response = await apiClient.post('/auth/logout');
    return response.data;
  },

  refresh: async (payload = {}) => {
    const response = await apiClient.post('/auth/refresh', payload);
    return response.data;
  },

  getMe: async () => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },

  forgotPassword: async (email) => {
    const response = await apiClient.post('/auth/forgot-password', { email });
    return response.data;
  },

  resetPassword: async (payload) => {
    const response = await apiClient.post('/auth/reset-password', payload);
    return response.data;
  },

  changePassword: async (payload) => {
    const response = await apiClient.post('/auth/change-password', payload);
    return response.data;
  },
};

export const userApi = {
  getProfile: async () => {
    const response = await apiClient.get('/users/profile');
    return response.data;
  },

  updateProfile: async (payload) => {
    const response = await apiClient.patch('/users/profile', payload);
    return response.data;
  },

  deleteAccount: async (payload) => {
    const response = await apiClient.delete('/users/account', { data: payload });
    return response.data;
  },
};

export const mfaApi = {
  getStatus: async () => {
    const response = await apiClient.get('/auth/mfa/status');
    return response.data;
  },

  setup: async () => {
    const response = await apiClient.post('/auth/mfa/setup');
    return response.data;
  },

  enable: async (code) => {
    const response = await apiClient.post('/auth/mfa/enable', { code });
    return response.data;
  },

  disable: async (password) => {
    const response = await apiClient.post('/auth/mfa/disable', { password });
    return response.data;
  },
};

export default apiClient;

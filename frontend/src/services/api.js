import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 60000,
});

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
    const response = await apiClient.post('/analyze', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  analyzeBatch: async (files) => {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    const response = await apiClient.post('/batch', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  comparePair: async (coverFile, stegoFile) => {
    const formData = new FormData();
    formData.append('cover_file', coverFile);
    formData.append('stego_file', stegoFile);
    const response = await apiClient.post('/analyze/compare', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  extractBitplane: async (file, plane = 0) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post(`/analyze/bitplane?plane=${plane}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
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

  deleteHistoryItem: async (recordId) => {
    const response = await apiClient.delete(`/history/${recordId}`);
    return response.data;
  },

  clearAllHistory: async () => {
    const response = await apiClient.delete('/history');
    return response.data;
  },
};

export default apiClient;

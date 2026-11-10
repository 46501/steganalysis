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
};

export default apiClient;

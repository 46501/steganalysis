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

export default apiClient;

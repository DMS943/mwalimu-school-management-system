import apiClient from './client';

export const reportsApi = {
  getReports: async (params?: any) => {
    const response = await apiClient.get('/reports/reports/', { params });
    return response.data;
  },

  getReport: async (id: string) => {
    const response = await apiClient.get(`/reports/reports/${id}/`);
    return response.data;
  },

  previewReport: async (id: string) => {
    const response = await apiClient.get(`/reports/reports/${id}/preview/`);
    return response.data;
  },

  generateReport: async (data: { student_id: number; term_id: number }) => {
    const response = await apiClient.post('/reports/reports/generate/', data);
    return response.data;
  },

  updateReport: async (id: string, data: any) => {
    const response = await apiClient.patch(`/reports/reports/${id}/`, data);
    return response.data;
  },

  deleteReport: async (id: string) => {
    await apiClient.delete(`/reports/reports/${id}/`);
  },

  getTemplates: async () => {
    const response = await apiClient.get('/reports/templates/');
    return response.data;
  },

  getDefaultTemplate: async () => {
    const response = await apiClient.get('/reports/templates/default/');
    return response.data;
  },
};

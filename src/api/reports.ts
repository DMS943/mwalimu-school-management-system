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

  createReport: async (data: any) => {
    const response = await apiClient.post('/reports/reports/', data);
    return response.data;
  },

  getTemplates: async () => {
    const response = await apiClient.get('/reports/templates/');
    return response.data;
  },
};

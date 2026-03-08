import apiClient from './client';

export const academicsApi = {
  getMarks: async (params?: any) => {
    const response = await apiClient.get('/academics/marks/', { params });
    return response.data;
  },

  createMark: async (data: any) => {
    const response = await apiClient.post('/academics/marks/', data);
    return response.data;
  },

  updateMark: async (id: string, data: any) => {
    const response = await apiClient.put(`/academics/marks/${id}/`, data);
    return response.data;
  },

  deleteMark: async (id: string) => {
    await apiClient.delete(`/academics/marks/${id}/`);
  },
};

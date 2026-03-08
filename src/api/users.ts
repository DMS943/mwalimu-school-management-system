import apiClient from './client';

export const usersApi = {
  getUsers: async (params?: any) => {
    const response = await apiClient.get('/users/', { params });
    return response.data;
  },

  getUser: async (id: string) => {
    const response = await apiClient.get(`/users/${id}/`);
    return response.data;
  },

  createUser: async (data: any) => {
    const response = await apiClient.post('/users/', data);
    return response.data;
  },

  updateUser: async (id: string, data: any) => {
    const response = await apiClient.put(`/users/${id}/`, data);
    return response.data;
  },

  deleteUser: async (id: string) => {
    await apiClient.delete(`/users/${id}/`);
  },

  getCurrentUser: async () => {
    const response = await apiClient.get('/users/me/');
    return response.data;
  },
};

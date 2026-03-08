import apiClient from './client';

export const schoolsApi = {
  // School Settings (single instance)
  getSettings: async () => {
    const response = await apiClient.get('/schools/settings/current/');
    return response.data;
  },

  updateSettings: async (id: string, data: any) => {
    const response = await apiClient.put(`/schools/settings/${id}/`, data);
    return response.data;
  },

  // Departments
  getDepartments: async () => {
    const response = await apiClient.get('/schools/departments/');
    return response.data;
  },

  createDepartment: async (data: any) => {
    const response = await apiClient.post('/schools/departments/', data);
    return response.data;
  },

  updateDepartment: async (id: string, data: any) => {
    const response = await apiClient.put(`/schools/departments/${id}/`, data);
    return response.data;
  },

  deleteDepartment: async (id: string) => {
    await apiClient.delete(`/schools/departments/${id}/`);
  },

  // Classes
  getClasses: async (params?: any) => {
    const response = await apiClient.get('/schools/classes/', { params });
    return response.data;
  },

  getClass: async (id: string) => {
    const response = await apiClient.get(`/schools/classes/${id}/`);
    return response.data;
  },

  createClass: async (data: any) => {
    const response = await apiClient.post('/schools/classes/', data);
    return response.data;
  },

  updateClass: async (id: string, data: any) => {
    const response = await apiClient.put(`/schools/classes/${id}/`, data);
    return response.data;
  },

  deleteClass: async (id: string) => {
    await apiClient.delete(`/schools/classes/${id}/`);
  },

  // Subjects
  getSubjects: async () => {
    const response = await apiClient.get('/schools/subjects/');
    return response.data;
  },

  createSubject: async (data: any) => {
    const response = await apiClient.post('/schools/subjects/', data);
    return response.data;
  },

  updateSubject: async (id: string, data: any) => {
    const response = await apiClient.put(`/schools/subjects/${id}/`, data);
    return response.data;
  },

  deleteSubject: async (id: string) => {
    await apiClient.delete(`/schools/subjects/${id}/`);
  },

  // Terms
  getTerms: async () => {
    const response = await apiClient.get('/schools/terms/');
    return response.data;
  },

  getActiveTerm: async () => {
    const response = await apiClient.get('/schools/terms/active/');
    return response.data;
  },

  createTerm: async (data: any) => {
    const response = await apiClient.post('/schools/terms/', data);
    return response.data;
  },

  updateTerm: async (id: string, data: any) => {
    const response = await apiClient.put(`/schools/terms/${id}/`, data);
    return response.data;
  },

  deleteTerm: async (id: string) => {
    await apiClient.delete(`/schools/terms/${id}/`);
  },
};

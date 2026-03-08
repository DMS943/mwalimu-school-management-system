import apiClient from './client';

export const studentsApi = {
  getStudents: async (params?: any) => {
    const response = await apiClient.get('/students/students/', { params });
    return response.data;
  },

  getStudent: async (id: string) => {
    const response = await apiClient.get(`/students/students/${id}/`);
    return response.data;
  },

  createStudent: async (data: any) => {
    const response = await apiClient.post('/students/students/', data);
    return response.data;
  },

  updateStudent: async (id: string, data: any) => {
    const response = await apiClient.put(`/students/students/${id}/`, data);
    return response.data;
  },

  deleteStudent: async (id: string) => {
    await apiClient.delete(`/students/students/${id}/`);
  },

  // Attendance
  getAttendance: async (params?: any) => {
    const response = await apiClient.get('/students/attendance/', { params });
    return response.data;
  },

  createAttendance: async (data: any) => {
    const response = await apiClient.post('/students/attendance/', data);
    return response.data;
  },

  updateAttendance: async (id: string, data: any) => {
    const response = await apiClient.put(`/students/attendance/${id}/`, data);
    return response.data;
  },

  // Link Codes
  getLinkCodes: async (params?: any) => {
    const response = await apiClient.get('/students/link-codes/', { params });
    return response.data;
  },

  createLinkCode: async (data: any) => {
    const response = await apiClient.post('/students/link-codes/', data);
    return response.data;
  },

  useLinkCode: async (code: string) => {
    const response = await apiClient.post('/students/link-codes/use/', { code });
    return response.data;
  },
};

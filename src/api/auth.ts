import apiClient from './client';

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResponse {
  access: string;
  refresh: string;
  user: {
    id: number;
    username: string;
    email: string;
    role: string;
    first_name?: string;
    last_name?: string;
  };
}

export const authAPI = {
  login: async (username: string, password: string): Promise<LoginResponse> => {
    const response = await apiClient.post('/users/login/', { username, password });
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
  },

  getCurrentUser: async () => {
    const response = await apiClient.get('/users/me/');
    return response.data;
  },

  isAuthenticated: (): boolean => {
    return !!localStorage.getItem('access_token');
  },

  refreshToken: async (refresh: string) => {
    const response = await apiClient.post('/auth/token/refresh/', { refresh });
    return response.data;
  },
};

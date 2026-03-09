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

export interface ParentSignupData {
  username: string;
  email: string;
  password: string;
  full_name: string;
  student_identifier: string;  // Can be student ID or full name
}

export interface ParentSignupResponse extends LoginResponse {
  student: {
    id: number;
    full_name: string;
    student_number: string;
  };
}

export const authAPI = {
  login: async (username: string, password: string): Promise<LoginResponse> => {
    const response = await apiClient.post('/users/login/', { username, password });
    return response.data;
  },

  parentSignup: async (data: ParentSignupData): Promise<ParentSignupResponse> => {
    const response = await apiClient.post('/users/parent-signup/', data);
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

import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const getEmployees = () => api.get('/employees');
export const getEmployee = (id) => api.get(`/employees/${id}`);
export const submitTraining = (data) => {
  // If data is FormData (with file upload), use multipart/form-data
  if (data instanceof FormData) {
    return axios.post(`${API_BASE_URL}/training`, data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }
  // Otherwise use regular JSON post
  return api.post('/training', data);
};
export const getTrainingRecords = () => api.get('/training');
export const getEmployeeTraining = (id) => api.get(`/training/employee/${id}`);
export const getDashboardStats = () => api.get('/dashboard/stats');
export const getQRCode = (url) => api.get('/qrcode', { params: { url } });

// Export API_BASE_URL for components that need direct axios calls
export { API_BASE_URL };

export default api;

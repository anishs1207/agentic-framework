import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: API_BASE_URL,
});

export const uploadImage = async (file: File) => {
  const formData = new FormData();
  formData.append('image', file);
  const response = await api.post('/images/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const getAllImages = async () => {
  const response = await api.get('/images');
  return response.data;
};

export const getImageMetadata = async (id: string) => {
  const response = await api.get(`/images/${id}`);
  return response.data;
};

export const getImageUrl = (id: string) => {
  return `${API_BASE_URL}/images/${id}/file`;
};

export const getStats = async () => {
  const response = await api.get('/images/stats');
  return response.data;
};

export const queryMemory = async (query: string) => {
  const response = await api.post('/backend/query', { query });
  return response.data;
};

export const getAllPeople = async () => {
  const response = await api.get('/images/people/all');
  return response.data;
};

export const getAllRelationships = async () => {
  const response = await api.get('/images/relationships/all');
  return response.data;
};

export const getAllEvents = async () => {
  const response = await api.get('/images/events/all');
  return response.data;
};

export const resetAllData = async () => {
  const response = await api.post('/images/reset-all');
  return response.data;
};

export const renamePerson = async (personId: string, name: string) => {
  const response = await api.post(`/images/people/${personId}/rename`, { name });
  return response.data;
};

export default api;

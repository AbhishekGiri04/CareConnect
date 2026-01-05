import axios from 'axios';
import io from 'socket.io-client';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001';
const SMARTASSIST_API = 'http://localhost:5004/api';

// Axios instance with default config for CareConnect backend
const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Direct SmartAssist API instance
const smartAssistAPI = axios.create({
  baseURL: SMARTASSIST_API,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// Socket.IO connection
let socket = null;

export const connectSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
    });
    
    socket.on('connect', () => {
      console.log('✅ Socket connected');
    });
    
    socket.on('disconnect', () => {
      console.log('🔌 Socket disconnected');
    });
  }
  return socket;
};

export const getSocket = () => socket;

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data),
};

// Device API - connects to CareConnect backend which proxies to SmartAssist
export const deviceAPI = {
  getAll: () => api.get('/devices'),
  getById: (id) => api.get(`/devices/${id}`),
  create: (device) => api.post('/devices', device),
  update: (id, device) => api.put(`/devices/${id}`, device),
  delete: (id) => api.delete(`/devices/${id}`),
  control: (id, command) => api.post(`/devices/${id}/control`, command),
  getStatus: (id) => api.get(`/devices/${id}/status`),
  toggleDevice: (id) => api.post(`/devices/${id}/toggle`),
};

// Dashboard API for real-time stats
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
  getDevices: () => api.get('/devices'),
  getAlerts: () => api.get('/alerts'),
};

// Alert API
export const alertAPI = {
  getAll: () => api.get('/alerts'),
  getById: (id) => api.get(`/alerts/${id}`),
  create: (alert) => api.post('/alerts', alert),
  update: (id, alert) => api.put(`/alerts/${id}`, alert),
  delete: (id) => api.delete(`/alerts/${id}`),
  markAsRead: (id) => api.patch(`/alerts/${id}/read`),
  getUnread: () => api.get('/alerts/unread'),
  simulateFall: () => api.post('/alerts/simulate-fall'),
};

// Analytics API
export const analyticsAPI = {
  getDeviceUsage: () => api.get('/analytics/device-usage'),
  getEnergyConsumption: () => api.get('/analytics/energy'),
  getActivityLog: () => api.get('/analytics/activity'),
  getHealthMetrics: () => api.get('/analytics/health'),
};

// Voice Control API
export const voiceAPI = {
  processCommand: (command) => api.post('/voice/process', { command }),
  getCommands: () => api.get('/voice/commands'),
};

// Gesture Control API
export const gestureAPI = {
  getCommands: () => api.get('/gesture/commands'),
  createCommand: (command) => api.post('/gesture/commands', command),
  updateCommand: (id, command) => api.put(`/gesture/commands/${id}`, command),
  deleteCommand: (id) => api.delete(`/gesture/commands/${id}`),
  processGesture: (data) => api.post('/gesture/process', data),
  getPresets: () => api.get('/gesture/presets'),
};

// Health Monitoring API
export const healthAPI = {
  getData: () => api.get('/health'),
  addData: (data) => api.post('/health/data', data),
  reportFall: (data) => api.post('/health/fall-detected', data),
  getAnalytics: (period) => api.get(`/health/analytics?period=${period}`),
};

// Caregiver API
export const caregiverAPI = {
  getDashboard: () => api.get('/caregiver/dashboard'),
  addPatient: (patientEmail) => api.post('/caregiver/patients', { patientEmail }),
  getPatient: (patientId) => api.get(`/caregiver/patients/${patientId}`),
  resolveAlert: (alertId) => api.put(`/caregiver/alerts/${alertId}/resolve`),
  getEmergencyContacts: (patientId) => api.get(`/caregiver/patients/${patientId}/emergency-contacts`),
  sendAlert: (patientId, message) => api.post(`/caregiver/patients/${patientId}/alert`, { message }),
};

// Emergency API
export const emergencyAPI = {
  trigger: (type, location) => api.post('/emergency/trigger', { type, location }),
  getContacts: () => api.get('/emergency/contacts'),
  addContact: (contact) => api.post('/emergency/contacts', contact),
  updateContact: (id, contact) => api.put(`/emergency/contacts/${id}`, contact),
  deleteContact: (id) => api.delete(`/emergency/contacts/${id}`),
};

// Real-time event handlers
export const subscribeToDeviceUpdates = (callback) => {
  const socket = getSocket();
  if (socket) {
    socket.on('device_update', callback);
    socket.on('mqtt_message', callback);
  }
};

export const subscribeToAlerts = (callback) => {
  const socket = getSocket();
  if (socket) {
    socket.on('new_alert', callback);
    socket.on('alert_update', callback);
  }
};

export const subscribeToSensorData = (callback) => {
  const socket = getSocket();
  if (socket) {
    socket.on('sensor_data', callback);
  }
};

// Utility functions
export const formatError = (error) => {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error.message) {
    return error.message;
  }
  return 'An unexpected error occurred';
};

export const isOnline = () => {
  return navigator.onLine;
};

// Export both API instances
export { smartAssistAPI };
export default api;
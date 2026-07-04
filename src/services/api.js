import axios from 'axios';
import Cookies from 'js-cookie';

const STORAGE_KEY = 'nxtbuild-mock-state';

const getApiBaseUrl = () => {
  const configuredUrl = (import.meta.env.VITE_API_URL || '').trim();

  if (!configuredUrl) {
    return import.meta.env.DEV ? 'http://localhost:5000/api' : '';
  }

  const normalizedUrl = configuredUrl.replace(/\/+$/, '');
  return normalizedUrl.endsWith('/api') ? normalizedUrl : `${normalizedUrl}/api`;
};

const BASE_URL = getApiBaseUrl();
const useMockData = import.meta.env.PROD && !BASE_URL;

const readMockState = () => {
  if (typeof window === 'undefined') {
    return { user: null, projects: [], token: null };
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return { user: null, projects: [], token: null };
    }

    return JSON.parse(stored);
  } catch (error) {
    return { user: null, projects: [], token: null };
  }
};

const writeMockState = (state) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

const getHeaders = () => {
  const token = Cookies.get('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const createMockId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const mockRequest = async (method, url, data) => {
  await new Promise((resolve) => setTimeout(resolve, 250));

  const state = readMockState();
  const path = url.replace(/^\/+/, '');

  if (method === 'post' && path === 'auth/register') {
    const { name, email, password } = data || {};
    const user = { id: createMockId(), email, name };
    const token = `mock-${createMockId()}`;
    const nextState = { ...state, user, token, projects: state.projects || [] };
    writeMockState(nextState);
    Cookies.set('token', token, { expires: 7 });
    return { data: { data: { token, user } } };
  }

  if (method === 'post' && path === 'auth/login') {
    const { email, password } = data || {};
    const user = { id: createMockId(), email, name: email.split('@')[0] };
    const token = `mock-${createMockId()}`;
    const nextState = { ...state, user, token, projects: state.projects || [] };
    writeMockState(nextState);
    Cookies.set('token', token, { expires: 7 });
    return { data: { data: { token, user } } };
  }

  if (method === 'post' && path === 'auth/logout') {
    Cookies.remove('token');
    const nextState = { ...state, user: null, token: null };
    writeMockState(nextState);
    return { data: { success: true, data: { message: 'Logged out successfully' } } };
  }

  if (method === 'get' && path === 'auth/me') {
    const token = Cookies.get('token') || state.token;
    if (!token) {
      return { data: { data: null } };
    }

    return { data: { data: state.user } };
  }

  if (method === 'get' && path === 'projects') {
    return { data: { data: state.projects || [] } };
  }

  if (method === 'post' && path === 'projects') {
    const title = (data && data.title) || 'Untitled Project';
    const project = {
      _id: createMockId(),
      title,
      messages: [],
      generatedCode: '',
      versions: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const nextState = { ...state, projects: [...(state.projects || []), project] };
    writeMockState(nextState);
    return { data: { data: project } };
  }

  if (method === 'get' && path.startsWith('projects/')) {
    const [, projectId] = path.split('/');
    const project = (state.projects || []).find((item) => item._id === projectId);
    if (!project) {
      return { data: { data: null } };
    }
    return { data: { data: project } };
  }

  if (method === 'put' && path.startsWith('projects/')) {
    const [, projectId] = path.split('/');
    const updatedProjects = (state.projects || []).map((item) => {
      if (item._id === projectId) {
        return { ...item, ...(data || {}) };
      }
      return item;
    });
    const nextState = { ...state, projects: updatedProjects };
    writeMockState(nextState);
    return { data: { data: updatedProjects.find((item) => item._id === projectId) } };
  }

  if (method === 'delete' && path.startsWith('projects/')) {
    const [, projectId] = path.split('/');
    const updatedProjects = (state.projects || []).filter((item) => item._id !== projectId);
    const nextState = { ...state, projects: updatedProjects };
    writeMockState(nextState);
    return { data: { data: { success: true } } };
  }

  if (method === 'post' && path.startsWith('generate/')) {
    const [, projectId] = path.split('/');
    const projects = state.projects || [];
    const project = projects.find((item) => item._id === projectId);
    const generatedCode = `<!DOCTYPE html><html><body><h1>${data?.prompt || 'Generated app'}</h1><p>Mock generation is active.</p></body></html>`;

    if (project) {
      project.generatedCode = generatedCode;
      project.messages = [
        ...(project.messages || []),
        { role: 'user', content: data?.prompt || '', timestamp: new Date().toISOString() },
        { role: 'assistant', content: 'Here is your generated code.', timestamp: new Date().toISOString() },
      ];
      project.updatedAt = new Date().toISOString();
      writeMockState({ ...state, projects });
    }

    return {
      data: {
        data: {
          message: { role: 'assistant', content: 'Here is your generated code.', timestamp: new Date().toISOString() },
          generatedCode,
          versionIndex: 1,
        },
      },
    };
  }

  return { data: { data: null } };
};

const api = {
  get: async (url) => {
    if (useMockData) {
      return mockRequest('get', url);
    }

    const response = await axios.get(`${BASE_URL}${url}`, { headers: getHeaders() });
    return response;
  },
  post: async (url, data) => {
    if (useMockData) {
      return mockRequest('post', url, data);
    }

    const response = await axios.post(`${BASE_URL}${url}`, data, { headers: getHeaders() });
    return response;
  },
  put: async (url, data) => {
    if (useMockData) {
      return mockRequest('put', url, data);
    }

    const response = await axios.put(`${BASE_URL}${url}`, data, { headers: getHeaders() });
    return response;
  },
  delete: async (url) => {
    if (useMockData) {
      return mockRequest('delete', url);
    }

    const response = await axios.delete(`${BASE_URL}${url}`, { headers: getHeaders() });
    return response;
  },
};

export default api;
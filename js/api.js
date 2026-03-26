/**
 * api.js – Helper for backend API calls.
 */
const API = (() => {
  const BASE_URL = '/api';

  function getToken() {
    return localStorage.getItem('smp_token');
  }

  function setToken(token) {
    if (token) {
      localStorage.setItem('smp_token', token);
    } else {
      localStorage.removeItem('smp_token');
    }
  }

  async function request(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;
    const token = getToken();

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const res = await fetch(url, { ...options, headers });
    const data = await res.json();

    if (!res.ok || !data.success) {
      if (res.status === 401) {
        Auth.logout();
      }
      throw new Error(data.error || 'API Error');
    }

    return data;
  }

  return { request, getToken, setToken };
})();

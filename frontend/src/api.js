const API_BASE = 'http://localhost:4000/api';

function getToken() {
  return localStorage.getItem('chesshub_token');
}

function getHeaders(isJson = true) {
  const token = getToken();
  const headers = {};

  if (isJson) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, options);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || 'Error en la petición');
  }

  return data;
}

export const authApi = {
  register: (payload) =>
    request('/auth/register', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    }),
  login: (payload) =>
    request('/auth/login', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    })
};

export const coursesApi = {
  getCourses: (params) => {
    const query = new URLSearchParams(params).toString();
    return request(`/courses${query ? `?${query}` : ''}`);
  },
  getCourse: (id) => request(`/courses/${id}`),
  getLines: (id) =>
    request(`/courses/${id}/lines`, {
      headers: getHeaders(false)
    })
};

export const progressApi = {
  dueLines: () =>
    request('/progress/due-lines', {
      headers: getHeaders(false)
    }),
  activeCourses: () =>
    request('/progress/active-courses', {
      headers: getHeaders(false)
    }),
  recommendations: () =>
    request('/progress/recommendations', {
      headers: getHeaders(false)
    }),
  review: (payload) =>
    request('/progress/review', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    })
};

export const subscriptionApi = {
  upgrade: () =>
    request('/subscription/upgrade', {
      method: 'POST',
      headers: getHeaders(false)
    })
};

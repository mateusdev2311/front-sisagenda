import axios from 'axios';

/**
 * Global Axios Configuration & Interceptor Engine
 * This file centralizes all HTTP requests going to the Backend API.
 * 
 * Flow:
 * 1. Checks standard Vite environment variables for the API URL, falling back to localhost:3333.
 * 2. Injects the Bearer JWT token into the headers of EVERY outgoing request automatically.
 * 3. Catches all incoming responses and acts upon them (e.g., auto-logout if token is expired).
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://users-postgres.onrender.com';

axios.defaults.baseURL = API_BASE_URL;

/**
 * Request Interceptor 
 * Executes BEFORE the request leaves the browser. 
 * Looks into LocalStorage to attach the auth credentials.
 */
axios.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add a response interceptor to catch 401s globally
axios.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        const isLoginPage = window.location.pathname === '/login';
        const isLoginRequest = error.config && error.config.url && error.config.url.includes('/login');

        if (error.response && error.response.status === 401 && !isLoginPage && !isLoginRequest) {
            // Token is expired or invalid
            console.warn('Unauthorized access - Redirecting to login.');
            localStorage.removeItem('token');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default axios;

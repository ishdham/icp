import axios from 'axios';
import { auth } from '../config/firebase';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000/v1';

const client = axios.create({
    baseURL,
});

client.interceptors.request.use(async (config) => {
    const user = auth.currentUser;
    if (user) {
        const token = await user.getIdToken();
        config.headers.Authorization = `Bearer ${token}`;
    }

    const lang = localStorage.getItem('app_language');
    if (lang) {
        config.params = { ...config.params, lang };
    }

    return config;
});

export default client;

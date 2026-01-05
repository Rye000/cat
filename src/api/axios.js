import axios from 'axios';

// 建立 axios 實例
const api = axios.create({
    // 使用環境變數中的 API URL，如果未設定則為空字串或預設值
    baseURL: import.meta.env.VITE_API_URL || '',
    timeout: 10000, // 請求超時時間 (10秒)
    headers: {
        'Content-Type': 'application/json',
    },
});

// === Request 攔截器 ===
api.interceptors.request.use(
    (config) => {
        // 在發送請求前做些什麼，例如加入 Auth Token
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        // 對請求錯誤做些什麼
        console.error('Request Error:', error);
        return Promise.reject(error);
    }
);

// === Response 攔截器 ===
api.interceptors.response.use(
    (response) => {
        // 對回應資料做點什麼 (例如只回傳 data 部分)
        // 這裡回傳 response 讓使用者可以存取 status 等資訊，視需求可改為 return response.data;
        return response;
    },
    (error) => {
        // 對回應錯誤做點什麼
        if (error.response) {
            // 伺服器回應了狀態碼，但不在 2xx 範圍內
            switch (error.response.status) {
                case 401:
                    // 未授權，可能需要登出或刷新 Token
                    console.warn('Unauthorized: Redirecting to login...');
                    // window.location.href = '/login'; // 視需求啟用
                    break;
                case 403:
                    console.warn('Forbidden: Access denied.');
                    break;
                case 404:
                    console.warn('Resource not found.');
                    break;
                case 500:
                    console.error('Server error.');
                    break;
                default:
                    console.error(`API Error: ${error.response.status}`);
            }
        } else if (error.request) {
            // 請求已發出但沒有收到回應
            console.error('No response received:', error.request);
        } else {
            // 設定請求時觸發了錯誤
            console.error('Error setting up request:', error.message);
        }
        return Promise.reject(error);
    }
);

export default api;

import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL as string,
  withCredentials: true,
})

// Emit a custom event on 401 so AuthContext can trigger a token refresh
// Skip /auth/refresh and /auth/login to avoid infinite loops
api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      const url = error.config?.url ?? ''
      const isAuthEndpoint = url.includes('/auth/refresh') || url.includes('/auth/login')
      if (!isAuthEndpoint) {
        window.dispatchEvent(new CustomEvent('auth:unauthorized'))
      }
    }
    return Promise.reject(error)
  },
)

export default api

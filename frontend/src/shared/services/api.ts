import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL as string,
  withCredentials: true,
})

// Only fire auth:unauthorized when the user is known to be authenticated.
// This prevents a stale refresh triggered by the initial /users/me probe
// from wiping a freshly-logged-in user.
let _isAuthenticated = false
export const updateAuthState = (authenticated: boolean) => {
  _isAuthenticated = authenticated
}

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      const url = error.config?.url ?? ''
      const isAuthEndpoint = url.includes('/auth/refresh') || url.includes('/auth/login')
      if (!isAuthEndpoint && _isAuthenticated) {
        window.dispatchEvent(new CustomEvent('auth:unauthorized'))
      }
    }
    return Promise.reject(error)
  },
)

export default api

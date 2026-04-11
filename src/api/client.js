import axios from 'axios'

// Development  → http://localhost:8000       (from .env.development)
// Production   → https://xxx.onrender.com   (from .env.production)
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// Global error interceptor
api.interceptors.response.use(
  res => res,
  err => {
    console.error('API error:', err.response?.status, err.response?.data || err.message)
    return Promise.reject(err)
  }
)

// Items
export const getItems = () => api.get('/items/')
export const createItem = (data) => api.post('/items/', data)
export const updateItem = (id, data) => api.put(`/items/${id}`, data)
export const deleteItem = (id) => api.delete(`/items/${id}`)

// Customers
export const getCustomers = () => api.get('/customers/')
export const createCustomer = (data) => api.post('/customers/', data)
export const updateCustomer = (id, data) => api.put(`/customers/${id}`, data)
export const deleteCustomer = (id) => api.delete(`/customers/${id}`)

// Bills
export const getBills = () => api.get('/bills/')
export const getBill = (id) => api.get(`/bills/${id}`)
export const createBill = (data) => api.post('/bills/', data)
export const updateBill = (id, data) => api.put(`/bills/${id}`, data)
export const deleteBill = (id) => api.delete(`/bills/${id}`)

// Company Settings
export const getCompanySettings = () => api.get('/settings/company')
export const saveCompanySettings = (data) => api.post('/settings/company', data)

export default api

/**
 * Commission Cargo - API Client
 * Centralized API wrapper for all HTTP requests
 */

import type { ApiResponse, PaginatedResponse } from './types';

const API_BASE = '/api';

class ApiError extends Error {
    constructor(public status: number, message: string) {
        super(message);
        this.name = 'ApiError';
    }
}

async function handleResponse<T>(response: Response): Promise<T> {
    const data = await response.json();

    if (!response.ok) {
        throw new ApiError(response.status, data.error || 'An error occurred');
    }

    return data;
}

export const api = {
    // Generic methods
    async get<T>(endpoint: string): Promise<T> {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        return handleResponse<T>(response);
    },

    async post<T>(endpoint: string, body?: unknown): Promise<T> {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: body ? JSON.stringify(body) : undefined,
        });
        return handleResponse<T>(response);
    },

    async patch<T>(endpoint: string, body: unknown): Promise<T> {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });
        return handleResponse<T>(response);
    },

    async delete<T>(endpoint: string): Promise<T> {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
        });
        return handleResponse<T>(response);
    },

    async upload<T>(endpoint: string, formData: FormData): Promise<T> {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            method: 'POST',
            body: formData,
        });
        return handleResponse<T>(response);
    },

    // Auth
    auth: {
        login(email: string, password: string) {
            return api.post<ApiResponse>('/auth/login', { email, password });
        },
        logout() {
            return api.post<ApiResponse>('/auth/logout');
        },
        me() {
            return api.get<ApiResponse>('/auth/me');
        },
    },

    // Rate Cards
    rateCards: {
        list() {
            return api.get<ApiResponse>('/rate-cards');
        },
        get(id: string) {
            return api.get<ApiResponse>(`/rate-cards/${id}`);
        },
        create(data: unknown) {
            return api.post<ApiResponse>('/rate-cards', data);
        },
        update(id: string, data: unknown) {
            return api.patch<ApiResponse>(`/rate-cards/${id}`, data);
        },
        activate(id: string) {
            return api.post<ApiResponse>(`/rate-cards/${id}/activate`);
        },
        getRows(id: string) {
            return api.get<ApiResponse>(`/rate-cards/${id}/rows`);
        },
        updateRows(id: string, rows: unknown[]) {
            return api.post<ApiResponse>(`/rate-cards/${id}/rows`, { rows });
        },
    },

    // Shipments
    shipments: {
        list(filters?: Record<string, string>) {
            const params = filters ? `?${new URLSearchParams(filters).toString()}` : '';
            return api.get<PaginatedResponse<unknown>>(`/shipments${params}`);
        },
        get(id: string) {
            return api.get<ApiResponse>(`/shipments/${id}`);
        },
        create(data: unknown) {
            return api.post<ApiResponse>('/shipments', data);
        },
        update(id: string, data: unknown) {
            return api.patch<ApiResponse>(`/shipments/${id}`, data);
        },
        delete(id: string) {
            return api.delete<ApiResponse>(`/shipments/${id}`);
        },
        importCsv(formData: FormData) {
            return api.upload<ApiResponse>('/shipments/import-csv', formData);
        },
        exportCsv(filters?: Record<string, string>) {
            const params = filters ? `?${new URLSearchParams(filters).toString()}` : '';
            return api.get<Blob>(`/shipments/export-csv${params}`);
        },
        recalculate(data: unknown) {
            return api.post<ApiResponse>('/shipments/recalculate', data);
        },
    },

    // Customers
    customers: {
        list() {
            return api.get<ApiResponse>('/customers');
        },
        create(data: unknown) {
            return api.post<ApiResponse>('/customers', data);
        },
        update(id: string, data: unknown) {
            return api.patch<ApiResponse>(`/customers/${id}`, data);
        },
    },

    // Salespeople
    salespeople: {
        list() {
            return api.get<ApiResponse>('/salespeople');
        },
        create(data: unknown) {
            return api.post<ApiResponse>('/salespeople', data);
        },
        update(id: string, data: unknown) {
            return api.patch<ApiResponse>(`/salespeople/${id}`, data);
        },
    },

    // Reports
    reports: {
        summary(filters?: Record<string, string>) {
            const params = filters ? `?${new URLSearchParams(filters).toString()}` : '';
            return api.get<ApiResponse>(`/reports/summary${params}`);
        },
        dashboard(filters?: Record<string, string>) {
            const params = filters ? `?${new URLSearchParams(filters).toString()}` : '';
            return api.get<ApiResponse>(`/reports/dashboard${params}`);
        },
        risks(filters?: Record<string, string>) {
            const params = filters ? `?${new URLSearchParams(filters).toString()}` : '';
            return api.get<ApiResponse>(`/reports/risks${params}`);
        },
    },

    // Audit Logs
    auditLogs: {
        list(filters?: Record<string, string>) {
            const params = filters ? `?${new URLSearchParams(filters).toString()}` : '';
            return api.get<PaginatedResponse<unknown>>(`/audit-logs${params}`);
        },
    },
};

export { ApiError };
export default api;

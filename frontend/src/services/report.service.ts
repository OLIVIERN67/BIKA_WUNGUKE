import { api, clearToken, getToken, unwrap } from './api';
import { ReportPayload, TransactionType } from '../types';

export interface ReportQuery {
  from?: string;
  to?: string;
  type?: TransactionType;
}

export function getReport(query: ReportQuery = {}): Promise<ReportPayload> {
  return unwrap(api.get('/reports', { params: query }));
}

function buildQueryString(query: ReportQuery): string {
  const params = new URLSearchParams();
  if (query.from) params.set('from', query.from);
  if (query.to) params.set('to', query.to);
  if (query.type) params.set('type', query.type);
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

/**
 * Downloads a file from an authenticated endpoint by including the JWT.
 */
async function download(path: string, filename: string, query: ReportQuery): Promise<void> {
  const response = await fetch(`${API_BASE}${path}${buildQueryString(query)}`, {
    headers: { Authorization: `Bearer ${getToken() ?? ''}` },
  });

  if (!response.ok) {
    // The axios 401 interceptor does not run for fetch - mirror its behaviour
    // so an expired session signs the user out instead of failing silently.
    if (response.status === 401) {
      clearToken();
      if (!window.location.pathname.startsWith('/login')) {
        window.location.assign('/login');
      }
      throw new Error('Your session has expired. Please sign in again.');
    }
    let message = 'Failed to export report';
    try {
      const data = (await response.clone().json()) as { message?: string };
      if (data?.message) message = data.message;
    } catch {
      // Non-JSON error body (proxy/HTML) - keep the generic message.
    }
    throw new Error(message);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function exportCsv(query: ReportQuery = {}): Promise<void> {
  return download('/reports/csv', 'bika-wunguke-report.csv', query);
}

export function exportPdf(query: ReportQuery = {}): Promise<void> {
  return download('/reports/pdf', 'bika-wunguke-report.pdf', query);
}

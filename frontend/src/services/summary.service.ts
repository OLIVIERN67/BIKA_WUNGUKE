import { api, unwrap } from './api';
import { Observation, PeriodSummary } from '../types';
import { DateRange } from './dashboard.service';

export function getPeriodSummary(range: DateRange = {}): Promise<PeriodSummary> {
  return unwrap(api.get('/dashboard/period-summary', { params: range }));
}

export function getObservations(range: DateRange = {}): Promise<Observation[]> {
  return unwrap(api.get('/dashboard/observations', { params: range }));
}

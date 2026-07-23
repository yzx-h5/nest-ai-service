export interface ReadinessResult {
  status: 'ok';
  checks: { qdrant: 'up' | 'not_configured' };
}

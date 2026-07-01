/** 请求头中携带 API Key 的字段名（Express 会将其转为小写）。 */
export const API_KEY_HEADER = 'x-api-key';

/** Swagger 中 API Key 安全方案的名称。 */
export const API_KEY_SECURITY_NAME = 'api-key';

/**
 * 无需鉴权 / 限流的路径前缀：
 * - /metrics：Prometheus 抓取端点
 * - /api：Swagger 文档
 * - /demo：API 调试页面
 */
export const SECURITY_SKIP_PREFIXES = ['/metrics', '/api', '/demo'];

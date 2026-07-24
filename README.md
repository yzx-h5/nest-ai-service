# Nest AI Service

面向生产环境的 NestJS AI 与知识库服务。提供 LLM 对话、文件导入、Qdrant 向量检索、流式响应，以及统一响应、鉴权、限流、结构化日志、Prometheus 指标和容器健康检查。

## 知识库网页导入

调用 `POST /ai/knowledge/documents/url` 可将公开网页提取为正文并导入知识库：

```json
{
  "url": "https://docs.nestjs.com/controllers"
}
```

接口默认仅允许 HTTP(S) 公开地址，会拦截 `localhost`、内网 IP 和超出限制的重定向；单页最大 5MB，抓取超时为 15 秒。页面会去除脚本、样式等非正文内容，并将网页标题和最终 URL 作为片段元数据写入向量库。

若服务部署在受控内网且需要导入本机、Docker 或企业内网页面，可设置 `KNOWLEDGE_WEB_ALLOW_PRIVATE_NETWORK=true`。该配置会降低 SSRF 防护强度，生产环境应仅在确认调用方可信时启用。

## 快速开始

```bash
pnpm install
cp .env.example .env
pnpm start:dev
```

本地 API 文档默认位于 `http://localhost:3000/api`，指标端点为 `http://localhost:3000/metrics`。

## 质量门禁

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test --runInBand
pnpm test:e2e --runInBand
pnpm test:ci
```

`lint` 只检查，不会修改工作区；需要格式化修复时使用 `pnpm format` 或 `pnpm lint:fix`。

## 生产部署

```bash
docker compose up -d --build
```

生产环境在启动期校验以下条件：

- 必须启用 API Key 鉴权，并配置 `API_KEYS`。
- 若启用 CORS，`CORS_ORIGIN` 必须是明确的来源白名单，不能使用 `*`。
- 必须提供 Qdrant、LLM 和 Embedding 的必要连接配置。
- Grafana 管理员账号和密码必须通过环境变量设置，禁止默认凭证。

容器以非 root 用户运行。机密值应通过 CI/CD 的 Secret 或密钥管理系统注入，不应提交到仓库。

## 运维端点

| 端点                | 说明                                        |
| ------------------- | ------------------------------------------- |
| `GET /health/live`  | 进程存活探针，不访问外部依赖                |
| `GET /health/ready` | 就绪探针，检查 Qdrant 是否可用              |
| `GET /metrics`      | Prometheus 指标                             |
| `GET /api`          | Swagger，仅在 `SWAGGER_ENABLED=true` 时启用 |

所有 HTTP 响应会回传 `x-request-id`。异常响应中同时包含 `requestId`，可与 JSON 结构化访问日志关联排障；日志不会记录查询参数、请求体或 API Key。

## 安全与扩展

- API Key 使用常量时间比较，支持多个 Key 以便轮换。
- 限流、CORS、请求体上限和可信代理均由环境变量控制。
- 当前限流存储为进程内存，单实例适用；水平扩容时应替换为 Redis 等共享 Throttler storage。
- Qdrant 在 Compose 中仅绑定到本机回环地址。生产环境应将 `/metrics` 放在内网、服务网格或反向代理访问控制之后。
- 业务模块保持 controller / DTO / service 边界；跨领域能力统一放在 `src/common`，方便替换鉴权、日志和指标实现。

Grafana 与 Prometheus 的预置配置位于 `monitoring/`。仪表盘包含请求速率、延迟分位数、状态码和进程资源使用情况。

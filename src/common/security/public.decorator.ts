import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * 标记某个路由或控制器无需 API Key 鉴权即可访问。
 * 用于健康检查、公开端点等场景。
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

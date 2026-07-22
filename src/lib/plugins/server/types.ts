import type { AuthUser } from '@/lib/api/auth';
import type { CmsSdk } from '@/lib/plugins/server/sdk';
import type { PluginApp } from '@/lib/plugins/server/router';

export type PluginHandler = (
  req: PluginRequest,
  res: PluginResponse
) => void | Promise<void>;

export type PluginMiddleware = (
  req: PluginRequest,
  res: PluginResponse,
  next: () => void | Promise<void>
) => void | Promise<void>;

export interface PluginRequest {
  method: string;
  url: string;
  /** Path relative to /api/plugins/{pluginId} */
  path: string;
  params: Record<string, string>;
  query: Record<string, string>;
  body: unknown;
  headers: Headers;
  user: AuthUser | null;
  permissions: string[];
  roles: string[];
  pluginId: string;
  cms?: CmsSdk;
}

export interface PluginResponse {
  status(code: number): PluginResponse;
  json(data: unknown): PluginResponse;
  send(data: unknown): PluginResponse;
  setHeader(name: string, value: string): PluginResponse;
  getStatus(): number;
  getBody(): unknown;
  getHeaders(): Record<string, string>;
  end(): void;
}

export interface PluginServerModule {
  register?: (ctx: PluginRegisterContext) => void | Promise<void>;
  boot?: (ctx: PluginRegisterContext) => void | Promise<void>;
  shutdown?: () => void | Promise<void>;
}

export interface PluginRegisterContext {
  app: PluginApp;
  cms: CmsSdk;
}

export interface LoadedPlugin {
  pluginId: string;
  serverEntry: string;
  apiPrefix: string;
  app: PluginApp;
  module: PluginServerModule;
  permissions: string[];
  loadedAt: Date;
}

export interface PluginRouteDefinition {
  method: string;
  path: string;
  handler: PluginHandler;
}

export interface PluginMigrationModule {
  name?: string;
  up: (cms: CmsSdk) => void | Promise<void>;
  down?: (cms: CmsSdk) => void | Promise<void>;
}

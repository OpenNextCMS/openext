import type { PluginHandler, PluginMiddleware, PluginRequest, PluginResponse } from '@/lib/plugins/server/types';

const RESERVED_PATHS = new Set(['data']);

interface RouteEntry {
  method: string;
  pattern: string;
  segments: string[];
  paramNames: string[];
  handlers: PluginHandler[];
}

interface MutablePluginResponse extends PluginResponse {
  _ended: boolean;
  _body: unknown;
}

function parsePattern(pattern: string): { segments: string[]; paramNames: string[] } {
  const normalized = pattern.replace(/\/+/g, '/').replace(/^\//, '').replace(/\/$/, '');
  const segments = normalized ? normalized.split('/') : [];
  const paramNames: string[] = [];

  for (const segment of segments) {
    paramNames.push(segment.startsWith(':') ? segment.slice(1) : '');
  }

  return { segments, paramNames };
}

function matchPath(
  routeSegments: string[],
  paramNames: string[],
  requestSegments: string[]
): Record<string, string> | null {
  if (routeSegments.length !== requestSegments.length) return null;

  const params: Record<string, string> = {};
  for (let i = 0; i < routeSegments.length; i++) {
    const routeSegment = routeSegments[i];
    const requestSegment = requestSegments[i];
    const paramName = paramNames[i];

    if (paramName) {
      params[paramName] = decodeURIComponent(requestSegment);
    } else if (routeSegment !== requestSegment) {
      return null;
    }
  }

  return params;
}

function createResponse(): MutablePluginResponse {
  let statusCode = 200;
  let body: unknown = null;
  const headers: Record<string, string> = {
    'content-type': 'application/json',
  };
  let ended = false;

  const res: MutablePluginResponse = {
    _ended: false,
    _body: null,
    status(code: number) {
      statusCode = code;
      return res;
    },
    json(data: unknown) {
      body = data;
      ended = true;
      res._ended = true;
      res._body = data;
      headers['content-type'] = 'application/json';
      return res;
    },
    send(data: unknown) {
      body = data;
      ended = true;
      res._ended = true;
      res._body = data;
      return res;
    },
    setHeader(name: string, value: string) {
      headers[name.toLowerCase()] = value;
      return res;
    },
    getStatus() {
      return statusCode;
    },
    getBody() {
      return body;
    },
    getHeaders() {
      return headers;
    },
    end() {
      ended = true;
      res._ended = true;
    },
  };

  void ended;
  return res;
}

export class PluginApp {
  private routes: RouteEntry[] = [];
  private middlewares: PluginMiddleware[] = [];

  use(middleware: PluginMiddleware): void {
    this.middlewares.push(middleware);
  }

  private addRoute(method: string, pattern: string, handlers: PluginHandler[]): void {
    const normalized = pattern.replace(/\/+/g, '/').replace(/^\//, '') || '';
    const firstSegment = normalized.split('/')[0];
    if (firstSegment && RESERVED_PATHS.has(firstSegment)) {
      throw new Error(`Plugin route "${pattern}" uses a reserved path segment "${firstSegment}"`);
    }

    const { segments, paramNames } = parsePattern(pattern);
    this.routes.push({
      method: method.toUpperCase(),
      pattern: normalized ? `/${normalized}` : '/',
      segments,
      paramNames,
      handlers,
    });
  }

  get(pattern: string, ...handlers: PluginHandler[]): void {
    this.addRoute('GET', pattern, handlers);
  }

  post(pattern: string, ...handlers: PluginHandler[]): void {
    this.addRoute('POST', pattern, handlers);
  }

  put(pattern: string, ...handlers: PluginHandler[]): void {
    this.addRoute('PUT', pattern, handlers);
  }

  patch(pattern: string, ...handlers: PluginHandler[]): void {
    this.addRoute('PATCH', pattern, handlers);
  }

  delete(pattern: string, ...handlers: PluginHandler[]): void {
    this.addRoute('DELETE', pattern, handlers);
  }

  registerRoute(method: string, pattern: string, handler: PluginHandler): void {
    this.addRoute(method, pattern, [handler]);
  }

  async handle(req: PluginRequest): Promise<PluginResponse> {
    const res = createResponse();
    const requestSegments = req.path.split('/').filter(Boolean);

    let matchedRoute: RouteEntry | null = null;
    let matchedParams: Record<string, string> = {};

    for (const route of this.routes) {
      if (route.method !== req.method.toUpperCase()) continue;
      const params = matchPath(route.segments, route.paramNames, requestSegments);
      if (params) {
        matchedRoute = route;
        matchedParams = params;
        break;
      }
    }

    if (!matchedRoute) {
      return res.status(404).json({ message: 'Plugin route not found' });
    }

    req.params = { ...req.params, ...matchedParams };

    let handlerIndex = 0;
    let middlewareIndex = 0;

    const runHandlers = async (): Promise<void> => {
      while (handlerIndex < matchedRoute!.handlers.length) {
        await matchedRoute!.handlers[handlerIndex++](req, res);
        if (res._ended) return;
      }
    };

    const runMiddleware = async (): Promise<void> => {
      if (middlewareIndex < this.middlewares.length) {
        const middleware = this.middlewares[middlewareIndex++];
        await middleware(req, res, runMiddleware);
        return;
      }
      if (!res._ended) {
        await runHandlers();
      }
    };

    await runMiddleware();

    if (!res._ended && res.getBody() === null) {
      res.status(204).end();
    }

    return res;
  }

  getRouteCount(): number {
    return this.routes.length;
  }
}

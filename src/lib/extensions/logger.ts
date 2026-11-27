const SECRET_KEY = /password|secret|token|authorization|cookie|credential|api[-_]?key|private[-_]?key/i;

export function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((entry) => redact(entry));
  if (!value || typeof value !== 'object') return value;
  const output: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    output[key] = SECRET_KEY.test(key) ? '[redacted]' : redact(entry);
  }
  return output;
}

type LogLevel = 'info' | 'warn' | 'error';

/** Structured extension log. Never pass raw request bodies, archives, or credentials. */
export function logExtension(
  level: LogLevel,
  event: string,
  fields: Record<string, unknown> = {}
): void {
  const payload = {
    scope: 'extension',
    event,
    ...(redact(fields) as Record<string, unknown>),
  };
  const line = JSON.stringify(payload);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.info(line);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function HeroRenderer({ data, block }: { data?: Record<string, unknown>; block?: any }) {
  const d = data || block?.data || {};
  return (
    <section style={{ padding: '48px 24px', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ margin: '0 0 12px', fontSize: 36 }}>{String(d.title || 'Welcome')}</h1>
      <p style={{ margin: 0, color: '#4b5563', maxWidth: 640 }}>{String(d.description || '')}</p>
    </section>
  );
}

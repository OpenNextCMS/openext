// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function VisualRenderer({ data, block }: { data?: Record<string, unknown>; block?: any }) {
  const d = data || block?.data || {};
  const bg = String(
    d.backgroundImage ||
      'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=1920&q=80'
  );

  return <section className="br-visual" style={{ backgroundImage: `url('${bg}')` }} aria-hidden="true" />;
}

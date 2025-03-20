import ThemeLoader from '@/components/ThemeLoader';

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000"

export default async function Home() {
  const response = await fetch(`${backendUrl}/api/themes/get-theme`);
  const { themeName } = await response.json();

  // Render the client component that loads the theme dynamically.
  return <ThemeLoader themeName={themeName} />;
}
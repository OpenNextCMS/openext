import type { Metadata } from 'next';
import HomeClient from './HomeClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  return { title: 'Home' };
}

/** Site root — theme rendering disabled for now; shows a simple landing. */
export default function Home() {
  return <HomeClient />;
}

import { redirect } from 'next/navigation';

/**
 * The legacy ZIP-upload theme installer has been superseded by the
 * configuration-driven Theme Builder. This route now redirects to the new
 * "Create Theme" flow. (The Sidebar link is kept pointing here for back-compat.)
 */
export default function AddThemePage() {
  redirect('/dashboard/themes/new');
}

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getCurrentUserFull, needsOnboarding } from '@/lib/api/user';
import { getAuthUser } from '@/lib/api/auth';
import { getPageDbConnection, getWebsitePreferencesModel } from '@/utils/db';
import { ensureDefaultHomePage } from '@/services/ensureDefaultHomePage';
import OnboardingWizard from './OnboardingWizard';
import type { WizardData } from '@/templates/types';

export const dynamic = 'force-dynamic';

/**
 * First-time Website Setup Wizard — SuperAdmin only.
 * Incomplete SuperAdmins are redirected here from the dashboard; other roles
 * never see this page and go straight to /dashboard.
 */
export default async function OnboardingPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) redirect('/login');

  const user = await getCurrentUserFull();
  if (!user) redirect('/login');

  // Non–SuperAdmin users (created by SuperAdmin) skip onboarding entirely.
  if (!needsOnboarding(user)) {
    redirect('/dashboard');
  }

  // Ensure OpenExt default homepage exists even before wizard generate/skip.
  try {
    const auth = await getAuthUser();
    if (auth?.userId) {
      await ensureDefaultHomePage({ createdBy: auth.userId });
    }
  } catch (err) {
    console.warn('[onboarding] ensureDefaultHomePage failed:', err);
  }

  // Hydrate any autosaved draft so the wizard resumes where the user left off.
  let initialDraft: Partial<WizardData> | null = null;
  try {
    const auth = await getAuthUser();
    if (auth?.userId) {
      const pageDb = await getPageDbConnection();
      const Prefs = getWebsitePreferencesModel(pageDb);
      const doc = await Prefs.findOne({ userId: auth.userId }).lean<{
        draft?: boolean;
        businessName?: string;
        businessCategory?: string;
        businessDescription?: string;
        location?: string;
        websiteType?: string;
        headerTemplate?: string;
        footerTemplate?: string;
        theme?: string;
      }>();
      if (doc && doc.draft) {
        initialDraft = {
          businessName: doc.businessName || '',
          businessCategory: doc.businessCategory || '',
          businessDescription: doc.businessDescription || '',
          location: doc.location || '',
          websiteType: (doc.websiteType || '') as WizardData['websiteType'],
          headerTemplate: (doc.headerTemplate || '') as WizardData['headerTemplate'],
          footerTemplate: (doc.footerTemplate || '') as WizardData['footerTemplate'],
          theme: (doc.theme || '') as WizardData['theme'],
        };
      }
    }
  } catch {
    // Best-effort draft hydration — never block the wizard from rendering.
  }

  return <OnboardingWizard initialDraft={initialDraft} />;
}

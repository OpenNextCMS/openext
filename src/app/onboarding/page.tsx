import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getCurrentUserFull } from '@/lib/api/user';
import { getAuthUser } from '@/lib/api/auth';
import { getPageDbConnection, getWebsitePreferencesModel } from '@/utils/db';
import OnboardingWizard from './OnboardingWizard';
import type { WizardData } from '@/templates/types';

export const dynamic = 'force-dynamic';

/**
 * Mandatory first-time onboarding. Gated here (and again in the dashboard
 * layout) so a user who hasn't finished setup always lands on the wizard.
 */
export default async function OnboardingPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  if (!token) redirect('/login');

  const user = await getCurrentUserFull();
  if (!user) redirect('/login');
  if (user.onboardingCompleted) redirect('/dashboard');

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
        targetAudience?: string;
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
          targetAudience: doc.targetAudience || '',
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

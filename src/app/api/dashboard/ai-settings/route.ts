import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtDecode } from 'jwt-decode';
import { getSettingsModel, getUserDbConnection, getUserModel } from '@/utils/db';

type DecodedToken = {
  email?: string;
};

type AiConfig = {
  openrouterApiKey?: string;
  openrouterModel?: string;
  openrouterReviewModel?: string;
  aiMinQualityScore?: number;
};

const AI_CONFIG_FIELDS = [
  'openrouterApiKey',
  'openrouterModel',
  'openrouterReviewModel',
  'aiMinQualityScore',
] as const;

type AiConfigField = (typeof AI_CONFIG_FIELDS)[number];

const maskSecret = (value?: string) => {
  if (!value) return '';
  if (value.length <= 8) return '********';
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
};

const getAuthorizedUser = async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) {
    throw new Error('Unauthorized');
  }

  const decodedToken = jwtDecode<DecodedToken>(token);
  const email = decodedToken.email;

  if (!email) {
    throw new Error('Invalid token');
  }

  await getUserDbConnection();
  const UserModel = getUserModel();
  const user = await UserModel.findOne({ email }).exec();

  if (!user) {
    throw new Error('User not found');
  }

  return user;
};

const publicAiConfig = (aiConfig: AiConfig) => ({
  openrouterApiKey: maskSecret(aiConfig.openrouterApiKey),
  hasOpenrouterApiKey: Boolean(aiConfig.openrouterApiKey),
  openrouterModel: aiConfig.openrouterModel || 'google/gemini-2.0-flash-001',
  openrouterReviewModel: aiConfig.openrouterReviewModel || 'google/gemini-2.0-flash-001',
  aiMinQualityScore: aiConfig.aiMinQualityScore ?? 80,
});

export async function GET() {
  try {
    await getAuthorizedUser();
    const SettingsModel = getSettingsModel();
    const settings = await SettingsModel.findOne({}).select('aiConfig').lean().exec();
    const aiConfig = (settings?.aiConfig || {}) as AiConfig;

    return NextResponse.json({
      success: true,
      data: {
        aiConfig: publicAiConfig(aiConfig),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load AI settings';
    const status = message === 'Unauthorized' || message === 'Invalid token' ? 401 : 500;
    return NextResponse.json({ success: false, message }, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    await getAuthorizedUser();
    const body = await req.json();
    const SettingsModel = getSettingsModel();
    let settings = await SettingsModel.findOne({}).exec();

    if (!settings) {
      settings = new SettingsModel({
        siteTitle: 'Default Site',
        language: 'en',
        timeZone: 'UTC',
        dateFormat: 'F j, Y',
        timeFormat: 'g:i a',
        themes: [{ name: 'openNextDefault', isActive: true }],
      });
    }

    const nextAiConfig: AiConfig = { ...(settings.aiConfig || {}) };

    for (const field of AI_CONFIG_FIELDS) {
      if (!(field in body)) continue;

      const value = body[field as AiConfigField];
      if (field === 'aiMinQualityScore') {
        const score = Number(value);
        if (Number.isFinite(score)) {
          nextAiConfig[field] = Math.max(0, Math.min(100, score));
        }
        continue;
      }

      if (typeof value === 'string' && !value.includes('...')) {
        nextAiConfig[field] = value.trim();
      }
    }

    settings.aiConfig = nextAiConfig;
    await settings.save();

    return NextResponse.json({
      success: true,
      message: 'AI settings updated successfully',
      data: {
        aiConfig: publicAiConfig(nextAiConfig),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update AI settings';
    const status = message === 'Unauthorized' || message === 'Invalid token' ? 401 : 500;
    return NextResponse.json({ success: false, message }, { status });
  }
}

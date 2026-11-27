import { NextResponse } from 'next/server';
import { getUserDbConnection, getPluginModel } from '@/utils/db';
import { handleApiError } from '@/lib/api/response';
import { requireRbac } from '@/lib/rbac';

export async function GET() {
  try {
    await requireRbac();
    await getUserDbConnection();
    const PluginModel = getPluginModel();
    const plugins = await PluginModel.find({}).sort({ createdAt: -1 });

    return NextResponse.json({ plugins }, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}

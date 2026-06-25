import { NextResponse } from 'next/server';
import { getUserDbConnection, getPluginModel } from '@/utils/db';

export async function GET() {
  try {
    await getUserDbConnection();
    const PluginModel = getPluginModel();
    const plugins = await PluginModel.find({}).sort({ createdAt: -1 });

    return NextResponse.json({ plugins }, { status: 200 });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

// src/app/api/test-mongodb-connection/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { testMongoDBConnection } from '@/lib/mongodb-connection';

export async function POST(req: NextRequest) {
  try {
    const config = await req.json();

    if (!config.username || !config.password || !config.host || !config.clusterName) {
      return NextResponse.json({ 
        success: false, 
        message: 'All MongoDB configuration fields are required' 
      }, { status: 400 });
    }

    const result = await testMongoDBConnection(config);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Server-side connection test error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Server-side connection test failed' 
    }, { status: 500 });
  }
}
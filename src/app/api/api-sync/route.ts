import { NextResponse } from 'next/server';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

export const GET = async () => {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

  try {
    const response = await fetch(`${backendUrl}/api/auth/verify-connection`);
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to verify connection: ${errorText}`);

      // Update environment variables if the response is not ok
      const envPath = path.resolve(process.cwd(), '.env.local');
      const envConfig = dotenv.parse(fs.readFileSync(envPath));

      envConfig.isRegistration = 'false';
      envConfig.dbConnection = 'false';

      const updatedEnv = Object.entries(envConfig)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');

      fs.writeFileSync(envPath, updatedEnv);

      throw new Error(`Failed to verify connection: ${errorText}`);
    }

    const data = await response.json() as {
      masterDbConnected: boolean;
      userDbConnected: boolean;
      pageDbConnected: boolean;
      dbConnection: boolean;
    };

    const { masterDbConnected, userDbConnected, pageDbConnected, dbConnection } = data;

    // Update environment variables if any connection is missing or false
    const envPath = path.resolve(process.cwd(), '.env.local');
    const envConfig = dotenv.parse(fs.readFileSync(envPath));

    if (!masterDbConnected || !userDbConnected || !pageDbConnected) {
      envConfig.isRegistration = 'false';
      envConfig.dbConnection = 'false';
    } else {
      envConfig.isRegistration = 'true';
      envConfig.dbConnection = 'true';
    }

    const updatedEnv = Object.entries(envConfig)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    fs.writeFileSync(envPath, updatedEnv);

    return NextResponse.json({ 
      masterDbConnected,
      userDbConnected,
      pageDbConnected,
      dbConnection 
    });
  } catch (error) {
    console.error(`Error in API sync: ${(error as Error).message}`);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
};

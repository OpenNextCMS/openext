// src/app/api/auth/admin/route.ts
import { NextRequest } from 'next/server';
import { AuthService } from '@/modules/auth/authService';
import { registerSchema } from '@/modules/auth/authValidation';
import mongoose from 'mongoose';
import { MasterDb } from '@/models/MasterDb';
import User, { IUser } from '@/models/User';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validatedData = registerSchema.parse(body);

    const { userDbName, pageDbName, mongodbCredentials } = body;
    const { username, password, host, cluster } = mongodbCredentials;
    const userDbUri = `mongodb+srv://${username}:${password}@${cluster}.${host}.mongodb.net/${userDbName}?retryWrites=true&w=majority&appName=${cluster}`;
    const pageDbUri = `mongodb+srv://${username}:${password}@${cluster}.${host}.mongodb.net/${pageDbName}?retryWrites=true&w=majority&appName=${cluster}`;

    // Initialize database connection
    const userDbConnection = await mongoose.createConnection(userDbUri);
    const UserModel = userDbConnection.model<IUser>('User', User.schema);

    const authData = await AuthService.register(validatedData, UserModel);

    if ('error' in authData) {
      return new Response(
        JSON.stringify({ success: false, message: authData.error, registration: 'failed' }),
        { status: 400 }
      );
    }

    // Store the database names and URI in the master database
    const masterDb = new MasterDb({ userDbName, pageDbName, userDbUri, pageDbUri });
    await masterDb.save();

    // Write the MongoDB credentials to the .env.local file
    const envPath = path.join(process.cwd(), '.env.local');
    
    // Check if .env.local file exists, if not create it
    try {
      await fs.access(envPath);
    } catch {
      await fs.writeFile(envPath, '');
    }

    // Generate a random JWT secret
    const jwtSecret = crypto.randomBytes(32).toString('hex');

    const envContent = `
    JWT_SECRET=${jwtSecret}
MONGODB_USERNAME=${username}
MONGODB_PASSWORD=${password}
MONGODB_HOST=${host}
MONGODB_CLUSTER=${cluster}
USER_DB_NAME=${userDbName}
PAGE_DB_NAME=${pageDbName}
isRegistration=true
dbConnection=true
    `;
    await fs.writeFile(envPath, envContent.trim(), { flag: 'w' });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Registration successful',
        data: authData.user,
        isRegistration: 'successful'
      }),
      { status: 201 }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        success: false,
        message: error.message || 'Registration failed',
        isRegistration: 'failed'
      }),
      { status: 500 }
    );
  }
}
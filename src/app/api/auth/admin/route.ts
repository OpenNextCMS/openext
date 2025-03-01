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
  let userDbConnection: mongoose.Connection | null = null;
  let masterConnection: mongoose.Connection | null = null;

  try {
    const body = await req.json();
    const validatedData = registerSchema.parse(body);

    const { userDbName, pageDbName, mongodbCredentials } = body;
    const { username, password, host, cluster } = mongodbCredentials;
    
    // Create connection URIs
    const masterDbUri = `mongodb+srv://${username}:${password}@${cluster}.${host}.mongodb.net/master?retryWrites=true&w=majority&appName=${cluster}`;
    const userDbUri = `mongodb+srv://${username}:${password}@${cluster}.${host}.mongodb.net/${userDbName}?retryWrites=true&w=majority&appName=${cluster}`;
    const pageDbUri = `mongodb+srv://${username}:${password}@${cluster}.${host}.mongodb.net/${pageDbName}?retryWrites=true&w=majority&appName=${cluster}`;

    // Initialize database connections with timeout settings
    userDbConnection = await mongoose.createConnection(userDbUri, {
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 30000
    });

    masterConnection = await mongoose.createConnection(masterDbUri, {
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 30000
    });

    // Initialize models
    const UserModel = userDbConnection.model<IUser>('User', User.schema);
    const MasterDbModel = masterConnection.model('MasterDb', MasterDb.schema);

    // Register user
    const authData = await AuthService.register(validatedData, UserModel);

    if ('error' in authData) {
      return new Response(
        JSON.stringify({ success: false, message: authData.error, registration: 'failed' }),
        { status: 400 }
      );
    }

    // Store the database names and URI in the master database
    const masterDbDoc = new MasterDbModel({ 
      userDbName, 
      pageDbName, 
      userDbUri, 
      pageDbUri
    });

    await masterDbDoc.save({ wtimeout: 30000 });

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
        role: authData.user.role,
        isRegistration: 'successful'
      }),
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Registration error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: error.message || 'Registration failed',
        isRegistration: 'failed'
      }),
      { status: 500 }
    );
  } finally {
    // Close connections in finally block
    if (userDbConnection) await userDbConnection.close();
    if (masterConnection) await masterConnection.close();
  }
}
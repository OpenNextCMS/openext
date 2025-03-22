// src/app/api/auth/admin/route.ts
import { NextRequest } from 'next/server';
import { AuthService } from '@/modules/auth/authService';
import { registerSchema } from '@/modules/auth/authValidation';
import mongoose from 'mongoose';
import { MasterDb } from '@/models/MasterDb';
import User, { IUser } from '@/models/User';
import Page from '@/models/Page'; // NEW import
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  let userDbConnection: mongoose.Connection | null = null;
  let masterConnection: mongoose.Connection | null = null;
  let pageDbConnection: mongoose.Connection | null = null; // NEW

  try {
    const body = await req.json();
    const validatedData = registerSchema.parse(body);

    const { userDbName, pageDbName, mongodbCredentials, footerData, headerData, bodyData } = body; // UPDATED
    const { username, password, host, cluster, authMech, mongoDB } = mongodbCredentials;

    let masterDbUri, userDbUri, pageDbUri;
    if (mongoDB === 'atlas') {
      masterDbUri = `mongodb+srv://${username}:${password}@${cluster}.${host}.mongodb.net/master?retryWrites=true&w=majority&appName=${cluster}`;
      userDbUri = `mongodb+srv://${username}:${password}@${cluster}.${host}.mongodb.net/${userDbName}?retryWrites=true&w=majority&appName=${cluster}`;
      pageDbUri = `mongodb+srv://${username}:${password}@${cluster}.${host}.mongodb.net/${pageDbName}?retryWrites=true&w=majority&appName=${cluster}`;
    } else if (mongoDB === 'compass') {
      masterDbUri = `mongodb://${username}:${password}@${host}/master?authMechanism=${authMech}&authSource=admin`;
      userDbUri = `mongodb://${username}:${password}@${host}/${userDbName}?authMechanism=${authMech}&authSource=admin`;
      pageDbUri = `mongodb://${username}:${password}@${host}/${pageDbName}?authMechanism=${authMech}&authSource=admin`;
    } else {
      return new Response(
        JSON.stringify({ success: false, message: 'Invalid MongoDB type', registration: 'failed' }),
        { status: 400 }
      );
    }

    // Initialize database connections with timeout settings
    userDbConnection = await mongoose.createConnection(userDbUri, {
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 30000,
    });

    masterConnection = await mongoose.createConnection(masterDbUri, {
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 30000,
    });

    // Initialize pageDb connection
    pageDbConnection = await mongoose.createConnection(pageDbUri, {
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 30000,
    });

    // Initialize models
    const UserModel = userDbConnection.model<IUser>('User', User.schema);
    const MasterDbModel = masterConnection.model('MasterDb', MasterDb.schema);
    const PageModel = pageDbConnection.model('Page', Page.schema); // NEW

    // Register user and store jsonData in pageDb
    const authData = await AuthService.register(validatedData, UserModel); // UPDATED

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
      pageDbUri,
    });

    await masterDbDoc.save({ wtimeout: 30000 });

    // NEW: Seed page data in pageDb
    const jsonData = {
      pageName: 'Default Page',
      createdBy: authData.user._id, // Use the newly created user's ObjectId
      isPublished: true,
      preHeading: 'Welcome to OpenNext',
      description: 'This is a default page created during registration.',
      seoName: 'OpenNext',
      seoMeta: 'OpenNext is a React framework for the web.',
      component: [
        {
          name: 'header',
          data: headerData, // UPDATED
        },
        {
          name: 'body',
          data: bodyData, // UPDATED
        },
        {
          name: 'footer',
          data: footerData, // UPDATED
        },
      ],
    };

    await PageModel.create(jsonData);

    // Write the MongoDB credentials to the .env file
    const envPath = path.join(process.cwd(), '.env');

    // Check if .env file exists, if not create it
    try {
      await fs.access(envPath);
    } catch {
      await fs.writeFile(envPath, '');
    }

    // Generate a random JWT secret
    const jwtSecret = crypto.randomBytes(32).toString('hex');

    let envContent;
    if (mongoDB === 'atlas') {
      envContent = `
      # NEXT CMS UNCOMMENT BELOW FOR EXTERNAL BACKEND USE (External APIs only)
      # NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
      JWT_SECRET=${jwtSecret}
      MONGODB_USERNAME=${username}
      MONGODB_PASSWORD=${password}
      MONGODB_HOST=${host}
      MONGODB_CLUSTER=${cluster}
      MONGODB=${mongoDB}
      USER_DB_NAME=${userDbName}
      PAGE_DB_NAME=${pageDbName}
      isRegistration=true
      dbConnection=true
      `;
    } else if (mongoDB === 'compass') {
      envContent = `
      # NEXT CMS UNCOMMENT BELOW FOR EXTERNAL BACKEND USE (External APIs only)
      # NEXT_PUBLIC_BACKEND_URL=http://localhost:5000
      JWT_SECRET=${jwtSecret}
      MONGODB_USERNAME=${username}
      MONGODB_PASSWORD=${password}
      MONGODB_HOST=${host}
      MONGODB_AUTH_MECH=${authMech}
      MONGODB=${mongoDB}
      USER_DB_NAME=${userDbName}
      PAGE_DB_NAME=${pageDbName}
      isRegistration=true
      dbConnection=true
      `;
    }

    if (envContent) {
      await fs.writeFile(envPath, envContent.trim(), { flag: 'w' });
    } else {
      throw new Error('envContent is undefined');
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Registration successful',
        data: authData.user,
        role: authData.user.role,
        isRegistration: 'successful',
      }),
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: error instanceof Error ? error.message : 'Registration failed',
        isRegistration: 'failed',
      }),
      { status: 500 }
    );
  } finally {
    // Close connections in finally block
    if (userDbConnection) await userDbConnection.close();
    if (masterConnection) await masterConnection.close();
    if (pageDbConnection) await pageDbConnection.close(); // NEW
  }
}

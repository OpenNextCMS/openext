import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

function loadDynamicEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  const envContent = fs.readFileSync(envPath);
  const parsed = dotenv.parse(envContent);
  return parsed;
}

function createConnectionUri(dbName: string) {
  const dynamicEnv = loadDynamicEnv();
  const {
    MONGODB_USERNAME,
    MONGODB_PASSWORD,
    MONGODB_HOST,
    MONGODB_CLUSTER,
    MONGODB_AUTH_MECH,
    MONGODB_AUTH_SOURCE,
    MONGODB,
  } = dynamicEnv;
  if (!MONGODB_USERNAME || !MONGODB_PASSWORD || !MONGODB_HOST || !MONGODB) {
    throw new Error('Missing required MongoDB environment variables');
  }

  if (MONGODB === 'atlas') {
    if (!MONGODB_CLUSTER) {
      throw new Error('MONGODB_CLUSTER is required for Atlas');
    }
    return `mongodb+srv://${MONGODB_USERNAME}:${MONGODB_PASSWORD}@${MONGODB_CLUSTER}.${MONGODB_HOST}.mongodb.net/${dbName}?retryWrites=true&w=majority`;
  } else if (MONGODB === 'compass') {
    if (!MONGODB_AUTH_MECH) {
      throw new Error('MONGODB_AUTH_MECH is required for Compass');
    }
    return `mongodb://${MONGODB_USERNAME}:${MONGODB_PASSWORD}@${MONGODB_HOST}/${dbName}?authMechanism=${MONGODB_AUTH_MECH}&authSource=${MONGODB_AUTH_SOURCE}`;
  } else {
    throw new Error('Invalid MONGODB value in .env file');
  }
}

async function checkConnection(uri: string) {
  try {
    const connection = await mongoose.createConnection(uri).asPromise();
    if (!connection.db) {
      throw new Error(`Database connection failed for URI: ${uri}`);
    }
    const dbList = await connection.db.admin().listDatabases();
    const dbName = uri.split('/').pop()?.split('?')[0];
    const dbExists = dbList.databases.some((db) => db.name === dbName);
    await connection.close();
    return dbExists;
  } catch (error) {
    console.error(`Error connecting to ${uri}:`, error);
    return false;
  }
}

async function updateEnvFile(dbConnection: boolean, isRegistration: boolean) {
  try {
    const envPath = path.join(process.cwd(), '.env');
    const envContent = await fs.readFileSync(envPath);
    const envString = envContent.toString();
    const newEnvContent = envString
      .replace(/dbConnection=.*/, `dbConnection=${dbConnection}`)
      .replace(/isRegistration=.*/, `isRegistration=${isRegistration}`);
    await fs.writeFileSync(envPath, newEnvContent);
    console.log(
      `Updated .env with dbConnection=${dbConnection} and isRegistration=${isRegistration}`
    );
  } catch (error) {
    console.error('Error updating .env file:', error);
  }
}

export async function GET() {
  try {
    const dynamicEnv = loadDynamicEnv();
    console.log('Dynamic environment variables:', dynamicEnv);
    const { USER_DB_NAME, PAGE_DB_NAME } = dynamicEnv;
    
    if (!USER_DB_NAME || !PAGE_DB_NAME) {
      throw new Error('USER_DB_NAME or PAGE_DB_NAME environment variable is not set');
    }

    const masterDbUri = createConnectionUri('master');
    const userDbUri = createConnectionUri(USER_DB_NAME);
    const pageDbUri = createConnectionUri(PAGE_DB_NAME);

    const masterDbConnected = await checkConnection(masterDbUri);
    const userDbConnected = await checkConnection(userDbUri);
    const pageDbConnected = await checkConnection(pageDbUri);

    const dbConnection = masterDbConnected && userDbConnected && pageDbConnected;
    const isRegistration = dbConnection;

    await updateEnvFile(dbConnection, isRegistration);

    if (dbConnection) {
      console.log('Database connection successful');
    }

    return NextResponse.json({
      masterDbConnected,
      userDbConnected,
      pageDbConnected,
      dbConnection,
    });
  } catch (error) {
    console.error('Error handling database connection check:', error);
    await updateEnvFile(false, false);
    return NextResponse.json(
      {
        error: 'Internal Server Error',
      },
      { status: 500 }
    );
  }
}

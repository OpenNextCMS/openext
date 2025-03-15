import {  NextResponse } from 'next/server';
import mongoose from 'mongoose';
import fs from 'fs/promises';
import path from 'path';

const { MONGODB_USERNAME, MONGODB_PASSWORD, MONGODB_HOST, MONGODB_CLUSTER, USER_DB_NAME, PAGE_DB_NAME } = process.env;

const masterDbUri = `mongodb+srv://${MONGODB_USERNAME}:${MONGODB_PASSWORD}@${MONGODB_CLUSTER}.${MONGODB_HOST}.mongodb.net/master?retryWrites=true&w=majority`;
const userDbUri = `mongodb+srv://${MONGODB_USERNAME}:${MONGODB_PASSWORD}@${MONGODB_CLUSTER}.${MONGODB_HOST}.mongodb.net/${USER_DB_NAME}?retryWrites=true&w=majority`;
const pageDbUri = `mongodb+srv://${MONGODB_USERNAME}:${MONGODB_PASSWORD}@${MONGODB_CLUSTER}.${MONGODB_HOST}.mongodb.net/${PAGE_DB_NAME}?retryWrites=true&w=majority`;

async function checkConnection(uri: string) {
  try {
    const connection = await mongoose.createConnection(uri).asPromise();
    if (!connection.db) {
      throw new Error(`Database connection failed for URI: ${uri}`);
    }
    const dbList = await connection.db.admin().listDatabases();
    const dbName = uri.split('/').pop()?.split('?')[0];
    const dbExists = dbList.databases.some(db => db.name === dbName);
    await connection.close();
    return dbExists;
  } catch (error) {
    console.error(`Error connecting to ${uri}:`, error);
    return false;
  }
}

async function updateEnvFile(dbConnection: boolean, isRegistration: boolean) {
  try {
    const envPath = path.join(process.cwd(), '.env.local');
    const envContent = await fs.readFile(envPath, 'utf-8');
    const newEnvContent = envContent
      .replace(/dbConnection=.*/, `dbConnection=${dbConnection}`)
      .replace(/isRegistration=.*/, `isRegistration=${isRegistration}`);
    await fs.writeFile(envPath, newEnvContent, 'utf-8');
    console.log(`Updated .env.local with dbConnection=${dbConnection} and isRegistration=${isRegistration}`);
  } catch (error) {
    console.error('Error updating .env.local file:', error);
  }
}

export async function GET() {
  try {
    if (!MONGODB_USERNAME || !MONGODB_PASSWORD || !MONGODB_HOST || !MONGODB_CLUSTER || !USER_DB_NAME || !PAGE_DB_NAME) {
      throw new Error('Missing required environment variables');
    }

    const masterDbConnected = await checkConnection(masterDbUri);
    const userDbConnected = await checkConnection(userDbUri);
    const pageDbConnected = await checkConnection(pageDbUri);

    const dbConnection = masterDbConnected && userDbConnected && pageDbConnected;
    const isRegistration = dbConnection; // Set isRegistration to true if dbConnection is true

    await updateEnvFile(dbConnection, isRegistration);

    if (dbConnection) {
      console.log('Database connection successful');
    }

    return NextResponse.json({
      masterDbConnected,
      userDbConnected,
      pageDbConnected,
      dbConnection
    });
  } catch (error) {
    console.error('Error handling database connection check:', error);
    await updateEnvFile(false, false);
    return NextResponse.json({
      error: 'Internal Server Error',
    }, { status: 500 });
  }
}

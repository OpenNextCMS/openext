import type { NextApiRequest, NextApiResponse } from 'next';
import { MongoClient } from 'mongodb';
import { NextResponse } from 'next/server';

const uri = `mongodb+srv://${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PASSWORD}@${process.env.MONGODB_CLUSTER}.${process.env.MONGODB_HOST}.mongodb.net/${process.env.USER_DB_NAME}?retryWrites=true&w=majority&appName=${process.env.MONGODB_CLUSTER}`;

let client;
let clientPromise: Promise<MongoClient>;

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

if (!process.env.MONGODB_USERNAME || !process.env.MONGODB_PASSWORD || !process.env.MONGODB_CLUSTER) {
  throw new Error('Please add your Mongo URI to .env.local');
}

if (process.env.NODE_ENV === 'development') {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  client = new MongoClient(uri);
  clientPromise = client.connect();
}

export async function POST(req: NextApiRequest, res: NextResponse) {
  if (req.method !== 'POST') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const { email, username, firstName, lastName, nickname, displayName, website, bio, newPassword } = req.body;

  if (!email || !username || !firstName || !lastName || !nickname || !displayName) {
    return NextResponse.json({ error: 'Required fields are missing' }, { status: 400 });
  }

  try {
    const client = await clientPromise;
    const db = client.db(process.env.USER_DB_NAME);
    const collection = db.collection('profile');

    const existingProfile = await collection.findOne({ email });
    if (existingProfile) {
      await collection.updateOne(
        { email },
        {
          $set: {
            username,
            firstName,
            lastName,
            nickname,
            displayName,
            website,
            bio,
            newPassword,
          },
        }
      );
      return NextResponse.json({ message: 'Profile updated successfully' }, { status: 200 });
    }

    const newProfile = {
      email,
      username,
      firstName,
      lastName,
      nickname,
      displayName,
      website,
      bio,
      newPassword,
    };

    await collection.insertOne(newProfile);

    return NextResponse.json({ message: 'Profile created successfully' }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

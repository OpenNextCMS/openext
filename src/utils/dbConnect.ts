import mongoose from 'mongoose';

let pageDbConnection: Promise<typeof mongoose> | null = null;

export async function getPageDb() {
  if (pageDbConnection === null) {
    const username = process.env.MONGODB_USERNAME;
    const password = process.env.MONGODB_PASSWORD;
    const host = process.env.MONGODB_HOST;
    const cluster = process.env.MONGODB_CLUSTER;
    const dbName = process.env.PAGE_DB_NAME;

    if (!username || !password || !host || !cluster || !dbName) {
      throw new Error('Missing required database configuration');
    }

    const uri = `mongodb+srv://${username}:${password}@${cluster}.${host}.mongodb.net/${dbName}?retryWrites=true&w=majority`;

    pageDbConnection = mongoose.connect(uri, {
      maxPoolSize: 10,
    });

    // Handle connection errors
    mongoose.connection.on('error', (error) => {
      console.error('MongoDB connection error:', error);
      pageDbConnection = null;
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('MongoDB disconnected');
      pageDbConnection = null;
    });
  }

  return pageDbConnection;
}
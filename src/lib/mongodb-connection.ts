// src/lib/mongodb-connection.ts
import mongoose from 'mongoose';

export async function testMongoDBConnection(config: {
  username: string;
  password: string;
  host: string;
  clusterName: string;
}) {
  const { username, password, host, clusterName } = config;
  const uri = `mongodb+srv://${username}:${password}@${clusterName}.${host}.mongodb.net/?retryWrites=true&w=majority&appName=${clusterName}`;

  try {
    // Attempt to connect to the MongoDB database
    await mongoose.connect(uri);
    
    // Verify connection by checking ready state
    if (mongoose.connection.readyState === 1) {
      // If successful, disconnect
      await mongoose.disconnect();
      return { success: true, error: null };
    }

    throw new Error('Connection failed');
  } catch (error: any) {
    let errorMessage = "Connection failed";

    if (error.name === 'MongooseError') {
      if (error.message.includes('authentication')) {
        errorMessage = "Authentication failed: Invalid credentials";
      } else if (error.message.includes('connect')) {
        errorMessage = "Network error: Unable to connect to MongoDB";
      }
    }

    return { 
      success: false, 
      error: errorMessage 
    };
  }
}
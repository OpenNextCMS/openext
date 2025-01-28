import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { AuthService } from '@/modules/auth/authService';
import { registerSchema } from '@/modules/auth/authValidation';
import { IUser, userSchema } from '@/models/User';

export async function POST(req: NextRequest) {
  try {
    console.log('Received request to register user');
    const body = await req.json();
    console.log('Request body:', body);
    const validatedData = registerSchema.parse(body);
    console.log('Validated data:', validatedData);

    const {
      MONGODB_USERNAME,
      MONGODB_PASSWORD,
      MONGODB_HOST,
      MONGODB_CLUSTER,
      USER_DB_NAME,
    } = process.env;

    if (!MONGODB_USERNAME || !MONGODB_PASSWORD || !MONGODB_HOST || !MONGODB_CLUSTER || !USER_DB_NAME) {
      throw new Error('MongoDB environment variables are not set');
    }

    const userDbUri = `mongodb+srv://${MONGODB_USERNAME}:${MONGODB_PASSWORD}@${MONGODB_CLUSTER}.${MONGODB_HOST}.mongodb.net/${USER_DB_NAME}?retryWrites=true&w=majority`;
    console.log('MongoDB URI:', userDbUri);

    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(userDbUri);
      console.log('Connected to MongoDB');
    }

    const userDb = mongoose.connection.useDb(USER_DB_NAME);
    const UserModel = userDb.model<IUser>('User', userSchema);
    console.log('User model initialized');

    const authData = await AuthService.register(validatedData, UserModel);
    console.log('Auth data:', authData);

    if ('error' in authData) {
     
      return new Response(
        JSON.stringify({ success: false, message: authData.error, registration: 'failed' }),
        { status: 400 }
      );
    }

    console.log('Registration successful');
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

import bcrypt from 'bcryptjs';
import type { RegisterInput } from './authValidation';
import mongoose from 'mongoose';
import { IUser } from '@/models/User';

export class AuthService {
  static async register(
    data: RegisterInput,
    UserModel: mongoose.Model<IUser>
  ) {
    const existingUser = await UserModel.findOne({
      $or: [
        { email: data.email },
        { siteTitle: data.siteTitle },
        { username: data.username },
        { phoneNumber: data.phoneNo },
      ],
    });

    if (existingUser) {
      if (existingUser.email === data.email) {
        return { error: 'Email already in use' };
      }
      if (existingUser.siteTitle === data.siteTitle) {
        return { error: 'Site title already in use' };
      }
      if (existingUser.username === data.username) {
        return { error: 'Username already in use' };
      }
      if (existingUser.phoneNumber === data.phoneNo) {
        return { error: 'Phone number already in use' };
      }
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const user = await UserModel.create({
      ...data,
      password: hashedPassword,
      isRegistration: true, // Store registration status
    });

    return {
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        siteTitle: user.siteTitle,
        isRegistration: user.isRegistration, // Include registration status in response
      },
    };
  }
}

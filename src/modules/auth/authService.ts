import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { RegisterInput } from './authValidation';
import mongoose from 'mongoose';
import { IUser } from '@/models/User';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

export class AuthService {
  private static JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';
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
  static async login(
    identifier: string,
    password: string,
    UserModel: mongoose.Model<IUser>
  ) {
    try {
      // Find user by email or username
      const user = await UserModel.findOne({
        $or: [{ email: identifier }, { username: identifier }],
      });

      if (!user) {
        return { error: 'User not found' };
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);

      if (!isValidPassword) {
        return { error: 'Invalid password' };
      }

      // Generate JWT token
      const token = jwt.sign(
        {
          userId: user._id,
          email: user.email,
          username: user.username,
          siteTitle: user.siteTitle,
        },
        AuthService.JWT_SECRET,
        { expiresIn: '24h' }
      );

      return {
        success: true,
        token,
        user: {
          _id: user._id,
          name: user.name,
          username: user.username,
          email: user.email,
          siteTitle: user.siteTitle,
          phoneNumber: user.phoneNumber,
        },
      };
    } catch (error) {
      console.log('Auth service error:', error);
    }
  }

  static async getUserByEmail(email: string, UserModel: mongoose.Model<IUser>) {
    try {
      const user = await UserModel.findOne({ email });
      if (!user) {
        return { error: 'User not found' };
      }
      return {
        success: true,
        user: {
          _id: user._id,
          name: user.name,
          username: user.username,
          email: user.email,
          siteTitle: user.siteTitle,
          phoneNumber: user.phoneNumber,
        },
      };
    } catch (error) {
      console.log('Auth service error:', error);
      return { error: 'Error fetching user' };
    }
  }
}

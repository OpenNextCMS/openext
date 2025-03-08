import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { RegisterInput } from './authValidation';
import mongoose from 'mongoose';
import { IUser } from '@/models/User';
import { ISettings, settingsSchema } from '@/models/Settings'; 
import { roleSchema } from '@/models/Role';
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
        { username: data.username },
        { phoneNumber: data.phoneNo },
      ],
    });

    if (existingUser) {
      if (existingUser.email === data.email) {
        return { error: 'Email already in use' };
      }
      if (existingUser.username === data.username) {
        return { error: 'Username already in use' };
      }
      if (existingUser.phoneNumber === data.phoneNo) {
        return { error: 'Phone number already in use' };
      }
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    
    const requestedRole = data.role || 'SuperAdmin';
    const RoleModel = UserModel.db.models.Role || UserModel.db.model('Role', roleSchema);
    let roleDoc = await RoleModel.findOne({ name: new RegExp(`^${requestedRole}$`, 'i') });
    if (!roleDoc) {
      // Seed roles if not found
      const roles = [
        { name: 'SuperAdmin', value: 0 },
        { name: 'Admin', value: 1 },
        { name: 'Editor', value: 2 },
        { name: 'Author', value: 3 }
      ];
      for (const role of roles) {
        await RoleModel.create(role);
      }
      roleDoc = await RoleModel.findOne({ name: new RegExp(`^${requestedRole}$`, 'i') });
      if (!roleDoc) {
        throw new Error(`Role ${requestedRole} not found even after seeding`);
      }
    }

    const user = await UserModel.create({
      username: data.username,
      email: data.email,
      password: hashedPassword,
      phoneNumber: data.phoneNo,
      role: roleDoc.value,
      firstName: '',
      lastName:  '',
      nickname:  '',
      displayName:  '',
      website:  '',
      bio: '' ,
    });

    const SettingsModel = UserModel.db.models.Settings ||
      UserModel.db.model<ISettings>('Settings', settingsSchema);
    // Include userId when creating default settings
    await SettingsModel.create({
      siteTitle: data.siteTitle,
      tagline: "",
      siteIcon: "",
      language: "en",
      timeZone: "UTC",
      dateFormat: "F j, Y",
      timeFormat: "g:i a",
      themes: [{name: 'openNextDefault', isActive: true}]
    });

    return {
      success: true,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
      },
    };
  }

  static async login(
    identifier: string,
    password: string,
    UserModel: mongoose.Model<IUser>
  ) {
    try {
      const user = await UserModel.findOne({
        $or: [{ email: identifier }, { username: identifier }],
      });

      if (!user) {
        return { error: 'User not found' };
      }

      const isValidPassword = await bcrypt.compare(password, user.password);

      if (!isValidPassword) {
        return { error: 'Invalid password' };
      }

      const token = jwt.sign(
        {
          userId: user._id,
          email: user.email,
          username: user.username,
          role: user.role,
        },
        AuthService.JWT_SECRET,
        { expiresIn: '24h' }
      );

      return {
        success: true,
        token,
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
      const userObj = {
        _id: user._id,
        username: user.username || '',
        email: user.email || '',
        phoneNumber: user.phoneNumber || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        nickname: user.nickname || '',
        displayName: user.displayName || '',
        website: user.website || '',
        bio: user.bio || '',
        timestamps: user.timestamps,
      };
      if (user.timestamps) {
        userObj.timestamps = user.timestamps;
      }
      return {
        success: true,
        user: userObj,
      };
    } catch (error) {
      console.log('Auth service error:', error);
      return { error: 'Error fetching user' };
    }
  }
}

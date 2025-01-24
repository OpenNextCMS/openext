// src/lib/auth.ts
import { UserRegistrationData } from '@/types';
import Cookies from 'js-cookie';

export class AuthService {
  private static instance: AuthService;

  private constructor() {}

  public static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  registerUser(userData: UserRegistrationData) {
    localStorage.setItem('userRegistrationData', JSON.stringify(userData));
    Cookies.set('isRegistrationComplete', 'true', { expires: 30 });
  }

  isRegistrationComplete(): boolean {
    return Cookies.get('isRegistrationComplete') === 'true';
  }

  login(email: string, password: string): boolean {
    const userData = localStorage.getItem('userRegistrationData');
    if (userData) {
      const parsedData: UserRegistrationData = JSON.parse(userData);
      return parsedData.email === email && parsedData.password === password;
    }
    return false;
  }

  logout() {
    localStorage.removeItem('userRegistrationData');
    Cookies.remove('isRegistrationComplete');
  }
}
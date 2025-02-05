import { NextResponse } from 'next/server';
import { toast } from 'react-hot-toast';

export function handleSuccess(success: boolean, data: unknown, message: string, status: number = 200, redirectUrl?: string) {
  if (typeof window !== 'undefined' && toast) {
    toast.success(message);
  }
  const response = NextResponse.json({ success: true, message, data, status });
  if (redirectUrl) {
    response.headers.set('Location', redirectUrl);
    response.status = 302;
  }
  return response;
}

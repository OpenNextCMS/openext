import { NextResponse } from 'next/server';
import { toast } from 'react-hot-toast';

export function handleError(error: unknown, message: string) {
  if (typeof window !== 'undefined' && toast) {
    toast.error(message);
  }
  return new NextResponse(message, { status: 400 });
}

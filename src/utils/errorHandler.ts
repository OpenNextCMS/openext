import { NextResponse } from 'next/server';
import { toast } from 'react-hot-toast';

export function handleError(error: unknown, message: string) {
  if (typeof window !== 'undefined' && toast) {
    toast.error(message);
  }
  return NextResponse.json({ success: false, message }, { status: 400 });
}

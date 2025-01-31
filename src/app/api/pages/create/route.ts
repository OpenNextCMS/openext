import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { AuthService } from '@/modules/auth/authService';
import { handleError } from '@/utils/errorHandler';
import { handleSuccess } from '@/utils/successHandler';
import Page from '@/models/Page';
import { getPageDb } from '@/utils/dbConnect';
import PageService from '@/modules/page/pageService';

export async function POST(req: NextRequest) {
  try {
    // Get token from cookies instead of header
    const cookieStore = cookies();
    const token = cookieStore.get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token.value, AuthService.JWT_SECRET) as {
        userId: string;
        email: string;
      };
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const body = await req.json();

    // Validate request body
    if (!body.siteName || !body.data) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create page using PageService
    const savedPage = await PageService.createPage({
      siteName: body.siteName,
      pageName: body.pageName || 'Untitled Page',
      data: body.data,
      isPublished: false
    }, decoded.userId);

    return NextResponse.json(
      { success: true, page: savedPage },
      { status: 201 }
    );

  } catch (error) {
    console.error('Error in page creation:', error);
    return NextResponse.json(
      { error: 'Failed to create page' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    // Get and verify JWT token
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return handleError(
        new Error('No token provided'),
        'Authentication required'
      );
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    
    try {
      decoded = jwt.verify(token, AuthService.JWT_SECRET) as {
        userId: string;
        email: string;
        username: string;
        siteTitle: string;
      };
    } catch (error) {
      return handleError(error, 'Invalid token');
    }

    // Connect to database
    await getPageDb();

    // Get pages for the user
    const pages = await Page.find({ createdBy: decoded.userId });

    return handleSuccess(
      true,
      pages,
      'Pages retrieved successfully',
      200
    );

  } catch (error) {
    console.error('Error fetching pages:', error);
    return handleError(
      error,
      'Failed to fetch pages'
    );
  }
}
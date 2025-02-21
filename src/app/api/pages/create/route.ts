import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
// import { AuthService } from '@/modules/auth/authService';
import { handleError } from '@/utils/errorHandler';
import { handleSuccess } from '@/utils/successHandler';
import { getPageDbConnection, getPageModel } from '@/utils/db';
import PageService from '@/modules/page/pageService';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Extract JWT_SECRET from environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

export async function POST(req: NextRequest) {
  try {
    // Get token from cookies instead of header
    const cookieStore = cookies();
    const token = (await cookieStore).get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token.value, JWT_SECRET) as {
        userId: string;
        email: string;
      };
    } catch {
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

    // Connect to database
    await getPageDbConnection();
    // const Page = getPageModel(); // Removed unused variable assignment

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
      decoded = jwt.verify(token, JWT_SECRET) as {
        userId: string;
        email: string;
        username: string;
        siteTitle: string;
      };
    } catch (error) {
      return handleError(error, 'Invalid token');
    }

    // Connect to database
    await getPageDbConnection();
    const Page = getPageModel();

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

export async function PUT(req: NextRequest) {
  try {
    const cookieStore = cookies();
    const token = (await cookieStore).get('token');

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const decoded = jwt.verify(token.value, JWT_SECRET) as {
      userId: string;
      email: string;
    };

    const body = await req.json();

    if (!body.siteName || !body.data) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Find existing page by siteName and userId
    await getPageDbConnection();
    const Page = getPageModel();
    const existingPage = await Page.findOne({ 
      siteName: body.siteName,
      createdBy: decoded.userId 
    });

    if (!existingPage) {
      return NextResponse.json(
        { error: 'Page not found' },
        { status: 404 }
      );
    }

    // Update the existing page
    const updatedPage = await Page.findByIdAndUpdate(
      existingPage._id,
      {
        $set: {
          pageName: body.pageName || existingPage.pageName,
          data: body.data,
          lastModified: new Date()
        }
      },
      { new: true }
    );

    return NextResponse.json(
      { success: true, page: updatedPage },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error updating page:', error);
    return NextResponse.json(
      { error: 'Failed to update page' },
      { status: 500 }
    );
  }
}
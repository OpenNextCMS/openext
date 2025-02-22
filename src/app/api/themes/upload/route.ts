import { NextResponse } from 'next/server';
import { mkdirSync } from 'fs';
import { join } from 'path';
import AdmZip from 'adm-zip';
import mongoose from 'mongoose';
import { cookies } from 'next/headers';
import { jwtDecode } from 'jwt-decode';
import { getUserDbConnection, getSettingsModel } from '@/utils/db';

export async function POST(request: Request) {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) {
        return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const zip = new AdmZip(buffer);
        const originalName = file.name.replace(/\.zip$/i, '');
        const extractDir = join(process.cwd(), 'src/app/themes', originalName);
        mkdirSync(extractDir, { recursive: true });
        zip.extractAllTo(extractDir, true);
        
        // Retrieve user from token in cookies
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const decodedToken: any = jwtDecode(token);
        const email = decodedToken.email;
        if (!email) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }
        
        await getUserDbConnection();
        // Use user email to fetch the settings document (assume Settings was created for user)
        const Settings = getSettingsModel();
        // Filter settings by user _id (assuming token email lookup already created a settings doc)
        // Here you may need to query your User collection to get user._id.
        // For demonstration, assume decodedToken contains userId.
        const userId = decodedToken.userId;
        let settings = await Settings.findOne({ userId });
        
        // Update themes field in the user's settings document
        const themeFolderName = originalName;
        if (settings) {
            const existing = settings.themes.find(theme => theme.name === themeFolderName);
            if (!existing) {
                settings.themes.push({ name: themeFolderName, isActive: false });
            }
            await settings.save();
        } else {
            // If no settings document exists, create one (using decodedToken.userId)
            settings = new Settings({
                userId: userId || new mongoose.Types.ObjectId(),
                // newUserRole: 'Subscriber',
                // language: 'en',
                // timeZone: 'UTC',
                // dateFormat: 'F j, Y',
                // timeFormat: 'g:i a',
                themes: [{ name: themeFolderName, isActive: false }]
            });
            await settings.save();
        }
        
        return NextResponse.json({ success: true, themeFolder: themeFolderName });
    } catch (error) {
        console.error('Error extracting zip:', error);
        return NextResponse.json({ error: 'Error extracting zip file' }, { status: 500 });
    }
}

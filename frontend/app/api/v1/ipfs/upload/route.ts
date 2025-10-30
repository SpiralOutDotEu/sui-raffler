import { NextRequest, NextResponse } from 'next/server';
import { PinataService } from '@/lib/services/pinata';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json(
                { error: 'No file provided' },
                { status: 400 }
            );
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
            return NextResponse.json(
                { error: 'Invalid file type. Only images are allowed' },
                { status: 400 }
            );
        }

        // Validate file size (2MB)
        if (file.size > 2 * 1024 * 1024) {
            return NextResponse.json(
                { error: 'File size exceeds 2MB limit' },
                { status: 400 }
            );
        }

        const upload = await PinataService.uploadImage(file);
        return NextResponse.json(upload);
    } catch (error: unknown) {
        console.error('Upload error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to upload file';
        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        );
    }
}
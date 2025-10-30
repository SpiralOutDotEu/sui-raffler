import { NextRequest, NextResponse } from 'next/server';
import { PinataService } from '@/lib/services/pinata';
import { verifyRecaptchaToken } from '@/lib/services/recaptcha';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const recaptchaToken = formData.get('recaptchaToken') as string | null;
        const verification = await verifyRecaptchaToken(recaptchaToken, 'upload_image');
        if (!verification.success) {
            return NextResponse.json(
                { error: 'reCAPTCHA verification failed', details: verification.errorCodes?.join(', ') },
                { status: 403 }
            );
        }
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
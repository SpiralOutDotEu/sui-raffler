import { NextRequest, NextResponse } from 'next/server';
import { PinataService } from '@/app/services/pinata';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const cid = searchParams.get('cid');

        if (!cid) {
            return NextResponse.json(
                { error: 'No CID provided' },
                { status: 400 }
            );
        }

        const imageUrl = await PinataService.getImageUrl(cid);
        return NextResponse.json({ url: imageUrl });
    } catch (error: unknown) {
        console.error('Retrieve error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to retrieve image';
        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        );
    }
} 
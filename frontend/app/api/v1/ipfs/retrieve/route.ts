import { NextRequest, NextResponse } from 'next/server';
import { PinataService } from '@/app/services/pinata';
import { cacheService } from '@/app/services/cache';

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

        // Try to get from cache first
        const cachedUrl = cacheService.get(cid);
        if (cachedUrl) {
            return NextResponse.json({ url: cachedUrl });
        }

        // If not in cache, get from Pinata and cache it
        const imageUrl = await PinataService.getImageUrl(cid);
        cacheService.set(cid, imageUrl);

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
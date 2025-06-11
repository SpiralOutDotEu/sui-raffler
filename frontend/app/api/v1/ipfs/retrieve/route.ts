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
        const cachedImage = cacheService.get(cid);
        if (cachedImage) {
            // Return cached image with appropriate content type
            return new NextResponse(cachedImage, {
                headers: {
                    'Content-Type': 'image/jpeg', // Default to JPEG if we don't know the type
                    'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
                },
            });
        }

        // If not in cache, get from Pinata
        const imageUrl = await PinataService.getImageUrl(cid);

        // Fetch the actual image data
        const imageResponse = await fetch(imageUrl);
        if (!imageResponse.ok) {
            throw new Error('Failed to fetch image from IPFS');
        }

        const imageBuffer = await imageResponse.arrayBuffer();
        const imageData = Buffer.from(imageBuffer);

        // Determine content type from the response or default to JPEG
        const contentType = imageResponse.headers.get('Content-Type') || 'image/jpeg';

        // Cache the image data
        cacheService.set(cid, imageData);

        // Return the image with appropriate content type
        return new NextResponse(imageData, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
            },
        });
    } catch (error: unknown) {
        console.error('Retrieve error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to retrieve image';
        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        );
    }
} 
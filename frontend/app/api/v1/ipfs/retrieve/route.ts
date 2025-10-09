import { NextRequest, NextResponse } from 'next/server';
import { cacheService } from '@/lib/services/cache';

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
            return new NextResponse(new Uint8Array(cachedImage), {
                headers: {
                    'Content-Type': 'image/jpeg', // Default to JPEG if we don't know the type
                    'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
                },
            });
        }

        // Get the gateway URL for the CID
        const gatewayUrl = `https://${process.env.PINATA_GATEWAY || "gateway.pinata.cloud"}/ipfs/${cid}`;

        // Fetch the image data
        const response = await fetch(gatewayUrl);
        if (!response.ok) {
            throw new Error('Failed to fetch image from IPFS');
        }

        // Get the image data as ArrayBuffer
        const arrayBuffer = await response.arrayBuffer();
        const imageData = Buffer.from(arrayBuffer);

        // Cache the image data
        cacheService.set(cid, imageData);

        // Return the image with appropriate content type
        return new NextResponse(new Uint8Array(imageData), {
            headers: {
                'Content-Type': response.headers.get('Content-Type') || 'image/jpeg',
                'Cache-Control': 'public, max-age=31536000',
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
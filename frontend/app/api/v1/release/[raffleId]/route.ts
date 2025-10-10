import { NextResponse } from 'next/server';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { PACKAGE_ID, CONFIG_OBJECT_ID, RANDOM_OBJECT_ID } from '@/lib/constants';

interface RaffleFields {
    is_released: boolean;
    end_time: string;
}

interface ClockFields {
    timestamp_ms: string;
}

// Initialize Sui client with testnet
const client = new SuiClient({ url: getFullnodeUrl('testnet') });

export async function POST(request: Request) {
    try {
        // Extract raffleId from the URL
        const url = new URL(request.url);
        const pathParts = url.pathname.split('/');
        const raffleId = pathParts[pathParts.indexOf('release') + 1];

        // Get the private key from environment variable
        const privateKey = process.env.RELEASE_RAFFLE_PRIVATE_KEY;
        if (!privateKey) {
            console.error('RELEASE_RAFFLE_PRIVATE_KEY is not configured in environment variables');
            return NextResponse.json(
                {
                    error: 'Private key not configured',
                    details: 'Please configure RELEASE_RAFFLE_PRIVATE_KEY in your environment variables'
                },
                { status: 500 }
            );
        }

        // Create keypair from private key
        let keypair;
        try {
            keypair = Ed25519Keypair.fromSecretKey(privateKey);
        } catch (error) {
            console.error('Failed to create keypair from private key:', error);
            return NextResponse.json(
                {
                    error: 'Invalid private key format',
                    details: 'The provided private key is not in the correct format'
                },
                { status: 500 }
            );
        }

        // Get sender address
        const sender = keypair.getPublicKey().toSuiAddress();
        console.log('Sender address:', sender);

        // Get raffle object
        console.log('Fetching raffle with ID:', raffleId);

        const raffle = await client.getObject({
            id: raffleId,
            options: {
                showContent: true,
            },
        });

        console.log('Raffle response:', JSON.stringify(raffle, null, 2));

        if (!raffle.data) {
            console.error('No data in raffle response');
            return NextResponse.json(
                { error: 'Raffle not found' },
                { status: 404 }
            );
        }

        if (!raffle.data.content) {
            console.error('No content in raffle data');
            return NextResponse.json(
                { error: 'Raffle has no content' },
                { status: 404 }
            );
        }

        if (raffle.data.content.dataType !== 'moveObject') {
            console.error('Invalid data type:', raffle.data.content.dataType);
            return NextResponse.json(
                { error: 'Invalid raffle format' },
                { status: 400 }
            );
        }

        const raffleFields = raffle.data.content.fields as unknown as RaffleFields;
        console.log('Raffle fields:', JSON.stringify(raffleFields, null, 2));

        // Check if raffle is already released
        if (raffleFields.is_released) {
            return NextResponse.json(
                { error: 'Raffle already released' },
                { status: 400 }
            );
        }

        // Get current time from blockchain
        const clock = await client.getObject({
            id: '0x6',
            options: {
                showContent: true,
            },
        });

        if (!clock.data?.content || clock.data.content.dataType !== 'moveObject') {
            return NextResponse.json(
                { error: 'Failed to get blockchain time' },
                { status: 500 }
            );
        }

        const clockFields = clock.data.content.fields as unknown as ClockFields;
        const currentTime = Number(clockFields.timestamp_ms);
        const endTime = Number(raffleFields.end_time);

        // Check if raffle has ended
        if (currentTime <= endTime) {
            return NextResponse.json(
                { error: 'Raffle has not ended yet' },
                { status: 400 }
            );
        }

        // Create transaction
        const tx = new Transaction();
        tx.setSender(sender);

        // Add release_raffle call
        tx.moveCall({
            target: `${PACKAGE_ID}::sui_raffler::release_raffle`,
            arguments: [
                tx.object(CONFIG_OBJECT_ID),
                tx.object(raffleId),
                tx.object(RANDOM_OBJECT_ID),
                tx.object('0x6'), // Clock object
            ],
        });

        // Build and sign transaction
        const builtTx = await tx.build({ client });
        const signature = await keypair.signTransaction(builtTx);

        // Execute transaction
        const result = await client.executeTransactionBlock({
            transactionBlock: builtTx,
            signature: signature.signature,
            options: {
                showEffects: true,
                showEvents: true,
            },
        });

        return NextResponse.json({
            success: true,
            digest: result.digest,
            effects: result.effects,
            events: result.events,
        });

    } catch (error) {
        console.error('Error releasing raffle:', error);
        return NextResponse.json(
            {
                error: 'Failed to release raffle',
                details: error instanceof Error ? error.message : 'Unknown error occurred'
            },
            { status: 500 }
        );
    }
} 
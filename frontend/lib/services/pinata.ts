import { PinataSDK } from 'pinata';

export interface PinataUploadResponse {
    id: string;
    group_id: string | null;
    name: string;
    cid: string;
    created_at: string;
    size: number;
    number_of_files: number;
    mime_type: string;
    vectorized: boolean;
    network: string;
}

export class PinataService {
    private static readonly MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
    private static readonly ALLOWED_MIME_TYPES = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp'
    ];

    private static pinata: PinataSDK;

    static initialize() {
        if (!process.env.PINATA_JWT) {
            throw new Error('PINATA_JWT environment variable is not set');
        }

        this.pinata = new PinataSDK({
            pinataJwt: process.env.PINATA_JWT,
            pinataGateway: process.env.PINATA_GATEWAY || "gateway.pinata.cloud",
        });
    }

    static validateFile(file: File): void {
        if (file.size > this.MAX_FILE_SIZE) {
            throw new Error('File size exceeds 2MB limit');
        }

        if (!this.ALLOWED_MIME_TYPES.includes(file.type)) {
            throw new Error('Invalid file type. Only images are allowed');
        }
    }

    static async uploadImage(file: File): Promise<PinataUploadResponse> {
        if (!this.pinata) {
            this.initialize();
        }

        this.validateFile(file);

        try {
            const upload = await this.pinata.upload.public.file(file);
            return upload;
        } catch (error) {
            console.error('Error uploading to Pinata:', error);
            throw new Error('Failed to upload image to IPFS');
        }
    }

    static async getImageUrl(cid: string): Promise<string> {
        if (!this.pinata) {
            this.initialize();
        }

        try {
            const gateway = process.env.PINATA_GATEWAY || "gateway.pinata.cloud";
            return `https://${gateway}/ipfs/${cid}`;
        } catch (error) {
            console.error('Error generating Pinata URL:', error);
            throw new Error('Failed to generate image URL');
        }
    }
} 
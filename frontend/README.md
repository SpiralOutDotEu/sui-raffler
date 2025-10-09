# Sui Raffler Frontend

A Next.js 15 frontend application for the Sui Raffler platform - a decentralized raffle system built on the Sui blockchain. This application allows users to create, participate in, and manage transparent raffles with instant payouts.

## 🚀 Features

- **Create Raffles**: Set up custom raffles with configurable parameters
- **Explore Raffles**: Browse and discover active raffles
- **Participate**: Buy tickets and participate in raffles
- **Real-time Updates**: Live blockchain time and raffle status updates
- **IPFS Integration**: Decentralized image storage via Pinata
- **Wallet Integration**: Seamless Sui wallet connection via dApp Kit
- **Responsive Design**: Modern UI with Tailwind CSS

## 🏗️ Project Structure

```
frontend/
├── app/                    # Next.js 15 App Router
│   ├── api/               # API routes
│   │   └── v1/
│   │       ├── ipfs/      # IPFS image handling
│   │       └── release/   # Raffle release endpoints
│   ├── (pages)/           # Application pages
│   │   ├── create/        # Create raffle page
│   │   ├── explore/       # Browse raffles page
│   │   ├── raffle/[id]/   # Individual raffle page
│   │   └── releases/      # Raffle releases page
│   ├── globals.css        # Global styles
│   └── layout.tsx         # Root layout
├── components/            # Shared UI components
│   ├── Header.tsx         # Navigation header
│   ├── NotificationToast.tsx # Toast notifications
│   └── Providers.tsx      # App providers wrapper
├── lib/                   # Shared business logic
│   ├── constants.ts       # Application constants
│   ├── context/           # React context providers
│   ├── hooks/            # Custom React hooks
│   │   ├── useBlockchainTime.ts
│   │   ├── useRaffle.ts
│   │   ├── useTransactions.ts
│   │   └── ... (11 total hooks)
│   ├── services/         # API services & integrations
│   │   ├── cache.ts       # LRU cache service
│   │   ├── pinata.ts      # IPFS integration
│   │   ├── suiApiService.ts # Sui blockchain API
│   │   └── transactionService.ts # Transaction handling
│   ├── types/            # TypeScript definitions
│   │   ├── index.ts
│   │   └── sui.ts
│   └── utils/            # Utility functions
│       ├── errorHandler.ts
│       ├── formatters.ts
│       ├── notifications.tsx
│       └── validators.ts
├── public/               # Static assets
└── ...config files
```

## 🛠️ Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Blockchain**: Sui (via @mysten/sui & @mysten/dapp-kit)
- **State Management**: TanStack Query (React Query)
- **UI Components**: Material-UI (MUI)
- **Notifications**: React Hot Toast
- **Storage**: IPFS via Pinata
- **Caching**: LRU Cache

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm, yarn, pnpm, or bun
- Sui wallet (for testing)

### Installation

1. Install dependencies:

```bash
npm install
# or
yarn install
# or
pnpm install
# or
bun install
```

2. Set up environment variables:
   Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_KEY=your_pinata_secret_key
PINATA_GATEWAY=gateway.pinata.cloud
```

3. Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📝 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## 🔧 Configuration

### TypeScript Path Mapping

The project uses TypeScript path mapping for clean imports:

```typescript
// Instead of relative imports
import { useRaffle } from "../../../lib/hooks/useRaffle";

// Use absolute imports
import { useRaffle } from "@/lib/hooks/useRaffle";
```

### Environment Variables

- `NEXT_PUBLIC_APP_URL` - Application URL for metadata
- `PINATA_API_KEY` - Pinata API key for IPFS uploads
- `PINATA_SECRET_KEY` - Pinata secret key
- `PINATA_GATEWAY` - IPFS gateway URL

## 🏛️ Architecture

### Component Organization

- **App Router**: Uses Next.js 15 App Router for file-based routing
- **Shared Components**: Reusable UI components in `/components`
- **Business Logic**: Separated into `/lib` for better maintainability
- **API Routes**: Serverless functions for backend operations

### State Management

- **TanStack Query**: For server state management and caching
- **React Context**: For wallet and app-wide state
- **Local State**: React hooks for component-level state

### Blockchain Integration

- **Sui Client**: Direct blockchain interaction
- **dApp Kit**: Wallet connection and transaction signing
- **Custom Hooks**: Abstraction layer for blockchain operations

## 🚀 Deployment

### Vercel (Recommended)

1. Connect your repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Other Platforms

The app can be deployed to any platform that supports Next.js:

- Netlify
- Railway
- DigitalOcean App Platform
- AWS Amplify

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## 📄 License

This project is part of the Sui Raffler ecosystem. See the main repository for license information.

## 🔗 Links

- [Sui Blockchain](https://sui.io/)
- [Next.js Documentation](https://nextjs.org/docs)
- [TanStack Query](https://tanstack.com/query)
- [Tailwind CSS](https://tailwindcss.com/)

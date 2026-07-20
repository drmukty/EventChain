# EventChain

> Decentralized event management with QR attendance verification, volunteer scanning, and verifiable attendance certificates.

EventChain is a decentralized event management platform that enables organizers to create events, manage attendees, verify attendance using QR codes, and issue verifiable attendance certificates. On-chain POAP NFT minting on the **Base Network** is coming soon.

---

## 🌐 Live Demo

**[eventschain.vercel.app](https://eventschain.vercel.app)**

---

## ✨ Features

### For Attendees
- **Browse Events** – Discover and apply for public events.
- **Apply to Events** – Submit a motivation statement (up to 500 characters) explaining why you want to attend.
- **Track Applications** – View application status in "Joined Events".
- **QR Code** – Receive a unique QR code upon approval.
- **Check-in** – Get scanned by event organizers or volunteers.
- **Certificate** – Download a verifiable off-chain attendance certificate after check-in.
- **NFT Gallery** – View your badges (on-chain minting coming soon).

### For Organizers
- **Create Events** – Full event creation with banner upload.
- **Manage Applications** – Review, approve, or reject attendee applications with motivation statements.
- **Assign Volunteers** – Turn approved attendees into volunteers.
- **Scan QR Codes** – The scanner is available only to event owners and assigned volunteers.
- **Live Check-in Board** – Real-time attendance tracking.
- **Dashboard** – View event statistics and management overview.
- **Team Management** – Add/remove volunteers for your events.

### Platform Features
- **Dashboard** – Complete event management overview.
- **Joined Events** – Track application status, download QR codes, and download certificates.
- **Scanner** – Only available for events you own or volunteer for.
- **Certificates** – Off-chain attendance certificates available immediately after check-in.
- **User Guide** – Learn how to use the platform.
- **Contact Us** – Get help and support.

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 14, React, TypeScript, Tailwind CSS, Framer Motion |
| **Backend** | Next.js API Routes, NextAuth.js |
| **Database** | Supabase (PostgreSQL) |
| **Storage** | Supabase Storage |
| **ORM** | Prisma |
| **Email** | Resend (password reset) |
| **PDF Generation** | PDF-lib |
| **QR Code** | QRCode, jsQR |
| **Smart Contract** | Solidity, Hardhat |
| **Blockchain** | Base Network (upcoming on-chain minting) |
| **Deployment** | Vercel |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL database (Supabase recommended)
- Base Sepolia testnet wallet (for contract deployment)
- MetaMask browser extension (for testing wallet connection)

### Environment Variables

Create a `.env.local` file with the following:

```env
# Database
DATABASE_URL=postgresql://...

# Authentication
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Email (Resend)
RESEND_API_KEY=re_...
EMAIL_FROM=EventChain <onboarding@resend.dev>

# Supabase Storage
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...

# Base Network (for future NFT minting)
NEXT_PUBLIC_BASE_RPC_URL=...
NEXT_PUBLIC_BASE_CHAIN_ID=8453
NEXT_PUBLIC_POAP_CONTRACT_ADDRESS=...

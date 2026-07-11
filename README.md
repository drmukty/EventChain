# EventChain

Event management with verified, on-chain Proof of Attendance (POAP) minting on **Base Sepolia**.

Attendees apply → organizers approve → an encrypted single-use QR code is issued → a check-in scan mints an ERC-721 POAP to the attendee's wallet (or issues an off-chain badge if no wallet is connected).

---

## What's implemented here

- **Data model** (`prisma/schema.prisma`): users/roles, events, speakers/sponsors/agenda, team management, applications, waitlist, QR codes, check-ins, NFTs, certificates, notifications.
- **Auth** (`src/lib/auth.ts`): NextAuth with email/password (bcrypt-hashed) and Google OAuth, JWT sessions carrying a role claim, role-based route protection.
- **Core flows** (`src/app/api/**`): event CRUD + search, apply-with-automatic-waitlisting **and on-chain token-gate eligibility checks**, approve/reject (issuing the QR on approval, auto-promoting the next waitlisted applicant on cancellation or rejection), attendee-initiated cancellation, check-in (verifies + single-use-consumes the QR, then mints), NFT metadata endpoint, PDF certificate generation via `pdf-lib` uploaded to Supabase Storage, file uploads for event banners/logos, in-app notifications feed, and a live check-in feed for real-time boards.
- **QR security** (`src/lib/qr.ts`): HMAC-SHA256 signed payload, DB-enforced single-use via a transaction, expiry tied to the event's end time, constant-time signature comparison.
- **Smart contract** (`contracts/EventChainPOAP.sol`): ERC-721 with role-gated minting (`MINTER_ROLE` held by a low-privilege backend wallet, not the deployer), soulbound (non-transferable) tokens, one mint per wallet per event enforced on-chain.
- **Token gating**: `src/lib/blockchain.ts` checks an attendee's wallet balance of a specified ERC-20/ERC-721 contract before allowing applications to `TOKEN_GATED` / `NFT_HOLDER` events.
- **UI**: landing page, event browse/detail with live apply/waitlist button, organizer event-creation form with banner upload, organizer applications review queue (approve/reject), organizer live check-in board, a camera-based QR scanner (`/scan`, using `jsqr` against the device camera), attendee "My Events" page (QR download, cancel, certificate download), NFT gallery linking to Base Explorer, MetaMask connect button (adds/switches to Base Sepolia automatically), a notification bell with polling, organizer analytics dashboard (recharts), login, collapsible user guide, and a Telegram-only contact page — dark/light theme with animated toggle, glassmorphism, Framer Motion throughout.

## Deploying this yourself

Two guides are included, depending on your comfort level:

- **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** — uses a terminal for local setup (`npm install`, `npx prisma db push`, deploying the contract with Hardhat) before pushing to GitHub and Vercel.
- **[NO_CODE_DEPLOYMENT_GUIDE.md](./NO_CODE_DEPLOYMENT_GUIDE.md)** — the same end result, entirely through websites: GitHub's drag-and-drop uploader instead of git, Supabase's SQL Editor (paste `supabase_setup.sql`) instead of the Prisma CLI, and Remix instead of Hardhat for the contract. No terminal at any point.

Both are entirely free-tier: GitHub, Vercel, Supabase, and the Base Sepolia testnet faucet. No prior deployment experience assumed either way.

## What you need to supply before this runs for real

This ships as real, working code — but it can't run without your own credentials, because none of these can be fabricated safely or verified from a sandbox:

| Needed | Why |
|---|---|
| A Postgres database (e.g. a free Supabase project) | `DATABASE_URL` |
| Google OAuth client (Google Cloud Console) | `GOOGLE_CLIENT_ID` / `SECRET` |
| A Supabase Storage bucket named `eventchain` | file uploads, certificates |
| A funded Base Sepolia wallet to deploy the contract | `DEPLOYER_PRIVATE_KEY` |
| A second, low-privilege Base Sepolia wallet for minting | `BACKEND_MINTER_PRIVATE_KEY` |
| MetaMask installed for testing wallet connect | attendee flow |

Get free Base Sepolia ETH from the [Coinbase Base Sepolia faucet](https://www.coinbase.com/faucets/base-sepolia-faucet) to pay for gas.

## Setup

```bash
npm install
cp .env.example .env      # fill in every value — see table above
npx prisma db push        # create tables from schema.prisma
npm run db:seed           # sample admin / organizer / attendee + one event
npm run dev                # http://localhost:3000
```

Seeded accounts (password for all: `Password123!`):
- `admin@eventchain.dev`
- `organizer@eventchain.dev`
- `attendee@eventchain.dev`

## Deploying the smart contract to Base Sepolia

```bash
npm install --save-dev @openzeppelin/contracts   # contract inheritance
npx hardhat compile
npx hardhat run scripts/deploy.ts --network baseSepolia
```

Copy the printed contract address into `NEXT_PUBLIC_POAP_CONTRACT_ADDRESS`.

### Migrating to Base Mainnet later

Change **only** these four environment variables — no contract, backend, or frontend code needs to change:

```
NEXT_PUBLIC_BASE_RPC_URL
NEXT_PUBLIC_BASE_CHAIN_ID
NEXT_PUBLIC_POAP_CONTRACT_ADDRESS
BACKEND_MINTER_PRIVATE_KEY
```

## Deploying the app

1. Push this repo to GitHub.
2. Import it into Vercel; add every variable from `.env.example` as a Vercel environment variable.
3. Point `DATABASE_URL` at your production Supabase Postgres instance and run `npx prisma db push` against it once (via `vercel env pull` + local push, or a one-off migration job).
4. Set `NEXTAUTH_URL` to your production URL and re-generate `NEXTAUTH_SECRET` for production.

## Honest scope notes

Two things remain intentionally out of scope, because they need infrastructure beyond a single Next.js deployment rather than more code:

- **Real-time push** (live check-in board, notification bell) uses short-interval polling (4s / 20s) rather than WebSockets/Server-Sent Events — simple, free-tier-friendly, and indistinguishable from "live" at event scale, but a dedicated realtime layer (e.g. Supabase Realtime or Pusher) would be a drop-in upgrade if you need sub-second updates.
- **Outbound email/SMS notifications** — in-app `Notification` rows are created for every event (approval, QR ready, NFT minted, etc.), but no email/SMS provider is wired up. Add Resend, Postmark, or Twilio and call it from `src/lib/notifications.ts` if you want delivery outside the app.

Two smaller UI gaps also remain (the backend fully supports both, there's just no screen for them yet):

- **Team invites**: `TeamMember` rows with Owner/Admin/Volunteer/QR Scanner roles exist in the schema and the event creator is auto-added as Owner, but there's no UI yet for an organizer to add teammates — do it via Prisma Studio (`npm run db:studio`) or a small script against `prisma.teamMember.create(...)` until a dedicated screen is built.
- **Speakers/sponsors/agenda authoring**: these display correctly on the event page when present (see the seed data), but the create-event form doesn't have inputs for them yet — add them the same way, via Prisma Studio or a script, or extend `src/app/dashboard/events/new/page.tsx`.

Everything else is implemented and enforced end-to-end, including two items worth calling out specifically since they're easy to assume and get wrong:

- **The organizer dashboard (`/dashboard`) reads live data** — actual counts from your database across every event you manage (`/api/dashboard/stats`), not sample numbers.
- **`PRIVATE` events are genuinely access-controlled**, not just hidden from the public browse list — `src/lib/eventAccess.ts` is the single source of truth, checked by both the event detail route and the apply route, so an uninvited user gets a 403 even with the direct link. Private events use an email allowlist (`Event.invitedEmails`, set on creation) rather than a full invite-flow with its own notifications — add that on top if you need it.

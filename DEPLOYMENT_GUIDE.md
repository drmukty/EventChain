# EventChain — Full Beginner Deployment Guide (100% Free Tier)

This guide assumes **zero prior experience** deploying an app. Follow it top to bottom in order. Every service used here has a free tier — you will not need to enter a credit card anywhere except MetaMask (which is just a browser wallet, not a payment).

Total time: roughly 60–90 minutes the first time.

---

## What you'll end up with

- Your code live on **GitHub** (free)
- Your app hosted on **Vercel** (free Hobby plan)
- Your database on **Supabase** (free Postgres + free file storage)
- Your smart contract deployed on **Base Sepolia** (a free test network — the ETH you use is fake/test ETH, given away by a faucet)

---

## Part 0 — Install what you need on your computer

1. **Node.js** — download the "LTS" version from https://nodejs.org and install it (Next → Next → Install, like any program).
2. **Git** — download from https://git-scm.com/downloads and install with default options.
3. **A code editor** (optional but helpful) — [VS Code](https://code.visualstudio.com/), free.
4. **MetaMask** — install the browser extension from https://metamask.io for Chrome, Brave, or Firefox. Create a new wallet when prompted and **write down your 12-word recovery phrase on paper** (never store it in a text file or screenshot).

Open a terminal (on Windows: "Command Prompt" or "PowerShell"; on Mac: "Terminal") and check both installed correctly:

```bash
node -v
git --version
```

You should see version numbers, not errors.

---

## Part 1 — Get the project onto your computer

1. Unzip the `eventchain.zip` file you were given, into a folder, e.g. `Documents/eventchain`.
2. Open a terminal **inside that folder**:
   - Windows: open the folder in File Explorer, click the address bar, type `cmd`, press Enter.
   - Mac: right-click the folder → "New Terminal at Folder" (or open Terminal and `cd` into it).
3. Install all dependencies:

```bash
npm install
```

This will take a minute or two and download everything the project needs.

---

## Part 2 — Put your code on GitHub

1. Go to https://github.com and create a free account if you don't have one.
2. Click the **+** icon (top right) → **New repository**.
3. Name it `eventchain`, leave it **Public** or **Private** (either works), don't check any of the "Initialize with…" boxes, click **Create repository**.
4. GitHub will show you commands — back in your terminal, run:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/eventchain.git
git push -u origin main
```

Replace `YOUR-USERNAME` with your actual GitHub username. If it asks you to log in, follow the on-screen prompts (GitHub may open a browser window to confirm).

Your code is now on GitHub. Refresh the GitHub page — you should see all your files.

---

## Part 3 — Create your free database (Supabase)

1. Go to https://supabase.com and click **Start your project** → sign up (you can use your GitHub account to sign in, which is fastest).
2. Click **New Project**.
   - **Name**: `eventchain`
   - **Database password**: click "Generate a password" and **copy it somewhere safe** — you'll need it in a moment.
   - **Region**: pick whichever is closest to you.
   - Click **Create new project** and wait ~2 minutes while it sets up.
3. Once it's ready, click the **gear icon (Project Settings)** in the left sidebar → **Database**.
4. Scroll to **Connection string** → select the **URI** tab. Copy the string — it looks like:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxx.supabase.co:5432/postgres
   ```
5. Replace `[YOUR-PASSWORD]` in that string with the database password you copied in step 2. **Save this full string** — this is your `DATABASE_URL`.
6. Still in Project Settings, click **API** in the sidebar. Copy and save these three values:
   - **Project URL** (this is `NEXT_PUBLIC_SUPABASE_URL`)
   - **anon public** key (this is `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
   - **service_role** key (this is `SUPABASE_SERVICE_ROLE_KEY`) — click "Reveal" to see it. Keep this one especially private.

### Create a storage bucket (for banners, logos, certificates)

1. In the left sidebar, click **Storage**.
2. Click **New bucket**, name it exactly `eventchain`, toggle it to **Public bucket** (so certificate/banner links work), click **Create bucket**.

---

## Part 4 — Set up Google Sign-In (optional but included in the app)

You can skip this section and users can still sign up with email/password — Google is an extra option.

1. Go to https://console.cloud.google.com and sign in with any Google account.
2. Click the project dropdown at the top → **New Project** → name it `eventchain` → **Create**.
3. Once created and selected, in the search bar at the top type "OAuth consent screen" and open it.
   - Choose **External** → **Create**.
   - Fill in an app name (`EventChain`), your email for support and developer contact, click **Save and Continue** through the remaining steps (defaults are fine for testing), then **Back to Dashboard**.
4. In the search bar, type "Credentials" and open **APIs & Services → Credentials**.
5. Click **Create Credentials → OAuth client ID**.
   - **Application type**: Web application
   - **Name**: EventChain
   - **Authorized redirect URIs**, add:
     ```
     http://localhost:3000/api/auth/callback/google
     ```
     (You'll add your live Vercel URL here too, in Part 7.)
   - Click **Create**. Copy the **Client ID** and **Client Secret** shown — these are `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`.

---

## Part 5 — Set up your test wallets and get free test ETH

You need **two** MetaMask wallets:
1. A **deployer wallet** — used once, to publish the smart contract.
2. A **backend minter wallet** — used by your live app's server to mint NFTs automatically. Keep this separate from your personal wallet.

### Create the wallets

1. Open MetaMask → click your account icon → **Add account or hardware wallet → Add a new account**. Name it "EventChain Deployer".
2. Repeat to create a second one named "EventChain Minter".
3. For each, click the account → **Account details → Show private key**, enter your MetaMask password, and copy the private key somewhere safe (you'll paste these into your `.env` file, never into any website). It starts with `0x`.
4. Also copy each account's **public address** (starts with `0x`, shown right under the account name).

### Add Base Sepolia to MetaMask

1. Click the network dropdown at the top of MetaMask → **Add network → Add a network manually**.
2. Fill in:
   - Network name: `Base Sepolia`
   - RPC URL: `https://sepolia.base.org`
   - Chain ID: `84532`
   - Currency symbol: `ETH`
   - Block explorer URL: `https://sepolia.basescan.org`
3. Save, then switch to this network.

### Get free test ETH

1. Switch to your **Deployer** account in MetaMask, copy its address.
2. Go to https://www.coinbase.com/faucets/base-sepolia-faucet, paste your address, and request test ETH (you may need a free Coinbase account to use the faucet).
3. Repeat for the **Minter** account — send it a small amount too (or just send some from the Deployer account to the Minter account once the Deployer has funds, using MetaMask's Send button).

---

## Part 6 — Fill in your `.env` file and test locally

1. In your project folder, copy the example file:

```bash
cp .env.example .env
```

2. Open `.env` in your code editor and fill in every value using what you collected above:

```
DATABASE_URL="postgresql://postgres:...@db.xxxx.supabase.co:5432/postgres"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="paste output of the command below"
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
NEXT_PUBLIC_SUPABASE_URL="https://xxxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
SUPABASE_SERVICE_ROLE_KEY="..."
QR_SIGNING_SECRET="paste another output of the command below"
NEXT_PUBLIC_BASE_RPC_URL="https://sepolia.base.org"
NEXT_PUBLIC_BASE_CHAIN_ID="84532"
NEXT_PUBLIC_POAP_CONTRACT_ADDRESS="filled in after Part 6b below"
BACKEND_MINTER_PRIVATE_KEY="0x... (your Minter wallet's private key)"
DEPLOYER_PRIVATE_KEY="0x... (your Deployer wallet's private key)"
BACKEND_MINTER_ADDRESS="0x... (your Minter wallet's public address)"
BASESCAN_API_KEY=""
```

To generate the two random secrets (`NEXTAUTH_SECRET` and `QR_SIGNING_SECRET`), run this twice in your terminal and paste each result in:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Part 6a — Create your database tables

```bash
npx prisma db push
npm run db:seed
```

You should see a success message and three sample accounts printed (password `Password123!` for all of them).

### Part 6b — Deploy the smart contract to Base Sepolia

```bash
npm install --save-dev @openzeppelin/contracts
npx hardhat compile
npx hardhat run scripts/deploy.ts --network baseSepolia
```

This will print something like:

```
EventChainPOAP deployed to: 0xAbC123...
```

Copy that address into `NEXT_PUBLIC_POAP_CONTRACT_ADDRESS` in your `.env` file. You can view your contract on https://sepolia.basescan.org by pasting the address into the search bar.

### Part 6c — Run the app locally

```bash
npm run dev
```

Open http://localhost:3000 in your browser. Try signing in with `attendee@eventchain.dev` / `Password123!`, browse the seeded event, and apply. If everything loads without errors, you're ready to deploy.

---

## Part 7 — Deploy to Vercel (free hosting)

1. Go to https://vercel.com and sign up using your **GitHub** account (this makes the next step automatic).
2. Click **Add New → Project**.
3. Find your `eventchain` repository in the list and click **Import**.
4. Before clicking Deploy, open **Environment Variables** and add every single line from your `.env` file — one row per variable, exactly as it's named (e.g. `DATABASE_URL`, `NEXTAUTH_SECRET`, etc.). Do this for **all of them**, including the blockchain ones.
5. For `NEXTAUTH_URL`, leave it blank for now — you'll set it after your first deploy (Vercel assigns your URL only once deployed).
6. Click **Deploy**. Wait 1–3 minutes.
7. Once deployed, Vercel shows you a URL like `https://eventchain-yourname.vercel.app`. Copy it.
8. Go back to **Project → Settings → Environment Variables**, edit `NEXTAUTH_URL` to be that exact URL (no trailing slash), and click **Save**.
9. Go to **Deployments** tab → click the **⋯** menu on the latest deployment → **Redeploy**, so the new `NEXTAUTH_URL` takes effect.

### Update Google OAuth with your live URL

Back in Google Cloud Console (Part 4), edit your OAuth client and add a second Authorized redirect URI:
```
https://your-vercel-url.vercel.app/api/auth/callback/google
```

### Push your database schema to production

Your local `.env` already points at your one Supabase database, so `npx prisma db push` in Part 6a already created your production tables — there's nothing extra to do here as long as you used the same `DATABASE_URL` in both places.

---

## Part 8 — Try your live app

Visit your Vercel URL. You should be able to:
- Sign up / sign in
- Browse the seeded event
- Apply to it
- Sign in as `organizer@eventchain.dev` (password `Password123!`), go to `/dashboard/events/[id]/applications` (find the event's ID from its URL on the Browse Events page) and approve the application
- Sign back in as the attendee, go to **My Events**, download the QR code
- Sign in as the organizer or a team member, go to `/scan`, allow camera access, and scan the downloaded QR on another device or by showing the QR image to the camera
- Connect MetaMask (My Events page) with the same address as your **Minter** wallet's recipient — actually, connect any wallet you want to *receive* a POAP; check in to see it minted, then view it in **NFT Gallery**

---

## Troubleshooting

**"Invalid environment variables" error on Vercel** — you missed one. Go to Settings → Environment Variables and compare against `.env.example` line by line.

**Google sign-in redirects to an error page** — the redirect URI in Google Cloud Console must match your `NEXTAUTH_URL` *exactly*, including `https://` and no trailing slash, plus `/api/auth/callback/google` at the end.

**"insufficient funds for gas" when deploying the contract** — your Deployer wallet has no test ETH yet. Revisit Part 5's faucet step.

**Certificates or banners don't load** — double check your Supabase Storage bucket is named exactly `eventchain` and is set to **Public**.

**QR scan says "already used" immediately** — each QR code is single-use by design; generate a fresh application/approval to test again, or re-approve to reissue a new one.

**Minting fails silently, attendee gets an "off-chain badge" instead** — check that `BACKEND_MINTER_PRIVATE_KEY` corresponds to a wallet that (a) has test ETH for gas and (b) was passed as `backendMinter` when you ran the deploy script (Part 6b) — if you deployed before creating the Minter wallet, redeploy the contract with the correct `BACKEND_MINTER_ADDRESS` set in `.env` first.

---

## Migrating from Base Sepolia to Base Mainnet later

When you're ready for real users and real ETH, change only these four environment variables in Vercel, then redeploy your contract to mainnet using the same `scripts/deploy.ts` with a mainnet RPC URL:

```
NEXT_PUBLIC_BASE_RPC_URL       → https://mainnet.base.org
NEXT_PUBLIC_BASE_CHAIN_ID      → 8453
NEXT_PUBLIC_POAP_CONTRACT_ADDRESS → (new mainnet contract address)
BACKEND_MINTER_PRIVATE_KEY     → (a mainnet wallet, funded with real ETH for gas)
```

No other code changes are required anywhere in the app.

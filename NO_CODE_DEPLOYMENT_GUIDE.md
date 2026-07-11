# EventChain — No-Code Deployment Guide

This version avoids the terminal completely. Every step happens on a website, in your browser. The one exception, and I want to be upfront about it: you'll paste one ready-made script into Supabase's website to set up your database tables, and paste the contract file into a website called Remix to publish it. That's copy-paste into a box on a page — not writing or editing any code — but it's the one part of this project that can't be a single click, because a database schema and a smart contract both have to exist somewhere as text before they can run.

Total time: about 60–90 minutes.

---

## What you'll end up with

- Your code stored on **GitHub** (free) — uploaded by dragging your folder into a webpage
- Your app hosted on **Vercel** (free) — connected straight to GitHub
- Your database on **Supabase** (free) — tables created by pasting one script into their website
- Your smart contract on **Base Sepolia** (a free test network) — published using **Remix**, a website for smart contracts, connected to your MetaMask

---

## Part 0 — Two browser add-ons to install

1. **MetaMask** — go to https://metamask.io, click Download, add it to your browser. When it opens, click "Create a new wallet," set a password, and **write your 12-word recovery phrase on paper** (not a screenshot, not a note app).
2. That's it. No other software installs — everything else happens on websites.

---

## Part 1 — Put your project files on GitHub (no git, no terminal)

1. Unzip the `eventchain.zip` file you were given, into any folder on your computer.
2. Go to https://github.com and create a free account.
3. Click the **+** in the top right → **New repository**. Name it `eventchain`, leave everything else default, click **Create repository**.
4. On the next page, look for the link that says **"uploading an existing file"** and click it.
5. Open the unzipped `eventchain` folder on your computer, select everything inside it (not the outer folder itself), and **drag it into the browser window** onto the upload box. Modern Chrome and Edge will upload the whole folder structure as-is.
6. Wait for the upload bar to finish (it can take a minute — there are 60+ files), scroll down, and click **Commit changes**.

Your code is now on GitHub. You'll never need to touch it locally again.

---

## Part 2 — Create your free database (Supabase)

1. Go to https://supabase.com → **Start your project** → sign up (signing in with GitHub is fastest).
2. Click **New Project**.
   - Name: `eventchain`
   - Click **Generate a password** and **copy it somewhere safe**.
   - Pick the closest region.
   - Click **Create new project**, wait about 2 minutes.
3. In the left sidebar, click the **gear icon (Project Settings) → Database**. Scroll to **Connection string → URI**, copy it, and replace `[YOUR-PASSWORD]` in it with the password from step 2. Save this — it's your `DATABASE_URL`.
4. Still in Project Settings, click **API**. Copy and save:
   - **Project URL** → this is `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key (click Reveal) → `SUPABASE_SERVICE_ROLE_KEY`

### Create your database tables (copy-paste, no terminal)

1. In the left sidebar, click **SQL Editor → New query**.
2. Open the file `supabase_setup.sql` (included with your project files), select everything in it, copy it.
3. Paste it into the Supabase SQL Editor box and click **Run**.
4. You should see "Success. No rows returned." Click **Table Editor** in the sidebar — you should now see 15 tables (User, Event, Application, and so on).

### Create your storage bucket

1. Click **Storage** in the sidebar → **New bucket**.
2. Name it exactly `eventchain`, toggle **Public bucket** on, click **Create bucket**.

---

## Part 3 — Set up Google sign-in (optional — email/password works without this)

1. Go to https://console.cloud.google.com, sign in, click the project dropdown → **New Project** → name it `eventchain` → **Create**.
2. Search "OAuth consent screen" in the top search bar, open it, choose **External** → **Create**, fill in an app name and your email, click through the remaining steps with defaults, **Save**.
3. Search "Credentials", open **Credentials**, click **Create Credentials → OAuth client ID**.
   - Application type: **Web application**
   - Authorized redirect URIs: add `http://localhost:3000/api/auth/callback/google` for now — you'll add your real one in Part 6.
   - Click **Create**, copy the **Client ID** and **Client Secret**.

---

## Part 4 — Get free test ETH and two wallets

You need two accounts inside MetaMask: one to publish the contract, one for your live app to use for minting.

1. Open MetaMask → account icon → **Add account** → name it "EventChain Deployer."
2. Repeat, name the second one "EventChain Minter."
3. For each: click the account → **Account details → Show private key** → enter your password → copy the key (starts with `0x`) somewhere safe. Also copy each account's public address (also starts with `0x`, shown under the account name).
4. Click the network dropdown at the top of MetaMask → **Add network → Add a network manually**, and fill in:
   - Network name: `Base Sepolia`
   - RPC URL: `https://sepolia.base.org`
   - Chain ID: `84532`
   - Currency symbol: `ETH`
   - Block explorer: `https://sepolia.basescan.org`
5. Switch MetaMask to this network, switch to your **Deployer** account, copy its address.
6. Go to https://www.coinbase.com/faucets/base-sepolia-faucet, paste the address, request free test ETH.
7. In MetaMask, use the **Send** button to send a small amount of that test ETH from Deployer to your Minter account's address too.

---

## Part 5 — Publish the smart contract (Remix — a website, no install)

1. Go to https://remix.ethereum.org — it opens a code editor in your browser, nothing to install.
2. In the left file panel, click the **file icon** to create a new file. Name it `EventChainPOAP.sol`.
3. Open the file `contracts/EventChainPOAP.sol` from your project folder in any text editor (or even Notepad), select all, copy it, and paste it into the Remix file.
4. In Remix's left sidebar, click the **Solidity compiler** icon (looks like an "S"). Set the compiler version to `0.8.24`, then click **Compile EventChainPOAP.sol**. Remix automatically fetches the OpenZeppelin import for you — no setup needed.
5. Click the **Deploy & run transactions** icon (looks like an Ethereum logo with an arrow).
   - Environment: choose **Injected Provider - MetaMask**. MetaMask will pop up — approve the connection, and make sure it's switched to **Base Sepolia** and your **Deployer** account.
   - Next to the **Deploy** button, expand the constructor field and paste your **Minter** account's public address into the `backendMinter` field.
   - Click **Deploy**. Confirm the transaction in the MetaMask popup.
6. Once it succeeds, under **Deployed Contracts** you'll see your contract with its address — click the copy icon next to it. This is your `NEXT_PUBLIC_POAP_CONTRACT_ADDRESS`.

---

## Part 6 — Deploy to Vercel

1. Go to https://vercel.com, sign up with your **GitHub** account.
2. Click **Add New → Project**, find your `eventchain` repository, click **Import**.
3. Before deploying, open **Environment Variables** and add each of these one at a time (name, then value):

| Name | Value |
|---|---|
| `DATABASE_URL` | from Part 2 |
| `NEXTAUTH_URL` | leave blank for now |
| `NEXTAUTH_SECRET` | see below |
| `GOOGLE_CLIENT_ID` | from Part 3 (or leave blank) |
| `GOOGLE_CLIENT_SECRET` | from Part 3 (or leave blank) |
| `NEXT_PUBLIC_SUPABASE_URL` | from Part 2 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | from Part 2 |
| `SUPABASE_SERVICE_ROLE_KEY` | from Part 2 |
| `QR_SIGNING_SECRET` | see below |
| `NEXT_PUBLIC_BASE_RPC_URL` | `https://sepolia.base.org` |
| `NEXT_PUBLIC_BASE_CHAIN_ID` | `84532` |
| `NEXT_PUBLIC_POAP_CONTRACT_ADDRESS` | from Part 5 |
| `BACKEND_MINTER_PRIVATE_KEY` | your Minter account's private key, from Part 4 |

**For `NEXTAUTH_SECRET` and `QR_SIGNING_SECRET`**: open https://generate-secret.vercel.app/32 in a new browser tab — it instantly shows a random secret, no install needed. Refresh the page to get a second, different one for the other variable.

4. Click **Deploy**. Wait 1–3 minutes.
5. Once deployed, copy the URL Vercel gives you (like `https://eventchain-yourname.vercel.app`).
6. Go back to **Project Settings → Environment Variables**, edit `NEXTAUTH_URL` to that exact URL, save.
7. Go to **Deployments**, click **⋯** on the latest one → **Redeploy**.

### If you set up Google sign-in

Go back to Google Cloud Console → your OAuth client → add a second Authorized redirect URI:
```
https://your-vercel-url.vercel.app/api/auth/callback/google
```

---

## Part 7 — Try it

Visit your Vercel URL:
- Sign up for a new account (this goes through your app's own sign-up page, which writes to your Supabase database automatically — you don't need to add any accounts manually).
- Create an event, sign in as that same account (organizers and attendees are just accounts — the first person to create an event becomes its organizer automatically).
- To test the full loop, sign up a second account in a private/incognito window, apply to the event, approve it as the organizer, download the QR code, and scan it at `/scan` using the organizer account.
- Connect MetaMask on the attendee account (any wallet address works for testing) before scanning, to see an NFT actually mint.

---

## Troubleshooting

**Supabase SQL script fails partway through** — this usually means it was run twice. Go to Table Editor, delete any tables it partially created, and run the script again from a clean project.

**"Invalid environment variables" on Vercel** — you're missing one. Compare your Vercel Environment Variables list against the table in Part 6.

**Google sign-in redirects to an error** — the redirect URI in Google Cloud Console must exactly match your Vercel URL plus `/api/auth/callback/google`.

**Contract deploy fails in Remix with "insufficient funds"** — your Deployer account has no test ETH yet; revisit Part 4's faucet step.

**Check-in mints an off-chain badge instead of an NFT** — either the attendee didn't connect a wallet before scanning, or your Minter account has no test ETH for gas (send it some from your Deployer account in MetaMask).

**Certificates or banners don't load** — double-check your Supabase Storage bucket is named exactly `eventchain` and is Public.

---

## Migrating to Base Mainnet later

When you're ready for real users: republish the contract in Remix using a Base Mainnet RPC in MetaMask instead of Base Sepolia, then update just these four Vercel environment variables:

```
NEXT_PUBLIC_BASE_RPC_URL       → https://mainnet.base.org
NEXT_PUBLIC_BASE_CHAIN_ID      → 8453
NEXT_PUBLIC_POAP_CONTRACT_ADDRESS → (new mainnet contract address)
BACKEND_MINTER_PRIVATE_KEY     → (a mainnet wallet, funded with real ETH for gas)
```

No other files or settings need to change.

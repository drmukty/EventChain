-- EventChain database setup script
-- Paste this whole file into Supabase → SQL Editor → New query → Run.
-- It creates every table EventChain needs. You only need to run this once.

create extension if not exists "pgcrypto";

-- ── Enums ───────────────────────────────────────────────────────────────
create type "GlobalRole" as enum ('ADMIN', 'ORGANIZER', 'ATTENDEE');
create type "TeamRole" as enum ('OWNER', 'ADMIN', 'VOLUNTEER', 'QR_SCANNER');
create type "EventVisibility" as enum ('PUBLIC', 'PRIVATE', 'TOKEN_GATED', 'NFT_HOLDER');
create type "EventStatus" as enum ('DRAFT', 'REGISTRATION_OPEN', 'SOLD_OUT', 'LIVE', 'COMPLETED', 'CANCELLED');
create type "ApplicationStatus" as enum ('PENDING', 'APPROVED', 'REJECTED', 'WAITLISTED', 'CANCELLED');
create type "NotificationType" as enum ('APPLICATION_SUBMITTED', 'APPLICATION_APPROVED', 'APPLICATION_REJECTED', 'REGISTRATION_CLOSED', 'QR_GENERATED', 'NFT_MINTED', 'CERTIFICATE_READY', 'WAITLIST_PROMOTED');

-- ── Users & auth ────────────────────────────────────────────────────────
create table "User" (
  "id" text primary key,
  "name" text,
  "email" text not null unique,
  "emailVerified" timestamp(3),
  "passwordHash" text,
  "image" text,
  "role" "GlobalRole" not null default 'ATTENDEE',
  "walletAddress" text unique,
  "bio" text,
  "createdAt" timestamp(3) not null default now(),
  "updatedAt" timestamp(3) not null default now()
);

create table "Account" (
  "id" text primary key,
  "userId" text not null references "User"("id") on delete cascade,
  "type" text not null,
  "provider" text not null,
  "providerAccountId" text not null,
  "refresh_token" text,
  "access_token" text,
  "expires_at" integer,
  "token_type" text,
  "scope" text,
  "id_token" text,
  "session_state" text,
  unique ("provider", "providerAccountId")
);

create table "Session" (
  "id" text primary key,
  "sessionToken" text not null unique,
  "userId" text not null references "User"("id") on delete cascade,
  "expires" timestamp(3) not null
);

create table "VerificationToken" (
  "identifier" text not null,
  "token" text not null unique,
  "expires" timestamp(3) not null,
  primary key ("identifier", "token")
);

-- ── Events ──────────────────────────────────────────────────────────────
create table "Event" (
  "id" text primary key,
  "title" text not null,
  "slug" text not null unique,
  "description" text not null,
  "category" text not null,
  "bannerUrl" text,
  "logoUrl" text,
  "venue" text not null,
  "address" text,
  "latitude" double precision,
  "longitude" double precision,
  "startsAt" timestamp(3) not null,
  "endsAt" timestamp(3) not null,
  "registrationDeadline" timestamp(3) not null,
  "capacity" integer not null,
  "visibility" "EventVisibility" not null default 'PUBLIC',
  "status" "EventStatus" not null default 'DRAFT',
  "invitedEmails" text[] not null default '{}',
  "tokenGateAddress" text,
  "tokenGateMinBalance" integer default 1,
  "organizerId" text not null references "User"("id"),
  "createdAt" timestamp(3) not null default now(),
  "updatedAt" timestamp(3) not null default now()
);
create index "Event_status_idx" on "Event"("status");
create index "Event_category_idx" on "Event"("category");
create index "Event_organizerId_idx" on "Event"("organizerId");

create table "Speaker" (
  "id" text primary key,
  "eventId" text not null references "Event"("id") on delete cascade,
  "name" text not null,
  "title" text,
  "photoUrl" text,
  "bio" text
);

create table "Sponsor" (
  "id" text primary key,
  "eventId" text not null references "Event"("id") on delete cascade,
  "name" text not null,
  "logoUrl" text,
  "tier" text,
  "url" text
);

create table "AgendaItem" (
  "id" text primary key,
  "eventId" text not null references "Event"("id") on delete cascade,
  "startTime" timestamp(3) not null,
  "endTime" timestamp(3) not null,
  "title" text not null,
  "speaker" text
);

-- ── Team management ─────────────────────────────────────────────────────
create table "TeamMember" (
  "id" text primary key,
  "eventId" text not null references "Event"("id") on delete cascade,
  "userId" text not null references "User"("id"),
  "role" "TeamRole" not null default 'VOLUNTEER',
  "invitedAt" timestamp(3) not null default now(),
  unique ("eventId", "userId")
);

-- ── Applications & waitlist ──────────────────────────────────────────────
create table "Application" (
  "id" text primary key,
  "eventId" text not null references "Event"("id") on delete cascade,
  "userId" text not null references "User"("id"),
  "status" "ApplicationStatus" not null default 'PENDING',
  "answers" jsonb,
  "waitlistPosition" integer,
  "reviewedById" text,
  "reviewedAt" timestamp(3),
  "createdAt" timestamp(3) not null default now(),
  "updatedAt" timestamp(3) not null default now(),
  unique ("eventId", "userId")
);
create index "Application_eventId_status_idx" on "Application"("eventId", "status");

-- ── QR codes ─────────────────────────────────────────────────────────────
create table "QRCode" (
  "id" text primary key,
  "applicationId" text not null unique references "Application"("id") on delete cascade,
  "token" text not null unique,
  "payloadHash" text not null,
  "isUsed" boolean not null default false,
  "usedAt" timestamp(3),
  "expiresAt" timestamp(3) not null,
  "createdAt" timestamp(3) not null default now()
);
create index "QRCode_token_idx" on "QRCode"("token");

-- ── Check-ins ────────────────────────────────────────────────────────────
create table "CheckIn" (
  "id" text primary key,
  "eventId" text not null references "Event"("id") on delete cascade,
  "applicationId" text not null unique references "Application"("id"),
  "userId" text not null references "User"("id"),
  "scannedById" text,
  "checkedInAt" timestamp(3) not null default now()
);
create index "CheckIn_eventId_idx" on "CheckIn"("eventId");

-- ── NFTs ─────────────────────────────────────────────────────────────────
create table "NFT" (
  "id" text primary key,
  "eventId" text not null references "Event"("id") on delete cascade,
  "userId" text not null references "User"("id"),
  "checkInId" text not null unique references "CheckIn"("id"),
  "isOnChain" boolean not null default false,
  "tokenId" text,
  "txHash" text,
  "contractAddr" text,
  "chainId" integer,
  "mintedAt" timestamp(3) not null default now(),
  "metadataUrl" text
);
create index "NFT_userId_idx" on "NFT"("userId");

-- ── Certificates ─────────────────────────────────────────────────────────
create table "Certificate" (
  "id" text primary key,
  "eventId" text not null references "Event"("id") on delete cascade,
  "userId" text not null references "User"("id"),
  "pdfUrl" text not null,
  "issuedAt" timestamp(3) not null default now(),
  unique ("eventId", "userId")
);

-- ── Notifications ────────────────────────────────────────────────────────
create table "Notification" (
  "id" text primary key,
  "userId" text not null references "User"("id") on delete cascade,
  "type" "NotificationType" not null,
  "title" text not null,
  "message" text not null,
  "readAt" timestamp(3),
  "metadata" jsonb,
  "createdAt" timestamp(3) not null default now()
);
create index "Notification_userId_readAt_idx" on "Notification"("userId", "readAt");

-- Done. You should now see 15 new tables in Supabase → Table Editor.

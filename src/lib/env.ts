import { z } from "zod";

/**
 * Single source of truth for environment configuration.
 * Import `env` anywhere instead of reading `process.env` directly, so that
 * missing/invalid config fails fast at boot instead of silently at runtime.
 */
const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),

  // NextAuth
  NEXTAUTH_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(32, "NEXTAUTH_SECRET must be at least 32 chars"),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  // Supabase Storage
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // QR signing
  QR_SIGNING_SECRET: z.string().min(32, "QR_SIGNING_SECRET must be at least 32 chars"),

  // Blockchain — Base Sepolia today. To migrate to Base Mainnet, change ONLY
  // these four values (RPC URL, chain ID, contract address, minter key).
  NEXT_PUBLIC_BASE_RPC_URL: z.string().url(),
  NEXT_PUBLIC_BASE_CHAIN_ID: z.coerce.number(),
  NEXT_PUBLIC_POAP_CONTRACT_ADDRESS: z.string().startsWith("0x"),
  BACKEND_MINTER_PRIVATE_KEY: z.string().startsWith("0x"),
});

function loadEnv() {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    // eslint-disable-next-line no-console
    console.error("❌ Invalid environment variables:", parsed.error.flatten().fieldErrors);
    throw new Error("Invalid environment variables — see .env.example for the full list.");
  }
  return parsed.data;
}

// Skip hard validation during `next build` static analysis / lint steps;
// still validated at runtime when the server actually boots.
export const env = process.env.SKIP_ENV_VALIDATION ? (process.env as any) : loadEnv();

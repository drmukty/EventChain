import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';

export function generateManualToken(): string {
  const bytes = randomBytes(6);
  let token = BigInt('0x' + bytes.toString('hex')).toString(36).toUpperCase();
  while (token.length < 8) token = '0' + token;
  return token.slice(0, 8);
}

export async function hashToken(token: string): Promise<string> {
  return bcrypt.hash(token, 10);
}

export async function verifyToken(token: string, hash: string): Promise<boolean> {
  return bcrypt.compare(token, hash);
}

export function isValidTokenFormat(token: string): boolean {
  return /^[A-Z0-9]{8}$/.test(token);
}

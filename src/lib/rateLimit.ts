// Simple in-memory rate limiter for exports
// In production, replace with Redis or Upstash

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(userId: string, limit: number = 5, windowMs: number = 10 * 60 * 1000) {
  const key = userId;
  const now = Date.now();
  const record = rateLimitStore.get(key);
  
  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }
  
  if (record.count >= limit) {
    return { allowed: false, remaining: 0 };
  }
  
  record.count += 1;
  return { allowed: true, remaining: limit - record.count };
}

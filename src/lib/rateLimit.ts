/**
 * Rate Limiting Utility
 * Uses Upstash Redis or Vercel KV for rate limiting
 * Falls back to in-memory rate limiting in development
 */

import logger from './logger';

interface RateLimitConfig {
  limit: number; // Number of requests
  window: string; // Time window (e.g., '10s', '1m', '1h')
}

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp
}

// In-memory fallback for development
const memoryStore = new Map<string, { count: number; reset: number }>();

/**
 * Rate limit check using Upstash Redis or Vercel KV
 * Falls back to in-memory store if not configured
 */
export async function rateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const { limit, window } = config;
  
  // Parse window (e.g., '10s' -> 10 seconds, '1m' -> 60 seconds)
  const windowSeconds = parseWindow(window);
  const reset = Math.floor(Date.now() / 1000) + windowSeconds;

  // Try Upstash Redis first
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (upstashUrl && upstashToken) {
    try {
      const key = `ratelimit:${identifier}`;
      
      // Use Upstash REST API
      const response = await fetch(`${upstashUrl}/pipeline`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${upstashToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([
          ['INCR', key],
          ['EXPIRE', key, windowSeconds],
          ['GET', key],
        ]),
      });

      if (response.ok) {
        const data = await response.json();
        const count = data[0]?.result || 0;
        const remaining = Math.max(0, limit - count);
        
        return {
          success: count <= limit,
          limit,
          remaining,
          reset,
        };
      }
    } catch (error) {
      logger.error('Upstash rate limit error', { error });
      // Fall through to memory store
    }
  }

  // Fallback to in-memory store
  const key = `${identifier}:${window}`;
  const now = Date.now();
  const stored = memoryStore.get(key);

  if (!stored || now > stored.reset) {
    // Reset or create new entry
    memoryStore.set(key, {
      count: 1,
      reset: now + windowSeconds * 1000,
    });
    
    return {
      success: true,
      limit,
      remaining: limit - 1,
      reset: Math.floor((now + windowSeconds * 1000) / 1000),
    };
  }

  // Increment count
  stored.count++;
  const remaining = Math.max(0, limit - stored.count);

  return {
    success: stored.count <= limit,
    limit,
    remaining,
    reset: Math.floor(stored.reset / 1000),
  };
}

/**
 * Parse time window string to seconds
 */
function parseWindow(window: string): number {
  const match = window.match(/^(\d+)([smh])$/);
  if (!match) {
    throw new Error(`Invalid window format: ${window}. Use format like '10s', '1m', '1h'`);
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 's':
      return value;
    case 'm':
      return value * 60;
    case 'h':
      return value * 3600;
    default:
      throw new Error(`Unknown time unit: ${unit}`);
  }
}

/**
 * Get client IP from request
 */
export function getClientIP(request: Request): string {
  // Try various headers (Vercel, Cloudflare, etc.)
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  // Fallback
  return 'unknown';
}

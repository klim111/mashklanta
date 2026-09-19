import { redis } from "@/lib/redis";

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  /** שניות עד שהחלון מתאפס — מוחזר ללקוח ב-Retry-After */
  resetInSeconds: number;
};

type RateLimitOptions = {
  limit: number;
  windowSeconds: number;
};

/**
 * מונים מקומיים, לשימוש כשאין Redis (פיתוח, או תקלת חיבור). הם לא משותפים בין
 * מופעים ולכן אינם הגנה אמיתית בפרודקשן — אבל עדיף על היעדר מגבלה כלשהי.
 */
const memoryCounters = new Map<string, { count: number; expiresAt: number }>();

function limitInMemory(key: string, { limit, windowSeconds }: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const existing = memoryCounters.get(key);

  if (!existing || existing.expiresAt <= now) {
    memoryCounters.set(key, { count: 1, expiresAt: now + windowSeconds * 1000 });
    return { allowed: true, remaining: limit - 1, resetInSeconds: windowSeconds };
  }

  existing.count += 1;
  const resetInSeconds = Math.max(1, Math.ceil((existing.expiresAt - now) / 1000));
  return {
    allowed: existing.count <= limit,
    remaining: Math.max(0, limit - existing.count),
    resetInSeconds,
  };
}

// המפה גדלה רק לפי מספר המפתחות הפעילים, אבל בלי ניקוי היא תדלוף לאורך זמן
function pruneMemoryCounters() {
  if (memoryCounters.size < 1000) return;
  const now = Date.now();
  for (const [key, entry] of memoryCounters) {
    if (entry.expiresAt <= now) memoryCounters.delete(key);
  }
}

/**
 * חלון קבוע פשוט: מונה אחד למפתח, שנמחק בתום החלון. מספיק כדי לעצור ניצול של
 * endpoint יקר, ולא מנסה להיות מדויק בגבולות החלון.
 */
export async function rateLimit(key: string, options: RateLimitOptions): Promise<RateLimitResult> {
  const namespacedKey = `ratelimit:${key}`;

  if (!redis) {
    pruneMemoryCounters();
    return limitInMemory(namespacedKey, options);
  }

  try {
    const count = await redis.incr(namespacedKey);
    if (count === 1) {
      await redis.expire(namespacedKey, options.windowSeconds);
    }

    const ttl = await redis.ttl(namespacedKey);
    return {
      allowed: count <= options.limit,
      remaining: Math.max(0, options.limit - count),
      resetInSeconds: ttl > 0 ? ttl : options.windowSeconds,
    };
  } catch (error) {
    console.error("Rate limit check failed, falling back to in-memory:", error);
    pruneMemoryCounters();
    return limitInMemory(namespacedKey, options);
  }
}

/**
 * כתובת ה-IP של הקורא. מאחורי פרוקסי (Vercel) הכתובת האמיתית היא הראשונה
 * ב-x-forwarded-for; שאר הערכים בשרשרת ניתנים לזיוף.
 */
export function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip")?.trim() || "unknown";
}

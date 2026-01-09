import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Initialize Redis if keys are available
let ratelimit: Ratelimit | null = null;
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    const redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
    
    ratelimit = new Ratelimit({
        redis: redis,
        // Allow 5 requests per minute per IP for sensitive routes
        limiter: Ratelimit.slidingWindow(5, '1 m'),
        analytics: true,
    });
}

export async function middleware(request: NextRequest) {
    const ip = request.ip ?? '127.0.0.1';
    
    // Only rate limit specific routes
    if (request.nextUrl.pathname.startsWith('/api/process') || request.nextUrl.pathname.startsWith('/api/onboard')) {
        if (ratelimit) {
            const { success, limit, reset, remaining } = await ratelimit.limit(`ratelimit_${ip}`);
            if (!success) {
                return new NextResponse('Rate limit exceeded. Please try again later.', {
                    status: 429,
                    headers: {
                        'X-RateLimit-Limit': limit.toString(),
                        'X-RateLimit-Remaining': remaining.toString(),
                        'X-RateLimit-Reset': reset.toString(),
                    },
                });
            }
        }
    }
    
    return NextResponse.next();
}

export const config = {
    matcher: ['/api/process', '/api/onboard'],
};

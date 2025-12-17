import { NextResponse } from "next/server";

import { getCurrentUserFromMiddleware } from "@/lib/auth/currentUser";

/**
 * GET /api/auth/me
 * 
 * Returns current authenticated user
 * Protected by middleware - requires valid JWT
 */
export async function GET(request: Request) {
  try {
    // Get user from middleware (JWT already verified)
    const user = await getCurrentUserFromMiddleware(request);
    
    if (!user) {
      // Middleware should have blocked this, but handle gracefully
      return NextResponse.json({ user: null }, { status: 401 });
    }
    
    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
}

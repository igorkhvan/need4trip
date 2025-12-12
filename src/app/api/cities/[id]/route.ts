/**
 * City by ID API
 * 
 * GET /api/cities/[id] - Get city by ID
 */

import { NextRequest, NextResponse } from "next/server";
import { getCityById } from "@/lib/db/cityRepo";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json(
      { error: "City ID is required" },
      { status: 400 }
    );
  }

  try {
    const city = await getCityById(id);

    if (!city) {
      return NextResponse.json(
        { error: "City not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ city });
  } catch (error) {
    console.error(`[GET /api/cities/${id}] Failed to fetch city:`, error);
    return NextResponse.json(
      { error: "Failed to fetch city" },
      { status: 500 }
    );
  }
}


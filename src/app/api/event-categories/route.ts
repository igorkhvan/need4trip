import { NextRequest, NextResponse } from "next/server";
import { getActiveEventCategories } from "@/lib/db/eventCategoryRepo";

/**
 * GET /api/event-categories
 * Returns list of active event categories
 */
export async function GET(req: NextRequest) {
  try {
    const categories = await getActiveEventCategories();
    
    // Return DTO format (only needed fields for client)
    const dtoCategories = categories.map(cat => ({
      id: cat.id,
      code: cat.code,
      nameRu: cat.nameRu,
      nameEn: cat.nameEn,
      icon: cat.icon,
      isDefault: cat.isDefault, // Added
    }));

    return NextResponse.json({ categories: dtoCategories });
  } catch (error) {
    console.error("[GET /api/event-categories] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch event categories" },
      { status: 500 }
    );
  }
}


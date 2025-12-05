import { NextResponse } from "next/server";

import { listCarBrands } from "@/lib/db/carBrandRepo";

export async function GET() {
  try {
    const brands = await listCarBrands();
    return NextResponse.json({ brands });
  } catch (err) {
    console.error("[api/car-brands] Failed to list car brands", err);
    return NextResponse.json({ brands: [] }, { status: 200 });
  }
}

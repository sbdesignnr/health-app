import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveByBarcode } from "@/lib/food-service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ barcode: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { barcode } = await params;

  try {
    const result = await resolveByBarcode(barcode);
    if (!result) {
      return NextResponse.json({ found: false, result: null }, { status: 404 });
    }
    return NextResponse.json({ found: true, result });
  } catch (err) {
    console.error("barcode resolve error:", err);
    return NextResponse.json({ error: "Vyhľadanie kódu zlyhalo." }, { status: 502 });
  }
}

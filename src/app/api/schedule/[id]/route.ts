import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { deleteEvent, listEvents, parseEventInput, updateEvent } from "@/lib/schedule";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const input = parseEventInput(await request.json().catch(() => null));
  if (!input) return NextResponse.json({ error: "Neplatné dáta udalosti." }, { status: 400 });

  try {
    await updateEvent(userId, id, input);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Úprava zlyhala." },
      { status: 400 },
    );
  }
  return NextResponse.json({ events: await listEvents(userId) });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await deleteEvent(userId, id);
  return NextResponse.json({ events: await listEvents(userId) });
}

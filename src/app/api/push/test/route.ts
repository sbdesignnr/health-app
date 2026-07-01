import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { sendToUser } from "@/lib/push";

export async function POST() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { sent, pruned } = await sendToUser(userId, {
      title: "Health Assistant ✅",
      body: "Push notifikácie fungujú.",
      url: "/dnes",
      tag: "test",
    });
    return NextResponse.json({ ok: true, sent, pruned });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Odoslanie zlyhalo." },
      { status: 500 },
    );
  }
}

import { NextResponse } from "next/server";
import { getLogs, getRegisteredChats } from "@/lib/storage";

export async function GET() {
  try {
    const logs = await getLogs();
    const chats = await getRegisteredChats();
    return NextResponse.json({
      ok: true,
      logs,
      chats,
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getSettings } from "@/lib/storage";
import { generateArtemReply, ContextMessage } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, history, settingsOverride } = body;

    if (!message || typeof message !== "string") {
      return NextResponse.json({ ok: false, error: "Сообщение не передано" }, { status: 400 });
    }

    const currentSettings = await getSettings();
    const effectiveSettings = {
      ...currentSettings,
      ...(settingsOverride || {}),
    };

    const context: ContextMessage[] = (history || []).map((h: any) => ({
      senderName: h.senderName || (h.isBot ? "Артём" : "Тестер"),
      text: h.text,
      isBot: h.isBot,
    }));

    const reply = await generateArtemReply(
      context,
      {
        senderName: "Админ",
        text: message,
        isReplyToBot: false,
        isGroup: false,
      },
      effectiveSettings
    );

    return NextResponse.json({ ok: true, reply });
  } catch (error: any) {
    console.error("Test chat error:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getSettings, updateSettings } from "@/lib/storage";

export async function GET() {
  try {
    const settings = await getSettings();
    return NextResponse.json({
      ok: true,
      settings: {
        ...settings,
        // Mask secret tokens for safety if requested
        hasTelegramToken: Boolean(settings.telegramToken),
        hasGeminiKey: Boolean(settings.geminiApiKey),
      },
    });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const current = await getSettings();

    // Verify admin password if provided or configured
    if (current.adminPassword && body.adminPassword && body.adminPassword !== current.adminPassword) {
      return NextResponse.json({ ok: false, error: "Неверный пароль администратора" }, { status: 403 });
    }

    const updated = await updateSettings(body);
    return NextResponse.json({ ok: true, settings: updated });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

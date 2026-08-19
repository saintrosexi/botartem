import { NextRequest, NextResponse } from "next/server";
import { getSettings, getRegisteredChats, addLog } from "@/lib/storage";
import { generateCheckinMessage } from "@/lib/gemini";
import { sendTelegramMessage } from "@/lib/telegram";

export const maxDuration = 60; // Up to 60s for multiple groups

export async function GET(req: NextRequest) {
  return handleCron(req);
}

export async function POST(req: NextRequest) {
  return handleCron(req);
}

async function handleCron(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    // Verify secret if CRON_SECRET is set
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      const url = new URL(req.url);
      const manualKey = url.searchParams.get("key");
      if (manualKey !== cronSecret) {
        return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
      }
    }

    const settings = await getSettings();
    const token = settings.telegramToken || process.env.TELEGRAM_BOT_TOKEN;

    if (!token) {
      return NextResponse.json({ ok: false, error: "Telegram Bot Token is missing" });
    }

    const activeChats = await getRegisteredChats();
    // Filter to group chats that are not blacklisted
    const targetChats = activeChats.filter(
      (c) => (c.type === "group" || c.type === "supergroup") && !settings.blacklistedChatIds?.includes(c.chatId)
    );

    if (targetChats.length === 0) {
      return NextResponse.json({
        ok: true,
        message: "No registered group chats found to send check-in to.",
      });
    }

    // Pick check-in prompt based on current time or query param
    const url = new URL(req.url);
    const specificCheckinId = url.searchParams.get("checkinId");
    
    let activeCheckin = settings.checkins?.find((c) => c.enabled && (specificCheckinId ? c.id === specificCheckinId : true));
    if (!activeCheckin) {
      activeCheckin = {
        id: "default",
        name: "Спонтанный чек-ин",
        time: "now",
        promptHint: "Поздоровайся с чатом в стиле Артёма, спроси как дела или вбрось смешной вопрос.",
        enabled: true,
      };
    }

    const results: Array<{ chatId: number; title: string; text: string; success: boolean }> = [];

    for (const chat of targetChats) {
      try {
        const messageText = await generateCheckinMessage(
          activeCheckin.promptHint,
          chat.title,
          settings
        );

        await sendTelegramMessage(token, chat.chatId, messageText);

        await addLog({
          chatId: chat.chatId,
          chatTitle: chat.title,
          chatType: chat.type as any,
          senderName: "Артём (Авто-чекин)",
          userMessage: `[Чек-ин: ${activeCheckin.name}]`,
          botReply: messageText,
          triggerType: "cron_checkin",
        });

        results.push({
          chatId: chat.chatId,
          title: chat.title,
          text: messageText,
          success: true,
        });
      } catch (err: any) {
        console.error(`Error sending checkin to chat ${chat.chatId}:`, err);
        results.push({
          chatId: chat.chatId,
          title: chat.title,
          text: err.message,
          success: false,
        });
      }
    }

    return NextResponse.json({
      ok: true,
      checkin: activeCheckin.name,
      sentTo: results,
    });
  } catch (error: any) {
    console.error("Cron execution error:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

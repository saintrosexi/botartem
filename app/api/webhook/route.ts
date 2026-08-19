import { NextRequest, NextResponse } from "next/server";
import { getSettings, addLog, getLogs } from "@/lib/storage";
import { generateArtemReply, ContextMessage } from "@/lib/gemini";
import {
  TelegramUpdate,
  evaluateTriggerType,
  sendTelegramMessage,
  sendTypingAction,
  getBotInfo,
} from "@/lib/telegram";

export const maxDuration = 30; // 30 seconds for serverless LLM generation

export async function POST(req: NextRequest) {
  try {
    const settings = await getSettings();
    const token = settings.telegramToken || process.env.TELEGRAM_BOT_TOKEN;

    if (!token) {
      console.warn("Telegram webhook received update, but TELEGRAM_BOT_TOKEN is not configured.");
      return NextResponse.json({ ok: false, error: "Bot token not configured" }, { status: 200 });
    }

    // Parse incoming payload
    const body: TelegramUpdate = await req.json();
    const message = body.message || body.edited_message;

    if (!message || !message.text) {
      // Not a text message (e.g. joined group, photo, sticker)
      return NextResponse.json({ ok: true, ignored: "no_text" });
    }

    const chatId = message.chat.id;
    const isGroup = message.chat.type === "group" || message.chat.type === "supergroup";
    const senderName = [message.from?.first_name, message.from?.last_name].filter(Boolean).join(" ") || message.from?.username || "Челик";
    const userText = message.text;

    // Check blacklist / whitelist
    if (settings.blacklistedChatIds?.includes(chatId)) {
      return NextResponse.json({ ok: true, ignored: "blacklisted" });
    }
    if (settings.allowedChatIds?.length > 0 && !settings.allowedChatIds.includes(chatId)) {
      return NextResponse.json({ ok: true, ignored: "not_whitelisted" });
    }

    // Get bot username if possible for mention detection
    let botUsername = "artem_bot";
    try {
      const botInfo = await getBotInfo(token);
      if (botInfo.username) {
        botUsername = botInfo.username;
      }
    } catch {
      // ignore
    }

    // Evaluate trigger
    const { shouldReply, triggerType } = evaluateTriggerType(
      message,
      botUsername,
      settings.triggerKeywords || ["артём", "артем", "тёма", "artem", "артёмка", "артемка", "артемий", "тёмик", "темик"],
      isGroup ? (Number(settings.randomReplyChance) || 0) : 100
    );

    if (!shouldReply || !triggerType) {
      // Just record user message to logs so Artem has context if mentioned later
      await addLog({
        chatId,
        chatTitle: message.chat.title,
        chatType: message.chat.type,
        senderName,
        senderUsername: message.from?.username,
        userMessage: userText,
        triggerType: "direct",
      });
      return NextResponse.json({ ok: true, ignored: "not_triggered" });
    }

    // Send typing action to Telegram
    await sendTypingAction(token, chatId);

    // Build context history from previous logs of this chat
    const allLogs = await getLogs();
    const chatLogs = allLogs
      .filter((l) => l.chatId === chatId)
      .slice(0, settings.maxContextMessages || 10)
      .reverse();

    const context: ContextMessage[] = chatLogs.map((l) => ({
      senderName: l.senderName,
      text: l.userMessage,
      isBot: false,
    }));

    // Generate Artem's reply via Gemini
    const isReplyToBot = message.reply_to_message?.from?.is_bot || false;
    const botReply = await generateArtemReply(
      context,
      {
        senderName,
        text: userText,
        isReplyToBot,
        isGroup,
      },
      settings
    );

    // If Gemini decided Artem should stay silent in this group context
    if (!botReply || botReply.includes("[SILENT]") || botReply.includes("[SKIP]")) {
      return NextResponse.json({ ok: true, ignored: "silent_decision" });
    }

    // Send reply back to Telegram
    // In group, if it was a direct reply or keyword, we can reply directly to the message
    const replyToId = isGroup ? message.message_id : undefined;
    await sendTelegramMessage(token, chatId, botReply, replyToId);

    // Save interaction in logs
    await addLog({
      chatId,
      chatTitle: message.chat.title,
      chatType: message.chat.type,
      senderName,
      senderUsername: message.from?.username,
      userMessage: userText,
      botReply,
      triggerType,
    });

    return NextResponse.json({ ok: true, reply: botReply });
  } catch (error: any) {
    console.error("Webhook processing error:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 200 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: "online",
    bot: "Артём Telegram Bot Webhook endpoint is active and listening for updates.",
  });
}

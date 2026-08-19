import { NextRequest, NextResponse } from "next/server";
import { getSettings } from "@/lib/storage";
import {
  getBotInfo,
  getWebhookInfo,
  setTelegramWebhook,
  deleteTelegramWebhook,
  sendTelegramMessage,
} from "@/lib/telegram";

export async function GET() {
  try {
    const settings = await getSettings();
    const token = settings.telegramToken || process.env.TELEGRAM_BOT_TOKEN;

    if (!token) {
      return NextResponse.json({
        ok: false,
        configured: false,
        error: "Токен Telegram бота не указан",
      });
    }

    const botInfo = await getBotInfo(token);
    const webhookInfo = await getWebhookInfo(token);

    return NextResponse.json({
      ok: true,
      configured: true,
      bot: botInfo,
      webhook: webhookInfo,
    });
  } catch (error: any) {
    return NextResponse.json({
      ok: false,
      configured: false,
      error: error.message || "Ошибка подключения к Telegram Bot API",
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const settings = await getSettings();
    const token = settings.telegramToken || process.env.TELEGRAM_BOT_TOKEN;

    if (!token) {
      return NextResponse.json({ ok: false, error: "Токен Telegram бота не задан" }, { status: 400 });
    }

    const action = body.action;

    if (action === "setWebhook") {
      const webhookUrl = body.webhookUrl;
      if (!webhookUrl) {
        return NextResponse.json({ ok: false, error: "URL вебхука обязателен" }, { status: 400 });
      }
      const secretToken = process.env.TELEGRAM_SECRET_TOKEN;
      const res = await setTelegramWebhook(token, webhookUrl, secretToken);
      return NextResponse.json({ ok: true, result: res });
    }

    if (action === "deleteWebhook") {
      const res = await deleteTelegramWebhook(token);
      return NextResponse.json({ ok: true, result: res });
    }

    if (action === "testMessage") {
      const chatId = body.chatId;
      const text = body.text || "Здорово! Это тестовое сообщение от Артёма ✌️";
      if (!chatId) {
        return NextResponse.json({ ok: false, error: "chatId обязателен" }, { status: 400 });
      }
      const res = await sendTelegramMessage(token, Number(chatId), text);
      return NextResponse.json({ ok: true, result: res });
    }

    return NextResponse.json({ ok: false, error: "Неизвестное действие" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getSettings } from "@/lib/storage";
import { testGeminiApiKey } from "@/lib/gemini";
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
        error: "Токен Telegram бота не настроен",
        bot: null,
        webhook: null,
      });
    }

    const [botInfo, webhookInfo] = await Promise.allSettled([
      getBotInfo(token),
      getWebhookInfo(token),
    ]);

    return NextResponse.json({
      ok: true,
      bot: botInfo.status === "fulfilled" ? botInfo.value : null,
      webhook: webhookInfo.status === "fulfilled" ? webhookInfo.value : null,
      botError: botInfo.status === "rejected" ? botInfo.reason.message : null,
      webhookError: webhookInfo.status === "rejected" ? webhookInfo.reason.message : null,
    });
  } catch (error: any) {
    return NextResponse.json({
      ok: false,
      error: error.message,
      bot: null,
      webhook: null,
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const settings = await getSettings();
    const action = body.action;

    if (action === "testGeminiKey") {
      const apiKey = body.apiKey || settings.geminiApiKey || process.env.GEMINI_API_KEY;
      const model = body.model || settings.model || "gemini-2.0-flash";
      const result = await testGeminiApiKey(apiKey, model);
      return NextResponse.json(result);
    }

    const token = settings.telegramToken || process.env.TELEGRAM_BOT_TOKEN;

    if (!token) {
      return NextResponse.json({ ok: false, error: "Токен Telegram бота не задан" }, { status: 400 });
    }

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

    if (action === "reloadBot") {
      const botInfo = await getBotInfo(token);
      const webhookInfo = await getWebhookInfo(token);
      return NextResponse.json({
        ok: true,
        message: "Бот успешно перезагружен и синхронизирован!",
        bot: botInfo,
        webhook: webhookInfo,
      });
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

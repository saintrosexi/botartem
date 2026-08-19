export interface TelegramUser {
  id: number;
  is_bot: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
}

export interface TelegramChat {
  id: number;
  type: "private" | "group" | "supergroup" | "channel";
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
}

export interface TelegramMessage {
  message_id: number;
  from?: TelegramUser;
  chat: TelegramChat;
  date: number;
  text?: string;
  reply_to_message?: TelegramMessage;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  edited_message?: TelegramMessage;
}

const TG_API_BASE = "https://api.telegram.org";

export async function getBotInfo(token: string) {
  const res = await fetch(`${TG_API_BASE}/bot${token}/getMe`);
  if (!res.ok) {
    const error = await res.json().catch(() => ({ description: res.statusText }));
    throw new Error(error.description || "Failed to fetch bot info");
  }
  const data = await res.json();
  return data.result as TelegramUser;
}

export async function sendTelegramMessage(
  token: string,
  chatId: number,
  text: string,
  replyToMessageId?: number
) {
  const payload: Record<string, any> = {
    chat_id: chatId,
    text,
  };
  if (replyToMessageId) {
    payload.reply_to_message_id = replyToMessageId;
  }

  const res = await fetch(`${TG_API_BASE}/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ description: res.statusText }));
    throw new Error(error.description || "Failed to send message");
  }
  return await res.json();
}

export async function sendTypingAction(token: string, chatId: number) {
  try {
    await fetch(`${TG_API_BASE}/bot${token}/sendChatAction`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, action: "typing" }),
    });
  } catch {
    // Ignore typing indicator errors
  }
}

export async function setTelegramWebhook(
  token: string,
  webhookUrl: string,
  secretToken?: string
) {
  const payload: Record<string, any> = {
    url: webhookUrl,
    allowed_updates: ["message", "edited_message"],
  };
  if (secretToken) {
    payload.secret_token = secretToken;
  }

  const res = await fetch(`${TG_API_BASE}/bot${token}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok || !data.ok) {
    throw new Error(data.description || "Failed to set webhook");
  }
  return data;
}

export async function getWebhookInfo(token: string) {
  const res = await fetch(`${TG_API_BASE}/bot${token}/getWebhookInfo`);
  if (!res.ok) {
    throw new Error("Failed to get webhook info");
  }
  const data = await res.json();
  return data.result;
}

export async function deleteTelegramWebhook(token: string) {
  const res = await fetch(`${TG_API_BASE}/bot${token}/deleteWebhook`);
  const data = await res.json();
  return data;
}

export function evaluateTriggerType(
  message: TelegramMessage,
  botUsername: string,
  keywords: string[],
  randomChancePercent: number
): {
  shouldReply: boolean;
  triggerType: "direct" | "mention" | "name_keyword" | "reply" | "random_burst" | null;
} {
  const text = (message.text || "").toLowerCase();
  const isPrivate = message.chat.type === "private";

  // 1. Direct message in PM
  if (isPrivate) {
    return { shouldReply: true, triggerType: "direct" };
  }

  // 2. Reply to bot's message
  if (
    message.reply_to_message &&
    message.reply_to_message.from &&
    (message.reply_to_message.from.is_bot ||
      (botUsername && message.reply_to_message.from.username?.toLowerCase() === botUsername.toLowerCase()))
  ) {
    return { shouldReply: true, triggerType: "reply" };
  }

  // 3. Mention by @username
  if (botUsername && text.includes(`@${botUsername.toLowerCase()}`)) {
    return { shouldReply: true, triggerType: "mention" };
  }

  // 4. Keyword check ("артём", "артем", "тёма", "тема", "artem", etc.)
  // Use regex word boundary check so "математика" doesn't trigger on "тема"
  for (const kw of keywords) {
    const cleanKw = kw.trim().toLowerCase();
    if (!cleanKw) continue;
    
    // Check if word appears as a standalone word or with punctuation
    const escaped = cleanKw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(^|[^a-zA-Zа-яА-ЯёЁ0-9])${escaped}([^a-zA-Zа-яА-ЯёЁ0-9]|$)`, "i");
    if (regex.test(text)) {
      return { shouldReply: true, triggerType: "name_keyword" };
    }
  }

  // 5. Random chance in active group conversation
  if (randomChancePercent > 0 && Math.random() * 100 < randomChancePercent) {
    return { shouldReply: true, triggerType: "random_burst" };
  }

  return { shouldReply: false, triggerType: null };
}

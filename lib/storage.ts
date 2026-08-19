import { BotSettings, LogEntry, ChatMetadata } from "./types";
import { DEFAULT_SYSTEM_PROMPT, DEFAULT_CHECKINS } from "./default-prompt";

// Default settings object
const initialSettings: BotSettings = {
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
  temperature: 0.95,
  model: "gemini-3.6-flash",
  botName: "Артём",
  triggerKeywords: ["артём", "артем", "тёма", "тема", "artem", "артёмка", "артемка"],
  randomReplyChance: 8, // 8% chance to chime into active chat unprovoked
  sarcasmLevel: 4,
  takeSidesInArguments: true,
  maxContextMessages: 15,
  checkins: DEFAULT_CHECKINS,
  allowedChatIds: [],
  blacklistedChatIds: [],
  telegramToken: process.env.TELEGRAM_BOT_TOKEN || "",
  geminiApiKey: process.env.GEMINI_API_KEY || "",
  adminPassword: process.env.ADMIN_PASSWORD || "artem123",
  webhookUrl: process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL}/api/webhook` : "",
};

// Global in-memory storage fallback
declare global {
  // eslint-disable-next-line no-var
  var __ARTEM_SETTINGS__: BotSettings | undefined;
  // eslint-disable-next-line no-var
  var __ARTEM_LOGS__: LogEntry[] | undefined;
  // eslint-disable-next-line no-var
  var __ARTEM_CHATS__: Record<string, ChatMetadata> | undefined;
}

if (!global.__ARTEM_SETTINGS__) {
  global.__ARTEM_SETTINGS__ = { ...initialSettings };
}
if (!global.__ARTEM_LOGS__) {
  global.__ARTEM_LOGS__ = [];
}
if (!global.__ARTEM_CHATS__) {
  global.__ARTEM_CHATS__ = {};
}

// Check for Upstash / Vercel KV REST API
const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

async function kvGet<T>(key: string): Promise<T | null> {
  if (!KV_URL || !KV_TOKEN) return null;
  try {
    const res = await fetch(`${KV_URL}/get/${key}`, {
      headers: { Authorization: `Bearer ${KV_TOKEN}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.result) return null;
    return typeof data.result === "string" ? JSON.parse(data.result) : data.result;
  } catch (e) {
    console.error(`KV GET error for key ${key}:`, e);
    return null;
  }
}

async function kvSet<T>(key: string, value: T): Promise<boolean> {
  if (!KV_URL || !KV_TOKEN) return false;
  try {
    const res = await fetch(`${KV_URL}/set/${key}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${KV_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(JSON.stringify(value)),
    });
    return res.ok;
  } catch (e) {
    console.error(`KV SET error for key ${key}:`, e);
    return false;
  }
}

export async function getSettings(): Promise<BotSettings> {
  // Try remote KV if available
  const remote = await kvGet<Partial<BotSettings>>("artem_settings");
  if (remote) {
    global.__ARTEM_SETTINGS__ = {
      ...initialSettings,
      ...global.__ARTEM_SETTINGS__,
      ...remote,
      // fallback to env if remote token is empty
      telegramToken: remote.telegramToken || process.env.TELEGRAM_BOT_TOKEN || global.__ARTEM_SETTINGS__?.telegramToken || "",
      geminiApiKey: remote.geminiApiKey || process.env.GEMINI_API_KEY || global.__ARTEM_SETTINGS__?.geminiApiKey || "",
      adminPassword: remote.adminPassword || process.env.ADMIN_PASSWORD || global.__ARTEM_SETTINGS__?.adminPassword || "artem123",
    };
  }

  // Ensure default tokens from env if not set
  if (!global.__ARTEM_SETTINGS__!.telegramToken && process.env.TELEGRAM_BOT_TOKEN) {
    global.__ARTEM_SETTINGS__!.telegramToken = process.env.TELEGRAM_BOT_TOKEN;
  }
  if (!global.__ARTEM_SETTINGS__!.geminiApiKey && process.env.GEMINI_API_KEY) {
    global.__ARTEM_SETTINGS__!.geminiApiKey = process.env.GEMINI_API_KEY;
  }
  if (!global.__ARTEM_SETTINGS__!.adminPassword && process.env.ADMIN_PASSWORD) {
    global.__ARTEM_SETTINGS__!.adminPassword = process.env.ADMIN_PASSWORD;
  }

  return global.__ARTEM_SETTINGS__!;
}

export async function updateSettings(newSettings: Partial<BotSettings>): Promise<BotSettings> {
  const current = await getSettings();
  const updated: BotSettings = {
    ...current,
    ...newSettings,
  };
  global.__ARTEM_SETTINGS__ = updated;

  await kvSet("artem_settings", updated);
  return updated;
}

export async function addLog(entry: Omit<LogEntry, "id" | "timestamp">): Promise<void> {
  const newEntry: LogEntry = {
    ...entry,
    id: Math.random().toString(36).substring(2, 9),
    timestamp: Date.now(),
  };

  if (!global.__ARTEM_LOGS__) global.__ARTEM_LOGS__ = [];
  global.__ARTEM_LOGS__.unshift(newEntry);
  if (global.__ARTEM_LOGS__.length > 150) {
    global.__ARTEM_LOGS__ = global.__ARTEM_LOGS__.slice(0, 150);
  }

  // Register chat metadata
  if (!global.__ARTEM_CHATS__) global.__ARTEM_CHATS__ = {};
  const chatIdStr = entry.chatId.toString();
  const existingChat = global.__ARTEM_CHATS__[chatIdStr];
  global.__ARTEM_CHATS__[chatIdStr] = {
    chatId: entry.chatId,
    title: entry.chatTitle || (entry.chatType === "private" ? entry.senderName : `Chat ${entry.chatId}`),
    type: entry.chatType,
    lastActive: Date.now(),
    messageCount: (existingChat?.messageCount || 0) + 1,
  };

  // Sync to KV asynchronously
  kvSet("artem_logs", global.__ARTEM_LOGS__.slice(0, 50)).catch(() => {});
  kvSet("artem_chats", global.__ARTEM_CHATS__).catch(() => {});
}

export async function getLogs(): Promise<LogEntry[]> {
  const remote = await kvGet<LogEntry[]>("artem_logs");
  if (remote && Array.isArray(remote)) {
    return remote;
  }
  return global.__ARTEM_LOGS__ || [];
}

export async function getRegisteredChats(): Promise<ChatMetadata[]> {
  const remote = await kvGet<Record<string, ChatMetadata>>("artem_chats");
  if (remote) {
    return Object.values(remote).sort((a, b) => b.lastActive - a.lastActive);
  }
  return Object.values(global.__ARTEM_CHATS__ || {}).sort((a, b) => b.lastActive - a.lastActive);
}

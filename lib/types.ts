export interface CheckinSchedule {
  id: string;
  name: string;
  time: string; // "09:00", "14:00", "20:00" etc.
  promptHint: string;
  enabled: boolean;
  targetChats?: number[]; // Empty means all registered group chats
}

export interface BotSettings {
  systemPrompt: string;
  temperature: number; // 0.0 to 2.0 (default ~0.95 for lively chat)
  model: string; // e.g. "gemini-2.5-flash", "gemini-1.5-flash", "gemini-2.5-pro"
  botName: string;
  triggerKeywords: string[];
  randomReplyChance: number; // 0 to 100 (%)
  sarcasmLevel: number; // 1 to 5
  takeSidesInArguments: boolean;
  maxContextMessages: number; // default 15
  checkins: CheckinSchedule[];
  allowedChatIds: number[];
  blacklistedChatIds: number[];
  telegramToken?: string;
  geminiApiKey?: string;
  adminPassword?: string;
  webhookUrl?: string;
}

export interface LogEntry {
  id: string;
  timestamp: number;
  chatId: number;
  chatTitle?: string;
  chatType: "private" | "group" | "supergroup" | "channel";
  senderName: string;
  senderUsername?: string;
  userMessage: string;
  botReply?: string;
  isError?: boolean;
  errorMessage?: string;
  triggerType: "direct" | "mention" | "name_keyword" | "reply" | "random_burst" | "cron_checkin" | "manual_test";
}

export interface ChatMetadata {
  chatId: number;
  title: string;
  type: string;
  lastActive: number;
  messageCount: number;
}

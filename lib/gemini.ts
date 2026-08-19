import { BotSettings } from "./types";

export interface ContextMessage {
  senderName: string;
  text: string;
  isBot?: boolean;
}

const FALLBACK_MODELS = [
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-3-flash",
  "gemini-2.5-flash",
  "gemini-1.5-flash",
];

async function callGeminiApi(
  model: string,
  apiKey: string,
  payload: any
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text();
    const err = new Error(`Gemini API error (${response.status}): ${errText}`);
    (err as any).status = response.status;
    (err as any).errorBody = errText;
    throw err;
  }

  const data = await response.json();
  const candidate = data.candidates?.[0];
  const replyText = candidate?.content?.parts?.[0]?.text || "";
  return cleanArtemOutput(replyText);
}

export async function generateArtemReply(
  context: ContextMessage[],
  incomingMessage: { senderName: string; text: string; isReplyToBot?: boolean; isGroup?: boolean },
  settings: BotSettings
): Promise<string> {
  const apiKey = settings.geminiApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Gemini API key is not configured. Please set it in the Admin Dashboard or .env file.");
  }

  const requestedModel = settings.model || "gemini-3.6-flash";

  // Build the complete system prompt with dynamic personality adjustments
  let enhancedSystemPrompt = settings.systemPrompt;
  enhancedSystemPrompt += `\n\nДОПОЛНИТЕЛЬНЫЕ ПАРАМЕТРЫ ПОВЕДЕНИЯ:
- Уровень сарказма: ${settings.sarcasmLevel}/5 (1 = милый и добрый, 5 = едкий, колкий юмор).
- Занимать сторону в спорах: ${settings.takeSidesInArguments ? "ДА, обязательно выбирай фаворита и аргументируй с подколом!" : "нейтрально"}.
- Текущий контекст: ${incomingMessage.isGroup ? "Групповой чат (беседа)" : "Личные сообщения (ЛС)"}.
- Имя собеседника, написавшего последнее сообщение: "${incomingMessage.senderName}".
- Помни: ты обычный парень Артём, отвечай кратко, живо, емко, без нейросетевых клише и официоза.`;

  // Build conversation history format
  let promptBody = "";
  if (context.length > 0) {
    promptBody += "--- Последние сообщения в чате (контекст):\n";
    for (const msg of context.slice(-settings.maxContextMessages)) {
      if (msg.isBot) {
        promptBody += `Артём: ${msg.text}\n`;
      } else {
        promptBody += `${msg.senderName}: ${msg.text}\n`;
      }
    }
    promptBody += "---\n\n";
  }

  promptBody += `Сообщение от ${incomingMessage.senderName}: "${incomingMessage.text}"\n`;
  if (incomingMessage.isReplyToBot) {
    promptBody += `(Это сообщение является ответом на твою предыдущую реплику)\n`;
  }
  promptBody += `\nТвой ответ (как Артём):`;

  const payload = {
    contents: [
      {
        role: "user",
        parts: [{ text: promptBody }],
      },
    ],
    systemInstruction: {
      parts: [{ text: enhancedSystemPrompt }],
    },
    generationConfig: {
      temperature: Math.min(Math.max(Number(settings.temperature) || 0.95, 0.0), 2.0),
      maxOutputTokens: 600,
      topP: 0.95,
    },
  };

  // Try requested model first, then fallback models in order
  const modelsToTry = [
    requestedModel,
    ...FALLBACK_MODELS.filter((m) => m !== requestedModel),
  ];

  let lastError: any = null;
  for (const model of modelsToTry) {
    try {
      return await callGeminiApi(model, apiKey, payload);
    } catch (err: any) {
      lastError = err;
      if (err.status === 404 || err.status === 400) {
        console.warn(`Model ${model} failed (${err.status}), attempting fallback...`);
        continue;
      }
      // If it's auth/quota error (401, 403, 429), throw immediately
      throw err;
    }
  }

  throw lastError;
}

export async function generateCheckinMessage(
  promptHint: string,
  chatTitle: string,
  settings: BotSettings
): Promise<string> {
  const apiKey = settings.geminiApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Gemini API key is not configured");

  const requestedModel = settings.model || "gemini-3.6-flash";
  const systemPrompt = settings.systemPrompt + `\n\nЗадача: написать спонтанное живое сообщение в чат "${chatTitle}" от лица Артёма. 1-2 предложения, строго в характере (строчные буквы, разговорный стиль).`;

  const payload = {
    contents: [
      {
        role: "user",
        parts: [{ text: `Тематика чек-ина: ${promptHint}\nНапиши короткую реплику в чат:` }],
      },
    ],
    systemInstruction: {
      parts: [{ text: systemPrompt }],
    },
    generationConfig: {
      temperature: Math.min(Math.max(Number(settings.temperature) || 1.0, 0.0), 2.0),
      maxOutputTokens: 250,
    },
  };

  const modelsToTry = [
    requestedModel,
    ...FALLBACK_MODELS.filter((m) => m !== requestedModel),
  ];

  let lastError: any = null;
  for (const model of modelsToTry) {
    try {
      return await callGeminiApi(model, apiKey, payload);
    } catch (err: any) {
      lastError = err;
      if (err.status === 404 || err.status === 400) {
        continue;
      }
      throw err;
    }
  }

  throw lastError;
}

function cleanArtemOutput(text: string): string {
  let cleaned = text.trim();
  // Strip accidental prefixes like "Артём: " or "Артем:"
  cleaned = cleaned.replace(/^арт[её]м:\s*/i, "");
  // Strip quotes if the LLM wrapped everything in quotes
  if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
    cleaned = cleaned.slice(1, -1).trim();
  }
  return cleaned;
}

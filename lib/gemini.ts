import { GoogleGenerativeAI } from "@google/generative-ai";
import { BotSettings } from "./types";

export interface ContextMessage {
  senderName: string;
  text: string;
  isBot?: boolean;
}

const DEFAULT_FALLBACK_MODELS = [
  "gemini-3.6-flash",
  "gemini-3.6-pro",
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
  "gemini-1.5-pro",
];

export async function getDynamicModels(apiKey: string): Promise<string[]> {
  try {
    const cleanKey = (apiKey || "").trim();
    if (!cleanKey) return DEFAULT_FALLBACK_MODELS;

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${cleanKey}`);
    if (res.ok) {
      const data = await res.json();
      const list = (data.models || [])
        .filter((m: any) => m.supportedGenerationMethods?.includes("generateContent"))
        .map((m: any) => m.name.replace(/^models\//, ""));
      if (list.length > 0) {
        return list;
      }
    }
  } catch (e) {
    console.warn("Could not fetch dynamic models from Google, using default list:", e);
  }
  return DEFAULT_FALLBACK_MODELS;
}

async function callSdkGenerate(
  modelName: string,
  apiKey: string,
  systemInstructionText: string,
  promptBody: string,
  temperature: number
): Promise<string> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: systemInstructionText,
    generationConfig: {
      temperature: Math.min(Math.max(temperature || 0.95, 0.0), 2.0),
      maxOutputTokens: 2048,
      responseMimeType: "application/json",
    },
  });

  const result = await model.generateContent(promptBody);
  const response = await result.response;
  const text = response.text();
  return extractJsonReply(text);
}

async function callDirectRestApi(
  modelName: string,
  apiKey: string,
  payload: any
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelName)}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text();
    const err = new Error(`Gemini API (${modelName} status ${response.status}): ${errText}`);
    (err as any).status = response.status;
    (err as any).errorBody = errText;
    throw err;
  }

  const data = await response.json();
  const candidate = data.candidates?.[0];
  const replyText = candidate?.content?.parts?.[0]?.text || "";
  return extractJsonReply(replyText);
}

export async function generateArtemReply(
  context: ContextMessage[],
  incomingMessage: { senderName: string; text: string; isReplyToBot?: boolean; isGroup?: boolean },
  settings: BotSettings
): Promise<string> {
  const apiKey = (settings.geminiApiKey || process.env.GEMINI_API_KEY || "").trim();
  if (!apiKey) {
    throw new Error("API ключ Gemini не настроен. Укажите его в панели управления или в .env файле.");
  }

  const requestedModel = (settings.model || "gemini-3.6-flash").trim();

  // System prompt and context with JSON enforcement
  let systemInstructionText = settings.systemPrompt;
  systemInstructionText += `\n\n[СТРОГИЙ ФОРМАТ ВЫВОДА - ТОЛЬКО JSON]:
- Ответ ОБЯЗАТЕЛЬНО должен быть валидным JSON-объектом в формате: {"reply": "текст реплики Артёма"}
- В поле "reply" запиши ТОЛЬКО саму итоговую реплику Артёма для отправки в чат (без лишних кавычек, без мыслей, без дублирования).
- Если отвечать в беседе сейчас неуместно, верни: {"reply": "[SILENT]"}
- Контекст: ${incomingMessage.isGroup ? "Групповой чат" : "Личные сообщения (ЛС)"}, собеседник: "${incomingMessage.senderName}".`;

  // Format conversation history
  let promptBody = "";
  if (context.length > 0) {
    promptBody += "--- История последних сообщений в чате:\n";
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
    promptBody += `(Это ответ на твою предыдущую реплику)\n`;
  }
  promptBody += `\nСформируй JSON-ответ {"reply": "..."}:`;

  // Query dynamic available models
  const dynamicList = await getDynamicModels(apiKey);
  const modelsToTry = [
    requestedModel,
    ...dynamicList.filter((m) => m !== requestedModel),
    ...DEFAULT_FALLBACK_MODELS.filter((m) => m !== requestedModel && !dynamicList.includes(m)),
  ];

  let lastError: any = null;

  for (const modelName of modelsToTry) {
    try {
      // 1. Try via official SDK
      return await callSdkGenerate(
        modelName,
        apiKey,
        systemInstructionText,
        promptBody,
        Number(settings.temperature) || 0.95
      );
    } catch (sdkError: any) {
      console.warn(`SDK attempt for ${modelName} failed (${sdkError.message}), trying REST endpoint...`);
      lastError = sdkError;
      
      // 2. Fallback to direct REST call
      try {
        const payload = {
          contents: [{ role: "user", parts: [{ text: promptBody }] }],
          systemInstruction: { parts: [{ text: systemInstructionText }] },
          generationConfig: {
            temperature: Math.min(Math.max(Number(settings.temperature) || 0.95, 0.0), 2.0),
            maxOutputTokens: 2048,
            responseMimeType: "application/json",
          },
        };
        return await callDirectRestApi(modelName, apiKey, payload);
      } catch (restError: any) {
        console.warn(`REST attempt for ${modelName} failed (${restError.message})`);
        lastError = restError;
        continue;
      }
    }
  }

  throw lastError || new Error("Не удалось получить ответ от моделей Gemini");
}

export async function testGeminiApiKey(
  apiKey: string,
  modelName: string = "gemini-3.6-flash"
): Promise<{ ok: boolean; modelUsed: string; reply: string; durationMs: number; error?: string; availableModels?: string[] }> {
  const cleanKey = apiKey.trim();
  if (!cleanKey) {
    return { ok: false, modelUsed: modelName, reply: "", durationMs: 0, error: "Ключ API пуст" };
  }

  const startTime = Date.now();
  const testPrompt = 'Верни JSON в формате {"reply": "Работает"}';

  const dynamicList = await getDynamicModels(cleanKey);
  const modelsToTry = [
    modelName,
    ...dynamicList.filter((m) => m !== modelName),
    ...DEFAULT_FALLBACK_MODELS.filter((m) => m !== modelName && !dynamicList.includes(m)),
  ];

  let lastErrorMsg = "";
  for (const m of modelsToTry) {
    try {
      const res = await callSdkGenerate(
        m,
        cleanKey,
        'Ты тестовый бот. Верни только JSON {"reply": "Работает"}',
        testPrompt,
        0.5
      );
      const durationMs = Date.now() - startTime;
      return { ok: true, modelUsed: m, reply: res, durationMs, availableModels: dynamicList };
    } catch (e: any) {
      lastErrorMsg = e.message;
      try {
        const payload = {
          contents: [{ role: "user", parts: [{ text: testPrompt }] }],
          generationConfig: { maxOutputTokens: 100, responseMimeType: "application/json" },
        };
        const res = await callDirectRestApi(m, cleanKey, payload);
        const durationMs = Date.now() - startTime;
        return { ok: true, modelUsed: m, reply: res, durationMs, availableModels: dynamicList };
      } catch (e2: any) {
        lastErrorMsg = e2.message;
      }
    }
  }

  return {
    ok: false,
    modelUsed: modelName,
    reply: "",
    durationMs: Date.now() - startTime,
    error: lastErrorMsg,
    availableModels: dynamicList,
  };
}

export async function generateCheckinMessage(
  promptHint: string,
  chatTitle: string,
  settings: BotSettings
): Promise<string> {
  const apiKey = (settings.geminiApiKey || process.env.GEMINI_API_KEY || "").trim();
  if (!apiKey) throw new Error("Gemini API key is not configured");

  const requestedModel = settings.model || "gemini-3.6-flash";
  const systemPrompt = settings.systemPrompt + `\n\nЗадача: написать спонтанное живое сообщение в чат "${chatTitle}" от лица Артёма. 1-2 предложения, строго в формате JSON {"reply": "..."}`;
  const promptBody = `Тематика чек-ина: ${promptHint}\nВерни JSON {"reply": "..."}:`;

  const dynamicList = await getDynamicModels(apiKey);
  const modelsToTry = [
    requestedModel,
    ...dynamicList.filter((m) => m !== requestedModel),
    ...DEFAULT_FALLBACK_MODELS.filter((m) => m !== requestedModel && !dynamicList.includes(m)),
  ];

  let lastError: any = null;
  for (const m of modelsToTry) {
    try {
      return await callSdkGenerate(
        m,
        apiKey,
        systemPrompt,
        promptBody,
        Number(settings.temperature) || 1.0
      );
    } catch (err: any) {
      lastError = err;
    }
  }

  throw lastError;
}

function extractJsonReply(rawText: string): string {
  let text = rawText.trim();
  // Strip markdown code blocks
  text = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed.reply === "string") {
      return cleanArtemOutput(parsed.reply);
    }
  } catch {}

  const replyMatch = text.match(/"reply"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (replyMatch) {
    try {
      const unescaped = JSON.parse(`"${replyMatch[1]}"`);
      return cleanArtemOutput(unescaped);
    } catch {
      return cleanArtemOutput(replyMatch[1]);
    }
  }

  return cleanArtemOutput(text);
}

function cleanArtemOutput(text: string): string {
  let cleaned = text.trim();

  // Strip XML/HTML thought tags
  cleaned = cleaned.replace(/<thought[\s\S]*?<\/thought>/gi, "").trim();
  cleaned = cleaned.replace(/<think[\s\S]*?<\/think>/gi, "").trim();

  // Strip accidental outer quotes
  cleaned = cleaned.replace(/^["'«»]+|["'«»]+$/g, "").trim();

  // Strip prefixes
  cleaned = cleaned.replace(/^(арт[её]м|artem|ответ|реплика):\s*/i, "").trim();
  cleaned = cleaned.replace(/^["'«»]+|["'«»]+$/g, "").trim();

  return cleaned;
}

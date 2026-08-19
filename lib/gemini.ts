import { BotSettings } from "./types";

export interface ContextMessage {
  senderName: string;
  text: string;
  isBot?: boolean;
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

  // Model name (default to gemini-2.5-flash or gemini-1.5-flash)
  const modelName = settings.model || "gemini-2.5-flash";

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

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelName)}:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      // If gemini-2.5-flash is not yet accessible on specific endpoint or key, try falling back to gemini-1.5-flash
      if (modelName !== "gemini-1.5-flash" && (response.status === 404 || response.status === 400)) {
        console.warn(`Model ${modelName} returned ${response.status}, retrying with gemini-1.5-flash...`);
        const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
        const fallbackRes = await fetch(fallbackUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (fallbackRes.ok) {
          const fallbackData = await fallbackRes.json();
          const replyText = fallbackData.candidates?.[0]?.content?.parts?.[0]?.text || "";
          return cleanArtemOutput(replyText);
        }
      }
      throw new Error(`Gemini API error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    const replyText = candidate?.content?.parts?.[0]?.text || "";

    return cleanArtemOutput(replyText);
  } catch (error: any) {
    console.error("Error generating Gemini response:", error);
    throw error;
  }
}

export async function generateCheckinMessage(
  promptHint: string,
  chatTitle: string,
  settings: BotSettings
): Promise<string> {
  const apiKey = settings.geminiApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Gemini API key is not configured");

  const modelName = settings.model || "gemini-2.5-flash";
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

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelName)}:generateContent?key=${apiKey}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    // fallback
    const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const fbRes = await fetch(fallbackUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (fbRes.ok) {
      const fbData = await fbRes.json();
      return cleanArtemOutput(fbData.candidates?.[0]?.content?.parts?.[0]?.text || "ну че как вы тут");
    }
    throw new Error(`Failed to generate check-in: ${await response.text()}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  return cleanArtemOutput(text);
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

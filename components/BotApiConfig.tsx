"use client";

import React, { useState } from "react";
import { BotSettings } from "@/lib/types";
import { Key, Bot, Globe, Shield, CheckCircle2, AlertCircle, RefreshCw, Trash2, ExternalLink } from "lucide-react";

interface BotApiConfigProps {
  settings: BotSettings;
  botInfo: any;
  webhookInfo: any;
  onChange: (updated: Partial<BotSettings>) => void;
  onRefreshTelegram: () => void;
}

export function BotApiConfig({
  settings,
  botInfo,
  webhookInfo,
  onChange,
  onRefreshTelegram,
}: BotApiConfigProps) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showTokens, setShowTokens] = useState(false);

  const handleSetWebhook = async () => {
    try {
      setLoadingAction("setWebhook");
      setFeedback(null);
      let targetUrl = settings.webhookUrl;
      if (!targetUrl && typeof window !== "undefined") {
        targetUrl = `${window.location.origin}/api/webhook`;
        onChange({ webhookUrl: targetUrl });
      }

      if (!targetUrl) {
        setFeedback({ type: "error", text: "Укажите URL вебхука (например https://your-domain.vercel.app/api/webhook)" });
        return;
      }

      const res = await fetch("/api/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setWebhook", webhookUrl: targetUrl }),
      });

      const data = await res.json();
      if (data.ok) {
        setFeedback({ type: "success", text: "✅ Вебхук успешно установлен в Telegram!" });
        onRefreshTelegram();
      } else {
        setFeedback({ type: "error", text: `Ошибка: ${data.error || "Не удалось установить вебхук"}` });
      }
    } catch (e: any) {
      setFeedback({ type: "error", text: e.message || "Ошибка запроса" });
    } finally {
      setLoadingAction(null);
    }
  };

  const handleDeleteWebhook = async () => {
    if (!confirm("Удалить вебхук? Бот перестанет получать сообщения через сервер.")) return;
    try {
      setLoadingAction("deleteWebhook");
      setFeedback(null);
      const res = await fetch("/api/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deleteWebhook" }),
      });
      const data = await res.json();
      if (data.ok) {
        setFeedback({ type: "success", text: "Вебхук успешно удален." });
        onRefreshTelegram();
      } else {
        setFeedback({ type: "error", text: data.error || "Ошибка удаления вебхука" });
      }
    } catch (e: any) {
      setFeedback({ type: "error", text: e.message });
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="space-y-6">
      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center gap-2.5 ${
            feedback.type === "success"
              ? "bg-emerald-950/80 border border-emerald-800 text-emerald-300"
              : "bg-red-950/80 border border-red-800 text-red-300"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* API Keys Box */}
      <div className="bg-[#111827] border border-gray-800/80 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-gray-800 pb-3">
          <div className="flex items-center gap-2">
            <Key className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-semibold text-white">Ключи доступа (Telegram & Gemini)</h2>
          </div>
          <button
            type="button"
            onClick={() => setShowTokens(!showTokens)}
            className="text-xs text-gray-400 hover:text-indigo-400 transition-colors"
          >
            {showTokens ? "Скрыть токены" : "Показать токены"}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Telegram Bot Token */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Bot className="w-4 h-4 text-blue-400" />
                <span>Telegram Bot Token</span>
              </span>
              <a
                href="https://t.me/BotFather"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-indigo-400 hover:underline flex items-center gap-0.5"
              >
                @BotFather <ExternalLink className="w-3 h-3" />
              </a>
            </label>
            <input
              type={showTokens ? "text" : "password"}
              value={settings.telegramToken || ""}
              onChange={(e) => onChange({ telegramToken: e.target.value })}
              placeholder="123456789:ABCdefGhIJKlmNoPQRstuvWXyz..."
              className="w-full bg-[#090d16] border border-gray-700/80 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-xs text-gray-200 font-mono focus:outline-none transition-all"
            />
            {botInfo?.username && (
              <p className="text-[11px] text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Бот подключен: @{botInfo.username} ({botInfo.first_name})</span>
              </p>
            )}
          </div>

          {/* Gemini API Key */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-300 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Key className="w-4 h-4 text-amber-400" />
                <span>Google Gemini API Key</span>
              </span>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-indigo-400 hover:underline flex items-center gap-0.5"
              >
                Получить бесплатно <ExternalLink className="w-3 h-3" />
              </a>
            </label>
            <input
              type={showTokens ? "text" : "password"}
              value={settings.geminiApiKey || ""}
              onChange={(e) => onChange({ geminiApiKey: e.target.value })}
              placeholder="AIzaSy..."
              className="w-full bg-[#090d16] border border-gray-700/80 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-xs text-gray-200 font-mono focus:outline-none transition-all"
            />
            <p className="text-[11px] text-gray-400">
              Бесплатный ключ от Google AI Studio (модели 2.5 Flash, 1.5 Flash).
            </p>
          </div>
        </div>
      </div>

      {/* Webhook & Deployment Config */}
      <div className="bg-[#111827] border border-gray-800/80 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-gray-800 pb-3">
          <Globe className="w-5 h-5 text-indigo-400" />
          <h2 className="text-base font-semibold text-white">Настройка Webhook для Vercel</h2>
        </div>

        <p className="text-xs text-gray-400">
          Telegram отправляет новые сообщения на указанный URL в реальном времени. После загрузки на Vercel укажите адрес вашего проекта (или нажмите «Установить Webhook», чтобы подставить текущий домен).
        </p>

        <div className="space-y-2">
          <label className="block text-xs font-semibold text-gray-300">
            URL эндпоинта Webhook:
          </label>
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <input
              type="text"
              value={settings.webhookUrl || ""}
              onChange={(e) => onChange({ webhookUrl: e.target.value })}
              placeholder="https://your-domain.vercel.app/api/webhook"
              className="flex-1 w-full bg-[#090d16] border border-gray-700/80 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-xs text-gray-200 font-mono focus:outline-none transition-all"
            />
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleSetWebhook}
                disabled={loadingAction === "setWebhook"}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-indigo-600/30 transition-all disabled:opacity-50 whitespace-nowrap"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingAction === "setWebhook" ? "animate-spin" : ""}`} />
                <span>Установить Webhook</span>
              </button>

              <button
                type="button"
                onClick={handleDeleteWebhook}
                disabled={loadingAction === "deleteWebhook"}
                className="p-2.5 text-gray-400 hover:text-red-400 bg-gray-900 hover:bg-gray-800 rounded-xl border border-gray-800 transition-colors"
                title="Удалить Webhook"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Current Webhook Status Details */}
        <div className="bg-[#090d16] border border-gray-800/90 rounded-xl p-3.5 text-xs space-y-1.5 font-mono">
          <div className="flex items-center justify-between text-gray-400">
            <span>Статус в Telegram:</span>
            <span className={webhookInfo?.url ? "text-emerald-400 font-bold" : "text-amber-400"}>
              {webhookInfo?.url ? "Привязан ✅" : "Не привязан ❌"}
            </span>
          </div>
          {webhookInfo?.url && (
            <>
              <div className="flex items-center justify-between text-gray-400 text-[11px] overflow-hidden">
                <span>URL:</span>
                <span className="text-gray-300 truncate max-w-[280px]">{webhookInfo.url}</span>
              </div>
              <div className="flex items-center justify-between text-gray-400 text-[11px]">
                <span>Ожидающих сообщений:</span>
                <span className="text-gray-300">{webhookInfo.pending_update_count ?? 0}</span>
              </div>
              {webhookInfo.last_error_message && (
                <div className="text-red-400 text-[11px] pt-1">
                  Последняя ошибка: {webhookInfo.last_error_message}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Security & Admin Password */}
      <div className="bg-[#111827] border border-gray-800/80 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-gray-800 pb-3">
          <Shield className="w-5 h-5 text-indigo-400" />
          <h2 className="text-base font-semibold text-white">Безопасность панели управления</h2>
        </div>

        <div className="max-w-md space-y-1.5">
          <label className="block text-xs font-semibold text-gray-300">
            Пароль администратора для сохранения настроек:
          </label>
          <input
            type={showTokens ? "text" : "password"}
            value={settings.adminPassword || ""}
            onChange={(e) => onChange({ adminPassword: e.target.value })}
            placeholder="Секретный пароль"
            className="w-full bg-[#090d16] border border-gray-700/80 focus:border-indigo-500 rounded-xl px-3.5 py-2 text-xs text-gray-200 font-mono focus:outline-none transition-all"
          />
        </div>
      </div>
    </div>
  );
}

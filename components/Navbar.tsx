"use client";

import React from "react";
import { MessageSquare, Bot, Save, Sparkles, RefreshCw, Send } from "lucide-react";

interface NavbarProps {
  botInfo: any;
  webhookInfo: any;
  loading: boolean;
  saving: boolean;
  onSave: () => void;
  onOpenTestChat: () => void;
  onRefreshStatus: () => void;
}

export function Navbar({
  botInfo,
  webhookInfo,
  loading,
  saving,
  onSave,
  onOpenTestChat,
  onRefreshStatus,
}: NavbarProps) {
  const isOnline = Boolean(botInfo?.username && webhookInfo?.url);

  return (
    <header className="border-b border-gray-800 bg-[#0d1322]/80 backdrop-blur-md sticky top-0 z-40 px-4 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3.5">
        <div className="relative">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-blue-500 to-cyan-400 p-[2px] flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <div className="w-full h-full bg-[#0d1322] rounded-[10px] flex items-center justify-center">
              <Bot className="w-5 h-5 text-indigo-400" />
            </div>
          </div>
          <span
            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0d1322] ${
              isOnline ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
            }`}
          />
        </div>

        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-1.5">
              Артём <span className="text-xs px-2 py-0.5 rounded-md bg-indigo-950/80 text-indigo-300 border border-indigo-800/60 font-medium">Gemini AI</span>
            </h1>
            {botInfo?.username && (
              <a
                href={`https://t.me/${botInfo.username}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-gray-400 hover:text-indigo-400 flex items-center gap-1 underline transition-colors"
              >
                @{botInfo.username}
              </a>
            )}
          </div>
          <p className="text-xs text-gray-400">
            {isOnline
              ? "🟢 Вебхук активен, бот на связи в Telegram"
              : botInfo?.username
              ? "🟡 Токен валиден, настройте вебхук для автоответов"
              : "⚪ Бот не настроен (введите токен)"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        <button
          onClick={onRefreshStatus}
          disabled={loading}
          title="Обновить статус"
          className="p-2 text-gray-400 hover:text-gray-200 bg-gray-900/60 hover:bg-gray-800 rounded-lg border border-gray-800 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>

        <button
          onClick={onOpenTestChat}
          className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-gray-800/90 hover:bg-gray-700 text-indigo-300 hover:text-white rounded-lg border border-indigo-900/40 hover:border-indigo-700 transition-all shadow-sm"
        >
          <MessageSquare className="w-4 h-4 text-indigo-400" />
          <span>Тестовый чат</span>
        </button>

        <button
          onClick={onSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white rounded-lg shadow-md shadow-indigo-600/30 transition-all disabled:opacity-60"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? "Сохранение..." : "Сохранить всё"}</span>
        </button>
      </div>
    </header>
  );
}

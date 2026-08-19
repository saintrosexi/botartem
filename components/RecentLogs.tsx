"use client";

import React, { useState } from "react";
import { LogEntry, ChatMetadata } from "@/lib/types";
import { History, Users, RefreshCw, MessageSquare, ShieldAlert, Sparkles, Clock, AtSign, ArrowRightLeft } from "lucide-react";

interface RecentLogsProps {
  logs: LogEntry[];
  chats: ChatMetadata[];
  loading: boolean;
  onRefresh: () => void;
}

export function RecentLogs({ logs, chats, loading, onRefresh }: RecentLogsProps) {
  const [filterChatId, setFilterChatId] = useState<number | null>(null);

  const filteredLogs = filterChatId
    ? logs.filter((l) => l.chatId === filterChatId)
    : logs;

  const getTriggerBadge = (type: LogEntry["triggerType"]) => {
    switch (type) {
      case "name_keyword":
        return (
          <span className="px-2 py-0.5 rounded bg-indigo-950/80 border border-indigo-800 text-indigo-300 text-[10px] font-semibold flex items-center gap-1">
            <Sparkles className="w-2.5 h-2.5" /> Имя (Артём)
          </span>
        );
      case "mention":
        return (
          <span className="px-2 py-0.5 rounded bg-blue-950/80 border border-blue-800 text-blue-300 text-[10px] font-semibold flex items-center gap-1">
            <AtSign className="w-2.5 h-2.5" /> Тег @бота
          </span>
        );
      case "reply":
        return (
          <span className="px-2 py-0.5 rounded bg-purple-950/80 border border-purple-800 text-purple-300 text-[10px] font-semibold flex items-center gap-1">
            <ArrowRightLeft className="w-2.5 h-2.5" /> Реплай
          </span>
        );
      case "direct":
        return (
          <span className="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-[10px] font-semibold flex items-center gap-1">
            <MessageSquare className="w-2.5 h-2.5" /> ЛС
          </span>
        );
      case "cron_checkin":
        return (
          <span className="px-2 py-0.5 rounded bg-amber-950/80 border border-amber-800 text-amber-300 text-[10px] font-semibold flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" /> Чек-ин
          </span>
        );
      case "random_burst":
        return (
          <span className="px-2 py-0.5 rounded bg-pink-950/80 border border-pink-800 text-pink-300 text-[10px] font-semibold flex items-center gap-1">
            🎲 Спонтанно
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded bg-gray-800 text-gray-300 text-[10px]">
            {type}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Active Chats section */}
      <div className="bg-[#111827] border border-gray-800/80 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-gray-800 pb-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-semibold text-white">Активные беседы и чаты</h2>
          </div>
          <span className="text-xs text-gray-400">Всего чатов: {chats.length}</span>
        </div>

        {chats.length === 0 ? (
          <p className="text-xs text-gray-400 py-3">
            Пока нет зарегистрированных чатов. Добавьте бота в группу в Telegram или напишите ему в ЛС, чтобы он появился в списке.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <button
              onClick={() => setFilterChatId(null)}
              className={`p-3 rounded-xl border text-left transition-all ${
                filterChatId === null
                  ? "bg-indigo-950/40 border-indigo-600 text-white"
                  : "bg-[#090d16]/70 border-gray-800 hover:border-gray-700 text-gray-300"
              }`}
            >
              <div className="text-xs font-bold mb-0.5">Все чаты</div>
              <div className="text-[11px] text-gray-400">Показать сообщения из всех бесед</div>
            </button>

            {chats.map((c) => (
              <button
                key={c.chatId}
                onClick={() => setFilterChatId(c.chatId)}
                className={`p-3 rounded-xl border text-left transition-all overflow-hidden ${
                  filterChatId === c.chatId
                    ? "bg-indigo-950/40 border-indigo-600 text-white"
                    : "bg-[#090d16]/70 border-gray-800 hover:border-gray-700 text-gray-300"
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-xs font-bold truncate">{c.title}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-gray-800 text-gray-400 font-mono">
                    {c.type === "private" ? "ЛС" : "Группа"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-gray-400">
                  <span>ID: {c.chatId}</span>
                  <span>{c.messageCount} сообщ.</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Message Logs Stream */}
      <div className="bg-[#111827] border border-gray-800/80 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-gray-800 pb-3">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-semibold text-white">
              Логи диалогов {filterChatId ? `(Фильтр: чат ${filterChatId})` : ""}
            </h2>
          </div>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Обновить</span>
          </button>
        </div>

        {filteredLogs.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-8">
            Логи пусты. Напишите боту в Telegram, чтобы увидеть переписку в реальном времени.
          </p>
        ) : (
          <div className="space-y-3">
            {filteredLogs.map((log) => (
              <div
                key={log.id}
                className="p-4 bg-[#090d16]/80 border border-gray-800/80 rounded-xl space-y-2.5 text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-200">
                      {log.senderName}
                      {log.senderUsername ? ` (@${log.senderUsername})` : ""}
                    </span>
                    <span className="text-gray-400 text-[11px]">
                      в {log.chatTitle || `чате ${log.chatId}`}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {getTriggerBadge(log.triggerType)}
                    <span className="text-[11px] text-gray-400">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </span>
                  </div>
                </div>

                <div className="bg-[#111827] border border-gray-800/60 rounded-lg p-2.5 text-gray-300">
                  <div className="text-[10px] text-gray-400 mb-0.5">Входящее сообщение:</div>
                  <div className="whitespace-pre-wrap">{log.userMessage}</div>
                </div>

                {log.isError ? (
                  <div className="bg-red-950/40 border border-red-700/60 rounded-lg p-3 text-red-200 space-y-1">
                    <div className="text-[11px] text-red-400 font-bold flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
                      <span>Ошибка (бот не смог отправить ответ):</span>
                    </div>
                    <div className="font-mono text-[11px] text-red-300 whitespace-pre-wrap bg-red-950/60 p-2 rounded border border-red-900/50">
                      {log.errorMessage || log.botReply}
                    </div>
                  </div>
                ) : log.botReply && (
                  <div className="bg-indigo-950/30 border border-indigo-900/50 rounded-lg p-2.5 text-indigo-100">
                    <div className="text-[10px] text-indigo-400 font-semibold mb-0.5">Ответ Артёма:</div>
                    <div className="whitespace-pre-wrap">{log.botReply}</div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

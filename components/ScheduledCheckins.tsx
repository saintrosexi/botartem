"use client";

import React, { useState } from "react";
import { BotSettings, CheckinSchedule } from "@/lib/types";
import { Clock, Plus, Trash2, Play, Sparkles, AlertCircle } from "lucide-react";

interface ScheduledCheckinsProps {
  settings: BotSettings;
  onChange: (updated: Partial<BotSettings>) => void;
}

export function ScheduledCheckins({ settings, onChange }: ScheduledCheckinsProps) {
  const [runningId, setRunningId] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const checkins = settings.checkins || [];

  const handleToggleCheckin = (id: string) => {
    const updated = checkins.map((c) => (c.id === id ? { ...c, enabled: !c.enabled } : c));
    onChange({ checkins: updated });
  };

  const handleUpdateCheckin = (id: string, fields: Partial<CheckinSchedule>) => {
    const updated = checkins.map((c) => (c.id === id ? { ...c, ...fields } : c));
    onChange({ checkins: updated });
  };

  const handleDeleteCheckin = (id: string) => {
    if (confirm("Удалить этот авто-чекин?")) {
      const updated = checkins.filter((c) => c.id !== id);
      onChange({ checkins: updated });
    }
  };

  const handleAddCheckin = () => {
    const newEntry: CheckinSchedule = {
      id: "checkin_" + Math.random().toString(36).substring(2, 7),
      name: "Новый чек-ин",
      time: "12:00",
      promptHint: "Поздоровайся и спроси, как дела у чата.",
      enabled: true,
    };
    onChange({ checkins: [...checkins, newEntry] });
  };

  const handleRunNow = async (checkinId: string) => {
    try {
      setRunningId(checkinId);
      setStatusMsg(null);
      const res = await fetch(`/api/cron?checkinId=${checkinId}`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.ok) {
        setStatusMsg({
          type: "success",
          text: `Чек-ин успешно выполнен! Сообщение отправлено в группы (${data.sentTo?.length || 0} чатов).`,
        });
      } else {
        setStatusMsg({
          type: "error",
          text: data.error || data.message || "Не удалось отправить чек-ин (проверьте, добавлен ли бот в группы).",
        });
      }
    } catch (e: any) {
      setStatusMsg({ type: "error", text: e.message || "Ошибка отправки" });
    } finally {
      setRunningId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="bg-[#111827] border border-gray-800/80 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-800 pb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-400" />
            <div>
              <h2 className="text-base font-semibold text-white">Авто-сообщения и чек-ины по расписанию</h2>
              <p className="text-xs text-gray-400">
                Артём может сам первым писать в активные беседы в заданное время дня, генерируя каждый раз уникальное живое сообщение.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleAddCheckin}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Добавить чек-ин</span>
          </button>
        </div>

        {statusMsg && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
              statusMsg.type === "success"
                ? "bg-emerald-950/80 border border-emerald-800 text-emerald-300"
                : "bg-amber-950/80 border border-amber-800 text-amber-300"
            }`}
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{statusMsg.text}</span>
          </div>
        )}

        {/* Check-ins list */}
        <div className="space-y-3.5">
          {checkins.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-xs">
              Нет настроенных чек-инов. Нажмите «Добавить чек-ин», чтобы создать новый.
            </div>
          ) : (
            checkins.map((c) => (
              <div
                key={c.id}
                className={`p-4 rounded-xl border transition-all ${
                  c.enabled
                    ? "bg-[#0d1322] border-gray-700/80"
                    : "bg-[#090d16]/50 border-gray-800/40 opacity-70"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={c.enabled}
                      onChange={() => handleToggleCheckin(c.id)}
                      className="w-4 h-4 rounded bg-gray-800 border-gray-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={c.name}
                      onChange={(e) => handleUpdateCheckin(c.id, { name: e.target.value })}
                      placeholder="Название (например: Утренний вброс)"
                      className="bg-transparent border-b border-transparent hover:border-gray-700 focus:border-indigo-500 text-sm font-semibold text-white px-1 py-0.5 focus:outline-none transition-all"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-900 border border-gray-700 rounded-lg text-xs text-gray-300">
                      <Clock className="w-3.5 h-3.5 text-indigo-400" />
                      <input
                        type="time"
                        value={c.time}
                        onChange={(e) => handleUpdateCheckin(c.id, { time: e.target.value })}
                        className="bg-transparent text-white focus:outline-none cursor-pointer"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRunNow(c.id)}
                      disabled={runningId === c.id}
                      title="Протестировать отправку прямо сейчас"
                      className="flex items-center gap-1 px-2.5 py-1 bg-gray-800 hover:bg-gray-700 text-indigo-300 hover:text-white rounded-lg border border-gray-700 text-xs font-medium transition-colors disabled:opacity-50"
                    >
                      <Play className={`w-3 h-3 ${runningId === c.id ? "animate-spin" : ""}`} />
                      <span>{runningId === c.id ? "Отправка..." : "Тест"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteCheckin(c.id)}
                      className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-950/40 rounded-lg transition-colors"
                      title="Удалить"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="mt-3">
                  <label className="block text-[11px] text-gray-400 mb-1 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-indigo-400" />
                    <span>Подсказка для темы сообщения (Gemini сгенерирует уникальный текст на её основе):</span>
                  </label>
                  <input
                    type="text"
                    value={c.promptHint}
                    onChange={(e) => handleUpdateCheckin(c.id, { promptHint: e.target.value })}
                    placeholder="Например: Поздоровайся и спроси, кто уже проснулся..."
                    className="w-full bg-[#090d16] border border-gray-800 focus:border-indigo-500 rounded-lg px-3 py-1.5 text-xs text-gray-200 focus:outline-none transition-all"
                  />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Cron note */}
        <div className="bg-[#090d16]/70 border border-gray-800/80 rounded-xl p-3.5 text-xs text-gray-400 space-y-1">
          <div className="font-semibold text-gray-300 flex items-center gap-1.5">
            <span>ℹ️ Как работает авто-расписание на Vercel</span>
          </div>
          <p>
            В проекте уже настроен файл <code className="text-indigo-300">vercel.json</code> с cron-задачей, которая периодически дергает эндпоинт <code className="text-indigo-300">/api/cron</code>. Бот автоматически отправляет сообщения во все беседы, где он состоит.
          </p>
        </div>
      </div>
    </div>
  );
}

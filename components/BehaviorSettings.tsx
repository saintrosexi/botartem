"use client";

import React, { useState } from "react";
import { BotSettings } from "@/lib/types";
import { MessageSquareCode, Plus, X, Dices, Layers } from "lucide-react";

interface BehaviorSettingsProps {
  settings: BotSettings;
  onChange: (updated: Partial<BotSettings>) => void;
}

export function BehaviorSettings({ settings, onChange }: BehaviorSettingsProps) {
  const [newKeyword, setNewKeyword] = useState("");

  const handleAddKeyword = () => {
    const trimmed = newKeyword.trim().toLowerCase();
    if (!trimmed) return;
    const current = settings.triggerKeywords || [];
    if (!current.includes(trimmed)) {
      onChange({ triggerKeywords: [...current, trimmed] });
    }
    setNewKeyword("");
  };

  const handleRemoveKeyword = (kwToRemove: string) => {
    const current = settings.triggerKeywords || [];
    onChange({ triggerKeywords: current.filter((k) => k !== kwToRemove) });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddKeyword();
    }
  };

  return (
    <div className="space-y-6">
      {/* Trigger Keywords */}
      <div className="bg-[#111827] border border-gray-800/80 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-gray-800 pb-3">
          <MessageSquareCode className="w-5 h-5 text-indigo-400" />
          <h2 className="text-base font-semibold text-white">Ключевые слова-триггеры (Имя)</h2>
        </div>

        <p className="text-xs text-gray-400">
          Когда в групповом чате или беседе кто-то произносит любое из этих слов, Артём автоматически понимает, что обращаются к нему, и отвечает на сообщение.
        </p>

        {/* Tag list */}
        <div className="flex flex-wrap gap-2 pt-1">
          {(settings.triggerKeywords || []).map((kw) => (
            <span
              key={kw}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-950/80 border border-indigo-800/80 text-indigo-200 text-xs font-semibold shadow-sm"
            >
              <span>{kw}</span>
              <button
                type="button"
                onClick={() => handleRemoveKeyword(kw)}
                className="text-indigo-400 hover:text-red-400 transition-colors p-0.5 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
        </div>

        {/* Input to add */}
        <div className="flex items-center gap-2 pt-2">
          <input
            type="text"
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Добавить вариант имени (например, тёмик)"
            className="flex-1 bg-[#090d16] border border-gray-700/80 focus:border-indigo-500 rounded-xl px-3.5 py-2 text-xs text-gray-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
          />
          <button
            type="button"
            onClick={handleAddKeyword}
            className="flex items-center gap-1 px-3.5 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-xl border border-gray-700 text-xs font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Добавить</span>
          </button>
        </div>
      </div>

      {/* Spontaneous Chance & Context Length */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Random reply chance */}
        <div className="bg-[#111827] border border-gray-800/80 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Dices className="w-5 h-5 text-amber-400" />
              <h3 className="text-sm font-semibold text-white">Спонтанный ответ в беседах</h3>
            </div>
            <span className="px-2 py-0.5 rounded bg-amber-950/80 border border-amber-800 text-amber-300 text-sm font-bold">
              {settings.randomReplyChance ?? 8}%
            </span>
          </div>

          <p className="text-xs text-gray-400">
            Вероятность того, что Артём сам вставит свои 5 копеек в активный диалог группы без прямого упоминания или тега.
          </p>

          <input
            type="range"
            min="0"
            max="40"
            step="1"
            value={settings.randomReplyChance ?? 8}
            onChange={(e) => onChange({ randomReplyChance: parseInt(e.target.value, 10) })}
            className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />

          <div className="flex justify-between text-[11px] text-gray-400 font-medium">
            <span>0% (Только по имени/реплаю)</span>
            <span>8-12% (Живой баланс)</span>
            <span>40% (Флудер)</span>
          </div>
        </div>

        {/* Max Context Messages */}
        <div className="bg-[#111827] border border-gray-800/80 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-cyan-400" />
              <h3 className="text-sm font-semibold text-white">Глубина памяти контекста</h3>
            </div>
            <span className="px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-800 text-cyan-300 text-sm font-bold">
              {settings.maxContextMessages ?? 15} сообщ.
            </span>
          </div>

          <p className="text-xs text-gray-400">
            Количество предыдущих сообщений в чате, которые передаются в Gemini для понимания сути диалога и спора.
          </p>

          <input
            type="range"
            min="5"
            max="30"
            step="1"
            value={settings.maxContextMessages ?? 15}
            onChange={(e) => onChange({ maxContextMessages: parseInt(e.target.value, 10) })}
            className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
          />

          <div className="flex justify-between text-[11px] text-gray-400 font-medium">
            <span>5 (Короткий контекст)</span>
            <span>15 (Оптимально)</span>
            <span>30 (Глубокий)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

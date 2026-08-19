"use client";

import React from "react";
import { BotSettings } from "@/lib/types";
import { DEFAULT_SYSTEM_PROMPT } from "@/lib/default-prompt";
import { Sparkles, RotateCcw, Cpu, Flame, ThumbsUp, HelpCircle } from "lucide-react";

interface PromptSettingsProps {
  settings: BotSettings;
  onChange: (updated: Partial<BotSettings>) => void;
}

const AVAILABLE_MODELS = [
  { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash (Рекомендуется, самый быстрый и живой)", badge: "Рекомендуется" },
  { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash (Быстрый, стабильный)", badge: "Стандарт" },
  { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro (Продвинутый, глубокий контекст)", badge: "Pro" },
  { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro (Классический Pro)", badge: "Pro" },
];

export function PromptSettings({ settings, onChange }: PromptSettingsProps) {
  const handleResetPrompt = () => {
    if (confirm("Сбросить системный промпт к эталонному характеру Артёма?")) {
      onChange({ systemPrompt: DEFAULT_SYSTEM_PROMPT });
    }
  };

  const getTemperatureLabel = (val: number) => {
    if (val < 0.4) return "Строгий / Сдержанный";
    if (val < 0.8) return "Умеренный / Стабильный";
    if (val <= 1.1) return "Живой собеседник (Идеально для Артёма)";
    if (val <= 1.5) return "Креативный / Непредсказуемый";
    return "Хаотичный / Максимум рандома";
  };

  return (
    <div className="space-y-6">
      {/* System Prompt Box */}
      <div className="bg-[#111827] border border-gray-800/80 rounded-2xl p-5 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-800 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <h2 className="text-base font-semibold text-white">Системный промпт Артёма</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">
              {settings.systemPrompt?.length || 0} символов
            </span>
            <button
              onClick={handleResetPrompt}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-md border border-gray-700 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Сбросить к дефолту</span>
            </button>
          </div>
        </div>

        <p className="text-xs text-gray-400">
          Этот промпт определяет личность, стиль общения, манеру речи и правила поведения в чате. Вы можете редактировать любые пункты или вписать свои инструкции.
        </p>

        <textarea
          value={settings.systemPrompt || ""}
          onChange={(e) => onChange({ systemPrompt: e.target.value })}
          rows={12}
          className="w-full bg-[#090d16] border border-gray-700/80 focus:border-indigo-500 rounded-xl p-3.5 text-sm text-gray-200 font-mono leading-relaxed focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
          placeholder="Введите системный промпт..."
        />
      </div>

      {/* AI Model & Temperature */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Temperature Box */}
        <div className="bg-[#111827] border border-gray-800/80 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-amber-400" />
              <h3 className="text-sm font-semibold text-white">Температура (Креативность)</h3>
            </div>
            <span className="px-2 py-0.5 rounded bg-indigo-950/80 border border-indigo-800 text-indigo-300 text-sm font-bold">
              {settings.temperature ?? 0.95}
            </span>
          </div>

          <p className="text-xs text-gray-400">
            Управляет непредсказуемостью и свободой мысли. Для живого чата рекомендуется 0.85 – 1.10.
          </p>

          <input
            type="range"
            min="0.0"
            max="2.0"
            step="0.05"
            value={settings.temperature ?? 0.95}
            onChange={(e) => onChange({ temperature: parseFloat(e.target.value) })}
            className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />

          <div className="flex justify-between text-[11px] text-gray-400 font-medium">
            <span>0.0 (Робот)</span>
            <span className="text-indigo-400 font-semibold">{getTemperatureLabel(settings.temperature ?? 0.95)}</span>
            <span>2.0 (Хаос)</span>
          </div>
        </div>

        {/* Model Selection */}
        <div className="bg-[#111827] border border-gray-800/80 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-blue-400" />
            <h3 className="text-sm font-semibold text-white">Модель Google Gemini</h3>
          </div>

          <p className="text-xs text-gray-400">
            Выберите модель для обработки и генерации ответов бота.
          </p>

          <div className="space-y-2">
            {AVAILABLE_MODELS.map((m) => (
              <label
                key={m.id}
                className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                  settings.model === m.id
                    ? "border-indigo-500 bg-indigo-950/30 text-white"
                    : "border-gray-800 bg-[#090d16]/60 hover:bg-gray-800/60 text-gray-300"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <input
                    type="radio"
                    name="gemini_model"
                    value={m.id}
                    checked={settings.model === m.id}
                    onChange={() => onChange({ model: m.id })}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-xs font-medium">{m.name}</span>
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Personality Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Sarcasm Level */}
        <div className="bg-[#111827] border border-gray-800/80 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <h3 className="text-sm font-semibold text-white">Уровень сарказма и подколов</h3>
            </div>
            <span className="px-2 py-0.5 rounded bg-purple-950/80 border border-purple-800 text-purple-300 text-sm font-bold">
              {settings.sarcasmLevel ?? 4} / 5
            </span>
          </div>

          <p className="text-xs text-gray-400">
            1 = Добряк без подколов, 3 = Умеренный юмор, 5 = Едкий и саркастичный тип.
          </p>

          <input
            type="range"
            min="1"
            max="5"
            step="1"
            value={settings.sarcasmLevel ?? 4}
            onChange={(e) => onChange({ sarcasmLevel: parseInt(e.target.value, 10) })}
            className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
          />
        </div>

        {/* Side Taking in arguments */}
        <div className="bg-[#111827] border border-gray-800/80 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <ThumbsUp className="w-5 h-5 text-emerald-400" />
              <h3 className="text-sm font-semibold text-white">Выбор стороны в спорах</h3>
            </div>
            <p className="text-xs text-gray-400">
              Если включено, Артём не уходит от ответа, а выбирает одну из сторон участников в дискуссиях и аргументирует с юмором.
            </p>
          </div>

          <div className="pt-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.takeSidesInArguments ?? true}
                onChange={(e) => onChange({ takeSidesInArguments: e.target.checked })}
                className="w-5 h-5 rounded bg-gray-800 border-gray-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
              />
              <span className="text-sm text-gray-200 font-medium">
                {settings.takeSidesInArguments ? "✅ Активно занимать чью-то сторону" : "❌ Быть нейтральным (как стандартный бот)"}
              </span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

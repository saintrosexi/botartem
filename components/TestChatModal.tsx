"use client";

import React, { useState, useRef, useEffect } from "react";
import { BotSettings } from "@/lib/types";
import { X, Send, Bot, User, Trash2, Sparkles, RefreshCw } from "lucide-react";

interface TestChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: BotSettings;
}

interface ChatMessage {
  id: string;
  senderName: string;
  text: string;
  isBot: boolean;
  timestamp: number;
}

const QUICK_PROMPTS = [
  "Артём, ты бот?",
  "Артём, рассуди нас: Миша говорит что пицца с ананасами топ, а Саша говорит что кринж. Кто прав?",
  "ну че как ты сегодня?",
  "Артём, посоветуй че глянуть на вечер или во что поиграть",
];

export function TestChatModal({ isOpen, onClose, settings }: TestChatModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "init",
      senderName: "Артём",
      text: "ку, че как? о чем поболтаем? Можешь проверить мои ответы прямо тут)",
      isBot: true,
      timestamp: Date.now(),
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      id: Math.random().toString(36).substring(2),
      senderName: "Вы",
      text,
      isBot: false,
      timestamp: Date.now(),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInputText("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: newHistory.slice(-8),
          settingsOverride: settings,
        }),
      });

      const data = await res.json();
      if (data.ok && data.reply) {
        const botMsg: ChatMessage = {
          id: Math.random().toString(36).substring(2),
          senderName: "Артём",
          text: data.reply,
          isBot: true,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, botMsg]);
      } else {
        const errMsg: ChatMessage = {
          id: Math.random().toString(36).substring(2),
          senderName: "Система",
          text: `⚠️ Ошибка: ${data.error || "Не удалось сгенерировать ответ. Проверьте Gemini API Key."}`,
          isBot: true,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, errMsg]);
      }
    } catch (e: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(36).substring(2),
          senderName: "Система",
          text: `⚠️ Ошибка запроса: ${e.message}`,
          isBot: true,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setMessages([
      {
        id: "init",
        senderName: "Артём",
        text: "чат очищен, давай заново)",
        isBot: true,
        timestamp: Date.now(),
      },
    ]);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-2xl bg-[#0f172a] border border-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[640px] max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-5 py-3.5 bg-[#1e293b]/70 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                Тестовый чат с Артёмом
                <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800 font-mono">
                  temp: {settings.temperature}
                </span>
              </h3>
              <p className="text-[11px] text-gray-400">Проверка характера и ответов в реальном времени</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleClear}
              title="Очистить историю чата"
              className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick prompt pills */}
        <div className="px-4 py-2 bg-[#090d16]/70 border-b border-gray-800/80 overflow-x-auto flex items-center gap-2 text-xs">
          <span className="text-[11px] text-gray-400 whitespace-nowrap flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-indigo-400" /> Тест:
          </span>
          {QUICK_PROMPTS.map((qp, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(qp)}
              className="px-2.5 py-1 bg-gray-800/70 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg whitespace-nowrap text-[11px] border border-gray-700/60 transition-colors"
            >
              {qp}
            </button>
          ))}
        </div>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#090d16]/50">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex items-start gap-2.5 ${m.isBot ? "justify-start" : "justify-end"}`}
            >
              {m.isBot && (
                <div className="w-7 h-7 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5 text-indigo-300" />
                </div>
              )}

              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed shadow-sm ${
                  m.isBot
                    ? "bg-[#1e293b] text-gray-100 border border-gray-800 rounded-tl-sm"
                    : "bg-gradient-to-r from-indigo-600 to-blue-600 text-white rounded-tr-sm"
                }`}
              >
                <div className="text-[10px] font-semibold opacity-75 mb-0.5">
                  {m.senderName}
                </div>
                <div className="whitespace-pre-wrap">{m.text}</div>
              </div>

              {!m.isBot && (
                <div className="w-7 h-7 rounded-lg bg-blue-600/30 border border-blue-500/40 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-3.5 h-3.5 text-blue-300" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-3.5 h-3.5 text-indigo-300" />
              </div>
              <div className="bg-[#1e293b] border border-gray-800 rounded-2xl rounded-tl-sm px-4 py-3 text-xs text-gray-400 flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                <span>Артём печатает...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="p-3 bg-[#111827] border-t border-gray-800 flex items-center gap-2"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Напишите сообщение Артёму..."
            disabled={isLoading}
            className="flex-1 bg-[#090d16] border border-gray-700/80 focus:border-indigo-500 rounded-xl px-4 py-2.5 text-xs text-gray-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isLoading}
            className="p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl disabled:opacity-40 shadow-md shadow-indigo-600/30 transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

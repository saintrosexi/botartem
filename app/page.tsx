"use client";

import React, { useState, useEffect } from "react";
import { BotSettings, LogEntry, ChatMetadata } from "@/lib/types";
import { DEFAULT_SYSTEM_PROMPT, DEFAULT_CHECKINS } from "@/lib/default-prompt";
import { Navbar } from "@/components/Navbar";
import { PromptSettings } from "@/components/PromptSettings";
import { BehaviorSettings } from "@/components/BehaviorSettings";
import { ScheduledCheckins } from "@/components/ScheduledCheckins";
import { BotApiConfig } from "@/components/BotApiConfig";
import { RecentLogs } from "@/components/RecentLogs";
import { TestChatModal } from "@/components/TestChatModal";
import { Sparkles, Sliders, Clock, KeyRound, History, CheckCircle2, AlertCircle, MessageSquare } from "lucide-react";

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<"prompt" | "behavior" | "checkins" | "config" | "logs">("prompt");
  const [isTestChatOpen, setIsTestChatOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [settings, setSettings] = useState<BotSettings>({
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
    temperature: 0.95,
    model: "gemini-2.5-flash",
    botName: "Артём",
    triggerKeywords: ["артём", "артем", "тёма", "тема", "artem", "артёмка", "артемка"],
    randomReplyChance: 8,
    sarcasmLevel: 4,
    takeSidesInArguments: true,
    maxContextMessages: 15,
    checkins: DEFAULT_CHECKINS,
    allowedChatIds: [],
    blacklistedChatIds: [],
    telegramToken: "",
    geminiApiKey: "",
    adminPassword: "artem123",
    webhookUrl: "",
  });

  const [botInfo, setBotInfo] = useState<any>(null);
  const [webhookInfo, setWebhookInfo] = useState<any>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [chats, setChats] = useState<ChatMetadata[]>([]);

  // Fetch initial data
  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Settings
      const setRes = await fetch("/api/settings");
      const setData = await setRes.json();
      if (setData.ok && setData.settings) {
        setSettings((prev) => ({ ...prev, ...setData.settings }));
      }

      // 2. Telegram status
      const tgRes = await fetch("/api/telegram");
      const tgData = await tgRes.json();
      if (tgData.ok) {
        setBotInfo(tgData.bot);
        setWebhookInfo(tgData.webhook);
      } else {
        setBotInfo(null);
        setWebhookInfo(null);
      }

      // 3. Logs & Chats
      const logsRes = await fetch("/api/logs");
      const logsData = await logsRes.json();
      if (logsData.ok) {
        setLogs(logsData.logs || []);
        setChats(logsData.chats || []);
      }
    } catch (e: any) {
      console.error("Error loading dashboard data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateSettings = (partial: Partial<BotSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  };

  const handleSave = async () => {
    setSaving(true);
    setToast(null);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      const data = await res.json();
      if (data.ok) {
        setToast({ type: "success", message: "✅ Все настройки Артёма успешно сохранены!" });
      } else {
        setToast({ type: "error", message: `❌ Ошибка сохранения: ${data.error || "Неизвестная ошибка"}` });
      }
    } catch (e: any) {
      setToast({ type: "error", message: `❌ Ошибка сети: ${e.message}` });
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 5000);
    }
  };

  interface TabItem {
    id: "prompt" | "behavior" | "checkins" | "config" | "logs";
    label: string;
    icon: React.ElementType;
    count?: number;
  }

  const tabs: TabItem[] = [
    { id: "prompt", label: "Характер и Промпт", icon: Sparkles },
    { id: "behavior", label: "Поведение и Имя", icon: Sliders },
    { id: "checkins", label: "Чек-ины и Расписание", icon: Clock },
    { id: "config", label: "Ключи и Webhook", icon: KeyRound },
    { id: "logs", label: "Чаты и Логи", icon: History, count: logs.length },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#090d16] text-gray-100 selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        botInfo={botInfo}
        webhookInfo={webhookInfo}
        loading={loading}
        saving={saving}
        onSave={handleSave}
        onOpenTestChat={() => setIsTestChatOpen(true)}
        onRefreshStatus={fetchData}
      />

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 animate-bounce">
          <div
            className={`px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs font-semibold border ${
              toast.type === "success"
                ? "bg-emerald-950/90 border-emerald-700 text-emerald-200"
                : "bg-red-950/90 border-red-700 text-red-200"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 lg:p-8 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex overflow-x-auto pb-1 gap-2 border-b border-gray-800">
          {tabs.map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/50 shadow-sm"
                    : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/50"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-indigo-400" : "text-gray-400"}`} />
                <span>{t.label}</span>
                {t.count !== undefined && t.count > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-gray-800 text-gray-300">
                    {t.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="animate-fadeIn">
          {activeTab === "prompt" && (
            <PromptSettings settings={settings} onChange={handleUpdateSettings} />
          )}

          {activeTab === "behavior" && (
            <BehaviorSettings settings={settings} onChange={handleUpdateSettings} />
          )}

          {activeTab === "checkins" && (
            <ScheduledCheckins settings={settings} onChange={handleUpdateSettings} />
          )}

          {activeTab === "config" && (
            <BotApiConfig
              settings={settings}
              botInfo={botInfo}
              webhookInfo={webhookInfo}
              onChange={handleUpdateSettings}
              onRefreshTelegram={fetchData}
            />
          )}

          {activeTab === "logs" && (
            <RecentLogs
              logs={logs}
              chats={chats}
              loading={loading}
              onRefresh={fetchData}
            />
          )}
        </div>
      </main>

      {/* Floating test chat trigger */}
      <div className="fixed bottom-6 left-6 z-30">
        <button
          onClick={() => setIsTestChatOpen(true)}
          className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-indigo-600 via-indigo-700 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white rounded-2xl shadow-xl shadow-indigo-600/30 text-xs font-bold transition-transform hover:scale-105"
        >
          <MessageSquare className="w-4 h-4" />
          <span>Поговорить с Артёмом</span>
        </button>
      </div>

      {/* Test Chat Modal */}
      <TestChatModal
        isOpen={isTestChatOpen}
        onClose={() => setIsTestChatOpen(false)}
        settings={settings}
      />
    </div>
  );
}

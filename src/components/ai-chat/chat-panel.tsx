"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { X, Send, Loader2, Trash2 } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { ChatMessage } from "./chat-message";
import {
  aiChatService,
  type ChatMessage as ChatMessageType,
} from "@/lib/api/ai-chat";

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const WELCOME_MESSAGE: ChatMessageType = {
  id: "welcome",
  role: "assistant",
  content:
    "👋 **Welcome!** I'm **Lumo**, your AI assistant.\n\nI can help you manage your platform efficiently. Here are some things I can do:\n\n• **Account Management** - Create, list, and manage accounts\n• **Project Operations** - Handle projects across accounts\n• **Role & Designation** - Create roles and designations for projects\n• **Activity Insights** - View recent changes and audit logs\n\nTry asking me something like:\n• `Create an account for Acme Corp`\n• `Create a role called Admin for project PRJ-000001`\n• `Create a designation called Manager`\n• `Show recent activity`",
  timestamp: new Date(),
};

const QUICK_ACTIONS = [
  { label: "📋 List accounts", query: "List all accounts" },
  { label: "🗂️ List projects", query: "List all projects" },
  { label: "🛡️ Create role", query: "Create a new role for a project" },
  { label: "👤 Create designation", query: "Create a new designation" },
];

export function ChatPanel({ isOpen, onClose }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessageType[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const sendMessage = async (messageText?: string) => {
    const text = messageText || input.trim();
    if (!text || isLoading) return;

    const userMessage: ChatMessageType = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await aiChatService.sendMessage(text);

      const assistantMessage: ChatMessageType = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response.response,
        timestamp: new Date(),
        actions: response.actions,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: ChatMessageType = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          "Sorry, I encountered an error. Please make sure you're logged in and try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearConversation = async () => {
    await aiChatService.clearSession();
    setMessages([WELCOME_MESSAGE]);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/20 backdrop-blur-sm transition-opacity duration-200",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={cn(
          "fixed bottom-0 right-0 z-50 flex h-[min(650px,calc(100vh-2rem))] w-[min(440px,calc(100vw-2rem))] flex-col",
          "rounded-tl-2xl rounded-tr-2xl sm:rounded-tr-none border border-[var(--orca-border)] bg-[var(--orca-surface)]",
          "shadow-2xl transition-transform duration-300 ease-out",
          "backdrop-blur-xl bg-opacity-95",
          isOpen ? "translate-x-0 translate-y-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--orca-border)] px-4 py-3 bg-gradient-to-r from-[var(--orca-surface)] to-[var(--orca-surface-2)]">
          <div className="flex items-center gap-3">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-100 to-amber-50 shadow-lg shadow-amber-500/20 overflow-hidden">
              <Image 
                src="/robot.png" 
                alt="Lumo" 
                width={36} 
                height={36}
                className="object-contain"
              />
              <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-[var(--orca-brand-2)] border-2 border-[var(--orca-surface)] animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-[var(--orca-text)]">
                Lumo
              </h3>
              <p className="text-xs text-[var(--orca-text-3)] flex items-center gap-1">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--orca-brand-2)]" />
                Powered by GPT-4
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={clearConversation}
              className="p-2 rounded-lg hover:bg-[var(--orca-surface-3)] text-[var(--orca-text-3)] hover:text-[var(--orca-brand-4)] transition-all hover:scale-110 active:scale-95"
              title="Clear conversation"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-[var(--orca-surface-3)] text-[var(--orca-text-3)] hover:text-[var(--orca-text)] transition-all hover:scale-110 active:scale-95"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-[var(--orca-surface-2)]/30 to-transparent">
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex gap-3 p-3 rounded-lg bg-[var(--orca-surface-2)] mr-8">
              <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-amber-50 overflow-hidden">
                <Image 
                  src="/robot.png" 
                  alt="Lumo" 
                  width={24} 
                  height={24}
                  className="object-contain animate-bounce"
                />
              </div>
              <div className="flex items-center gap-2 text-sm text-[var(--orca-text-2)]">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Thinking...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Actions */}
        {messages.length <= 1 && (
          <div className="px-4 pb-3">
            <p className="text-xs text-[var(--orca-text-3)] mb-2">Quick actions:</p>
            <div className="flex flex-wrap gap-2">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.query}
                  onClick={() => sendMessage(action.query)}
                  className={cn(
                    "px-3 py-1.5 text-xs rounded-full",
                    "bg-gradient-to-r from-[var(--orca-surface-2)] to-[var(--orca-surface)]",
                    "border border-[var(--orca-border)] hover:border-[var(--orca-brand)]/50",
                    "text-[var(--orca-text-2)] hover:text-[var(--orca-brand)]",
                    "transition-all hover:shadow-md hover:scale-105 active:scale-95"
                  )}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div className="border-t border-[var(--orca-border)] p-4 bg-gradient-to-t from-[var(--orca-surface-2)]/50 to-transparent">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything..."
              disabled={isLoading}
              className={cn(
                "flex-1 px-4 py-2.5 rounded-xl border border-[var(--orca-border)]",
                "bg-[var(--orca-surface)] text-[var(--orca-text)]",
                "placeholder:text-[var(--orca-text-3)]",
                "focus:outline-none focus:ring-2 focus:ring-[var(--orca-brand)] focus:border-transparent",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "transition-all shadow-sm focus:shadow-md"
              )}
            />
            <Button
              onClick={() => sendMessage()}
              disabled={!input.trim() || isLoading}
              size="md"
              className="!rounded-xl !px-4 shadow-lg shadow-[var(--orca-brand)]/20"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-[10px] text-center text-[var(--orca-text-3)] mt-2">
            AI can make mistakes. Verify important information.
          </p>
        </div>
      </div>
    </>
  );
}

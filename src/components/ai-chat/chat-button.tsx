"use client";

import { useState, useEffect } from "react";
import { Sparkles } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils/cn";
import { ChatPanel } from "./chat-panel";

/**
 * AI Chat Button Component
 * Floating action button that opens the AI chat panel
 */
export function AiChatButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    // Small animation delay on mount
    const timer = setTimeout(() => setHasAnimated(true), 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 z-30",
          "flex h-14 w-14 items-center justify-center",
          "rounded-2xl bg-gradient-to-br from-[var(--orca-brand)] via-[color-mix(in_srgb,var(--orca-brand)_80%,purple)] to-[var(--orca-brand)]",
          "text-white",
          "shadow-xl shadow-[var(--orca-brand)]/30",
          "hover:shadow-2xl hover:shadow-[var(--orca-brand)]/40",
          "hover:scale-110 active:scale-95",
          "transition-all duration-300 ease-out",
          "group",
          "before:absolute before:inset-0 before:rounded-2xl before:bg-white/20 before:opacity-0 before:transition-opacity before:duration-300",
          "hover:before:opacity-100",
          // Entrance animation
          hasAnimated ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0",
          isOpen && "pointer-events-none opacity-0 scale-90"
        )}
        aria-label="Open Lumo"
      >
        {/* Glow effect */}
        <div className="absolute inset-0 rounded-2xl bg-[var(--orca-brand)] blur-xl opacity-40 group-hover:opacity-60 transition-opacity" />
        
        {/* Icon container */}
        <div className="relative z-10 flex items-center justify-center">
          <Image 
            src="/robot.png" 
            alt="Lumo" 
            width={32} 
            height={32}
            className="transition-transform group-hover:scale-110 group-hover:rotate-6"
          />
          <Sparkles
            className={cn(
              "absolute -top-2 -right-2 h-4 w-4",
              "text-yellow-300 drop-shadow-[0_0_4px_rgba(253,224,71,0.8)]",
              "animate-[pulse_2s_ease-in-out_infinite]"
            )}
          />
        </div>

        {/* Pulse ring animation */}
        <span className="absolute inset-0 rounded-2xl animate-ping bg-[var(--orca-brand)] opacity-20" style={{ animationDuration: '3s' }} />

        {/* Tooltip */}
        <span
          className={cn(
            "absolute right-full mr-4 px-3 py-2",
            "rounded-xl bg-[var(--orca-surface)] text-[var(--orca-text)]",
            "text-sm font-semibold shadow-xl border border-[var(--orca-border)]",
            "opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-100",
            "transition-all duration-200",
            "whitespace-nowrap pointer-events-none",
            "flex items-center gap-2"
          )}
        >
          <Sparkles className="h-4 w-4 text-[var(--orca-brand)]" />
          Lumo
        </span>
      </button>

      {/* Chat Panel */}
      <ChatPanel isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}

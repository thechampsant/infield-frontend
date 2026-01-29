"use client";

import { User, Copy, Check, Building2, FolderOpen, Activity } from "lucide-react";
import { useState, useMemo } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils/cn";
import type { ChatMessage as ChatMessageType, AgentAction } from "@/lib/api/ai-chat";

interface ChatMessageProps {
  message: ChatMessageType;
}

/**
 * Parse and render markdown-like content with beautiful styling
 */
function MarkdownContent({ content }: { content: string }) {
  const rendered = useMemo(() => {
    // Split content into lines for processing
    const lines = content.split("\n");
    const elements: React.ReactNode[] = [];
    let currentTable: string[][] = [];
    let inTable = false;
    let tableIndex = 0;

    const flushTable = () => {
      if (currentTable.length > 0) {
        elements.push(
          <div key={`table-${tableIndex++}`} className="my-3 overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-[var(--orca-surface-3)]">
                  {currentTable[0]?.map((cell, i) => (
                    <th
                      key={i}
                      className="px-3 py-2 text-left font-semibold text-[var(--orca-text)] border-b border-[var(--orca-border)]"
                    >
                      {cell.trim()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {currentTable.slice(1).map((row, rowIndex) => (
                  <tr
                    key={rowIndex}
                    className={cn(
                      "hover:bg-[var(--orca-surface-3)] transition-colors",
                      rowIndex % 2 === 0 ? "bg-[var(--orca-surface)]" : "bg-[var(--orca-surface-2)]"
                    )}
                  >
                    {row.map((cell, cellIndex) => (
                      <td
                        key={cellIndex}
                        className="px-3 py-2 text-[var(--orca-text-2)] border-b border-[var(--orca-border-light)]"
                      >
                        {formatCellContent(cell.trim())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        currentTable = [];
      }
      inTable = false;
    };

    lines.forEach((line, lineIndex) => {
      // Check if line is a table row
      if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
        // Skip separator rows
        if (line.includes("---")) {
          return;
        }
        inTable = true;
        const cells = line
          .split("|")
          .filter((cell) => cell.trim() !== "");
        currentTable.push(cells);
        return;
      }

      // If we were in a table and this line is not a table row, flush
      if (inTable) {
        flushTable();
      }

      // Handle headers
      if (line.startsWith("### ")) {
        elements.push(
          <h3 key={lineIndex} className="text-sm font-semibold text-[var(--orca-text)] mt-3 mb-1">
            {line.replace("### ", "")}
          </h3>
        );
        return;
      }
      if (line.startsWith("## ")) {
        elements.push(
          <h2 key={lineIndex} className="text-base font-bold text-[var(--orca-text)] mt-3 mb-1">
            {line.replace("## ", "")}
          </h2>
        );
        return;
      }

      // Handle bullet points
      if (line.trim().startsWith("• ") || line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
        const bulletContent = line.replace(/^[\s]*[•\-\*]\s*/, "");
        elements.push(
          <div key={lineIndex} className="flex items-start gap-2 ml-2 my-0.5">
            <span className="text-[var(--orca-brand)] mt-1">•</span>
            <span className="text-[var(--orca-text-2)]">{formatInlineContent(bulletContent)}</span>
          </div>
        );
        return;
      }

      // Handle code blocks (single backtick)
      if (line.includes("`") && !line.includes("```")) {
        elements.push(
          <p key={lineIndex} className="my-1 text-[var(--orca-text-2)]">
            {formatInlineContent(line)}
          </p>
        );
        return;
      }

      // Handle empty lines
      if (line.trim() === "") {
        elements.push(<div key={lineIndex} className="h-2" />);
        return;
      }

      // Regular paragraph
      elements.push(
        <p key={lineIndex} className="my-1 text-[var(--orca-text-2)] leading-relaxed">
          {formatInlineContent(line)}
        </p>
      );
    });

    // Flush any remaining table
    if (inTable) {
      flushTable();
    }

    return elements;
  }, [content]);

  return <div className="text-sm">{rendered}</div>;
}

/**
 * Format cell content with status badges and special styling
 */
function formatCellContent(content: string): React.ReactNode {
  // Status badges
  if (content === "ACTIVE") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--orca-brand-2-light)] text-[var(--orca-brand-2)]">
        ● Active
      </span>
    );
  }
  if (content === "INACTIVE") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--orca-brand-4-light)] text-[var(--orca-brand-4)]">
        ○ Inactive
      </span>
    );
  }

  // Account codes
  if (content.startsWith("ACC-")) {
    return (
      <span className="inline-flex items-center gap-1 font-mono text-[var(--orca-brand)]">
        <Building2 className="w-3 h-3" />
        {content}
      </span>
    );
  }

  // Project codes
  if (content.startsWith("PRJ-")) {
    return (
      <span className="inline-flex items-center gap-1 font-mono text-[var(--orca-brand)]">
        <FolderOpen className="w-3 h-3" />
        {content}
      </span>
    );
  }

  // Email addresses
  if (content.includes("@")) {
    return <span className="text-[var(--orca-text-2)]">{content}</span>;
  }

  return content;
}

/**
 * Format inline content (bold, code, etc.)
 */
function formatInlineContent(text: string): React.ReactNode {
  // Handle **bold**
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-semibold text-[var(--orca-text)]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={index}
          className="px-1.5 py-0.5 rounded bg-[var(--orca-surface-3)] text-[var(--orca-brand)] font-mono text-xs"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

export function ChatMessage({ message }: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={cn(
        "flex gap-3 p-3 rounded-xl transition-all",
        isUser
          ? "bg-gradient-to-r from-[var(--orca-brand)] to-[color-mix(in_srgb,var(--orca-brand)_80%,purple)] text-white ml-8 shadow-md shadow-[var(--orca-brand)]/20"
          : "bg-[var(--orca-surface)] border border-[var(--orca-border)] mr-4 shadow-sm"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-inner overflow-hidden",
          isUser
            ? "bg-white/20 backdrop-blur-sm"
            : "bg-gradient-to-br from-amber-100 to-amber-50"
        )}
      >
        {isUser ? (
          <User className="w-4 h-4" />
        ) : (
          <Image 
            src="/robot.png" 
            alt="Lumo" 
            width={24} 
            height={24}
            className="object-contain"
          />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {isUser ? (
          <div className="text-sm">{message.content}</div>
        ) : (
          <MarkdownContent content={message.content} />
        )}

        {/* Actions performed */}
        {message.actions && message.actions.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {message.actions.map((action, index) => (
              <ActionBadge key={index} action={action} />
            ))}
          </div>
        )}

        {/* Timestamp & Copy */}
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-[var(--orca-border-light)]">
          <span
            className={cn(
              "text-xs",
              isUser ? "text-white/60" : "text-[var(--orca-text-3)]"
            )}
          >
            {new Date(message.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>

          {!isUser && (
            <button
              onClick={copyToClipboard}
              className={cn(
                "p-1 rounded-md hover:bg-[var(--orca-surface-2)] transition-all",
                "text-[var(--orca-text-3)] hover:text-[var(--orca-text)]",
                "hover:scale-110 active:scale-95"
              )}
              title="Copy message"
            >
              {copied ? (
                <Check className="w-3 h-3 text-[var(--orca-brand-2)]" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ActionBadge({ action }: { action: AgentAction }) {
  const getActionStyle = (type: string) => {
    if (type.includes("CREATE")) {
      return {
        bg: "bg-gradient-to-r from-[var(--orca-brand-2-light)] to-[var(--orca-brand-2)]/20",
        text: "text-[var(--orca-brand-2)]",
        icon: <Activity className="w-3 h-3" />,
      };
    }
    if (type.includes("UPDATE")) {
      return {
        bg: "bg-gradient-to-r from-[var(--orca-brand-3-light)] to-[var(--orca-brand-3)]/20",
        text: "text-[var(--orca-brand-3)]",
        icon: <Activity className="w-3 h-3" />,
      };
    }
    if (type.includes("DELETE")) {
      return {
        bg: "bg-gradient-to-r from-[var(--orca-brand-4-light)] to-[var(--orca-brand-4)]/20",
        text: "text-[var(--orca-brand-4)]",
        icon: <Activity className="w-3 h-3" />,
      };
    }
    return {
      bg: "bg-gradient-to-r from-[var(--orca-brand-light)] to-[var(--orca-brand)]/20",
      text: "text-[var(--orca-brand)]",
      icon: <Activity className="w-3 h-3" />,
    };
  };

  const style = getActionStyle(action.type);

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium shadow-sm",
        style.bg,
        style.text
      )}
    >
      {style.icon}
      <span>{action.type.replace(/_/g, " ")}</span>
      {action.entityCode && (
        <span className="opacity-75 font-mono">• {action.entityCode}</span>
      )}
    </div>
  );
}

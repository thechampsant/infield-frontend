/**
 * AI Chat API Service
 * Handles communication with the AI Agent backend
 */

import { apiClient } from "./api-client";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  actions?: AgentAction[];
}

export interface AgentAction {
  type: string;
  entityId?: string;
  entityCode?: string;
  details?: Record<string, unknown>;
}

export interface ChatRequest {
  message: string;
  sessionId?: string;
  currentPage?: string;
}

export interface ChatResponse {
  response: string;
  sessionId: string;
  actions?: AgentAction[];
  suggestions?: string[];
  confirmationRequired?: {
    action: string;
    entityId: string;
    message: string;
  };
}

export interface AiAgentStatus {
  available: boolean;
  message: string;
}

/**
 * AI Chat Service
 */
class AiChatService {
  private sessionId: string | null = null;

  /**
   * Send a message to the AI agent
   */
  async sendMessage(message: string, currentPage?: string): Promise<ChatResponse> {
    const response = await apiClient.post<ChatResponse>("/api/v1/ai/chat", {
      message,
      sessionId: this.sessionId,
      currentPage,
    });

    // Store session ID for conversation continuity
    this.sessionId = response.sessionId;

    return response;
  }

  /**
   * Check if AI agent is available
   */
  async getStatus(): Promise<AiAgentStatus> {
    return apiClient.post<AiAgentStatus>("/api/v1/ai/status");
  }

  /**
   * Clear the current session
   */
  async clearSession(): Promise<void> {
    if (this.sessionId) {
      try {
        await apiClient.delete(`/api/v1/ai/session/${this.sessionId}`);
      } catch {
        // Ignore errors when clearing session
      }
      this.sessionId = null;
    }
  }

  /**
   * Get the current session ID
   */
  getSessionId(): string | null {
    return this.sessionId;
  }

  /**
   * Start a new session
   */
  newSession(): void {
    this.sessionId = null;
  }
}

export const aiChatService = new AiChatService();

import type { ChatMessage } from '../models/types';
import { getBackendUrl } from './apiConfig';

export class ChatbotService {
  async sendMessage(messages: ChatMessage[], workspaceId: string): Promise<ChatMessage> {
    const response = await fetch(`${getBackendUrl()}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        workspace_id: workspaceId,
      }),
    });

    if (!response.ok) {
      throw new Error(`Chat API failed with status: ${response.status}`);
    }

    const data = await response.json();
    return {
      id: `msg_b_${Date.now()}`,
      role: 'assistant',
      content: data.content,
      timestamp: new Date().toISOString(),
    };
  }
}

export const chatbotService = new ChatbotService();

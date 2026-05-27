import type { ChatMessage } from '../models/types';

export const MOCK_INITIAL_CHAT: ChatMessage[] = [
  {
    id: 'msg_1',
    role: 'assistant',
    content: 'Hello! I am your AI knowledge assistant. How can I help you find information today?',
    timestamp: new Date().toISOString()
  }
];

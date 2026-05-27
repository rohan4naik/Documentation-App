import { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { chatbotService } from '../services/ChatbotService';

export function useChatbotViewModel() {
  const { chatMessages, addChatMessage, clearChatMessages, isChatbotOpen, toggleChatbot, selectedWorkspaceId, workspaces } = useAppStore();
  const [isTyping, setIsTyping] = useState(false);

  const sendMessage = async (content: string) => {
    if (!content.trim()) return;

    const userMsg = {
      id: `msg_u_${Date.now()}`,
      role: 'user' as const,
      content,
      timestamp: new Date().toISOString()
    };

    addChatMessage(userMsg);
    setIsTyping(true);

    try {
      const workspaceId = selectedWorkspaceId || workspaces[0]?.id || '';
      const response = await chatbotService.sendMessage([...chatMessages, userMsg], workspaceId);
      addChatMessage(response);
    } catch (error) {
      console.error("Failed to send message", error);
      addChatMessage({
        id: `msg_err_${Date.now()}`,
        role: 'system',
        content: 'Error: Failed to connect to AI assistant.',
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsTyping(false);
    }
  };

  return {
    chatMessages,
    isTyping,
    isOpen: isChatbotOpen,
    toggleOpen: toggleChatbot,
    sendMessage,
    resetChat: clearChatMessages
  };
}

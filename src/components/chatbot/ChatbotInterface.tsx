import { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Pressable, Image } from 'react-native';
import { X, Send, User, Loader2, RotateCcw } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Input } from '../ui/Input';
import { useChatbotViewModel } from '../../viewmodels/useChatbotViewModel';
import Animated, { FadeInUp, FadeOutDown } from 'react-native-reanimated';

export function ChatbotInterface() {
  const { chatMessages, isTyping, isOpen, toggleOpen, sendMessage, resetChat } = useChatbotViewModel();
  const [input, setInput] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [chatMessages, isTyping, isOpen]);

  const handleSubmit = () => {
    if (input.trim() && !isTyping) {
      sendMessage(input);
      setInput('');
    }
  };

  if (!isOpen) {
    return (
      <Pressable style={[styles.fab, { bottom: 60 + insets.bottom + 16 }]} onPress={toggleOpen}>
        <View style={styles.fabImageContainer}>
          <Image 
            source={require('../../../assets/images/chatbot.jpg')} 
            style={styles.fabImage}
            resizeMode="cover"
          />
        </View>
      </Pressable>
    );
  }

  return (
    <Animated.View 
      entering={FadeInUp.duration(300)} 
      exiting={FadeOutDown.duration(200)}
      style={styles.container}
    >
      <KeyboardAvoidingView 
        style={styles.keyboardView} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image 
              source={require('../../../assets/images/chatbot.jpg')} 
              style={styles.headerBotImage}
              resizeMode="cover"
            />
            <View>
              <Text style={styles.headerTitle}>AI Assistant</Text>
              <Text style={styles.headerSubtitle}>Powered by Gemini</Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <Pressable onPress={resetChat} style={styles.resetButton}>
              <RotateCcw color="#94a3b8" size={18} />
            </Pressable>
            <Pressable onPress={toggleOpen} style={styles.closeButton}>
              <X color="#94a3b8" size={20} />
            </Pressable>
          </View>
        </View>

        {/* Messages */}
        <ScrollView 
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
        >
          {chatMessages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <View key={msg.id} style={[styles.messageRow, isUser ? styles.messageRowUser : styles.messageRowBot]}>
                {isUser ? (
                  <View style={[styles.avatar, styles.avatarUser]}>
                    <User color="#475569" size={16} />
                  </View>
                ) : (
                  <Image 
                    source={require('../../../assets/images/chatbot.jpg')} 
                    style={styles.avatarImage}
                  />
                )}
                <View style={[styles.messageBubble, isUser ? styles.messageBubbleUser : styles.messageBubbleBot]}>
                  <Text style={[styles.messageText, isUser ? styles.messageTextUser : styles.messageTextBot]}>
                    {msg.content}
                  </Text>
                </View>
              </View>
            );
          })}
          
          {isTyping && (
            <View style={[styles.messageRow, styles.messageRowBot]}>
              <Image 
                source={require('../../../assets/images/chatbot.jpg')} 
                style={styles.avatarImage}
              />
              <View style={[styles.messageBubble, styles.messageBubbleBot, styles.typingBubble]}>
                <Loader2 color="#64748b" size={16} />
                <Text style={styles.typingText}>Thinking...</Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input */}
        <View style={[styles.inputSection, { paddingBottom: insets.bottom > 0 ? insets.bottom + 8 : 16 }]}>
          <Input
            value={input}
            onChangeText={setInput}
            placeholder="Ask a question..."
            containerStyle={styles.inputContainer}
            editable={!isTyping}
            onSubmitEditing={handleSubmit}
          />
          <Pressable 
            style={[styles.sendButton, (!input.trim() || isTyping) && styles.sendButtonDisabled]} 
            onPress={handleSubmit}
            disabled={!input.trim() || isTyping}
          >
            <Send color={!input.trim() || isTyping ? "#94a3b8" : "#fff"} size={18} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
    zIndex: 50,
  },
  fabImageContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#3b82f6',
  },
  fabImage: {
    width: '100%',
    height: '100%',
  },
  headerBotImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  avatarImage: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginHorizontal: 8,
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '85%',
    backgroundColor: '#ffffff', // white
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 20,
    zIndex: 50,
    borderWidth: 1,
    borderColor: '#e2e8f0', // slate-200
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0', // slate-200
    backgroundColor: '#ffffff', // white header
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  botIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b', // slate-800
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748b', // slate-500
  },
  closeButton: {
    padding: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  resetButton: {
    padding: 8,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    gap: 16,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 16,
    maxWidth: '85%',
  },
  messageRowUser: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
  },
  messageRowBot: {
    alignSelf: 'flex-start',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  avatarUser: {
    backgroundColor: '#f1f5f9', // slate-100
  },
  avatarBot: {
    backgroundColor: '#2563eb',
  },
  messageBubble: {
    padding: 12,
    borderRadius: 16,
  },
  messageBubbleUser: {
    backgroundColor: '#2563eb',
    borderBottomRightRadius: 4,
  },
  messageBubbleBot: {
    backgroundColor: '#f1f5f9', // slate-100
    borderWidth: 1,
    borderColor: '#e2e8f0', // slate-200
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  messageTextUser: {
    color: '#ffffff',
  },
  messageTextBot: {
    color: '#334155', // slate-700
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typingText: {
    color: '#64748b',
    fontSize: 14,
  },
  inputSection: {
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0', // slate-200
    backgroundColor: '#ffffff', // white input panel
  },
  inputContainer: {
    flex: 1,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#f1f5f9', // slate-100
  },
});

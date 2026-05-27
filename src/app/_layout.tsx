import { useEffect, useRef } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ChatbotInterface } from '../components/chatbot/ChatbotInterface';
import { View } from 'react-native';
import { supabase } from '../services/supabaseClient';
import { useAppStore } from '../store/useAppStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { documentService } from '../services/DocumentService';

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { user, setUser } = useAppStore();

  useEffect(() => {
    const handleAuthError = async (errMessage: string) => {
      console.warn('Auth session error, clearing stale cache:', errMessage);
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.warn('Supabase signOut failed on auth error:', e);
      }
      try {
        const keys = await AsyncStorage.getAllKeys();
        const sbKeys = keys.filter(key => key.startsWith('sb-') || key.includes('supabase') || key.includes('auth-token'));
        if (sbKeys.length > 0) {
          await AsyncStorage.multiRemove(sbKeys);
        }
      } catch (e) {
        console.warn('AsyncStorage multiRemove failed on auth error:', e);
      }
      setUser(null);
    };

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        handleAuthError(error.message);
        return;
      }
      if (session?.user) {
        setUser({
          id: session.user.id,
          name: session.user.email?.split('@')[0] || 'User',
          email: session.user.email || '',
          avatarUrl: 'https://ui-avatars.com/api/?name=' + (session.user.email?.charAt(0) || 'U'),
        });
      } else {
        setUser(null);
      }
    }).catch((err) => {
      handleAuthError(err?.message || String(err));
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
      } else if (session?.user) {
        setUser({
          id: session.user.id,
          name: session.user.email?.split('@')[0] || 'User',
          email: session.user.email || '',
          avatarUrl: 'https://ui-avatars.com/api/?name=' + (session.user.email?.charAt(0) || 'U'),
        });
      } else {
        setUser(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    // Basic routing logic
    const inAuthGroup = segments[0] === 'login' || segments[0] === 'signup';
    
    if (!user && !inAuthGroup) {
      router.replace('/login');
    } else if (user && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [user, segments]);

  // ── App-level Realtime subscription (created ONCE per login) ────────────────
  // Lives here so multiple screens sharing useDocumentsViewModel never
  // accidentally create duplicate channels for the same table.
  const realtimeChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!user?.id) {
      // User logged out — tear down the channel
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
        realtimeChannelRef.current = null;
      }
      return;
    }

    // Avoid creating a duplicate channel on re-renders
    if (realtimeChannelRef.current) return;

    const channel = supabase
      .channel('app_documents_realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'documents' },
        async () => {
          // Full refetch so RLS filters only accessible documents
          const { user: currentUser, setDocuments } = useAppStore.getState();
          if (!currentUser?.id) return;
          const docs = await documentService.getDocuments(currentUser.id);
          setDocuments(docs);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'documents' },
        (payload) => {
          const updated = payload.new as any;
          const { documents: currentDocs, setDocuments } = useAppStore.getState();
          const exists = currentDocs.some((d) => d.id === updated.id);
          if (exists) {
            setDocuments(
              currentDocs.map((d) =>
                d.id === updated.id
                  ? {
                      ...d,
                      title: updated.title ?? d.title,
                      excerpt: updated.excerpt ?? d.excerpt,
                      updatedAt: updated.updated_at ?? d.updatedAt,
                    }
                  : d
              )
            );
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'documents' },
        (payload) => {
          useAppStore.getState().deleteDocument((payload.old as any).id);
        }
      )
      .subscribe();

    realtimeChannelRef.current = channel;

    return () => {
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
        realtimeChannelRef.current = null;
      }
    };
  }, [user?.id]);

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: '#f5f5f7' }}>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#f5f5f7' }
          }}
        >
          <Stack.Screen name="login" />
          <Stack.Screen name="signup" />
          <Stack.Screen name="(tabs)" />
        </Stack>
        {user && <ChatbotInterface />}
      </View>
    </SafeAreaProvider>
  );
}

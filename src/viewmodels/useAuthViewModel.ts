import { useState } from 'react';
import { Alert } from 'react-native';
import { supabase } from '../services/supabaseClient';

export function useAuthViewModel() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const login = async (onSuccess: () => void) => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);
    if (error) {
      Alert.alert('Login Failed', error.message);
    } else {
      onSuccess();
    }
  };

  const signup = async (onSuccess: (sessionExists: boolean) => void) => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter both email and password');
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    setLoading(false);
    if (error) {
      Alert.alert('Signup Failed', error.message);
    } else {
      onSuccess(!!data?.session);
    }
  };

  return {
    email,
    setEmail,
    password,
    setPassword,
    loading,
    login,
    signup,
  };
}

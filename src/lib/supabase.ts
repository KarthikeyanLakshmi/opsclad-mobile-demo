import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const EXPO_EXTRA = Constants.expoConfig?.extra ?? {};

const supabaseUrl = EXPO_EXTRA.supabaseUrl;
const supabaseAnonKey = EXPO_EXTRA.supabaseAnonKey;

if (!supabaseUrl) console.error("❌ Missing Supabase URL");
if (!supabaseAnonKey) console.error("❌ Missing Supabase Key");

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});

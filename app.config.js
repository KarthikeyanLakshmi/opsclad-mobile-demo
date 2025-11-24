import 'dotenv/config';

export default {
  expo: {
    name: "OpsCladMobile",
    slug: "opsclad-mobile",
    extra: {
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
      apiBaseUrl: process.env.API_BASE_URL,
    },
  },
  
};
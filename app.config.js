import 'dotenv/config';

export default {
  expo: {
    owner:"klakshminarayanan",
    name: "OpsCladMobile",
    slug: "opsclad-mobile",

    android: {
      package: "com.klakshminarayanan.opscladmobile",
      versionCode: 1,
    },

    ios: {
      bundleIdentifier: "com.klakshminarayanan.opscladmobile",
      buildNumber: "1.0.0",
    },  

    extra: {
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
      apiBaseUrl: process.env.API_BASE_URL,
      eas: {
        projectId: "dd077a3b-dab8-4af2-be95-f629afb8c6aa"
      }
    },
  },
  
};
import "dotenv/config";

export default {
  expo: {
    owner: "klakshminarayanan",
    name: "OpsCladMobile",
    slug: "opsclad-mobile",
    version: "1.0.0",

    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "opscladmobiledemo",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,

    ios: {
      bundleIdentifier: "com.klakshminarayanan.opscladmobile",
      buildNumber: "1.0.0",
      supportsTablet: true,
    },

    android: {
      package: "com.klakshminarayanan.opscladmobile",
      versionCode: 1,

      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundImage: "./assets/images/android-icon-background.png",
        monochromeImage: "./assets/images/android-icon-monochrome.png",
      },

      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
    },

    web: {
      output: "static",
      favicon: "./assets/images/favicon.png",
    },

    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#ffffff",
          dark: {
            backgroundColor: "#000000",
          },
        },
      ],
    ],

    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },

    extra: {
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
      apiBaseUrl: process.env.API_BASE_URL,
      eas: {
        projectId: "dd077a3b-dab8-4af2-be95-f629afb8c6aa",
      },
    },
  },
};

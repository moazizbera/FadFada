import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.fadfada.app",
  appName: "FadFada",
  webDir: "www",
  server: {
    url: "https://fad-fada.vercel.app",
    cleartext: false,
  },
  android: {
    allowMixedContent: false,
    backgroundColor: "#0E0D10",
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
    CapacitorCookies: {
      enabled: true,
    },
  },
};

export default config;

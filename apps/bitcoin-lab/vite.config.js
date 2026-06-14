import { defineConfig } from "vite";

export default defineConfig({
  server: {
    proxy: {
      "/api/candles": {
        target: "https://api.upbit.com",
        changeOrigin: true,
        rewrite: (path) => path.replace("/api/candles", "/v1/candles/minutes/15"),
      },
    },
  },
});

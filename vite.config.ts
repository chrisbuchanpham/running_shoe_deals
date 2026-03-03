import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "./",
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: "./src/setupTests.ts",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx", "scripts/**/*.test.ts"]
  }
});

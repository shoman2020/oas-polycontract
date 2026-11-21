import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  testMatch: "**/*.spec.mjs",
  reporter: "list",
  workers: 1,
  use: {
    baseURL: process.env.API_BASE_URL,
  },
});


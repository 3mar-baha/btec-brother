import { defineConfig, devices } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";

// Point the dev server at the STAGING Supabase project (never production).
// Next.js gives shell env vars precedence over .env.local, so loading these
// into process.env ensures `next dev` talks to staging.
const stagingPath = path.resolve(process.cwd(), ".env.staging");
for (const line of readFileSync(stagingPath, "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}

const PORT = 3100;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npm run dev -- -p ${PORT}`,
    url: `${BASE_URL}/login`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});

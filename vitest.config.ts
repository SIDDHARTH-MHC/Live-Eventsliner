import { defineConfig } from "vitest/config";
import path from "path";
import { readFileSync, existsSync } from "fs";

/** Load .env into process.env without overriding an explicit DATABASE_URL for tests. */
function loadEnvFile() {
  const envPath = path.resolve(__dirname, ".env");
  if (!existsSync(envPath)) return;
  const text = readFileSync(envPath, "utf8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq);
    let value = trimmed.slice(eq + 1);
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    // Prefer .env for local app DB; allow TEST_DATABASE_URL override
    if (key === "DATABASE_URL" && process.env.TEST_DATABASE_URL) {
      process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
      continue;
    }
    if (key === "DATABASE_URL") {
      process.env.DATABASE_URL = value;
      continue;
    }
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadEnvFile();

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});

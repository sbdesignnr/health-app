import { defineConfig } from "prisma/config";

// Prisma 7 už nenačítava .env automaticky – pre CLI (migrácie / db push /
// studio) načítame .env.local ručne. Beh appky si env berie z Next.js.
try {
  process.loadEnvFile(".env.local");
} catch {
  // .env.local nemusí existovať (napr. CI s premennými v prostredí)
}

export default defineConfig({
  schema: "./prisma/schema.prisma",
  datasource: {
    // DIRECT pripojenie pre migrácie (Supabase port 5432, nie pgbouncer).
    // Placeholder umožní `prisma generate` aj bez env – generate sa k DB nepripája.
    url:
      process.env.DIRECT_URL ??
      "postgresql://placeholder:placeholder@localhost:5432/postgres",
  },
});

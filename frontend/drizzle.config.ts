import type { Config } from "drizzle-kit";

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "postgres://stockpulse:stockpulse_secret@localhost:5432/stockpulse",
  },
} satisfies Config;

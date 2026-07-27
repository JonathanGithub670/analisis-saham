import {
  pgTable,
  varchar,
  text,
  timestamp,
  uuid,
  integer,
  serial,
  bigint,
  doublePrecision,
  date,
  boolean,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

// ── Users ──────────────────────────────────────────────
export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    username: varchar("username", { length: 100 }).notNull(),
    passwordHash: text("password_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("idx_users_email").on(table.email)]
);

// ── Refresh Tokens ─────────────────────────────────────
export const refreshTokens = pgTable("refresh_tokens", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revoked: boolean("revoked").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ── Stocks ─────────────────────────────────────────────
export const stocks = pgTable(
  "stocks",
  {
    id: serial("id").primaryKey(),
    symbol: varchar("symbol", { length: 20 }).notNull().unique(),
    name: varchar("name", { length: 255 }).notNull(),
    exchange: varchar("exchange", { length: 50 }),
    sector: varchar("sector", { length: 100 }),
    currency: varchar("currency", { length: 10 }).default("USD"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [index("idx_stocks_symbol").on(table.symbol)]
);

// ── Price History ──────────────────────────────────────
export const priceHistory = pgTable(
  "price_history",
  {
    id: bigint("id", { mode: "number" }).notNull(),
    symbol: varchar("symbol", { length: 20 }).notNull(),
    date: date("date").notNull(),
    open: doublePrecision("open").notNull(),
    high: doublePrecision("high").notNull(),
    low: doublePrecision("low").notNull(),
    close: doublePrecision("close").notNull(),
    volume: bigint("volume", { mode: "number" }).default(0).notNull(),
  },
  (table) => [
    uniqueIndex("price_history_symbol_date_key").on(table.symbol, table.date),
    index("idx_price_history_symbol").on(table.symbol),
    index("idx_price_history_symbol_date").on(table.symbol, table.date.desc()),
  ]
);

// ── Indicators ─────────────────────────────────────────
export const indicators = pgTable(
  "indicators",
  {
    id: serial("id").primaryKey(),
    symbol: varchar("symbol", { length: 20 }).notNull(),
    rsi: doublePrecision("rsi"),
    macdLine: doublePrecision("macd_line"),
    macdSignal: doublePrecision("macd_signal"),
    macdHistogram: doublePrecision("macd_histogram"),
    ma20: doublePrecision("ma20"),
    ma50: doublePrecision("ma50"),
    volumeAvg: doublePrecision("volume_avg"),
    volumeTrend: varchar("volume_trend", { length: 20 }),
    calculatedAt: timestamp("calculated_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("indicators_symbol_key").on(table.symbol)]
);

// ── Signals ────────────────────────────────────────────
export const signals = pgTable("signals", {
  id: serial("id").primaryKey(),
  symbol: varchar("symbol", { length: 20 }).notNull(),
  signal: varchar("signal", { length: 20 }).notNull(),
  confidence: doublePrecision("confidence").default(0).notNull(),
  reasons: text("reasons"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── Notifications ──────────────────────────────────────
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").references(() => users.id),
  type: varchar("type", { length: 50 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message"),
  symbol: varchar("symbol", { length: 20 }),
  read: boolean("read").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ── Watchlist ──────────────────────────────────────────
export const watchlist = pgTable(
  "watchlist",
  {
    id: serial("id").primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id),
    symbol: varchar("symbol", { length: 20 }).notNull(),
    name: varchar("name", { length: 255 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("watchlist_user_symbol_key").on(table.userId, table.symbol),
  ]
);

// ── User API Keys ───────────────────────────────────────
export const apiKeys = pgTable(
  "user_api_keys",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    provider: varchar("provider", { length: 20 }).notNull(),
    apiKey: text("api_key").notNull(),
    model: varchar("model", { length: 60 }),
    isValid: boolean("is_valid").default(false).notNull(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    // One key per platform per user (platform auto-detected from the key).
    uniqueIndex("idx_user_api_keys_user_provider_unique").on(table.userId, table.provider),
    index("idx_user_api_keys_user_id").on(table.userId),
  ]
);

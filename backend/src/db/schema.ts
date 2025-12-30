import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';

// Users table
export const users = sqliteTable('users', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  displayName: text('display_name'),
  roles: text('roles').notNull().default('["viewer"]'), // JSON array
  preferredThemeId: text('preferred_theme_id').references(() => themes.id),
  preferredStyleMode: text('preferred_style_mode'),
  hideLogo: integer('hide_logo', { mode: 'boolean' }).default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date())
});

// Roles table
export const roles = sqliteTable('roles', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  name: text('name').notNull().unique(),
  description: text('description'),
  permissions: text('permissions').notNull(), // JSON array of permissions
  isSystem: integer('is_system', { mode: 'boolean' }).default(false), // System roles cannot be deleted
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date())
});

// Themes table
export const themes = sqliteTable('themes', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  name: text('name').notNull(),
  author: text('author'),
  variant: text('variant').default('dark'), // 'dark' | 'light'
  isCustom: integer('is_custom', { mode: 'boolean' }).default(false),
  baseScheme: text('base_scheme').notNull().default('base16'), // 'base16' | 'base24'
  tokens: text('tokens').notNull(), // JSON object
  styleMode: text('style_mode').notNull().default('glassmorphic'), // 'glassmorphic' | 'neobrutal' | etc.
  useGlobalBackground: integer('use_global_background', { mode: 'boolean' }).default(true),
  backgroundType: text('background_type'), // 'color' | 'image' | 'pexels'
  backgroundValue: text('background_value'),
  backgroundBlur: integer('background_blur'),
  backgroundOpacity: integer('background_opacity'),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date())
});

// Boards table
export const boards = sqliteTable('boards', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  themeId: text('theme_id').references(() => themes.id),
  defaultLayout: text('default_layout').notNull().default('grid'), // 'grid' | 'freeform'
  isLocked: integer('is_locked', { mode: 'boolean' }).default(false),
  order: integer('order').notNull().default(0), // Order of boards (leftmost = 0 = home board)
  icon: text('icon'), // FontAwesome icon name (e.g., 'faHome', 'faServer', etc.)
  customCss: text('custom_css'), // Custom CSS for this board
  createdBy: text('created_by').notNull().references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date())
});

// Tabs table (new - for organizing cards within a board)
export const tabs = sqliteTable('tabs', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  boardId: text('board_id').notNull().references(() => boards.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  order: integer('order').notNull().default(0),
  backgroundImage: text('background_image'), // URL or path to background image
  backgroundBlur: integer('background_blur').default(0), // Blur amount in pixels
  backgroundOpacity: integer('background_opacity').default(100), // 0-100
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date())
}, (table) => ({
  // Composite index for efficiently querying ordered tabs by board
  boardOrderIdx: index('idx_tabs_board_order').on(table.boardId, table.order)
}));

// Zones table
export const zones = sqliteTable('zones', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  tabId: text('tab_id').notNull().references(() => tabs.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  order: integer('order').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date())
}, (table) => ({
  // Composite index for efficiently querying ordered zones by tab
  tabOrderIdx: index('idx_zones_tab_order').on(table.tabId, table.order)
}));

// Cards table
export const cards = sqliteTable('cards', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  zoneId: text('zone_id').notNull().references(() => zones.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  subtitle: text('subtitle'),
  serviceType: text('service_type'),

  // Icon config (JSON)
  iconSource: text('icon_source').default('catalog'), // 'catalog' | 'custom'
  iconCatalogId: text('icon_catalog_id'),
  iconKey: text('icon_key'),
  iconCustomUrl: text('icon_custom_url'),

  // Layout (stored as individual columns for easier querying)
  layoutX: integer('layout_x').notNull().default(0),
  layoutY: integer('layout_y').notNull().default(0),
  layoutW: integer('layout_w').notNull().default(1),
  layoutH: integer('layout_h').notNull().default(1),
  layoutMinW: integer('layout_min_w'),
  layoutMinH: integer('layout_min_h'),
  layoutMaxW: integer('layout_max_w'),
  layoutMaxH: integer('layout_max_h'),
  layoutLocked: integer('layout_locked', { mode: 'boolean' }).default(false),

  // Style (JSON for flexibility)
  style: text('style'), // JSON object for CardStyle

  // Widgets (JSON array)
  widgets: text('widgets'), // JSON array

  // Meta (JSON object)
  meta: text('meta'),

  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date())
});

// Refresh tokens table
export const refreshTokens = sqliteTable('refresh_tokens', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date())
}, (table) => ({
  // Index for token cleanup queries that delete expired tokens
  expiresAtIdx: index('idx_refresh_tokens_expires_at').on(table.expiresAt)
}));

// App settings table (global settings)
export const appSettings = sqliteTable('app_settings', {
  id: text('id').primaryKey().default('global'),
  globalCustomCss: text('global_custom_css'), // Global custom CSS applied to all boards
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date())
});

// Credentials table - stores encrypted API keys, passwords, tokens, etc.
export const credentials = sqliteTable('credentials', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(), // User-friendly name (e.g., "My Plex Server", "Work Calendar")
  serviceType: text('service_type').notNull(), // 'plex', 'jellyfin', 'caldav', 'ics', etc.
  encryptedData: text('encrypted_data').notNull(), // AES-256-GCM encrypted JSON data
  metadata: text('metadata'), // Optional JSON metadata (not encrypted, e.g., { "serverUrl": "..." })
  createdAt: integer('created_at', { mode: 'timestamp' }).$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).$defaultFn(() => new Date())
}, (table) => ({
  // Index for efficiently querying credentials by user and service type
  userServiceIdx: index('idx_credentials_user_service').on(table.userId, table.serviceType)
}));

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  boards: many(boards),
  refreshTokens: many(refreshTokens),
  credentials: many(credentials)
}));

export const boardsRelations = relations(boards, ({ one, many }) => ({
  creator: one(users, {
    fields: [boards.createdBy],
    references: [users.id]
  }),
  theme: one(themes, {
    fields: [boards.themeId],
    references: [themes.id]
  }),
  tabs: many(tabs)
}));

export const tabsRelations = relations(tabs, ({ one, many }) => ({
  board: one(boards, {
    fields: [tabs.boardId],
    references: [boards.id]
  }),
  zones: many(zones)
}));

export const zonesRelations = relations(zones, ({ one, many }) => ({
  tab: one(tabs, {
    fields: [zones.tabId],
    references: [tabs.id]
  }),
  cards: many(cards)
}));

export const cardsRelations = relations(cards, ({ one }) => ({
  zone: one(zones, {
    fields: [cards.zoneId],
    references: [zones.id]
  })
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, {
    fields: [refreshTokens.userId],
    references: [users.id]
  })
}));

export const credentialsRelations = relations(credentials, ({ one }) => ({
  user: one(users, {
    fields: [credentials.userId],
    references: [users.id]
  })
}));

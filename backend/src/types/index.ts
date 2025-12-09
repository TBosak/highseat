import type { users, boards, tabs, zones, cards, themes, roles } from '../db/schema';

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Role = typeof roles.$inferSelect;
export type NewRole = typeof roles.$inferInsert;

export type Board = typeof boards.$inferSelect;
export type NewBoard = typeof boards.$inferInsert;

export type Tab = typeof tabs.$inferSelect;
export type NewTab = typeof tabs.$inferInsert;

export type Zone = typeof zones.$inferSelect;
export type NewZone = typeof zones.$inferInsert;

export type Card = typeof cards.$inferSelect;
export type NewCard = typeof cards.$inferInsert;

export type Theme = typeof themes.$inferSelect;
export type NewTheme = typeof themes.$inferInsert;

export type StyleMode = 'glassmorphic' | 'neobrutal' | 'minimal' | 'clay' | 'custom';

export type Permission =
  | 'board:view'
  | 'board:edit'
  | 'board:design'
  | 'card:add'
  | 'card:edit'
  | 'card:delete'
  | 'theme:edit'
  | 'role:manage'
  | 'user:manage';

export interface CardStyle {
  borderRadius?: number;
  borderWidth?: number;
  borderStyle?: 'none' | 'solid' | 'dashed';
  borderColorToken?: string;
  backgroundToken?: string;
  textColorToken?: string;
  elevation?: number;
  glassmorphic?: {
    blur?: number;
    transparency?: number;
    borderHighlight?: boolean;
  };
  neobrutal?: {
    thickBorder?: boolean;
    dropShadow?: boolean;
    cornerCut?: boolean;
  };
}

export interface CardWidget {
  type: 'link' | 'status' | 'iframe' | 'metric' | 'custom';
  config: Record<string, any>;
}

export interface JWTPayload {
  userId: string;
  username: string;
  roles: string[];
}

export type AuthEnv = {
  Variables: {
    user: JWTPayload;
  };
};
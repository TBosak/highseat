export interface User {
  id: string;
  username: string;
  email?: string;
  displayName?: string;
  roles: string[];
  preferredThemeId?: string;
  preferredStyleMode?: StyleMode;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface Board {
  id: string;
  name: string;
  slug: string;
  themeId?: string;
  defaultLayout: 'grid' | 'freeform';
  isLocked: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  tabs?: Tab[];
  theme?: Theme;
}

export interface Tab {
  id: string;
  boardId: string;
  name: string;
  slug: string;
  order: number;
  backgroundImage?: string | null;
  backgroundBlur?: number | null;
  backgroundOpacity?: number | null;
  createdAt: Date;
  updatedAt: Date;
  zones?: Zone[];
}

export interface Zone {
  id: string;
  tabId: string;
  name: string;
  order: number;
  cards?: Card[];
}

export interface Card {
  id: string;
  zoneId: string;
  title: string;
  subtitle?: string;
  serviceType?: string;
  iconSource?: 'catalog' | 'custom';
  iconCatalogId?: string;
  iconKey?: string;
  iconCustomUrl?: string;
  layoutX: number;
  layoutY: number;
  layoutW: number;
  layoutH: number;
  layoutMinW?: number;
  layoutMinH?: number;
  layoutMaxW?: number;
  layoutMaxH?: number;
  layoutLocked: boolean;
  style?: CardStyle;
  widgets?: CardWidget[];
  meta?: Record<string, any>;
}

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

export interface Theme {
  id: string;
  name: string;
  baseScheme: 'base16' | 'base24';
  tokens: Record<string, string>;
  styleMode: StyleMode;
  useGlobalBackground: boolean;
  backgroundType?: 'color' | 'image' | 'pexels';
  backgroundValue?: string;
  backgroundBlur?: number;
  backgroundOpacity?: number;
}

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

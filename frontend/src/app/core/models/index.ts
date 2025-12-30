export interface User {
  id: string;
  username: string;
  displayName?: string;
  roles: string[];
  preferredThemeId?: string;
  preferredStyleMode?: StyleMode;
  hideLogo?: boolean;
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
  order: number;
  icon?: string;
  customCss?: string | null;
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
  type: 'link' | 'status' | 'iframe' | 'metric' | 'note' | 'system-metrics' | 'system-processes' | 'system-network' | 'plex' | 'jellyfin' | 'clock' | 'rss' | 'calendar' | 'custom';
  config: Record<string, any>;
}

export interface NoteWidgetConfig {
  content: string; // HTML content from Tiptap editor
  lastModified?: Date;
}

export interface SystemMetricsWidgetConfig {
  showCPU?: boolean;
  showMemory?: boolean;
  showDisk?: boolean;
  warningThreshold?: number; // Percentage (default: 70)
  criticalThreshold?: number; // Percentage (default: 90)
}

export interface SystemProcessesWidgetConfig {
  sortBy?: 'cpu' | 'mem';
  processCount?: number; // Number of processes to show (default: 10)
}

export interface SystemNetworkWidgetConfig {
  interface?: string; // Specific network interface or 'all'
  units?: 'B/s' | 'KB/s' | 'MB/s'; // Display units (default: 'MB/s')
}

export interface PlexWidgetConfig {
  serverUrl: string; // Plex server URL for linking (e.g., http://192.168.1.100:32400)
  credentialId: string; // Reference to encrypted Plex token in credentials table
  showNowPlaying?: boolean; // Show currently playing sessions (default: true)
  showRecent?: boolean; // Show recently added media (default: true)
  recentLimit?: number; // Number of recent items to show (default: 5)
  refreshInterval?: number; // Refresh interval in seconds (default: 10)
}

export interface PlexSession {
  sessionKey: string;
  user: string;
  title: string;
  type: 'movie' | 'episode' | 'track';
  grandparentTitle?: string; // Show name for episodes
  parentTitle?: string; // Season for episodes, album for tracks
  year?: number;
  thumb?: string;
  state: 'playing' | 'paused' | 'buffering';
  progress: number; // 0-100
  transcoding: boolean;
  videoDecision?: string;
  player: string;
  platform?: string;
}

export interface PlexRecentItem {
  key: string;
  title: string;
  type: 'movie' | 'episode' | 'track' | 'album';
  grandparentTitle?: string;
  parentTitle?: string;
  year?: number;
  thumb?: string;
  addedAt: number;
}

export interface PlexLibraryStats {
  movies: number;
  shows: number;
  episodes: number;
  music: number;
}

export interface PlexData {
  sessions: PlexSession[];
  recent: PlexRecentItem[];
  info: {
    name: string;
    version: string;
    platform: string;
    transcoderActiveVideoSessions: number;
  };
  stats: PlexLibraryStats;
}

export interface JellyfinWidgetConfig {
  serverUrl: string; // Jellyfin server URL for linking (e.g., http://192.168.1.100:8096)
  credentialId: string; // Reference to encrypted Jellyfin API key in credentials table
  showNowPlaying?: boolean; // Show currently playing sessions (default: true)
  showRecent?: boolean; // Show recently added media (default: true)
  recentLimit?: number; // Number of recent items to show (default: 10)
  refreshInterval?: number; // Refresh interval in seconds (default: 10)
}

export interface JellyfinSession {
  Id: string;
  UserId: string;
  UserName: string;
  NowPlayingItem?: {
    Name: string;
    Type: string;
    SeriesName?: string;
    SeasonName?: string;
    IndexNumber?: number;
    ParentIndexNumber?: number;
    Id: string;
  };
  PlayState?: {
    PositionTicks?: number;
    IsPaused?: boolean;
  };
  imageUrl?: string | null;
}

export interface JellyfinRecentItem {
  Id: string;
  Name: string;
  Type: string;
  SeriesName?: string;
  ProductionYear?: number;
  PremiereDate?: string;
  imageUrl?: string | null;
}

export interface JellyfinLibraryStats {
  MovieCount: number;
  SeriesCount: number;
  EpisodeCount: number;
  SongCount: number;
}

export interface JellyfinData {
  sessions: JellyfinSession[];
  recent: JellyfinRecentItem[];
  info: {
    ServerName: string;
    Version: string;
    OperatingSystem: string;
  };
  stats: JellyfinLibraryStats;
}

export interface ClockWidgetConfig {
  format: '12h' | '24h'; // 12-hour or 24-hour format
  showSeconds: boolean; // Show seconds in the time display
  showDate: boolean; // Show the date below the time
  timezone?: string; // IANA timezone identifier (e.g., 'America/New_York'), defaults to local
  style: 'digital' | 'analog'; // Clock display style
}

export interface RssWidgetConfig {
  feedUrl: string; // RSS feed URL
  widgetName: string; // Custom name for this RSS widget
  itemLimit?: number; // Number of items to display (default: 10)
  refreshInterval?: number; // Refresh interval in seconds (default: 300 = 5 minutes)
  showDescription?: boolean; // Show item descriptions (default: true)
  showPublishDate?: boolean; // Show publish dates (default: true)
}

export interface RssItem {
  title: string;
  link: string;
  description?: string;
  pubDate?: string;
  author?: string;
  guid?: string;
}

export interface RssFeed {
  title: string;
  description?: string;
  link?: string;
  items: RssItem[];
  lastBuildDate?: string;
}

export interface CalendarWidgetConfig {
  sources: CalendarSource[]; // Array of calendar sources (CalDAV or ICS feeds)
  defaultView?: "dayGridMonth" | "listWeek" | "timeGridWeek"; // Default calendar view
  refreshInterval?: number; // Refresh interval in seconds (default: 300 = 5 minutes)
  showWeekNumbers?: boolean; // Show week numbers (default: false)
  firstDayOfWeek?: number; // 0 = Sunday, 1 = Monday, etc. (default: 0)
}

export interface CalendarSource {
  id: string; // Unique identifier for this source
  type: "caldav" | "ics"; // Source type
  name: string; // Display name for this calendar
  color?: string; // Color for events from this calendar
  enabled?: boolean; // Whether this source is enabled (default: true)
  caldavConfig?: CalDAVSourceConfig; // Configuration for CalDAV sources
  icsConfig?: ICSSourceConfig; // Configuration for ICS feed sources
}

export interface CalDAVSourceConfig {
  credentialId: string; // Reference to encrypted CalDAV credentials in credentials table
}

export interface ICSSourceConfig {
  feedUrl: string; // URL of the ICS feed
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: string; // ISO date string
  end: string; // ISO date string
  description?: string;
  location?: string;
  allDay?: boolean;
  color?: string;
  calendarName?: string;
}

export interface SystemMetrics {
  cpu: {
    usage: number;
    load: number[];
    cores: number;
    speed: number;
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
    available: number;
  };
  disk: {
    used: number;
    total: number;
    percentage: number;
    available: number;
  };
  timestamp: Date;
}

export interface ProcessInfo {
  pid: number;
  name: string;
  cpu: number;
  mem: number;
  command: string;
}

export interface NetworkStats {
  rx: number; // bytes received per second
  tx: number; // bytes transmitted per second
  interfaces: Array<{
    name: string;
    speed: number;
    operstate: string;
    rx_sec: number;
    tx_sec: number;
  }>;
}

export interface SystemInfo {
  os: string;
  platform: string;
  hostname: string;
  uptime: number;
  arch: string;
  isDocker?: boolean;
}

export interface Theme {
  id: string;
  name: string;
  author?: string;
  variant?: 'dark' | 'light';
  isCustom?: boolean;
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

export interface JellyfinConfig {
  url: string;
  apiKey: string;
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
    ImageTags?: {
      Primary?: string;
    };
    Id: string;
  };
  PlayState?: {
    PositionTicks?: number;
    CanSeek?: boolean;
    IsPaused?: boolean;
    IsMuted?: boolean;
  };
}

export interface JellyfinRecentItem {
  Id: string;
  Name: string;
  Type: string;
  SeriesName?: string;
  ProductionYear?: number;
  ImageTags?: {
    Primary?: string;
  };
  PremiereDate?: string;
}

export interface JellyfinLibraryStats {
  MovieCount: number;
  SeriesCount: number;
  EpisodeCount: number;
  SongCount: number;
}

export interface JellyfinServerInfo {
  ServerName: string;
  Version: string;
  OperatingSystem: string;
}

class JellyfinService {
  private async fetchJellyfin(config: JellyfinConfig, endpoint: string, params: Record<string, string> = {}) {
    const url = new URL(`${config.url}${endpoint}`);

    // Add all params to URL
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
        'X-Emby-Token': config.apiKey
      }
    });

    if (!response.ok) {
      throw new Error(`Jellyfin API error: ${response.statusText}`);
    }

    return response.json();
  }

  // Get the user ID associated with the API key
  private async getUserId(config: JellyfinConfig): Promise<string | null> {
    try {
      // Get current user info using the API key
      const users = await this.fetchJellyfin(config, '/Users');
      // Return the first user (API keys are typically associated with a single user)
      return users.length > 0 ? users[0].Id : null;
    } catch (error) {
      console.error('Error fetching Jellyfin user ID:', error);
      return null;
    }
  }

  async getActiveSessions(config: JellyfinConfig): Promise<JellyfinSession[]> {
    try {
      const sessions = await this.fetchJellyfin(config, '/Sessions');
      // Filter to only sessions that are actively playing
      return sessions.filter((session: JellyfinSession) => session.NowPlayingItem);
    } catch (error) {
      console.error('Error fetching Jellyfin sessions:', error);
      return [];
    }
  }

  async getRecentlyAdded(config: JellyfinConfig, limit: number = 10): Promise<JellyfinRecentItem[]> {
    try {
      const userId = await this.getUserId(config);
      if (!userId) {
        console.error('Could not get Jellyfin user ID');
        return [];
      }

      const items = await this.fetchJellyfin(config, `/Users/${userId}/Items/Latest`, {
        Limit: limit.toString(),
        Fields: 'PremiereDate,ProductionYear',
        ImageTypeLimit: '1',
        EnableImageTypes: 'Primary'
      });
      return items;
    } catch (error) {
      console.error('Error fetching Jellyfin recent items:', error);
      return [];
    }
  }

  async getLibraryStats(config: JellyfinConfig): Promise<JellyfinLibraryStats> {
    try {
      const data = await this.fetchJellyfin(config, '/Items/Counts');
      return {
        MovieCount: data.MovieCount || 0,
        SeriesCount: data.SeriesCount || 0,
        EpisodeCount: data.EpisodeCount || 0,
        SongCount: data.SongCount || 0
      };
    } catch (error) {
      console.error('Error fetching Jellyfin library stats:', error);
      return {
        MovieCount: 0,
        SeriesCount: 0,
        EpisodeCount: 0,
        SongCount: 0
      };
    }
  }

  async getServerInfo(config: JellyfinConfig): Promise<JellyfinServerInfo> {
    try {
      const data = await this.fetchJellyfin(config, '/System/Info/Public');
      return {
        ServerName: data.ServerName || 'Jellyfin',
        Version: data.Version || 'Unknown',
        OperatingSystem: data.OperatingSystem || 'Unknown'
      };
    } catch (error) {
      console.error('Error fetching Jellyfin server info:', error);
      return {
        ServerName: 'Jellyfin',
        Version: 'Unknown',
        OperatingSystem: 'Unknown'
      };
    }
  }

  // Helper to get image URL for an item
  getImageUrl(config: JellyfinConfig, itemId: string, imageTag?: string, type: string = 'Primary'): string | null {
    if (!imageTag) return null;
    // Note: Image URLs will be accessed by the frontend, so we include the API key as a query parameter
    // The X-Emby-Token header can't be used for <img> tags
    return `${config.url}/Items/${itemId}/Images/${type}?tag=${imageTag}&api_key=${config.apiKey}`;
  }
}

export const jellyfinService = new JellyfinService();

/**
 * Plex Media Server API Service
 *
 * Integrates with Plex API to fetch:
 * - Active sessions (currently playing)
 * - Recently added media
 * - Server statistics
 * - Transcoding sessions
 */

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
  videoDecision?: string; // 'transcode', 'copy', 'direct play'
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

export interface PlexServerInfo {
  name: string;
  version: string;
  platform: string;
  transcoderActiveVideoSessions: number;
}

export interface PlexLibraryStats {
  movies: number;
  shows: number;
  episodes: number;
  music: number;
}

export interface PlexConfig {
  url: string;
  token: string;
}

class PlexService {
  /**
   * Test connection to Plex server
   */
  async testConnection(config: PlexConfig): Promise<boolean> {
    try {
      const response = await fetch(`${config.url}/?X-Plex-Token=${config.token}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      return response.ok;
    } catch (error) {
      console.error('[Plex] Connection test failed:', error);
      return false;
    }
  }

  /**
   * Get currently active sessions (what's playing now)
   */
  async getActiveSessions(config: PlexConfig): Promise<PlexSession[]> {
    try {
      const response = await fetch(
        `${config.url}/status/sessions?X-Plex-Token=${config.token}`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Plex API error: ${response.status}`);
      }

      const data = await response.json();
      const sessions = data.MediaContainer?.Metadata || [];

      return sessions.map((session: any) => {
        const transcodeSession = session.TranscodeSession;

        return {
          sessionKey: session.sessionKey,
          user: session.User?.title || 'Unknown',
          title: session.title,
          type: session.type,
          grandparentTitle: session.grandparentTitle,
          parentTitle: session.parentTitle,
          year: session.year,
          thumb: session.thumb ? this.getThumbnailUrl(config, session.thumb) : undefined,
          state: session.Player?.state || 'playing',
          progress: Math.round((session.viewOffset / session.duration) * 100) || 0,
          transcoding: !!transcodeSession,
          videoDecision: transcodeSession?.videoDecision,
          player: session.Player?.title || 'Unknown',
          platform: session.Player?.platform
        };
      });
    } catch (error) {
      console.error('[Plex] Failed to fetch active sessions:', error);
      throw error;
    }
  }

  /**
   * Get recently added media
   */
  async getRecentlyAdded(config: PlexConfig, limit: number = 10): Promise<PlexRecentItem[]> {
    try {
      const response = await fetch(
        `${config.url}/library/recentlyAdded?X-Plex-Token=${config.token}`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Plex API error: ${response.status}`);
      }

      const data = await response.json();
      const items = data.MediaContainer?.Metadata || [];

      return items.slice(0, limit).map((item: any) => ({
        key: item.key,
        title: item.title,
        type: item.type,
        grandparentTitle: item.grandparentTitle,
        parentTitle: item.parentTitle,
        year: item.year,
        thumb: item.thumb ? this.getThumbnailUrl(config, item.thumb) : undefined,
        addedAt: item.addedAt
      }));
    } catch (error) {
      console.error('[Plex] Failed to fetch recently added:', error);
      throw error;
    }
  }

  /**
   * Get server information
   */
  async getServerInfo(config: PlexConfig): Promise<PlexServerInfo> {
    try {
      const response = await fetch(
        `${config.url}/?X-Plex-Token=${config.token}`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Plex API error: ${response.status}`);
      }

      const data = await response.json();
      const container = data.MediaContainer;

      return {
        name: container.friendlyName || 'Plex Media Server',
        version: container.version,
        platform: container.platform,
        transcoderActiveVideoSessions: container.transcoderActiveVideoSessions || 0
      };
    } catch (error) {
      console.error('[Plex] Failed to fetch server info:', error);
      throw error;
    }
  }

  /**
   * Get library statistics
   */
  async getLibraryStats(config: PlexConfig): Promise<PlexLibraryStats> {
    try {
      const response = await fetch(
        `${config.url}/library/sections?X-Plex-Token=${config.token}`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Plex API error: ${response.status}`);
      }

      const data = await response.json();
      const sections = data.MediaContainer?.Directory || [];

      const stats: PlexLibraryStats = {
        movies: 0,
        shows: 0,
        episodes: 0,
        music: 0
      };

      // Fetch count for each section
      const countPromises = sections.map(async (section: any) => {
        try {
          // Fetch section with size limit to get just the total count
          const sectionResponse = await fetch(
            `${config.url}/library/sections/${section.key}/all?X-Plex-Container-Start=0&X-Plex-Container-Size=1&X-Plex-Token=${config.token}`,
            {
              method: 'GET',
              headers: {
                'Accept': 'application/json'
              }
            }
          );

          if (sectionResponse.ok) {
            const sectionData = await sectionResponse.json();
            const totalSize = sectionData.MediaContainer?.totalSize || 0;

            console.log(`[Plex] Section "${section.title}" (${section.type}): ${totalSize} items`);

            return {
              type: section.type,
              count: totalSize
            };
          }
        } catch (err) {
          console.error(`[Plex] Failed to fetch count for section ${section.title}:`, err);
        }
        return { type: section.type, count: 0 };
      });

      const counts = await Promise.all(countPromises);

      // Aggregate counts by type
      for (const { type, count } of counts) {
        if (type === 'movie') {
          stats.movies += count;
        } else if (type === 'show') {
          stats.shows += count;
        } else if (type === 'artist') {
          stats.music += count;
        }
      }

      console.log('[Plex] Final stats:', stats);
      return stats;
    } catch (error) {
      console.error('[Plex] Failed to fetch library stats:', error);
      throw error;
    }
  }

  /**
   * Get thumbnail URL
   */
  getThumbnailUrl(config: PlexConfig, thumbPath: string): string {
    if (!thumbPath) return '';
    return `${config.url}${thumbPath}?X-Plex-Token=${config.token}`;
  }
}

// Export singleton instance
export const plexService = new PlexService();

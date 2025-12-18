import { exec } from 'child_process';
import { promisify } from 'util';
import { connect } from 'net';
import { readFile } from 'fs/promises';
import { join } from 'path';

const execAsync = promisify(exec);

export interface DiscoveredService {
  name: string;
  type: 'docker' | 'port' | 'process';
  containerName?: string;
  port?: number;
  iconId?: string;
  suggestedTitle: string;
  suggestedUrl?: string;
  selected: boolean;
}

interface IconMetadata {
  base: string;
  variants: Array<{ name: string; path: string }>;
}

interface AppIcon {
  id: string;
  name: string;
  aliases: string[];
  categories: string[];
  icons: IconMetadata;
}

interface IconIndex {
  version: string;
  generated: string;
  totalApps: number;
  apps: AppIcon[];
}

// Port registry for common services (no icons needed, just ports)
const COMMON_PORTS: Record<number, { name: string; urlPath?: string }> = {
  32400: { name: 'plex', urlPath: '/web' },
  8096: { name: 'jellyfin' },
  8920: { name: 'emby' },
  8123: { name: 'home-assistant' },
  9000: { name: 'portainer' },
  8989: { name: 'sonarr' },
  7878: { name: 'radarr' },
  8686: { name: 'lidarr' },
  9696: { name: 'prowlarr' },
  6767: { name: 'bazarr' },
  5055: { name: 'overseerr' },
  8181: { name: 'tautulli' },
  9091: { name: 'transmission' },
  8080: { name: 'qbittorrent' },
  8112: { name: 'deluge' },
  8384: { name: 'syncthing' },
  3000: { name: 'grafana' },
  9090: { name: 'prometheus' },
  8086: { name: 'influxdb' },
  3001: { name: 'uptime-kuma' },
  4533: { name: 'navidrome' },
  2368: { name: 'ghost' },
  5000: { name: 'kavita' },
  8083: { name: 'calibre-web' },
  3579: { name: 'ombi' },
  4545: { name: 'requestrr' },
  7575: { name: 'homarr' },
  2342: { name: 'photoprism' },
  2283: { name: 'immich' },
  8200: { name: 'duplicati' },
  6875: { name: 'bookstack' },
  8000: { name: 'paperless-ngx' },
};

let iconIndexCache: IconIndex | null = null;

/**
 * Load the icon index from the JSON file
 */
async function loadIconIndex(): Promise<IconIndex> {
  if (iconIndexCache) {
    return iconIndexCache;
  }

  try {
    const iconIndexPath = join(process.cwd(), '../frontend/public/app-icons/index.json');
    const content = await readFile(iconIndexPath, 'utf-8');
    iconIndexCache = JSON.parse(content);
    console.log(`Loaded icon index with ${iconIndexCache?.totalApps} apps`);
    return iconIndexCache!;
  } catch (error) {
    console.error('Failed to load icon index:', error);
    return { version: '1.0', generated: '', totalApps: 0, apps: [] };
  }
}

/**
 * Calculate similarity score between two strings (0-1, higher is better)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  // Exact match
  if (s1 === s2) return 1.0;

  // One contains the other
  if (s1.includes(s2) || s2.includes(s1)) {
    const longer = Math.max(s1.length, s2.length);
    const shorter = Math.min(s1.length, s2.length);
    return 0.9 * (shorter / longer);
  }

  // Word-based matching
  const words1 = s1.split(/[-_\s]+/);
  const words2 = s2.split(/[-_\s]+/);

  let matches = 0;
  for (const word1 of words1) {
    for (const word2 of words2) {
      if (word1 === word2 || word1.includes(word2) || word2.includes(word1)) {
        matches++;
        break;
      }
    }
  }

  if (matches > 0) {
    return 0.7 * (matches / Math.max(words1.length, words2.length));
  }

  // Levenshtein distance for remaining cases
  return 0.5 * (1 - levenshteinDistance(s1, s2) / Math.max(s1.length, s2.length));
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,    // deletion
          dp[i][j - 1] + 1,    // insertion
          dp[i - 1][j - 1] + 1 // substitution
        );
      }
    }
  }

  return dp[m][n];
}

/**
 * Find the best matching icon for a service name
 */
async function findMatchingIcon(serviceName: string): Promise<{ iconId: string; score: number } | null> {
  const iconIndex = await loadIconIndex();
  if (!iconIndex.apps.length) return null;

  let bestMatch: { iconId: string; score: number } | null = null;

  for (const app of iconIndex.apps) {
    // Check against ID
    let score = calculateSimilarity(serviceName, app.id);

    // Check against name
    const nameScore = calculateSimilarity(serviceName, app.name);
    score = Math.max(score, nameScore);

    // Check against aliases
    for (const alias of app.aliases) {
      const aliasScore = calculateSimilarity(serviceName, alias);
      score = Math.max(score, aliasScore);
    }

    // Only consider matches with score > 0.5
    if (score > 0.5) {
      if (!bestMatch || score > bestMatch.score) {
        bestMatch = { iconId: app.id, score };
      }
    }
  }

  return bestMatch;
}

/**
 * Check if a port is open on a given host
 */
function checkPort(host: string, port: number, timeout: number = 1000): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = connect({ host, port, timeout });

    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });

    socket.on('error', () => {
      resolve(false);
    });

    setTimeout(() => {
      socket.destroy();
      resolve(false);
    }, timeout);
  });
}

/**
 * Try to identify service by making HTTP request
 */
async function identifyServiceByHttp(port: number): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const response = await fetch(`http://localhost:${port}`, {
      method: 'GET',
      redirect: 'manual',
      signal: controller.signal
    }).catch(() => null);

    clearTimeout(timeoutId);

    if (!response) return null;

    // Check response headers and content for service signatures
    const serverHeader = response.headers.get('server')?.toLowerCase() || '';

    // Try to get body for additional clues
    let body = '';
    try {
      body = await response.text();
      body = body.toLowerCase();
    } catch {
      // Ignore body read errors
    }

    // Service signatures
    const signatures: Record<string, string[]> = {
      'plex': ['plex'],
      'jellyfin': ['jellyfin'],
      'emby': ['emby'],
      'home-assistant': ['home-assistant', 'homeassistant'],
      'portainer': ['portainer'],
      'sonarr': ['sonarr'],
      'radarr': ['radarr'],
      'lidarr': ['lidarr'],
      'prowlarr': ['prowlarr'],
      'bazarr': ['bazarr'],
      'overseerr': ['overseerr'],
      'tautulli': ['tautulli'],
      'transmission': ['transmission'],
      'qbittorrent': ['qbittorrent'],
      'grafana': ['grafana'],
      'nextcloud': ['nextcloud'],
      'syncthing': ['syncthing'],
      'photoprism': ['photoprism'],
      'immich': ['immich'],
    };

    for (const [service, keywords] of Object.entries(signatures)) {
      for (const keyword of keywords) {
        if (serverHeader.includes(keyword) || body.includes(keyword)) {
          return service;
        }
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Discover services by port scanning
 */
async function discoverPortServices(): Promise<DiscoveredService[]> {
  const services: DiscoveredService[] = [];
  const portsToCheck = Object.keys(COMMON_PORTS).map(Number);

  console.log(`Checking ${portsToCheck.length} ports for services...`);

  // Check all ports
  const checkPromises = portsToCheck.map(async (port) => {
    const isOpen = await checkPort('localhost', port, 1000);

    if (isOpen) {
      console.log(`Port ${port} is open, identifying service...`);

      // Try to identify the service via HTTP
      let identifiedService = await identifyServiceByHttp(port);

      // Fall back to port registry if HTTP identification fails
      if (!identifiedService && COMMON_PORTS[port]) {
        identifiedService = COMMON_PORTS[port].name;
      }

      if (identifiedService) {
        // Find matching icon using fuzzy matching
        const iconMatch = await findMatchingIcon(identifiedService);
        const urlPath = COMMON_PORTS[port]?.urlPath || '';

        return {
          name: identifiedService,
          type: 'port' as const,
          port,
          iconId: iconMatch?.iconId,
          suggestedTitle: capitalizeWords(identifiedService.replace(/-/g, ' ')),
          suggestedUrl: `http://localhost:${port}${urlPath}`,
          selected: true
        };
      }
    }
    return null;
  });

  const results = await Promise.all(checkPromises);
  return results.filter((s): s is DiscoveredService => s !== null);
}

/**
 * Discover services running via Docker
 */
async function discoverDockerServices(): Promise<DiscoveredService[]> {
  try {
    // Check if Docker is available
    const { stdout: dockerVersion } = await execAsync('docker --version').catch(() => ({ stdout: '' }));
    if (!dockerVersion) {
      console.log('Docker not available');
      return [];
    }

    // Get running containers with their names and ports
    const { stdout } = await execAsync('docker ps --format "{{.Names}}|{{.Ports}}"');
    const lines = stdout.trim().split('\n').filter(line => line.length > 0);

    const services: DiscoveredService[] = [];

    for (const line of lines) {
      const [containerName, portsRaw] = line.split('|');

      // Extract port from Docker output if available
      const portMatch = portsRaw.match(/0\.0\.0\.0:(\d+)/);
      const port = portMatch ? parseInt(portMatch[1]) : undefined;

      // Try to match container name to icon using fuzzy matching
      const iconMatch = await findMatchingIcon(containerName);

      // Get URL path from port registry if available
      const urlPath = port && COMMON_PORTS[port] ? COMMON_PORTS[port].urlPath || '' : '';

      services.push({
        name: iconMatch?.iconId || containerName,
        type: 'docker',
        containerName,
        port,
        iconId: iconMatch?.iconId,
        suggestedTitle: capitalizeWords((iconMatch?.iconId || containerName).replace(/[-_]/g, ' ')),
        suggestedUrl: port ? `http://localhost:${port}${urlPath}` : undefined,
        selected: true
      });
    }

    return services;
  } catch (error) {
    console.error('Docker discovery failed:', error);
    return [];
  }
}

/**
 * Main service discovery function
 */
export async function discoverServices(): Promise<DiscoveredService[]> {
  console.log('Starting service discovery...');

  const [dockerServices, portServices] = await Promise.all([
    discoverDockerServices(),
    discoverPortServices()
  ]);

  console.log(`Found ${dockerServices.length} Docker services and ${portServices.length} port-based services`);

  // Combine and remove duplicates based on port (prefer Docker over port detection)
  const allServices = [...dockerServices];
  const usedPorts = new Set(dockerServices.map(s => s.port).filter(p => p !== undefined));

  for (const service of portServices) {
    if (service.port && !usedPorts.has(service.port)) {
      allServices.push(service);
    }
  }

  // Remove duplicates based on name+port combination
  const uniqueServices = allServices.reduce((acc, service) => {
    const key = `${service.name}:${service.port}`;
    const existing = acc.find(s => `${s.name}:${s.port}` === key);
    if (!existing) {
      acc.push(service);
    }
    return acc;
  }, [] as DiscoveredService[]);

  console.log(`Returning ${uniqueServices.length} unique services`);
  return uniqueServices;
}

/**
 * Helper to capitalize words
 */
function capitalizeWords(str: string): string {
  return str
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

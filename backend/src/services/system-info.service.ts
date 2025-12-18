import si from 'systeminformation';
import fs from 'fs';

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
}

class SystemInfoService {
  private isDockerEnv: boolean = false;

  constructor() {
    this.detectDockerEnvironment();
  }

  /**
   * Detect if running in a Docker container
   */
  private detectDockerEnvironment(): void {
    try {
      // Check for .dockerenv file
      if (fs.existsSync('/.dockerenv')) {
        this.isDockerEnv = true;
        console.log('[SystemInfo] Running in Docker container');
        return;
      }

      // Check cgroup for docker/containerd
      const cgroup = fs.readFileSync('/proc/1/cgroup', 'utf8');
      if (cgroup.includes('docker') || cgroup.includes('containerd')) {
        this.isDockerEnv = true;
        console.log('[SystemInfo] Running in Docker container (detected via cgroup)');
        return;
      }
    } catch (err) {
      // If we can't read these files, assume not in Docker
      console.log('[SystemInfo] Not running in Docker');
    }
  }

  /**
   * Get comprehensive system metrics
   */
  async getSystemMetrics(): Promise<SystemMetrics> {
    try {
      console.log('[SystemInfo] Starting to collect system metrics...');

      // Collect metrics individually with detailed logging
      console.log('[SystemInfo] Collecting CPU data...');
      const cpuData = await si.cpu();
      console.log('[SystemInfo] CPU data collected successfully');

      console.log('[SystemInfo] Collecting current load...');
      const currentLoad = await si.currentLoad();
      console.log('[SystemInfo] Current load collected successfully');

      console.log('[SystemInfo] Collecting memory data...');
      const memData = await si.mem();
      console.log('[SystemInfo] Memory data collected successfully');

      console.log('[SystemInfo] Collecting filesystem data...');
      const fsData = await si.fsSize();
      console.log('[SystemInfo] Filesystem data collected successfully');

      // Log all detected filesystems for debugging
      console.log('[SystemInfo] Detected filesystems:');
      fsData.forEach(disk => {
        console.log(`  - ${disk.mount}: ${(disk.used / (1024**3)).toFixed(2)} GB / ${(disk.size / (1024**3)).toFixed(2)} GB (${disk.use.toFixed(2)}%)`);
      });

      // Aggregate disk space across all filesystems
      const totalDiskSpace = fsData.reduce((acc, disk) => ({
        used: acc.used + disk.used,
        total: acc.total + disk.size,
        available: acc.available + disk.available
      }), { used: 0, total: 0, available: 0 });

      const diskPercentage = totalDiskSpace.total > 0
        ? Math.round((totalDiskSpace.used / totalDiskSpace.total) * 10000) / 100
        : 0;

      console.log(`[SystemInfo] Total disk usage: ${(totalDiskSpace.used / (1024**3)).toFixed(2)} GB / ${(totalDiskSpace.total / (1024**3)).toFixed(2)} GB (${diskPercentage.toFixed(2)}%)`);

      const metrics = {
        cpu: {
          usage: Math.round(currentLoad.currentLoad * 100) / 100,
          load: currentLoad.cpus.map(cpu => Math.round(cpu.load * 100) / 100),
          cores: cpuData.cores,
          speed: cpuData.speed
        },
        memory: {
          used: memData.used,
          total: memData.total,
          percentage: Math.round((memData.used / memData.total) * 10000) / 100,
          available: memData.available
        },
        disk: {
          used: totalDiskSpace.used,
          total: totalDiskSpace.total,
          percentage: diskPercentage,
          available: totalDiskSpace.available
        },
        timestamp: new Date()
      };

      console.log('[SystemInfo] System metrics collected successfully');
      return metrics;
    } catch (error) {
      console.error('[SystemInfo] Error getting system metrics:', error);
      throw error;
    }
  }

  /**
   * Get top processes by CPU or memory
   */
  async getProcessInfo(sortBy: 'cpu' | 'mem' = 'cpu', limit: number = 10): Promise<ProcessInfo[]> {
    try {
      console.log('[SystemInfo] Collecting process info...');
      const processes = await si.processes();
      console.log('[SystemInfo] Process info collected successfully');

      // Sort processes
      const sorted = processes.list.sort((a, b) => {
        if (sortBy === 'cpu') {
          return b.cpu - a.cpu;
        } else {
          return b.mem - a.mem;
        }
      });

      // Return top N processes
      return sorted.slice(0, limit).map(proc => ({
        pid: proc.pid,
        name: proc.name,
        cpu: Math.round(proc.cpu * 100) / 100,
        mem: Math.round(proc.mem * 100) / 100,
        command: proc.command
      }));
    } catch (error) {
      console.error('[SystemInfo] Error getting process info:', error);
      throw error;
    }
  }

  /**
   * Get network statistics
   */
  async getNetworkStats(): Promise<NetworkStats> {
    try {
      console.log('[SystemInfo] Collecting network stats...');
      const netStats = await si.networkStats();
      console.log('[SystemInfo] Network stats collected successfully');

      console.log('[SystemInfo] Collecting network interfaces...');
      const netInterfaces = await si.networkInterfaces();
      console.log('[SystemInfo] Network interfaces collected successfully');

      let totalRx = 0;
      let totalTx = 0;

      const interfaces = netStats.map(stat => {
        totalRx += stat.rx_sec || 0;
        totalTx += stat.tx_sec || 0;

        const iface = netInterfaces.find(i => i.iface === stat.iface);

        return {
          name: stat.iface,
          speed: iface?.speed || 0,
          operstate: stat.operstate || 'unknown',
          rx_sec: stat.rx_sec || 0,
          tx_sec: stat.tx_sec || 0
        };
      });

      return {
        rx: totalRx,
        tx: totalTx,
        interfaces
      };
    } catch (error) {
      console.error('[SystemInfo] Error getting network stats:', error);
      throw error;
    }
  }

  /**
   * Get general system information
   */
  async getSystemInfo(): Promise<SystemInfo> {
    try {
      const [osInfo, systemData] = await Promise.all([
        si.osInfo(),
        si.system()
      ]);

      return {
        os: osInfo.distro + ' ' + osInfo.release,
        platform: osInfo.platform,
        hostname: systemData.hostname || osInfo.hostname,
        uptime: si.time().uptime,
        arch: osInfo.arch
      };
    } catch (error) {
      console.error('[SystemInfo] Error getting system info:', error);
      throw error;
    }
  }

  /**
   * Check if running in Docker
   */
  isDocker(): boolean {
    return this.isDockerEnv;
  }
}

// Export singleton instance
export const systemInfoService = new SystemInfoService();

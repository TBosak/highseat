#!/usr/bin/env node

/**
 * Check for new icons from homarr-labs/dashboard-icons repository
 * Compares upstream metadata and icons with local versions
 *
 * Usage:
 *   node scripts/check-new-icons.js              # Check for new icons/metadata
 *   node scripts/check-new-icons.js --download   # Download new metadata and icons
 */

import { readdir, readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// GitHub repository details
const REPO_OWNER = 'homarr-labs';
const REPO_NAME = 'dashboard-icons';
const BRANCH = 'main';

// API endpoints
const META_API = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/meta?ref=${BRANCH}`;
const BASE_RAW_URL = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${BRANCH}`;

// Local directories
const ICONS_DIR = join(__dirname, '../public/app-icons');
const META_DIR = join(ICONS_DIR, 'meta');
const SVG_DIR = join(ICONS_DIR, 'svg');
const PNG_DIR = join(ICONS_DIR, 'png');
const WEBP_DIR = join(ICONS_DIR, 'webp');

const shouldDownload = process.argv.includes('--download');

/**
 * Fetch directory contents from GitHub API
 */
async function fetchGitHubDirectory(apiUrl) {
  const response = await fetch(apiUrl, {
    headers: {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'homelab-dash-icon-checker'
    }
  });

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get list of local metadata files
 */
async function getLocalMetadata() {
  try {
    const files = await readdir(META_DIR);
    return files.filter(f => f.endsWith('.json'));
  } catch (err) {
    if (err.code === 'ENOENT') {
      return [];
    }
    throw err;
  }
}

/**
 * Download a file from GitHub
 */
async function downloadFile(url, localPath) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download: ${response.status}`);
  }

  const content = await response.text();

  // Ensure directory exists
  await mkdir(dirname(localPath), { recursive: true });

  // Write file
  await writeFile(localPath, content, 'utf8');
  return content;
}

/**
 * Download binary file (images)
 */
async function downloadBinaryFile(url, localPath) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download: ${response.status}`);
  }

  const buffer = await response.arrayBuffer();

  // Ensure directory exists
  await mkdir(dirname(localPath), { recursive: true });

  // Write file
  await writeFile(localPath, Buffer.from(buffer));
  return buffer.byteLength;
}

/**
 * Parse metadata file to determine required icon files
 */
function getRequiredIconFiles(appId, metadata) {
  const files = [];
  const baseFormat = metadata.base || 'svg';

  // Default icon in base format
  files.push({
    format: baseFormat,
    variant: 'default',
    filename: `${appId}.${baseFormat}`
  });

  // Check for variants (light, dark, etc.)
  // Note: The metadata doesn't explicitly list variants, but we can check if they exist
  // For now, we'll just download the default icon in the base format

  return files;
}

/**
 * Download icon files for an app
 */
async function downloadIconFiles(appId, metadata) {
  const baseFormat = metadata.base || 'svg';
  const results = {
    downloaded: 0,
    failed: 0,
    skipped: 0
  };

  // Determine which formats to download based on base format
  const formats = [baseFormat];

  // Try to download the icon in the base format
  const filename = `${appId}.${baseFormat}`;
  const url = `${BASE_RAW_URL}/${baseFormat}/${filename}`;
  const localPath = join(ICONS_DIR, baseFormat, filename);

  try {
    const size = await downloadBinaryFile(url, localPath);
    results.downloaded++;
    return results;
  } catch (err) {
    // If the icon doesn't exist in the base format, try other formats
    results.failed++;
  }

  // Try alternative formats (svg, png, webp)
  const alternativeFormats = ['svg', 'png', 'webp'].filter(f => f !== baseFormat);

  for (const format of alternativeFormats) {
    const altFilename = `${appId}.${format}`;
    const altUrl = `${BASE_RAW_URL}/${format}/${altFilename}`;
    const altLocalPath = join(ICONS_DIR, format, altFilename);

    try {
      await downloadBinaryFile(altUrl, altLocalPath);
      results.downloaded++;
      break; // Got one format, that's enough
    } catch (err) {
      // Continue to next format
    }
  }

  if (results.downloaded === 0) {
    results.failed++;
  }

  return results;
}

/**
 * Check for new icons
 */
async function checkIcons() {
  console.log('🎨 Checking for new dashboard icons...');
  console.log(`Repository: ${REPO_OWNER}/${REPO_NAME}`);
  console.log(`Branch: ${BRANCH}\n`);

  console.log('='.repeat(60));
  console.log('Fetching metadata from GitHub API...');
  console.log('='.repeat(60));

  // Fetch upstream metadata files
  const upstreamMetadata = await listMetaJsonFilesViaTrees();
  console.log(`Found ${upstreamMetadata.length} apps in repository`);
  if (upstreamMetadata.length === 1000) {
    console.warn(
      '⚠️ Upstream list is exactly 1000 items. If you are using /contents, you are being truncated.'
    );
  }

  // Get local metadata
  const localMetadata = await getLocalMetadata();
  console.log(`Found ${localMetadata.length} local apps`);

  // Compare
  const newApps = upstreamMetadata.filter(
    upstream => !localMetadata.includes(upstream.name)
  );

  const missingApps = localMetadata.filter(
    local => !upstreamMetadata.find(upstream => upstream.name === local)
  );

  // Report results
  console.log(`\n📊 Summary:`);
  console.log(`  ✓ Up to date: ${localMetadata.length - missingApps.length} apps`);
  console.log(`  + New apps available: ${newApps.length}`);
  console.log(`  - Local apps not in upstream: ${missingApps.length}`);

  if (newApps.length > 0) {
    console.log(`\n📦 New apps available (showing first 20):`);
    newApps.slice(0, 20).forEach(app => {
      console.log(`  • ${app.appId}`);
    });

    if (newApps.length > 20) {
      console.log(`  ... and ${newApps.length - 20} more`);
    }

    if (shouldDownload) {
      console.log(`\n⬇️  Downloading ${newApps.length} new apps...`);
      let metaDownloaded = 0;
      let metaFailed = 0;
      let iconsDownloaded = 0;
      let iconsFailed = 0;

      for (const app of newApps) {
        try {
          // Download metadata
          const metaPath = join(META_DIR, app.name);
          const metaContent = await downloadFile(app.downloadUrl, metaPath);
          const metadata = JSON.parse(metaContent);
          metaDownloaded++;

          // Download icon files
          const iconResults = await downloadIconFiles(app.appId, metadata);
          iconsDownloaded += iconResults.downloaded;
          iconsFailed += iconResults.failed;

          if (iconResults.downloaded > 0) {
            console.log(`  ✓ ${app.appId} (metadata + ${iconResults.downloaded} icon(s))`);
          } else {
            console.log(`  ⚠️  ${app.appId} (metadata only, icons not found)`);
          }
        } catch (err) {
          console.error(`  ✗ Failed: ${app.appId} - ${err.message}`);
          metaFailed++;
        }
      }

      console.log(`\n✅ Download complete:`);
      console.log(`  Metadata: ${metaDownloaded} successful, ${metaFailed} failed`);
      console.log(`  Icons: ${iconsDownloaded} successful, ${iconsFailed} failed`);

      if (metaDownloaded > 0) {
        console.log(`\n🔄 Don't forget to rebuild icon index:`);
        console.log(`   npm run build:icons`);
      }
    } else {
      console.log(`\n💡 Tip: Run with --download flag to download new apps`);
      console.log(`   node scripts/check-new-icons.js --download`);
    }
  } else {
    console.log(`\n✅ All icons are up to date!`);
  }

  if (missingApps.length > 0) {
    console.log(`\n⚠️  Local apps not found in upstream (possibly renamed or removed):`);
    missingApps.slice(0, 10).forEach(app => {
      console.log(`  • ${app.replace('.json', '')}`);
    });

    if (missingApps.length > 10) {
      console.log(`  ... and ${missingApps.length - 10} more`);
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 Final Summary:');
  console.log('='.repeat(60));
  console.log(`Total apps: ${localMetadata.length}/${upstreamMetadata.length}`);
  console.log(`New apps: ${newApps.length}`);
  console.log(`Missing: ${missingApps.length}`);

  if (newApps.length > 0 && !shouldDownload) {
    console.log(`\n🎉 ${newApps.length} new app(s) available!`);
    console.log(`Run 'node scripts/check-new-icons.js --download' to download them.`);
  }
}

const GH_API_BASE = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`;

function ghHeaders() {
  const h = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'homelab-dash-icon-checker',
  };

  if (process.env.GITHUB_TOKEN) h.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

  return h;
}

async function fetchGitHubJson(url) {
  const res = await fetch(url, { headers: ghHeaders() });
  if (!res.ok) throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
  return res.json();
}

async function listMetaJsonFilesViaTrees() {
  // 1) branch ref -> commit sha
  const ref = await fetchGitHubJson(`${GH_API_BASE}/git/ref/heads/${BRANCH}`);
  const commitSha = ref.object.sha;

  // 2) commit -> root tree sha
  const commit = await fetchGitHubJson(`${GH_API_BASE}/git/commits/${commitSha}`);
  const rootTreeSha = commit.tree.sha;

  // 3) root tree -> find "meta" subtree
  const rootTree = await fetchGitHubJson(`${GH_API_BASE}/git/trees/${rootTreeSha}`);
  const metaNode = rootTree.tree.find(n => n.type === 'tree' && n.path === 'meta');
  if (!metaNode?.sha) throw new Error(`Could not find 'meta' directory in repo tree`);

  // 4) meta tree -> list blobs
  const metaTree = await fetchGitHubJson(`${GH_API_BASE}/git/trees/${metaNode.sha}`);

  if (metaTree.truncated) {
    throw new Error(
      `GitHub returned a truncated meta tree; need subtree-walk fallback (rare for flat meta/)`
    );
  }

  return metaTree.tree
    .filter(n => n.type === 'blob' && n.path.endsWith('.json'))
    .map(n => ({
      name: n.path,
      appId: n.path.replace(/\.json$/i, ''),
      downloadUrl: `${BASE_RAW_URL}/meta/${n.path}`, // raw is fine; avoid /contents entirely
      size: null, // trees doesn't include size; you can omit or fetch later if you really need it
    }));
}

/**
 * Main function
 */
async function main() {
  try {
    await checkIcons();
  } catch (err) {
    console.error(`\n❌ Error: ${err.message}`);
    console.error(err.stack);
    process.exit(1);
  }
}

main();

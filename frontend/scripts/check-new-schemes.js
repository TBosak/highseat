#!/usr/bin/env node

/**
 * Check for new Base16/Base24 schemes from tinted-theming/schemes repository
 * Compares upstream schemes with local schemes and reports differences
 *
 * Usage:
 *   node scripts/check-new-schemes.js              # Check for new schemes
 *   node scripts/check-new-schemes.js --download   # Download new schemes
 */

import { readdir, readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { load } from 'js-yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// GitHub repository details
const REPO_OWNER = 'tinted-theming';
const REPO_NAME = 'schemes';
const BRANCH = 'spec-0.11'; // Default branch (always check latest schemes)

// API endpoints
const BASE16_API = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/base16?ref=${BRANCH}`;
const BASE24_API = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/base24?ref=${BRANCH}`;

// Local directories
const BASE16_DIR = join(__dirname, '../public/base16');
const BASE24_DIR = join(__dirname, '../public/base24');

const shouldDownload = process.argv.includes('--download');

/**
 * Fetch directory contents from GitHub API
 */
async function fetchGitHubDirectory(apiUrl) {
  const response = await fetch(apiUrl, {
    headers: {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'homelab-dash-scheme-checker'
    }
  });

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get list of local scheme files
 */
async function getLocalSchemes(directory) {
  try {
    const files = await readdir(directory);
    return files.filter(f => f.endsWith('.yaml'));
  } catch (err) {
    if (err.code === 'ENOENT') {
      return [];
    }
    throw err;
  }
}

/**
 * Download a scheme file from GitHub
 */
async function downloadScheme(downloadUrl, localPath) {
  const response = await fetch(downloadUrl);
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
 * Validate that a scheme file is valid YAML
 * Supports both old format (scheme/author at root) and new format (name/author with palette)
 */
function validateScheme(yamlContent, filename) {
  try {
    const scheme = load(yamlContent);

    // Check for required metadata fields (supports both old and new formats)
    const hasName = scheme.name || scheme.scheme;
    if (!hasName || !scheme.author) {
      return { valid: false, error: 'Missing required fields (name/scheme, author)' };
    }

    // Check for required color fields
    const requiredColors = ['base00', 'base01', 'base02', 'base03', 'base04', 'base05', 'base06', 'base07',
                           'base08', 'base09', 'base0A', 'base0B', 'base0C', 'base0D', 'base0E', 'base0F'];

    // Colors can be at root level (old format) or nested in palette (new format)
    const colors = scheme.palette || scheme;

    for (const color of requiredColors) {
      if (!colors[color]) {
        return { valid: false, error: `Missing required color: ${color}` };
      }
    }

    return { valid: true, scheme };
  } catch (err) {
    return { valid: false, error: err.message };
  }
}

/**
 * Check for new schemes in a specific system (base16 or base24)
 */
async function checkSystem(systemName, apiUrl, localDir) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Checking ${systemName.toUpperCase()} schemes...`);
  console.log('='.repeat(60));

  // Fetch upstream schemes
  console.log(`Fetching from GitHub API...`);
  const upstreamFiles = await fetchGitHubDirectory(apiUrl);
  const upstreamSchemes = upstreamFiles
    .filter(file => file.name.endsWith('.yaml'))
    .map(file => ({
      name: file.name,
      downloadUrl: file.download_url,
      size: file.size
    }));

  console.log(`Found ${upstreamSchemes.length} ${systemName} schemes in repository`);

  // Get local schemes
  const localSchemes = await getLocalSchemes(localDir);
  console.log(`Found ${localSchemes.length} local ${systemName} schemes`);

  // Compare
  const newSchemes = upstreamSchemes.filter(
    upstream => !localSchemes.includes(upstream.name)
  );

  const missingSchemes = localSchemes.filter(
    local => !upstreamSchemes.find(upstream => upstream.name === local)
  );

  // Report results
  console.log(`\n📊 Summary:`);
  console.log(`  ✓ Up to date: ${localSchemes.length - missingSchemes.length} schemes`);
  console.log(`  + New schemes available: ${newSchemes.length}`);
  console.log(`  - Local schemes not in upstream: ${missingSchemes.length}`);

  if (newSchemes.length > 0) {
    console.log(`\n📦 New ${systemName} schemes available:`);
    newSchemes.forEach(scheme => {
      console.log(`  • ${scheme.name} (${(scheme.size / 1024).toFixed(1)}KB)`);
    });

    if (shouldDownload) {
      console.log(`\n⬇️  Downloading ${newSchemes.length} new schemes...`);
      let downloaded = 0;
      let failed = 0;

      for (const scheme of newSchemes) {
        const localPath = join(localDir, scheme.name);
        try {
          const content = await downloadScheme(scheme.downloadUrl, localPath);

          // Validate the scheme
          const validation = validateScheme(content, scheme.name);
          if (validation.valid) {
            console.log(`  ✓ Downloaded: ${scheme.name}`);
            downloaded++;
          } else {
            console.log(`  ⚠️  Downloaded but invalid: ${scheme.name} (${validation.error})`);
            failed++;
          }
        } catch (err) {
          console.error(`  ✗ Failed: ${scheme.name} - ${err.message}`);
          failed++;
        }
      }

      console.log(`\n✅ Download complete: ${downloaded} successful, ${failed} failed`);
    } else {
      console.log(`\n💡 Tip: Run with --download flag to download new schemes`);
      console.log(`   node scripts/check-new-schemes.js --download`);
    }
  }

  if (missingSchemes.length > 0) {
    console.log(`\n⚠️  Local schemes not found in upstream (possibly renamed or removed):`);
    missingSchemes.forEach(scheme => {
      console.log(`  • ${scheme}`);
    });
  }

  return {
    total: upstreamSchemes.length,
    local: localSchemes.length,
    new: newSchemes.length,
    missing: missingSchemes.length
  };
}

/**
 * Main function
 */
async function main() {
  console.log('🎨 Checking for new tinted-theming schemes...');
  console.log(`Repository: ${REPO_OWNER}/${REPO_NAME}`);
  console.log(`Branch: ${BRANCH}`);

  try {
    // Check both base16 and base24
    const base16Stats = await checkSystem('base16', BASE16_API, BASE16_DIR);
    const base24Stats = await checkSystem('base24', BASE24_API, BASE24_DIR);

    // Overall summary
    console.log(`\n${'='.repeat(60)}`);
    console.log('📊 Overall Summary:');
    console.log('='.repeat(60));
    console.log(`Base16: ${base16Stats.local}/${base16Stats.total} (${base16Stats.new} new, ${base16Stats.missing} missing)`);
    console.log(`Base24: ${base24Stats.local}/${base24Stats.total} (${base24Stats.new} new, ${base24Stats.missing} missing)`);
    console.log(`Total:  ${base16Stats.local + base24Stats.local}/${base16Stats.total + base24Stats.total} schemes`);

    const totalNew = base16Stats.new + base24Stats.new;
    if (totalNew > 0) {
      console.log(`\n🎉 ${totalNew} new scheme(s) available!`);
      if (!shouldDownload) {
        console.log(`Run 'node scripts/check-new-schemes.js --download' to download them.`);
      }
    } else {
      console.log(`\n✅ All schemes are up to date!`);
    }

    if (shouldDownload && totalNew > 0) {
      console.log(`\n🔄 Don't forget to rebuild themes:`);
      console.log(`   npm run build:themes`);
    }

  } catch (err) {
    console.error(`\n❌ Error: ${err.message}`);
    process.exit(1);
  }
}

main();

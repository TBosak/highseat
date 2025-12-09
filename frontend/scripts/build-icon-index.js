#!/usr/bin/env node

import { readdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';

const META_DIR = './public/app-icons/meta';
const OUTPUT_FILE = './public/app-icons/index.json';

async function buildIconIndex() {
  console.log('Building icon index...');

  try {
    const files = await readdir(META_DIR);
    const jsonFiles = files.filter(f => f.endsWith('.json'));

    console.log(`Found ${jsonFiles.length} metadata files`);

    const apps = [];

    for (const file of jsonFiles) {
      const appId = file.replace('.json', '');
      const content = await readFile(join(META_DIR, file), 'utf-8');

      try {
        const metadata = JSON.parse(content);

        // Determine available icons
        const icons = {
          base: metadata.base || 'png',
          variants: []
        };

        // Add default icon
        icons.variants.push({
          name: 'default',
          path: `/app-icons/${metadata.base || 'png'}/${appId}.${metadata.base || 'png'}`
        });

        // Add color variants if available
        if (metadata.colors) {
          if (metadata.colors.dark) {
            icons.variants.push({
              name: 'dark',
              path: `/app-icons/${metadata.base || 'png'}/${metadata.colors.dark}.${metadata.base || 'png'}`
            });
          }
          if (metadata.colors.light) {
            icons.variants.push({
              name: 'light',
              path: `/app-icons/${metadata.base || 'png'}/${metadata.colors.light}.${metadata.base || 'png'}`
            });
          }
        }

        apps.push({
          id: appId,
          name: appId.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
          aliases: metadata.aliases || [],
          categories: metadata.categories || [],
          icons,
          lastUpdate: metadata.update?.timestamp || null
        });
      } catch (err) {
        console.warn(`Failed to parse ${file}:`, err.message);
      }
    }

    // Sort by name
    apps.sort((a, b) => a.name.localeCompare(b.name));

    const index = {
      version: '1.0',
      generated: new Date().toISOString(),
      totalApps: apps.length,
      apps
    };

    await writeFile(OUTPUT_FILE, JSON.stringify(index, null, 2));
    console.log(`✅ Built index with ${apps.length} apps → ${OUTPUT_FILE}`);
    process.exit(0);

  } catch (error) {
    console.error('Failed to build icon index:', error);
    process.exit(1);
  }
}

buildIconIndex();

#!/usr/bin/env node

import { readdir, readFile, unlink, stat } from 'fs/promises';
import { join } from 'path';

const META_DIR = './public/app-icons/meta';
const ICONS_DIR = './public/app-icons';
const FORMATS = ['png', 'svg', 'webp', 'ico'];

async function cleanupIcons() {
  console.log('🧹 Cleaning up duplicate icon formats...');

  try {
    const files = await readdir(META_DIR);
    const jsonFiles = files.filter(f => f.endsWith('.json'));

    console.log(`📋 Found ${jsonFiles.length} apps`);

    let deletedCount = 0;
    let keptCount = 0;
    let totalSize = 0;

    for (const file of jsonFiles) {
      const appId = file.replace('.json', '');
      const content = await readFile(join(META_DIR, file), 'utf-8');

      try {
        const metadata = JSON.parse(content);
        const preferredFormat = metadata.base || 'png';

        // Check each format directory
        for (const format of FORMATS) {
          if (format === preferredFormat) {
            // This is the preferred format, keep it
            const iconPath = join(ICONS_DIR, format, `${appId}.${format}`);
            try {
              await stat(iconPath);
              keptCount++;
            } catch (err) {
              // File doesn't exist, that's okay
            }
          } else {
            // This is not the preferred format, delete it
            const iconPath = join(ICONS_DIR, format, `${appId}.${format}`);
            try {
              const stats = await stat(iconPath);
              totalSize += stats.size;
              await unlink(iconPath);
              deletedCount++;
            } catch (err) {
              // File doesn't exist, that's okay
            }
          }
        }

        // Also clean up color variants that aren't needed
        if (metadata.colors) {
          for (const format of FORMATS) {
            if (format !== preferredFormat) {
              // Delete dark variant
              if (metadata.colors.dark) {
                const darkPath = join(ICONS_DIR, format, `${metadata.colors.dark}.${format}`);
                try {
                  const stats = await stat(darkPath);
                  totalSize += stats.size;
                  await unlink(darkPath);
                  deletedCount++;
                } catch (err) {}
              }
              // Delete light variant
              if (metadata.colors.light) {
                const lightPath = join(ICONS_DIR, format, `${metadata.colors.light}.${format}`);
                try {
                  const stats = await stat(lightPath);
                  totalSize += stats.size;
                  await unlink(lightPath);
                  deletedCount++;
                } catch (err) {}
              }
            }
          }
        }
      } catch (err) {
        console.warn(`⚠️  Failed to process ${file}:`, err.message);
      }
    }

    const sizeMB = (totalSize / 1024 / 1024).toFixed(2);
    console.log(`\n✅ Cleanup complete!`);
    console.log(`   Kept: ${keptCount} icons`);
    console.log(`   Deleted: ${deletedCount} duplicate icons`);
    console.log(`   Freed: ${sizeMB} MB`);

    process.exit(0);

  } catch (error) {
    console.error('❌ Failed to cleanup icons:', error);
    process.exit(1);
  }
}

cleanupIcons();

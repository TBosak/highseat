#!/usr/bin/env node
import { readdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import yaml from 'js-yaml';

const BASE16_DIR = './public/base16';
const BASE24_DIR = './public/base24';
const OUTPUT_FILE = './public/themes.json';

async function loadThemesFromDirectory(directory, system) {
  console.log(`Loading themes from ${directory}...`);
  const files = await readdir(directory);
  const yamlFiles = files.filter(f => f.endsWith('.yaml') && f !== 'manifest.json');

  const themes = [];

  for (const file of yamlFiles) {
    try {
      const content = await readFile(join(directory, file), 'utf8');
      const theme = yaml.load(content);

      if (theme && theme.name) {
        // Ensure system is set
        theme.system = theme.system || system;
        // Store original filename for reference
        theme.filename = file;
        themes.push(theme);
      }
    } catch (err) {
      console.error(`Failed to load ${file}:`, err.message);
    }
  }

  console.log(`Loaded ${themes.length} themes from ${directory}`);
  return themes;
}

async function consolidateThemes() {
  console.log('Starting theme consolidation...\n');

  const base16Themes = await loadThemesFromDirectory(BASE16_DIR, 'base16');
  const base24Themes = await loadThemesFromDirectory(BASE24_DIR, 'base24');

  const allThemes = [...base16Themes, ...base24Themes];

  // Sort by name
  allThemes.sort((a, b) => a.name.localeCompare(b.name));

  console.log(`\nTotal themes: ${allThemes.length}`);
  console.log(`- Base16: ${base16Themes.length}`);
  console.log(`- Base24: ${base24Themes.length}`);

  // Create JSON output with themes array
  const jsonContent = JSON.stringify({ themes: allThemes }, null, 2);

  await writeFile(OUTPUT_FILE, jsonContent, 'utf8');
  console.log(`\n✓ Consolidated themes written to ${OUTPUT_FILE}`);
  console.log(`  File size: ${(jsonContent.length / 1024).toFixed(2)} KB`);
  process.exit(0);
}

consolidateThemes().catch(err => {
  console.error('Consolidation failed:', err);
  process.exit(1);
});

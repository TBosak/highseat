import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map, catchError, of, switchMap } from 'rxjs';
import * as yaml from 'js-yaml';

export interface ThemeDefinition {
  system: 'base16' | 'base24';
  name: string;
  author: string;
  variant: 'dark' | 'light';
  palette: Record<string, string>;
  filename: string; // Added for tracking
}

@Injectable({
  providedIn: 'root'
})
export class ThemeLoaderService {
  private http = inject(HttpClient);

  /**
   * Loads all Base16 and Base24 theme definitions from the public directory
   */
  loadAllThemes(): Observable<ThemeDefinition[]> {
    console.log('Loading all themes...');
    return forkJoin({
      base16: this.loadThemesFromDirectory('base16'),
      base24: this.loadThemesFromDirectory('base24')
    }).pipe(
      map(({ base16, base24 }) => {
        console.log(`Loaded ${base16.length} Base16 themes and ${base24.length} Base24 themes`);
        return [...base16, ...base24];
      }),
      map(themes => {
        // Filter out themes without a name and sort
        const validThemes = themes.filter(t => t && t.name);
        const sorted = validThemes.sort((a, b) => {
          const nameA = a.name || '';
          const nameB = b.name || '';
          return nameA.localeCompare(nameB);
        });
        console.log(`Total themes after filtering and sorting: ${sorted.length}`);
        return sorted;
      }),
      catchError(err => {
        console.error('Failed to load all themes:', err);
        return of([]);
      })
    );
  }

  /**
   * Loads themes from a specific directory (base16 or base24)
   */
  private loadThemesFromDirectory(directory: 'base16' | 'base24'): Observable<ThemeDefinition[]> {
    console.log(`Loading themes from ${directory}...`);
    return this.getThemeFiles(directory).pipe(
      switchMap(files => {
        console.log(`Found ${files.length} theme files in ${directory}`);
        if (files.length === 0) {
          return of([]);
        }
        // Load all theme files in parallel
        const requests = files.map(file => this.loadThemeFile(directory, file));
        return forkJoin(requests);
      }),
      map(themes => {
        const validThemes = themes.filter(t => t !== null) as ThemeDefinition[];
        console.log(`Successfully loaded ${validThemes.length} themes from ${directory}`);
        return validThemes;
      }),
      catchError(err => {
        console.error(`Failed to load themes from ${directory}:`, err);
        return of([]);
      })
    );
  }

  /**
   * Gets the list of YAML files from the manifest
   */
  private getThemeFiles(directory: 'base16' | 'base24'): Observable<string[]> {
    return this.http.get<string[]>(`/${directory}/manifest.json`).pipe(
      catchError(err => {
        console.error(`Failed to load manifest for ${directory}:`, err);
        return of([]);
      })
    );
  }

  /**
   * Loads and parses a single theme file
   */
  private loadThemeFile(directory: string, filename: string): Observable<ThemeDefinition | null> {
    const url = `/${directory}/${filename}`;

    return this.http.get(url, { responseType: 'text' }).pipe(
      map(yamlContent => {
        try {
          const parsed = yaml.load(yamlContent) as any;

          // Validate required fields
          if (!parsed || !parsed.name) {
            console.warn(`Invalid theme structure in ${filename}:`, parsed);
            return null;
          }

          // Handle both palette formats:
          // 1. Colors nested in 'palette' object
          // 2. Colors at root level (base00, base01, etc.)
          let palette: Record<string, string>;

          if (parsed.palette) {
            palette = parsed.palette;
          } else {
            // Extract base colors from root level
            palette = {};
            const colorKeys = Object.keys(parsed).filter(key => key.startsWith('base'));

            if (colorKeys.length === 0) {
              console.warn(`No palette or base colors found in ${filename}:`, parsed);
              return null;
            }

            colorKeys.forEach(key => {
              palette[key] = parsed[key];
            });
          }

          const theme: ThemeDefinition = {
            system: parsed.system || (directory === 'base16' ? 'base16' : 'base24'),
            name: parsed.name,
            author: parsed.author || 'Unknown',
            variant: parsed.variant || 'dark',
            palette,
            filename
          };

          return theme;
        } catch (err) {
          console.error(`Failed to parse ${filename}:`, err);
          return null;
        }
      }),
      catchError(err => {
        console.warn(`Failed to load ${filename}:`, err);
        return of(null);
      })
    );
  }

  /**
   * Converts a ThemeDefinition to the Theme format expected by the backend
   */
  convertToTheme(themeDef: ThemeDefinition, styleMode: 'minimal' | 'glassmorphic' | 'neobrutal' | 'clay' | 'custom' = 'minimal'): {
    name: string;
    baseScheme: 'base16' | 'base24';
    tokens: Record<string, string>;
    styleMode: 'minimal' | 'glassmorphic' | 'neobrutal' | 'clay' | 'custom';
    useGlobalBackground: boolean;
  } {
    return {
      name: themeDef.name,
      baseScheme: themeDef.system,
      tokens: themeDef.palette,
      styleMode,
      useGlobalBackground: false
    };
  }
}

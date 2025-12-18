# Theme Management

This project uses themes from the [tinted-theming/schemes](https://github.com/tinted-theming/schemes) repository.

## Checking for New Schemes

To check if new Base16 or Base24 schemes are available:

```bash
npm run check:schemes
```

This will:
- Fetch the latest scheme list from the tinted-theming repository
- Compare with your local schemes
- Report which schemes are new, missing, or outdated

## Downloading New Schemes

To automatically download all new schemes:

```bash
npm run update:schemes
```

This will:
1. Download all new scheme YAML files
2. Validate each scheme
3. Automatically rebuild `themes.json`

## Manual Scheme Management

### Checking for Updates
```bash
node scripts/check-new-schemes.js
```

### Downloading New Schemes
```bash
node scripts/check-new-schemes.js --download
```

### Rebuilding Theme Catalog
After adding/removing scheme files manually:
```bash
npm run consolidate:themes
```

## Scheme Sources

- **Base16**: https://github.com/tinted-theming/schemes/tree/main/base16
- **Base24**: https://github.com/tinted-theming/schemes/tree/main/base24

## Directory Structure

```
frontend/
├── public/
│   ├── base16/          # Base16 scheme YAML files (299 schemes)
│   ├── base24/          # Base24 scheme YAML files (182 schemes)
│   └── themes.json      # Compiled theme catalog (generated)
├── scripts/
│   ├── consolidate-themes.js    # Builds themes.json from YAML files
│   └── check-new-schemes.js     # Checks for new upstream schemes
```

## Theme Format

Each scheme is a YAML file with the following structure:

### Base16 Format
```yaml
scheme: "Theme Name"
author: "Author Name"
base00: "202020"  # Background
base01: "303030"  # Lighter background
base02: "404040"  # Selection background
base03: "505050"  # Comments
base04: "b0b0b0"  # Dark foreground
base05: "d0d0d0"  # Default foreground
base06: "e0e0e0"  # Light foreground
base07: "f0f0f0"  # Light background
base08: "fb4934"  # Red
base09: "fe8019"  # Orange
base0A: "fabd2f"  # Yellow
base0B: "b8bb26"  # Green
base0C: "8ec07c"  # Cyan
base0D: "83a598"  # Blue
base0E: "d3869b"  # Purple
base0F: "d65d0e"  # Brown
```

### Base24 Format
Base24 includes all Base16 colors plus 8 additional colors:
```yaml
base10: "color"  # Extended palette
base11: "color"
base12: "color"
base13: "color"
base14: "color"
base15: "color"
base16: "color"
base17: "color"
```

## Build Process

1. **Prebuild Hook**: Automatically runs before `npm start` or `npm run build`
   ```bash
   npm run consolidate:themes
   ```

2. **Theme Compilation**: Converts all YAML schemes to single `themes.json`
   - Reads all `.yaml` files from `public/base16/` and `public/base24/`
   - Parses and validates each scheme
   - Generates consolidated `themes.json` (used at runtime)
   - Output format: JSON (10x faster parsing than YAML)

3. **Runtime**: Frontend loads `themes.json` (not individual YAML files)
   - Cached in memory with `shareReplay(1)`
   - Custom themes loaded separately from API

## Custom Themes

Users can also create custom themes through the UI:
- Navigate to Theme Browser
- Click "Create Custom Theme"
- Choose Base16 or Base24 system
- Define colors and metadata
- Save to database (not filesystem)

Custom themes are stored in the backend database and loaded alongside bundled themes.

## Performance Notes

- **Bundled themes** (from YAML files): Cached aggressively (static)
- **Custom themes** (user-created): Always fetched fresh (dynamic)
- **Icon catalog**: Lazy loaded per card
- **Virtual scrolling**: Only renders ~20-30 visible theme cards at a time

## Troubleshooting

### Schemes not showing up after download
```bash
npm run consolidate:themes
```

### GitHub API rate limiting
If you hit rate limits, wait an hour or use a GitHub personal access token:
```bash
export GITHUB_TOKEN="your_token_here"
npm run check:schemes
```

### Validation errors
Check that the scheme YAML file has all required fields:
- `scheme` (theme name)
- `author` (author name)
- `base00` through `base0F` (all 16 colors)

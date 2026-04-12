# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development build (watch mode, inline sourcemaps)
npm run dev

# Production build (type-check + minified bundle)
npm run build

# Type-check only (no emit)
npx tsc --noEmit --skipLibCheck
```

There are no tests. The plugin is manually tested by symlinking the repo into an Obsidian vault's `.obsidian/plugins/obsidian-widgets/` directory and enabling the plugin.

## Architecture

This is an **Obsidian plugin** that renders YAML code blocks as interactive widgets. It follows a clean architecture with four layers:

```
src/
  domain/          # Interfaces and value objects — no dependencies
  application/     # Use cases — depend only on domain
  infrastructure/  # Obsidian APIs, YAML parsing, weather HTTP calls
  presentation/    # Widget renderers and settings UI
  main.ts          # Plugin entry point; wires everything together
```

### Path aliases (defined in both `tsconfig.json` and `esbuild.config.mjs`)

| Alias | Maps to |
|---|---|
| `@domain` | `src/domain` |
| `@application` | `src/application` |
| `@infrastructure` | `src/infrastructure` |
| `@presentation` | `src/presentation` |

### Three registered widgets

Each widget is a Markdown code block processor registered in `main.ts`:

| Code block tag | Widget | Key config |
|---|---|---|
| `widget-dashboard` | Icon bar + date bar | `icons[]` with `icon`, `link`, `command`, `tooltip` |
| `widget-daily` | Date card + weather + nav | `weather` (lat/lng/units), `name` |
| `widget-weekly` | Week grid + 7-day forecast | `weather` (lat/lng/units) |

### Widget lifecycle

Every widget renderer creates a `MarkdownRenderChild` subclass and registers it via `ctx.addChild()`. Obsidian manages the component's lifecycle (calls `onload()` / `onunload()` automatically). DOM is built imperatively inside `onload()`.

### Data flow per widget

1. `Renderer.render(source, el, ctx)` → creates a `MarkdownRenderChild`, registers it via `ctx.addChild()`
2. `onload()` → calls `ParseXxxConfigUseCase.execute(source)` which delegates to a `YamlXxxParser`
3. Use case fetches data (weather via `OpenMeteo*Adapter`) and calls sub-renderers
4. Sub-renderers (`DateCardRenderer`, `WeatherRenderer`, etc.) build DOM nodes on the container

### Domain ports

- `IWeatherPort` / `IWeatherForecastPort` — fetched from Open-Meteo (no API key required)
- `IPeriodicNotePort` — wraps `obsidian-daily-notes-interface` for opening daily/weekly notes
- `IWidgetParser<T>` — generic parse interface implemented by all `YamlXxxParser` classes

### i18n

Supported languages: `en`, `es`. Auto-detects from Obsidian's `window.moment.locale()`. Language can be overridden in plugin settings. Translation keys live in `src/infrastructure/i18n/locales/`.

### Build output

esbuild bundles everything into `main.js` (CJS format, ES2018 target). `obsidian`, CodeMirror packages, and Node built-ins are externalized. The `manifest.json` and `styles.css` (if present) must also be placed in the plugin folder for Obsidian to load the plugin.

## Approach
- Think before acting. Read existing files before writing code.
- Be concise in output but thorough in reasoning.
- Prefer editing over rewriting whole files.
- Do not re-read files you have already read unless the file may have changed.
- Test your code before declaring done.
- No sycophantic openers or closing fluff.
- Keep solutions simple and direct.
- User instructions always override this file.

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

### Five registered widgets

Each widget is a Markdown code block processor registered in `main.ts`:

| Code block tag | Widget | Key config |
|---|---|---|
| `widget-dashboard` | Icon bar + date bar | `icons[]` with `icon`, `link`, `command`, `tooltip` |
| `widget-daily` | Date card + weather + calendar events + quick-capture | `weather`, `name`, `date`, `calendars[]`, `captures[]`, `gratitude` |
| `widget-weekly` | Week grid + 7-day forecast | `weather` (lat/lng/units) |
| `widget-monthly` | Monthly calendar grid with colored dots | `month`, `year`, `legend` |
| `tw-weekly` | Simplified weekly grid, no weather | `week`, `year` (JSON input) |

### Widget lifecycle

Every widget renderer creates a `MarkdownRenderChild` subclass and registers it via `ctx.addChild()`. Obsidian manages the component's lifecycle (calls `onload()` / `onunload()` automatically). DOM is built imperatively inside `onload()`.

### Data flow per widget

1. `Renderer.render(source, el, ctx)` → creates a `MarkdownRenderChild`, registers it via `ctx.addChild()`
2. `onload()` → calls `ParseXxxConfigUseCase.execute(source)` which delegates to a `YamlXxxParser`
3. Use case fetches data (weather via `OpenMeteo*Adapter`) and calls sub-renderers
4. Sub-renderers (`DateCardRenderer`, `WeatherRenderer`, etc.) build DOM nodes on the container

### Domain ports

- `IWeatherPort` — `fetchWeatherForDate(config, dateStr)`: routes to Open-Meteo archive (past), current, or forecast endpoint based on date
- `IWeatherForecastPort` — `fetchWeekForecast(config, weekMonday)`: 7-day forecast; uses archive API for past weeks
- `ICalendarPort` — `fetchEventsForDate(url, dateStr)`: parses iCal feeds, filtered to a single day
- `IPeriodicNotePort` — wraps `obsidian-daily-notes-interface` for opening daily/weekly notes
- `IWidgetParser<T>` — generic parse interface implemented by all `YamlXxxParser` classes

### i18n

Supported languages: `en`, `es`. Auto-detects from Obsidian's `window.moment.locale()`. Language can be overridden in plugin settings. Translation keys live in `src/infrastructure/i18n/locales/`.

### Build output

esbuild bundles everything into `main.js` (CJS format, ES2018 target). `obsidian`, CodeMirror packages, and Node built-ins are externalized. The `manifest.json` and `styles.css` (if present) must also be placed in the plugin folder for Obsidian to load the plugin.

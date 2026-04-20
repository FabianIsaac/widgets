# Obsidian Widgets — Developer Documentation

## Overview

Obsidian Widgets is a plugin that renders YAML/JSON code blocks as interactive calendar widgets inside Obsidian notes. It follows a clean layered architecture designed to keep Obsidian-specific code isolated from business logic.

---

## Architecture

```
src/
  domain/          # Pure interfaces and value objects — no dependencies
  application/     # Use cases — depend only on domain
  infrastructure/  # Obsidian APIs, YAML parsing, HTTP calls
  presentation/    # Widget renderers and settings UI
  main.ts          # Plugin entry point; wires all layers together
```

### Layer rules

| Layer | Can depend on | Cannot depend on |
|---|---|---|
| `domain` | nothing | everything else |
| `application` | `domain` | `infrastructure`, `presentation` |
| `infrastructure` | `domain`, `application` | `presentation` |
| `presentation` | all layers | — |

### Path aliases

Defined in both `tsconfig.json` and `esbuild.config.mjs`:

| Alias | Path |
|---|---|
| `@domain` | `src/domain` |
| `@application` | `src/application` |
| `@infrastructure` | `src/infrastructure` |
| `@presentation` | `src/presentation` |

---

## Registered widgets

| Code block tag | Widget class | Description |
|---|---|---|
| `widget-dashboard` | `DashboardWidgetRenderer` | Icon bar + date bar |
| `widget-daily` | `DailyNoteWidgetRenderer` | Date card + weather + navigation |
| `widget-weekly` | `WeeklyNoteWidgetRenderer` | Week grid + 7-day forecast |
| `widget-monthly` | `MonthlyNoteWidgetRenderer` | Monthly calendar grid with dots |
| `tw-weekly` | `TwWeeklyWidgetRenderer` | Simplified weekly grid, no weather |

---

## Widget lifecycle

Every renderer creates a `MarkdownRenderChild` subclass and registers it via `ctx.addChild()`. Obsidian calls `onload()` / `onunload()` automatically.

```
Renderer.render(source, el, ctx)
  └── creates Component extends MarkdownRenderChild
  └── ctx.addChild(component)
       └── onload()
            ├── ParseXxxConfigUseCase.execute(source)   ← YAML/JSON → typed config
            ├── fetch data if needed (weather, etc.)
            └── build DOM imperatively via sub-renderers
```

---

## Domain ports

| Port | Adapter | Purpose |
|---|---|---|
| `IWeatherPort` | `OpenMeteoWeatherAdapter` | Date-accurate weather: archive (past), current, or forecast |
| `IWeatherForecastPort` | `OpenMeteoForecastAdapter` | 7-day forecast; uses archive API for past weeks |
| `ICalendarPort` | `ICalFeedAdapter` | iCal feed parser — fetches events for a specific date |
| `IPeriodicNotePort` | `ObsidianPeriodicNoteAdapter` | Open daily/weekly/monthly/yearly notes |
| `IWidgetParser<T>` | `YamlXxxParser` / `JsonXxxParser` | Parse code block source into typed config |

### IWeatherPort — date routing

`OpenMeteoWeatherAdapter.fetchWeatherForDate(config, dateStr)` routes to three private methods based on how `dateStr` compares to today:

| Date | Endpoint | Fields |
|---|---|---|
| Today | `api.open-meteo.com/v1/forecast` with `current` + `forecast_days=1` | `current.weather_code`, `current.wind_speed_10m`, `daily.temperature_2m_min/max` |
| Past | `archive-api.open-meteo.com/v1/archive` with `start_date`/`end_date` | `daily.weather_code`, `daily.wind_speed_10m_max`, `daily.temperature_2m_min/max` |
| Future | `api.open-meteo.com/v1/forecast` with `start_date`/`end_date` | same as archive shape |

`OpenMeteoForecastAdapter.fetchWeekForecast(config, weekMonday)` detects past weeks (`endStr < today`) and switches to the archive API for those.

### ICalendarPort — iCal parsing

`ICalFeedAdapter` uses `requestUrl` from the Obsidian API (instead of `fetch`) to bypass Obsidian's Content Security Policy for external URLs. It implements a minimal RFC 5545 parser:

- Line unfolding (CRLF + whitespace continuation)
- VEVENT extraction
- DTSTART variants: `DATE` (all-day), `DATE-TIME` local, `DATE-TIME` UTC (`Z` suffix), `TZID=...` (treated as local machine time)
- 5-minute in-memory cache per URL (avoids re-fetching when the same feed is used in multiple widgets)

### Frontmatter cache keys

The daily widget persists fetched data to the note's frontmatter so it survives offline sessions:

| Key | Stored by | Content |
|---|---|---|
| `widget_daily_weather` | `DailyNoteWidgetRenderer` | `WeatherData` + `cachedAt: YYYY-MM-DD` (keyed to the widget's own date, not always today) |
| `widget_daily_events` | `DailyNoteWidgetRenderer` | `CalendarEvent[]` — plain array, always overwritten on re-fetch |
| `widget_weekly_weather_v2` | `WeeklyNoteWidgetRenderer` | `DailyForecast[]` with `cachedAt: YYYY-MM-DD` |

---

## Monthly widget — dot system

The monthly calendar renders colored dots under each day number using three independent sources:

### 1. Tag colors (`tagColors`)
Reads the `tags` frontmatter array. If any tag matches a configured entry, its color dot is shown.

```typescript
// domain: TagColorEntry { tag: string; color: string }
// resolution: getFileTags(app, file) → tags[]
//             → match against tagColors config
```

### 2. Link colors (`linkColors`)
Reads `cache.links` (outgoing wiki-links). If any link basename matches a configured entry, its color dot is shown.

```typescript
// domain: LinkColorEntry { link: string; alias?: string; color: string }
// resolution: getFileLinks(app, file) → basenames[]
//             → match against linkColors config
```

### 3. Frontmatter property colors (`frontmatterColors`)
Reads arbitrary frontmatter properties. Matches when `String(frontmatter[property]).toLowerCase() === value.toLowerCase()`.

```typescript
// domain: FrontmatterColorEntry { property: string; value: string; alias?: string; color: string }
// resolution: cache.frontmatter[property] → string comparison (case-insensitive)
```

### 4. Task indicators

Two additional non-color indicators are derived from `cache.listItems`:

| Indicator | CSS class | Condition |
|---|---|---|
| `✓` (accent colored) | `widget-monthly__day-task-done` | `listItems` has any item with `task === 'x'` or `task === 'X'` |
| `○` (outline circle) | `widget-monthly__day-dot--pending` | `listItems` has any item with `task === ' '` |

### 5. Task ratio text

A small `X/Y` text is rendered below the dots when `total > 0`:
- `X` = completed tasks (`task === 'x'` or `'X'`)
- `Y` = all items where `task !== undefined`

CSS class: `widget-monthly__day-tasks`

### Dot deduplication

All color sources pass through `resolveAllDotColors()`, which dedupes by color value across all three sources. A given color can only appear once even if matched by multiple rules.

---

## tw-weekly widget

A simplified version of `widget-weekly` with no weather data. Designed for backward compatibility with an older format that sends JSON.

- **Input format**: JSON (`{ "week": 14, "year": 2026 }`)
- **Parser**: reuses `YamlWeeklyNoteParser` — js-yaml parses JSON natively since YAML is a superset of JSON
- **Use case**: reuses `ParseWeeklyNoteConfigUseCase`
- **CSS**: reuses `.widget-weekly` classes — identical DOM structure, minus weather rows

Source: [src/presentation/widgets/tw-weekly/TwWeeklyWidgetRenderer.ts](../src/presentation/widgets/tw-weekly/TwWeeklyWidgetRenderer.ts)

---

## Settings

Settings are stored via Obsidian's `loadData()` / `saveData()` and managed by `SettingsManager`.

| Setting | Type | Description |
|---|---|---|
| `language` | `string` | `"auto"`, `"en"`, or `"es"` |
| `latitude` | `string` | Default weather latitude |
| `longitude` | `string` | Default weather longitude |
| `location` | `string` | Default weather location name |
| `units` | `"celsius" \| "fahrenheit"` | Default temperature units |
| `tagColors` | `TagColorEntry[]` | Tag → color dot mappings |
| `linkColors` | `LinkColorEntry[]` | Link → color dot mappings |
| `frontmatterColors` | `FrontmatterColorEntry[]` | Frontmatter property+value → color dot mappings |

---

## i18n

Auto-detects from `window.moment.locale()`. Can be overridden in settings.

Locale files: `src/infrastructure/i18n/locales/{en,es}.json`

Translation keys follow the pattern `section.key`. Access via `t("section.key")` imported from `@infrastructure/i18n/i18n`.

---

## Build

```bash
npm run dev        # watch mode, inline sourcemaps
npm run build      # type-check + minified bundle
npx tsc --noEmit --skipLibCheck  # type-check only
```

Output: `main.js` (CJS, ES2018). Externalized: `obsidian`, CodeMirror packages, Node built-ins.

---

## Adding a new widget

1. Define config in `src/domain/widget/value-objects/XxxConfig.ts`
2. Implement parser in `src/infrastructure/parsers/YamlXxxParser.ts`
3. Implement use case in `src/application/xxx/ParseXxxConfigUseCase.ts`
4. Implement renderer in `src/presentation/widgets/xxx/XxxWidgetRenderer.ts`
5. Register in `src/main.ts`:

```typescript
const xxxRenderer = new XxxWidgetRenderer(
  new ParseXxxConfigUseCase(new YamlXxxParser()),
  openPeriodicNoteUseCase
);
this.registerMarkdownCodeBlockProcessor(
  "widget-xxx",
  (source, el, ctx) => xxxRenderer.render(source, el, ctx)
);
```

6. Add CSS under the corresponding block comment in `styles.css`

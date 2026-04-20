# Obsidian Widgets — User Guide

## Installation

1. Copy `main.js`, `manifest.json`, and `styles.css` into your vault's `.obsidian/plugins/obsidian-widgets/` folder.
2. In Obsidian → Settings → Community plugins, enable **Obsidian Widgets**.

---

## Widgets

### widget-dashboard

Renders a quick-access icon bar and a date bar. Clicking icons opens notes or runs commands.

````markdown
```widget-dashboard
icons:
  - icon: calendar
    link: "Daily Notes/2026-04-13"
    tooltip: "Today"
  - icon: list-checks
    command: "tasks:open"
    tooltip: "Tasks"
```
````

| Property | Type | Description |
|---|---|---|
| `icon` | string | Lucide icon name |
| `link` | string | Note path to open (optional) |
| `command` | string | Obsidian command ID to run (optional) |
| `tooltip` | string | Hover text (optional) |

---

### widget-daily

A date card with optional weather, calendar events, a personalized greeting, quick-capture buttons, and a gratitude section. Can target any date (past or future) or default to today.

````markdown
```widget-daily
name: Fabian
weather:
  latitude: -33.511
  longitude: -70.631
  units: celsius
calendars:
  - url: "https://example.com/feed.ics"
  - url: "https://example.com/other.ics"
captures:
  - label: "💭 Pensamiento"
    format: "- {text}"
  - label: "✅ Tarea"
    format: "- [ ] {text}"
  - label: "🌙 Reflexión"
    format: "- {time} {text}"
    after: 20
    until: 24
gratitude:
  heading: Agradecimientos
  after: 18
```
````

| Property | Type | Default | Description |
|---|---|---|---|
| `date` | string (`YYYY-MM-DD`) | today | Date this widget represents. Omit for today's note. |
| `name` | string | — | Name used in the time-of-day greeting |
| `weather.latitude` | number | plugin default | Location latitude |
| `weather.longitude` | number | plugin default | Location longitude |
| `weather.units` | `celsius` / `fahrenheit` | plugin default | Temperature unit |
| `calendars` | list | — | iCal feed URLs to show events from (see below) |
| `captures` | list | plugin default | Quick-capture buttons (see below) |
| `gratitude` | object | — | Gratitude input section (see below) |

All weather fields are optional. If omitted, the plugin uses the defaults set in Settings.

> **Past and future dates**: When `date` is set, weather is fetched for that specific date (historical archive or forecast). Quick-capture buttons are hidden for any widget that is not today's widget.

#### Calendar events

Add one or more iCal feed URLs to display events from. Events are fetched every time the note is opened and stored in the note's frontmatter (`widget_daily_events`) so they survive offline sessions. The display refreshes in the background whenever new data arrives.

```yaml
calendars:
  - url: "https://example.com/calendar.ics"
  - url: "https://family.example.com/shared.ics"
```

Events are deduplicated across feeds (same title + start time = one entry). All-day events appear first, followed by timed events sorted by start time.

#### Quick-capture buttons

Capture buttons appear as a row of toggleable buttons at the bottom of the widget. Clicking a button opens a shared input field; pressing Enter appends the formatted line to the note and closes the input. Pressing Escape cancels.

Each button is configured with:

| Field | Type | Required | Description |
|---|---|---|---|
| `label` | string | yes | Text shown on the button. Emoji are welcome: `"💭 Pensamiento"` |
| `format` | string | yes | Template for the appended line. Supports `{text}` (user input) and `{time}` (current HH:mm). Example: `"- {time} {text}"` |
| `heading` | string | no | Markdown heading to append the line under. If omitted, entries are grouped under an **hour block** (e.g. `## 10:00`) — see below. |
| `placeholder` | string | no | Input placeholder text. Defaults to "Agregar…" |
| `after` | number (0–23) | no | Hour of day from which this button becomes visible. `after: 20` hides the button until 8 pm. Defaults to `0` (always visible). |
| `until` | number (0–23) | no | Hour of day until which this button is visible (exclusive). `until: 10` hides the button at 10:00 am. When `after > until`, the range wraps midnight (e.g. `after: 23, until: 4` → visible 23:00–03:59). Omit to stay visible for the rest of the day. |

> **Global templates**: If a `widget-daily` block does not include a `captures:` key, the plugin falls back to the **Quick-capture templates** defined in Settings. This lets you configure your buttons once and have them available in every daily note without repeating the YAML.

#### Hour-block grouping

When a capture has no `heading`, its entries are automatically grouped under a heading named after the current hour — `## 10:00`, `## 14:00`, etc. Multiple entries within the same hour land in the same block. This keeps your daily notes organized by time without any manual setup.

```markdown
## 10:00
- 10:05 💭 Comprar regalo para mamá
- 10:23 ✅ Revisar PR de Vicente

## 14:00
- 14:11 💭 Nueva idea para el plugin
```

#### Gratitude section

The gratitude configuration adds a dedicated button to the capture row. Its entries always appear as the **last section** in the note — any new hour blocks or headings are inserted above it.

| Field | Type | Required | Description |
|---|---|---|---|
| `heading` | string | yes | Markdown heading used as the section title and button label |
| `after` | number (0–23) | no | Hour from which the button becomes visible. Defaults to `0`. |
| `tag` | string | no | Tag added to the note's frontmatter on the first gratitude entry. Overrides the global setting. Without `#`. |

> **Global auto-tag**: You can configure a global gratitude tag in Settings → "Auto-etiqueta de gratitud". The per-widget `tag` field overrides it for that specific widget.

---

### widget-weekly

A 7-day grid for the week, with a weather forecast for each day.

````markdown
```widget-weekly
week: 15
year: 2026
weather:
  latitude: -33.511
  longitude: -70.631
```
````

| Property | Type | Default | Description |
|---|---|---|---|
| `week` | number | current week | ISO week number (1–53) |
| `year` | number | current year | Full year |
| `weather` | object | — | Same as `widget-daily`. Omit to hide weather. |

Clicking a day opens its daily note. Clicking the month opens the monthly note. Clicking the year opens the yearly note. Use the `‹` / `›` arrows to navigate between weeks.

#### Week summary

Below the 7-day grid, the widget shows a summary row for the displayed week:

| Indicator | Meaning |
|---|---|
| `#tag` pills | Top 3 most-used tags across daily notes in the week |
| `+N` | Notes created this week (excludes daily notes) |
| `✓ X/Y` | Completed tasks out of total tasks |
| `○ N` | Days with at least one pending task |

Hover any metric to see a tooltip with more detail. Tags starting with configured **excluded prefixes** (Settings) are hidden from the top-tags list.

---

### widget-monthly

A full monthly calendar grid with colored dots and task indicators per day.

````markdown
```widget-monthly
month: 4
year: 2026
legend: true
```
````

| Property | Type | Default | Description |
|---|---|---|---|
| `month` | number | current month | Month number (1–12) |
| `year` | number | current year | Full year |
| `legend` | boolean | `false` | Show a color legend below the calendar |

Clicking a day number opens its daily note. Clicking a week number opens its weekly note. Clicking the month or year opens the corresponding periodic note.

#### Day indicators

Each day can show up to three types of information below its number:

| Indicator | What it means |
|---|---|
| Colored dot `●` | The daily note has a matching tag, link, or frontmatter property (configured in Settings) |
| `✓` (accent color) | The daily note has at least one completed task (`- [x]`) |
| `○` (outline circle) | The daily note has at least one pending task (`- [ ]`) |
| `X/Y` (small text) | Task ratio — X completed out of Y total tasks |

> The `✓` and `○` indicators are read directly from Obsidian's metadata cache — no need to have the note open.

#### Configuring colored dots

Go to **Settings → Obsidian Widgets** to configure which properties generate color dots.

**Tag colors**
Map a note tag to a color. If a daily note has that tag in its frontmatter, the dot appears.

```yaml
# Daily note frontmatter example
tags: [review, personal]
```

**Link colors**
Map an outgoing wiki-link to a color. If a daily note contains `[[My Project]]`, configure `link: My Project`.

**Frontmatter property colors**
Map any frontmatter property and its value to a color. Comparison is case-insensitive.

```yaml
# Daily note frontmatter examples
mood: happy
energy: high
reviewed: true
rating: 5
```

In Settings, configure:
- Property: `mood` / Value: `happy`
- Property: `energy` / Value: `high`
- Property: `reviewed` / Value: `true`

Each matched rule adds a colored dot under that day. If multiple rules produce the same color, it is only shown once.

---

### tw-weekly

A simplified weekly grid without weather. Designed for backward compatibility. Accepts JSON input.

````markdown
```tw-weekly
{
  "week": 14,
  "year": 2026
}
```
````

| Property | Type | Default | Description |
|---|---|---|---|
| `week` | number | current week | ISO week number |
| `year` | number | current year | Full year |

Clicking a day opens its daily note. Identical navigation to `widget-weekly` but no weather data is shown or fetched.

---

## Settings

Open **Settings → Obsidian Widgets** to configure global defaults.

### Language
Controls the language used for widget labels. `Auto` follows Obsidian's own language setting. Available: Auto, English, Español.

### Default weather location
Used by `widget-daily` and `widget-weekly` when no weather block is specified in the code block.

| Field | Description |
|---|---|
| Latitude | Decimal latitude (e.g. `-33.511`) |
| Longitude | Decimal longitude (e.g. `-70.631`) |
| Location name | Display name shown in the weather card (optional) |
| Temperature units | Celsius or Fahrenheit |

### Quick-capture templates (daily widget)
Global capture buttons available in all `widget-daily` blocks. If a widget defines its own `captures:` key, these are ignored for that widget.

Each template has:
- **Label** — text shown on the button
- **Format** — line template using `{text}` and/or `{time}`
- **Heading** — markdown heading to append under. Leave empty to use hour-block grouping (`## HH:00`)

### Gratitude auto-tag (daily widget)
A tag added automatically to the daily note's frontmatter when the first gratitude entry is submitted. Store without the `#`. Leave empty to disable. Can be overridden per-widget with `gratitude.tag`.

### Tag colors
Each entry maps a note tag to a color. Colors available: Red, Orange, Yellow, Green, Cyan, Blue, Purple, Pink.

### Link colors
Each entry maps an outgoing wiki-link basename to a color. The **alias** field lets you show a friendly name in the legend instead of the raw filename.

### Frontmatter property colors
Each entry maps a frontmatter `property: value` pair to a color. The **label** field sets the legend text; if omitted, the legend shows `property: value`.

### Excluded tag prefixes (weekly summary)
Tag prefixes to exclude from the week summary's top-tags list. For example, adding `tipo/` will suppress `tipo/diario`, `tipo/trabajo`, etc. from the weekly top-tags display. Store without the `#`.

---

## Color palette reference

The dot system uses Obsidian's semantic color variables:

| Name | Variable |
|---|---|
| Red | `--color-red` |
| Orange | `--color-orange` |
| Yellow | `--color-yellow` |
| Green | `--color-green` |
| Cyan | `--color-cyan` |
| Blue | `--color-blue` |
| Purple | `--color-purple` |
| Pink | `--color-pink` |

These adapt automatically to your Obsidian theme.

---

## Tips

- **`after` / `until` for time-gated buttons**: Use `after: 20` on a gratitude button so it only appears in the evening; add `until: 10` on a morning capture to hide it after 10 am. Combine both to restrict a button to a specific window.
- **Hour-block grouping**: Omit `heading` from a capture to have entries auto-sorted by hour. Entries at 10:05 and 10:47 both go under `## 10:00`; entries at 11:30 get their own `## 11:00`.
- **Gratitude stays last**: The gratitude section is always the last heading in the note. Any new hour blocks are inserted before it even when you add them later in the day.
- **Multiple calendar feeds**: List as many `calendars` URLs as you like. Events from all feeds are merged and deduplicated automatically — the same event appearing in two shared calendars is shown only once.
- **Calendar events on past notes**: When a widget has a `date` set to a past day, events are fetched for that date from the iCal feeds (provided the feed still serves historical data).
- **Multiple dots per day**: A day can show multiple colored dots if several rules match. Dots are deduped by color — the same color won't appear twice even if matched by both a tag and a frontmatter rule.
- **Task ratio without tasks**: The `X/Y` ratio only appears if the note has at least one task item. Days with no tasks show no ratio.
- **Days outside the current month**: Gray out in the monthly view and are not clickable.
- **Days without a note**: Shown with a muted day number. No dots or task indicators are rendered since there is no file to read.

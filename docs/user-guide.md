# Obsidian Widgets — Guía de usuario

## Instalación

1. Copia `main.js`, `manifest.json` y `styles.css` en la carpeta `.obsidian/plugins/obsidian-widgets/` de tu vault.
2. En Obsidian → Configuración → Plugins de la comunidad, activa **Obsidian Widgets**.

---

## Widgets

### widget-dashboard

Muestra una barra de acceso rápido con íconos y una barra de fecha. Al hacer clic en los íconos se abren notas o se ejecutan comandos.

````markdown
```widget-dashboard
icons:
  - icon: calendar
    link: "Daily Notes/2026-04-13"
    tooltip: "Hoy"
  - icon: list-checks
    command: "tasks:open"
    tooltip: "Tareas"
```
````

| Propiedad | Tipo | Descripción |
|---|---|---|
| `icon` | string | Nombre de ícono de Lucide |
| `link` | string | Ruta de la nota a abrir (opcional) |
| `command` | string | ID de comando de Obsidian a ejecutar (opcional) |
| `tooltip` | string | Texto que aparece al pasar el cursor (opcional) |

---

### widget-daily

Tarjeta de fecha con clima opcional, eventos de calendario, saludo personalizado, botones de captura rápida y sección de gratitud. Puede apuntar a cualquier fecha (pasada o futura) o usar la fecha de hoy por defecto.

````markdown
```widget-daily
name: Fabian
weather:
  latitude: -33.511
  longitude: -70.631
  units: celsius
calendars:
  - url: "https://ejemplo.com/feed.ics"
  - url: "https://ejemplo.com/otro.ics"
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

| Propiedad | Tipo | Por defecto | Descripción |
|---|---|---|---|
| `date` | string (`YYYY-MM-DD`) | hoy | Fecha que representa este widget. Omitir para la nota de hoy. |
| `name` | string | — | Nombre usado en el saludo según la hora del día |
| `weather.latitude` | number | valor global | Latitud de la ubicación |
| `weather.longitude` | number | valor global | Longitud de la ubicación |
| `weather.units` | `celsius` / `fahrenheit` | valor global | Unidad de temperatura |
| `calendars` | lista | — | URLs de feeds iCal para mostrar eventos (ver abajo) |
| `captures` | lista | plantillas globales | Botones de captura rápida (ver abajo) |
| `gratitude` | objeto | — | Sección de gratitud (ver abajo) |

Todos los campos de clima son opcionales. Si se omiten, el plugin usa los valores configurados en Ajustes.

> **Fechas pasadas y futuras**: cuando se especifica `date`, el clima se obtiene para esa fecha exacta (archivo histórico o pronóstico). Los botones de captura rápida se ocultan en cualquier widget que no sea el de hoy.

#### Eventos de calendario

Agrega una o más URLs de feeds iCal para mostrar eventos. Los eventos se obtienen cada vez que se abre la nota y se guardan en el frontmatter de la nota (`widget_daily_events`) para que persistan sin conexión. La vista se actualiza en segundo plano cuando llegan datos nuevos.

```yaml
calendars:
  - url: "https://ejemplo.com/calendario.ics"
  - url: "https://familia.ejemplo.com/compartido.ics"
```

Los eventos se deduplican entre feeds (mismo título + hora de inicio = una sola entrada). Los eventos de día completo aparecen primero, seguidos de los eventos con hora, ordenados por hora de inicio.

#### Botones de captura rápida

Los botones de captura aparecen como una fila de botones en la parte inferior del widget. Al hacer clic en un botón se abre un campo de texto compartido; presionar Enter agrega la línea formateada a la nota y cierra el campo. Presionar Escape cancela.

Cada botón se configura con:

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `label` | string | sí | Texto del botón. Se permiten emojis: `"💭 Pensamiento"` |
| `format` | string | sí | Plantilla de la línea a agregar. Soporta `{text}` (lo que escribió el usuario) y `{time}` (hora actual HH:mm). Ejemplo: `"- {time} {text}"` |
| `heading` | string | no | Encabezado de Markdown bajo el cual se agrega la línea. Si se omite, las entradas se agrupan en un **bloque horario** (ej. `## 10:00`) — ver abajo. |
| `placeholder` | string | no | Texto de placeholder del campo. Por defecto: "Agregar…" |
| `after` | number (0–23) | no | Hora del día a partir de la cual el botón es visible. `after: 20` oculta el botón hasta las 8 pm. Por defecto: `0` (siempre visible). |
| `until` | number (0–23) | no | Hora del día hasta la cual el botón es visible (exclusivo). `until: 10` oculta el botón a las 10:00 am. Cuando `after > until`, el rango cruza la medianoche (ej. `after: 23, until: 4` → visible 23:00–03:59). Si se omite, el botón permanece visible el resto del día. |

> **Plantillas globales**: si un bloque `widget-daily` no incluye la clave `captures:`, el plugin usa las **Plantillas de captura rápida** definidas en Ajustes. Esto te permite configurar los botones una sola vez y tenerlos disponibles en todas las notas diarias sin repetir el YAML.

#### Agrupación por bloque horario

Cuando una captura no tiene `heading`, sus entradas se agrupan automáticamente bajo un encabezado con la hora actual — `## 10:00`, `## 14:00`, etc. Varias entradas dentro de la misma hora van al mismo bloque. Esto mantiene las notas diarias organizadas por hora sin ninguna configuración manual.

```markdown
## 10:00
- 10:05 💭 Comprar regalo para mamá
- 10:23 ✅ Revisar PR de Vicente

## 14:00
- 14:11 💭 Nueva idea para el plugin
```

#### Sección de gratitud

La configuración de gratitud agrega un botón dedicado a la fila de captura. Sus entradas siempre aparecen como la **última sección** de la nota — cualquier bloque horario nuevo o encabezado se inserta antes de ella.

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `heading` | string | sí | Encabezado de Markdown usado como título de la sección y como texto del botón |
| `after` | number (0–23) | no | Hora a partir de la cual el botón es visible. Por defecto: `0`. |
| `tag` | string | no | Etiqueta agregada al frontmatter de la nota en la primera entrada de gratitud. Reemplaza la configuración global. Sin `#`. |

> **Etiqueta automática global**: puedes configurar una etiqueta global de gratitud en Ajustes → "Auto-etiqueta de gratitud". El campo `tag` del widget la reemplaza solo para ese widget.

---

### widget-weekly

Grilla de 7 días para la semana, con pronóstico del tiempo para cada día.

````markdown
```widget-weekly
week: 15
year: 2026
weather:
  latitude: -33.511
  longitude: -70.631
```
````

| Propiedad | Tipo | Por defecto | Descripción |
|---|---|---|---|
| `week` | number | semana actual | Número de semana ISO (1–53) |
| `year` | number | año actual | Año completo |
| `weather` | objeto | — | Igual que `widget-daily`. Omitir para ocultar el clima. |

Al hacer clic en un día se abre su nota diaria. Al hacer clic en el mes se abre la nota mensual. Al hacer clic en el año se abre la nota anual. Usa las flechas `‹` / `›` para navegar entre semanas.

#### Resumen semanal

Debajo de la grilla de 7 días, el widget muestra una fila de resumen para la semana:

| Indicador | Significado |
|---|---|
| Píldoras `#tag` | Top 3 etiquetas más usadas en las notas diarias de la semana |
| `+N` | Notas creadas esta semana (excluye notas diarias) |
| `✓ X/Y` | Tareas completadas sobre el total |
| `○ N` | Días con al menos una tarea pendiente |

Pasa el cursor sobre cualquier métrica para ver un tooltip con más detalle. Las etiquetas que empiezan con **prefijos excluidos** (Ajustes) se ocultan de la lista de top etiquetas.

---

### widget-monthly

Grilla de calendario mensual completo con puntos de color e indicadores de tareas por día.

````markdown
```widget-monthly
month: 4
year: 2026
legend: true
```
````

| Propiedad | Tipo | Por defecto | Descripción |
|---|---|---|---|
| `month` | number | mes actual | Número de mes (1–12) |
| `year` | number | año actual | Año completo |
| `legend` | boolean | `false` | Mostrar una leyenda de colores debajo del calendario |

Al hacer clic en el número de un día se abre su nota diaria. Al hacer clic en el número de semana se abre la nota semanal. Al hacer clic en el mes o año se abre la nota periódica correspondiente.

#### Indicadores por día

Cada día puede mostrar hasta tres tipos de información debajo de su número:

| Indicador | Qué significa |
|---|---|
| Punto de color `●` | La nota diaria tiene una etiqueta, enlace o propiedad de frontmatter coincidente (configurado en Ajustes) |
| `✓` (color de énfasis) | La nota diaria tiene al menos una tarea completada (`- [x]`) |
| `○` (círculo sin relleno) | La nota diaria tiene al menos una tarea pendiente (`- [ ]`) |
| `X/Y` (texto pequeño) | Proporción de tareas — X completadas de Y totales |

> Los indicadores `✓` y `○` se leen directamente del caché de metadatos de Obsidian — no es necesario tener la nota abierta.

#### Configurar puntos de color

Ve a **Ajustes → Obsidian Widgets** para configurar qué propiedades generan puntos de color.

**Colores por etiqueta**
Asocia una etiqueta de nota a un color. Si una nota diaria tiene esa etiqueta en su frontmatter, aparece el punto.

```yaml
# Ejemplo de frontmatter de nota diaria
tags: [review, personal]
```

**Colores por enlace**
Asocia un wiki-link saliente a un color. Si una nota diaria contiene `[[Mi Proyecto]]`, configura `link: Mi Proyecto`.

**Colores por propiedad de frontmatter**
Asocia cualquier propiedad de frontmatter y su valor a un color. La comparación es insensible a mayúsculas.

```yaml
# Ejemplos de frontmatter de notas diarias
mood: happy
energy: high
reviewed: true
rating: 5
```

En Ajustes, configura:
- Propiedad: `mood` / Valor: `happy`
- Propiedad: `energy` / Valor: `high`
- Propiedad: `reviewed` / Valor: `true`

Cada regla que coincida agrega un punto de color debajo de ese día. Si varias reglas producen el mismo color, se muestra solo una vez.

---

### tw-weekly

Grilla semanal simplificada sin clima. Diseñada para compatibilidad con versiones anteriores. Acepta entrada JSON.

````markdown
```tw-weekly
{
  "week": 14,
  "year": 2026
}
```
````

| Propiedad | Tipo | Por defecto | Descripción |
|---|---|---|---|
| `week` | number | semana actual | Número de semana ISO |
| `year` | number | año actual | Año completo |

Al hacer clic en un día se abre su nota diaria. Navegación idéntica a `widget-weekly` pero sin datos ni consultas de clima.

---

## Ajustes

Abre **Ajustes → Obsidian Widgets** para configurar los valores globales.

### Idioma
Controla el idioma usado en las etiquetas de los widgets. `Auto` sigue el idioma propio de Obsidian. Disponible: Auto, English, Español.

### Ubicación de clima por defecto
Usada por `widget-daily` y `widget-weekly` cuando no se especifica un bloque de clima en el código.

| Campo | Descripción |
|---|---|
| Latitud | Latitud decimal (ej. `-33.511`) |
| Longitud | Longitud decimal (ej. `-70.631`) |
| Nombre de ubicación | Nombre que se muestra en la tarjeta del clima (opcional) |
| Unidades de temperatura | Celsius o Fahrenheit |

### Plantillas de captura rápida (widget diario)
Botones de captura globales disponibles en todos los bloques `widget-daily`. Si un widget define su propio `captures:`, estas plantillas se ignoran para ese widget.

Cada plantilla tiene:
- **Label** — texto del botón
- **Format** — plantilla de línea usando `{text}` y/o `{time}`
- **Heading** — encabezado de Markdown bajo el cual agregar. Dejar vacío para usar la agrupación por bloque horario (`## HH:00`)

### Auto-etiqueta de gratitud (widget diario)
Etiqueta agregada automáticamente al frontmatter de la nota diaria cuando se registra la primera entrada de gratitud. Guardar sin el `#`. Dejar vacío para desactivar. Puede reemplazarse por widget con `gratitude.tag`.

### Colores por etiqueta
Cada entrada asocia una etiqueta de nota a un color. Colores disponibles: Rojo, Naranja, Amarillo, Verde, Cian, Azul, Violeta, Rosa.

### Colores por enlace
Cada entrada asocia el nombre de un wiki-link saliente a un color. El campo **alias** permite mostrar un nombre amigable en la leyenda en lugar del nombre de archivo.

### Colores por propiedad de frontmatter
Cada entrada asocia un par `propiedad: valor` de frontmatter a un color. El campo **label** define el texto de la leyenda; si se omite, la leyenda muestra `propiedad: valor`.

### Prefijos de etiquetas excluidos (resumen semanal)
Prefijos de etiquetas a excluir de la lista de top etiquetas del resumen semanal. Por ejemplo, agregar `tipo/` suprimirá `tipo/diario`, `tipo/trabajo`, etc. Guardar sin el `#`.

---

## Paleta de colores

El sistema de puntos usa las variables de color semánticas de Obsidian:

| Nombre | Variable |
|---|---|
| Rojo | `--color-red` |
| Naranja | `--color-orange` |
| Amarillo | `--color-yellow` |
| Verde | `--color-green` |
| Cian | `--color-cyan` |
| Azul | `--color-blue` |
| Violeta | `--color-purple` |
| Rosa | `--color-pink` |

Se adaptan automáticamente al tema de Obsidian que estés usando.

---

## Consejos

- **`after` / `until` para botones con horario**: usa `after: 20` en un botón de gratitud para que solo aparezca de noche; agrega `until: 10` en una captura matutina para ocultarla después de las 10 am. Combina ambos para restringir un botón a una ventana horaria específica.
- **Agrupación por bloque horario**: omite `heading` en una captura para que las entradas se ordenen automáticamente por hora. Las entradas a las 10:05 y 10:47 van bajo `## 10:00`; las de las 11:30 crean su propio `## 11:00`.
- **Gratitud siempre al final**: la sección de gratitud es siempre el último encabezado de la nota. Cualquier bloque horario nuevo se inserta antes de ella incluso si lo agregas más tarde en el día.
- **Múltiples feeds de calendario**: agrega tantas URLs en `calendars` como quieras. Los eventos de todos los feeds se fusionan y deduplicán automáticamente — el mismo evento en dos calendarios compartidos se muestra una sola vez.
- **Eventos en notas pasadas**: cuando un widget tiene `date` apuntando a un día pasado, los eventos se obtienen para esa fecha desde los feeds iCal (siempre que el feed sirva datos históricos).
- **Múltiples puntos por día**: un día puede mostrar varios puntos de color si coinciden varias reglas. Los puntos se deduplicán por color — el mismo color no aparece dos veces aunque lo generen una etiqueta y una regla de frontmatter.
- **Proporción de tareas sin tareas**: el ratio `X/Y` solo aparece si la nota tiene al menos un ítem de tarea. Los días sin tareas no muestran ratio.
- **Días fuera del mes actual**: se muestran en gris en la vista mensual y no son clickeables.
- **Días sin nota**: se muestran con el número de día atenuado. No se renderizan puntos ni indicadores de tareas ya que no hay archivo que leer.

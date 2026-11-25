# DailyVibe: rename, cleanup, project colors, README

## Goal
Rename the app from Planera to DailyVibe, remove unneeded Lovable/template parts, replace the Lovable favicon,
stop new projects from reusing colors (plus a color picker), and write the README.

## Plan
1. Rename "Planera" → "DailyVibe" in: Shell.tsx (logo), __root.tsx + every route's head() titles,
   data.tsx (export file name + messages), docker-compose.yml service, package.json name,
   electron/main.cjs + electron/package.json.
   Keep the localStorage key `planering-v1` so existing data isn't lost.
2. Remove Lovable branding in __root.tsx (`author: Lovable`, `twitter:site: @Lovable`).
3. Replace public/favicon.ico with a new DailyVibe icon (SVG favicon) and update the link in __root.tsx.
4. Project colors (src/routes/index.tsx):
   - Bug: the color is picked as `COLORS[projects.length % 5]`, so after deleting a project
     (or with 6+ projects) a color already in use gets picked again.
   - Fix: auto-select the first color not already in use; extend the palette (e.g. 10 colors).
   - Add swatches next to "+ Nytt projekt" to choose the color yourself.
5. Cleanup (scope per answers to the questions below).
6. Write README.md.
7. Run tests (`vitest`) and a Docker build to verify.

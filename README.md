# DailyVibe

A personal daily planner with a task board, a focus timer, time statistics and notes.
The interface is in Swedish.

## Features

- **Planering (board):** tasks grouped by project and sorted into columns by due date
  (overdue, today, tomorrow, this week, later). Supports recurring tasks (daily, weekly,
  monthly), custom columns and drag and drop. Each project has a color, which you can pick
  when creating it or change later by clicking the project's color dot.
- **Fokus:** a timer for focused work blocks, linked to a task or project.
- **Statistik:** time spent per week, task and project.
- **Anteckningar:** notes, optionally linked to a project.
- **Data:** export all data to a JSON file, import it again, or reset.

## Run with Docker

```bash
docker compose up --build
```

Then open <http://localhost:9005>.

To stop it, run `docker compose down`. After changing the code, run `docker compose up --build`
again to rebuild the image.

## Run locally

Requires [Bun](https://bun.sh) and Node.js 20.19 or newer.

```bash
bun install
bun run dev      # start the dev server
bun run test     # run the tests
bun run build    # production build
```

## Where your data is stored

All data is stored in your browser's `localStorage`, not on the server or in the Docker
container. That means:

- Data is per browser and per device.
- Clearing your browser's site data deletes it.
- Rebuilding or removing the container does not affect it.

To back up your data or move it to another browser, use **Export** on the Data page, then
**Import** the file in the other browser.

## Tech stack

[TanStack Start](https://tanstack.com/start) (React 19, TanStack Router), Vite, Tailwind CSS v4,
Zustand for state, date-fns, and Vitest for tests.

## License

Apache License 2.0, see [LICENSE](LICENSE).

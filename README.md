# DailyVibe

A personal daily planner with a task board, a focus timer, time statistics and notes.
The interface is in Swedish.

## Features

- **Planering (board):** tasks grouped by project and sorted into columns. Supports recurring
  tasks (daily, weekly, monthly) and drag and drop. Drag a column's title to reorder the columns.
  Click a task to edit its title, project, date, repetition and notes, or to delete it.
  Each project has a color, which you can pick when creating it or change later by clicking the
  project's color dot.
- **Fokus:** a timer for focused work blocks. Fokus has its own task list, separate from the
  board: add tasks (optionally linked to a project), pick one, and start the timer. Tasks can be
  renamed (their earlier blocks follow the new name), checked off or removed. The side panel shows
  today's blocks, or this week's time per task.
- **Statistik:** time spent per week, task and project.
- **Anteckningar:** notes, optionally linked to a project.
- **Data:** export all data to a JSON file, import it again, restore an automatic backup, or reset.
- **Inställningar:** rename, reorder, add and remove columns, and choose each column's rule.

### Column rules

Each column has a rule that decides which tasks it collects: overdue, today, tomorrow, this week
(through Sunday), day X–Y from today, no date, later (every dated task that's left), or manual
(tasks you drag there). The default board ends with **Senare** (dated tasks that fit no earlier
column) and **Backlog** (tasks without a date). Dragging a task to Senare sets its date to next
Monday; dragging it to Backlog removes its date. Rules are evaluated against today's date, so a task due tomorrow moves to the "today"
column by itself the next day. If several rules match, the task goes to the first matching column
from the left. Tasks that match no column are shown in an extra "Övrigt" column.

## Run with Docker

Build the image and start the container once:

```bash
docker build -t dailyvibe .
docker run -d --name dailyvibe --restart unless-stopped \
  -p 127.0.0.1:9005:9005 \
  -v dailyvibe-backups:/app/backups \
  dailyvibe
```

Then open <http://localhost:9005>. The container starts again by itself after a reboot.
The port is bound to `127.0.0.1`, so only this computer can reach the app.

To update after changing the code, rebuild the image and replace the container. The backups are
kept, since they live in the `dailyvibe-backups` volume:

```bash
docker build -t dailyvibe .
docker rm -f dailyvibe
docker run -d --name dailyvibe --restart unless-stopped \
  -p 127.0.0.1:9005:9005 \
  -v dailyvibe-backups:/app/backups \
  dailyvibe
```

## Run locally

Requires [Bun](https://bun.sh) and Node.js 20.19 or newer.

```bash
bun install
bun run dev      # start the dev server
bun run test     # run the tests
bun run build    # production build
```

When run locally, backups are written to `./backups` (ignored by git).

## Where your data is stored

Your data lives in the browser's `localStorage`. A few seconds after each change, the app also
sends a backup to the server, which saves it in the `dailyvibe-backups` Docker volume:

- `latest.json`: the most recent backup.
- `backup-YYYY-MM-DD.json`: one copy per day, kept for 30 days.

**Restoring:** open the Data page and pick a backup under "Automatisk backup". If the browser's
data has been cleared, the app also offers to restore the newest backup when you open it. Until
you choose, automatic backups are paused, so an empty browser never overwrites a good backup.

To copy the backup files out of the container:

```bash
docker cp dailyvibe:/app/backups ./backups
```

You can still use **Export** and **Import** on the Data page to move data to another browser.

## Tech stack

[TanStack Start](https://tanstack.com/start) (React 19, TanStack Router), Vite, Tailwind CSS v4,
Zustand for state, date-fns, and Vitest for tests.

## License

Apache License 2.0, see [LICENSE](LICENSE).

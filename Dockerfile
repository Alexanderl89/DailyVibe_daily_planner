FROM oven/bun:1
WORKDIR /app
COPY package.json bun.lock bunfig.toml ./
RUN bun install --frozen-lockfile
COPY . .
# Run as the image's non-root "bun" user; backups go to /app/backups (mount a named volume there).
RUN mkdir -p /app/backups && chown -R bun:bun /app
USER bun
ENV BACKUP_DIR=/app/backups
EXPOSE 9005
CMD ["bun", "run", "dev", "--host", "0.0.0.0", "--port", "9005"]

#!/usr/bin/env node

/**
 * Migration Status Reporter
 *
 * Lists applied and pending SQL migrations for the configured database.
 *
 * Usage:
 *   DATABASE_URL=postgres://... npm run migrate:status
 *   DATABASE_URL=... npm run migrate:status -- --dir=supabase/migrations
 */

import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

function resolveMigrationsDir() {
  const cliDirArg = process.argv.find((arg) => arg.startsWith('--dir='));
  if (cliDirArg) {
    return path.resolve(process.cwd(), cliDirArg.slice('--dir='.length));
  }

  if (process.env.MIGRATIONS_DIR) {
    return path.resolve(process.cwd(), process.env.MIGRATIONS_DIR);
  }

  return path.resolve(repoRoot, 'postgres', 'migrations');
}

function getDatabaseUrl() {
  return process.env.DATABASE_URL ?? process.env.SUPABASE_DB_URL ?? '';
}

function checksum(contents) {
  return createHash('sha256').update(contents, 'utf8').digest('hex');
}

async function readMigrations(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true }).catch((error) => {
    if (error.code === 'ENOENT') {
      throw new Error(`Migrations directory not found: ${dir}`);
    }
    throw error;
  });

  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.sql'))
    .map((entry) => entry.name)
    .sort();
}

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename TEXT UNIQUE NOT NULL,
      checksum TEXT NOT NULL,
      executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function run() {
  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl) {
    console.error('ERROR: DATABASE_URL (or SUPABASE_DB_URL) must be set.');
    process.exit(1);
  }

  const migrationsDir = resolveMigrationsDir();
  const migrationFiles = await readMigrations(migrationsDir);

  if (migrationFiles.length === 0) {
    console.log(`No SQL migrations found in ${migrationsDir}`);
    return;
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const client = await pool.connect();

  try {
    await ensureMigrationsTable(client);
    const { rows: appliedRows } = await client.query(
      'SELECT filename, checksum, executed_at FROM schema_migrations ORDER BY filename'
    );

    const appliedMap = new Map(appliedRows.map((row) => [row.filename, row]));
    const pending = [];
    const drift = [];

    console.log(`Migration status for ${databaseUrl}`);
    console.log(`Migrations directory: ${migrationsDir}\n`);

    for (const filename of migrationFiles) {
      const filePath = path.join(migrationsDir, filename);
      const sqlContents = await fs.readFile(filePath, 'utf8');
      const fileChecksum = checksum(sqlContents);
      const applied = appliedMap.get(filename);

      if (!applied) {
        pending.push(filename);
        continue;
      }

      if (applied.checksum !== fileChecksum) {
        drift.push({ filename, appliedChecksum: applied.checksum, currentChecksum: fileChecksum });
      }

      console.log(
        `✔ ${filename} (applied ${new Date(applied.executed_at).toISOString()})`
      );
      appliedMap.delete(filename);
    }

    if (pending.length > 0) {
      console.log('\nPending migrations:');
      pending.forEach((filename) => console.log(`• ${filename}`));
    } else {
      console.log('\nPending migrations: none');
    }

    const obsolete = [...appliedMap.keys()];
    if (obsolete.length > 0) {
      console.warn(
        '\nWARNING: Applied migrations missing from disk (possible branch drift):'
      );
      obsolete.forEach((filename) => console.warn(`• ${filename}`));
    }

    if (drift.length > 0) {
      console.error('\nERROR: Checksum drift detected (files modified after apply):');
      drift.forEach((entry) => {
        console.error(`• ${entry.filename}`);
        console.error(`  Applied checksum: ${entry.appliedChecksum}`);
        console.error(`  Current checksum: ${entry.currentChecksum}`);
      });
      process.exitCode = 2;
    }
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

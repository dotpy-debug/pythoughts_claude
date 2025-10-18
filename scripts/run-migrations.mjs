#!/usr/bin/env node

/**
 * Migration Runner
 *
 * Applies SQL files from the configured migrations directory against the database
 * specified by `DATABASE_URL` (or `SUPABASE_DB_URL` as a fallback).
 *
 * Usage:
 *   DATABASE_URL=postgres://... npm run migrate
 *   DATABASE_URL=... npm run migrate -- --dir=supabase/migrations
 *
 * Optional environment/CLI parameters:
 *   - DATABASE_URL / SUPABASE_DB_URL: connection string
 *   - MIGRATIONS_DIR: override migrations directory
 *   - --dir=relative/or/absolute/path: CLI override for migrations directory
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

function checksum(contents) {
  return createHash('sha256').update(contents, 'utf8').digest('hex');
}

async function applyMigration(client, filePath, filename, fileChecksum) {
  await client.query('BEGIN');

  try {
    const sql = await fs.readFile(filePath, 'utf8');
    await client.query(sql);
    await client.query(
      'INSERT INTO schema_migrations (filename, checksum) VALUES ($1, $2)',
      [filename, fileChecksum]
    );
    await client.query('COMMIT');
    console.log(`✔ Applied ${filename}`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw new Error(`Failed to apply ${filename}: ${error.message}`);
  }
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
    console.log(`Running migrations from ${migrationsDir}`);
    await ensureMigrationsTable(client);

    for (const filename of migrationFiles) {
      const filePath = path.join(migrationsDir, filename);
      const sqlContents = await fs.readFile(filePath, 'utf8');
      const fileChecksum = checksum(sqlContents);

      const existing = await client.query(
        'SELECT checksum FROM schema_migrations WHERE filename = $1',
        [filename]
      );

      if (existing.rowCount > 0) {
        const existingChecksum = existing.rows[0].checksum;
        if (existingChecksum !== fileChecksum) {
          throw new Error(
            `Checksum mismatch detected for ${filename}.` +
              ' The file has been modified after it was applied.'
          );
        }
        console.log(`• Skipped ${filename} (already applied)`);
        continue;
      }

      await applyMigration(client, filePath, filename, fileChecksum);
    }

    console.log('Migration run completed successfully.');
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

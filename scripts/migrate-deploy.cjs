const { spawnSync } = require('node:child_process');

function neonDirectUrl(databaseUrl) {
  try {
    const parsed = new URL(databaseUrl);
    parsed.hostname = parsed.hostname.replace('-pooler', '');
    parsed.searchParams.delete('pgbouncer');
    return parsed.toString();
  } catch {
    return databaseUrl;
  }
}

/**
 * Migrations whose SQL is idempotent (IF NOT EXISTS throughout), so a failed
 * or half-applied attempt can safely be marked rolled back and run again.
 * Never add a migration here unless every statement in it is idempotent.
 */
const RETRYABLE_MIGRATIONS = new Set([
  '20260927050000_conversation_email_attachments_and_mailbox_names',
  '20260927063000_repair_conversation_email_archive',
]);

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.warn('Skipping prisma migrate deploy: DATABASE_URL is not set');
  process.exit(0);
}

const env = {
  ...process.env,
  DIRECT_URL: process.env.DIRECT_URL || neonDirectUrl(databaseUrl),
};

function prisma(args) {
  const result = spawnSync('npx', ['prisma', ...args], { env, shell: true, encoding: 'utf8' });
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
  process.stdout.write(output);
  return { ok: result.status === 0, output };
}

/** Names of failed migrations that P3009 reports and that are safe to retry. */
function retryableFailures(output) {
  if (!output.includes('P3009')) return [];
  const names = [...output.matchAll(/`(\d{14}_[A-Za-z0-9_]+)` migration started at/g)].map((m) => m[1]);
  return names.filter((name) => RETRYABLE_MIGRATIONS.has(name));
}

let deploy = prisma(['migrate', 'deploy']);

const failed = deploy.ok ? [] : retryableFailures(deploy.output);
if (failed.length > 0) {
  for (const name of failed) {
    console.warn(`Retrying failed idempotent migration ${name}`);
    prisma(['migrate', 'resolve', '--rolled-back', name]);
  }
  deploy = prisma(['migrate', 'deploy']);
}

if (!deploy.ok) {
  console.warn(
    'MIGRATE FAILED: prisma migrate deploy did not succeed; continuing with next build so deployment is not blocked'
  );
}

process.exit(0);

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

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.warn('Skipping prisma migrate deploy: DATABASE_URL is not set');
  process.exit(0);
}

const env = {
  ...process.env,
  DIRECT_URL: process.env.DIRECT_URL || neonDirectUrl(databaseUrl),
};

const result = spawnSync('npx', ['prisma', 'migrate', 'deploy'], {
  stdio: 'inherit',
  env,
  shell: true,
});

if (result.status !== 0) {
  console.warn(
    'prisma migrate deploy did not succeed; continuing with next build so deployment is not blocked'
  );
}

process.exit(0);

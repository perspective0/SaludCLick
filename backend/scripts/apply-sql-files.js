const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const sqlFiles = [
  'init.sql',
  'clinical_tables.sql',
  'doctor_multi_health_centers.sql',
  'patient_portal.sql',
  'prescription_professional.sql',
  'notifications.sql',
  'vademecum.sql',
  'icd10_catalog.sql',
  'scalability_indexes.sql',
];

function sanitizeSql(filename, sql) {
  let sanitized = sql
    .split(/\r?\n/)
    .filter((line) => !/^\s*CREATE\s+DATABASE\b/i.test(line))
    .filter((line) => !/^\s*\\c\b/i.test(line))
    .filter((line) => !/^\s*COMMIT\s*;?\s*$/i.test(line))
    .join('\n');

  if (filename === 'init.sql') {
    sanitized = [
      'CREATE EXTENSION IF NOT EXISTS "pgcrypto";',
      'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";',
      sanitized,
    ].join('\n');
  }

  return sanitized;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  try {
    const startAt = process.env.START_AT;
    const filesToRun = startAt ? sqlFiles.slice(sqlFiles.indexOf(startAt)) : sqlFiles;

    if (startAt && filesToRun.length === 0) {
      throw new Error(`Unknown START_AT file: ${startAt}`);
    }

    for (const file of filesToRun) {
      const filePath = path.resolve(__dirname, '..', '..', 'database', file);
      const sql = sanitizeSql(file, fs.readFileSync(filePath, 'utf8'));
      process.stdout.write(`Applying ${file}... `);
      if (file === 'prescription_professional.sql') {
        await client.query("ALTER TYPE prescription_status ADD VALUE IF NOT EXISTS 'voided'");
        await client.query("ALTER TYPE prescription_status ADD VALUE IF NOT EXISTS 'anulada'");
        await client.query("ALTER TYPE prescription_status ADD VALUE IF NOT EXISTS 'vencida'");
      }
      await client.query(sql);
      process.stdout.write('ok\n');
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

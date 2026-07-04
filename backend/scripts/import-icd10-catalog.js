/* eslint-disable no-console */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const inputPath = process.argv[2];
const source = process.argv[3] || 'icd10-import';

if (!inputPath) {
  console.error('Usage: node scripts/import-icd10-catalog.js <catalog.csv|cms-codes.txt> [source]');
  console.error('CSV columns: code, description, chapter?, block?, keywords?');
  console.error('CMS txt format is also supported: CODE<space>DESCRIPTION');
  process.exit(1);
}

function detectDelimiter(line) {
  const candidates = [';', ',', '\t', '|'];
  return candidates
    .map((delimiter) => ({ delimiter, count: line.split(delimiter).length }))
    .sort((a, b) => b.count - a.count)[0].delimiter;
}

function parseCsvLine(line, delimiter) {
  const values = [];
  let current = '';
  let quoted = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values;
}

function normalizeHeader(value) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

function pick(row, headers, names) {
  for (const name of names) {
    const index = headers.indexOf(name);
    if (index >= 0 && row[index]) return row[index].trim();
  }
  return '';
}

async function ensureTable(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS icd10_catalog (
      code VARCHAR(12) PRIMARY KEY,
      description TEXT NOT NULL,
      description_es TEXT,
      description_en TEXT,
      chapter VARCHAR(80),
      block VARCHAR(40),
      keywords TEXT[] DEFAULT '{}',
      search_text TEXT,
      is_active BOOLEAN DEFAULT true,
      source VARCHAR(120),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await pool.query('CREATE INDEX IF NOT EXISTS idx_icd10_catalog_active ON icd10_catalog(is_active)');
  await pool.query('ALTER TABLE icd10_catalog ADD COLUMN IF NOT EXISTS description_es TEXT').catch(() => null);
  await pool.query('ALTER TABLE icd10_catalog ADD COLUMN IF NOT EXISTS description_en TEXT').catch(() => null);
  await pool.query('CREATE INDEX IF NOT EXISTS idx_icd10_catalog_code ON icd10_catalog(code)');
  await pool.query("CREATE INDEX IF NOT EXISTS idx_icd10_catalog_search_text ON icd10_catalog USING gin(to_tsvector('spanish', COALESCE(search_text, '')))");
}

async function main() {
  const fullPath = path.resolve(inputPath);
  const content = fs.readFileSync(fullPath, 'utf8').replace(/^\uFEFF/, '');
  const lines = content.split(/\r?\n/).filter((line) => line.trim());
  if (!lines.length) throw new Error('Input file is empty');

  const delimiter = detectDelimiter(lines[0]);
  const firstValues = parseCsvLine(lines[0], delimiter);
  const looksLikeHeader = firstValues.some((value) => ['code', 'codigo', 'description', 'descripcion', 'diagnostico'].includes(normalizeHeader(value)));
  const headers = looksLikeHeader ? firstValues.map(normalizeHeader) : [];
  const dataLines = looksLikeHeader ? lines.slice(1) : lines;
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/saludclick',
  });

  await ensureTable(pool);

  let imported = 0;
  for (const line of dataLines) {
    const row = parseCsvLine(line, delimiter);
    const cmsMatch = !headers.length ? line.trim().match(/^([A-TV-Z][0-9][0-9A-Z](?:\.?[0-9A-Z]{1,4})?)\s+(.+)$/i) : null;
    const rawCode = headers.length ? pick(row, headers, ['code', 'codigo', 'cie10', 'icd10', 'cod']) : cmsMatch?.[1] || '';
    const code = formatIcd10Code(rawCode);
    const description = headers.length ? pick(row, headers, ['description', 'descripcion', 'diagnostico', 'title', 'nombre']) : cmsMatch?.[2] || '';
    const chapter = headers.length ? pick(row, headers, ['chapter', 'capitulo']) : '';
    const block = headers.length ? pick(row, headers, ['block', 'bloque', 'grupo']) : '';
    const keywordsText = headers.length ? pick(row, headers, ['keywords', 'alias', 'sinonimos', 'terminos']) : '';
    const keywords = keywordsText ? keywordsText.split(/[|,;]/).map((item) => item.trim()).filter(Boolean) : [];
    if (!code || !description) continue;

    const isSpanish = /(^|[-_])(es|spa|spanish|cie10es|cie-10-es)([-_]|$)/i.test(source);
    const isEnglish = /(^|[-_])(en|eng|english|cms|icd10cm)([-_]|$)/i.test(source);
    const sql = isSpanish
      ? `INSERT INTO icd10_catalog (code, description, description_es, chapter, block, keywords, search_text, source)
         VALUES ($1,$2,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (code) DO UPDATE
         SET description = EXCLUDED.description,
             description_es = EXCLUDED.description_es,
             chapter = COALESCE(EXCLUDED.chapter, icd10_catalog.chapter),
             block = COALESCE(EXCLUDED.block, icd10_catalog.block),
             keywords = EXCLUDED.keywords,
             search_text = CONCAT_WS(' ', EXCLUDED.search_text, icd10_catalog.description_en),
             source = EXCLUDED.source,
             is_active = true,
             updated_at = NOW()`
      : `INSERT INTO icd10_catalog (code, description, description_en, chapter, block, keywords, search_text, source)
         VALUES ($1,$2,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (code) DO UPDATE
         SET description_en = EXCLUDED.description_en,
             description = COALESCE(icd10_catalog.description_es, EXCLUDED.description),
             chapter = COALESCE(icd10_catalog.chapter, EXCLUDED.chapter),
             block = COALESCE(icd10_catalog.block, EXCLUDED.block),
             keywords = CASE WHEN $8 THEN icd10_catalog.keywords ELSE EXCLUDED.keywords END,
             search_text = CONCAT_WS(' ', EXCLUDED.code, COALESCE(icd10_catalog.description_es, EXCLUDED.description), EXCLUDED.description, array_to_string(CASE WHEN $8 THEN icd10_catalog.keywords ELSE EXCLUDED.keywords END, ' ')),
             source = EXCLUDED.source,
             is_active = true,
             updated_at = NOW()`;

    await pool.query(sql, [code, description, chapter || null, block || null, keywords, `${code} ${description} ${keywords.join(' ')}`, source, isEnglish]);
    imported += 1;
  }

  await pool.end();
  console.log(`Imported ${imported} ICD-10 rows from ${fullPath}`);
}

function formatIcd10Code(value) {
  const clean = String(value || '').trim().toUpperCase();
  if (!clean || clean.includes('.')) return clean;
  return clean.length > 3 ? `${clean.slice(0, 3)}.${clean.slice(3)}` : clean;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

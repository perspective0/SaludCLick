import { Request, Response } from 'express';
import { query, queryMany } from '../db';
import { fail, ok } from '../utils/apiResponse';

const commonIcd10Seeds = [
  { code: 'E11', description: 'Diabetes mellitus tipo 2', chapter: 'IV', block: 'E10-E14', keywords: ['diabetes tipo 2', 'dm2', 'diabetes no insulinodependiente'] },
  { code: 'E10', description: 'Diabetes mellitus tipo 1', chapter: 'IV', block: 'E10-E14', keywords: ['diabetes tipo 1', 'dm1', 'diabetes insulinodependiente'] },
  { code: 'I10', description: 'Hipertension esencial primaria', chapter: 'IX', block: 'I10-I15', keywords: ['hipertension arterial', 'hta', 'presion alta'] },
  { code: 'E78.5', description: 'Hiperlipidemia no especificada', chapter: 'IV', block: 'E78', keywords: ['dislipidemia', 'colesterol alto', 'trigliceridos altos'] },
  { code: 'N39.0', description: 'Infeccion de vias urinarias', chapter: 'XIV', block: 'N30-N39', keywords: ['infeccion urinaria', 'itu', 'cistitis'] },
  { code: 'J45', description: 'Asma', chapter: 'X', block: 'J40-J47', keywords: ['broncoespasmo'] },
  { code: 'J06.9', description: 'Infeccion aguda de las vias respiratorias superiores no especificada', chapter: 'X', block: 'J00-J06', keywords: ['gripe', 'resfriado comun', 'rinofaringitis'] },
  { code: 'K29.7', description: 'Gastritis no especificada', chapter: 'XI', block: 'K20-K31', keywords: ['gastritis', 'dispepsia'] },
  { code: 'M54.5', description: 'Dolor lumbar bajo', chapter: 'XIII', block: 'M50-M54', keywords: ['lumbalgia', 'dolor lumbar'] },
  { code: 'R51', description: 'Cefalea', chapter: 'XVIII', block: 'R50-R69', keywords: ['dolor de cabeza'] },
];

export async function ensureIcd10CatalogTable() {
  await query(`
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
  await query('CREATE INDEX IF NOT EXISTS idx_icd10_catalog_active ON icd10_catalog(is_active)');
  await query('ALTER TABLE icd10_catalog ADD COLUMN IF NOT EXISTS description_es TEXT').catch(() => null);
  await query('ALTER TABLE icd10_catalog ADD COLUMN IF NOT EXISTS description_en TEXT').catch(() => null);
  await query('CREATE INDEX IF NOT EXISTS idx_icd10_catalog_code ON icd10_catalog(code)');
  await query('CREATE INDEX IF NOT EXISTS idx_icd10_catalog_search_text ON icd10_catalog USING gin(to_tsvector(\'spanish\', COALESCE(search_text, \'\')))');

  for (const item of commonIcd10Seeds) {
    await query(
      `INSERT INTO icd10_catalog (code, description, description_es, chapter, block, keywords, search_text, source)
       VALUES ($1,$2,$2,$3,$4,$5,$6,'saludclick-seed')
       ON CONFLICT (code) DO UPDATE
       SET description_es = EXCLUDED.description_es,
           description = COALESCE(EXCLUDED.description_es, icd10_catalog.description),
           chapter = COALESCE(icd10_catalog.chapter, EXCLUDED.chapter),
           block = COALESCE(icd10_catalog.block, EXCLUDED.block),
           keywords = CASE WHEN icd10_catalog.source = 'saludclick-seed' THEN EXCLUDED.keywords ELSE icd10_catalog.keywords END,
           search_text = CONCAT_WS(' ', EXCLUDED.code, EXCLUDED.description_es, icd10_catalog.description_en, array_to_string(EXCLUDED.keywords, ' ')),
           updated_at = NOW()`,
      [item.code, item.description, item.chapter, item.block, item.keywords, `${item.code} ${item.description} ${item.keywords.join(' ')}`]
    ).catch(() => null);
  }
}

export const searchIcd10 = async (req: Request, res: Response) => {
  try {
    await ensureIcd10CatalogTable();
    const search = String(req.query.search || req.query.q || '').trim();
    const limit = Math.min(Math.max(Number(req.query.limit || 8), 1), 30);
    if (search.length < 2) return ok(res, []);

    const likeTerm = `%${search.toLowerCase()}%`;
    const rows = await queryMany(
      `SELECT code, COALESCE(description_es, description, description_en) AS description, description_es, description_en, chapter, block
       FROM icd10_catalog
       WHERE is_active = true
         AND (
           LOWER(code) LIKE $1
           OR LOWER(description) LIKE $1
           OR LOWER(COALESCE(search_text, '')) LIKE $1
           OR to_tsvector('spanish', COALESCE(search_text, '')) @@ plainto_tsquery('spanish', $2)
         )
       ORDER BY
         CASE
           WHEN LOWER(code) = LOWER($2) THEN 0
           WHEN LOWER(code) LIKE LOWER($2 || '%') THEN 1
           WHEN LOWER(description) LIKE LOWER($2 || '%') THEN 2
           ELSE 3
         END,
         LENGTH(description),
         code
       LIMIT $3`,
      [likeTerm, search, limit]
    );

    return ok(res, rows);
  } catch (error: any) {
    console.error('Search ICD-10 error:', error);
    return fail(res, 500, 'Error searching ICD-10 catalog', error);
  }
};

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
);

CREATE INDEX IF NOT EXISTS idx_icd10_catalog_active ON icd10_catalog(is_active);
CREATE INDEX IF NOT EXISTS idx_icd10_catalog_code ON icd10_catalog(code);
CREATE INDEX IF NOT EXISTS idx_icd10_catalog_search_text ON icd10_catalog USING gin(to_tsvector('spanish', COALESCE(search_text, '')));

ALTER TABLE icd10_catalog ADD COLUMN IF NOT EXISTS description_es TEXT;
ALTER TABLE icd10_catalog ADD COLUMN IF NOT EXISTS description_en TEXT;

INSERT INTO icd10_catalog (code, description, description_es, chapter, block, keywords, search_text, source) VALUES
  ('E11', 'Diabetes mellitus tipo 2', 'Diabetes mellitus tipo 2', 'IV', 'E10-E14', ARRAY['diabetes tipo 2', 'dm2', 'diabetes no insulinodependiente'], 'E11 Diabetes mellitus tipo 2 diabetes tipo 2 dm2 diabetes no insulinodependiente', 'saludclick-seed'),
  ('E10', 'Diabetes mellitus tipo 1', 'Diabetes mellitus tipo 1', 'IV', 'E10-E14', ARRAY['diabetes tipo 1', 'dm1', 'diabetes insulinodependiente'], 'E10 Diabetes mellitus tipo 1 diabetes tipo 1 dm1 diabetes insulinodependiente', 'saludclick-seed'),
  ('I10', 'Hipertension esencial primaria', 'Hipertension esencial primaria', 'IX', 'I10-I15', ARRAY['hipertension arterial', 'hta', 'presion alta'], 'I10 Hipertension esencial primaria hipertension arterial hta presion alta', 'saludclick-seed'),
  ('E78.5', 'Hiperlipidemia no especificada', 'Hiperlipidemia no especificada', 'IV', 'E78', ARRAY['dislipidemia', 'colesterol alto', 'trigliceridos altos'], 'E78.5 Hiperlipidemia no especificada dislipidemia colesterol alto trigliceridos altos', 'saludclick-seed'),
  ('N39.0', 'Infeccion de vias urinarias', 'Infeccion de vias urinarias', 'XIV', 'N30-N39', ARRAY['infeccion urinaria', 'itu', 'cistitis'], 'N39.0 Infeccion de vias urinarias infeccion urinaria itu cistitis', 'saludclick-seed')
ON CONFLICT (code) DO UPDATE
SET description_es = EXCLUDED.description_es,
    description = EXCLUDED.description,
    keywords = EXCLUDED.keywords,
    search_text = CONCAT_WS(' ', EXCLUDED.search_text, icd10_catalog.description_en),
    updated_at = NOW();

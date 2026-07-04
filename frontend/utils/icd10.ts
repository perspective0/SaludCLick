export type Icd10Suggestion = {
  code: string;
  label: string;
  keywords: string[];
};

export const icd10Catalog: Icd10Suggestion[] = [
  { code: 'E11', label: 'Diabetes mellitus tipo 2', keywords: ['diabetes mellitus tipo 2', 'diabetes tipo 2', 'dm2', 'diabetes no insulinodependiente'] },
  { code: 'E10', label: 'Diabetes mellitus tipo 1', keywords: ['diabetes mellitus tipo 1', 'diabetes tipo 1', 'dm1', 'diabetes insulinodependiente'] },
  { code: 'I10', label: 'Hipertension esencial primaria', keywords: ['hipertension arterial', 'hipertension', 'hta', 'presion alta'] },
  { code: 'E78.5', label: 'Hiperlipidemia no especificada', keywords: ['dislipidemia', 'hiperlipidemia', 'colesterol alto', 'trigliceridos altos'] },
  { code: 'J45', label: 'Asma', keywords: ['asma', 'broncoespasmo'] },
  { code: 'J06.9', label: 'Infeccion aguda de vias respiratorias superiores', keywords: ['infeccion respiratoria alta', 'rinofaringitis', 'resfriado comun', 'gripe'] },
  { code: 'N39.0', label: 'Infeccion de vias urinarias', keywords: ['infeccion urinaria', 'itu', 'cistitis'] },
  { code: 'K29.7', label: 'Gastritis no especificada', keywords: ['gastritis', 'dispepsia'] },
  { code: 'M54.5', label: 'Dolor lumbar bajo', keywords: ['lumbalgia', 'dolor lumbar', 'dolor de espalda baja'] },
  { code: 'R51', label: 'Cefalea', keywords: ['cefalea', 'dolor de cabeza'] },
  { code: 'A09', label: 'Diarrea y gastroenteritis de presunto origen infeccioso', keywords: ['gastroenteritis', 'diarrea aguda', 'enteritis'] },
  { code: 'D64.9', label: 'Anemia no especificada', keywords: ['anemia'] },
];

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function getIcd10Suggestions(diagnosis: string) {
  const term = normalize(diagnosis);
  if (term.length < 3) return [];

  return icd10Catalog
    .map((item) => {
      const matchedKeyword = item.keywords
        .map((keyword) => normalize(keyword))
        .filter((keyword) => term.includes(keyword) || keyword.includes(term))
        .sort((a, b) => b.length - a.length)[0];
      const labelMatch = normalize(item.label).includes(term) || term.includes(normalize(item.label));
      return { item, score: matchedKeyword ? matchedKeyword.length + 10 : labelMatch ? 5 : 0 };
    })
    .filter((match) => match.score > 0)
    .sort((a, b) => b.score - a.score || a.item.code.localeCompare(b.item.code))
    .map((match) => match.item)
    .slice(0, 5);
}

export function suggestIcd10(diagnosis: string) {
  return getIcd10Suggestions(diagnosis)[0] || null;
}

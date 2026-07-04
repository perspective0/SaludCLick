import dotenv from 'dotenv';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

export function requireEnv(name: string, developmentFallback?: string): string {
  const value = process.env[name];

  if (value && value.trim()) {
    if (isProduction && isPlaceholderSecret(value)) {
      throw new Error(`Environment variable ${name} contains a placeholder value`);
    }
    return value;
  }

  if (!isProduction && developmentFallback !== undefined) {
    return developmentFallback;
  }

  throw new Error(`Missing required environment variable: ${name}`);
}

function isPlaceholderSecret(value: string) {
  const normalized = value.toLowerCase();
  return [
    'your-secret-key',
    'development-only-jwt-secret-change-me',
    'tu_super_secreto_jwt_aqui_cambiar_en_produccion',
    'sk_test_xxx',
    'price_xxx',
    'pega_aqui_tu_token_temporal_de_meta',
    '8954084768:aaer7ryd1c3ac3rmprlocwzujtxucbw-l6g',
  ].some((placeholder) => normalized.includes(placeholder));
}

export function requireProductionEnv(name: string, developmentFallback?: string): string {
  return requireEnv(name, developmentFallback);
}

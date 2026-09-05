// Environment variable validation for production
export function validateEnvVariables() {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required for video calling
  const required = {
    // Database
    DATABASE_URL: process.env.DATABASE_URL,
    
    // Authentication
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    
    // TURN Server (required for video calls)
    TURN_REALM: process.env.TURN_REALM,
    TURN_STATIC_AUTH_SECRET: process.env.TURN_STATIC_AUTH_SECRET,
    TURN_URL: process.env.TURN_URL,

    // Field-level encryption for sensitive client data
    FIELD_ENCRYPTION_KEY: process.env.FIELD_ENCRYPTION_KEY,
  };

  // Optional but recommended
  const recommended = {
    REDIS_URL: process.env.REDIS_URL,
  };

  // Check required variables
  for (const [key, value] of Object.entries(required)) {
    if (!value) {
      errors.push(`Missing required environment variable: ${key}`);
    }
  }

  // Check recommended variables
  if (!recommended.REDIS_URL) {
    warnings.push('REDIS_URL not configured - signaling will not persist across deployments');
  }

  // Validate TURN configuration
  if (required.TURN_URL) {
    const urls = required.TURN_URL.split(',').map(s => s.trim()).filter(Boolean);
    const validUrls = urls.filter(url => url.startsWith('turn:') || url.startsWith('turns:'));
    
    if (validUrls.length === 0) {
      errors.push('TURN_URL must start with "turn:" or "turns:" (e.g., turn:example.com:3478)');
    }
  }

  // A wrong-length key fails only when a client record is first read or written,
  // which can be long after deploy — so it is checked up front
  if (required.FIELD_ENCRYPTION_KEY) {
    const keyBytes = Buffer.from(required.FIELD_ENCRYPTION_KEY, 'base64').length;
    if (keyBytes !== 32) {
      errors.push(`FIELD_ENCRYPTION_KEY must decode to 32 bytes, got ${keyBytes}`);
    }
  }

  // Validate Redis URL format if provided
  if (recommended.REDIS_URL && !recommended.REDIS_URL.startsWith('redis://') && !recommended.REDIS_URL.startsWith('rediss://')) {
    warnings.push('REDIS_URL should start with "redis://" or "rediss://"');
  }

  // Production-specific checks
  if (process.env.NODE_ENV === 'production') {
    if (!required.NEXTAUTH_SECRET || required.NEXTAUTH_SECRET.length < 32) {
      errors.push('NEXTAUTH_SECRET must be at least 32 characters in production');
    }

    if (!required.NEXTAUTH_URL) {
      errors.push('NEXTAUTH_URL must be set in production');
    }

    if (!recommended.REDIS_URL) {
      errors.push('REDIS_URL is required in production for signaling persistence');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

// Log validation results on startup
export function logEnvValidation() {
  const validation = validateEnvVariables();
  
  if (validation.errors.length > 0) {
    console.error('❌ Environment variable validation failed:');
    validation.errors.forEach(error => console.error(`  - ${error}`));
  }
  
  if (validation.warnings.length > 0) {
    console.warn('⚠️ Environment variable warnings:');
    validation.warnings.forEach(warning => console.warn(`  - ${warning}`));
  }
  
  if (validation.valid) {
    console.log('✅ Environment variables validated');
  }
  
  return validation;
}


import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const jwtSecret = process.env.JWT_SECRET || randomBytes(32).toString('hex');
if (process.env.VERCEL && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be configured before deploying the API to Vercel.');
}

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password, storedPassword) {
  if (!storedPassword?.startsWith('scrypt$')) {
    return password === storedPassword;
  }

  const [, salt, storedHash] = storedPassword.split('$');
  const hash = scryptSync(password, salt, 64);
  const expected = Buffer.from(storedHash, 'hex');
  return expected.length === hash.length && timingSafeEqual(expected, hash);
}

export function createSessionToken(user) {
  const now = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(JSON.stringify({
    sub: user.id,
    role: user.role,
    business_id: user.business_id,
    iat: now,
    exp: now + 60 * 60 * 24 * 7
  })).toString('base64url');
  const content = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.${payload}`;
  const signature = createHmac('sha256', jwtSecret).update(content).digest('base64url');
  return `${content}.${signature}`;
}

export function verifySessionToken(token) {
  const [header, payload, signature] = token.split('.');
  if (!header || !payload || !signature) return null;

  const content = `${header}.${payload}`;
  const expected = createHmac('sha256', jwtSecret).update(content).digest();
  const actual = Buffer.from(signature, 'base64url');
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;

  try {
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!claims.sub || !claims.role || claims.exp <= Math.floor(Date.now() / 1000)) return null;
    return claims;
  } catch {
    return null;
  }
}

export function requireRoles(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Debes iniciar sesión' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'No tienes permiso para esta acción' });
    next();
  };
}

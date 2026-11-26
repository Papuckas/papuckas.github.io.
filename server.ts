import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express, { type NextFunction, type Request, type Response } from 'express';

const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = path.resolve(process.cwd(), 'data');
const STORE_PATH = path.join(DATA_DIR, 'app-store.json');
const COOKIE_NAME = 'td_session';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14; // 14 days

const STARTER_CAR_IDS = [
  'honda_civic_eg',
  'mazda_miata_na',
  'fiat_panda_4x4',
  'ford_crown_vic',
  'peugeot_205_gti',
  'subaru_forester_xt',
];

interface StoredUser {
  username: string;
  passwordHash: string;
  createdAt: number;
  profile: Record<string, unknown>;
}

interface StoredSession {
  usernameLower: string;
  isAdmin: boolean;
  expiresAt: number;
}

interface StoreShape {
  users: Record<string, StoredUser>;
  sessions: Record<string, StoredSession>;
  catalog: {
    customCars: unknown[];
    carOverrides: Record<string, unknown>;
  };
  adminAuth: {
    passwordHash: string;
  } | null;
}

function createInitialProfile(username: string): Record<string, unknown> {
  const now = Date.now();
  return {
    username,
    cash: 5000,
    rqLevel: 175,
    xp: 0,
    level: 1,
    matchesPlayed: 0,
    randomRaceWins: 0,
    completedCampaignIds: [],
    completedChallengeIds: [],
    unopenedPacks: ['plastics'],
    garage: STARTER_CAR_IDS.map((carId, idx) => ({
      instanceId: `${carId}_${now}_${idx}_${crypto.randomBytes(2).toString('hex')}`,
      carId,
      engineLvl: 0,
      weightLvl: 0,
      chassisLvl: 0,
      acquiredAt: now,
    })),
    customCars: [],
    carOverrides: {},
    activeRandomScenario: null,
    settings: {
      speedUnit: 'kmh',
      weightUnit: 'kg',
      animSpeed: 1,
      fps: 60,
      soundEnabled: true,
    },
  };
}

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadStore(): StoreShape {
  ensureDataDir();
  try {
    if (!fs.existsSync(STORE_PATH)) {
      return {
        users: {},
        sessions: {},
        catalog: { customCars: [], carOverrides: {} },
        adminAuth: null,
      };
    }
    const raw = fs.readFileSync(STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw) as Partial<StoreShape>;
    return {
      users: parsed.users && typeof parsed.users === 'object' ? parsed.users : {},
      sessions: parsed.sessions && typeof parsed.sessions === 'object' ? parsed.sessions : {},
      catalog: {
        customCars: Array.isArray(parsed.catalog?.customCars) ? parsed.catalog.customCars : [],
        carOverrides:
          parsed.catalog?.carOverrides && typeof parsed.catalog.carOverrides === 'object'
            ? parsed.catalog.carOverrides
            : {},
      },
      adminAuth: parsed.adminAuth?.passwordHash ? { passwordHash: parsed.adminAuth.passwordHash } : null,
    };
  } catch {
    return {
      users: {},
      sessions: {},
      catalog: { customCars: [], carOverrides: {} },
      adminAuth: null,
    };
  }
}

const store: StoreShape = loadStore();

function persistStore(): void {
  ensureDataDir();
  const tmpPath = `${STORE_PATH}.${process.pid}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(store, null, 2), 'utf8');
  fs.renameSync(tmpPath, STORE_PATH);
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  if (!salt || !keyHex) return false;
  try {
    const keyBuf = Buffer.from(keyHex, 'hex');
    const derived = crypto.scryptSync(password, salt, keyBuf.length);
    if (derived.length !== keyBuf.length) return false;
    return crypto.timingSafeEqual(derived, keyBuf);
  } catch {
    return false;
  }
}

function hashToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;
  for (const part of cookieHeader.split(';')) {
    const eqIdx = part.indexOf('=');
    if (eqIdx === -1) continue;
    const key = part.slice(0, eqIdx).trim();
    const val = part.slice(eqIdx + 1).trim();
    if (key) {
      try {
        out[key] = decodeURIComponent(val);
      } catch {
        out[key] = val;
      }
    }
  }
  return out;
}

function extractRawToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    const bearer = authHeader.slice(7).trim();
    if (bearer.length >= 32) return bearer;
  }
  const cookies = parseCookies(req.headers.cookie);
  const fromCookie = cookies[COOKIE_NAME];
  return fromCookie && fromCookie.length >= 32 ? fromCookie : null;
}

function getActiveSession(req: Request): { tokenHash: string; session: StoredSession; user: StoredUser } | null {
  const raw = extractRawToken(req);
  if (!raw) return null;
  const tokenHash = hashToken(raw);
  const sess = store.sessions[tokenHash];
  if (!sess) return null;
  if (sess.expiresAt < Date.now()) {
    delete store.sessions[tokenHash];
    persistStore();
    return null;
  }
  const user = store.users[sess.usernameLower];
  if (!user) {
    delete store.sessions[tokenHash];
    persistStore();
    return null;
  }
  return { tokenHash, session: sess, user };
}

function isHttpsRequest(req: Request): boolean {
  const xfProto = req.headers['x-forwarded-proto'];
  if (typeof xfProto === 'string' && xfProto.split(',')[0].trim() === 'https') return true;
  return req.secure;
}

function setSessionCookie(req: Request, res: Response, rawToken: string): void {
  const maxAgeSec = Math.floor(SESSION_TTL_MS / 1000);
  const isHttps = isHttpsRequest(req);
  const flags = [
    `${COOKIE_NAME}=${encodeURIComponent(rawToken)}`,
    'Path=/',
    `Max-Age=${maxAgeSec}`,
    'HttpOnly',
    isHttps ? 'SameSite=None' : 'SameSite=Lax',
  ];
  if (isHttps) {
    flags.push('Secure', 'Partitioned');
  }
  res.setHeader('Set-Cookie', flags.join('; '));
}

function clearSessionCookie(req: Request, res: Response): void {
  const isHttps = isHttpsRequest(req);
  const flags = [
    `${COOKIE_NAME}=`,
    'Path=/',
    'Max-Age=0',
    'HttpOnly',
    isHttps ? 'SameSite=None' : 'SameSite=Lax',
  ];
  if (isHttps) {
    flags.push('Secure', 'Partitioned');
  }
  res.setHeader('Set-Cookie', flags.join('; '));
}

function cleanupExpiredSessions(): void {
  const now = Date.now();
  let dirty = false;
  for (const [k, s] of Object.entries(store.sessions)) {
    if (s.expiresAt < now) {
      delete store.sessions[k];
      dirty = true;
    }
  }
  if (dirty) persistStore();
}

function getAllowedRequestHosts(req: Request): Set<string> {
  const allowed = new Set<string>();
  const addHost = (val: string | undefined) => {
    if (!val) return;
    for (const part of val.split(',')) {
      const h = part.trim().toLowerCase();
      if (h) allowed.add(h);
    }
  };

  addHost(req.headers.host);
  const xfHost = req.headers['x-forwarded-host'];
  if (Array.isArray(xfHost)) {
    xfHost.forEach(addHost);
  } else {
    addHost(xfHost);
  }

  const appUrl = process.env.APP_URL?.trim();
  if (appUrl) {
    try {
      allowed.add(new URL(appUrl).host.toLowerCase());
    } catch {
      // Ignore malformed APP_URL
    }
  }

  return allowed;
}

function verifySameOriginIfBrowser(req: Request, res: Response, next: NextFunction): void {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    next();
    return;
  }
  const origin = req.headers.origin;
  if (origin) {
    const allowedHosts = getAllowedRequestHosts(req);
    if (allowedHosts.size > 0) {
      try {
        const originHost = new URL(origin).host.toLowerCase();
        if (!allowedHosts.has(originHost)) {
          res.status(403).json({ error: 'Neplatný pôvod požiadavky (CSRF ochrana).' });
          return;
        }
      } catch {
        res.status(403).json({ error: 'Neplatná hlavička Origin.' });
        return;
      }
    }
  }
  next();
}

function normalizeUsername(raw: unknown): { ok: true; username: string; lower: string } | { ok: false; error: string } {
  if (typeof raw !== 'string') return { ok: false, error: 'Zadajte používateľské meno.' };
  const trimmed = raw.trim();
  if (trimmed.length < 3 || trimmed.length > 24) {
    return { ok: false, error: 'Používateľské meno musí mať 3 až 24 znakov.' };
  }
  if (!/^[a-zA-Z0-9_.-]+$/.test(trimmed)) {
    return { ok: false, error: 'Meno môže obsahovať len písmená, čísla a znaky _ . -' };
  }
  return { ok: true, username: trimmed, lower: trimmed.toLowerCase() };
}

function isEnvAdminPasscodeMatches(candidate: string): boolean {
  const envPass = process.env.ADMIN_PASSCODE?.trim();
  if (!envPass) return false;
  const a = crypto.createHash('sha256').update(candidate).digest();
  const b = crypto.createHash('sha256').update(envPass).digest();
  return crypto.timingSafeEqual(a, b);
}

function isAdminConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSCODE?.trim() || store.adminAuth?.passwordHash);
}

function sanitizeProfilePayload(input: Record<string, unknown>, username: string): Record<string, unknown> {
  const base = createInitialProfile(username);
  return {
    ...base,
    ...input,
    username,
    customCars: [],
    carOverrides: {},
    unopenedPacks: Array.isArray(input.unopenedPacks)
      ? input.unopenedPacks.filter((x): x is string => typeof x === 'string').slice(0, 100)
      : base.unopenedPacks,
    garage: Array.isArray(input.garage) && input.garage.length > 0 ? input.garage : base.garage,
  };
}

async function startServer() {
  const app = express();
  app.set('trust proxy', true);
  app.disable('x-powered-by');
  app.use(express.json({ limit: '2mb' }));
  app.use('/api', verifySameOriginIfBrowser);

  // Public shared catalog (custom vehicles + admin overrides visible to every account)
  app.get('/api/catalog', (_req, res) => {
    res.json({
      customCars: store.catalog.customCars,
      carOverrides: store.catalog.carOverrides,
    });
  });

  app.get('/api/auth/me', (req, res) => {
    const active = getActiveSession(req);
    if (!active) {
      res.status(401).json({ error: 'Neprihlásený používateľ.' });
      return;
    }
    res.json({
      user: {
        username: active.user.username,
        isAdmin: active.session.isAdmin,
      },
      profile: sanitizeProfilePayload(active.user.profile, active.user.username),
    });
  });

  app.post('/api/auth/register', (req, res) => {
    const nameCheck = normalizeUsername(req.body?.username);
    if (!nameCheck.ok) {
      res.status(400).json({ error: nameCheck.error });
      return;
    }
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (password.length < 4 || password.length > 128) {
      res.status(400).json({ error: 'Heslo musí mať aspoň 4 znaky.' });
      return;
    }
    if (store.users[nameCheck.lower]) {
      res.status(409).json({ error: 'Účet s týmto menom už existuje.' });
      return;
    }

    cleanupExpiredSessions();
    const profile = createInitialProfile(nameCheck.username);
    store.users[nameCheck.lower] = {
      username: nameCheck.username,
      passwordHash: hashPassword(password),
      createdAt: Date.now(),
      profile,
    };

    const rawToken = crypto.randomBytes(32).toString('hex');
    store.sessions[hashToken(rawToken)] = {
      usernameLower: nameCheck.lower,
      isAdmin: false,
      expiresAt: Date.now() + SESSION_TTL_MS,
    };
    persistStore();

    setSessionCookie(req, res, rawToken);
    res.status(201).json({
      token: rawToken,
      user: { username: nameCheck.username, isAdmin: false },
      profile,
    });
  });

  app.post('/api/auth/login', (req, res) => {
    const nameCheck = normalizeUsername(req.body?.username);
    if (!nameCheck.ok) {
      res.status(400).json({ error: nameCheck.error });
      return;
    }
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const user = store.users[nameCheck.lower];
    if (!user || !verifyPassword(password, user.passwordHash)) {
      res.status(401).json({ error: 'Nesprávne používateľské meno alebo heslo.' });
      return;
    }

    cleanupExpiredSessions();
    const rawToken = crypto.randomBytes(32).toString('hex');
    store.sessions[hashToken(rawToken)] = {
      usernameLower: nameCheck.lower,
      isAdmin: false,
      expiresAt: Date.now() + SESSION_TTL_MS,
    };
    persistStore();

    setSessionCookie(req, res, rawToken);
    res.json({
      token: rawToken,
      user: { username: user.username, isAdmin: false },
      profile: sanitizeProfilePayload(user.profile, user.username),
    });
  });

  app.post('/api/auth/logout', (req, res) => {
    const active = getActiveSession(req);
    if (active) {
      delete store.sessions[active.tokenHash];
      persistStore();
    }
    clearSessionCookie(req, res);
    res.json({ ok: true });
  });

  app.put('/api/profile', (req, res) => {
    const active = getActiveSession(req);
    if (!active) {
      res.status(401).json({ error: 'Neprihlásený používateľ.' });
      return;
    }
    const incoming = req.body?.profile;
    if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) {
      res.status(400).json({ error: 'Neplatný formát profilu.' });
      return;
    }
    const cleaned = sanitizeProfilePayload(incoming as Record<string, unknown>, active.user.username);
    active.user.profile = cleaned;
    persistStore();
    res.json({ ok: true, profile: cleaned });
  });

  app.post('/api/profile/reset', (req, res) => {
    const active = getActiveSession(req);
    if (!active) {
      res.status(401).json({ error: 'Neprihlásený používateľ.' });
      return;
    }
    const fresh = createInitialProfile(active.user.username);
    active.user.profile = fresh;
    persistStore();
    res.json({ ok: true, profile: fresh });
  });

  // Admin catalog authorization & shared catalog mutations
  app.get('/api/admin/status', (req, res) => {
    const active = getActiveSession(req);
    res.json({
      configured: isAdminConfigured(),
      isAdmin: Boolean(active?.session.isAdmin),
    });
  });

  app.post('/api/admin/claim', (req, res) => {
    const active = getActiveSession(req);
    if (!active) {
      res.status(401).json({ error: 'Najprv sa prihlás do svojho účtu.' });
      return;
    }
    if (isAdminConfigured()) {
      res.status(409).json({ error: 'Heslo správcu už bolo nastavené. Prihlás sa ním.' });
      return;
    }
    const passcode = typeof req.body?.passcode === 'string' ? req.body.passcode.trim() : '';
    if (passcode.length < 6 || passcode.length > 128) {
      res.status(400).json({ error: 'Heslo správcu musí mať minimálne 6 znakov.' });
      return;
    }
    store.adminAuth = { passwordHash: hashPassword(passcode) };
    active.session.isAdmin = true;
    persistStore();
    res.json({ ok: true, isAdmin: true });
  });

  app.post('/api/admin/login', (req, res) => {
    const active = getActiveSession(req);
    if (!active) {
      res.status(401).json({ error: 'Najprv sa prihlás do svojho účtu.' });
      return;
    }
    if (!isAdminConfigured()) {
      res.status(400).json({ error: 'Heslo správcu ešte nie je nakonfigurované.' });
      return;
    }
    const passcode = typeof req.body?.passcode === 'string' ? req.body.passcode.trim() : '';
    const validEnv = isEnvAdminPasscodeMatches(passcode);
    const validStored = store.adminAuth ? verifyPassword(passcode, store.adminAuth.passwordHash) : false;
    if (!validEnv && !validStored) {
      res.status(401).json({ error: 'Nesprávne heslo správcu.' });
      return;
    }
    active.session.isAdmin = true;
    persistStore();
    res.json({ ok: true, isAdmin: true });
  });

  app.put('/api/admin/catalog', (req, res) => {
    const active = getActiveSession(req);
    if (!active) {
      res.status(401).json({ error: 'Neprihlásený používateľ.' });
      return;
    }
    if (!active.session.isAdmin) {
      res.status(403).json({ error: 'Úprava globálneho katalógu vyžaduje overenie správcu.' });
      return;
    }
    const customCars = Array.isArray(req.body?.customCars) ? req.body.customCars : null;
    const carOverrides =
      req.body?.carOverrides && typeof req.body.carOverrides === 'object' && !Array.isArray(req.body.carOverrides)
        ? req.body.carOverrides
        : null;
    if (!customCars || !carOverrides) {
      res.status(400).json({ error: 'Neplatné dáta katalógu.' });
      return;
    }
    store.catalog = { customCars, carOverrides };
    persistStore();
    res.json({ ok: true, catalog: store.catalog });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Top Drivers server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

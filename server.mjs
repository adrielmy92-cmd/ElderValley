import { createServer } from "node:http";
import crypto from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { verifyMessage } from "ethers";
import pg from "pg";

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT ?? 5188);
const host = process.env.HOST ?? "0.0.0.0";
const storageRoot = path.join(root, ".eldervalley-storage");
const profileRoot = path.join(storageRoot, "profiles");
const allowRemoteCreativeWrites = process.env.ELDERVALLEY_ALLOW_CREATIVE_WRITES === "true";
const adminStorageToken = process.env.ELDERVALLEY_ADMIN_TOKEN ?? "";
const sessionSecret = process.env.ELDERVALLEY_SESSION_SECRET ?? crypto.randomBytes(32).toString("hex");
const authNonces = new Map();
const databaseUrl = process.env.DATABASE_URL ?? "";
const dbPool = databaseUrl ? new pg.Pool({
  connectionString: databaseUrl,
  ssl: process.env.PGSSLMODE === "disable" ? false : { rejectUnauthorized: false }
}) : null;
let dbReadyPromise = null;
let storageSeedPromise = null;
let storageSeedCache = null;
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".mp4": "video/mp4",
  ".mp3": "audio/mpeg"
};
const clients = new Map();
let nextClientId = 1;

function sendJson(res, status, value) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(value));
}

function base64Url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Buffer.from(padded, "base64").toString("utf8");
}

function signSessionPayload(payloadBase64) {
  return base64Url(crypto.createHmac("sha256", sessionSecret).update(payloadBase64).digest());
}

function createSessionToken(session) {
  const payload = {
    ...session,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000
  };
  const payloadBase64 = base64Url(JSON.stringify(payload));
  return `${payloadBase64}.${signSessionPayload(payloadBase64)}`;
}

function readSessionToken(req) {
  const auth = String(req.headers.authorization ?? "");
  if (auth.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }
  return String(req.headers["x-eldervalley-session"] ?? "").trim();
}

function verifySessionToken(token) {
  if (!token || !token.includes(".")) {
    return null;
  }
  const [payloadBase64, signature] = token.split(".");
  const expected = signSessionPayload(payloadBase64);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) {
    return null;
  }
  try {
    const payload = JSON.parse(fromBase64Url(payloadBase64));
    if (!payload?.profileId || !payload?.exp || Date.now() > Number(payload.exp)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

function isWalletProfile(profileId) {
  return String(profileId).toLowerCase().startsWith("wallet:");
}

function walletProfileId(chain, address) {
  return `wallet:${String(chain ?? "evm").toLowerCase()}:${String(address ?? "").toLowerCase()}`;
}

function requireProfileSession(req, profileId) {
  if (!isWalletProfile(profileId)) {
    return { ok: true, session: null };
  }
  const session = verifySessionToken(readSessionToken(req));
  if (!session || session.profileId !== profileId) {
    return { ok: false, session: null };
  }
  return { ok: true, session };
}

function sendWs(socket, payload) {
  try {
    const data = Buffer.from(JSON.stringify(payload), "utf8");
    const header = [];
    header.push(0x81);
    if (data.length < 126) {
      header.push(data.length);
    } else if (data.length < 65536) {
      header.push(126, (data.length >> 8) & 255, data.length & 255);
    } else {
      header.push(127, 0, 0, 0, 0, (data.length >> 24) & 255, (data.length >> 16) & 255, (data.length >> 8) & 255, data.length & 255);
    }
    socket.write(Buffer.concat([Buffer.from(header), data]));
  } catch {
    // Cliente caiu no meio do envio.
  }
}

function readWsMessages(buffer) {
  const messages = [];
  let offset = 0;
  while (offset + 2 <= buffer.length) {
    const first = buffer[offset];
    const second = buffer[offset + 1];
    const opcode = first & 0x0f;
    const masked = (second & 0x80) !== 0;
    let length = second & 0x7f;
    let cursor = offset + 2;

    if (length === 126) {
      if (cursor + 2 > buffer.length) break;
      length = buffer.readUInt16BE(cursor);
      cursor += 2;
    } else if (length === 127) {
      if (cursor + 8 > buffer.length) break;
      const high = buffer.readUInt32BE(cursor);
      const low = buffer.readUInt32BE(cursor + 4);
      length = high * 2 ** 32 + low;
      cursor += 8;
    }

    const maskLength = masked ? 4 : 0;
    if (cursor + maskLength + length > buffer.length) break;
    const mask = masked ? buffer.subarray(cursor, cursor + 4) : null;
    cursor += maskLength;
    const payload = buffer.subarray(cursor, cursor + length);
    cursor += length;
    offset = cursor;

    if (opcode === 0x8) {
      messages.push({ type: "close" });
      continue;
    }
    if (opcode !== 0x1) {
      continue;
    }

    const decoded = Buffer.alloc(payload.length);
    for (let index = 0; index < payload.length; index += 1) {
      decoded[index] = mask ? payload[index] ^ mask[index % 4] : payload[index];
    }
    messages.push({ type: "text", text: decoded.toString("utf8") });
  }
  return { messages, remaining: buffer.subarray(offset) };
}

function publicPlayer(client) {
  return {
    id: client.id,
    name: client.name,
    scene: client.scene,
    sceneChannel: client.sceneChannel,
    x: client.x,
    y: client.y,
    facing: client.facing,
    moving: client.moving,
    characterId: client.characterId,
    loginMode: client.loginMode,
    walletAddress: client.walletAddress,
    walletProvider: client.walletProvider
  };
}

function broadcast(payload, exceptId = null) {
  for (const client of clients.values()) {
    if (client.id === exceptId || !client.ready) {
      continue;
    }
    sendWs(client.socket, payload);
  }
}

function sanitizeText(value, maxLength = 120) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, maxLength);
}

function handleWsPayload(client, payload) {
  if (!payload || typeof payload !== "object") {
    return;
  }

  if (payload.type === "hello") {
    const wasReady = client.ready;
    client.name = sanitizeText(payload.name, 24) || `Jogador ${client.id}`;
    client.scene = sanitizeText(payload.scene, 48) || "WorldScene";
    client.sceneChannel = sanitizeText(payload.sceneChannel, 80) || client.scene;
    client.x = Number(payload.x) || 0;
    client.y = Number(payload.y) || 0;
    client.facing = sanitizeText(payload.facing, 12) || "down";
    client.characterId = sanitizeText(payload.characterId, 24) || "mage-1";
    client.loginMode = sanitizeText(payload.loginMode, 16) || "guest";
    client.walletAddress = sanitizeText(payload.walletAddress, 80);
    client.walletProvider = sanitizeText(payload.walletProvider, 32);
    client.moving = false;
    client.ready = true;
    sendWs(client.socket, {
      type: "welcome",
      id: client.id,
      peers: [...clients.values()].filter((peer) => peer.id !== client.id && peer.ready).map(publicPlayer)
    });
    if (!wasReady) {
      broadcast({ type: "playerJoined", player: publicPlayer(client) }, client.id);
    }
    return;
  }

  if (payload.type === "state") {
    if (!client.ready) {
      return;
    }
    client.scene = sanitizeText(payload.scene, 48) || client.scene;
    client.sceneChannel = sanitizeText(payload.sceneChannel, 80) || client.sceneChannel || client.scene;
    client.x = Number(payload.x) || client.x;
    client.y = Number(payload.y) || client.y;
    client.facing = sanitizeText(payload.facing, 12) || client.facing;
    client.characterId = sanitizeText(payload.characterId, 24) || client.characterId;
    client.loginMode = sanitizeText(payload.loginMode, 16) || client.loginMode || "guest";
    client.walletAddress = sanitizeText(payload.walletAddress, 80) || client.walletAddress || "";
    client.walletProvider = sanitizeText(payload.walletProvider, 32) || client.walletProvider || "";
    client.moving = Boolean(payload.moving);
    broadcast({ type: "state", player: publicPlayer(client) }, client.id);
    return;
  }

  if (payload.type === "chat") {
    if (!client.ready) {
      return;
    }
    const message = sanitizeText(payload.message);
    if (!message) {
      return;
    }
    broadcast({
      type: "chat",
      id: client.id,
      name: client.name,
      scene: client.scene,
      sceneChannel: client.sceneChannel,
      message
    }, client.id);
  }
}

function storagePathFor(key) {
  const safeKey = key.replace(/[^a-zA-Z0-9_.-]/g, "_");
  return path.join(storageRoot, `${safeKey}.json`);
}

function profilePathFor(profileId) {
  const safeProfileId = profileId.replace(/[^a-zA-Z0-9_.:-]/g, "_");
  return path.join(profileRoot, `${safeProfileId}.json`);
}

async function ensureDatabase() {
  if (!dbPool) {
    return false;
  }
  if (!dbReadyPromise) {
    dbReadyPromise = dbPool.query(`
      CREATE TABLE IF NOT EXISTS profiles (
        profile_id TEXT PRIMARY KEY,
        login_mode TEXT NOT NULL DEFAULT 'guest',
        wallet_address TEXT NOT NULL DEFAULT '',
        wallet_provider TEXT NOT NULL DEFAULT '',
        selected_character TEXT NOT NULL DEFAULT 'mage-1',
        coins INTEGER NOT NULL DEFAULT 0,
        owned_characters JSONB NOT NULL DEFAULT '[]'::jsonb,
        owned_houses JSONB NOT NULL DEFAULT '[]'::jsonb,
        items JSONB NOT NULL DEFAULT '[]'::jsonb,
        position JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        data JSONB NOT NULL DEFAULT '{}'::jsonb
      );
      CREATE INDEX IF NOT EXISTS profiles_wallet_address_idx ON profiles (wallet_address);
      CREATE TABLE IF NOT EXISTS game_storage (
        storage_key TEXT PRIMARY KEY,
        data JSONB NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `).then(() => true).catch((error) => {
      dbReadyPromise = null;
      console.error("[database] profile init failed:", error.message);
      return false;
    });
  }
  return dbReadyPromise;
}

async function seedGameStorage() {
  if (!dbPool || storageSeedPromise) {
    return storageSeedPromise;
  }
  storageSeedPromise = (async () => {
    if (!(await ensureDatabase())) {
      return false;
    }
    try {
      const seed = await loadStorageSeed();
      for (const [key, value] of Object.entries(seed)) {
        await dbPool.query(`
          INSERT INTO game_storage (storage_key, data)
          VALUES ($1, $2::jsonb)
          ON CONFLICT (storage_key) DO NOTHING
        `, [key, JSON.stringify(value)]);
      }
      return true;
    } catch (error) {
      console.error("[database] storage seed skipped:", error.message);
      return false;
    }
  })();
  return storageSeedPromise;
}

async function loadStorageSeed() {
  if (storageSeedCache) {
    return storageSeedCache;
  }
  try {
    const seedPath = path.join(root, "data", "storage-seed.json");
    storageSeedCache = JSON.parse(await readFile(seedPath, "utf8"));
  } catch {
    storageSeedCache = {};
  }
  return storageSeedCache;
}

async function readGameStorage(key) {
  if (await ensureDatabase()) {
    await seedGameStorage();
    const result = await dbPool.query("SELECT data, updated_at FROM game_storage WHERE storage_key = $1", [key]);
    const row = result.rows[0];
    return {
      data: row?.data ?? null,
      mtimeMs: row?.updated_at ? new Date(row.updated_at).getTime() : 0,
      source: "postgres"
    };
  }

  const storagePath = storagePathFor(key);
  try {
    const data = JSON.parse(await readFile(storagePath, "utf8"));
    const info = await stat(storagePath);
    return { data, mtimeMs: info.mtimeMs, source: "json" };
  } catch {
    const seed = await loadStorageSeed();
    if (Object.prototype.hasOwnProperty.call(seed, key)) {
      return { data: seed[key], mtimeMs: 0, source: "seed" };
    }
    return { data: null, mtimeMs: 0, source: "empty" };
  }
}

async function writeGameStorage(key, data) {
  if (await ensureDatabase()) {
    await seedGameStorage();
    const result = await dbPool.query(`
      INSERT INTO game_storage (storage_key, data, updated_at)
      VALUES ($1, $2::jsonb, NOW())
      ON CONFLICT (storage_key) DO UPDATE SET
        data = EXCLUDED.data,
        updated_at = NOW()
      RETURNING updated_at
    `, [key, JSON.stringify(data)]);
    return { mtimeMs: new Date(result.rows[0].updated_at).getTime(), source: "postgres" };
  }

  await mkdir(storageRoot, { recursive: true });
  const storagePath = storagePathFor(key);
  await writeFile(storagePath, JSON.stringify(data, null, 2), "utf8");
  const info = await stat(storagePath);
  return { mtimeMs: info.mtimeMs, source: "json" };
}

function rowToProfile(row) {
  if (!row) {
    return null;
  }
  return normalizeProfile(row.profile_id, {
    ...(row.data ?? {}),
    loginMode: row.login_mode,
    walletAddress: row.wallet_address,
    walletProvider: row.wallet_provider,
    selectedCharacter: row.selected_character,
    coins: row.coins,
    ownedCharacters: row.owned_characters,
    ownedHouses: row.owned_houses,
    items: row.items,
    position: row.position,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : undefined,
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : undefined
  });
}

async function readProfile(profileId) {
  if (await ensureDatabase()) {
    const result = await dbPool.query("SELECT * FROM profiles WHERE profile_id = $1", [profileId]);
    return { profile: rowToProfile(result.rows[0]), mtimeMs: result.rows[0]?.updated_at ? new Date(result.rows[0].updated_at).getTime() : 0, source: "postgres" };
  }

  const profilePath = profilePathFor(profileId);
  const data = JSON.parse(await readFile(profilePath, "utf8"));
  const info = await stat(profilePath);
  return { profile: normalizeProfile(profileId, data), mtimeMs: info.mtimeMs, source: "json" };
}

async function writeProfile(profileId, data) {
  const profile = normalizeProfile(profileId, data);
  if (await ensureDatabase()) {
    const result = await dbPool.query(`
      INSERT INTO profiles (
        profile_id,
        login_mode,
        wallet_address,
        wallet_provider,
        selected_character,
        coins,
        owned_characters,
        owned_houses,
        items,
        position,
        created_at,
        updated_at,
        data
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9::jsonb, $10::jsonb, COALESCE($11::timestamptz, NOW()), NOW(), $12::jsonb)
      ON CONFLICT (profile_id) DO UPDATE SET
        login_mode = EXCLUDED.login_mode,
        wallet_address = EXCLUDED.wallet_address,
        wallet_provider = EXCLUDED.wallet_provider,
        selected_character = EXCLUDED.selected_character,
        coins = EXCLUDED.coins,
        owned_characters = EXCLUDED.owned_characters,
        owned_houses = EXCLUDED.owned_houses,
        items = EXCLUDED.items,
        position = EXCLUDED.position,
        updated_at = NOW(),
        data = EXCLUDED.data
      RETURNING *
    `, [
      profile.profileId,
      profile.loginMode,
      profile.walletAddress,
      profile.walletProvider,
      profile.selectedCharacter,
      profile.coins,
      JSON.stringify(profile.ownedCharacters),
      JSON.stringify(profile.ownedHouses),
      JSON.stringify(profile.items),
      profile.position ? JSON.stringify(profile.position) : null,
      profile.createdAt || null,
      JSON.stringify(profile)
    ]);
    const row = result.rows[0];
    return { profile: rowToProfile(row), mtimeMs: new Date(row.updated_at).getTime(), source: "postgres" };
  }

  await mkdir(profileRoot, { recursive: true });
  const profilePath = profilePathFor(profileId);
  await writeFile(profilePath, JSON.stringify(profile, null, 2), "utf8");
  const info = await stat(profilePath);
  return { profile, mtimeMs: info.mtimeMs, source: "json" };
}

function backupPathFor(key) {
  const safeKey = key.replace(/[^a-zA-Z0-9_.-]/g, "_");
  return path.join(storageRoot, "backups", `${safeKey}-${Date.now()}.json`);
}

function isCreativeStorageKey(key) {
  return /(?:editable-houses|manual-(?:floors|trees|fences|structures|collisions))/i.test(key);
}

function isLocalRequest(req) {
  const address = req.socket?.remoteAddress ?? "";
  return address === "127.0.0.1" || address === "::1" || address === "::ffff:127.0.0.1";
}

function hasAdminStorageToken(req) {
  return Boolean(adminStorageToken) && req.headers["x-eldervalley-admin-token"] === adminStorageToken;
}

function canWriteStorageKey(req, key) {
  if (!isCreativeStorageKey(key)) {
    return true;
  }

  return isLocalRequest(req) || allowRemoteCreativeWrites || hasAdminStorageToken(req);
}

function saveReach(data) {
  if (!Array.isArray(data)) {
    return { count: 0, maxY: -Infinity };
  }

  return data.reduce((reach, item) => {
    const y = Number(item?.y ?? 0);
    return {
      count: reach.count + 1,
      maxY: Number.isFinite(y) ? Math.max(reach.maxY, y) : reach.maxY
    };
  }, { count: 0, maxY: -Infinity });
}

function isProbablyStaleCreativeWrite(currentData, nextData) {
  if (!Array.isArray(currentData) || !Array.isArray(nextData) || currentData.length === 0) {
    return false;
  }

  const current = saveReach(currentData);
  const next = saveReach(nextData);
  return next.count === 0 || (next.count < current.count && next.maxY < current.maxY);
}

function isOlderClientWrite(req, currentMtimeMs) {
  const clientMtimeMs = Number(req.headers["x-eldervalley-client-mtime"] ?? 0);
  return clientMtimeMs > 0 && currentMtimeMs > 0 && clientMtimeMs + 1000 < currentMtimeMs;
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

function normalizeProfile(profileId, data = {}) {
  const now = new Date().toISOString();
  return {
    version: 1,
    profileId,
    loginMode: data.loginMode === "wallet" ? "wallet" : "guest",
    walletAddress: sanitizeText(data.walletAddress, 90),
    walletProvider: sanitizeText(data.walletProvider, 32),
    selectedCharacter: sanitizeText(data.selectedCharacter, 32) || "mage-1",
    coins: Math.max(0, Math.floor(Number(data.coins ?? 0) || 0)),
    ownedCharacters: Array.isArray(data.ownedCharacters) ? data.ownedCharacters.map((item) => sanitizeText(item, 32)).filter(Boolean) : ["mage-1"],
    ownedHouses: Array.isArray(data.ownedHouses) ? data.ownedHouses : [],
    items: Array.isArray(data.items) ? data.items : [],
    position: data.position && typeof data.position === "object" ? {
      scene: sanitizeText(data.position.scene, 48) || "WorldScene",
      x: Number(data.position.x) || 0,
      y: Number(data.position.y) || 0
    } : null,
    createdAt: sanitizeText(data.createdAt, 40) || now,
    updatedAt: now
  };
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
    if (url.pathname === "/health") {
      sendJson(res, 200, {
        ok: true,
        name: "ElderValley",
        playersOnline: [...clients.values()].filter((client) => client.ready).length,
        uptime: Math.round(process.uptime())
      });
      return;
    }

    if (url.pathname === "/api/status") {
      sendJson(res, 200, {
        ok: true,
        websocket: true,
        playersOnline: [...clients.values()].filter((client) => client.ready).length
      });
      return;
    }

    if (url.pathname === "/api/auth/nonce") {
      if (req.method !== "POST") {
        sendJson(res, 405, { ok: false, error: "Method not allowed" });
        return;
      }
      const body = await readBody(req);
      const payload = JSON.parse(body || "{}");
      const address = sanitizeText(payload.address, 90);
      const chain = sanitizeText(payload.chain, 32) || "EVM";
      const provider = sanitizeText(payload.provider, 32);
      if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
        sendJson(res, 400, { ok: false, error: "Invalid EVM address" });
        return;
      }
      const nonce = crypto.randomBytes(16).toString("hex");
      const issuedAt = new Date().toISOString();
      const message = [
        "ElderValley Login",
        "",
        "Assine para entrar com seguranca.",
        `Carteira: ${address}`,
        `Rede: ${chain}`,
        `Nonce: ${nonce}`,
        `Emitido em: ${issuedAt}`
      ].join("\n");
      const key = `${chain.toLowerCase()}:${address.toLowerCase()}`;
      authNonces.set(key, { nonce, message, provider, expiresAt: Date.now() + 5 * 60 * 1000 });
      sendJson(res, 200, { ok: true, nonce, message, issuedAt });
      return;
    }

    if (url.pathname === "/api/auth/verify") {
      if (req.method !== "POST") {
        sendJson(res, 405, { ok: false, error: "Method not allowed" });
        return;
      }
      const body = await readBody(req);
      const payload = JSON.parse(body || "{}");
      const address = sanitizeText(payload.address, 90);
      const chain = sanitizeText(payload.chain, 32) || "EVM";
      const provider = sanitizeText(payload.provider, 32);
      const signature = sanitizeText(payload.signature, 300);
      const nonce = sanitizeText(payload.nonce, 80);
      const message = String(payload.message ?? "");
      const key = `${chain.toLowerCase()}:${address.toLowerCase()}`;
      const expected = authNonces.get(key);
      if (!address || !signature || !expected || expected.nonce !== nonce || expected.message !== message || Date.now() > expected.expiresAt) {
        sendJson(res, 401, { ok: false, error: "Invalid or expired login challenge" });
        return;
      }
      let recovered = "";
      try {
        recovered = verifyMessage(message, signature);
      } catch {
        sendJson(res, 401, { ok: false, error: "Invalid wallet signature" });
        return;
      }
      if (recovered.toLowerCase() !== address.toLowerCase()) {
        sendJson(res, 401, { ok: false, error: "Signature does not match wallet" });
        return;
      }
      authNonces.delete(key);
      const profileId = walletProfileId(chain, address);
      const token = createSessionToken({ profileId, address: address.toLowerCase(), chain, provider });
      let profile = null;
      try {
        profile = (await readProfile(profileId)).profile;
      } catch {
        profile = normalizeProfile(profileId, {
          loginMode: "wallet",
          walletAddress: address,
          walletProvider: provider,
          selectedCharacter: "mage-1",
          ownedCharacters: ["mage-1"],
          ownedHouses: [],
          items: []
        });
        try {
          profile = (await writeProfile(profileId, profile)).profile;
        } catch {
          // A sessao ainda pode iniciar; o proximo save tenta persistir novamente.
        }
      }
      sendJson(res, 200, { ok: true, token, profileId, profile });
      return;
    }

    if (url.pathname.startsWith("/api/profile/")) {
      const profileId = decodeURIComponent(url.pathname.slice("/api/profile/".length));
      if (!profileId) {
        sendJson(res, 400, { ok: false, error: "Missing profile id" });
        return;
      }
      const auth = requireProfileSession(req, profileId);
      if (!auth.ok) {
        sendJson(res, 401, { ok: false, error: "Wallet session required" });
        return;
      }

      if (req.method === "GET") {
        try {
          const result = await readProfile(profileId);
          sendJson(res, 200, { ok: true, profile: result.profile, mtimeMs: result.mtimeMs, source: result.source });
        } catch {
          sendJson(res, 200, { ok: true, profile: null, mtimeMs: 0 });
        }
        return;
      }

      if (req.method === "POST") {
        const body = await readBody(req);
        const payload = JSON.parse(body || "null");
        const result = await writeProfile(profileId, payload);
        sendJson(res, 200, { ok: true, profile: result.profile, mtimeMs: result.mtimeMs, source: result.source });
        return;
      }

      sendJson(res, 405, { ok: false, error: "Method not allowed" });
      return;
    }

    if (url.pathname.startsWith("/api/storage/")) {
      const key = decodeURIComponent(url.pathname.slice("/api/storage/".length));
      if (!key) {
        sendJson(res, 400, { ok: false, error: "Missing key" });
        return;
      }

      if (req.method === "GET") {
        try {
          const result = await readGameStorage(key);
          sendJson(res, 200, { ok: true, key, data: result.data, mtimeMs: result.mtimeMs, source: result.source });
        } catch {
          sendJson(res, 200, { ok: true, key, data: null, mtimeMs: 0 });
        }
        return;
      }

      if (req.method === "POST") {
        if (!canWriteStorageKey(req, key)) {
          sendJson(res, 403, {
            ok: false,
            key,
            protected: true,
            reason: "creative world saves are locked on hosted servers"
          });
          return;
        }

        const body = await readBody(req);
        const payload = JSON.parse(body || "null");
        let previousData = null;
        let previousMtimeMs = 0;
        try {
          const previous = await readGameStorage(key);
          previousData = previous.data;
          previousMtimeMs = previous.mtimeMs;
          if (previousData !== null) {
            await mkdir(path.join(storageRoot, "backups"), { recursive: true });
            await writeFile(backupPathFor(key), JSON.stringify(previousData, null, 2), "utf8");
          }
        } catch {
          // Primeiro save desse arquivo, sem backup anterior.
        }
        if (isOlderClientWrite(req, previousMtimeMs) || (!req.headers["x-eldervalley-client-mtime"] && isProbablyStaleCreativeWrite(previousData, payload))) {
          sendJson(res, 409, { ok: false, key, ignored: true, reason: "stale creative save" });
          return;
        }
        const result = await writeGameStorage(key, payload);
        sendJson(res, 200, { ok: true, key, mtimeMs: result.mtimeMs, source: result.source });
        return;
      }

      sendJson(res, 405, { ok: false, error: "Method not allowed" });
      return;
    }

    const pathname = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
    const filePath = path.resolve(root, `.${pathname}`);

    if (!filePath.startsWith(root)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    const data = await readFile(filePath);
    res.writeHead(200, {
      "Content-Type": types[path.extname(filePath)] ?? "application/octet-stream",
      "Cache-Control": "no-store"
    });
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
});

server.on("upgrade", (req, socket) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
  if (url.pathname !== "/ws") {
    socket.destroy();
    return;
  }

  const key = req.headers["sec-websocket-key"];
  if (!key) {
    socket.destroy();
    return;
  }

  const accept = crypto
    .createHash("sha1")
    .update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`)
    .digest("base64");
  socket.write([
    "HTTP/1.1 101 Switching Protocols",
    "Upgrade: websocket",
    "Connection: Upgrade",
    `Sec-WebSocket-Accept: ${accept}`,
    "",
    ""
  ].join("\r\n"));

  const id = String(nextClientId);
  nextClientId += 1;
  const client = {
    id,
    socket,
    name: `Jogador ${id}`,
    scene: "WorldScene",
    x: 0,
    y: 0,
    facing: "down",
    characterId: "mage-1",
    moving: false,
    ready: false
  };
  clients.set(id, client);

  socket.on("data", (buffer) => {
    client.buffer = Buffer.concat([client.buffer ?? Buffer.alloc(0), buffer]);
    const parsed = readWsMessages(client.buffer);
    client.buffer = parsed.remaining;
    for (const message of parsed.messages) {
      if (message.type === "close") {
        socket.end();
        return;
      }
      try {
        handleWsPayload(client, JSON.parse(message.text));
      } catch {
        // Ignora mensagens quebradas para manter o servidor vivo.
      }
    }
  });

  socket.on("close", () => {
    clients.delete(id);
    broadcast({ type: "playerLeft", id });
  });
  socket.on("error", () => {
    clients.delete(id);
    broadcast({ type: "playerLeft", id });
  });
});

server.listen(port, host, () => {
  console.log(`ElderValley server listening on ${host}:${port}`);
});

function shutdown(signal) {
  console.log(`Received ${signal}, shutting down ElderValley server...`);
  broadcast({ type: "serverShutdown" });
  for (const client of clients.values()) {
    client.socket.end();
  }
  server.close(() => {
    process.exit(0);
  });
  setTimeout(() => process.exit(0), 4000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

import { createServer } from "node:http";
import crypto from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Contract, JsonRpcProvider, verifyMessage } from "ethers";
import pg from "pg";

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT ?? 5188);
const host = process.env.HOST ?? "0.0.0.0";
const storageRoot = path.join(root, ".eldervalley-storage");
const profileRoot = path.join(storageRoot, "profiles");
const allowRemoteCreativeWrites = process.env.ELDERVALLEY_ALLOW_CREATIVE_WRITES === "true";
const adminStorageToken = process.env.ELDERVALLEY_ADMIN_TOKEN ?? "";
const builtInDevWallets = [
  "0xae8dc35e7e7eb3b5428429eed044f70fc54bed1a"
];
const developerWallets = new Set([
  ...builtInDevWallets,
  ...(process.env.ELDERVALLEY_DEV_WALLETS ?? "")
    .split(",")
    .map((wallet) => wallet.trim().toLowerCase())
    .filter(Boolean)
]);
const sessionSecret = process.env.ELDERVALLEY_SESSION_SECRET ?? crypto.randomBytes(32).toString("hex");
const authNonces = new Map();
const databaseUrl = process.env.DATABASE_URL ?? "";
const dbPool = databaseUrl ? new pg.Pool({
  connectionString: databaseUrl,
  ssl: process.env.PGSSLMODE === "disable" ? false : { rejectUnauthorized: false }
}) : null;
const web3ChainId = Number(process.env.ELDERVALLEY_CHAIN_ID ?? process.env.CHAIN_ID ?? 8453);
const web3RpcUrl = process.env.ELDERVALLEY_BASE_RPC_URL ?? process.env.BASE_RPC_URL ?? "";
const housesContractAddress = String(process.env.ELDERVALLEY_HOUSES_CONTRACT ?? "").trim();
const houseIndexerStartBlock = Math.max(0, Number(process.env.ELDERVALLEY_HOUSE_INDEXER_START_BLOCK ?? 0) || 0);
const houseIndexerBatchSize = Math.max(100, Math.min(5000, Number(process.env.ELDERVALLEY_HOUSE_INDEXER_BATCH_SIZE ?? 2000) || 2000));
const housesContractAbi = [
  "event HousePurchased(address indexed buyer,uint256 indexed tokenId,uint256 indexed houseTypeId,string key,string name,uint256 price)",
  "event Transfer(address indexed from,address indexed to,uint256 indexed tokenId)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenHouseTypeId(uint256 tokenId) view returns (uint256)",
  "function houseTypes(uint256 houseTypeId) view returns (string key,string name,uint256 price,uint256 maxSupply,uint256 minted,bool active)"
];
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
const worldClockStartedAt = Date.now();
const worldClockStartMinutes = 8 * 60;
const worldClockMinutesPerSecond = 5;

// Capacidade máxima de visitantes por interior de casa (doorId → limite).
// Common=4, Uncommon=8, Rare=16, Legendary=sem limite (999).
const ROOM_CAPACITY = new Map([
  ["door_cozy_cottage",           4],
  ["door_thatch_cottage_house",   4],
  ["door_red_lodge_house",        4],
  ["door_green_cottage_house",    4],
  ["door_blue_cottage_house",     8],
  ["door_ivy_manor_house",        8],
  ["door_elf_green_manor_house",  8],
  ["door_blue_arcane_manor_house",16],
  ["door_blue_gold_tower_house",  16],
  ["door_teal_roof_manor_house",  16],
  ["door_large_manor",           999],
  ["door_red_tower_cottage_house",999],
]);

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

function validateWalletSocketSession(payload) {
  const loginMode = sanitizeText(payload.loginMode, 16) || "guest";
  if (loginMode !== "wallet") {
    return { ok: true, loginMode: "guest", session: null, profileId: "" };
  }
  const session = verifySessionToken(sanitizeText(payload.sessionToken, 2000));
  if (!session?.profileId || !isWalletProfile(session.profileId)) {
    return { ok: false, error: "Wallet must sign the session again." };
  }
  const walletAddress = sanitizeText(payload.walletAddress, 90).toLowerCase();
  if (walletAddress && session.address && walletAddress !== String(session.address).toLowerCase()) {
    return { ok: false, error: "Wallet session does not match the connected address." };
  }
  return {
    ok: true,
    loginMode: "wallet",
    session,
    profileId: String(session.profileId).toLowerCase(),
    walletAddress: String(session.address ?? walletAddress).toLowerCase(),
    walletProvider: sanitizeText(session.provider ?? payload.walletProvider, 32)
  };
}

function isDeveloperWallet(address) {
  return developerWallets.has(String(address ?? "").toLowerCase());
}

function hasDeveloperSession(req) {
  const session = verifySessionToken(readSessionToken(req));
  return Boolean(session?.address && isDeveloperWallet(session.address));
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
    presenceId: client.presenceId,
    name: client.name,
    scene: client.scene,
    sceneChannel: client.sceneChannel,
    x: client.x,
    y: client.y,
    facing: client.facing,
    moving: client.moving,
    characterId: client.characterId,
    loginMode: client.loginMode,
    walletAddress: maskWalletAddress(client.walletAddress),
    walletProvider: client.walletProvider
  };
}

function maskWalletAddress(address) {
  const value = String(address ?? "").toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(value)) {
    return "";
  }
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function getServerClockMinutes() {
  const elapsedSeconds = (Date.now() - worldClockStartedAt) / 1000;
  return (worldClockStartMinutes + elapsedSeconds * worldClockMinutesPerSecond) % 1440;
}

const workDefinitions = {
  alchemy: {
    id: "alchemy",
    label: "Alchemy",
    totalGameMinutes: 360,
    coinsPerGameHour: 10,
    taskBonusGameMinutes: 30,
    ingredients: ["Living Leaf", "Crystal Salt", "Moonroot", "Blue Ash", "Green Essence"],
    prompts: [
      "Mix the ingredients in the correct order.",
      "Stabilize the potion by following the sequence.",
      "Adjust the cauldron before the energy escapes."
    ]
  }
};
const workSessions = new Map();

function createWorkTask(definition) {
  const choices = [...definition.ingredients];
  const sequence = [];
  const sequenceLength = 3;
  for (let index = 0; index < sequenceLength; index += 1) {
    const pick = choices[Math.floor(Math.random() * choices.length)];
    sequence.push(pick);
  }
  return {
    taskId: crypto.randomUUID(),
    prompt: definition.prompts[Math.floor(Math.random() * definition.prompts.length)],
    choices,
    sequence,
    sequenceLength,
    bonusGameMinutes: definition.taskBonusGameMinutes
  };
}

function normalizeWorkSession(session) {
  const definition = workDefinitions[session.jobId] ?? workDefinitions.alchemy;
  const elapsedRealSeconds = Math.max(0, (Date.now() - session.startedAtMs) / 1000);
  const elapsedGameMinutes = Math.min(
    definition.totalGameMinutes,
    elapsedRealSeconds * worldClockMinutesPerSecond + session.bonusGameMinutes
  );
  const earnedCoins = Math.floor((elapsedGameMinutes / 60) * definition.coinsPerGameHour);
  return {
    sessionId: session.sessionId,
    profileId: session.profileId,
    jobId: definition.id,
    label: definition.label,
    totalGameMinutes: definition.totalGameMinutes,
    elapsedGameMinutes,
    remainingGameMinutes: Math.max(0, definition.totalGameMinutes - elapsedGameMinutes),
    progress: definition.totalGameMinutes > 0 ? elapsedGameMinutes / definition.totalGameMinutes : 1,
    coinsPerGameHour: definition.coinsPerGameHour,
    earnedCoins,
    maxCoins: Math.floor((definition.totalGameMinutes / 60) * definition.coinsPerGameHour),
    completed: elapsedGameMinutes >= definition.totalGameMinutes,
    task: session.task
  };
}

function publicWorkState(session) {
  const state = normalizeWorkSession(session);
  return {
    ...state,
    progress: Math.max(0, Math.min(1, state.progress)),
    elapsedGameMinutes: Math.floor(state.elapsedGameMinutes),
    remainingGameMinutes: Math.ceil(state.remainingGameMinutes)
  };
}

async function awardWorkCoins(profileId, coins) {
  const coinsToAward = Math.max(0, Math.floor(Number(coins) || 0));
  let profile = null;
  try {
    profile = (await readProfile(profileId)).profile;
  } catch {
    profile = null;
  }
  profile = normalizeProfile(profileId, profile ?? {});
  profile.coins = Math.max(0, Math.floor(Number(profile.coins ?? 0) || 0)) + coinsToAward;
  const result = await writeProfile(profileId, profile);
  return result.profile;
}

function publicPeers(exceptClient = null, sceneChannel = null) {
  const exceptId = typeof exceptClient === "object" ? exceptClient?.id : exceptClient;
  const exceptPresenceId = typeof exceptClient === "object" ? exceptClient?.presenceId : null;
  const latestByPresence = new Map();
  for (const peer of clients.values()) {
    const peerPresenceId = peer.presenceId || peer.id;
    if (peer.id === exceptId || peer.superseded || !peer.ready || (exceptPresenceId && peerPresenceId === exceptPresenceId)) {
      continue;
    }
    if (sceneChannel !== null && peer.sceneChannel !== sceneChannel) {
      continue;
    }
    latestByPresence.set(peerPresenceId, peer);
  }
  return [...latestByPresence.values()].map(publicPlayer);
}

function broadcast(payload, exceptId = null, exceptPresenceId = null, sceneChannel = null) {
  for (const client of clients.values()) {
    const clientPresenceId = client.presenceId || client.id;
    if (client.id === exceptId || client.superseded || !client.ready || (exceptPresenceId && clientPresenceId === exceptPresenceId)) {
      continue;
    }
    if (sceneChannel !== null && client.sceneChannel !== sceneChannel) {
      continue;
    }
    sendWs(client.socket, payload);
  }
}

function supersedeOlderPresenceClients(activeClient) {
  const presenceId = activeClient.presenceId || activeClient.id;
  for (const peer of clients.values()) {
    if (peer.id === activeClient.id || (peer.presenceId || peer.id) !== presenceId) {
      continue;
    }
    peer.superseded = true;
    sendWs(peer.socket, { type: "presenceReplaced" });
    peer.socket.end();
  }
}

function supersedeOlderWalletClients(activeClient) {
  if (!activeClient.walletProfileId) {
    return;
  }
  for (const peer of clients.values()) {
    if (peer.id === activeClient.id || peer.walletProfileId !== activeClient.walletProfileId) {
      continue;
    }
    peer.superseded = true;
    sendWs(peer.socket, {
      type: "walletSessionReplaced",
      message: "This wallet logged in from another browser. This session was closed to prevent duplicate farming."
    });
    peer.socket.end();
  }
}

function hasActivePresence(presenceId) {
  return [...clients.values()].some((peer) => peer.ready && !peer.superseded && (peer.presenceId || peer.id) === presenceId);
}

function hasActiveWalletPresence(profileId, presenceId = "") {
  const normalizedProfileId = String(profileId ?? "").toLowerCase();
  const normalizedPresenceId = sanitizeText(presenceId, 80);
  return [...clients.values()].some((peer) => (
    peer.ready
    && !peer.superseded
    && peer.walletProfileId === normalizedProfileId
    && (!normalizedPresenceId || (peer.presenceId || peer.id) === normalizedPresenceId)
  ));
}

function sanitizeText(value, maxLength = 120) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, maxLength);
}

function getChannelDoorId(sceneChannel) {
  const colon = (sceneChannel ?? "").indexOf(":");
  return colon >= 0 ? sceneChannel.slice(colon + 1) : null;
}

function countPlayersInChannel(sceneChannel, excludeClientId) {
  let count = 0;
  for (const peer of clients.values()) {
    if (peer.id === excludeClientId || peer.superseded || !peer.ready) {
      continue;
    }
    if (peer.sceneChannel === sceneChannel) {
      count += 1;
    }
  }
  return count;
}

function canonicalSceneChannel(scene, sceneChannel) {
  if (scene === "WorldScene") {
    return "world:main";
  }
  if (scene === "CityScene") {
    return "city:main";
  }
  return sceneChannel || scene || "WorldScene";
}

function handleWsPayload(client, payload) {
  if (!payload || typeof payload !== "object") {
    return;
  }

  if (payload.type === "hello") {
    const wasReady = client.ready;
    const walletAuth = validateWalletSocketSession(payload);
    if (!walletAuth.ok) {
      sendWs(client.socket, { type: "authRejected", message: walletAuth.error });
      client.superseded = true;
      client.socket.end();
      return;
    }
    client.presenceId = sanitizeText(payload.presenceId, 80) || client.presenceId || client.id;
    supersedeOlderPresenceClients(client);
    client.name = sanitizeText(payload.name, 24) || `Player ${client.id}`;
    client.scene = sanitizeText(payload.scene, 48) || "WorldScene";
    client.sceneChannel = canonicalSceneChannel(client.scene, sanitizeText(payload.sceneChannel, 80));
    client.x = finiteNumber(payload.x, 0);
    client.y = finiteNumber(payload.y, 0);
    client.facing = sanitizeText(payload.facing, 12) || "down";
    client.characterId = sanitizeText(payload.characterId, 24) || "mage-1";
    client.loginMode = walletAuth.loginMode;
    client.walletProfileId = walletAuth.profileId;
    client.walletAddress = walletAuth.walletAddress ?? "";
    client.walletProvider = walletAuth.walletProvider ?? "";
    client.moving = false;
    client.ready = true;
    supersedeOlderWalletClients(client);

    const doorId = getChannelDoorId(client.sceneChannel);
    const capacity = ROOM_CAPACITY.get(doorId ?? "");
    if (capacity !== undefined) {
      const current = countPlayersInChannel(client.sceneChannel, client.id);
      if (current >= capacity) {
        sendWs(client.socket, { type: "roomFull", capacity, current });
        client.ready = false;
        client.superseded = true;
        client.socket.end();
        return;
      }
    }

    sendWs(client.socket, {
      type: "welcome",
      id: client.id,
      clockMinutes: getServerClockMinutes(),
      peers: publicPeers(client, client.sceneChannel)
    });
    if (!wasReady) {
      broadcast({ type: "playerJoined", player: publicPlayer(client) }, client.id, client.presenceId, client.sceneChannel);
    }
    return;
  }

  if (payload.type === "state") {
    if (!client.ready || client.superseded) {
      return;
    }
    if (client.walletProfileId) {
      const walletAuth = validateWalletSocketSession(payload);
      if (!walletAuth.ok || walletAuth.profileId !== client.walletProfileId) {
        sendWs(client.socket, { type: "authRejected", message: "Invalid wallet session." });
        client.superseded = true;
        client.socket.end();
        return;
      }
    }
    client.scene = sanitizeText(payload.scene, 48) || client.scene;
    client.sceneChannel = canonicalSceneChannel(client.scene, sanitizeText(payload.sceneChannel, 80) || client.sceneChannel);
    client.presenceId = sanitizeText(payload.presenceId, 80) || client.presenceId || client.id;
    client.x = finiteNumber(payload.x, client.x);
    client.y = finiteNumber(payload.y, client.y);
    client.facing = sanitizeText(payload.facing, 12) || client.facing;
    client.characterId = sanitizeText(payload.characterId, 24) || client.characterId;
    client.loginMode = client.walletProfileId ? "wallet" : (sanitizeText(payload.loginMode, 16) || client.loginMode || "guest");
    client.moving = Boolean(payload.moving);
    broadcast({ type: "state", player: publicPlayer(client) }, client.id, client.presenceId, client.sceneChannel);
    return;
  }

  if (payload.type === "sync") {
    if (!client.ready || client.superseded) {
      return;
    }
    client.scene = sanitizeText(payload.scene, 48) || client.scene;
    client.sceneChannel = canonicalSceneChannel(client.scene, sanitizeText(payload.sceneChannel, 80) || client.sceneChannel);
    client.presenceId = sanitizeText(payload.presenceId, 80) || client.presenceId || client.id;
    client.x = finiteNumber(payload.x, client.x);
    client.y = finiteNumber(payload.y, client.y);
    sendWs(client.socket, {
      type: "snapshot",
      clockMinutes: getServerClockMinutes(),
      peers: publicPeers(client, client.sceneChannel)
    });
    return;
  }

  if (payload.type === "chat") {
    if (!client.ready || client.superseded) {
      return;
    }
    const message = sanitizeText(payload.message);
    if (!message) {
      return;
    }
    broadcast({
      type: "chat",
      id: client.id,
      presenceId: client.presenceId,
      name: client.name,
      scene: client.scene,
      sceneChannel: client.sceneChannel,
      message
    }, client.id, client.presenceId, client.sceneChannel);
  }

  if (payload.type === "hitTroll") {
    if (!client.ready || client.superseded) return;
    const idx = Math.floor(Number(payload.index ?? -1));
    if (idx < 0 || idx >= 4) return;
    const damage = Math.min(500, Math.max(0, Number(payload.damage) || 0));
    applyTrollDamage(idx, damage);
    return;
  }

  if (payload.type === "hitBoss") {
    if (!client.ready || client.superseded) return;
    if (!bossState.spawned) return; // boss ainda não nasceu
    const damage = Math.min(500, Math.max(0, Number(payload.damage) || 0));
    if (damage > 0) applyBossDamage(damage);
    return;
  }

  if (payload.type === "bossEvent") {
    if (!client.ready || client.superseded) {
      return;
    }
    const event = sanitizeText(payload.event, 40);
    if (!event) {
      return;
    }
    broadcast({
      type: "bossEvent",
      event,
      data: payload.data ?? {}
    }, client.id, client.presenceId, client.sceneChannel);
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
      CREATE TABLE IF NOT EXISTS game_storage_history (
        id BIGSERIAL PRIMARY KEY,
        storage_key TEXT NOT NULL,
        data JSONB NOT NULL,
        saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS game_storage_history_key_time_idx ON game_storage_history (storage_key, saved_at DESC);
      CREATE TABLE IF NOT EXISTS profile_history (
        id BIGSERIAL PRIMARY KEY,
        profile_id TEXT NOT NULL,
        data JSONB NOT NULL,
        saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS profile_history_profile_time_idx ON profile_history (profile_id, saved_at DESC);
      CREATE TABLE IF NOT EXISTS web3_house_ownership (
        token_id TEXT PRIMARY KEY,
        wallet_address TEXT NOT NULL,
        house_type_id TEXT NOT NULL DEFAULT '',
        house_key TEXT NOT NULL,
        house_name TEXT NOT NULL DEFAULT '',
        price_wei TEXT NOT NULL DEFAULT '0',
        transaction_hash TEXT NOT NULL DEFAULT '',
        block_number BIGINT NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS web3_house_ownership_wallet_idx ON web3_house_ownership (wallet_address);
      CREATE INDEX IF NOT EXISTS web3_house_ownership_house_key_idx ON web3_house_ownership (house_key);
      CREATE TABLE IF NOT EXISTS web3_indexer_state (
        state_key TEXT PRIMARY KEY,
        state_value TEXT NOT NULL,
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
    const previous = await dbPool.query("SELECT data FROM game_storage WHERE storage_key = $1", [key]);
    if (previous.rows[0]?.data !== undefined) {
      await dbPool.query(`
        INSERT INTO game_storage_history (storage_key, data)
        VALUES ($1, $2::jsonb)
      `, [key, JSON.stringify(previous.rows[0].data)]);
    }
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

function normalizeWalletAddress(address) {
  const value = String(address ?? "").trim().toLowerCase();
  return /^0x[a-f0-9]{40}$/.test(value) ? value : "";
}

function normalizeIndexedHouse(row) {
  if (!row) {
    return null;
  }
  const tokenId = sanitizeText(row.token_id ?? row.tokenId, 80);
  const houseKey = sanitizeText(row.house_key ?? row.houseKey ?? row.key, 140);
  if (!tokenId || !houseKey) {
    return null;
  }
  return {
    source: "base-contract",
    tokenId,
    walletAddress: normalizeWalletAddress(row.wallet_address ?? row.walletAddress),
    houseTypeId: sanitizeText(row.house_type_id ?? row.houseTypeId, 80),
    key: houseKey,
    houseKey,
    name: sanitizeText(row.house_name ?? row.houseName ?? row.name, 120),
    priceWei: sanitizeText(row.price_wei ?? row.priceWei, 100),
    transactionHash: sanitizeText(row.transaction_hash ?? row.transactionHash, 90),
    blockNumber: Math.max(0, Number(row.block_number ?? row.blockNumber ?? 0) || 0),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString()
  };
}

function mergeProfileHouses(profileHouses = [], indexedHouses = []) {
  const merged = new Map();
  for (const house of Array.isArray(profileHouses) ? profileHouses : []) {
    const key = sanitizeText(house?.tokenId ?? house?.key ?? house?.houseKey ?? JSON.stringify(house), 160);
    if (key) {
      merged.set(key, house);
    }
  }
  for (const house of indexedHouses) {
    const normalized = normalizeIndexedHouse(house);
    if (normalized) {
      merged.set(`token:${normalized.tokenId}`, normalized);
    }
  }
  return [...merged.values()];
}

async function readIndexedHousesForWallet(walletAddress) {
  const wallet = normalizeWalletAddress(walletAddress);
  if (!wallet || !(await ensureDatabase())) {
    return [];
  }
  const result = await dbPool.query(`
    SELECT *
    FROM web3_house_ownership
    WHERE wallet_address = $1
    ORDER BY block_number ASC, token_id ASC
  `, [wallet]);
  return result.rows.map(normalizeIndexedHouse).filter(Boolean);
}

async function readIndexedHouseByKey(walletAddress, houseKey) {
  const wallet = normalizeWalletAddress(walletAddress);
  const key = sanitizeText(houseKey, 140);
  if (!wallet || !key || !(await ensureDatabase())) {
    return null;
  }
  const result = await dbPool.query(`
    SELECT *
    FROM web3_house_ownership
    WHERE wallet_address = $1 AND house_key = $2
    ORDER BY block_number ASC, token_id ASC
    LIMIT 1
  `, [wallet, key]);
  return normalizeIndexedHouse(result.rows[0]);
}

async function syncProfileWithIndexedHouses(profile) {
  if (!profile?.walletAddress) {
    return profile;
  }
  const indexedHouses = await readIndexedHousesForWallet(profile.walletAddress);
  if (indexedHouses.length === 0) {
    return profile;
  }
  return {
    ...profile,
    ownedHouses: mergeProfileHouses(profile.ownedHouses, indexedHouses)
  };
}

async function readProfile(profileId) {
  if (await ensureDatabase()) {
    const result = await dbPool.query("SELECT * FROM profiles WHERE profile_id = $1", [profileId]);
    const profile = await syncProfileWithIndexedHouses(rowToProfile(result.rows[0]));
    return { profile, mtimeMs: result.rows[0]?.updated_at ? new Date(result.rows[0].updated_at).getTime() : 0, source: "postgres" };
  }

  const profilePath = profilePathFor(profileId);
  const data = JSON.parse(await readFile(profilePath, "utf8"));
  const info = await stat(profilePath);
  return { profile: normalizeProfile(profileId, data), mtimeMs: info.mtimeMs, source: "json" };
}

async function writeProfile(profileId, data) {
  const profile = await syncProfileWithIndexedHouses(normalizeProfile(profileId, data));
  if (await ensureDatabase()) {
    const previous = await dbPool.query("SELECT data FROM profiles WHERE profile_id = $1", [profile.profileId]);
    if (previous.rows[0]?.data !== undefined) {
      await dbPool.query(`
        INSERT INTO profile_history (profile_id, data)
        VALUES ($1, $2::jsonb)
      `, [profile.profileId, JSON.stringify(previous.rows[0].data)]);
    }
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

async function upsertIndexedHouseOwnership({
  tokenId,
  walletAddress,
  houseTypeId = "",
  houseKey,
  houseName = "",
  priceWei = "0",
  transactionHash = "",
  blockNumber = 0
}) {
  const token = sanitizeText(tokenId, 80);
  const wallet = normalizeWalletAddress(walletAddress);
  const key = sanitizeText(houseKey, 140);
  if (!token || !wallet || !key || !(await ensureDatabase())) {
    return false;
  }
  await dbPool.query(`
    INSERT INTO web3_house_ownership (
      token_id,
      wallet_address,
      house_type_id,
      house_key,
      house_name,
      price_wei,
      transaction_hash,
      block_number,
      updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
    ON CONFLICT (token_id) DO UPDATE SET
      wallet_address = EXCLUDED.wallet_address,
      house_type_id = EXCLUDED.house_type_id,
      house_key = EXCLUDED.house_key,
      house_name = EXCLUDED.house_name,
      price_wei = EXCLUDED.price_wei,
      transaction_hash = EXCLUDED.transaction_hash,
      block_number = GREATEST(web3_house_ownership.block_number, EXCLUDED.block_number),
      updated_at = NOW()
  `, [
    token,
    wallet,
    sanitizeText(houseTypeId, 80),
    key,
    sanitizeText(houseName, 120),
    sanitizeText(priceWei, 100),
    sanitizeText(transactionHash, 90),
    Math.max(0, Number(blockNumber) || 0)
  ]);
  return true;
}

async function readIndexerState(stateKey, fallback = "0") {
  if (!(await ensureDatabase())) {
    return fallback;
  }
  const key = sanitizeText(stateKey, 120);
  const result = await dbPool.query("SELECT state_value FROM web3_indexer_state WHERE state_key = $1", [key]);
  return sanitizeText(result.rows[0]?.state_value ?? fallback, 200);
}

async function writeIndexerState(stateKey, stateValue) {
  if (!(await ensureDatabase())) {
    return false;
  }
  const key = sanitizeText(stateKey, 120);
  await dbPool.query(`
    INSERT INTO web3_indexer_state (state_key, state_value, updated_at)
    VALUES ($1, $2, NOW())
    ON CONFLICT (state_key) DO UPDATE SET
      state_value = EXCLUDED.state_value,
      updated_at = NOW()
  `, [key, String(stateValue)]);
  return true;
}

function backupPathFor(key) {
  const safeKey = key.replace(/[^a-zA-Z0-9_.-]/g, "_");
  return path.join(storageRoot, "backups", `${safeKey}-${Date.now()}.json`);
}

function isCreativeStorageKey(key) {
  return /(?:editable-houses|manual-(?:floors|trees|fences|structures|collisions|window-lights))/i.test(key);
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

  return isLocalRequest(req) || allowRemoteCreativeWrites || hasAdminStorageToken(req) || hasDeveloperSession(req);
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
  const walletAddress = sanitizeText(data.walletAddress, 90);
  return {
    version: 1,
    profileId,
    loginMode: data.loginMode === "wallet" ? "wallet" : "guest",
    walletAddress,
    walletProvider: sanitizeText(data.walletProvider, 32),
    isDeveloper: Boolean(data.isDeveloper) || isDeveloperWallet(walletAddress),
    selectedCharacter: sanitizeText(data.selectedCharacter, 32) || "mage-1",
    coins: Math.max(0, Math.floor(Number(data.coins ?? 0) || 0)),
    ownedCharacters: [...new Set(["mage-1", "adventurer", "skeleton-archer", ...(Array.isArray(data.ownedCharacters) ? data.ownedCharacters.map((item) => sanitizeText(item, 32)).filter(Boolean) : [])])],
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

    if (url.pathname === "/api/web3/config") {
      sendJson(res, 200, {
        ok: true,
        chainId: web3ChainId,
        housesContract: housesContractAddress || null,
        indexerEnabled: Boolean(web3RpcUrl && housesContractAddress)
      });
      return;
    }

    if (url.pathname === "/api/web3/indexer/status") {
      const lastBlock = await readIndexerState("houses:lastBlock", "0");
      sendJson(res, 200, {
        ok: true,
        chainId: web3ChainId,
        housesContract: housesContractAddress || null,
        lastIndexedBlock: Number(lastBlock) || 0,
        indexerEnabled: Boolean(web3RpcUrl && housesContractAddress)
      });
      return;
    }

    if (url.pathname.startsWith("/api/web3/houses/")) {
      const wallet = decodeURIComponent(url.pathname.slice("/api/web3/houses/".length));
      const normalizedWallet = normalizeWalletAddress(wallet);
      if (!normalizedWallet) {
        sendJson(res, 400, { ok: false, error: "Invalid wallet address" });
        return;
      }
      const houses = await readIndexedHousesForWallet(normalizedWallet);
      sendJson(res, 200, { ok: true, walletAddress: normalizedWallet, houses });
      return;
    }

    if (url.pathname.startsWith("/api/work/")) {
      const action = url.pathname.slice("/api/work/".length);
      if (!["start", "status", "task", "finish"].includes(action)) {
        sendJson(res, 404, { ok: false, error: "Unknown work action" });
        return;
      }

      let payload = {};
      if (req.method === "POST") {
        payload = JSON.parse(await readBody(req) || "{}");
      } else if (req.method === "GET") {
        payload = Object.fromEntries(url.searchParams.entries());
      } else {
        sendJson(res, 405, { ok: false, error: "Method not allowed" });
        return;
      }

      const profileId = sanitizeText(payload.profileId, 140);
      if (!profileId) {
        sendJson(res, 400, { ok: false, error: "Missing profile id" });
        return;
      }
      const auth = requireProfileSession(req, profileId);
      if (!auth.ok) {
        sendJson(res, 401, { ok: false, error: "Wallet session required" });
        return;
      }
      if (isWalletProfile(profileId) && !hasActiveWalletPresence(profileId, payload.presenceId)) {
        sendJson(res, 409, {
          ok: false,
          error: "Wallet has no active server presence. Rejoin the game to prevent duplicate farming."
        });
        return;
      }

      if (action === "start") {
        const jobId = sanitizeText(payload.jobId, 40) || "alchemy";
        const definition = workDefinitions[jobId];
        if (!definition) {
          sendJson(res, 400, { ok: false, error: "Unknown job" });
          return;
        }
        const existing = [...workSessions.values()].find((session) => session.profileId === profileId && !session.finished);
        const session = existing ?? {
          sessionId: crypto.randomUUID(),
          profileId,
          jobId: definition.id,
          startedAtMs: Date.now(),
          bonusGameMinutes: 0,
          task: createWorkTask(definition),
          finished: false
        };
        workSessions.set(session.sessionId, session);
        sendJson(res, 200, { ok: true, work: publicWorkState(session) });
        return;
      }

      const sessionId = sanitizeText(payload.sessionId, 80);
      const session = workSessions.get(sessionId) ?? [...workSessions.values()].find((item) => item.profileId === profileId && !item.finished);
      if (!session || session.profileId !== profileId || session.finished) {
        sendJson(res, 404, { ok: false, error: "No active work session" });
        return;
      }

      if (action === "status") {
        sendJson(res, 200, { ok: true, work: publicWorkState(session) });
        return;
      }

      if (action === "task") {
        const answer = Array.isArray(payload.answer) ? payload.answer.map((item) => sanitizeText(item, 40)) : [];
        const expected = session.task?.sequence ?? [];
        const success = answer.length === expected.length && answer.every((item, index) => item === expected[index]);
        let bonusGameMinutes = 0;
        if (success) {
          const definition = workDefinitions[session.jobId] ?? workDefinitions.alchemy;
          bonusGameMinutes = definition.taskBonusGameMinutes;
          session.bonusGameMinutes += bonusGameMinutes;
          session.task = createWorkTask(definition);
        }
        sendJson(res, 200, {
          ok: true,
          success,
          bonusGameMinutes,
          expected: success ? undefined : expected,
          work: publicWorkState(session)
        });
        return;
      }

      if (action === "finish") {
        const state = normalizeWorkSession(session);
        session.finished = true;
        workSessions.delete(session.sessionId);
        const profile = await awardWorkCoins(profileId, state.earnedCoins);
        sendJson(res, 200, {
          ok: true,
          cancelled: Boolean(payload.cancelled) && !state.completed,
          completed: state.completed,
          earnedCoins: state.earnedCoins,
          profile,
          work: {
            ...publicWorkState({
              ...session,
              bonusGameMinutes: Math.min(session.bonusGameMinutes, state.elapsedGameMinutes)
            }),
            completed: state.completed
          }
        });
        return;
      }
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
        "Sign to enter securely.",
        `Wallet: ${address}`,
        `Network: ${chain}`,
        `Nonce: ${nonce}`,
        `Issued at: ${issuedAt}`
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
      const developer = isDeveloperWallet(address);
      const token = createSessionToken({ profileId, address: address.toLowerCase(), chain, provider, isDeveloper: developer });
      let profile = null;
      try {
        profile = (await readProfile(profileId)).profile;
      } catch {
        profile = normalizeProfile(profileId, {
          loginMode: "wallet",
          walletAddress: address,
          walletProvider: provider,
          isDeveloper: developer,
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
      profile = normalizeProfile(profileId, { ...profile, walletAddress: address, walletProvider: provider, isDeveloper: developer });
      sendJson(res, 200, { ok: true, token, profileId, profile, isDeveloper: developer });
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
        broadcast({
          type: "storageUpdated",
          key,
          data: payload,
          mtimeMs: result.mtimeMs,
          source: result.source
        });
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
    presenceId: id,
    socket,
    name: `Player ${id}`,
    scene: "WorldScene",
    x: 0,
    y: 0,
    facing: "down",
    characterId: "mage-1",
    moving: false,
    ready: false,
    superseded: false,
    closed: false
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

  const removeClient = () => {
    if (client.closed) {
      return;
    }
    client.closed = true;
    const presenceId = client.presenceId || id;
    const lastSceneChannel = client.sceneChannel ?? null;
    clients.delete(id);
    if (!client.superseded && !hasActivePresence(presenceId)) {
      broadcast({ type: "playerLeft", id, presenceId }, null, null, lastSceneChannel);
    }
  };

  socket.on("close", removeClient);
  socket.on("error", removeClient);
});

async function readHouseMetadata(contract, tokenId, fallback = {}) {
  try {
    const houseTypeId = await contract.tokenHouseTypeId(tokenId);
    const houseType = await contract.houseTypes(houseTypeId);
    return {
      houseTypeId: houseTypeId.toString(),
      houseKey: String(houseType.key ?? houseType[0] ?? fallback.houseKey ?? ""),
      houseName: String(houseType.name ?? houseType[1] ?? fallback.houseName ?? ""),
      priceWei: (houseType.price ?? houseType[2] ?? fallback.priceWei ?? 0).toString()
    };
  } catch {
    return fallback;
  }
}

async function applyHousePurchasedEvent(log, parsed) {
  const args = parsed.args;
  const tokenId = args.tokenId?.toString?.() ?? args[1]?.toString?.() ?? "";
  const walletAddress = normalizeWalletAddress(args.buyer ?? args[0]);
  const houseTypeId = args.houseTypeId?.toString?.() ?? args[2]?.toString?.() ?? "";
  const houseKey = String(args.key ?? args[3] ?? "");
  const houseName = String(args.name ?? args[4] ?? "");
  const priceWei = (args.price ?? args[5] ?? 0).toString();
  return upsertIndexedHouseOwnership({
    tokenId,
    walletAddress,
    houseTypeId,
    houseKey,
    houseName,
    priceWei,
    transactionHash: log.transactionHash,
    blockNumber: log.blockNumber
  });
}

async function applyHouseTransferEvent(contract, log, parsed) {
  const args = parsed.args;
  const tokenId = args.tokenId?.toString?.() ?? args[2]?.toString?.() ?? "";
  const walletAddress = normalizeWalletAddress(args.to ?? args[1]);
  if (!tokenId || !walletAddress) {
    return false;
  }
  const metadata = await readHouseMetadata(contract, tokenId, {});
  if (!metadata.houseKey) {
    return false;
  }
  return upsertIndexedHouseOwnership({
    tokenId,
    walletAddress,
    ...metadata,
    transactionHash: log.transactionHash,
    blockNumber: log.blockNumber
  });
}

async function runHouseIndexerTick(contract, provider) {
  if (!(await ensureDatabase())) {
    return;
  }
  const latestBlock = await provider.getBlockNumber();
  const savedBlock = Math.max(0, Number(await readIndexerState("houses:lastBlock", "0")) || 0);
  let fromBlock = savedBlock > 0 ? savedBlock + 1 : houseIndexerStartBlock;
  if (fromBlock <= 0) {
    await writeIndexerState("houses:lastBlock", latestBlock);
    console.log(`[web3] House indexer armed at block ${latestBlock}. Set ELDERVALLEY_HOUSE_INDEXER_START_BLOCK to backfill older buys.`);
    return;
  }
  if (fromBlock > latestBlock) {
    return;
  }

  while (fromBlock <= latestBlock) {
    const toBlock = Math.min(latestBlock, fromBlock + houseIndexerBatchSize - 1);
    const logs = await provider.getLogs({
      address: housesContractAddress,
      fromBlock,
      toBlock
    });
    logs.sort((left, right) => (left.blockNumber - right.blockNumber) || (left.index - right.index));
    for (const log of logs) {
      let parsed = null;
      try {
        parsed = contract.interface.parseLog(log);
      } catch {
        continue;
      }
      if (parsed?.name === "HousePurchased") {
        await applyHousePurchasedEvent(log, parsed);
      } else if (parsed?.name === "Transfer") {
        await applyHouseTransferEvent(contract, log, parsed);
      }
    }
    await writeIndexerState("houses:lastBlock", toBlock);
    fromBlock = toBlock + 1;
  }
}

function startHouseIndexer() {
  if (!web3RpcUrl || !housesContractAddress) {
    console.log("[web3] House indexer disabled: set ELDERVALLEY_BASE_RPC_URL and ELDERVALLEY_HOUSES_CONTRACT.");
    return;
  }
  if (!/^0x[a-fA-F0-9]{40}$/.test(housesContractAddress)) {
    console.error("[web3] House indexer disabled: invalid ELDERVALLEY_HOUSES_CONTRACT.");
    return;
  }
  const provider = new JsonRpcProvider(web3RpcUrl, web3ChainId);
  const contract = new Contract(housesContractAddress, housesContractAbi, provider);
  let running = false;
  const tick = async () => {
    if (running) {
      return;
    }
    running = true;
    try {
      await runHouseIndexerTick(contract, provider);
    } catch (error) {
      console.error("[web3] House indexer tick failed:", error.message);
    } finally {
      running = false;
    }
  };
  tick();
  setInterval(tick, 15000).unref();
  console.log(`[web3] House indexer watching ${housesContractAddress} on chain ${web3ChainId}.`);
}

// ══════════════════════════════════════════════════════════════════════════════
// BOSS ARENA — lógica server-side (Golem de Lava)
// ══════════════════════════════════════════════════════════════════════════════

const BOSS_SCENE = "ForestScene";
const BOSS_W = 1920;
const BOSS_H = 1920;
const BOSS_MAX_HP = 10000;
const BOSS_ORIGIN = { x: 960, y: 960 };

const BOSS_PHASE_DATA = [
  { speed: 75,  cooldown: 1800, attackRange: 95,  aggroRange: 420, chaseStamina: 5000, tiredDuration: 1200, meteorCount: 3, meteorInterval: 7000,  eruptionCount: 4,  eruptionInterval: 9000  },
  { speed: 100, cooldown: 1300, attackRange: 115, aggroRange: 480, chaseStamina: 4000, tiredDuration: 1000, meteorCount: 5, meteorInterval: 5000,  eruptionCount: 6,  eruptionInterval: 6500  },
  { speed: 135, cooldown: 900,  attackRange: 125, aggroRange: 540, chaseStamina: 3000, tiredDuration: 800,  meteorCount: 9, meteorInterval: 3500,  eruptionCount: 10, eruptionInterval: 4000  },
];

function createBossState() {
  return {
    hp: BOSS_MAX_HP,
    phase: 1,
    x: BOSS_ORIGIN.x,
    y: BOSS_ORIGIN.y,
    vx: 0, vy: 0,
    state: "idle",
    flipX: false,
    anim: "golem-walk",
    cooldown: 0,
    tiredTimer: 0,
    chaseTime: 0,
    meteorCooldown: 8000,
    eruptionCooldown: 10000,
    projectileCooldown: 3000,
    dead: false,
    spawned: true, // nasce imediatamente
  };
}

let bossState = createBossState();

function isInArena(client) {
  // sceneChannel pode ser "ForestScene" ou "ForestScene:fromVillage" etc.
  return client.ready && !client.superseded && client.sceneChannel.startsWith(BOSS_SCENE);
}

function getArenaPlayers() {
  return [...clients.values()].filter(isInArena);
}

function sendToArena(payload) {
  for (const client of clients.values()) {
    if (isInArena(client)) sendWs(client.socket, payload);
  }
}

function bossPhaseData() {
  return BOSS_PHASE_DATA[Math.min(bossState.phase - 1, 2)];
}

function nearestArenaPlayer() {
  const players = getArenaPlayers();
  if (!players.length) return null;
  let best = null, bestDist = Infinity;
  for (const p of players) {
    const d = Math.hypot(p.x - bossState.x, p.y - bossState.y);
    if (d < bestDist) { bestDist = d; best = p; }
  }
  return best ? { ...best, dist: bestDist } : null;
}

function bossSpawnMeteors(targetX, targetY) {
  const count = bossPhaseData().meteorCount;
  const targets = Array.from({ length: count }, (_, i) => {
    const angle = Math.random() * Math.PI * 2;
    const r = 60 + Math.random() * 220;
    return {
      tx: Math.round(Math.max(120, Math.min(BOSS_W - 120, targetX + Math.cos(angle) * r))),
      ty: Math.round(Math.max(120, Math.min(BOSS_H - 120, targetY + Math.sin(angle) * r))),
      delay: i * 420
    };
  });
  sendToArena({ type: "bossAttack", event: "meteor", targets });
}

function bossSpawnEruptions(targetX, targetY) {
  const count = bossPhaseData().eruptionCount;
  const targets = Array.from({ length: count }, (_, i) => {
    const angle = Math.random() * Math.PI * 2;
    const r = 30 + Math.random() * 290;
    return {
      tx: Math.round(Math.max(100, Math.min(BOSS_W - 100, targetX + Math.cos(angle) * r))),
      ty: Math.round(Math.max(100, Math.min(BOSS_H - 100, targetY + Math.sin(angle) * r))),
      delay: i * 280
    };
  });
  sendToArena({ type: "bossAttack", event: "eruption", targets });
}

function bossSpawnProjectile(targetX, targetY) {
  const bx = bossState.x;
  const by = bossState.y - 40;
  const dx = targetX - bx;
  const dy = targetY - by;
  const d = Math.hypot(dx, dy) || 1;
  const ndx = dx / d, ndy = dy / d;
  const SPREAD = 0.32; // ~18 graus
  const angles = [-SPREAD, 0, SPREAD];
  for (const a of angles) {
    const rx = ndx * Math.cos(a) - ndy * Math.sin(a);
    const ry = ndx * Math.sin(a) + ndy * Math.cos(a);
    sendToArena({ type: "bossAttack", event: "projectile", bx: Math.round(bx), by: Math.round(by), dx: rx, dy: ry });
  }
}

const BOSS_RESPAWN_MS = 60_000;

function applyBossDamage(amount) {
  if (bossState.dead) return;
  bossState.hp = Math.max(0, bossState.hp - Math.max(0, Math.floor(amount)));
  if (bossState.hp <= 0) {
    bossState.dead = true;
    bossState.respawnAt = Date.now() + BOSS_RESPAWN_MS;
    sendToArena({ type: "bossSync", hp: 0, maxHp: BOSS_MAX_HP, phase: bossState.phase, x: Math.round(bossState.x), y: Math.round(bossState.y), flipX: bossState.flipX, anim: "golem-walk", dead: true });
    sendToArena({ type: "bossAttack", event: "died" });
    console.log("[boss] Golem derrotado! Renascendo em 60s.");
  }
}

let lastBossTick = Date.now();

function tickBoss() {
  const now = Date.now();
  const delta = Math.min(now - lastBossTick, 200);
  lastBossTick = now;

  const players = getArenaPlayers();

  // Respawn automático após 1 min (independente de players na arena)
  if (bossState.dead) {
    if (bossState.respawnAt && now >= bossState.respawnAt) {
      bossState = createBossState();
      console.log("[boss] Golem renasceu!");
      sendToArena({ type: "bossSpawned" });
    }
    return;
  }

  // AI só roda se tem players
  if (players.length === 0) return;

  const b = bossState;
  const pd = bossPhaseData();
  const target = nearestArenaPlayer();
  if (!target) return;

  const dx = target.x - b.x;
  const dy = target.y - b.y;
  const dist = Math.hypot(dx, dy);
  b.flipX = dx < 0;

  // ── Transição de fase ──────────────────────────────────────────────────────
  const pct = b.hp / BOSS_MAX_HP;
  const newPhase = pct <= 0.25 ? 3 : pct <= 0.5 ? 2 : 1;
  if (newPhase > b.phase) {
    b.phase = newPhase;
    b.meteorCooldown = 2000;
    b.eruptionCooldown = 3000;
    sendToArena({ type: "bossPhase", phase: newPhase });
    console.log(`[boss] Fase ${newPhase}!`);
  }

  // ── Cooldowns de ataque ────────────────────────────────────────────────────
  if (dist <= pd.aggroRange) {
    b.meteorCooldown -= delta;
    b.eruptionCooldown -= delta;
    if (b.phase >= 3) b.projectileCooldown -= delta;

    if (b.meteorCooldown <= 0 && b.state !== "meteor" && b.state !== "attack") {
      b.state = "meteor";
      b.vx = 0; b.vy = 0;
      b.anim = "golem-walk";
      bossSpawnMeteors(target.x, target.y);
      b.meteorCooldown = pd.meteorInterval;
      const totalDuration = pd.meteorCount * 420 + 1400;
      setTimeout(() => {
        if (b.state === "meteor") { b.state = "cooldown"; b.cooldown = 800; }
      }, totalDuration);
    }
    if (b.eruptionCooldown <= 0 && b.state !== "meteor") {
      b.eruptionCooldown = pd.eruptionInterval;
      bossSpawnEruptions(target.x, target.y);
    }
    if (b.phase >= 2 && b.projectileCooldown <= 0 && dist > pd.attackRange) {
      b.projectileCooldown = 2200;
      bossSpawnProjectile(target.x, target.y);
    }
  }

  // ── Máquina de estados ─────────────────────────────────────────────────────
  if (b.state === "tired") {
    b.tiredTimer -= delta;
    b.vx = 0; b.vy = 0;
    if (b.tiredTimer <= 0) { b.state = "idle"; b.chaseTime = 0; b.anim = "golem-walk"; }
    return;
  }
  if (b.state === "meteor") {
    b.vx = 0; b.vy = 0;
    return;
  }
  if (b.state === "cooldown") {
    b.cooldown -= delta;
    b.vx = 0; b.vy = 0;
    if (b.cooldown <= 0) { b.state = "idle"; b.anim = "golem-walk"; }
    return;
  }
  if (b.state === "attack") {
    b.cooldown -= delta;
    b.vx = 0; b.vy = 0;
    if (b.cooldown <= 0) { b.state = "cooldown"; b.cooldown = pd.cooldown; b.anim = "golem-walk"; }
    return;
  }

  if (dist <= pd.aggroRange) {
    if (dist <= pd.attackRange) {
      if (b.state !== "attack") {
        b.state = "attack";
        b.anim = "golem-attack";
        b.cooldown = 1000;
        b.vx = 0; b.vy = 0;
        // Dano em todos os players próximos
        for (const p of players) {
          if (Math.hypot(p.x - b.x, p.y - b.y) <= pd.attackRange) {
            sendWs(p.socket, { type: "bossMeleeHit", damage: 22 });
          }
        }
        sendToArena({ type: "bossAttack", event: "melee" });
      }
    } else {
      b.chaseTime += delta;
      if (b.chaseTime >= pd.chaseStamina) {
        b.state = "tired";
        b.tiredTimer = pd.tiredDuration;
        b.chaseTime = 0;
        b.anim = "golem-walk";
        b.vx = 0; b.vy = 0;
        return;
      }
      b.state = "chase";
      b.anim = "golem-walk";
      b.vx = (dx / dist) * pd.speed;
      b.vy = (dy / dist) * pd.speed;
    }
  } else {
    b.chaseTime = 0;
    const ox = BOSS_ORIGIN.x - b.x;
    const oy = BOSS_ORIGIN.y - b.y;
    const od = Math.hypot(ox, oy);
    if (od > 8) {
      b.vx = (ox / od) * pd.speed * 0.4;
      b.vy = (oy / od) * pd.speed * 0.4;
    } else {
      b.vx = 0; b.vy = 0;
    }
    b.state = "idle";
    b.anim = "golem-walk";
  }

  b.x = Math.max(50, Math.min(BOSS_W - 50, b.x + b.vx * (delta / 1000)));
  b.y = Math.max(50, Math.min(BOSS_H - 50, b.y + b.vy * (delta / 1000)));
}

// Broadcast de estado a cada 100ms
setInterval(() => {
  const b = bossState;
  if (getArenaPlayers().length === 0) return;

  // Sempre envia bossSync — cliente usa dead+countdown para tudo
  sendToArena({
    type: "bossSync",
    hp: b.hp,
    maxHp: BOSS_MAX_HP,
    phase: b.phase,
    x: Math.round(b.x),
    y: Math.round(b.y),
    flipX: b.flipX,
    anim: b.anim,
    dead: b.dead,
    spawned: b.spawned,
    countdownMs: (b.dead && b.respawnAt) ? Math.max(0, b.respawnAt - Date.now()) : null,
  });
}, 100).unref();

// Tick do boss a 20fps
setInterval(() => tickBoss(), 50).unref();

// ═══════════════════════════════════════════════════════════════════════════════
// SWAMP TROLLS — server-authoritative, mesmo padrão do boss
// ═══════════════════════════════════════════════════════════════════════════════
const SWAMP_SCENE        = "SwampScene";
const SWAMP_W            = 1920;
const SWAMP_H            = 1920;
const TROLL_MAX_HP       = 2500;
const TROLL_RESPAWN_MS   = 25000;
const TROLL_SPEED_IDLE   = 38;
const TROLL_SPEED_AGGRO  = 62;
const TROLL_ATK_INTERVAL = 3200;
const TROLL_FIRE_PAUSE   = 900;
const TROLL_PATROL       = { x1: 400, x2: 1520, y1: 400, y2: 1440 };

const TROLL_SPAWNS = [
  { x: 680, y: 680 }, { x: 1240, y: 680 },
  { x: 680, y: 1240 }, { x: 1240, y: 1240 }
];

function createTrollState(i) {
  const s = TROLL_SPAWNS[i];
  return {
    i, x: s.x, y: s.y,
    hp: TROLL_MAX_HP, maxHp: TROLL_MAX_HP,
    aggro: false, dead: false,
    isFiring: false, firingUntil: 0,
    speed: TROLL_SPEED_IDLE,
    waitUntil: 0, walkUntil: 0,
    wanderDx: 0, wanderDy: 0,
    nextAtkAt: Date.now() + 2000,
    respawnAt: 0, flipX: false,
  };
}

let swampTrolls = [0, 1, 2, 3].map(createTrollState);
let lastSwampSync = 0;

function isInSwamp(client) {
  return client.ready && !client.superseded && (client.sceneChannel ?? "").startsWith(SWAMP_SCENE);
}

function getSwampPlayers() {
  return [...clients.values()].filter(isInSwamp);
}

function sendToSwamp(payload) {
  for (const c of clients.values()) {
    if (isInSwamp(c)) sendWs(c.socket, payload);
  }
}

function nearestSwampPlayer(tx, ty) {
  let best = null, bestDist = Infinity;
  for (const p of getSwampPlayers()) {
    const d = Math.hypot((p.x ?? 960) - tx, (p.y ?? 960) - ty);
    if (d < bestDist) { bestDist = d; best = { ...p, dist: d }; }
  }
  return best;
}

function pickTrollWander(troll, now) {
  troll.waitUntil = now + 600 + Math.random() * 900;
  troll.walkUntil = troll.waitUntil + 1000 + Math.random() * 1200;
  const dirs = [[1,0],[-1,0],[0,1],[0,-1]];
  const [dx, dy] = dirs[Math.floor(Math.random() * 4)];
  troll.wanderDx = dx; troll.wanderDy = dy;
}

function serializeTroll(t) {
  return {
    i: t.i, x: Math.round(t.x), y: Math.round(t.y),
    hp: t.hp, maxHp: t.maxHp,
    dead: t.dead, aggro: t.aggro, flipX: t.flipX,
  };
}

function applyTrollDamage(idx, damage) {
  const troll = swampTrolls[idx];
  if (!troll || troll.dead) return;
  troll.hp = Math.max(0, troll.hp - damage);
  if (!troll.aggro) {
    troll.aggro = true;
    troll.speed = TROLL_SPEED_AGGRO;
    troll.nextAtkAt = Date.now() + 800;
  }
  if (troll.hp <= 0) {
    troll.dead = true;
    troll.respawnAt = Date.now() + TROLL_RESPAWN_MS;
    sendToSwamp({ type: "trollDied", i: idx });
  }
  sendToSwamp({ type: "trollSync", trolls: swampTrolls.map(serializeTroll) });
}

function tickSwamp() {
  const now = Date.now();
  const dt  = 50;
  const players = getSwampPlayers();

  for (const troll of swampTrolls) {
    if (troll.dead) {
      if (now >= troll.respawnAt) {
        const s = TROLL_SPAWNS[troll.i];
        const i = troll.i;
        Object.assign(troll, createTrollState(i));
        sendToSwamp({ type: "trollRespawn", i, x: s.x, y: s.y });
      }
      continue;
    }

    if (troll.isFiring) {
      if (now >= troll.firingUntil) troll.isFiring = false;
      continue;
    }

    const nearest = nearestSwampPlayer(troll.x, troll.y);

    if (troll.aggro && nearest) {
      const dx   = (nearest.x ?? 960) - troll.x;
      const dy   = (nearest.y ?? 960) - troll.y;
      const dist = Math.hypot(dx, dy) || 1;
      if (dist > 8) {
        troll.x += (dx / dist) * troll.speed * (dt / 1000);
        troll.y += (dy / dist) * troll.speed * (dt / 1000);
        troll.flipX = dx < 0;
      }
      troll.x = Math.max(60, Math.min(SWAMP_W - 60, troll.x));
      troll.y = Math.max(80, Math.min(SWAMP_H - 80, troll.y));

      if (now >= troll.nextAtkAt) {
        const attacks = ["bubble", "spike", "sludge"];
        const atk = attacks[Math.floor(Math.random() * attacks.length)];
        sendToSwamp({
          type: "trollAttack", i: troll.i, atk,
          fromX: Math.round(troll.x), fromY: Math.round(troll.y),
          toX: Math.round(nearest.x ?? 960), toY: Math.round(nearest.y ?? 960)
        });
        troll.isFiring   = true;
        troll.firingUntil = now + TROLL_FIRE_PAUSE;
        troll.nextAtkAt  = now + TROLL_ATK_INTERVAL + (Math.random() * 1000 - 500);
      }
    } else {
      const outOfPatrol = troll.x < TROLL_PATROL.x1 || troll.x > TROLL_PATROL.x2
                       || troll.y < TROLL_PATROL.y1 || troll.y > TROLL_PATROL.y2;
      if (now < troll.waitUntil) {
        // parado
      } else if (now >= troll.walkUntil || outOfPatrol) {
        pickTrollWander(troll, now);
      } else {
        troll.x += troll.wanderDx * troll.speed * (dt / 1000);
        troll.y += troll.wanderDy * troll.speed * (dt / 1000);
        troll.flipX = troll.wanderDx < 0;
      }
    }
  }

  if (now - lastSwampSync >= 100 && players.length > 0) {
    lastSwampSync = now;
    sendToSwamp({ type: "trollSync", trolls: swampTrolls.map(serializeTroll) });
  }
}

setInterval(() => tickSwamp(), 50).unref();

server.listen(port, host, () => {
  console.log(`ElderValley server listening on ${host}:${port}`);
  startHouseIndexer();
});

setInterval(() => {
  broadcast({ type: "timeSync", clockMinutes: getServerClockMinutes() });
}, 5000).unref();

setInterval(() => {
  const clockMinutes = getServerClockMinutes();
  for (const client of clients.values()) {
    if (!client.ready || client.superseded) {
      continue;
    }
    sendWs(client.socket, {
      type: "snapshot",
      clockMinutes,
      peers: publicPeers(client, client.sceneChannel)
    });
  }
}, 2000).unref();

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

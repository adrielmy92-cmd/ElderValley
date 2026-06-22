import { createServer } from "node:http";
import crypto from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Contract, JsonRpcProvider, verifyMessage } from "ethers";
import pg from "pg";
import { ALCHEMIST_ITEMS } from "./data/alchemist-items.js";

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT ?? 5188);
const host = process.env.HOST ?? "0.0.0.0";
const storageRoot = path.join(root, ".eldervalley-storage");

let houseTypesCache = null;
async function loadHouseTypes() {
  if (houseTypesCache) return houseTypesCache;
  try {
    const raw = await readFile(path.join(root, "data/house-types.json"), "utf8");
    houseTypesCache = JSON.parse(raw);
  } catch {
    houseTypesCache = [];
  }
  return houseTypesCache;
}

const metadataContractAbi = [
  "function tokenHouseTypeId(uint256 tokenId) view returns (uint256)",
  "function totalSupply() view returns (uint256)"
];
let metadataProvider = null;
let metadataContract = null;
function getMetadataContract() {
  if (!housesContractAddress || !/^0x[a-fA-F0-9]{40}$/.test(housesContractAddress)) return null;
  if (!metadataContract) {
    metadataProvider = metadataProvider ?? new JsonRpcProvider(web3RpcUrl || "https://mainnet.base.org", 8453);
    metadataContract = new Contract(housesContractAddress, metadataContractAbi, metadataProvider);
  }
  return metadataContract;
}
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
    // profileId used for server-authoritative XP awards: validated wallet id, or
    // the guest id the client reports (guests can only level their own profile).
    client.profileId = walletAuth.profileId || sanitizeText(payload.profileId, 140);
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

  if (payload.type === "hitBeeQueen") {
    if (!client.ready || client.superseded) return;
    if (beeState.dead) return;
    const damage = Math.min(500, Math.max(0, Number(payload.damage) || 0));
    if (damage > 0) applyBeeDamage(damage);
    return;
  }

  if (payload.type === "hitBeeSoldier") {
    if (!client.ready || client.superseded) return;
    const idx = Number(payload.index ?? -1);
    const damage = Math.min(500, Math.max(0, Number(payload.damage) || 0));
    if (damage > 0) applyBeeSoldierDamage(idx, damage);
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

// ── Economy authority (server-owned bag + coins) ─────────────────────────────
// The bag is the single source of truth for wallet profiles. Stored inside the
// profile's `data` jsonb (and the JSON fallback), so no schema migration is needed.
const ITEMS_BY_KEY = Object.fromEntries(ALCHEMIST_ITEMS.map((i) => [i.key, i]));
const ENCHANT_MAX = 10;
const ENCHANT_SHATTER_FROM = 4; // failing at +4 or higher can shatter (normal scroll)

function enchantChanceFor(level) {
  const table = [1, 1, 1, 0.65, 0.55, 0.45, 0.35, 0.30, 0.25, 0.20];
  return table[level] ?? 0.15;
}

function isConsumableItem(item) {
  return !!item && (typeof item.heal === "number" || typeof item.mana === "number");
}

// Validate/clamp an incoming bag against the catalog. Shape:
// { stacks: {key:count}, equipped: {ring1,ring2,amulet}, enchants: {key:level} }
function normalizeBag(raw) {
  const out = { stacks: {}, equipped: { ring1: null, ring2: null, amulet: null }, enchants: {} };
  if (!raw || typeof raw !== "object") return out;
  const stacks = raw.stacks && typeof raw.stacks === "object" ? raw.stacks : {};
  for (const [key, count] of Object.entries(stacks)) {
    if (!ITEMS_BY_KEY[key]) continue;
    const n = Math.floor(Number(count) || 0);
    if (n > 0) out.stacks[key] = Math.min(n, 9999);
  }
  const eq = raw.equipped && typeof raw.equipped === "object" ? raw.equipped : {};
  for (const slot of ["ring1", "ring2", "amulet"]) {
    const key = eq[slot];
    const item = key && ITEMS_BY_KEY[key];
    if (!item || isConsumableItem(item)) continue;
    const wantAmulet = item.slot === "amulet";
    if ((slot === "amulet") === wantAmulet) out.equipped[slot] = key;
  }
  const en = raw.enchants && typeof raw.enchants === "object" ? raw.enchants : {};
  for (const [key, lvl] of Object.entries(en)) {
    if (!ITEMS_BY_KEY[key]) continue;
    const l = Math.max(0, Math.min(ENCHANT_MAX, Math.floor(Number(lvl) || 0)));
    if (l > 0) out.enchants[key] = l;
  }
  return out;
}

function bagCount(bag, key) { return bag.stacks[key] ?? 0; }
function bagIsEquipped(bag, key) { return Object.values(bag.equipped).includes(key); }
function bagAdd(bag, key, n = 1) { bag.stacks[key] = (bag.stacks[key] ?? 0) + n; }
function bagRemove(bag, key, n = 1) {
  const left = (bag.stacks[key] ?? 0) - n;
  if (left <= 0) delete bag.stacks[key]; else bag.stacks[key] = left;
}
// Fully remove gear from bag, any equip slot, and the enchant map (shatter).
function bagDestroy(bag, key) {
  delete bag.stacks[key];
  for (const slot of Object.keys(bag.equipped)) {
    if (bag.equipped[slot] === key) bag.equipped[slot] = null;
  }
  delete bag.enchants[key];
}

// Serialize coins+item mutations per profile so a double-click / concurrent
// request can't double-spend. Single-process Node makes this sufficient.
const profileLocks = new Map();
function withProfileLock(profileId, fn) {
  const prev = profileLocks.get(profileId) ?? Promise.resolve();
  const run = prev.then(fn, fn);
  const tail = run.catch(() => {});
  profileLocks.set(profileId, tail);
  tail.then(() => { if (profileLocks.get(profileId) === tail) profileLocks.delete(profileId); });
  return run;
}

// readProfile → mutate → writeProfile, robust to a missing profile (mirrors awardWorkCoins).
async function loadProfileForMutation(profileId) {
  let profile = null;
  try { profile = (await readProfile(profileId)).profile; } catch { profile = null; }
  return normalizeProfile(profileId, profile ?? {});
}

// Run one authoritative economy action. Returns { status, body }. Must be called
// inside withProfileLock. All paths re-validate against the server-owned bag/coins.
async function runEconomyAction(action, profileId, payload) {
  const profile = await loadProfileForMutation(profileId);
  const bag = profile.bag;
  const fail = (error, status = 400) => ({ status, body: { ok: false, error } });
  const commit = async (extra = {}) => {
    profile.bag = bag;
    const saved = (await writeProfile(profileId, profile)).profile;
    return { status: 200, body: { ok: true, coins: saved.coins, bag: saved.bag, ...extra } };
  };

  if (action === "buy") {
    const item = ITEMS_BY_KEY[sanitizeText(payload.itemKey, 80)];
    if (!item) return fail("Unknown item");
    if (profile.coins < item.price) return fail("Not enough coins");
    profile.coins -= item.price;
    bagAdd(bag, item.key, 1);
    return commit();
  }

  if (action === "consume") {
    const item = ITEMS_BY_KEY[sanitizeText(payload.itemKey, 80)];
    // Consumed during play: potions (heal/mana) AND spiritshots (shot, burned per cast).
    const consumable = item && (typeof item.heal === "number" || typeof item.mana === "number" || typeof item.shot === "number");
    if (!consumable) return fail("Not a consumable");
    if (bagCount(bag, item.key) <= 0) return fail("None left");
    bagRemove(bag, item.key, 1);
    return commit();
  }

  if (action === "equip") {
    const key = sanitizeText(payload.itemKey, 80);
    const item = ITEMS_BY_KEY[key];
    if (!item || isConsumableItem(item)) return fail("Cannot equip");
    if (bagCount(bag, key) <= 0) return fail("Not owned");
    const slot = item.slot === "amulet"
      ? "amulet"
      : (!bag.equipped.ring1 ? "ring1" : (!bag.equipped.ring2 ? "ring2" : "ring1"));
    const prev = bag.equipped[slot];
    bagRemove(bag, key, 1);
    if (prev) bagAdd(bag, prev, 1);
    bag.equipped[slot] = key;
    return commit();
  }

  if (action === "unequip") {
    const slot = sanitizeText(payload.slot, 16);
    if (!["ring1", "ring2", "amulet"].includes(slot)) return fail("Bad slot");
    const key = bag.equipped[slot];
    if (!key) return fail("Empty slot");
    bag.equipped[slot] = null;
    bagAdd(bag, key, 1);
    return commit();
  }

  if (action === "enchant") {
    const itemKey = sanitizeText(payload.itemKey, 80);
    const blessed = Boolean(payload.blessed);
    const scrollKey = blessed ? "blessed-enchant-scroll" : "enchant-scroll";
    const item = ITEMS_BY_KEY[itemKey];
    if (!item || isConsumableItem(item)) return fail("Cannot enchant");
    if (bagCount(bag, scrollKey) <= 0) return fail(`No ${blessed ? "Blessed " : ""}Enchant Scroll`);
    if (bagCount(bag, itemKey) <= 0 && !bagIsEquipped(bag, itemKey)) return fail("Gear not owned");
    const level = bag.enchants[itemKey] ?? 0;
    if (level >= ENCHANT_MAX) return fail("Already at max enchant");
    bagRemove(bag, scrollKey, 1);
    if (Math.random() < enchantChanceFor(level)) {
      bag.enchants[itemKey] = level + 1;
      return commit({ success: true, level: level + 1 });
    }
    if (!blessed && level >= ENCHANT_SHATTER_FROM) {
      const refund = Math.floor((item.price ?? 0) * 0.25);
      bagDestroy(bag, itemKey);
      profile.coins += refund;
      return commit({ success: false, shattered: true, refund });
    }
    delete bag.enchants[itemKey];
    return commit({ success: false, reset: true });
  }

  if (action === "migrate-bag") {
    if (profile.bagMigrated) return { status: 200, body: { ok: true, coins: profile.coins, bag, migrated: false } };
    // Only seed from the client's localStorage bag if the server bag is still empty,
    // so we never clobber items the server already owns. Always flip the flag.
    const serverEmpty = Object.keys(bag.stacks).length === 0
      && Object.values(bag.equipped).every((v) => !v);
    if (serverEmpty) profile.bag = normalizeBag(payload.bag);
    profile.bagMigrated = true;
    const saved = (await writeProfile(profileId, profile)).profile;
    return { status: 200, body: { ok: true, coins: saved.coins, bag: saved.bag, migrated: serverEmpty } };
  }

  return fail("Unknown economy action", 404);
}

// ── Leveling (XP + free attribute points) ────────────────────────────────────
// Server-authoritative: XP is granted on enemy death (to arena players) and on
// work shifts; points are spent via /api/xp/allocate. Stored in the profile data
// jsonb like `bag` (no schema migration). Per-point effects live on the client.
const XP_POINTS_PER_LEVEL = 5;
const XP_MAX_LEVEL = 99;
const XP_REWARDS = { golem: 500, beeQueen: 600, troll: 80, beeSoldier: 25 };
function xpForLevel(level) {
  // XP needed to go from `level` to `level+1`.
  return Math.floor(80 * Math.pow(Math.max(1, level), 1.35));
}
function normalizeLeveling(data) {
  const level = Math.max(1, Math.min(XP_MAX_LEVEL, Math.floor(Number(data?.level) || 1)));
  const xp = Math.max(0, Math.floor(Number(data?.xp) || 0));
  const unspent = Math.max(0, Math.floor(Number(data?.unspent) || 0));
  const a = data?.attr ?? {};
  const attr = {
    vit: Math.max(0, Math.floor(Number(a.vit) || 0)),
    str: Math.max(0, Math.floor(Number(a.str) || 0)),
    agi: Math.max(0, Math.floor(Number(a.agi) || 0))
  };
  return { level, xp, unspent, attr };
}
// Mutates the profile's leveling fields in place; returns the gained levels.
function addXp(profile, amount) {
  const gain = Math.max(0, Math.floor(Number(amount) || 0));
  if (gain <= 0) return 0;
  profile.xp = Math.max(0, Math.floor(Number(profile.xp) || 0)) + gain;
  let gained = 0;
  while (profile.level < XP_MAX_LEVEL && profile.xp >= xpForLevel(profile.level)) {
    profile.xp -= xpForLevel(profile.level);
    profile.level += 1;
    profile.unspent += XP_POINTS_PER_LEVEL;
    gained += 1;
  }
  if (profile.level >= XP_MAX_LEVEL) profile.xp = 0;
  return gained;
}
function publicLeveling(profile) {
  return {
    level: profile.level,
    xp: profile.xp,
    xpNext: profile.level >= XP_MAX_LEVEL ? 0 : xpForLevel(profile.level),
    unspent: profile.unspent,
    attr: profile.attr
  };
}
// readProfile → addXp → writeProfile (under the profile lock); returns the new
// public leveling state, or null if nothing was granted / profile unknown.
async function grantXpToProfileId(profileId, amount) {
  const gain = Math.max(0, Math.floor(Number(amount) || 0));
  if (!profileId || gain <= 0) return null;
  const result = await withProfileLock(profileId, async () => {
    const profile = await loadProfileForMutation(profileId);
    const levels = addXp(profile, gain);
    const saved = (await writeProfile(profileId, profile)).profile;
    return { ...publicLeveling(saved), gained: gain, leveledUp: levels };
  });
  // Push the new authoritative leveling state to that player's live socket(s).
  for (const c of clients.values()) {
    if (c.profileId && c.profileId === profileId) sendWs(c.socket, { type: "xp", ...result });
  }
  return result;
}
// Fire-and-forget XP award to every player currently in a boss arena.
function awardArenaXp(players, amount) {
  for (const c of players) {
    if (c.profileId) grantXpToProfileId(c.profileId, amount).catch(() => {});
  }
}

// ── Player marketplace (Phase 4) ─────────────────────────────────────────────
// Asynchronous listings: the item is escrowed out of the seller's bag the moment
// it's listed, so it can be bought any time even while the seller is offline. A 5%
// fee is a coin sink (removed from circulation). Listings persist via the shared
// game-storage store (Postgres jsonb or JSON file fallback).
const MARKET_KEY = "market:listings";
const MARKET_FEE = 0.05;
const MARKET_MAX_PRICE = 100000000;
const MARKET_MAX_ACTIVE_PER_SELLER = 30;

// All market mutations run one-at-a-time so a buy can't double-spend a listing.
let marketChain = Promise.resolve();
function withMarketLock(fn) {
  const run = marketChain.then(fn, fn);
  marketChain = run.catch(() => {});
  return run;
}

async function readListings() {
  try {
    const { data } = await readGameStorage(MARKET_KEY);
    return Array.isArray(data) ? data : [];
  } catch { return []; }
}
async function writeListings(list) {
  await writeGameStorage(MARKET_KEY, list);
}

function publicListing(l) {
  const item = ITEMS_BY_KEY[l.itemKey];
  return {
    id: l.id,
    sellerProfileId: l.sellerProfileId,
    sellerName: l.sellerName || "Seller",
    itemKey: l.itemKey,
    enchantLevel: l.enchantLevel ?? 0,
    price: l.price,
    createdAt: l.createdAt,
    status: l.status,
    name: item?.name ?? l.itemKey,
    rarity: item?.rarity ?? "common",
    slot: item?.slot ?? null,
    effect: item?.effect ?? ""
  };
}

// Run one marketplace action. Wrapped in withMarketLock by the caller. Profile
// mutations additionally take the per-profile lock so concurrent economy ops are safe.
async function runMarketAction(action, profileId, payload, sellerName) {
  const fail = (error, status = 400) => ({ status, body: { ok: false, error } });

  if (action === "list") {
    const itemKey = sanitizeText(payload.itemKey, 80);
    const item = ITEMS_BY_KEY[itemKey];
    if (!item) return fail("Unknown item");
    const price = Math.floor(Number(payload.price) || 0);
    if (price <= 0 || price > MARKET_MAX_PRICE) return fail("Invalid price");
    return withProfileLock(profileId, async () => {
      const profile = await loadProfileForMutation(profileId);
      const bag = profile.bag;
      if (bagCount(bag, itemKey) <= 0) return fail("That item isn't in your bag (unequip it first)");
      const list = await readListings();
      const activeMine = list.filter((l) => l.status === "active" && l.sellerProfileId === profileId).length;
      if (activeMine >= MARKET_MAX_ACTIVE_PER_SELLER) return fail("Too many active listings");
      // Escrow: pull one copy out of the bag, carrying its enchant level if it was
      // the last copy and isn't equipped (gear is effectively one instance per key).
      const enchantLevel = bag.enchants[itemKey] ?? 0;
      bagRemove(bag, itemKey, 1);
      let carried = 0;
      if (bagCount(bag, itemKey) <= 0 && !bagIsEquipped(bag, itemKey)) {
        carried = enchantLevel;
        delete bag.enchants[itemKey];
      }
      await writeProfile(profileId, profile);
      const listing = {
        id: crypto.randomUUID(),
        sellerProfileId: profileId,
        sellerName: sellerName || "Seller",
        itemKey,
        enchantLevel: carried,
        price,
        createdAt: Date.now(),
        status: "active"
      };
      list.push(listing);
      await writeListings(list);
      return { status: 200, body: { ok: true, coins: profile.coins, bag, listing: publicListing(listing) } };
    });
  }

  if (action === "buy") {
    const listingId = sanitizeText(payload.listingId, 80);
    const list = await readListings();
    const listing = list.find((l) => l.id === listingId && l.status === "active");
    if (!listing) return fail("Listing no longer available", 404);
    if (listing.sellerProfileId === profileId) return fail("You can't buy your own listing");
    return withProfileLock(profileId, async () => {
      const buyer = await loadProfileForMutation(profileId);
      if (buyer.coins < listing.price) return fail("Not enough coins");
      buyer.coins -= listing.price;
      bagAdd(buyer.bag, listing.itemKey, 1);
      if (listing.enchantLevel > 0) {
        buyer.bag.enchants[listing.itemKey] = Math.max(buyer.bag.enchants[listing.itemKey] ?? 0, listing.enchantLevel);
      }
      await writeProfile(profileId, buyer);
      // Pay the seller (price minus the 5% sink) under their own lock.
      const payout = Math.floor(listing.price * (1 - MARKET_FEE));
      await withProfileLock(listing.sellerProfileId, async () => {
        const seller = await loadProfileForMutation(listing.sellerProfileId);
        seller.coins += payout;
        await writeProfile(listing.sellerProfileId, seller);
      });
      listing.status = "sold";
      listing.soldAt = Date.now();
      listing.buyerProfileId = profileId;
      await writeListings(list);
      return { status: 200, body: { ok: true, coins: buyer.coins, bag: buyer.bag, item: publicListing(listing) } };
    });
  }

  if (action === "cancel") {
    const listingId = sanitizeText(payload.listingId, 80);
    const list = await readListings();
    const listing = list.find((l) => l.id === listingId && l.status === "active");
    if (!listing) return fail("Listing no longer available", 404);
    if (listing.sellerProfileId !== profileId) return fail("Not your listing", 403);
    return withProfileLock(profileId, async () => {
      const seller = await loadProfileForMutation(profileId);
      bagAdd(seller.bag, listing.itemKey, 1);
      if (listing.enchantLevel > 0) {
        seller.bag.enchants[listing.itemKey] = Math.max(seller.bag.enchants[listing.itemKey] ?? 0, listing.enchantLevel);
      }
      await writeProfile(profileId, seller);
      listing.status = "cancelled";
      listing.cancelledAt = Date.now();
      await writeListings(list);
      return { status: 200, body: { ok: true, coins: seller.coins, bag: seller.bag } };
    });
  }

  return fail("Unknown market action", 404);
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
    bag: normalizeBag(data.bag),
    bagMigrated: Boolean(data.bagMigrated),
    ...normalizeLeveling(data),
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

    // ── NFT Metadata ───────────────────────────────────────────────────────────
    if (url.pathname === "/metadata/collection") {
      const baseUrl = `${req.headers["x-forwarded-proto"] ?? "https"}://${req.headers.host}`;
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=3600" });
      res.end(JSON.stringify({
        name: "ElderValley Houses",
        description: "50 Genesis houses in the ElderValley world on Base. Holders earn daily yield from 50% of ElderValley token trading fees, distributed proportionally by tier weight (Common 1× · Uncommon 2× · Rare 4× · Legendary 8×).",
        image: `${baseUrl}/assets/nft/collection-logo.png`,
        banner_image: `${baseUrl}/assets/nft/collection-banner.png`,
        external_link: baseUrl,
        seller_fee_basis_points: 500,
        fee_recipient: process.env.TREASURY_ADDRESS ?? ""
      }));
      return;
    }

    if (url.pathname.startsWith("/metadata/")) {
      const tokenIdStr = url.pathname.slice("/metadata/".length);
      const tokenId = Number(tokenIdStr);
      if (!Number.isInteger(tokenId) || tokenId < 1) {
        sendJson(res, 400, { error: "Invalid token id" });
        return;
      }

      const houseTypes = await loadHouseTypes();
      const baseUrl = `${req.headers["x-forwarded-proto"] ?? "https"}://${req.headers.host}`;
      let houseTypeId = null;

      // Try to read from contract if deployed
      try {
        const contract = getMetadataContract();
        if (contract) {
          houseTypeId = Number(await contract.tokenHouseTypeId(tokenId));
        }
      } catch {
        houseTypeId = null;
      }

      // Fallback: try to find in DB
      if (!houseTypeId && dbPool) {
        try {
          const result = await dbPool.query(
            "SELECT data FROM web3_house_ownership WHERE token_id = $1 LIMIT 1",
            [String(tokenId)]
          );
          const row = result.rows[0];
          if (row) {
            const typeEntry = houseTypes.find(h => h.key === (row.data?.house_key ?? row.house_key));
            if (typeEntry) houseTypeId = typeEntry.houseTypeId;
          }
        } catch { houseTypeId = null; }
      }

      const houseType = houseTypeId ? houseTypes.find(h => h.houseTypeId === houseTypeId) : null;

      if (!houseType) {
        sendJson(res, 404, { error: "Token not found or contract not deployed" });
        return;
      }

      const imageUrl = `${baseUrl}/assets/nft/${houseType.spriteKey}.png`;
      const metadata = {
        name: `${houseType.name} #${tokenId}`,
        description: houseType.description,
        image: imageUrl,
        external_url: baseUrl,
        attributes: houseType.attributes
      };

      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "public, max-age=300" });
      res.end(JSON.stringify(metadata));
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
        const leveling = await grantXpToProfileId(profileId, Math.round(state.earnedCoins * 0.5));
        sendJson(res, 200, {
          ok: true,
          cancelled: Boolean(payload.cancelled) && !state.completed,
          completed: state.completed,
          earnedCoins: state.earnedCoins,
          earnedXp: leveling?.gained ?? 0,
          leveling,
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

    if (url.pathname.startsWith("/api/economy/")) {
      const action = url.pathname.slice("/api/economy/".length);
      if (req.method !== "POST") {
        sendJson(res, 405, { ok: false, error: "Method not allowed" });
        return;
      }
      let payload;
      try {
        payload = JSON.parse((await readBody(req)) || "{}");
      } catch {
        sendJson(res, 400, { ok: false, error: "Invalid JSON" });
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
      try {
        const result = await withProfileLock(profileId, () => runEconomyAction(action, profileId, payload));
        sendJson(res, result.status, result.body);
      } catch {
        sendJson(res, 500, { ok: false, error: "Economy action failed" });
      }
      return;
    }

    if (url.pathname === "/api/xp/allocate") {
      if (req.method !== "POST") { sendJson(res, 405, { ok: false, error: "Method not allowed" }); return; }
      let payload;
      try { payload = JSON.parse((await readBody(req)) || "{}"); } catch { sendJson(res, 400, { ok: false, error: "Invalid JSON" }); return; }
      const profileId = sanitizeText(payload.profileId, 140);
      if (!profileId) { sendJson(res, 400, { ok: false, error: "Missing profile id" }); return; }
      const auth = requireProfileSession(req, profileId);
      if (!auth.ok) { sendJson(res, 401, { ok: false, error: "Wallet session required" }); return; }
      const attr = sanitizeText(payload.attribute, 8);
      if (!["vit", "str", "agi"].includes(attr)) { sendJson(res, 400, { ok: false, error: "Bad attribute" }); return; }
      try {
        const result = await withProfileLock(profileId, async () => {
          const profile = await loadProfileForMutation(profileId);
          if (profile.unspent <= 0) return { ok: false, error: "No points to spend" };
          profile.unspent -= 1;
          profile.attr[attr] += 1;
          const saved = (await writeProfile(profileId, profile)).profile;
          return { ok: true, ...publicLeveling(saved) };
        });
        sendJson(res, result.ok ? 200 : 400, result);
      } catch {
        sendJson(res, 500, { ok: false, error: "Allocate failed" });
      }
      return;
    }

    if (url.pathname === "/api/market" || url.pathname.startsWith("/api/market/")) {
      const sub = url.pathname === "/api/market" ? "" : url.pathname.slice("/api/market/".length);

      if (req.method === "GET") {
        const active = (await readListings()).filter((l) => l.status === "active");
        if (sub === "mine") {
          const profileId = sanitizeText(url.searchParams.get("profileId"), 140);
          const auth = requireProfileSession(req, profileId);
          if (!auth.ok) { sendJson(res, 401, { ok: false, error: "Wallet session required" }); return; }
          sendJson(res, 200, { ok: true, listings: active.filter((l) => l.sellerProfileId === profileId).map(publicListing) });
          return;
        }
        // Open browse catalog (read-only); newest first.
        sendJson(res, 200, { ok: true, listings: active.sort((a, b) => b.createdAt - a.createdAt).map(publicListing) });
        return;
      }

      if (req.method === "POST") {
        let payload;
        try { payload = JSON.parse((await readBody(req)) || "{}"); } catch { sendJson(res, 400, { ok: false, error: "Invalid JSON" }); return; }
        const profileId = sanitizeText(payload.profileId, 140);
        if (!profileId) { sendJson(res, 400, { ok: false, error: "Missing profile id" }); return; }
        if (!isWalletProfile(profileId)) { sendJson(res, 403, { ok: false, error: "The marketplace is for wallet players" }); return; }
        const auth = requireProfileSession(req, profileId);
        if (!auth.ok) { sendJson(res, 401, { ok: false, error: "Wallet session required" }); return; }
        const sellerName = sanitizeText(payload.sellerName ?? "", 40);
        try {
          const result = await withMarketLock(() => runMarketAction(sub, profileId, payload, sellerName));
          sendJson(res, result.status, result.body);
        } catch {
          sendJson(res, 500, { ok: false, error: "Market action failed" });
        }
        return;
      }

      sendJson(res, 405, { ok: false, error: "Method not allowed" });
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
        // Server-owned fields the client's periodic full-profile autosave must never
        // overwrite (anti-cheat + stops the 2.8s autosave from clobbering authoritative
        // changes): leveling is server-owned for EVERYONE (awarded on death/work, spent
        // via /api/xp/allocate); coins + bag are server-owned for wallet profiles only.
        const result = await withProfileLock(profileId, async () => {
          const existing = await loadProfileForMutation(profileId);
          const merged = {
            ...(payload ?? {}),
            level: existing.level, xp: existing.xp, unspent: existing.unspent, attr: existing.attr
          };
          if (isWalletProfile(profileId)) {
            merged.coins = existing.coins;
            merged.bag = existing.bag;
            merged.bagMigrated = existing.bagMigrated;
          }
          return writeProfile(profileId, merged);
        });
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
    awardArenaXp(getArenaPlayers(), XP_REWARDS.golem);
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
    awardArenaXp(getSwampPlayers(), XP_REWARDS.troll);
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

// ══════════════════════════════════════════════════════════════════════════════
// BEE SCENE — server-authoritative (mesmo padrão do ForestScene)
// ══════════════════════════════════════════════════════════════════════════════
const BEE_SCENE        = "BeeScene";
const BEE_W            = 2752;
const BEE_H            = 1536;
const BEE_MAX_HP       = 12000;
const BEE_RESPAWN_MS   = 28_000;
const BEE_SOLDIER_HP   = 350;

const BEE_PHASE_CFG = [
  { speed: 110, atkInterval: 1800, atkRange: 480, specialInterval: 18000 },
  { speed: 145, atkInterval: 1300, atkRange: 540, specialInterval: 11000 },
  { speed: 185, atkInterval:  900, atkRange: 600, specialInterval:  7000 },
];

const BEE_PATROL_PTS = [
  { x: BEE_W * 0.28, y: BEE_H * 0.28 },
  { x: BEE_W * 0.50, y: BEE_H * 0.22 },
  { x: BEE_W * 0.72, y: BEE_H * 0.28 },
  { x: BEE_W * 0.72, y: BEE_H * 0.52 },
  { x: BEE_W * 0.50, y: BEE_H * 0.42 },
  { x: BEE_W * 0.28, y: BEE_H * 0.52 },
];

function createBeeState() {
  return {
    hp: BEE_MAX_HP, maxHp: BEE_MAX_HP,
    phase: 1,
    x: BEE_W * 0.5, y: BEE_H * 0.32,
    vx: 0, vy: 0,
    flipX: false,
    state: "patrol",        // patrol | chase | atk_cd | special_cd | dive | dash | burst | dead
    dead: false,
    patrolIdx: 0,
    orbitAngle: 0,
    atkCooldown: 2000,
    specialCooldown: 5000,
    stateUntil: 0,          // ms timestamp — quando o estado atual termina
    diveTarget: null,       // { x, y } para royal dive
    dashWaypoints: null,    // array de { x, y } para frantic dash
    dashWpIdx: 0,
    respawnAt: 0,
  };
}

let beeState = createBeeState();

// soldados: índice 0..5, máx 6 ao mesmo tempo
let beeSoldiers = [];
let beeNextSoldierIdx = 0;

function isInBee(client) {
  return client.ready && !client.superseded && (client.sceneChannel ?? "").startsWith(BEE_SCENE);
}
function getBeePlayers() { return [...clients.values()].filter(isInBee); }
function sendToBee(payload) { for (const c of clients.values()) { if (isInBee(c)) sendWs(c.socket, payload); } }

function nearestBeePlayer() {
  const players = getBeePlayers();
  if (!players.length) return null;
  let best = null, bestDist = Infinity;
  for (const p of players) {
    const d = Math.hypot((p.x ?? BEE_W/2) - beeState.x, (p.y ?? BEE_H/2) - beeState.y);
    if (d < bestDist) { bestDist = d; best = { ...p, dist: d }; }
  }
  return best;
}

function beeClamp(x, y, margin = 160) {
  return { x: Math.max(margin, Math.min(BEE_W - margin, x)), y: Math.max(margin, Math.min(BEE_H - margin, y)) };
}

function applyBeeDamage(amount) {
  const b = beeState;
  if (b.dead) return;
  b.hp = Math.max(0, b.hp - Math.max(0, Math.floor(amount)));
  if (b.hp <= 0) {
    b.dead = true;
    b.state = "dead";
    b.respawnAt = Date.now() + BEE_RESPAWN_MS;
    // Mata todos os soldados
    for (const s of beeSoldiers) { s.dead = true; }
    sendToBee({ type: "beeSync", ...serializeBee(), dead: true });
    sendToBee({ type: "beeAttack", event: "died" });
    sendToBee({ type: "beeSoldierSync", soldiers: beeSoldiers.map(serializeSoldier) });
    awardArenaXp(getBeePlayers(), XP_REWARDS.beeQueen);
    console.log("[bee] Rainha derrotada! Renascendo em 28s.");
    return;
  }
  // Verifica mudança de fase
  const pct = b.hp / BEE_MAX_HP;
  const newPhase = pct <= 0.33 ? 3 : pct <= 0.66 ? 2 : 1;
  if (newPhase > b.phase) {
    b.phase = newPhase;
    sendToBee({ type: "beeAttack", event: "phase", phase: newPhase });
    // Chama 1 soldado na transição de fase
    beeSpawnSoldiers(1);
  }
}

function applyBeeSoldierDamage(idx, amount) {
  const s = beeSoldiers.find(x => x.i === idx);
  if (!s || s.dead) return;
  s.hp = Math.max(0, s.hp - Math.max(0, Math.floor(amount)));
  if (s.hp <= 0) {
    s.dead = true;
    s.diedAt = Date.now();
    sendToBee({ type: "beeSoldierDied", i: idx });
    awardArenaXp(getBeePlayers(), XP_REWARDS.beeSoldier);
  }
  sendToBee({ type: "beeSoldierSync", soldiers: beeSoldiers.map(serializeSoldier) });
}

function beeSpawnSoldiers(count) {
  const existing = beeSoldiers.filter(s => !s.dead).length;
  const toSpawn = Math.min(count, 2 - existing); // máx 2 soldados simultâneos
  for (let i = 0; i < toSpawn; i++) {
    const side = Math.random() < 0.5;
    const fromX = side ? 80 : BEE_W - 80;
    const fromY = BEE_H * 0.2 + Math.random() * BEE_H * 0.6;
    const idx = beeNextSoldierIdx++;
    beeSoldiers.push({ i: idx, x: fromX, y: fromY, hp: BEE_SOLDIER_HP, maxHp: BEE_SOLDIER_HP, dead: false, flipX: false, lastAtk: 0, lastSting: 0 });
    sendToBee({ type: "beeSoldierSpawn", i: idx, fromX: Math.round(fromX), fromY: Math.round(fromY) });
  }
}

function serializeBee() {
  const b = beeState;
  return { x: Math.round(b.x), y: Math.round(b.y), hp: b.hp, maxHp: BEE_MAX_HP, phase: b.phase, state: b.state, flipX: b.flipX, dead: b.dead, respawnMs: b.dead ? Math.max(0, b.respawnAt - Date.now()) : null };
}

function serializeSoldier(s) {
  return { i: s.i, x: Math.round(s.x), y: Math.round(s.y), hp: s.hp, maxHp: s.maxHp, dead: s.dead, flipX: s.flipX };
}

let lastBeeTick = Date.now();
let lastBeeSoldierSting = 0;

function tickBee() {
  const now = Date.now();
  const delta = Math.min(now - lastBeeTick, 200);
  lastBeeTick = now;
  const b = beeState;

  // Respawn
  if (b.dead) {
    if (b.respawnAt && now >= b.respawnAt) {
      beeState = createBeeState();
      beeSoldiers = [];
      beeNextSoldierIdx = 0;
      sendToBee({ type: "beeAttack", event: "spawned" });
      console.log("[bee] Rainha renasceu!");
    }
    return;
  }

  const players = getBeePlayers();
  if (!players.length) {
    // Sem jogadores na cena — reseta após 5s para o próximo player entrar com boss fresco
    if (!beeState.dead) {
      if (!beeState._emptyAt) {
        beeState._emptyAt = now;
      } else if (now - beeState._emptyAt > 5000) {
        beeState = createBeeState();
        beeSoldiers = [];
        beeNextSoldierIdx = 0;
        console.log("[bee] Arena vazia — boss resetado.");
      }
    }
    return;
  }
  beeState._emptyAt = 0; // tem players, limpa o timer

  const target = nearestBeePlayer();
  if (!target) return;
  const dx = target.x - b.x, dy = target.y - b.y;
  const dist = Math.hypot(dx, dy) || 1;
  b.flipX = dx < 0;
  const cfg = BEE_PHASE_CFG[Math.min(b.phase - 1, 2)];

  // ── Estados com duração fixa ──────────────────────────────────────────────
  if (b.state === "atk_cd" || b.state === "burst") {
    b.vx = 0; b.vy = 0;
    if (now >= b.stateUntil) b.state = "chase";
    tickBeeSoldiers(now, delta, players);
    return;
  }

  if (b.state === "special_cd") {
    b.vx = 0; b.vy = 0;
    if (now >= b.stateUntil) b.state = "chase";
    tickBeeSoldiers(now, delta, players);
    return;
  }

  if (b.state === "dive") {
    if (!b.diveTarget) { b.state = "chase"; return; }
    const tdx = b.diveTarget.x - b.x, tdy = b.diveTarget.y - b.y;
    const tdist = Math.hypot(tdx, tdy) || 1;
    if (tdist < 30 || now >= b.stateUntil) {
      b.x = b.diveTarget.x; b.y = b.diveTarget.y;
      b.vx = 0; b.vy = 0; b.diveTarget = null;
      b.state = "special_cd"; b.stateUntil = now + 1800;
    } else {
      b.vx = (tdx / tdist) * 900; b.vy = (tdy / tdist) * 900;
      b.x = Math.max(80, Math.min(BEE_W - 80, b.x + b.vx * (delta / 1000)));
      b.y = Math.max(80, Math.min(BEE_H - 80, b.y + b.vy * (delta / 1000)));
    }
    tickBeeSoldiers(now, delta, players);
    return;
  }

  if (b.state === "dash") {
    if (!b.dashWaypoints || b.dashWpIdx >= b.dashWaypoints.length) {
      b.vx = 0; b.vy = 0; b.dashWaypoints = null;
      b.state = "special_cd"; b.stateUntil = now + 1200;
      tickBeeSoldiers(now, delta, players);
      return;
    }
    const wp = b.dashWaypoints[b.dashWpIdx];
    const wdx = wp.x - b.x, wdy = wp.y - b.y;
    const wdist = Math.hypot(wdx, wdy) || 1;
    if (wdist < 45) { b.dashWpIdx++; b.vx = 0; b.vy = 0; }
    else {
      b.vx = (wdx / wdist) * 820; b.vy = (wdy / wdist) * 820;
      b.x = Math.max(80, Math.min(BEE_W - 80, b.x + b.vx * (delta / 1000)));
      b.y = Math.max(80, Math.min(BEE_H - 80, b.y + b.vy * (delta / 1000)));
    }
    tickBeeSoldiers(now, delta, players);
    return;
  }

  // ── Aggro ────────────────────────────────────────────────────────────────
  if (dist < 560 && b.state === "patrol") {
    b.state = "chase";
    b.specialCooldown = now + 5000;
    b.atkCooldown = now + 2000;
    sendToBee({ type: "beeAttack", event: "aggro" });
  }
  if (dist > 900 && b.state === "chase") {
    b.state = "patrol";
  }

  // ── Patrulha ─────────────────────────────────────────────────────────────
  if (b.state === "patrol") {
    const pt = BEE_PATROL_PTS[b.patrolIdx];
    const pdx = pt.x - b.x, pdy = pt.y - b.y;
    const pd = Math.hypot(pdx, pdy) || 1;
    if (pd < 30) b.patrolIdx = (b.patrolIdx + 1) % BEE_PATROL_PTS.length;
    else { b.vx = (pdx / pd) * 55; b.vy = (pdy / pd) * 55; }
    b.x = Math.max(80, Math.min(BEE_W - 80, b.x + b.vx * (delta / 1000)));
    b.y = Math.max(80, Math.min(BEE_H - 80, b.y + b.vy * (delta / 1000)));
    tickBeeSoldiers(now, delta, players);
    return;
  }

  // ── Chase ────────────────────────────────────────────────────────────────
  // Especial
  if (now >= b.specialCooldown) {
    b.specialCooldown = now + cfg.specialInterval;
    const r = Math.random();
    if (b.phase === 1 || r < 0.33) {
      // Radial burst
      const waves = b.phase >= 3 ? 7 : 5;
      sendToBee({ type: "beeAttack", event: "radialBurst", bossX: Math.round(b.x), bossY: Math.round(b.y), waves, phase: b.phase });
      if (beeSoldiers.filter(s => !s.dead).length < 2) beeSpawnSoldiers(1);
      b.state = "burst"; b.stateUntil = now + 600 + waves * 650 + 1600;
    } else if (r < 0.66) {
      // Royal dive
      const { x: tx, y: ty } = beeClamp(target.x, target.y, 160);
      sendToBee({ type: "beeAttack", event: "royalDive", bossX: Math.round(b.x), bossY: Math.round(b.y), tx: Math.round(tx), ty: Math.round(ty) });
      b.state = "dive"; b.diveTarget = { x: tx, y: ty }; b.stateUntil = now + 2500;
    } else {
      // Frantic dash
      const M = 200;
      const waypoints = [];
      for (let i = 0; i < 4; i++) {
        const c = beeClamp(M + Math.random() * (BEE_W - M*2), M + Math.random() * (BEE_H - M*2), M);
        waypoints.push(c);
      }
      waypoints.push(beeClamp(target.x + (Math.random()-0.5)*120, target.y + (Math.random()-0.5)*120, M));
      sendToBee({ type: "beeAttack", event: "franticDash", bossX: Math.round(b.x), bossY: Math.round(b.y), waypoints: waypoints.map(p => ({ x: Math.round(p.x), y: Math.round(p.y) })) });
      b.state = "dash"; b.dashWaypoints = waypoints; b.dashWpIdx = 0;
    }
    tickBeeSoldiers(now, delta, players);
    return;
  }

  // Ataque normal
  if (dist < cfg.atkRange && now >= b.atkCooldown) {
    b.atkCooldown = now + cfg.atkInterval;
    const count = b.phase === 1 ? 1 : b.phase === 2 ? 3 : 5;
    sendToBee({ type: "beeAttack", event: "sting", fromX: Math.round(b.x), fromY: Math.round(b.y), toX: Math.round(target.x), toY: Math.round(target.y), count });
    if (b.phase === 3) sendToBee({ type: "beeAttack", event: "honeyPuddle", tx: Math.round(target.x), ty: Math.round(target.y) });
    b.state = "atk_cd"; b.stateUntil = now + 800;
    tickBeeSoldiers(now, delta, players);
    return;
  }

  // Movimento (fase 1: direto, fase 2+: órbita)
  if (b.phase === 1) {
    b.vx = (dx / dist) * cfg.speed; b.vy = (dy / dist) * cfg.speed;
  } else {
    b.orbitAngle += 0.0012 * delta;
    const orbitDist = 300;
    const rawTx = target.x + Math.cos(b.orbitAngle) * orbitDist;
    const rawTy = target.y + Math.sin(b.orbitAngle) * orbitDist;
    const { x: ox, y: oy } = beeClamp(rawTx, rawTy, 160);
    const odx = ox - b.x, ody = oy - b.y;
    const od = Math.hypot(odx, ody) || 1;
    b.vx = (odx / od) * cfg.speed; b.vy = (ody / od) * cfg.speed;
  }

  b.x = Math.max(80, Math.min(BEE_W - 80, b.x + b.vx * (delta / 1000)));
  b.y = Math.max(80, Math.min(BEE_H - 80, b.y + b.vy * (delta / 1000)));

  tickBeeSoldiers(now, delta, players);
}

function tickBeeSoldiers(now, delta, players) {
  const speed = (beeState.state === "burst" || beeState.phase === 3) ? 90 : 65;
  for (const s of beeSoldiers) {
    if (s.dead) continue;
    // Persegue o player mais próximo
    let nearX = BEE_W / 2, nearY = BEE_H / 2, nearDist = Infinity;
    for (const p of players) {
      const d = Math.hypot(p.x - s.x, p.y - s.y);
      if (d < nearDist) { nearDist = d; nearX = p.x; nearY = p.y; }
    }
    const sdx = nearX - s.x, sdy = nearY - s.y;
    const sdist = Math.hypot(sdx, sdy) || 1;
    s.x += (sdx / sdist) * speed * (delta / 1000);
    s.y += (sdy / sdist) * speed * (delta / 1000);
    s.x = Math.max(30, Math.min(BEE_W - 30, s.x));
    s.y = Math.max(30, Math.min(BEE_H - 30, s.y));
    s.flipX = sdx < 0;

    // Dano por contato
    for (const p of players) {
      const cd = Math.hypot(p.x - s.x, p.y - s.y);
      if (cd < 55 && now - (s.lastAtk || 0) > 900) {
        s.lastAtk = now;
        sendWs(p.socket, { type: "beeMeleeHit", damage: 30 });
      }
    }

    // Ferrão do soldado
    if (nearDist < 380 && now - (s.lastSting || 0) > 2500) {
      s.lastSting = now;
      const angle = Math.atan2(sdy, sdx);
      sendToBee({ type: "beeSoldierSting", i: s.i, fromX: Math.round(s.x), fromY: Math.round(s.y), angle });
    }
  }
  // Remove soldados mortos há mais de 2s (clientes já receberam a morte)
  beeSoldiers = beeSoldiers.filter(s => !s.dead || (Date.now() - (s.diedAt || 0) < 2000));
}

// Broadcast a cada 100ms
setInterval(() => {
  if (!getBeePlayers().length) return;
  sendToBee({ type: "beeSync", ...serializeBee() });
  sendToBee({ type: "beeSoldierSync", soldiers: beeSoldiers.map(serializeSoldier) });
}, 100).unref();

setInterval(() => tickBee(), 50).unref();

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

import { createServer } from "node:http";
import crypto from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT ?? 5188);
const host = process.env.HOST ?? "0.0.0.0";
const storageRoot = path.join(root, ".eldervalley-storage");
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
    x: client.x,
    y: client.y,
    facing: client.facing,
    moving: client.moving,
    characterId: client.characterId
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
    client.x = Number(payload.x) || 0;
    client.y = Number(payload.y) || 0;
    client.facing = sanitizeText(payload.facing, 12) || "down";
    client.characterId = sanitizeText(payload.characterId, 24) || "mage-1";
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
    client.x = Number(payload.x) || client.x;
    client.y = Number(payload.y) || client.y;
    client.facing = sanitizeText(payload.facing, 12) || client.facing;
    client.characterId = sanitizeText(payload.characterId, 24) || client.characterId;
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
      message
    }, client.id);
  }
}

function storagePathFor(key) {
  const safeKey = key.replace(/[^a-zA-Z0-9_.-]/g, "_");
  return path.join(storageRoot, `${safeKey}.json`);
}

function backupPathFor(key) {
  const safeKey = key.replace(/[^a-zA-Z0-9_.-]/g, "_");
  return path.join(storageRoot, "backups", `${safeKey}-${Date.now()}.json`);
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
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

    if (url.pathname.startsWith("/api/storage/")) {
      const key = decodeURIComponent(url.pathname.slice("/api/storage/".length));
      if (!key) {
        sendJson(res, 400, { ok: false, error: "Missing key" });
        return;
      }

      if (req.method === "GET") {
        try {
          const data = JSON.parse(await readFile(storagePathFor(key), "utf8"));
          sendJson(res, 200, { ok: true, key, data });
        } catch {
          sendJson(res, 200, { ok: true, key, data: null });
        }
        return;
      }

      if (req.method === "POST") {
        const body = await readBody(req);
        const payload = JSON.parse(body || "null");
        await mkdir(storageRoot, { recursive: true });
        const storagePath = storagePathFor(key);
        try {
          const previous = await readFile(storagePath, "utf8");
          await mkdir(path.join(storageRoot, "backups"), { recursive: true });
          await writeFile(backupPathFor(key), previous, "utf8");
        } catch {
          // Primeiro save desse arquivo, sem backup anterior.
        }
        await writeFile(storagePath, JSON.stringify(payload, null, 2), "utf8");
        sendJson(res, 200, { ok: true, key });
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

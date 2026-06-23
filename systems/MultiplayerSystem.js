import { getPlayerCharacterProfile } from "../player/Player.js?v=152";

export default class MultiplayerSystem {
  constructor(scene) {
    this.scene = scene;
    this.id = null;
    this.socket = null;
    this.remotePlayers = new Map();
    this.lastStateSent = 0;
    this.connected = false;
    this.destroyed = false;
    this.connect();
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
  }

  connect() {
    if (this.destroyed || window.location.protocol === "file:" || !window.WebSocket) {
      return;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    this.socket = new WebSocket(`${protocol}//${window.location.host}/ws`);
    this.socket.addEventListener("open", () => {
      if (this.destroyed) {
        this.socket?.close();
        return;
      }
      this.connected = true;
      this.send({
        type: "hello",
        name: this.getPlayerName(),
        ...this.getLocalState()
      });
      this.requestSnapshot();
      this.scheduleSceneResync();
    });
    this.socket.addEventListener("message", (event) => this.handleMessage(event));
    this.socket.addEventListener("close", () => {
      this.connected = false;
      this.clearRemotePlayers();
    });
    this.socket.addEventListener("error", () => {
      this.connected = false;
    });
  }

  getPlayerName() {
    let name = localStorage.getItem("eldervalley-player-name");
    if (!name) {
      name = `Player ${Math.floor(Math.random() * 9000) + 1000}`;
      localStorage.setItem("eldervalley-player-name", name);
    }
    return name;
  }

  getLocalState() {
    const player = this.scene.player;
    return {
      presenceId: this.getPresenceId(),
      scene: this.scene.scene.key,
      sceneChannel: this.getSceneChannel(),
      x: Math.round(player?.x ?? 0),
      y: Math.round(player?.y ?? 0),
      facing: player?.facing ?? "down",
      characterId: player?.characterId ?? localStorage.getItem("eldervalley-selected-character") ?? "mage-1",
      loginMode: localStorage.getItem("eldervalley-login-mode") ?? "guest",
      walletAddress: this.getWalletAddress(),
      walletProvider: this.getWalletProvider(),
      sessionToken: this.getSessionToken(),
      profileId: this.scene.getPlayerProfileId?.() ?? "",
      moving: Boolean(player?.body && (Math.abs(player.body.velocity.x) > 1 || Math.abs(player.body.velocity.y) > 1))
    };
  }

  getPresenceId() {
    let presenceId = "";
    try {
      presenceId = sessionStorage.getItem("eldervalley-presence-id-v2") ?? "";
    } catch {
      presenceId = window.__eldervalleyPresenceId ?? "";
    }
    if (!presenceId) {
      presenceId = `presence-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
      try {
        sessionStorage.setItem("eldervalley-presence-id-v2", presenceId);
      } catch {
        window.__eldervalleyPresenceId = presenceId;
      }
    }
    return presenceId;
  }

  getWalletAddress() {
    try {
      const wallet = JSON.parse(localStorage.getItem("eldervalley-wallet") || "null");
      return wallet?.address ?? "";
    } catch {
      return "";
    }
  }

  getWalletProvider() {
    try {
      const wallet = JSON.parse(localStorage.getItem("eldervalley-wallet") || "null");
      return wallet?.provider ?? "";
    } catch {
      return "";
    }
  }

  getSessionToken() {
    try {
      return localStorage.getItem("eldervalley-session-token") ?? "";
    } catch {
      return "";
    }
  }

  getSceneChannel() {
    const key = this.scene.scene.key;
    if (key === "WorldScene") {
      return "world:main";
    }
    if (key === "CityScene") {
      return "city:main";
    }
    const interiorId = this.scene.entryData?.doorId
      ?? this.scene.entryData?.exitSpawnKey
      ?? this.scene.entryData?.spawnKey;
    if (interiorId) {
      return `${key}:${interiorId}`;
    }
    return key;
  }

  send(payload) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return;
    }
    this.socket.send(JSON.stringify(payload));
  }

  handleMessage(event) {
    let payload = null;
    try {
      payload = JSON.parse(event.data);
    } catch {
      return;
    }

    if (payload.type === "roomFull") {
      this.connected = false;
      this.clearRemotePlayers();
      this.socket?.close();
      this.scene.handleRoomFull?.(payload.capacity, payload.current);
      return;
    }
    if (payload.type === "welcome") {
      this.id = payload.id;
      this.applyServerClock(payload.clockMinutes);
      this.applySnapshot(payload.peers ?? []);
      this.requestSnapshot();
      return;
    }
    if (payload.type === "snapshot") {
      this.applyServerClock(payload.clockMinutes);
      this.applySnapshot(payload.peers ?? []);
      return;
    }
    if (payload.type === "timeSync") {
      this.applyServerClock(payload.clockMinutes);
      return;
    }
    if (payload.type === "storageUpdated") {
      this.scene.handleSharedStorageUpdate?.(payload);
      return;
    }
    if (payload.type === "presenceReplaced") {
      this.connected = false;
      this.clearRemotePlayers();
      this.socket?.close();
      return;
    }
    if (payload.type === "walletSessionReplaced" || payload.type === "authRejected") {
      this.connected = false;
      this.clearRemotePlayers();
      this.scene.chat?.addSystemMessage(payload.message ?? "Wallet session ended.");
      this.socket?.close();
      return;
    }
    if (payload.type === "playerJoined") {
      this.upsertRemotePlayer(payload.player);
      return;
    }
    if (payload.type === "playerLeft") {
      this.removeRemotePlayer(payload.presenceId ?? payload.id);
      return;
    }
    if (payload.type === "state") {
      this.upsertRemotePlayer(payload.player);
      return;
    }
    if (payload.type === "chat") {
      this.receiveChat(payload);
    }
    if (payload.type === "bossCountdown") {
      this.scene.onBossCountdown?.(payload.remainingMs);
      return;
    }
    if (payload.type === "bossSpawned") {
      this.scene.onBossSpawned?.();
      return;
    }
    if (payload.type === "bossSync") {
      this.scene.onBossSync?.(payload);
      return;
    }
    if (payload.type === "bossAttack") {
      this.scene.onBossAttack?.(payload.event, payload);
      return;
    }
    if (payload.type === "bossPhase") {
      this.scene.onBossPhaseChange?.(payload.phase);
      return;
    }
    if (payload.type === "bossMeleeHit") {
      this.scene.takeDamage?.(payload.damage ?? 22);
      return;
    }
    // legado — mantém compatibilidade
    if (payload.type === "bossEvent") {
      this.scene.onRemoteBossEvent?.(payload.event, payload.data ?? {});
    }
    // ── Swamp trolls ────────────────────────────────────────────
    if (payload.type === "trollSync") {
      this.scene.onTrollSync?.(payload);
      return;
    }
    if (payload.type === "trollAttack") {
      this.scene.onTrollAttack?.(payload);
      return;
    }
    if (payload.type === "trollDied") {
      this.scene.onTrollDied?.(payload.i);
      return;
    }
    if (payload.type === "trollRespawn") {
      this.scene.onTrollRespawn?.(payload);
      return;
    }
    // ── Bee Scene ────────────────────────────────────────────────
    if (payload.type === "beeSync") {
      this.scene.onBeeSync?.(payload);
      return;
    }
    if (payload.type === "beeSoldierSync") {
      this.scene.onBeeSoldierSync?.(payload);
      return;
    }
    if (payload.type === "beeAttack") {
      this.scene.onBeeAttack?.(payload);
      return;
    }
    if (payload.type === "beeSoldierDied") {
      this.scene.onBeeSoldierDied?.(payload.i);
      return;
    }
    if (payload.type === "xp") {
      this.scene.onXpGained?.(payload);
      return;
    }
    if (payload.type === "marketUpdate") {
      this.scene.onMarketUpdate?.();
      return;
    }
    if (payload.type === "beeSoldierSpawn") {
      this.scene.onBeeSoldierSpawn?.(payload);
      return;
    }
    if (payload.type === "beeMeleeHit") {
      this.scene.takeDamage?.(payload.damage ?? 30);
      return;
    }
    if (payload.type === "beeSoldierSting") {
      this.scene.onBeeSoldierSting?.(payload);
      return;
    }
  }

  sendHitTroll(index, damage) {
    this.send({ type: "hitTroll", index, damage });
  }

  sendHitBeeQueen(damage) {
    this.send({ type: "hitBeeQueen", damage });
  }

  sendHitBeeSoldier(index, damage) {
    this.send({ type: "hitBeeSoldier", index, damage });
  }

  update(time) {
    if (this.destroyed || !this.connected || time - this.lastStateSent < 90) {
      this.updateRemotePlayerDepths();
      return;
    }
    this.lastStateSent = time;
    this.send({ type: "state", ...this.getLocalState() });
    this.updateRemotePlayerDepths();
  }

  requestSnapshot() {
    if (this.destroyed) {
      return;
    }
    this.send({ type: "sync", ...this.getLocalState() });
  }

  scheduleSceneResync() {
    this.clearSceneResyncTimers();
    this.sceneResyncTimers = [250, 900, 1800, 3200].map((delay) => (
      window.setTimeout(() => {
        if (!this.connected || !this.socket || this.socket.readyState !== WebSocket.OPEN) {
          return;
        }
        this.send({ type: "state", ...this.getLocalState() });
        this.requestSnapshot();
      }, delay)
    ));
  }

  clearSceneResyncTimers() {
    this.sceneResyncTimers?.forEach((timer) => window.clearTimeout(timer));
    this.sceneResyncTimers = [];
  }

  applySnapshot(peers) {
    const visibleKeys = new Set();
    peers.forEach((player) => {
      if (!player || player.id === this.id || player.presenceId === this.getPresenceId()) {
        return;
      }
      if (this.getRemoteSceneChannel(player) === this.getSceneChannel()) {
        visibleKeys.add(this.getRemoteKey(player));
        this.upsertRemotePlayer(player);
      }
    });

    [...this.remotePlayers.keys()].forEach((id) => {
      if (!visibleKeys.has(id)) {
        this.removeRemotePlayer(id);
      }
    });
  }

  applyServerClock(clockMinutes) {
    const minutes = Number(clockMinutes);
    if (!Number.isFinite(minutes)) {
      return;
    }
    const normalized = ((minutes % 1440) + 1440) % 1440;
    this.scene.registry.set("worldClockServerMinutes", normalized);
    this.scene.registry.set("worldClockSyncedAt", performance.now());
    this.scene.registry.set("worldClockMinutes", normalized);
    this.scene.updateClockHud?.();
    this.scene.updateDayNightCycle?.(0);
  }

  upsertRemotePlayer(data) {
    if (!data || data.id === this.id || data.presenceId === this.getPresenceId() || this.getRemoteSceneChannel(data) !== this.getSceneChannel()) {
      if (data?.id) {
        this.removeRemotePlayer(this.getRemoteKey(data));
      }
      return;
    }

    const remoteKey = this.getRemoteKey(data);
    let remote = this.remotePlayers.get(remoteKey);
    const characterId = data.characterId ?? "mage-1";
    const profile = getPlayerCharacterProfile(characterId);
    this.ensureRemoteAnimations(profile);
    if (!remote) {
      const sprite = this.scene.add.sprite(data.x, data.y, profile.idleTexture, 0)
        .setOrigin(0.5, 0.5)
        .setScale(this.getRemoteScale(profile))
        .setDepth(data.y + 120);
      const nameText = this.scene.add.text(data.x, data.y - 58, data.name ?? "Player", {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#fff7d6",
        stroke: "#111820",
        strokeThickness: 3
      }).setOrigin(0.5).setDepth(6100);
      remote = {
        id: data.id,
        name: data.name ?? "Player",
        characterId,
        profile,
        sprite,
        nameText,
        targetX: data.x,
        targetY: data.y,
        facing: data.facing ?? "down",
        moving: false
      };
      this.remotePlayers.set(remoteKey, remote);
    }

    remote.id = data.id ?? remote.id;
    if (remote.characterId !== characterId) {
      remote.characterId = characterId;
      remote.profile = profile;
      remote.sprite.setTexture(profile.idleTexture, 0);
      remote.sprite.setScale(this.getRemoteScale(profile));
    }
    remote.name = data.name ?? remote.name;
    const nextX = Number(data.x);
    const nextY = Number(data.y);
    if (Number.isFinite(nextX)) {
      remote.targetX = nextX;
    }
    if (Number.isFinite(nextY)) {
      remote.targetY = nextY;
    }
    remote.facing = data.facing ?? remote.facing;
    remote.moving = Boolean(data.moving);
    remote.nameText.setText(remote.name);
    this.playRemoteAnimation(remote);
  }

  getRemoteScale(profile) {
    return profile?.scale ?? 1;
  }

  getRemoteSceneChannel(data) {
    return data.sceneChannel ?? data.scene;
  }

  getRemoteKey(data) {
    return data?.presenceId ?? data?.id;
  }

  playRemoteAnimation(remote) {
    const profile = remote.profile ?? getPlayerCharacterProfile(remote.characterId);
    this.ensureRemoteAnimations(profile);
    const prefix = remote.moving ? "walk" : "idle";
    const key = `${profile.id}-${prefix}-${remote.facing ?? "down"}`;
    remote.sprite.play(key, true);
  }

  ensureRemoteAnimations(profile) {
    const makeFrames = (row) => Array.from({ length: profile.framesPerDirection }, (_, index) => row * profile.framesPerDirection + index);
    const makeIdleFrames = (row) => profile.animatedIdle ? makeFrames(row) : [row * profile.framesPerDirection];
    const defs = [
      [`${profile.id}-walk-down`, profile.walkTexture, makeFrames(0), 10],
      [`${profile.id}-walk-left`, profile.walkTexture, makeFrames(1), 10],
      [`${profile.id}-walk-right`, profile.walkTexture, makeFrames(2), 10],
      [`${profile.id}-walk-up`, profile.walkTexture, makeFrames(3), 10],
      [`${profile.id}-idle-down`, profile.idleTexture, makeIdleFrames(0), 5],
      [`${profile.id}-idle-left`, profile.idleTexture, makeIdleFrames(1), 5],
      [`${profile.id}-idle-right`, profile.idleTexture, makeIdleFrames(2), 5],
      [`${profile.id}-idle-up`, profile.idleTexture, makeIdleFrames(3), 5]
    ];

    defs.forEach(([key, textureKey, frames, frameRate]) => {
      if (this.scene.anims.exists(key)) {
        return;
      }
      this.scene.anims.create({
        key,
        frames: frames.map((frame) => ({ key: textureKey, frame })),
        frameRate,
        repeat: -1
      });
    });
  }

  updateRemotePlayerDepths() {
    for (const remote of this.remotePlayers.values()) {
      remote.sprite.x = Phaser.Math.Linear(remote.sprite.x, remote.targetX, 0.35);
      remote.sprite.y = Phaser.Math.Linear(remote.sprite.y, remote.targetY, 0.35);
      remote.sprite.setDepth(remote.sprite.y + 120);
      remote.nameText.setPosition(remote.sprite.x, remote.sprite.y - 58);
    }
  }

  receiveChat(payload) {
    if ((payload.sceneChannel ?? payload.scene) !== this.getSceneChannel()) {
      return;
    }
    const remote = this.remotePlayers.get(payload.presenceId ?? payload.id) ?? this.findRemoteBySocketId(payload.id);
    this.scene.chat?.addMessage(payload.name ?? "Player", payload.message);
    if (remote) {
      this.scene.chat?.showBubbleFor(remote.sprite, payload.message);
    }
  }

  sendChat(message) {
    this.send({ type: "chat", message });
  }

  sendBossEvent(event, data = {}) {
    this.send({ type: "bossEvent", event, data });
  }

  sendHitBoss(damage) {
    this.send({ type: "hitBoss", damage });
  }

  // Retorna true se este cliente deve controlar o boss AI
  isBossController() {
    if (!this.connected || !this.id) return true;
    for (const remote of this.remotePlayers.values()) {
      if (remote.sceneChannel === this.getLocalState().sceneChannel) {
        if (String(remote.id) < String(this.id)) return false;
      }
    }
    return true;
  }

  removeRemotePlayer(id) {
    const key = this.remotePlayers.has(id) ? id : this.findRemoteKeyBySocketId(id);
    const remote = this.remotePlayers.get(key);
    if (!remote) {
      return;
    }
    remote.sprite.destroy();
    remote.nameText.destroy();
    this.remotePlayers.delete(key);
  }

  findRemoteBySocketId(id) {
    for (const remote of this.remotePlayers.values()) {
      if (remote.id === id) {
        return remote;
      }
    }
    return null;
  }

  findRemoteKeyBySocketId(id) {
    for (const [key, remote] of this.remotePlayers.entries()) {
      if (remote.id === id) {
        return key;
      }
    }
    return id;
  }

  clearRemotePlayers() {
    [...this.remotePlayers.keys()].forEach((id) => this.removeRemotePlayer(id));
  }

  destroy() {
    if (this.destroyed) {
      return;
    }
    this.destroyed = true;
    this.connected = false;
    this.clearSceneResyncTimers();
    this.clearRemotePlayers();
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.close();
    }
    this.socket = null;
    if (this.scene?.multiplayer === this) {
      this.scene.multiplayer = null;
    }
  }
}

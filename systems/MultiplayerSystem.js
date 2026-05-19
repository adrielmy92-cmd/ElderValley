import { getPlayerCharacterProfile } from "../player/Player.js?v=141";

export default class MultiplayerSystem {
  constructor(scene) {
    this.scene = scene;
    this.id = null;
    this.socket = null;
    this.remotePlayers = new Map();
    this.lastStateSent = 0;
    this.connected = false;
    this.connect();
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
  }

  connect() {
    if (window.location.protocol === "file:" || !window.WebSocket) {
      return;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    this.socket = new WebSocket(`${protocol}//${window.location.host}/ws`);
    this.socket.addEventListener("open", () => {
      this.connected = true;
      this.send({
        type: "hello",
        name: this.getPlayerName(),
        ...this.getLocalState()
      });
      this.requestSnapshot();
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
      name = `Jogador ${Math.floor(Math.random() * 9000) + 1000}`;
      localStorage.setItem("eldervalley-player-name", name);
    }
    return name;
  }

  getLocalState() {
    const player = this.scene.player;
    return {
      scene: this.scene.scene.key,
      sceneChannel: this.getSceneChannel(),
      x: Math.round(player?.x ?? 0),
      y: Math.round(player?.y ?? 0),
      facing: player?.facing ?? "down",
      characterId: player?.characterId ?? localStorage.getItem("eldervalley-selected-character") ?? "mage-1",
      loginMode: localStorage.getItem("eldervalley-login-mode") ?? "guest",
      walletAddress: this.getWalletAddress(),
      walletProvider: this.getWalletProvider(),
      moving: Boolean(player?.body && (Math.abs(player.body.velocity.x) > 1 || Math.abs(player.body.velocity.y) > 1))
    };
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

  getSceneChannel() {
    const key = this.scene.scene.key;
    if (key === "WorldScene" || key === "CityScene") {
      return key;
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
    if (payload.type === "playerJoined") {
      this.upsertRemotePlayer(payload.player);
      return;
    }
    if (payload.type === "playerLeft") {
      this.removeRemotePlayer(payload.id);
      return;
    }
    if (payload.type === "state") {
      this.upsertRemotePlayer(payload.player);
      return;
    }
    if (payload.type === "chat") {
      this.receiveChat(payload);
    }
  }

  update(time) {
    if (!this.connected || time - this.lastStateSent < 90) {
      this.updateRemotePlayerDepths();
      return;
    }
    this.lastStateSent = time;
    this.send({ type: "state", ...this.getLocalState() });
    this.updateRemotePlayerDepths();
  }

  requestSnapshot() {
    this.send({ type: "sync", ...this.getLocalState() });
  }

  applySnapshot(peers) {
    const visibleIds = new Set();
    peers.forEach((player) => {
      if (!player || player.id === this.id) {
        return;
      }
      if (this.getRemoteSceneChannel(player) === this.getSceneChannel()) {
        visibleIds.add(player.id);
        this.upsertRemotePlayer(player);
      }
    });

    [...this.remotePlayers.keys()].forEach((id) => {
      if (!visibleIds.has(id)) {
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
    if (!data || data.id === this.id || this.getRemoteSceneChannel(data) !== this.getSceneChannel()) {
      if (data?.id) {
        this.removeRemotePlayer(data.id);
      }
      return;
    }

    let remote = this.remotePlayers.get(data.id);
    const characterId = data.characterId ?? "mage-1";
    const profile = getPlayerCharacterProfile(characterId);
    this.ensureRemoteAnimations(profile);
    if (!remote) {
      const sprite = this.scene.add.sprite(data.x, data.y, profile.idleTexture, 0)
        .setOrigin(0.5, 0.5)
        .setScale(this.getRemoteScale(profile))
        .setDepth(data.y + 120);
      const nameText = this.scene.add.text(data.x, data.y - 58, data.name ?? "Jogador", {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#fff7d6",
        stroke: "#111820",
        strokeThickness: 3
      }).setOrigin(0.5).setDepth(6100);
      remote = {
        id: data.id,
        name: data.name ?? "Jogador",
        characterId,
        profile,
        sprite,
        nameText,
        targetX: data.x,
        targetY: data.y,
        facing: data.facing ?? "down",
        moving: false
      };
      this.remotePlayers.set(data.id, remote);
    }

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
    const remote = this.remotePlayers.get(payload.id);
    this.scene.chat?.addMessage(payload.name ?? "Jogador", payload.message);
    if (remote) {
      this.scene.chat?.showBubbleFor(remote.sprite, payload.message);
    }
  }

  sendChat(message) {
    this.send({ type: "chat", message });
  }

  removeRemotePlayer(id) {
    const remote = this.remotePlayers.get(id);
    if (!remote) {
      return;
    }
    remote.sprite.destroy();
    remote.nameText.destroy();
    this.remotePlayers.delete(id);
  }

  clearRemotePlayers() {
    [...this.remotePlayers.keys()].forEach((id) => this.removeRemotePlayer(id));
  }

  destroy() {
    this.clearRemotePlayers();
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.close();
    }
    this.socket = null;
  }
}

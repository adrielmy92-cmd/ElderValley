const PLAYER_CHARACTERS = {
  "mage-1": {
    id: "mage-1",
    label: "Mago 1",
    walkTexture: "mage-1-sheet",
    idleTexture: "mage-1-idle-sheet",
    frameWidth: 56,
    frameHeight: 84,
    framesPerDirection: 8,
    body: { width: 18, height: 14, offsetX: 19, offsetY: 68 },
    speed: 145,
    depthBias: 120
  },
  knight: {
    id: "knight",
    label: "Cavaleiro",
    walkTexture: "knight-npc-sheet",
    idleTexture: "knight-npc-sheet",
    frameWidth: 56,
    frameHeight: 84,
    framesPerDirection: 8,
    body: { width: 20, height: 14, offsetX: 18, offsetY: 68 },
    speed: 136,
    depthBias: 120
  }
};

export function getPlayerCharacterProfile(id) {
  return PLAYER_CHARACTERS[id] ?? PLAYER_CHARACTERS["mage-1"];
}

export default class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    const characterId = scene.registry.get("playerCharacter") ?? localStorage.getItem("eldervalley-selected-character") ?? "mage-1";
    const profile = getPlayerCharacterProfile(characterId);
    super(scene, x, y, profile.walkTexture, 0);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.characterId = profile.id;
    this.animPrefix = profile.id;
    this.profile = profile;
    this.speed = profile.speed;
    this.facing = "down";
    this.depthBias = profile.depthBias;
    this.setScale(1);
    this.body.setSize(profile.body.width, profile.body.height).setOffset(profile.body.offsetX, profile.body.offsetY);
    this.setDepth(y + this.depthBias);
    this.createAnimations(scene);
  }

  createAnimations(scene) {
    const prefix = this.animPrefix;
    const profile = this.profile;
    const makeFrames = (row) => Array.from({ length: profile.framesPerDirection }, (_, index) => row * profile.framesPerDirection + index);
    const makeIdleFrame = (row) => [row * profile.framesPerDirection];
    const defs = [
      [`${prefix}-walk-down`, profile.walkTexture, makeFrames(0), 10],
      [`${prefix}-walk-left`, profile.walkTexture, makeFrames(1), 10],
      [`${prefix}-walk-right`, profile.walkTexture, makeFrames(2), 10],
      [`${prefix}-walk-up`, profile.walkTexture, makeFrames(3), 10],
      [`${prefix}-idle-down`, profile.idleTexture, profile.id === "mage-1" ? makeFrames(0) : makeIdleFrame(0), 5],
      [`${prefix}-idle-left`, profile.idleTexture, profile.id === "mage-1" ? makeFrames(1) : makeIdleFrame(1), 5],
      [`${prefix}-idle-right`, profile.idleTexture, profile.id === "mage-1" ? makeFrames(2) : makeIdleFrame(2), 5],
      [`${prefix}-idle-up`, profile.idleTexture, profile.id === "mage-1" ? makeFrames(3) : makeIdleFrame(3), 5]
    ];

    for (const [key, textureKey, frames, frameRate] of defs) {
      if (scene.anims.exists(key)) {
        continue;
      }
      scene.anims.create({
        key,
        frames: frames.map((frame) => ({ key: textureKey, frame })),
        frameRate,
        repeat: -1
      });
    }
  }

  update(cursors, wasd, frozen = false) {
    this.setDepth(this.y + this.depthBias);

    if (frozen) {
      this.setVelocity(0, 0);
      this.playIdle();
      return;
    }

    const left = cursors.left.isDown || wasd.left.isDown;
    const right = cursors.right.isDown || wasd.right.isDown;
    const up = cursors.up.isDown || wasd.up.isDown;
    const down = cursors.down.isDown || wasd.down.isDown;
    const velocity = new Phaser.Math.Vector2(Number(right) - Number(left), Number(down) - Number(up));

    if (velocity.lengthSq() > 0) {
      velocity.normalize().scale(this.speed);
      this.setVelocity(velocity.x, velocity.y);

      if (Math.abs(velocity.x) > Math.abs(velocity.y)) {
        this.facing = velocity.x < 0 ? "left" : "right";
      } else {
        this.facing = velocity.y < 0 ? "up" : "down";
      }

      this.play(`${this.animPrefix}-walk-${this.facing}`, true);
      return;
    }

    this.setVelocity(0, 0);
    this.playIdle();
  }

  playIdle() {
    this.play(`${this.animPrefix}-idle-${this.facing}`, true);
  }
}

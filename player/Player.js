const PLAYER_CHARACTERS = {
  "mage-1": {
    id: "mage-1",
    label: "Mage 1",
    walkTexture: "mage-1-sheet",
    idleTexture: "mage-1-idle-sheet",
    attackTexture: "mage-1-attack-normalized",
    attackFrameWidth: 56,
    attackFrameHeight: 84,
    attackFrames: 8,
    sideAttackTexture: "mage-1-side-attack-normalized",
    sideAttackFrameWidth: 56,
    sideAttackFrameHeight: 84,
    sideAttackFrames: 8,
    animatedIdle: true,
    frameWidth: 56,
    frameHeight: 84,
    framesPerDirection: 8,
    body: { width: 18, height: 14, offsetX: 19, offsetY: 68 },
    speed: 145,
    depthBias: 120
  },
  adventurer: {
    id: "adventurer",
    label: "Adventurer",
    walkTexture: "adventurer-sheet",
    idleTexture: "adventurer-sheet",
    animatedIdle: false,
    frameWidth: 48,
    frameHeight: 68,
    framesPerDirection: 3,
    body: { width: 18, height: 14, offsetX: 15, offsetY: 52 },
    speed: 145,
    depthBias: 120
  },
  "dark-wanderer": {
    id: "dark-wanderer",
    label: "Dark Wanderer",
    walkTexture: "dark-wanderer-sheet",
    idleTexture: "dark-wanderer-sheet",
    animatedIdle: false,
    frameWidth: 96,
    frameHeight: 128,
    framesPerDirection: 8,
    walkFrameRate: 8,
    body: { width: 24, height: 14, offsetX: 36, offsetY: 112 },
    speed: 130,
    depthBias: 128
  }
};

export function getPlayerCharacterProfile(id) {
  if (id === "archer") {
    return PLAYER_CHARACTERS.adventurer;
  }
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
    this.isAttacking = false;
    this.attackSprite = null;
    this.setScale(1);
    this.body.setSize(profile.body.width, profile.body.height).setOffset(profile.body.offsetX, profile.body.offsetY);
    this.setDepth(y + this.depthBias);
    this.createAnimations(scene);
  }

  createAnimations(scene) {
    const prefix = this.animPrefix;
    const profile = this.profile;
    const makeFrames = (row) => Array.from({ length: profile.framesPerDirection }, (_, index) => row * profile.framesPerDirection + index);
    const makeIdleFrames = (row) => profile.animatedIdle ? makeFrames(row) : [row * profile.framesPerDirection];
    const walkFps = profile.walkFrameRate ?? 10;
    const defs = [
      [`${prefix}-walk-down`, profile.walkTexture, makeFrames(0), walkFps],
      [`${prefix}-walk-left`, profile.walkTexture, makeFrames(1), walkFps],
      [`${prefix}-walk-right`, profile.walkTexture, makeFrames(2), walkFps],
      [`${prefix}-walk-up`, profile.walkTexture, makeFrames(3), walkFps],
      [`${prefix}-idle-down`, profile.idleTexture, makeIdleFrames(0), 5],
      [`${prefix}-idle-left`, profile.idleTexture, makeIdleFrames(1), 5],
      [`${prefix}-idle-right`, profile.idleTexture, makeIdleFrames(2), 5],
      [`${prefix}-idle-up`, profile.idleTexture, makeIdleFrames(3), 5]
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

    const makeAttackAnimation = (key, textureKey, frames) => {
      if (textureKey && scene.textures.exists(textureKey) && !scene.anims.exists(key)) {
        scene.anims.create({
          key,
          frames: Array.from({ length: frames ?? 1 }, (_, frame) => ({
            key: textureKey,
            frame
          })),
          frameRate: 14,
          repeat: 0
        });
      }
    };

    makeAttackAnimation(`${prefix}-attack-front`, profile.attackTexture, profile.attackFrames);
    makeAttackAnimation(`${prefix}-attack-side`, profile.sideAttackTexture, profile.sideAttackFrames);
  }

  update(cursors, wasd, frozen = false) {
    this.setDepth(this.y + this.depthBias);

    if (frozen || this.isAttacking) {
      this.setVelocity(0, 0);
      if (!this.isAttacking) {
        this.playIdle();
      }
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
      if (this.profile.mirrorLeftRight) {
        this.setFlipX(this.facing === "left");
      }
      return;
    }

    this.setVelocity(0, 0);
    this.playIdle();
  }

  playIdle() {
    this.play(`${this.animPrefix}-idle-${this.facing}`, true);
    if (this.profile.mirrorLeftRight) {
      this.setFlipX(this.facing === "left");
    }
  }

  attack() {
    const profile = this.profile;
    const useSideAttack = (this.facing === "left" || this.facing === "right")
      && profile.sideAttackTexture
      && this.scene.textures.exists(profile.sideAttackTexture);
    const textureKey = useSideAttack ? profile.sideAttackTexture : profile.attackTexture;
    const animationKey = useSideAttack ? `${this.animPrefix}-attack-side` : `${this.animPrefix}-attack-front`;

    if (this.isAttacking || !textureKey || !this.scene.textures.exists(textureKey)) {
      return false;
    }

    this.isAttacking = true;
    this.setVelocity(0, 0);
    this.setTexture(textureKey, 0);
    this.setFlipX(useSideAttack && this.facing === "left");
    this.setScale(1);
    this.setDepth(this.y + this.depthBias + 4);
    this.play(animationKey, true);

    this.scene.time.delayedCall(170, () => {
      if (this.active && this.isAttacking) {
        const spawnMethod = this.profile.projectileSpawn ?? "spawnFireball";
        this.scene[spawnMethod]?.(this.x, this.y, this.facing);
      }
    });

    const finishAttack = () => {
      if (!this.active) {
        return;
      }
      this.isAttacking = false;
      this.setFlipX(false);
      this.setScale(1);
      this.playIdle();
    };

    this.once(Phaser.Animations.Events.ANIMATION_COMPLETE, finishAttack);

    this.scene.time.delayedCall(720, () => {
      if (!this.isAttacking) {
        return;
      }
      this.off(Phaser.Animations.Events.ANIMATION_COMPLETE, finishAttack);
      finishAttack();
    });

    return true;
  }
}

const PLAYER_CHARACTERS = {
  "mage-1": {
    id: "mage-1",
    label: "Zara, a Arcanista",
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
    shotType: "spirit",
    frameWidth: 56,
    frameHeight: 84,
    framesPerDirection: 8,
    body: { width: 18, height: 14, offsetX: 19, offsetY: 68 },
    speed: 145,
    depthBias: 120
  },
  warrior: {
    id: "warrior",
    label: "Guerreiro",
    walkTexture: "warrior-walk-sheet",
    idleTexture: "warrior-walk-sheet",
    animatedIdle: false,
    attackTexture: "warrior-attack-sheet",
    attackFrames: 8,
    directionalAttack: true,
    melee: true,
    shotType: "soul",
    meleeReach: 46,
    meleeRadius: 52,
    meleeHitDelay: 190,
    meleeBase: 50,        // base sword damage; grows with weapons (Attack) + Strength/level
    spinRadius: 130,
    spinDamageMult: 2.5,  // [2] Spin hits harder than the basic attack
    frameWidth: 82,
    frameHeight: 84,
    framesPerDirection: 8,
    walkFrameRate: 10,
    body: { width: 20, height: 12, offsetX: 31, offsetY: 69 },
    speed: 140,
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

    if (profile.directionalAttack && profile.attackTexture && scene.textures.exists(profile.attackTexture)) {
      // 4-row attack sheet (down/left/right/up), same layout as the walk sheet.
      const af = profile.attackFrames ?? profile.framesPerDirection;
      ["down", "left", "right", "up"].forEach((dir, row) => {
        const key = `${prefix}-attack-${dir}`;
        if (scene.anims.exists(key)) return;
        scene.anims.create({
          key,
          frames: Array.from({ length: af }, (_, i) => ({ key: profile.attackTexture, frame: row * af + i })),
          frameRate: 16,
          repeat: 0
        });
      });
    } else {
      makeAttackAnimation(`${prefix}-attack-front`, profile.attackTexture, profile.attackFrames);
      makeAttackAnimation(`${prefix}-attack-side`, profile.sideAttackTexture, profile.sideAttackFrames);
    }
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

  attack(spellType = "fire") {
    const profile = this.profile;
    let textureKey, animationKey, flip;
    if (profile.directionalAttack) {
      // One attack animation per facing (down/left/right/up), no mirroring.
      textureKey = profile.attackTexture;
      animationKey = `${this.animPrefix}-attack-${this.facing}`;
      flip = false;
    } else {
      const useSideAttack = (this.facing === "left" || this.facing === "right")
        && profile.sideAttackTexture
        && this.scene.textures.exists(profile.sideAttackTexture);
      textureKey = useSideAttack ? profile.sideAttackTexture : profile.attackTexture;
      animationKey = useSideAttack ? `${this.animPrefix}-attack-side` : `${this.animPrefix}-attack-front`;
      flip = useSideAttack && this.facing === "left";
    }

    if (this.isAttacking || !textureKey || !this.scene.textures.exists(textureKey)) {
      return false;
    }

    this.isAttacking = true;
    this._currentSpellType = spellType;
    this.setVelocity(0, 0);
    this.setTexture(textureKey, 0);
    this.setFlipX(flip);
    this.setScale(1);
    this.setDepth(this.y + this.depthBias + 4);
    this.play(animationKey, true);

    this.scene.time.delayedCall(profile.melee ? (profile.meleeHitDelay ?? 180) : 170, () => {
      if (!(this.active && this.isAttacking)) return;
      if (profile.melee) {
        // Melee: area-of-effect sword hit just in front of the warrior (no projectile).
        const reach = profile.meleeReach ?? 52;
        const off = { down: [0, reach], up: [0, -reach], left: [-reach, 0], right: [reach, 0] }[this.facing] ?? [0, reach];
        this.scene.applyMeleeDamage?.(this.x + off[0], this.y + off[1], profile.meleeRadius ?? 56);
      } else {
        const spellMap = { fire: "spawnFireball", lightning: "spawnLightningBolt" };
        const spawnMethod = spellMap[this._currentSpellType] ?? profile.projectileSpawn ?? "spawnFireball";
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

  // Spin attack: the warrior braces and swings while the scene whirls swords around
  // him (warriorSpin). The sprite itself does NOT rotate. Reuses existing sprites.
  spin() {
    if (this.isAttacking) return false;
    const profile = this.profile;
    if (!profile.attackTexture || !this.scene.textures.exists(profile.attackTexture)) return false;
    this.isAttacking = true;
    this.setVelocity(0, 0);
    this.setFlipX(false);
    this.angle = 0;
    this.play(`${this.animPrefix}-attack-${this.facing}`, true);
    const finish = () => {
      if (!this.active) return;
      this.isAttacking = false;
      this.playIdle();
    };
    this.once(Phaser.Animations.Events.ANIMATION_COMPLETE, finish);
    this.scene.time.delayedCall(700, () => { if (this.isAttacking) finish(); });
    return true;
  }
}

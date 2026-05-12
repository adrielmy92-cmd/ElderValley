export default class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, "mage-1-sheet", 0);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.speed = 145;
    this.facing = "down";
    this.depthBias = 120;
    this.setScale(1);
    this.body.setSize(18, 14).setOffset(19, 68);
    this.setDepth(y + this.depthBias);
    this.createAnimations(scene);
  }

  createAnimations(scene) {
    const prefix = "mage-1";
    const makeFrames = (row) => Array.from({ length: 8 }, (_, index) => row * 8 + index);
    const defs = [
      [`${prefix}-walk-down`, "mage-1-sheet", makeFrames(0), 10],
      [`${prefix}-walk-left`, "mage-1-sheet", makeFrames(1), 10],
      [`${prefix}-walk-right`, "mage-1-sheet", makeFrames(2), 10],
      [`${prefix}-walk-up`, "mage-1-sheet", makeFrames(3), 10],
      [`${prefix}-idle-down`, "mage-1-idle-sheet", makeFrames(0), 5],
      [`${prefix}-idle-left`, "mage-1-idle-sheet", makeFrames(1), 5],
      [`${prefix}-idle-right`, "mage-1-idle-sheet", makeFrames(2), 5],
      [`${prefix}-idle-up`, "mage-1-idle-sheet", makeFrames(3), 5]
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

      this.play(`mage-1-walk-${this.facing}`, true);
      return;
    }

    this.setVelocity(0, 0);
    this.playIdle();
  }

  playIdle() {
    this.play(`mage-1-idle-${this.facing}`, true);
  }
}

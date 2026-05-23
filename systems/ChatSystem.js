export default class ChatSystem {
  constructor(scene) {
    this.scene = scene;
    this.active = false;
    this.destroyed = false;
    this.messages = [];
    this.maxMessages = 6;
    this.bubbleHideEvent = null;

    this.createDom();
    this.createBubble();
    this.bindEvents();
  }

  createDom() {
    this.root = document.createElement("div");
    this.root.className = "elder-chat";
    this.root.innerHTML = `
      <div class="elder-chat-log"></div>
      <input class="elder-chat-input" maxlength="120" placeholder="Digite sua mensagem..." />
      <div class="elder-chat-help">Enter/T: chat</div>
    `;
    document.body.appendChild(this.root);

    this.logEl = this.root.querySelector(".elder-chat-log");
    this.inputEl = this.root.querySelector(".elder-chat-input");
    this.inputEl.style.display = "none";

    this.ensureStyles();
    this.inputEl.addEventListener("keydown", (event) => this.handleInputKey(event));
    this.inputEl.addEventListener("input", () => {
      this.inputEl.value = this.inputEl.value.replace(/\s+/g, " ").slice(0, 120);
    });
  }

  ensureStyles() {
    if (document.getElementById("elder-chat-style")) {
      return;
    }

    const style = document.createElement("style");
    style.id = "elder-chat-style";
    style.textContent = `
      .elder-chat {
        position: fixed;
        left: 18px;
        bottom: 18px;
        z-index: 20;
        width: min(440px, calc(100vw - 36px));
        pointer-events: none;
        font-family: monospace;
        color: #fff7d6;
        text-shadow: 2px 2px 0 #131820;
      }
      .elder-chat-log {
        display: flex;
        flex-direction: column;
        gap: 4px;
        margin-bottom: 8px;
      }
      .elder-chat-line {
        width: fit-content;
        max-width: 100%;
        padding: 6px 9px;
        background: rgba(14, 18, 25, 0.78);
        border: 1px solid rgba(239, 199, 119, 0.7);
        box-shadow: 0 2px 0 rgba(0, 0, 0, 0.45);
        font-size: 13px;
        line-height: 1.25;
      }
      .elder-chat-input {
        display: block;
        width: 100%;
        box-sizing: border-box;
        pointer-events: auto;
        border: 2px solid #efc777;
        outline: 2px solid #1a1007;
        background: rgba(9, 12, 18, 0.92);
        color: #fff7d6;
        padding: 10px 12px;
        font: 15px monospace;
        text-shadow: none;
      }
      .elder-chat-help {
        width: fit-content;
        padding: 4px 7px;
        background: rgba(10, 15, 22, 0.65);
        color: #e9d5a4;
        font-size: 12px;
      }
    `;
    document.head.appendChild(style);
  }

  createBubble() {
    this.bubble = this.scene.add.container(0, 0).setDepth(6000).setVisible(false);
    this.bubbleBg = this.scene.add.graphics();
    this.bubbleText = this.scene.add.text(0, 0, "", {
      fontFamily: "monospace",
      fontSize: "13px",
      color: "#1c1820",
      wordWrap: { width: 210 },
      align: "center",
      lineSpacing: 2
    }).setOrigin(0.5);
    this.bubble.add([this.bubbleBg, this.bubbleText]);
  }

  bindEvents() {
    this.scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
  }

  handleInputKey(event) {
    event.stopPropagation();
    if (event.key === "Enter") {
      event.preventDefault();
      this.submit();
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      this.close();
    }
  }

  open() {
    if (this.destroyed || this.active || !this.inputEl?.isConnected) {
      return;
    }
    this.active = true;
    this.inputEl.style.display = "block";
    this.inputEl.value = "";
    this.scene.input.keyboard.enabled = false;
    window.setTimeout(() => this.inputEl?.focus(), 0);
  }

  close() {
    if (this.destroyed) {
      return;
    }
    this.active = false;
    if (this.inputEl) {
      this.inputEl.style.display = "none";
      this.inputEl.blur();
    }
    if (this.scene.input?.keyboard) {
      this.scene.input.keyboard.enabled = true;
      this.scene.input.keyboard.resetKeys();
    }
  }

  submit() {
    const message = this.inputEl.value.trim();
    if (!message) {
      this.close();
      return;
    }

    this.addMessage("You", message);
    this.showBubble(message);
    this.scene.multiplayer?.sendChat(message);
    this.close();
  }

  addMessage(author, message) {
    this.messages.push({ author, message });
    if (this.messages.length > this.maxMessages) {
      this.messages.shift();
    }
    this.renderLog();
  }

  renderLog() {
    this.logEl.innerHTML = "";
    this.messages.forEach(({ author, message }) => {
      const line = document.createElement("div");
      line.className = "elder-chat-line";
      line.textContent = `${author}: ${message}`;
      this.logEl.appendChild(line);
    });
  }

  showBubble(message) {
    this.bubbleText.setText(message);
    const bounds = this.bubbleText.getBounds();
    const width = Math.min(240, Math.max(64, bounds.width + 24));
    const height = Math.max(34, bounds.height + 18);

    this.bubbleBg.clear();
    this.bubbleBg.fillStyle(0xfff0c7, 0.95);
    this.bubbleBg.lineStyle(3, 0x3b2416, 1);
    this.bubbleBg.fillRoundedRect(-width / 2, -height / 2, width, height, 8);
    this.bubbleBg.strokeRoundedRect(-width / 2, -height / 2, width, height, 8);
    this.bubbleBg.fillTriangle(-8, height / 2 - 1, 8, height / 2 - 1, 0, height / 2 + 12);
    this.bubbleBg.strokeTriangle(-8, height / 2 - 1, 8, height / 2 - 1, 0, height / 2 + 12);
    this.bubble.setVisible(true);
    this.update();

    this.bubbleHideEvent?.remove(false);
    this.bubbleHideEvent = this.scene.time.delayedCall(4200, () => {
      this.bubble.setVisible(false);
    });
  }

  showBubbleFor(target, message) {
    if (!target) {
      return;
    }

    const container = this.scene.add.container(target.x, target.y - 104).setDepth(6000);
    const bg = this.scene.add.graphics();
    const text = this.scene.add.text(0, 0, message, {
      fontFamily: "monospace",
      fontSize: "13px",
      color: "#1c1820",
      wordWrap: { width: 210 },
      align: "center",
      lineSpacing: 2
    }).setOrigin(0.5);
    container.add([bg, text]);

    const bounds = text.getBounds();
    const width = Math.min(240, Math.max(64, bounds.width + 24));
    const height = Math.max(34, bounds.height + 18);
    bg.fillStyle(0xe8f2ff, 0.95);
    bg.lineStyle(3, 0x243b55, 1);
    bg.fillRoundedRect(-width / 2, -height / 2, width, height, 8);
    bg.strokeRoundedRect(-width / 2, -height / 2, width, height, 8);
    bg.fillTriangle(-8, height / 2 - 1, 8, height / 2 - 1, 0, height / 2 + 12);
    bg.strokeTriangle(-8, height / 2 - 1, 8, height / 2 - 1, 0, height / 2 + 12);

    const followEvent = this.scene.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => {
        if (!target.active) {
          container.destroy();
          followEvent.remove(false);
          return;
        }
        container.setPosition(target.x, target.y - 104);
      }
    });
    this.scene.time.delayedCall(4200, () => {
      followEvent.remove(false);
      container.destroy();
    });
  }

  addSystemMessage(message) {
    this.addMessage("Sistema", message);
  }

  update() {
    if (!this.bubble?.visible || !this.scene.player) {
      return;
    }
    this.bubble.setPosition(this.scene.player.x, this.scene.player.y - 104);
  }

  destroy() {
    this.destroyed = true;
    this.active = false;
    if (this.inputEl) {
      this.inputEl.style.display = "none";
      this.inputEl.blur();
    }
    if (this.scene.input?.keyboard) {
      this.scene.input.keyboard.enabled = true;
      this.scene.input.keyboard.resetKeys();
    }
    this.bubbleHideEvent?.remove(false);
    this.root?.remove();
    this.bubble?.destroy();
  }
}

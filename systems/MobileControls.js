export default class MobileControls {
  constructor(scene) {
    this.scene = scene;
    this.active = false;
    this._held = new Set();
    this._joystickActive = false;
    this._joyOrigin = { x: 0, y: 0 };
    this._joyPointerId = null;

    if (!MobileControls.isTouchDevice()) return;

    this._buildDOM();
    this._attachEvents();
    this.active = true;

    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
    scene.scale.on("resize", () => this._onResize());
    this._onResize();
  }

  static isTouchDevice() {
    return ("ontouchstart" in window) || navigator.maxTouchPoints > 0;
  }

  // ── DOM ────────────────────────────────────────────────────────────────────

  _buildDOM() {
    // Root container
    this.root = document.createElement("div");
    this.root.id = "ev-mobile-controls";
    Object.assign(this.root.style, {
      position: "fixed", inset: "0", pointerEvents: "none",
      zIndex: "9990", userSelect: "none", webkitUserSelect: "none"
    });
    document.body.appendChild(this.root);

    // Joystick zone (left bottom)
    this.joyZone = this._el("div", {
      position: "absolute", left: "0", bottom: "0",
      width: "46%", height: "42%",
      pointerEvents: "auto", touchAction: "none"
    });
    this.root.appendChild(this.joyZone);

    // Joystick base ring (shown while dragging)
    this.joyBase = this._el("div", {
      position: "absolute", display: "none",
      width: "110px", height: "110px", borderRadius: "50%",
      background: "rgba(255,255,255,0.08)",
      border: "2px solid rgba(255,220,100,0.4)",
      boxSizing: "border-box", transform: "translate(-50%,-50%)"
    });
    this.root.appendChild(this.joyBase);

    // Joystick handle
    this.joyHandle = this._el("div", {
      position: "absolute", display: "none",
      width: "52px", height: "52px", borderRadius: "50%",
      background: "rgba(255,200,80,0.55)",
      border: "2px solid rgba(255,220,100,0.8)",
      boxSizing: "border-box", transform: "translate(-50%,-50%)"
    });
    this.root.appendChild(this.joyHandle);

    // Hint arrows inside joy zone
    this.joyHint = this._el("div", {
      position: "absolute", left: "50%", bottom: "28%",
      transform: "translateX(-50%)",
      fontSize: "28px", opacity: "0.18", pointerEvents: "none",
      lineHeight: "1"
    });
    this.joyHint.textContent = "✛";
    this.joyZone.appendChild(this.joyHint);

    // Button zone (right bottom)
    this.btnZone = this._el("div", {
      position: "absolute", right: "0", bottom: "0",
      width: "46%", height: "42%",
      pointerEvents: "auto", touchAction: "none"
    });
    this.root.appendChild(this.btnZone);

    // Action buttons
    this.btnInteract = this._makeButton("E", "#ffd574", "Interact");
    this.btnFire     = this._makeButton("🔥", "#ff7722", "Fire");
    this.btnLight    = this._makeButton("⚡", "#61b7ff", "Lightning");
    this.btnChat     = this._makeButton("💬", "#7ed98a", "Chat");

    this.btnZone.appendChild(this.btnInteract);
    this.btnZone.appendChild(this.btnFire);
    this.btnZone.appendChild(this.btnLight);
    this.btnZone.appendChild(this.btnChat);

    this._positionButtons();
  }

  _el(tag, styles = {}) {
    const el = document.createElement(tag);
    Object.assign(el.style, styles);
    return el;
  }

  _makeButton(label, color, title) {
    const btn = document.createElement("button");
    btn.textContent = label;
    btn.title = title;
    Object.assign(btn.style, {
      position: "absolute",
      width: "58px", height: "58px", borderRadius: "50%",
      background: "rgba(10,16,26,0.82)",
      border: `2px solid ${color}`,
      color, fontSize: "22px", fontFamily: "monospace",
      lineHeight: "1", cursor: "pointer",
      outline: "none", touchAction: "manipulation",
      webkitTapHighlightColor: "transparent",
      transition: "transform 0.08s, background 0.08s",
      display: "flex", alignItems: "center", justifyContent: "center",
      boxShadow: `0 0 10px ${color}44`
    });
    return btn;
  }

  _positionButtons() {
    const w = this.btnZone.offsetWidth || window.innerWidth * 0.46;
    const h = this.btnZone.offsetHeight || window.innerHeight * 0.42;
    const cx = w * 0.5, cy = h * 0.5;
    const r = Math.min(w, h) * 0.28;

    // Interact: center
    Object.assign(this.btnInteract.style, {
      left: `${cx - 38}px`, bottom: `${h * 0.42}px`,
      width: "76px", height: "76px", fontSize: "26px"
    });
    // Fire: upper-left of group
    Object.assign(this.btnFire.style, {
      left: `${cx - r - 30}px`, bottom: `${h * 0.55}px`
    });
    // Lightning: upper-right
    Object.assign(this.btnLight.style, {
      left: `${cx + r - 28}px`, bottom: `${h * 0.55}px`
    });
    // Chat: bottom-center
    Object.assign(this.btnChat.style, {
      left: `${cx - 28}px`, bottom: `${h * 0.08}px`,
      width: "46px", height: "46px", fontSize: "18px"
    });
  }

  _onResize() {
    this._positionButtons();
  }

  // ── Events ────────────────────────────────────────────────────────────────

  _attachEvents() {
    // Joystick
    this.joyZone.addEventListener("touchstart",  (e) => this._joyStart(e),  { passive: false });
    this.joyZone.addEventListener("touchmove",   (e) => this._joyMove(e),   { passive: false });
    this.joyZone.addEventListener("touchend",    (e) => this._joyEnd(e),    { passive: false });
    this.joyZone.addEventListener("touchcancel", (e) => this._joyEnd(e),    { passive: false });

    // Action buttons
    this._bindBtn(this.btnInteract, "e",      "KeyE",    69);
    this._bindBtn(this.btnFire,     "1",      "Digit1",  49);
    this._bindBtn(this.btnLight,    "2",      "Digit2",  50);
    this._bindBtn(this.btnChat,     "t",      "KeyT",    84);
  }

  _bindBtn(btn, key, code, keyCode) {
    btn.addEventListener("touchstart", (e) => {
      e.preventDefault();
      btn.style.background = "rgba(255,255,255,0.18)";
      btn.style.transform = "scale(0.9)";
      this._press(key, code, keyCode);
    }, { passive: false });

    const release = (e) => {
      e.preventDefault();
      btn.style.background = "rgba(10,16,26,0.82)";
      btn.style.transform = "scale(1)";
      this._release(key, code, keyCode);
    };
    btn.addEventListener("touchend",    release, { passive: false });
    btn.addEventListener("touchcancel", release, { passive: false });
  }

  // ── Joystick ──────────────────────────────────────────────────────────────

  _joyStart(e) {
    e.preventDefault();
    if (this._joyPointerId !== null) return;
    const t = e.changedTouches[0];
    this._joyPointerId = t.identifier;
    const rect = this.joyZone.getBoundingClientRect();
    this._joyOrigin = { x: t.clientX - rect.left, y: t.clientY - rect.top };

    // Show base
    this.joyBase.style.display = "block";
    this.joyBase.style.left = `${t.clientX}px`;
    this.joyBase.style.top  = `${t.clientY}px`;
    this.joyHandle.style.display = "block";
    this.joyHandle.style.left = `${t.clientX}px`;
    this.joyHandle.style.top  = `${t.clientY}px`;
    this.joyHint.style.opacity = "0";
  }

  _joyMove(e) {
    e.preventDefault();
    if (this._joyPointerId === null) return;
    const t = [...e.changedTouches].find(ct => ct.identifier === this._joyPointerId);
    if (!t) return;

    const rect  = this.joyZone.getBoundingClientRect();
    const ox    = this._joyOrigin.x + rect.left;
    const oy    = this._joyOrigin.y + rect.top;
    const dx    = t.clientX - ox;
    const dy    = t.clientY - oy;
    const dist  = Math.hypot(dx, dy);
    const maxR  = 52;
    const clamp = Math.min(dist, maxR);
    const angle = Math.atan2(dy, dx);
    const hx    = ox + Math.cos(angle) * clamp;
    const hy    = oy + Math.sin(angle) * clamp;

    this.joyHandle.style.left = `${hx}px`;
    this.joyHandle.style.top  = `${hy}px`;

    // Threshold: 20% of maxR to start moving
    const threshold = maxR * 0.2;
    const nx = dist > threshold ? dx / dist : 0;
    const ny = dist > threshold ? dy / dist : 0;

    this._updateJoyKeys(nx, ny);
  }

  _joyEnd(e) {
    e.preventDefault();
    const found = [...e.changedTouches].find(ct => ct.identifier === this._joyPointerId);
    if (!found) return;
    this._joyPointerId = null;
    this._updateJoyKeys(0, 0);
    this.joyBase.style.display   = "none";
    this.joyHandle.style.display = "none";
    this.joyHint.style.opacity   = "0.18";
  }

  _updateJoyKeys(nx, ny) {
    const DIAG = 0.42; // diagonal threshold
    this._setKey("w", "KeyW", 87,        ny < -DIAG);
    this._setKey("s", "KeyS", 83,        ny >  DIAG);
    this._setKey("a", "KeyA", 65,        nx < -DIAG);
    this._setKey("d", "KeyD", 68,        nx >  DIAG);
    this._setKey("ArrowUp",    "ArrowUp",    38, ny < -DIAG);
    this._setKey("ArrowDown",  "ArrowDown",  40, ny >  DIAG);
    this._setKey("ArrowLeft",  "ArrowLeft",  37, nx < -DIAG);
    this._setKey("ArrowRight", "ArrowRight", 39, nx >  DIAG);
  }

  // ── Key dispatch ──────────────────────────────────────────────────────────

  _setKey(key, code, keyCode, down) {
    const wasDown = this._held.has(key);
    if (down && !wasDown)  this._press(key, code, keyCode);
    if (!down && wasDown) this._release(key, code, keyCode);
  }

  _press(key, code, keyCode) {
    this._held.add(key);
    window.dispatchEvent(new KeyboardEvent("keydown", {
      key, code, keyCode, which: keyCode,
      bubbles: true, cancelable: true
    }));
  }

  _release(key, code, keyCode) {
    this._held.delete(key);
    window.dispatchEvent(new KeyboardEvent("keyup", {
      key, code, keyCode, which: keyCode,
      bubbles: true, cancelable: true
    }));
  }

  _releaseAll() {
    const MAP = {
      w: ["w","KeyW",87], s: ["s","KeyS",83],
      a: ["a","KeyA",65], d: ["d","KeyD",68],
      ArrowUp:    ["ArrowUp","ArrowUp",38],
      ArrowDown:  ["ArrowDown","ArrowDown",40],
      ArrowLeft:  ["ArrowLeft","ArrowLeft",37],
      ArrowRight: ["ArrowRight","ArrowRight",39]
    };
    for (const key of [...this._held]) {
      const entry = MAP[key];
      if (entry) this._release(...entry);
    }
    this._held.clear();
  }

  destroy() {
    this._releaseAll();
    this.root?.remove();
    this.active = false;
  }
}

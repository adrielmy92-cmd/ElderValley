// Player leveling (server-authoritative for everyone). XP is granted by the
// server on enemy death / work and pushed over the WS `xp` message; points are
// spent through /api/xp/allocate. This client object is a cache + the place that
// maps attribute points to concrete gameplay bonuses (HP / attack / speed / regen).
const POINTS_PER_LEVEL = 5;
const MAX_LEVEL = 99;
const VIT_HP = 10;       // +Max HP per Vitality point
const VIT_REGEN = 0.2;   // +HP/sec per Vitality point
const STR_ATK = 2;       // +attack per Strength point
const AGI_SPD = 2;       // +move speed per Agility point
const AGI_SPD_CAP = 60;  // capped so it never gets absurd

function xpForLevel(level) {
  return Math.floor(80 * Math.pow(Math.max(1, level), 1.35)); // matches the server curve
}

export default class Leveling {
  constructor(scene) {
    this.scene = scene;
    this.level = 1;
    this.xp = 0;
    this.unspent = 0;
    this.attr = { vit: 0, str: 0, agi: 0 };
    this.xpNext = xpForLevel(1);
    this.load();
  }

  _pid() { return this.scene.getPlayerProfileId?.() ?? "guest"; }

  load() {
    const p = this.scene.registry?.get("playerProfile");
    if (p) this._apply(p);
  }

  _apply(d) {
    if (!d) return;
    this.level = Math.max(1, Math.floor(Number(d.level) || 1));
    this.xp = Math.max(0, Math.floor(Number(d.xp) || 0));
    this.unspent = Math.max(0, Math.floor(Number(d.unspent) || 0));
    this.attr = {
      vit: Math.max(0, Math.floor(Number(d.attr?.vit) || 0)),
      str: Math.max(0, Math.floor(Number(d.attr?.str) || 0)),
      agi: Math.max(0, Math.floor(Number(d.attr?.agi) || 0))
    };
    this.xpNext = typeof d.xpNext === "number"
      ? d.xpNext
      : (this.level >= MAX_LEVEL ? 0 : xpForLevel(this.level));
    // Keep registry.playerProfile fresh so the NEXT scene hydrates the right level
    // (otherwise a scene change re-reads the stale login-time profile and shows Lv 1).
    const p = this.scene.registry?.get("playerProfile");
    if (p) this.scene.registry.set("playerProfile", {
      ...p, level: this.level, xp: this.xp, unspent: this.unspent, attr: { ...this.attr }, xpNext: this.xpNext
    });
  }

  // Apply an authoritative leveling payload (WS `xp` push or allocate reply) and
  // refresh everything that depends on it.
  applyServer(d) {
    this._apply(d);
    this.scene.recomputeStats?.();
    this.scene.applyMoveSpeed?.();
    this.scene.updateXpHud?.();
  }

  // ── attribute → gameplay bonuses ──────────────────────────────────────────────
  bonusHp() { return this.attr.vit * VIT_HP; }
  bonusAttack() { return this.attr.str * STR_ATK; }
  bonusSpeed() { return Math.min(AGI_SPD_CAP, this.attr.agi * AGI_SPD); }
  regenPerSec() { return this.attr.vit * VIT_REGEN; }

  progress() { return this.xpNext > 0 ? Math.max(0, Math.min(1, this.xp / this.xpNext)) : 1; }

  // Spend one point (optimistic, reconciled against the server reply).
  async allocate(attr) {
    if (!["vit", "str", "agi"].includes(attr) || this.unspent <= 0) return false;
    this.unspent -= 1;
    this.attr[attr] += 1;
    this.scene.recomputeStats?.();
    this.scene.applyMoveSpeed?.();
    this.scene.updateXpHud?.();
    try {
      const r = await fetch("/api/xp/allocate", {
        method: "POST",
        headers: this.scene.getSessionHeaders?.({ "Content-Type": "application/json" }) ?? { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId: this._pid(), attribute: attr })
      });
      const d = await r.json();
      if (d?.ok) this._apply(d);
      else await this._pull();
    } catch {
      // keep optimistic state; a later sync corrects it
    }
    this.scene.recomputeStats?.();
    this.scene.applyMoveSpeed?.();
    this.scene.updateXpHud?.();
    return true;
  }

  async _pull() {
    try {
      const r = await fetch(`/api/profile/${encodeURIComponent(this._pid())}`, {
        cache: "no-store",
        headers: this.scene.getSessionHeaders?.() ?? {}
      });
      const d = await r.json();
      if (d?.profile) this._apply(d.profile);
    } catch { /* ignore */ }
  }
}

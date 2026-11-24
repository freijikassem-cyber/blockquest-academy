// BlockQuest engine: world simulation + canvas renderer. Original art, drawn in code.
(function () {
  const N = 8, T = 60;
  const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // N E S W
  const DIR_INDEX = { N: 0, E: 1, S: 2, W: 3 };
  const ITEM_NAMES = { wood: "wood", stone: "stone", gem: "gems" };

  class Stop extends Error {}
  class GameError extends Error {}

  // ---------- simulation ----------
  class World {
    constructor(level) {
      this.level = level;
      this.ground = []; this.obj = []; this.flag = null;
      for (let y = 0; y < N; y++) {
        this.ground.push([]); this.obj.push([]);
        for (let x = 0; x < N; x++) {
          const ch = level.grid[y][x];
          this.ground[y][x] = ch === "~" ? "water" : ch === "^" ? "lava" : ch === "," ? "sand" : "grass";
          this.obj[y][x] = ch === "T" ? "tree" : ch === "R" ? "rock" : ch === "O" ? "ore" : ch === "*" ? "gem" : null;
          if (ch === "F") this.flag = [x, y];
        }
      }
      this.hero = { x: level.start[0], y: level.start[1], dir: DIR_INDEX[level.start[2]] };
      this.inv = { wood: 0, stone: 0, gem: 0 };
      this.events = []; this.count = 0; this.dead = false; this.block = null; this.line = null;
    }
    aheadCell() { const d = DIRS[this.hero.dir]; return [this.hero.x + d[0], this.hero.y + d[1]]; }
    sense() {
      const [x, y] = this.aheadCell();
      if (x < 0 || y < 0 || x >= N || y >= N) return "edge";
      const o = this.obj[y][x];
      if (o === "tree" || o === "rock" || o === "ore") return o;
      const g = this.ground[y][x];
      return g === "water" || g === "lava" ? g : "empty";
    }
    atGoal() { return !!this.flag && this.hero.x === this.flag[0] && this.hero.y === this.flag[1]; }
    emit(ev) { ev.block = this.block; this.events.push(ev); }
    act(kind, arg) {
      if (this.dead) throw new Stop();
      if (++this.count > 300) throw new GameError("Bolt did more than 300 actions and ran out of battery. Is there a loop that never ends?");
      const h = this.hero, [ax, ay] = this.aheadCell(), s = this.sense();
      if (kind === "left" || kind === "right") {
        h.dir = (h.dir + (kind === "left" ? 3 : 1)) % 4;
        this.emit({ t: "turn", dir: h.dir });
      } else if (kind === "forward") {
        if (s === "edge" || s === "tree" || s === "rock" || s === "ore") return this.emit({ t: "bump", what: s });
        if (s === "water" || s === "lava") {
          this.dead = true;
          this.emit({ t: "fail", to: [ax, ay], why: s });
          throw new Stop();
        }
        h.x = ax; h.y = ay;
        const pickup = this.obj[ay][ax] === "gem";
        if (pickup) { this.obj[ay][ax] = null; this.inv.gem++; }
        this.emit({ t: "move", to: [ax, ay], pickup });
      } else if (kind === "mine") {
        const got = s === "tree" ? "wood" : s === "rock" ? "stone" : s === "ore" ? "gem" : null;
        if (got) { this.obj[ay][ax] = null; this.inv[got]++; }
        this.emit({ t: "mine", at: [ax, ay], got });
      } else if (kind === "place") {
        const what = arg === "stone" ? "stone" : "plank";
        if (s === "water" || s === "lava") { this.ground[ay][ax] = what; this.emit({ t: "place", at: [ax, ay], what, floor: true }); }
        else if (s === "empty" && this.obj[ay][ax] !== "gem" && !(this.flag && this.flag[0] === ax && this.flag[1] === ay)) {
          this.obj[ay][ax] = "rock"; this.emit({ t: "place", at: [ax, ay], what, floor: false });
        } else this.emit({ t: "bump" });
      }
    }
    result() {
      const need = this.level.goal.collect || {};
      const missing = [];
      for (const k in need) if (this.inv[k] < need[k]) missing.push(`${need[k] - this.inv[k]} more ${ITEM_NAMES[k]}`);
      if (this.flag && !this.atGoal()) missing.push("to reach the flag");
      return { done: !this.dead && missing.length === 0, missing };
    }
  }

  function goalText(level) {
    const need = level.goal.collect || {}, parts = [];
    for (const k in need) parts.push(`collect ${need[k]} ${ITEM_NAMES[k]}`);
    if (level.grid.some((r) => r.includes("F"))) parts.push("reach the flag");
    const s = parts.join(" and ");
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  // ---------- renderer ----------
  const hash = (x, y, i) => { let h = (x * 374761393 + y * 668265263 + i * 2147483647) | 0; h = (h ^ (h >> 13)) * 1274126177; return ((h ^ (h >> 16)) >>> 0) / 4294967295; };
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }

  class Renderer {
    constructor(canvas) {
      this.canvas = canvas; this.ctx = canvas.getContext("2d");
      this.particles = []; this.anim = null; this.speed = 1; this.token = 0;
      const loop = (t) => { this.frame(t); this.raf = requestAnimationFrame(loop); };
      this.raf = requestAnimationFrame(loop);
    }
    load(level) {
      this.token++; this.anim = null; this.particles = [];
      const w = new World(level);
      this.level = level; this.ground = w.ground; this.obj = w.obj; this.flag = w.flag; this.inv = w.inv;
      this.hero = { fx: w.hero.x, fy: w.hero.y, dir: w.hero.dir, walk: 0, jump: 0, sink: 0, shake: 0, mine: 0, visible: true };
      this.onInv && this.onInv(this.inv);
    }
    animate(dur, fn) {
      const token = this.token;
      return new Promise((resolve) => { this.anim = { t0: performance.now(), dur: dur / this.speed, fn, resolve, token }; });
    }
    burst(x, y, colors, n, power = 2.2) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, v = Math.random() * power + 0.6;
        this.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1.5, life: 1, size: 3 + Math.random() * 4, color: colors[i % colors.length] });
      }
    }
    async play(events, onStep) {
      const token = this.token, h = this.hero;
      for (const ev of events) {
        if (token !== this.token) return false;
        onStep && onStep(ev);
        if (ev.t === "turn") { h.dir = ev.dir; await this.animate(170, () => {}); }
        else if (ev.t === "move") {
          const sx = h.fx, sy = h.fy;
          await this.animate(280, (p) => { h.fx = sx + (ev.to[0] - sx) * p; h.fy = sy + (ev.to[1] - sy) * p; h.walk = p; });
          h.walk = 0;
          if (ev.pickup) { this.obj[ev.to[1]][ev.to[0]] = null; this.inv.gem++; this.burst(ev.to[0] * T + 30, ev.to[1] * T + 30, ["#49e0f5", "#ffffff", "#9af3ff"], 14); this.onInv && this.onInv(this.inv); }
        } else if (ev.t === "bump") { await this.animate(220, (p) => { h.shake = Math.sin(p * Math.PI * 4) * 3 * (1 - p); }); h.shake = 0; }
        else if (ev.t === "mine") {
          await this.animate(300, (p) => { h.mine = p; });
          h.mine = 0;
          if (ev.got) {
            const was = this.obj[ev.at[1]][ev.at[0]];
            this.obj[ev.at[1]][ev.at[0]] = null; this.inv[ev.got]++;
            this.burst(ev.at[0] * T + 30, ev.at[1] * T + 30, was === "tree" ? ["#2f8f3a", "#7a4a21", "#3fae4c"] : was === "ore" ? ["#49e0f5", "#a3a9b3", "#ffffff"] : ["#7d838c", "#a3a9b3", "#5c6169"], 16);
            this.onInv && this.onInv(this.inv);
          }
        } else if (ev.t === "place") {
          await this.animate(200, (p) => { h.mine = p * 0.6; });
          h.mine = 0;
          if (ev.floor) this.ground[ev.at[1]][ev.at[0]] = ev.what; else this.obj[ev.at[1]][ev.at[0]] = "rock";
          this.burst(ev.at[0] * T + 30, ev.at[1] * T + 30, ev.what === "plank" ? ["#b98850", "#d9a86c"] : ["#8c8f96", "#b4b7bd"], 8, 1.4);
        } else if (ev.t === "fail") {
          const sx = h.fx, sy = h.fy;
          await this.animate(240, (p) => { h.fx = sx + (ev.to[0] - sx) * p; h.fy = sy + (ev.to[1] - sy) * p; h.walk = p; });
          this.burst(ev.to[0] * T + 30, ev.to[1] * T + 34, ev.why === "water" ? ["#bfe3ff", "#ffffff", "#3f8fd6"] : ["#ffd23f", "#ff7b2e", "#e2572b"], 22, 3);
          await this.animate(500, (p) => { h.sink = p; });
        }
      }
      return token === this.token;
    }
    async celebrate() {
      const h = this.hero;
      for (let i = 0; i < 4; i++) this.burst(60 + Math.random() * 360, 80 + Math.random() * 200, ["#ffd23f", "#ff5d73", "#49e0f5", "#7be07b", "#ffffff"], 18, 3.4);
      await this.animate(900, (p) => { h.jump = Math.abs(Math.sin(p * Math.PI * 3)) * 14 * (1 - p * 0.4); });
      h.jump = 0;
    }

    // ----- drawing -----
    frame(now) {
      const ctx = this.ctx;
      if (!this.level) return;
      if (this.anim) {
        const a = this.anim, p = Math.min((now - a.t0) / a.dur, 1);
        if (a.token === this.token) a.fn(p);
        if (p >= 1) { this.anim = null; a.resolve(); }
      }
      ctx.imageSmoothingEnabled = false;
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) this.tile(ctx, x, y, now);
      if (this.flag) this.drawFlag(ctx, this.flag[0] * T, this.flag[1] * T, now);
      // objects and hero, back to front
      const hy = Math.round(this.hero.fy);
      for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) { const o = this.obj[y][x]; if (o) this.object(ctx, o, x * T, y * T, now, x, y); }
        if (y === hy) this.drawHero(ctx, now);
      }
      for (const p of this.particles) {
        p.x += p.vx; p.y += p.vy; p.vy += 0.16; p.life -= 0.022;
        ctx.globalAlpha = Math.max(p.life, 0); ctx.fillStyle = p.color; ctx.fillRect(p.x | 0, p.y | 0, p.size | 0, p.size | 0);
      }
      ctx.globalAlpha = 1;
      this.particles = this.particles.filter((p) => p.life > 0);
    }
    tile(ctx, x, y, now) {
      const g = this.ground[y][x], px = x * T, py = y * T;
      if (g === "grass") {
        ctx.fillStyle = (x + y) % 2 ? "#63b84f" : "#5cae49"; ctx.fillRect(px, py, T, T);
        for (let i = 0; i < 5; i++) { ctx.fillStyle = i % 2 ? "#4f9a40" : "#78cc62"; ctx.fillRect(px + ((hash(x, y, i) * 52) | 0) + 2, py + ((hash(y, x, i + 9) * 52) | 0) + 2, 4, 4); }
      } else if (g === "sand") {
        ctx.fillStyle = (x + y) % 2 ? "#e6d397" : "#dfca8a"; ctx.fillRect(px, py, T, T);
        for (let i = 0; i < 4; i++) { ctx.fillStyle = "#cdb673"; ctx.fillRect(px + ((hash(x, y, i) * 52) | 0) + 2, py + ((hash(y, x, i + 3) * 52) | 0) + 2, 3, 3); }
      } else if (g === "water") {
        ctx.fillStyle = "#3b86cf"; ctx.fillRect(px, py, T, T);
        ctx.fillStyle = "#6fb4ee";
        for (let i = 0; i < 3; i++) { const off = ((now / 40 + hash(x, y, i) * 60) % 72) - 12; ctx.fillRect(px + Math.max(off, 0), py + 10 + i * 18, Math.max(Math.min(14, T - off, off + 14), 0), 3); }
      } else if (g === "lava") {
        ctx.fillStyle = "#d9481f"; ctx.fillRect(px, py, T, T);
        for (let i = 0; i < 4; i++) {
          const s = 5 + Math.sin(now / 300 + hash(x, y, i) * 6.3) * 3;
          ctx.fillStyle = i % 2 ? "#ffd23f" : "#ff8a2b";
          ctx.fillRect(px + ((hash(x, y, i) * 44) | 0) + 4, py + ((hash(y, x, i + 5) * 44) | 0) + 4, s | 0, s | 0);
        }
      } else if (g === "plank") {
        ctx.fillStyle = "#b98850"; ctx.fillRect(px, py, T, T);
        ctx.fillStyle = "#8f6535"; for (let i = 0; i < 4; i++) ctx.fillRect(px, py + i * 15, T, 2);
        ctx.fillRect(px + 20, py, 2, 15); ctx.fillRect(px + 40, py + 15, 2, 15); ctx.fillRect(px + 14, py + 30, 2, 15); ctx.fillRect(px + 34, py + 45, 2, 15);
      } else if (g === "stone") {
        ctx.fillStyle = "#8c8f96"; ctx.fillRect(px, py, T, T);
        ctx.fillStyle = "#6f7279"; for (let i = 0; i < 3; i++) ctx.fillRect(px, py + i * 20, T, 2);
        ctx.fillRect(px + 30, py, 2, 20); ctx.fillRect(px + 15, py + 20, 2, 20); ctx.fillRect(px + 45, py + 20, 2, 20); ctx.fillRect(px + 30, py + 40, 2, 20);
      }
    }
    object(ctx, o, px, py, now, x, y) {
      if (o === "tree") {
        ctx.fillStyle = "rgba(0,0,0,.18)"; ctx.fillRect(px + 12, py + 48, 36, 8);
        ctx.fillStyle = "#7a4a21"; ctx.fillRect(px + 24, py + 30, 12, 22);
        ctx.fillStyle = "#5e3716"; ctx.fillRect(px + 32, py + 30, 4, 22);
        ctx.fillStyle = "#2f8f3a"; ctx.fillRect(px + 8, py + 2, 44, 34);
        ctx.fillStyle = "#43b552"; ctx.fillRect(px + 8, py + 2, 44, 9);
        ctx.fillStyle = "#237530"; ctx.fillRect(px + 8, py + 29, 44, 7);
        ctx.fillStyle = "#58c966"; ctx.fillRect(px + 14, py + 14, 6, 6); ctx.fillRect(px + 36, py + 18, 6, 6);
        if (hash(x, y, 1) > 0.5) { ctx.fillStyle = "#ff5d73"; ctx.fillRect(px + 26, py + 20, 5, 5); ctx.fillRect(px + 42, py + 10, 5, 5); }
      } else if (o === "rock" || o === "ore") {
        ctx.fillStyle = "rgba(0,0,0,.18)"; ctx.fillRect(px + 8, py + 50, 46, 7);
        ctx.fillStyle = "#7d838c"; ctx.fillRect(px + 7, py + 10, 46, 42);
        ctx.fillStyle = "#a9afb9"; ctx.fillRect(px + 7, py + 10, 46, 12);
        ctx.fillStyle = "#5c6169"; ctx.fillRect(px + 7, py + 44, 46, 8); ctx.fillRect(px + 20, py + 26, 10, 3); ctx.fillRect(px + 34, py + 34, 8, 3);
        if (o === "ore") {
          const tw = Math.sin(now / 250 + x) > 0.6;
          ctx.fillStyle = "#49e0f5"; ctx.fillRect(px + 13, py + 27, 9, 9); ctx.fillRect(px + 36, py + 24, 9, 9); ctx.fillRect(px + 26, py + 36, 8, 8);
          ctx.fillStyle = tw ? "#ffffff" : "#b8f6ff"; ctx.fillRect(px + 13, py + 27, 4, 4); ctx.fillRect(px + 36, py + 24, 4, 4); ctx.fillRect(px + 26, py + 36, 3, 3);
        }
      } else if (o === "gem") {
        const b = Math.sin(now / 280 + x * 2 + y) * 3, cx = px + 30, cy = py + 28 + b;
        ctx.fillStyle = "rgba(0,0,0,.2)"; ctx.fillRect(px + 21, py + 46, 18, 5);
        ctx.fillStyle = "#1fb6d1"; ctx.beginPath(); ctx.moveTo(cx, cy - 13); ctx.lineTo(cx + 11, cy); ctx.lineTo(cx, cy + 13); ctx.lineTo(cx - 11, cy); ctx.fill();
        ctx.fillStyle = "#6ff0ff"; ctx.beginPath(); ctx.moveTo(cx, cy - 13); ctx.lineTo(cx + 11, cy); ctx.lineTo(cx, cy); ctx.lineTo(cx - 11, cy); ctx.fill();
        ctx.fillStyle = "#ffffff"; ctx.fillRect(cx - 4, cy - 6, 4, 4);
      }
    }
    drawFlag(ctx, px, py, now) {
      const pulse = 0.35 + Math.sin(now / 300) * 0.15;
      ctx.fillStyle = `rgba(255,210,63,${pulse})`; ctx.fillRect(px + 4, py + 4, 52, 52);
      ctx.strokeStyle = "#ffd23f"; ctx.lineWidth = 3; ctx.strokeRect(px + 5.5, py + 5.5, 49, 49);
      ctx.fillStyle = "#4a3a2a"; ctx.fillRect(px + 16, py + 8, 4, 44);
      const w = Math.sin(now / 180) * 3;
      ctx.fillStyle = "#ff5d73"; ctx.beginPath(); ctx.moveTo(px + 20, py + 9); ctx.lineTo(px + 46 + w, py + 16); ctx.lineTo(px + 20, py + 27); ctx.fill();
      ctx.fillStyle = "#ffd23f"; ctx.fillRect(px + 24, py + 15, 5, 5);
    }
    drawHero(ctx, now) {
      const h = this.hero; if (!h.visible) return;
      const walking = h.walk > 0 && h.walk < 1;
      const bob = walking ? Math.abs(Math.sin(h.walk * Math.PI * 2)) * 3 : Math.sin(now / 320) * 1.2;
      const d = DIRS[h.dir];
      const px = h.fx * T + h.shake * (d[0] || 1) * (d[1] ? 0 : 1), py = h.fy * T + (d[1] ? h.shake : 0);
      ctx.save();
      ctx.translate(px + 30, py + 52);
      if (h.sink) { ctx.globalAlpha = 1 - h.sink; ctx.scale(1 - h.sink * 0.5, 1 - h.sink * 0.7); }
      ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.beginPath(); ctx.ellipse(0, 0, 16 - h.jump * 0.3, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.translate(-30, -52 - bob - h.jump);
      // drill arm reaching toward the block being mined / placed
      if (h.mine) {
        const reach = 10 + Math.sin(h.mine * Math.PI) * 16, jit = Math.sin(now / 18) * 1.5;
        ctx.fillStyle = "#2b3a55"; ctx.fillRect(27 + d[0] * reach + jit, 30 + d[1] * reach, 7, 7);
        ctx.fillStyle = "#ffd23f"; ctx.fillRect(28 + d[0] * (reach + 6) + jit, 31 + d[1] * (reach + 6), 5, 5);
      }
      const step = walking ? Math.sin(h.walk * Math.PI * 4) * 3 : 0;
      ctx.fillStyle = "#2b3a55"; ctx.fillRect(18, 44 - Math.max(step, 0), 9, 8); ctx.fillRect(33, 44 + Math.min(step, 0), 9, 8);
      ctx.fillStyle = "#19b5a5"; rr(ctx, 15, 27, 30, 19, 5); ctx.fill();
      ctx.fillStyle = "#12897d"; ctx.fillRect(15, 40, 30, 4);
      ctx.fillStyle = "#19b5a5"; ctx.fillRect(8, 15, 5, 9); ctx.fillRect(47, 15, 5, 9);
      ctx.fillStyle = "#f2f6f7"; rr(ctx, 12, 8, 36, 22, 7); ctx.fill();
      ctx.strokeStyle = "#2b3a55"; ctx.lineWidth = 2; ctx.stroke();
      const blink = now % 3400 < 130;
      ctx.fillStyle = "#1d2b44";
      if (h.dir === 2) { rr(ctx, 17, 13, 26, 12, 5); ctx.fill(); if (!blink) { ctx.fillStyle = "#5ef2ff"; ctx.fillRect(22, 16, 5, 6); ctx.fillRect(33, 16, 5, 6); } ctx.fillStyle = "#ffd23f"; ctx.fillRect(28, 33, 5, 5); }
      else if (h.dir === 1) { rr(ctx, 28, 13, 19, 12, 5); ctx.fill(); if (!blink) { ctx.fillStyle = "#5ef2ff"; ctx.fillRect(38, 16, 5, 6); } }
      else if (h.dir === 3) { rr(ctx, 13, 13, 19, 12, 5); ctx.fill(); if (!blink) { ctx.fillStyle = "#5ef2ff"; ctx.fillRect(17, 16, 5, 6); } }
      else { ctx.fillStyle = "#c9d3d6"; ctx.fillRect(20, 14, 20, 2); ctx.fillRect(20, 19, 20, 2); ctx.fillRect(20, 24, 20, 2); ctx.fillStyle = "#12897d"; ctx.fillRect(24, 31, 12, 8); }
      ctx.fillStyle = "#2b3a55"; ctx.fillRect(29, 2, 2, 7);
      ctx.fillStyle = "#ff9f1c"; ctx.beginPath(); ctx.arc(30, 2 + Math.sin(now / 200) * 0.8, 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
  }

  window.BQ = { World, Renderer, Stop, GameError, goalText, N, T };
})();

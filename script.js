(() => {
  const canvas = document.getElementById("heartCanvas");
  const ctx = canvas.getContext("2d", { alpha: true, desynchronized: true });
  const replayBtn = document.getElementById("replayBtn");

  let width = 0, height = 0, particles = [], stars = [];
  let startTime = performance.now(), rafId = 0, lastFrame = 0;
  let frameSamples = 0, frameTotal = 0, quality = 1;
  const rand = (a, b) => a + Math.random() * (b - a);
  const isMobile = matchMedia("(max-width: 700px)").matches;
  const BASE_COUNT = isMobile ? 760 : 1150;
  const STAR_COUNT = isMobile ? 45 : 75;

  function heartPoint(t) {
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = 13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t);
    return { x: x / 18, y: -y / 18 };
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    // Lower backing resolution substantially reduces fill and compositing cost on phones.
    const dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1.25 : 1.5);
    width = rect.width;
    height = rect.height;
    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    stars = Array.from({ length: STAR_COUNT }, () => ({
      x: Math.random() * width, y: Math.random() * height,
      r: rand(.35, 1), a: rand(.15, .55), phase: rand(0, Math.PI * 2)
    }));
    makeParticles();
  }

  function makeParticles() {
    const scale = Math.min(width * .34, height * .38, 230);
    const count = Math.max(420, Math.round(BASE_COUNT * quality));
    particles = Array.from({ length: count }, () => {
      const p = heartPoint(Math.random() * Math.PI * 2);
      const edge = Math.random() < .34;
      const factor = edge ? 1 + rand(-.035, .035) : Math.sqrt(Math.random()) * .96;
      const tx = width / 2 + p.x * scale * factor;
      const ty = height * .43 + p.y * scale * factor;
      const angle = rand(0, Math.PI * 2);
      const distance = rand(80, Math.max(width, height) * .65);
      const palette = Math.random();
      return {
        tx, ty,
        x: width/2 + Math.cos(angle)*distance,
        y: height/2 + Math.sin(angle)*distance,
        size: rand(.65, 1.55),
        // Three fixed palette groups let the renderer batch paths efficiently.
        color: palette < .28 ? "rgba(55,165,255,.82)" :
               palette < .72 ? "rgba(35,195,255,.88)" : "rgba(130,225,255,.94)",
        phase: rand(0, Math.PI*2), speed: rand(.65, 1.35), delay: rand(0, 1.2)
      };
    });
  }

  function draw(now) {
    if (!width || !height) {
      rafId = requestAnimationFrame(draw);
      return;
    }

    // Adapt quality if the device cannot sustain a smooth frame cadence.
    if (lastFrame) {
      const dt = now - lastFrame;
      frameTotal += dt;
      frameSamples++;
      if (frameSamples >= 90) {
        const avg = frameTotal / frameSamples;
        if (avg > 20 && quality > .58) {
          quality = Math.max(.58, quality - .14);
          makeParticles();
        } else if (avg < 13.5 && quality < 1) {
          quality = Math.min(1, quality + .07);
          makeParticles();
        }
        frameSamples = 0;
        frameTotal = 0;
      }
    }
    lastFrame = now;

    const elapsed = (now - startTime) / 1000;
    ctx.clearRect(0, 0, width, height);

    // Background stars are static-position dots; animate only a small subset.
    ctx.fillStyle = "rgba(150,205,255,.42)";
    ctx.beginPath();
    for (const s of stars) {
      const twinkle = .62 + .38 * Math.sin(elapsed * .9 + s.phase);
      ctx.globalAlpha = s.a * twinkle;
      ctx.moveTo(s.x + s.r, s.y);
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    }
    ctx.fill();
    ctx.globalAlpha = 1;

    const formation = Math.min(1, Math.max(0, (elapsed - .25) / 2.1));
    const ease = 1 - Math.pow(1 - formation, 3);
    const beatWave = Math.max(0, Math.sin(elapsed * 2.15));
    const beat = 1 + .027 * Math.pow(beatWave, 12) + .009 * Math.sin(elapsed * 2.15);
    const scale = Math.min(width * .34, height * .38, 230);
    const cx = width / 2, cy = height * .43;

    // One soft aura per frame instead of an expensive shadow on every particle.
    ctx.globalCompositeOperation = "lighter";
    const aura = ctx.createRadialGradient(cx, cy, 4, cx, cy, scale * 1.25);
    aura.addColorStop(0, `rgba(0,135,255,${.105 * ease})`);
    aura.addColorStop(.58, `rgba(0,75,220,${.045 * ease})`);
    aura.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = aura;
    ctx.fillRect(0, 0, width, height);

    // Draw a small glow pass only for selected particles.
    ctx.fillStyle = "rgba(30,165,255,.16)";
    ctx.beginPath();
    for (let i = 0; i < particles.length; i += 5) {
      const p = particles[i];
      const local = Math.max(0, Math.min(1, (formation - p.delay * .18) / .82));
      const e = 1 - Math.pow(1 - local, 3);
      const wobble = Math.sin(elapsed * p.speed + p.phase) * (1.2 + 1.8 * (1-e));
      p.x += (cx + (p.tx - cx) * beat + wobble - p.x) * (.035 + e * .11);
      p.y += (cy + (p.ty - cy) * beat + Math.cos(elapsed*p.speed+p.phase)*1.2 - p.y) * (.035 + e * .11);
      ctx.moveTo(p.x + 3.1, p.y);
      ctx.arc(p.x, p.y, 3.1, 0, Math.PI * 2);
    }
    ctx.fill();

    // Crisp particles: no per-particle shadowBlur and no per-particle gradients.
    const groups = [
      { color: "rgba(55,165,255,.82)", path: new Path2D() },
      { color: "rgba(35,195,255,.88)", path: new Path2D() },
      { color: "rgba(130,225,255,.94)", path: new Path2D() }
    ];
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const local = Math.max(0, Math.min(1, (formation - p.delay * .18) / .82));
      const e = 1 - Math.pow(1 - local, 3);
      if (i % 5 !== 0) {
        const wobble = Math.sin(elapsed * p.speed + p.phase) * (1.2 + 1.8 * (1-e));
        p.x += (cx + (p.tx - cx) * beat + wobble - p.x) * (.035 + e * .11);
        p.y += (cy + (p.ty - cy) * beat + Math.cos(elapsed*p.speed+p.phase)*1.2 - p.y) * (.035 + e * .11);
      }
      const twinkle = .82 + .18 * Math.sin(elapsed * 2 + p.phase);
      const radius = p.size * (.72 + .28 * e) * twinkle;
      const group = p.color.includes("55,165") ? groups[0] :
                    p.color.includes("35,195") ? groups[1] : groups[2];
      group.path.moveTo(p.x + radius, p.y);
      group.path.arc(p.x, p.y, radius, 0, Math.PI * 2);
    }
    for (const group of groups) {
      ctx.fillStyle = group.color;
      ctx.fill(group.path);
    }

    // Thin electric accents, without canvas shadow filters.
    ctx.strokeStyle = "rgba(75,205,255,.22)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < 9; i++) {
      const t = elapsed * .55 + i * 2.4;
      const p1 = heartPoint(t), p2 = heartPoint(t + .12);
      ctx.moveTo(cx + p1.x*scale*1.02*beat, cy + p1.y*scale*1.02*beat);
      ctx.lineTo(cx + p2.x*scale*1.02*beat, cy + p2.y*scale*1.02*beat);
    }
    ctx.stroke();

    ctx.globalCompositeOperation = "source-over";
    rafId = requestAnimationFrame(draw);
  }

  function start() {
    startTime = performance.now();
    lastFrame = 0;
    makeParticles();
  }

  replayBtn.addEventListener("click", start);
  window.addEventListener("resize", resize, { passive: true });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      cancelAnimationFrame(rafId);
      lastFrame = 0;
    } else {
      lastFrame = 0;
      rafId = requestAnimationFrame(draw);
    }
  });

  resize();
  rafId = requestAnimationFrame(draw);
})();
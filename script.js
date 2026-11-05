(() => {
  const canvas = document.getElementById("heartCanvas");
  const ctx = canvas.getContext("2d");
  const replayBtn = document.getElementById("replayBtn");
  let width = 0, height = 0, particles = [], stars = [], startTime = performance.now();
  const COUNT = 1900;
  const rand = (a, b) => a + Math.random() * (b - a);

  function heartPoint(t) {
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = 13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t);
    return { x: x / 18, y: -y / 18 };
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = rect.width; height = rect.height;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    stars = Array.from({ length: 110 }, () => ({
      x: Math.random() * width, y: Math.random() * height,
      r: rand(.3, 1.2), a: rand(.12, .65), phase: rand(0, Math.PI * 2)
    }));
    makeParticles();
  }

  function makeParticles() {
    const scale = Math.min(width * .34, height * .38, 230);
    particles = Array.from({ length: COUNT }, () => {
      const t = Math.random() * Math.PI * 2;
      const edge = Math.random() < .36;
      const p = heartPoint(t);
      const fill = Math.sqrt(Math.random());
      const factor = edge ? 1 + rand(-.035, .035) : fill * .96;
      const tx = width / 2 + p.x * scale * factor;
      const ty = height * .43 + p.y * scale * factor;
      const angle = rand(0, Math.PI * 2);
      const distance = rand(100, Math.max(width, height) * .72);
      return {
        tx, ty, x: width/2 + Math.cos(angle)*distance,
        y: height/2 + Math.sin(angle)*distance,
        size: rand(.55, 1.8), hue: rand(188, 215), alpha: rand(.45, .98),
        phase: rand(0, Math.PI*2), speed: rand(.7, 1.6), delay: rand(0, 1.2)
      };
    });
  }

  function draw(now) {
    const elapsed = (now - startTime) / 1000;
    ctx.clearRect(0, 0, width, height);
    for (const s of stars) {
      const twinkle = .55 + .45 * Math.sin(elapsed * 1.3 + s.phase);
      ctx.fillStyle = `rgba(150,205,255,${s.a * twinkle})`;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI*2); ctx.fill();
    }

    const formation = Math.min(1, Math.max(0, (elapsed - .25) / 2.1));
    const ease = 1 - Math.pow(1 - formation, 3);
    const beat = 1 + .035 * Math.pow(Math.max(0, Math.sin(elapsed * 2.15)), 12)
                   + .012 * Math.sin(elapsed * 2.15);
    const scale = Math.min(width * .34, height * .38, 230);
    const cx = width / 2, cy = height * .43;

    ctx.globalCompositeOperation = "lighter";
    const aura = ctx.createRadialGradient(cx, cy, 5, cx, cy, scale * 1.35);
    aura.addColorStop(0, `rgba(0,135,255,${.12 * ease})`);
    aura.addColorStop(.55, `rgba(0,75,220,${.055 * ease})`);
    aura.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = aura; ctx.fillRect(0, 0, width, height);

    for (const p of particles) {
      const local = Math.max(0, Math.min(1, (formation - p.delay * .18) / .82));
      const e = 1 - Math.pow(1 - local, 3);
      const wobble = Math.sin(elapsed * p.speed + p.phase) * (1.4 + 2.2 * (1-e));
      const targetX = cx + (p.tx - cx) * beat + wobble;
      const targetY = cy + (p.ty - cy) * beat + Math.cos(elapsed*p.speed+p.phase)*1.5;
      p.x += (targetX - p.x) * (.025 + e * .105);
      p.y += (targetY - p.y) * (.025 + e * .105);
      const twinkle = .65 + .35 * Math.sin(elapsed * 2.5 + p.phase);
      const alpha = p.alpha * twinkle * (.25 + .75 * e);
      ctx.fillStyle = `hsla(${p.hue},100%,${60 + 18*twinkle}%,${alpha})`;
      ctx.shadowBlur = 7 + 9*e;
      ctx.shadowColor = `hsla(${p.hue},100%,65%,.8)`;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (.65 + .35*e), 0, Math.PI*2); ctx.fill();
    }

    ctx.shadowBlur = 12; ctx.shadowColor = "rgba(30,170,255,.9)";
    for (let i=0; i<13; i++) {
      const t = elapsed * .7 + i * 2.4;
      const p1 = heartPoint(t), p2 = heartPoint(t + .12);
      const x1 = cx + p1.x*scale*1.03*beat, y1 = cy + p1.y*scale*1.03*beat;
      const x2 = cx + p2.x*scale*1.03*beat, y2 = cy + p2.y*scale*1.03*beat;
      ctx.strokeStyle = `rgba(75,205,255,${.12 + .18*(.5+.5*Math.sin(elapsed*3+i))})`;
      ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
    }
    ctx.shadowBlur = 0;
    ctx.globalCompositeOperation = "source-over";
    requestAnimationFrame(draw);
  }

  replayBtn.addEventListener("click", () => {
    startTime = performance.now();
    makeParticles();
  });
  window.addEventListener("resize", resize);
  resize();
  requestAnimationFrame(draw);
})();
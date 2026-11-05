(() => {
  const canvas = document.getElementById("heartCanvas");
  const scene = document.querySelector(".scene");
  const ctx = canvas.getContext("2d", { alpha: true, desynchronized: true });
  if (!ctx) return;

  let width = 0, height = 0, particles = [], stars = [], dust = [], loveRain = [];
  let rafId = 0, lastFrame = 0, frameSamples = 0, frameTotal = 0;
  let quality = 1, pointerActive = false, pointerX = -10000, pointerY = -10000;
  let lastPointerTime = 0, startTime = performance.now();
  const coarse = matchMedia("(pointer: coarse)").matches;
  const rand = (a,b) => a + Math.random() * (b-a);
  const BASE_COUNT = coarse ? 4300 : 5600;
  const STAR_COUNT = coarse ? 90 : 150;
  const DUST_COUNT = coarse ? 24 : 48;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  function heartPoint(t) {
    const s = Math.sin(t), c = Math.cos(t);
    return { x: 16*s*s*s/18, y: -(13*c-5*Math.cos(2*t)-2*Math.cos(3*t)-Math.cos(4*t))/18 };
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, coarse ? 1 : 1.25);
    width = rect.width; height = rect.height;
    canvas.width = Math.max(1, Math.round(width*dpr));
    canvas.height = Math.max(1, Math.round(height*dpr));
    ctx.setTransform(dpr,0,0,dpr,0,0);
    stars = Array.from({length:STAR_COUNT},()=>({
      x:Math.random()*width,y:Math.random()*height,r:rand(.45,1.35),
      alpha:rand(.2,.72),phase:rand(0,Math.PI*2),speed:rand(.12,.42)
    }));
    dust = Array.from({length:DUST_COUNT},()=>({
      x:Math.random()*width,y:Math.random()*height,r:rand(.7,1.8),
      phase:rand(0,Math.PI*2),speed:rand(3,10),alpha:rand(.12,.3)
    }));
    loveRain = Array.from({length:coarse?18:28},()=>({
      x:rand(-20,width+20), y:rand(-height,height), speed:rand(18,42),
      size:rand(10,15), alpha:rand(.12,.3), drift:rand(-5,5),
      phase:rand(0,Math.PI*2)
    }));
    createParticles();
  }

  function createParticles() {
    const scale = Math.min(width*.425,height*.425,coarse?270:315);
    const count = Math.max(4000,Math.round(BASE_COUNT*quality));
    particles = Array.from({length:count},()=>{
      const p=heartPoint(Math.random()*Math.PI*2);
      const edge=Math.random()<.43;
      const fill=edge?rand(.965,1.025):Math.sqrt(Math.random())*.96;
      const tx=width/2+p.x*scale*fill;
      const ty=height*.49+p.y*scale*fill;
      const angle=rand(0,Math.PI*2), distance=rand(90,Math.max(width,height)*.7);
      const palette=Math.random();
      return {
        tx,ty,x:width/2+Math.cos(angle)*distance,y:height/2+Math.sin(angle)*distance,
        size:rand(.85,2.65),
        inner:!edge && fill<.88,
        tone:palette<.28?0:palette<.72?1:2,
        color:palette<.28?"rgba(65,145,255,.98)":palette<.72?"rgba(25,195,255,1)":"rgba(205,248,255,1)",
        phase:rand(0,Math.PI*2),speed:rand(.55,1.25),delay:rand(0,1.1),
        drift:rand(.65,2.2),seed:rand(0,Math.PI*2),
        windAngle:rand(0,Math.PI*2),windRadius:rand(.18,1.05),windSpeed:rand(.55,1.35),windWidth:rand(.65,1.35),
        flowPhase:rand(0,Math.PI*2),flowRate:rand(.65,1.5),flowAmp:rand(1.8,5.5),prevX:0,prevY:0
      };
    });
  }

  function onPointerMove(event) {
    const rect=canvas.getBoundingClientRect();
    pointerX=event.clientX-rect.left; pointerY=event.clientY-rect.top;
    pointerActive=true; lastPointerTime=performance.now();
  }
  canvas.addEventListener("pointerdown",event=>{
    if(event.pointerType==="touch") canvas.setPointerCapture?.(event.pointerId);
    onPointerMove(event);
  },{passive:true});
  canvas.addEventListener("pointermove",onPointerMove,{passive:true});
  canvas.addEventListener("pointerup",()=>{pointerActive=false;},{passive:true});
  canvas.addEventListener("pointercancel",()=>{pointerActive=false;},{passive:true});
  canvas.addEventListener("pointerleave",()=>{pointerActive=false;},{passive:true});

  function render(now) {
    if(!width||!height){rafId=requestAnimationFrame(render);return;}
    if(lastFrame){
      frameTotal+=now-lastFrame; frameSamples++;
      if(frameSamples>=90){
        const avg=frameTotal/frameSamples;
        if(avg>8.7 && quality>.48){quality=Math.max(.48,quality-.12);createParticles();}
        else if(avg<7.2 && quality<1){quality=Math.min(1,quality+.035);createParticles();}
        frameSamples=0;frameTotal=0;
      }
    }
    lastFrame=now;
    if(pointerActive && now-lastPointerTime>1600) pointerActive=false;

    const time=(now-startTime)*.001;
    const revealRaw=Math.max(0,Math.min(1,(time-.45)/3.35));
    const reveal=1-Math.pow(1-revealRaw,3);
    if(scene && revealRaw>0 && !scene.classList.contains("revealed")) scene.classList.add("revealed");
    const beat=reducedMotion?1:1+.032*Math.pow(Math.max(0,Math.sin(time*2.05)),12)+.009*Math.sin(time*2.05);
    const cx=width*.5,cy=height*.49;
    const scale=Math.min(width*.425,height*.425,coarse?270:315);
    ctx.clearRect(0,0,width,height);

    // Background is composed by lightweight CSS layers; keep canvas work focused on particles.
    const bgRaw=Math.max(0,Math.min(1,time/7.2));
    const bgReveal=1-Math.pow(1-bgRaw,3);

    // Subtle falling "I LOVE YOU" messages, kept behind the heart.
    if(loveRain.length){
      ctx.save();
      ctx.globalCompositeOperation="screen";
      ctx.textAlign="center";
      ctx.textBaseline="middle";
      for(const item of loveRain){
        const y=((item.y+time*item.speed)%(height+80)+height+80)%(height+80)-40;
        const x=item.x+Math.sin(time*.22+item.phase)*item.drift;
        ctx.globalAlpha=item.alpha*bgReveal;
        ctx.font=`600 ${item.size}px system-ui, sans-serif`;
        ctx.fillStyle="rgba(75,175,255,.78)";
        ctx.fillText("I LOVE YOU",x,y);
      }
      ctx.restore();
    }

    // Distant stars and drifting cosmic dust.
    ctx.fillStyle="rgba(170,220,255,.8)";
    ctx.beginPath();
    for(const s of stars){
      const a=s.alpha*(.62+.38*Math.sin(time*s.speed+s.phase));
      ctx.globalAlpha=a*bgReveal;
      ctx.moveTo(s.x+s.r,s.y);ctx.arc(s.x,s.y,s.r,0,Math.PI*2);
    }
    ctx.fill();ctx.globalAlpha=1;
    if(!reducedMotion){
      ctx.fillStyle="rgba(65,165,255,.5)";ctx.beginPath();
      for(const d of dust){
        const x=(d.x+Math.sin(time*.18+d.phase)*d.speed+width)%width;
        const y=(d.y+Math.cos(time*.13+d.phase)*d.speed*.55+height)%height;
        ctx.globalAlpha=d.alpha*(.7+.3*Math.sin(time*.7+d.phase))*bgReveal;
        ctx.moveTo(x+d.r,y);ctx.arc(x,y,d.r,0,Math.PI*2);
      }
      ctx.fill();ctx.globalAlpha=1;
    }

    ctx.globalCompositeOperation="lighter";
    const aura=ctx.createRadialGradient(cx,cy,5,cx,cy,scale*1.65);
    aura.addColorStop(0,"rgba(0,150,255,.19)");
    aura.addColorStop(.42,"rgba(0,95,255,.085)");
    aura.addColorStop(1,"rgba(0,0,0,0)");
    ctx.fillStyle=aura;ctx.fillRect(0,0,width,height);

    // No large orbital rings: keep the heart silhouette clean and uninterrupted.

    const groups=[
      {color:"rgba(65,145,255,.98)",path:new Path2D()},
      {color:"rgba(25,195,255,1)",path:new Path2D()},
      {color:"rgba(205,248,255,1)",path:new Path2D()}
    ];
    const glowPath=new Path2D();
    const innerTrailPath=new Path2D();
    const innerGlowPath=new Path2D();
    const influence=coarse?92:105, influence2=influence*influence;

    for(let i=0;i<particles.length;i++){
      const p=particles[i];
      const formation=Math.min(1,Math.max(0,(time-.45-p.delay*.22)/3.35));
      const ease=1-Math.pow(1-formation,3);
      const windPhase=time*p.windSpeed+p.windAngle;
      const windX=cx+Math.cos(windPhase)*scale*p.windRadius*p.windWidth+Math.sin(windPhase*1.7+p.seed)*scale*.16;
      const windY=cy+Math.sin(windPhase)*scale*p.windRadius*.78+Math.cos(windPhase*1.35+p.seed)*scale*.2;
      const streamX=windX+(p.tx-cx)*.28,streamY=windY+(p.ty-cy)*.28;
      const orbit=reducedMotion?0:Math.sin(time*p.speed+p.phase)*p.drift;
      const shimmer=reducedMotion?0:Math.cos(time*.8+p.seed)*1.25;
      const flowX=(!reducedMotion && p.inner)?Math.sin(time*p.flowRate+p.flowPhase+(p.ty-cy)/scale*3.4)*p.flowAmp:0;
      const flowY=(!reducedMotion && p.inner)?Math.cos(time*p.flowRate*.73+p.flowPhase+(p.tx-cx)/scale*2.8)*p.flowAmp*.58:0;
      const heartX=cx+(p.tx-cx)*beat+orbit+flowX,heartY=cy+(p.ty-cy)*beat+shimmer+flowY;
      const targetX=streamX+(heartX-streamX)*ease,targetY=streamY+(heartY-streamY)*ease;

      let pushX=0,pushY=0;
      if(pointerActive){
        const dx=p.x-pointerX,dy=p.y-pointerY,dist2=dx*dx+dy*dy;
        if(dist2<influence2 && dist2>1){
          const dist=Math.sqrt(dist2),force=(1-dist/influence)*20;
          pushX=dx/dist*force;pushY=dy/dist*force;
        }
      }
      const spring=.035+ease*.115;
      p.x+=(targetX+pushX-p.x)*spring;p.y+=(targetY+pushY-p.y)*spring;

      const twinkle=.82+.18*Math.sin(time*1.7+p.phase);
      const radius=p.size*twinkle;
      const group=groups[p.tone];
      group.path.moveTo(p.x+radius,p.y);group.path.arc(p.x,p.y,radius,0,Math.PI*2);
      if(p.inner && i%3===0 && formation>.88 && !reducedMotion){
        const dx=p.x-p.prevX,dy=p.y-p.prevY;
        if(p.prevX && (Math.abs(dx)+Math.abs(dy))>.12){
          innerTrailPath.moveTo(p.x-dx*2.8,p.y-dy*2.8);
          innerTrailPath.lineTo(p.x+dx*.8,p.y+dy*.8);
        }
        p.prevX=p.x;p.prevY=p.y;
        if(i%9===0){const core=radius*2.2;innerGlowPath.moveTo(p.x+core,p.y);innerGlowPath.arc(p.x,p.y,core,0,Math.PI*2);}
      }
      if(i%7===0){
        const glow=radius*2.35;
        glowPath.moveTo(p.x+glow,p.y);glowPath.arc(p.x,p.y,glow,0,Math.PI*2);
      }
    }
    ctx.globalAlpha=reveal;
    ctx.fillStyle="rgba(45,175,255,.22)";ctx.fill(glowPath);
    for(const group of groups){ctx.fillStyle=group.color;ctx.fill(group.path);}
    if(!reducedMotion){
      ctx.lineCap="round";ctx.lineJoin="round";
      ctx.strokeStyle="rgba(110,225,255,.42)";ctx.lineWidth=.72;
      ctx.shadowColor="rgba(30,175,255,.45)";ctx.shadowBlur=2;
      ctx.stroke(innerTrailPath);
      ctx.shadowBlur=0;
      ctx.fillStyle="rgba(100,220,255,.13)";ctx.fill(innerGlowPath);
    }
    ctx.globalAlpha=1;

    // A few slow-moving sparks travel around the silhouette.
    if(!reducedMotion){
      ctx.fillStyle="rgba(155,235,255,.88)";ctx.beginPath();
      for(let i=0;i<14;i++){
        const t=time*.19+i*Math.PI/7;
        const p=heartPoint(t);
        const x=cx+p.x*scale*1.075*beat,y=cy+p.y*scale*1.075*beat;
        const sparkRadius=1.1+(i%3)*.35;
        ctx.moveTo(x+sparkRadius,y);ctx.arc(x,y,sparkRadius,0,Math.PI*2);
      }
      ctx.fill();
    }
    ctx.globalCompositeOperation="source-over";
    rafId=requestAnimationFrame(render);
  }

  document.addEventListener("visibilitychange",()=>{
    if(document.hidden){cancelAnimationFrame(rafId);lastFrame=0;}
    else{lastFrame=0;rafId=requestAnimationFrame(render);}
  });
  window.addEventListener("resize",resize,{passive:true});
  resize();
  rafId=requestAnimationFrame(render);
})();
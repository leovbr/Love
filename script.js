(() => {
  const canvas = document.getElementById("heartCanvas");
  const ctx = canvas.getContext("2d", { alpha: true, desynchronized: true });
  if (!ctx) return;

  let width = 0, height = 0, particles = [], stars = [];
  let rafId = 0, lastFrame = 0, frameSamples = 0, frameTotal = 0;
  let quality = 1, pointerActive = false, pointerX = -10000, pointerY = -10000;
  let lastPointerTime = 0, startTime = performance.now();
  const coarse = matchMedia("(pointer: coarse)").matches;
  const rand = (a,b) => a + Math.random() * (b-a);
  const BASE_COUNT = coarse ? 2250 : 3100;
  const STAR_COUNT = coarse ? 55 : 85;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  function heartPoint(t) {
    const s = Math.sin(t), c = Math.cos(t);
    return { x: 16*s*s*s/18, y: -(13*c-5*Math.cos(2*t)-2*Math.cos(3*t)-Math.cos(4*t))/18 };
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, coarse ? 1.35 : 1.6);
    width = rect.width; height = rect.height;
    canvas.width = Math.max(1, Math.round(width*dpr));
    canvas.height = Math.max(1, Math.round(height*dpr));
    ctx.setTransform(dpr,0,0,dpr,0,0);
    stars = Array.from({length:STAR_COUNT},()=>({
      x:Math.random()*width,y:Math.random()*height,r:rand(.35,1.05),
      alpha:rand(.12,.48),phase:rand(0,Math.PI*2)
    }));
    createParticles();
  }

  function createParticles() {
    const scale = Math.min(width*.39,height*.39,coarse?245:285);
    const count = Math.max(900,Math.round(BASE_COUNT*quality));
    particles = Array.from({length:count},()=>{
      const p=heartPoint(Math.random()*Math.PI*2);
      const edge=Math.random()<.38;
      const fill=edge?rand(.965,1.025):Math.sqrt(Math.random())*.96;
      const tx=width/2+p.x*scale*fill;
      const ty=height*.49+p.y*scale*fill;
      const angle=rand(0,Math.PI*2), distance=rand(90,Math.max(width,height)*.7);
      const palette=Math.random();
      return {
        tx,ty,x:width/2+Math.cos(angle)*distance,y:height/2+Math.sin(angle)*distance,
        size:rand(.72,1.85),
        color:palette<.25?"rgba(45,145,255,.82)":palette<.72?"rgba(25,190,255,.9)":"rgba(145,230,255,.96)",
        phase:rand(0,Math.PI*2),speed:rand(.55,1.25),delay:rand(0,1.1),
        drift:rand(.6,2.4),seed:rand(0,Math.PI*2),
        windAngle:rand(0,Math.PI*2),windRadius:rand(.18,1.05),windSpeed:rand(.55,1.35),windWidth:rand(.65,1.35)
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
      if(frameSamples>=100){
        const avg=frameTotal/frameSamples;
        if(avg>19 && quality>.58){quality=Math.max(.58,quality-.12);createParticles();}
        else if(avg<13 && quality<1){quality=Math.min(1,quality+.06);createParticles();}
        frameSamples=0;frameTotal=0;
      }
    }
    lastFrame=now;
    if(pointerActive && now-lastPointerTime>1600) pointerActive=false;

    const time=(now-startTime)*.001;
    const beat=reducedMotion?1:1+.025*Math.pow(Math.max(0,Math.sin(time*2.15)),12)+.008*Math.sin(time*2.15);
    const cx=width*.5,cy=height*.49;
    const scale=Math.min(width*.39,height*.39,coarse?245:285);
    ctx.clearRect(0,0,width,height);

    // Twinkling background stars, drawn in one batched path.
    ctx.fillStyle="rgba(160,210,255,.55)";
    ctx.beginPath();
    for(const s of stars){
      const a=s.alpha*(.68+.32*Math.sin(time*.85+s.phase));
      ctx.globalAlpha=a;
      ctx.moveTo(s.x+s.r,s.y);ctx.arc(s.x,s.y,s.r,0,Math.PI*2);
    }
    ctx.fill();ctx.globalAlpha=1;

    ctx.globalCompositeOperation="lighter";
    const aura=ctx.createRadialGradient(cx,cy,5,cx,cy,scale*1.45);
    aura.addColorStop(0,"rgba(0,130,255,.13)");
    aura.addColorStop(.48,"rgba(0,75,230,.065)");
    aura.addColorStop(1,"rgba(0,0,0,0)");
    ctx.fillStyle=aura;ctx.fillRect(0,0,width,height);

    const groups=[
      {color:"rgba(45,145,255,.82)",path:new Path2D()},
      {color:"rgba(25,190,255,.9)",path:new Path2D()},
      {color:"rgba(145,230,255,.96)",path:new Path2D()}
    ];
    const glowPath=new Path2D();
    const windTrail=new Path2D();
    const influence=coarse?92:105;
    const influence2=influence*influence;

    for(let i=0;i<particles.length;i++){
      const p=particles[i];
      // Blue cosmic wind streamlines gradually curl inward and form the heart.
      const formation=Math.min(1,Math.max(0,(time-.45-p.delay*.22)/3.35));
      const ease=1-Math.pow(1-formation,3);
      const windPhase=time*p.windSpeed+p.windAngle;
      const windX=cx+Math.cos(windPhase)*scale*p.windRadius*p.windWidth+Math.sin(windPhase*1.7+p.seed)*scale*.16;
      const windY=cy+Math.sin(windPhase)*scale*p.windRadius*.78+Math.cos(windPhase*1.35+p.seed)*scale*.2;
      const streamX=windX+(p.tx-cx)*.28;
      const streamY=windY+(p.ty-cy)*.28;
      // The heart keeps breathing and shimmering after formation is complete.
      const orbit=reducedMotion?0:Math.sin(time*p.speed+p.phase)*p.drift;
      const shimmer=reducedMotion?0:Math.cos(time*.8+p.seed)*1.25;
      const heartX=cx+(p.tx-cx)*beat+orbit;
      const heartY=cy+(p.ty-cy)*beat+shimmer;
      const targetX=streamX+(heartX-streamX)*ease;
      const targetY=streamY+(heartY-streamY)*ease;

      let pushX=0,pushY=0;
      if(pointerActive){
        const dx=p.x-pointerX,dy=p.y-pointerY,dist2=dx*dx+dy*dy;
        if(dist2<influence2 && dist2>1){
          const dist=Math.sqrt(dist2);
          const force=(1-dist/influence)*20;
          pushX=dx/dist*force;pushY=dy/dist*force;
        }
      }
      const spring=.035+ease*.115;
      p.x+=(targetX+pushX-p.x)*spring;
      p.y+=(targetY+pushY-p.y)*spring;

      const twinkle=.78+.22*Math.sin(time*1.7+p.phase);
      const radius=p.size*twinkle;
      const group=p.color.includes("45,145")?groups[0]:p.color.includes("25,190")?groups[1]:groups[2];
      group.path.moveTo(p.x+radius,p.y);
      group.path.arc(p.x,p.y,radius,0,Math.PI*2);

      if(formation<.98 && i%3===0){
        const tailX=p.x-Math.cos(windPhase)*9;
        const tailY=p.y-Math.sin(windPhase)*9;
        windTrail.moveTo(tailX,tailY);windTrail.lineTo(p.x,p.y);
      }
      if(i%5===0){
        glowPath.moveTo(p.x+2.5,p.y);
        glowPath.arc(p.x,p.y,2.5,0,Math.PI*2);
      }
    }
    if(time<3.9){
      ctx.strokeStyle="rgba(55,175,255,.16)";ctx.lineWidth=1.15;
      ctx.stroke(windTrail);
    }
    ctx.fillStyle="rgba(30,160,255,.15)";ctx.fill(glowPath);
    for(const group of groups){ctx.fillStyle=group.color;ctx.fill(group.path);}

    // Sparse electric sparks orbit around the heart outline.
    ctx.strokeStyle="rgba(85,205,255,.2)";ctx.lineWidth=1;ctx.beginPath();
    for(let i=0;i<12;i++){
      const t=time*.42+i*2.4;
      const a=heartPoint(t),b=heartPoint(t+.11);
      ctx.moveTo(cx+a.x*scale*1.035*beat,cy+a.y*scale*1.035*beat);
      ctx.lineTo(cx+b.x*scale*1.035*beat,cy+b.y*scale*1.035*beat);
    }
    ctx.stroke();
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
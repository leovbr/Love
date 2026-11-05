(() => {
  const canvas = document.getElementById("heartCanvas");
  const ctx = canvas.getContext("2d", { alpha: true, desynchronized: true });
  if (!ctx) return;

  let width = 0, height = 0, particles = [], stars = [], dust = [];
  let rafId = 0, lastFrame = 0, frameSamples = 0, frameTotal = 0;
  let quality = 1, pointerActive = false, pointerX = -10000, pointerY = -10000;
  let lastPointerTime = 0, startTime = performance.now();
  const coarse = matchMedia("(pointer: coarse)").matches;
  const rand = (a,b) => a + Math.random() * (b-a);
  const BASE_COUNT = coarse ? 1850 : 2500;
  const STAR_COUNT = coarse ? 90 : 140;
  const DUST_COUNT = coarse ? 34 : 55;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

  function heartPoint(t) {
    const s = Math.sin(t), c = Math.cos(t);
    return { x: 16*s*s*s/18, y: -(13*c-5*Math.cos(2*t)-2*Math.cos(3*t)-Math.cos(4*t))/18 };
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, coarse ? 1.25 : 1.5);
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
    createParticles();
  }

  function createParticles() {
    const scale = Math.min(width*.405,height*.405,coarse?258:300);
    const count = Math.max(850,Math.round(BASE_COUNT*quality));
    particles = Array.from({length:count},()=>{
      const p=heartPoint(Math.random()*Math.PI*2);
      const edge=Math.random()<.42;
      const fill=edge?rand(.965,1.025):Math.sqrt(Math.random())*.96;
      const tx=width/2+p.x*scale*fill;
      const ty=height*.49+p.y*scale*fill;
      const angle=rand(0,Math.PI*2), distance=rand(90,Math.max(width,height)*.7);
      const palette=Math.random();
      return {
        tx,ty,x:width/2+Math.cos(angle)*distance,y:height/2+Math.sin(angle)*distance,
        size:rand(.95,2.05),
        color:palette<.24?"rgba(65,155,255,.98)":palette<.7?"rgba(35,200,255,1)":"rgba(175,240,255,1)",
        phase:rand(0,Math.PI*2),speed:rand(.55,1.25),delay:rand(0,1.1),
        drift:rand(.65,2.2),seed:rand(0,Math.PI*2),
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
      if(frameSamples>=90){
        const avg=frameTotal/frameSamples;
        if(avg>9.5 && quality>.62){quality=Math.max(.62,quality-.1);createParticles();}
        else if(avg<7.6 && quality<1){quality=Math.min(1,quality+.04);createParticles();}
        frameSamples=0;frameTotal=0;
      }
    }
    lastFrame=now;
    if(pointerActive && now-lastPointerTime>1600) pointerActive=false;

    const time=(now-startTime)*.001;
    const beat=reducedMotion?1:1+.032*Math.pow(Math.max(0,Math.sin(time*2.05)),12)+.009*Math.sin(time*2.05);
    const cx=width*.5,cy=height*.49;
    const scale=Math.min(width*.405,height*.405,coarse?258:300);
    ctx.clearRect(0,0,width,height);

    // Layered nebula clouds: low-cost gradients behind the particle heart.
    const nebula1=ctx.createRadialGradient(cx-width*.2,cy-height*.12,2,cx-width*.2,cy-height*.12,Math.max(width,height)*.58);
    nebula1.addColorStop(0,"rgba(0,105,255,.105)");
    nebula1.addColorStop(.42,"rgba(0,55,155,.055)");
    nebula1.addColorStop(1,"rgba(0,0,0,0)");
    ctx.fillStyle=nebula1;ctx.fillRect(0,0,width,height);
    const nebula2=ctx.createRadialGradient(cx+Math.sin(time*.12)*width*.16,cy+height*.18,1,cx+Math.sin(time*.12)*width*.16,cy+height*.18,Math.max(width,height)*.43);
    nebula2.addColorStop(0,"rgba(0,185,255,.055)");
    nebula2.addColorStop(1,"rgba(0,0,0,0)");
    ctx.fillStyle=nebula2;ctx.fillRect(0,0,width,height);

    // Distant stars and drifting cosmic dust.
    ctx.fillStyle="rgba(170,220,255,.8)";
    ctx.beginPath();
    for(const s of stars){
      const a=s.alpha*(.62+.38*Math.sin(time*s.speed+s.phase));
      ctx.globalAlpha=a;
      ctx.moveTo(s.x+s.r,s.y);ctx.arc(s.x,s.y,s.r,0,Math.PI*2);
    }
    ctx.fill();ctx.globalAlpha=1;
    if(!reducedMotion){
      ctx.fillStyle="rgba(65,165,255,.5)";ctx.beginPath();
      for(const d of dust){
        const x=(d.x+Math.sin(time*.18+d.phase)*d.speed+width)%width;
        const y=(d.y+Math.cos(time*.13+d.phase)*d.speed*.55+height)%height;
        ctx.globalAlpha=d.alpha*(.7+.3*Math.sin(time*.7+d.phase));
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

    // Fine orbital ellipses add depth without competing with the heart.
    if(!reducedMotion){
      ctx.save();ctx.translate(cx,cy);ctx.rotate(-.16+Math.sin(time*.12)*.025);
      ctx.strokeStyle="rgba(50,155,255,.105)";ctx.lineWidth=.8;
      ctx.beginPath();ctx.ellipse(0,0,scale*1.28,scale*.53,0,0,Math.PI*2);ctx.stroke();
      ctx.rotate(1.02);ctx.strokeStyle="rgba(85,195,255,.075)";
      ctx.beginPath();ctx.ellipse(0,0,scale*1.36,scale*.48,0,0,Math.PI*2);ctx.stroke();
      ctx.restore();
    }

    const groups=[
      {color:"rgba(65,155,255,.98)",path:new Path2D()},
      {color:"rgba(35,200,255,1)",path:new Path2D()},
      {color:"rgba(175,240,255,1)",path:new Path2D()}
    ];
    const glowPath=new Path2D();
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
      const heartX=cx+(p.tx-cx)*beat+orbit,heartY=cy+(p.ty-cy)*beat+shimmer;
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
      const group=p.color.includes("65,155")?groups[0]:p.color.includes("35,200")?groups[1]:groups[2];
      group.path.moveTo(p.x+radius,p.y);group.path.arc(p.x,p.y,radius,0,Math.PI*2);
      if(i%7===0){
        const glow=radius*2.15;
        glowPath.moveTo(p.x+glow,p.y);glowPath.arc(p.x,p.y,glow,0,Math.PI*2);
      }
    }
    ctx.fillStyle="rgba(45,175,255,.13)";ctx.fill(glowPath);
    for(const group of groups){ctx.fillStyle=group.color;ctx.fill(group.path);}

    // A few slow-moving sparks travel around the silhouette.
    if(!reducedMotion){
      ctx.fillStyle="rgba(155,235,255,.88)";ctx.beginPath();
      for(let i=0;i<8;i++){
        const t=time*.24+i*Math.PI/4;
        const p=heartPoint(t);
        const x=cx+p.x*scale*1.075*beat,y=cy+p.y*scale*1.075*beat;
        ctx.moveTo(x+1.5,y);ctx.arc(x,y,1.5,0,Math.PI*2);
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
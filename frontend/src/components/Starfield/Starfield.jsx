import { useEffect, useRef } from "react";

export default function Starfield() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    let width, height;
    let stars = [];

    const trail = [];
    const trailMaxLen = 14;
    const mouse = { x: -9999, y: -9999 };
    const smoothMouse = { x: 0, y: 0 };
    let rafId;

    const COLORS = [
      { core: "255,255,255" },
      { core: "255,244,210" },
      { core: "180,235,255" },
      { core: "255,200,230" },
      { core: "200,215,255" },
      { core: "255,235,160" },
    ];

    function pickColor(layer) {
      const r = Math.random();
      if (layer === "far") {
        if (r < 0.60) return COLORS[0];
        if (r < 0.80) return COLORS[4];
        if (r < 0.92) return COLORS[2];
        return COLORS[1];
      } else if (layer === "mid") {
        if (r < 0.45) return COLORS[0];
        if (r < 0.65) return COLORS[1];
        if (r < 0.80) return COLORS[4];
        if (r < 0.90) return COLORS[2];
        return COLORS[3];
      } else {
        if (r < 0.35) return COLORS[0];
        if (r < 0.55) return COLORS[1];
        if (r < 0.68) return COLORS[5];
        if (r < 0.82) return COLORS[3];
        return COLORS[2];
      }
    }

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * window.devicePixelRatio;
      canvas.height = height * window.devicePixelRatio;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(1,0,0,1,0,0);
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }

    function createStars() {
      stars = [];

      for (let i = 0; i < 160; i++) {
        const hx = Math.random() * width;
        const hy = Math.random() * height;
        stars.push({
          homeX: hx, homeY: hy, x: hx, y: hy,
          vx: 0, vy: 0,
          layer: "far",
          size: Math.random() * 0.5 + 0.2,
          baseOpacity: Math.random() * 0.14 + 0.04,
          parallax: 0.01 + Math.random() * 0.02,
          isHero: false,
          color: pickColor("far"),
          twinklePhase: Math.random() * Math.PI * 2,
          twinkleSpeed: 0,
          offsetX: 0, offsetY: 0,
        });
      }

      for (let i = 0; i < 55; i++) {
        const hx = Math.random() * width;
        const hy = Math.random() * height;
        stars.push({
          homeX: hx, homeY: hy, x: hx, y: hy,
          vx: 0, vy: 0,
          layer: "mid",
          size: Math.random() * 0.9 + 0.7,
          baseOpacity: Math.random() * 0.28 + 0.18,
          parallax: 0.03 + Math.random() * 0.04,
          isHero: false,
          color: pickColor("mid"),
          twinklePhase: Math.random() * Math.PI * 2,
          twinkleSpeed: Math.random() * 0.006 + 0.001,
          offsetX: 0, offsetY: 0,
        });
      }

      for (let i = 0; i < 18; i++) {
        const hx = Math.random() * width;
        const hy = Math.random() * height;
        stars.push({
          homeX: hx, homeY: hy, x: hx, y: hy,
          vx: 0, vy: 0,
          layer: "near",
          size: Math.random() * 1.6 + 1.8,
          baseOpacity: Math.random() * 0.25 + 0.50,
          parallax: 0.07 + Math.random() * 0.06,
          isHero: true,
          color: pickColor("near"),
          twinklePhase: Math.random() * Math.PI * 2,
          twinkleSpeed: Math.random() * 0.014 + 0.005,
          offsetX: 0, offsetY: 0,
        });
      }
    }

    function handleResize() { resize(); createStars(); }
    function handleMouseMove(e) {
      mouse.x = e.clientX; mouse.y = e.clientY;
      trail.push({ x: e.clientX, y: e.clientY });
      if (trail.length > trailMaxLen) trail.shift();
    }
    function handleMouseLeave() { mouse.x = -9999; mouse.y = -9999; }

    resize();
    createStars();
    smoothMouse.x = width / 2;
    smoothMouse.y = height / 2;

    window.addEventListener("resize", handleResize);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseleave", handleMouseLeave);

    const glowRadius = 100;
    const pullStrength = 0.045;
    const springStrength = 0.010;
    const friction = 0.91;

    function drawStar(star, x, y, size, opacity) {
      const core = star.color.core;
      const r = size * 5;

      const glowR = star.layer === "near" ? r * 2.2 : r * 1.4;
      const gr = ctx.createRadialGradient(x, y, 0, x, y, glowR);
      gr.addColorStop(0, `rgba(${core}, ${opacity * (star.layer === "near" ? 0.5 : 0.25)})`);
      gr.addColorStop(0.5, `rgba(${core}, ${opacity * 0.08})`);
      gr.addColorStop(1, `rgba(${core}, 0)`);
      ctx.fillStyle = gr;
      ctx.beginPath(); ctx.arc(x, y, glowR, 0, Math.PI * 2); ctx.fill();

      const coreR = star.layer === "far"
        ? Math.max(0.2, size * 0.35)
        : Math.max(0.4, size * 0.50);
      ctx.fillStyle = `rgba(${core}, ${Math.min(1, opacity * (star.layer === "far" ? 1.2 : 1.6))})`;
      ctx.beginPath(); ctx.arc(x, y, coreR, 0, Math.PI * 2); ctx.fill();

      if (star.isHero) {
        const flareLen = r * 2.8;
        const fo = opacity * 0.45;
        ctx.save(); ctx.translate(x, y);
        const g1 = ctx.createLinearGradient(-flareLen, 0, flareLen, 0);
        g1.addColorStop(0, `rgba(${core},0)`);
        g1.addColorStop(0.5, `rgba(${core},${fo})`);
        g1.addColorStop(1, `rgba(${core},0)`);
        ctx.fillStyle = g1; ctx.fillRect(-flareLen, -0.5, flareLen*2, 1.0);
        const g2 = ctx.createLinearGradient(0, -flareLen, 0, flareLen);
        g2.addColorStop(0, `rgba(${core},0)`);
        g2.addColorStop(0.5, `rgba(${core},${fo * 0.7})`);
        g2.addColorStop(1, `rgba(${core},0)`);
        ctx.fillStyle = g2; ctx.fillRect(-0.5, -flareLen, 1.0, flareLen*2);
        ctx.restore();
      }
    }

    function animate() {
      ctx.clearRect(0, 0, width, height);

      const mx = mouse.x < 0 ? width / 2 : mouse.x;
      const my = mouse.y < 0 ? height / 2 : mouse.y;
      smoothMouse.x += (mx - smoothMouse.x) * 0.04;
      smoothMouse.y += (my - smoothMouse.y) * 0.04;

      const tiltX = (smoothMouse.x - width / 2) / (width / 2);
      const tiltY = (smoothMouse.y - height / 2) / (height / 2);

      for (const layer of ["far", "mid", "near"]) {
        for (const star of stars) {
          if (star.layer !== layer) continue;

          const maxShift = star.parallax * Math.min(width, height) * 0.15;
          const targetOffX = -tiltX * maxShift;
          const targetOffY = -tiltY * maxShift;
          star.offsetX += (targetOffX - star.offsetX) * 0.05;
          star.offsetY += (targetOffY - star.offsetY) * 0.05;

          const dx = mouse.x - (star.homeX + star.offsetX);
          const dy = mouse.y - (star.homeY + star.offsetY);
          const dist = Math.sqrt(dx*dx + dy*dy);

          let opacity = star.baseOpacity;
          let glowBoost = 0;

          if (star.twinkleSpeed > 0) {
            star.twinklePhase += star.twinkleSpeed;
            opacity += Math.sin(star.twinklePhase) * (star.layer === "near" ? 0.14 : 0.06);
          }

          if (dist < glowRadius) {
            const factor = (glowRadius - dist) / glowRadius;
            glowBoost = factor;
            opacity = Math.min(1, opacity + factor * (star.layer === "near" ? 0.9 : 0.5));
            if (trail.length >= 2) {
              const prev = trail[trail.length - 2];
              const curr = trail[trail.length - 1];
              const pull = pullStrength * (star.layer === "near" ? 1.8 : star.layer === "mid" ? 0.9 : 0.3);
              star.vx += (curr.x - prev.x) * factor * pull;
              star.vy += (curr.y - prev.y) * factor * pull;
            }
          }

          const targetX = star.homeX + star.offsetX;
          const targetY = star.homeY + star.offsetY;
          star.vx += (targetX - star.x) * springStrength;
          star.vy += (targetY - star.y) * springStrength;
          star.vx *= friction; star.vy *= friction;
          star.x += star.vx; star.y += star.vy;

          drawStar(star, star.x, star.y, star.size * (1 + glowBoost * (star.layer === "near" ? 1.5 : 0.8)), Math.max(0.02, Math.min(1.0, opacity)));
        }
      }

      rafId = requestAnimationFrame(animate);
    }

    rafId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute", top: 0, left: 0,
        width: "100%", height: "100%",
        pointerEvents: "none", zIndex: 0,
      }}
    />
  );
}

"use client";

import gsap from "gsap";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { productStatus } from "@/lib/product-status";
import type { HeroPair } from "@/lib/hero";

// Hero de l'accueil : des paires tirées au hasard défilent, chacune avec son fond
// pastel, son nom géant en filigrane et trois annotations (pointures, délai, réf.).
// La première paire est rendue par le serveur (pas de flash) ; les suivantes sont
// mélangées dans le navigateur. Le défilement s'arrête hors écran et quand
// l'onglet est caché ; sans mouvement demandé, la première paire reste fixe.
//
// Le DOM est piloté par GSAP (un seul bloc, remplissage par refs) : React ne le
// redessine jamais, donc pas de conflit avec l'animation.

const W = 148; // largeur du dessin SVG : la photo occupe 100 unités au centre (de 24 à 124)
const H = 44.6; // hauteur du dessin = hauteur de la photo (rapport 2,24)
// Ancres génériques sur une chaussure de profil : [x, y] en fraction de la photo.
const ANCHORS = [
  { x: 0.55, y: 0.78, side: "r" }, // semelle → pointures
  { x: 0.58, y: 0.28, side: "r" }, // tige → délai
  { x: 0.24, y: 0.5, side: "l" }, // talon → référence
] as const;

function shuffled<T>(a: readonly T[]): T[] {
  const r = a.slice();
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

const ghostSize = (word: string) => `min(15vw, 13rem, calc(96vw / ${Math.max(word.length, 3)} * 1.45))`;

export function HeroShowcase({ pairs }: { pairs: HeroPair[] }) {
  const root = useRef<HTMLElement>(null);
  const first = pairs[0];

  // Premier écran = exactement la hauteur de la fenêtre : le hero occupe ce que l'en-tête (bandeau,
  // barre, recherche) laisse. 100svh = hauteur « sûre » du mobile (barres du navigateur comprises).
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const fit = () => {
      el.style.minHeight = "0px";
      const top = el.getBoundingClientRect().top + window.scrollY;
      el.style.minHeight = `max(30rem, calc(100svh - ${Math.round(top)}px))`;
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(document.documentElement);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = root.current;
    if (!el || pairs.length === 0) return;
    const one = <T extends HTMLElement | SVGElement>(s: string) => el.querySelector<T>(s)!;
    const all = <T extends HTMLElement | SVGElement>(s: string) => Array.from(el.querySelectorAll<T>(s));
    const bg0 = one<HTMLElement>("[data-bg0]");
    const bg1 = one<HTMLElement>("[data-bg1]");
    const ghost = one<HTMLElement>("[data-ghost]");
    const plate = one<HTMLElement>("[data-plate]");
    const pimg = one<HTMLImageElement>("[data-pimg]");
    const plink = one<HTMLAnchorElement>("[data-plink]");
    const cta = one<HTMLElement>("[data-cta]");
    const cname = one<HTMLElement>("[data-cname]");
    const ceta = one<HTMLElement>("[data-ceta]");
    const cprice = one<HTMLElement>("[data-cprice]");
    const clink = one<HTMLAnchorElement>("[data-clink]");
    const blogo = one<HTMLImageElement>("[data-blogo]");
    const lines = all<SVGPathElement>("[data-line]");
    const dots = all<SVGElement>("[data-dot]");
    const labs = all<HTMLElement>("[data-lab]");
    const bars = all<HTMLButtonElement>("[data-bar]");
    const fills = all<HTMLElement>("[data-fill]");
    const count = el.querySelector<HTMLElement>("[data-count]");
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

    const showAnnotations = () => {
      gsap.set(lines, { strokeDashoffset: 0 });
      gsap.set([...dots, ...labs], { opacity: 1 });
    };
    if (reduce || pairs.length < 2) {
      showAnnotations();
      if (fills[0]) fills[0].style.width = "100%";
      return;
    }

    const order = [0, ...shuffled(pairs.map((_, i) => i).slice(1))];
    let tl: gsap.core.Timeline | undefined;
    let visible = true;

    const fill = (p: HeroPair) => {
      ghost.textContent = p.ghost;
      ghost.style.fontSize = ghostSize(p.ghost);
      pimg.src = p.src;
      pimg.alt = p.name;
      pimg.removeAttribute("data-shape");
      plink.href = clink.href = `/produit/${p.id}`;
      plink.setAttribute("aria-label", p.name);
      cname.textContent = p.name;
      if (p.logo) blogo.src = p.logo;
      blogo.style.display = p.logo ? "block" : "none";
      ceta.textContent = `${productStatus(p.status).short} · chez toi en ${p.eta}`;
      cprice.textContent = p.price;
      const values = [p.sizes, p.eta, p.tag];
      labs.forEach((l, i) => {
        l.querySelector("[data-v]")!.textContent = values[i];
        l.style.visibility = values[i] ? "visible" : "hidden";
      });
    };
    const onLoad = () => {
      pimg.dataset.shape = pimg.naturalWidth / pimg.naturalHeight < 0.9 ? "portrait" : "landscape";
    };
    pimg.addEventListener("load", onLoad);
    if (pimg.complete) onLoad();

    const sync = () => {
      if (!tl) return;
      if (!visible || document.hidden) tl.pause();
      else tl.resume();
    };

    const run = (k: number, intro: boolean) => {
      const p = pairs[order[k]];
      const next = pairs[order[(k + 1) % order.length]];
      new Image().src = next.src; // la suivante se charge pendant que celle-ci est lue
      tl?.kill();
      tl = gsap.timeline({ onComplete: () => run((k + 1) % order.length, false) });
      // Où on en est : les barres passées sont pleines, la courante se remplit pendant la lecture.
      fills.forEach((f, i) => { f.style.width = i < k ? "100%" : "0%"; });
      bars.forEach((b, i) => b.setAttribute("aria-current", i === k ? "true" : "false"));
      if (count) count.textContent = `${k + 1} / ${order.length}`;
      const cur = tl;
      tl.eventCallback("onUpdate", () => { fills[k].style.width = `${Math.min(100, cur.progress() * 100)}%`; });
      const t0 = intro ? 0 : 0.55;
      if (!intro) {
        tl.to(plate, { x: -140, opacity: 0, duration: 0.45, ease: "power2.in" }, 0)
          .to(ghost, { y: -60, opacity: 0, duration: 0.4, ease: "power2.in" }, 0)
          .to([cta, ...labs, ...dots], { opacity: 0, duration: 0.25 }, 0)
          .to(blogo, { x: -140, opacity: 0, duration: 0.4, ease: "power2.in" }, 0)
          .to(lines, { strokeDashoffset: 1, duration: 0.25 }, 0)
          .call(() => { bg1.style.background = p.tone; }, undefined, 0.1)
          .fromTo(bg1, { clipPath: "circle(0% at 50% 100%)" }, { clipPath: "circle(150% at 50% 100%)", duration: 0.95, ease: "power3.inOut", immediateRender: false }, 0.1)
          .call(() => { bg0.style.background = p.tone; gsap.set(bg1, { clipPath: "circle(0% at 50% 100%)" }); }, undefined, 1.06)
          .call(() => fill(p), undefined, t0)
          .fromTo(ghost, { y: 80, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, ease: "power3.out", immediateRender: false }, t0 + 0.05)
          .fromTo(plate, { x: 190, rotate: -7, opacity: 0, scale: 0.94 }, { x: 0, rotate: 0, opacity: 1, scale: 1, duration: 1.05, ease: "power3.out", immediateRender: false }, t0 + 0.05)
          .fromTo(blogo, { x: -260, opacity: 0 }, { x: 0, opacity: 0.11, duration: 1.1, ease: "power3.out", immediateRender: false }, t0 + 0.1)
          .fromTo(cta, { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: "power2.out", immediateRender: false }, t0 + 0.4);
      }
      // Les trois annotations se dessinent l'une après l'autre.
      lines.forEach((line, i) => {
        const at = (intro ? 0.5 : t0 + 1.2) + i * 0.32;
        tl!.to(dots[i], { opacity: 1, duration: 0.3 }, at)
          .to(line, { strokeDashoffset: 0, duration: 0.55, ease: "power2.out" }, at + 0.05)
          .fromTo(labs[i], { opacity: 0, x: ANCHORS[i].side === "l" ? 12 : -12 }, { opacity: 1, x: 0, duration: 0.45, ease: "power2.out", immediateRender: false }, at + 0.35);
      });
      tl.to({}, { duration: 1 }, (intro ? 0.5 : t0 + 1.2) + 3.4); // temps de lecture
      sync();
    };

    const jumps = bars.map((b, i) => {
      const go = () => run(i, false);
      b.addEventListener("click", go);
      return () => b.removeEventListener("click", go);
    });
    const ctx = gsap.context(() => run(0, true), el);
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; sync(); });
    io.observe(el);
    document.addEventListener("visibilitychange", sync);
    return () => {
      tl?.kill();
      jumps.forEach((off) => off());
      ctx.revert();
      io.disconnect();
      pimg.removeEventListener("load", onLoad);
      document.removeEventListener("visibilitychange", sync);
    };
  }, [pairs]);

  if (!first) return null;
  return (
    <section ref={root} aria-label="Sélection du moment" className="relative isolate flex min-h-[calc(100svh-9.5rem)] flex-col overflow-hidden text-ink">
      <div data-bg0 className="absolute inset-0" style={{ background: first.tone }} />
      <div data-bg1 className="absolute inset-0" style={{ clipPath: "circle(0% at 50% 100%)" }} />

      <p className="font-display relative z-10 pt-4 text-center text-lg sm:pt-6 sm:text-xl">Sélectionnées pour vous</p>

      <div className="my-auto">
      {/* Logo de la marque : très grand, de travers, coupé par le bord droit, en ton sur ton derrière tout le reste. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        data-blogo
        src={first.logo ?? undefined}
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-[4%] -left-[14%] z-0 max-h-[46%] w-[min(56vw,28rem)] object-contain brightness-0 select-none md:-bottom-[8%] md:-left-[7%] md:w-[min(34vw,28rem)]"
        style={{ transform: "rotate(-14deg)", opacity: 0.11, display: first.logo ? "block" : "none" }}
      />

      {/* Le nom du modèle, en grand, au-dessus de la photo : la plaque en recouvre le bas, rien ne passe par-dessus la paire. */}
      <div
        data-ghost
        aria-hidden="true"
        className="font-display pointer-events-none relative z-0 mt-2 text-center leading-[0.85] whitespace-nowrap text-black/[0.16] uppercase select-none"
        style={{ fontSize: ghostSize(first.ghost), marginBottom: "-0.3em" }}
      >
        {first.ghost}
      </div>

      <div className="relative z-[1] mx-auto w-[min(96vw,1000px,calc((100svh-27rem)*3.3))] px-3 md:px-0">
        <div className="relative aspect-[16/9] sm:aspect-[16/10] md:aspect-[148/44.6]" data-stage>
          <Link
            data-plink
            href={`/produit/${first.id}`}
            aria-label={first.name}
            className="absolute inset-0 overflow-hidden rounded-[28px] bg-card shadow-[0_34px_50px_-26px_rgba(0,0,0,0.4)] md:right-[16.22%] md:left-[16.22%]"
            data-plate
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              data-pimg
              src={first.src}
              alt={first.name}
              fetchPriority="high"
              decoding="async"
              className="h-full w-full object-cover object-[50%_85%] max-md:origin-[50%_30%] max-md:scale-[1.12] data-[shape=portrait]:object-[50%_73%]"
            />
          </Link>
          {/* Annotations : seulement sur grand écran (sur téléphone, la photo et le prix suffisent). */}
          <div className="pointer-events-none absolute inset-0 hidden md:block" aria-hidden="true">
            <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
              {ANCHORS.map((a, i) => {
                const x = 24 + a.x * 100;
                const y = a.y * H;
                const gx = a.side === "l" ? 21 : 127;
                return (
                  <g key={i}>
                    <path data-line d={`M${x} ${y} L${gx} ${y}`} pathLength={1} fill="none" stroke="#0b0b0c" strokeWidth={0.26} strokeLinecap="round" style={{ strokeDasharray: 1, strokeDashoffset: 1 }} />
                    <circle data-dot cx={x} cy={y} r={0.85} fill="#0b0b0c" style={{ opacity: 0 }} />
                  </g>
                );
              })}
            </svg>
            {ANCHORS.map((a, i) => (
              <div
                key={i}
                data-lab
                className="absolute -translate-y-1/2 opacity-0"
                style={{
                  top: `${(a.y * 100).toFixed(2)}%`,
                  ...(a.side === "l" ? { right: `${((W - 20.5) / W) * 100}%`, textAlign: "right" } : { left: `${(127.5 / W) * 100}%` }),
                }}
              >
                <p className="text-[13px] leading-tight font-semibold text-ink/75">{["Pointures", "Chez toi en", "Réf."][i]}</p>
                <p data-v className="font-display text-[clamp(0.95rem,1.9vw,1.4rem)] leading-tight">{[first.sizes, first.eta, first.tag][i]}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      </div>

      <div data-cta className="relative z-[4] mx-auto grid max-w-5xl grid-cols-[auto_auto] items-center justify-center gap-x-4 gap-y-2 px-4 pt-3 pb-11 sm:flex sm:flex-wrap sm:gap-x-8 sm:gap-y-3 sm:pt-4 sm:pb-14">
        <div className="col-span-2 min-w-0 text-center sm:col-auto sm:text-left">
          <p data-cname className="font-display text-2xl leading-tight sm:text-3xl">{first.name}</p>
          <p data-ceta className="mt-0.5 hidden text-sm font-semibold text-ink/75 sm:block">{productStatus(first.status).short} · chez toi en {first.eta}</p>
        </div>
        <p data-cprice className="rounded-xl bg-accent px-3 py-1.5 text-3xl leading-none font-extrabold tracking-tight text-ink sm:text-4xl">{first.price}</p>
        <Link data-clink href={`/produit/${first.id}`} className="btn-dark px-5 py-3 text-sm sm:px-7 sm:py-3.5 sm:text-base">
          Commander <span aria-hidden="true">→</span>
        </Link>
      </div>

      {pairs.length > 1 && (
        <div className="absolute inset-x-0 bottom-3 z-[5] flex items-center justify-center gap-3 sm:bottom-4">
          <span data-count className="font-display text-sm text-ink tabular-nums">1 / {pairs.length}</span>
          <div className="flex gap-1">
            {pairs.map((_, i) => (
              <button key={i} type="button" data-bar aria-label={`Voir la paire ${i + 1} sur ${pairs.length}`} aria-current={i === 0 ? "true" : "false"} className="group relative h-7 w-6 sm:w-9">
                <span className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 overflow-hidden rounded-full bg-ink/20 transition-[height] group-hover:h-1.5">
                  <span data-fill className="block h-full rounded-full bg-ink" style={{ width: i === 0 ? "0%" : "0%" }} />
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

/* Landing page behavior — port of the approved ORAYA landing script.
   Scoped to the Landing route root, with full cleanup so StrictMode
   double-mounts and route unmounts are safe (rAF, timers, listeners,
   observers all cancelled). */

export function initLanding(root) {
  const $ = (s) => root.querySelector(s);
  const $$ = (s) => Array.from(root.querySelectorAll(s));
  const RM = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const cl = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const sm = (t) => t * t * (3 - 2 * t);
  const C = ["#A9BE9D", "#F0D98C", "#C8B6DC", "#D99C79", "#344C3D"];

  const offs = [];
  const timers = new Set();
  const rafs = [];
  const observers = [];

  const on = (el, ev, fn, opts) => {
    if (!el) return;
    el.addEventListener(ev, fn, opts);
    offs.push(() => el.removeEventListener(ev, fn, opts));
  };
  const timeout = (fn, ms) => {
    const id = setTimeout(() => {
      timers.delete(id);
      fn();
    }, ms);
    timers.add(id);
    return id;
  };
  const observe = (el, cb, opts) => {
    if (!el) return null;
    const io = new IntersectionObserver(cb, opts);
    io.observe(el);
    observers.push(io);
    return io;
  };
  const loop = (fn) => {
    let id = 0;
    let stopped = false;
    const step = (now) => {
      if (stopped) return;
      fn(now);
      id = requestAnimationFrame(step);
    };
    id = requestAnimationFrame(step);
    rafs.push(() => {
      stopped = true;
      cancelAnimationFrame(id);
    });
  };

  /* Reset script-owned containers so a second init (StrictMode) is clean.
     Only containers React renders empty are cleared here. */
  const ln = $("#ln");
  const bds = $("#bds");
  const cs = $("#cs");
  const vs = $("#vs");
  $$("#vs .tile, #vs .frag").forEach((n) => n.remove());
  if (ln) ln.innerHTML = "";
  if (bds) bds.innerHTML = "";
  if (cs) cs.innerHTML = "";

  /* Magnetic buttons */
  if (!RM) {
    $$(".mag").forEach((b) => {
      on(b, "mousemove", (e) => {
        const r = b.getBoundingClientRect();
        b.style.transform =
          "translate(" +
          (e.clientX - r.left - r.width / 2) * 0.2 +
          "px," +
          (e.clientY - r.top - r.height / 2) * 0.3 +
          "px)";
      });
      on(b, "mouseleave", () => {
        b.style.transform = "";
      });
    });
  }

  /* Hero particle canvas */
  const hc = $("#hc");
  if (hc) {
    const x = hc.getContext("2d");
    let W = 0;
    let H = 0;
    const m = { x: -999, y: -999 };
    const t0 = performance.now();
    const N = 30;
    const ns = Array.from({ length: N }, (_, i) => ({
      a: Math.random() * 6.28,
      r: 0.2 + Math.random() * 0.32,
      s: (Math.random() - 0.5) * 0.0004,
      c: C[i % 4],
      z: 3 + Math.random() * 7,
      o: [0, 0],
    }));
    const rs = () => {
      const d = window.devicePixelRatio || 1;
      W = hc.clientWidth;
      H = hc.clientHeight;
      hc.width = W * d;
      hc.height = H * d;
      x.setTransform(d, 0, 0, d, 0, 0);
    };
    rs();
    on(window, "resize", rs);
    on(window, "pointermove", (e) => {
      m.x = e.clientX;
      m.y = e.clientY;
    });
    let vis = true;
    observe(hc, (e) => {
      vis = e[0].isIntersecting;
    });
    loop((now) => {
      if (!vis) return;
      const rv = RM ? 1 : sm(cl((now - t0 - 2400) / 2600));
      x.clearRect(0, 0, W, H);
      const cx = W / 2;
      const cy = H * 0.4;
      const P = [];
      ns.forEach((n) => {
        n.a += RM ? 0 : n.s * 16;
        const px = cx + Math.cos(n.a) * n.r * W * 0.95 * rv;
        const py = cy + Math.sin(n.a) * n.r * H * 0.8 * rv;
        const dx = px - m.x;
        const dy = py - m.y;
        const d = Math.hypot(dx, dy);
        if (d < 140 && d > 0) {
          n.o[0] += (dx / d) * (140 - d) * 0.04;
          n.o[1] += (dy / d) * (140 - d) * 0.04;
        }
        n.o[0] *= 0.94;
        n.o[1] *= 0.94;
        P.push([px + n.o[0], py + n.o[1], n]);
      });
      x.strokeStyle = "rgba(52,76,61,.35)";
      x.lineWidth = 1.2;
      for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
          if (
            Math.hypot(P[i][0] - P[j][0], P[i][1] - P[j][1]) <
            (W < 700 ? 90 : 150) * rv
          ) {
            x.beginPath();
            x.moveTo(P[i][0], P[i][1]);
            x.lineTo(P[j][0], P[j][1]);
            x.stroke();
          }
        }
      }
      P.forEach(([px, py, n]) => {
        x.fillStyle = n.c;
        x.beginPath();
        x.arc(px, py, n.z * rv * (W < 700 ? 0.8 : 1.4), 0, 7);
        x.fill();
      });
    });
  }

  /* Scroll-driven acts II + III */
  const nav = $("#nav");
  const a2 = $("#how");
  const a3 = $("#studio");
  const pr = (s) => {
    if (!s) return 0;
    const r = s.getBoundingClientRect();
    return cl(-r.top / (r.height - window.innerHeight));
  };
  const T = [
    [-28, -16, "#A9BE9D"],
    [0, -27, "#F0D98C"],
    [28, -14, "#C8B6DC"],
    [-26, 17, "#D99C79"],
    [2, 26, "#A9BE9D"],
    [30, 18, "#F0D98C"],
  ];
  const TL = [
    "scene change",
    "“monomer”",
    "diagram",
    "“chain”",
    "example",
    "recap",
  ];
  if (vs && ln) {
    ln.innerHTML = [
      [0, 1],
      [1, 2],
      [0, 3],
      [3, 4],
      [4, 5],
      [2, 5],
      [1, 4],
    ]
      .map(
        ([a, b]) =>
          '<line x1="' +
          T[a][0] +
          '" y1="' +
          T[a][1] +
          '" x2="' +
          T[b][0] +
          '" y2="' +
          T[b][1] +
          '" stroke="#344C3D" stroke-width=".5"/>',
      )
      .join("");
  }
  const tiles = T.map((t, i) => {
    const d = document.createElement("div");
    d.className = "tile";
    d.style.background = t[2];
    d.textContent = TL[i];
    vs && vs.appendChild(d);
    return d;
  });
  const FR = [
    "“so why does it stick?”",
    "“repeat that unit…”",
    "“cross-linked, so stiff”",
    "“monomers”",
  ];
  const fz = [
    [8, 10],
    [70, 12],
    [10, 86],
    [72, 82],
  ].map((p, i) => {
    const s = document.createElement("span");
    s.className = "frag";
    s.style.left = p[0] + "%";
    s.style.top = p[1] + "%";
    s.textContent = FR[i];
    vs && vs.appendChild(s);
    return s;
  });
  const st = $$("#st2 span");
  const CAP = [
    ["Every video hides a map.", "Scroll. Oraya pulls the footage apart."],
    ["Frames, moments, words.", "Each scene is separated and transcribed."],
    ["Moments become ideas.", "Frames turn into diagrams and concepts."],
    [
      "Now it’s a place to explore.",
      "Concepts connect into a map you can question.",
    ],
  ];
  const B = [
    ["Wide", "M10 40 q20-30 40 0 t40 0"],
    ["Close", "M50 8 l30 17v30l-30 17-30-17v-30z"],
    ["Diagram", "M20 50h60M20 50l10-18M80 50l-10-18"],
    ["Motion", "M10 50h20M40 50h20M70 50h20"],
    ["Example", "M35 8h30v14l8 10v38h-46v-38l8-10z"],
    ["Recap", "M15 60l25-35 20 25 25-35"],
  ];
  const SL = [
    "A chain of beads, seen from far.",
    "Zoom into one repeating unit.",
    "Two units link up.",
    "The chain keeps growing.",
    "A bottle is millions of chains.",
    "Recap: units, bonds, chains.",
  ];
  if (bds) {
    bds.innerHTML = B.map(
      (b, i) =>
        '<div class="bd"><b>Scene ' +
        (i + 1) +
        " · " +
        b[0] +
        "</b>" +
        '<svg viewBox="0 0 100 80"><path d="' +
        b[1] +
        '" fill="none" stroke="#344C3D" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>' +
        '<circle cx="' +
        (20 + i * 12) +
        '" cy="14" r="5" fill="' +
        C[i % 5] +
        '"/></svg>' +
        "<small>" +
        SL[i] +
        "</small></div>",
    ).join("");
  }
  const bd = $$("#bds .bd");
  const pp = $$("#pp span");
  const fr = $("#fr");
  const tli = $("#tli");
  const prev = $("#prev");
  const c2 = $("#c2");
  const p2 = $("#p2");

  const upd = () => {
    if (nav) nav.classList.toggle("s", window.scrollY > 40);
    let p = pr(a2);
    const f = sm(cl(p / 0.25));
    const s = sm(cl((p - 0.25) / 0.3));
    const n = sm(cl((p - 0.6) / 0.3));
    if (fr) {
      fr.style.transform =
        "translate(-50%,-50%) scale(" + (0.5 + 0.5 * f) + ")";
      fr.style.opacity = String(1 - s);
    }
    tiles.forEach((t, i) => {
      const T0 = T[i];
      t.style.opacity = s > 0.02 ? "1" : "0";
      t.style.transform =
        "translate(" +
        T0[0] * s +
        "vmin," +
        T0[1] * s +
        "vmin) scale(" +
        (0.5 + 0.5 * s - 0.45 * n) +
        ")";
      t.style.borderRadius = 8 + 42 * n + "%";
    });
    if (ln) ln.style.opacity = String(n);
    fz.forEach((e, i) => {
      e.style.opacity = p > 0.3 + i * 0.08 && p < 0.85 ? "1" : "0";
    });
    const k = p < 0.25 ? 0 : p < 0.6 ? 1 : p < 0.88 ? 2 : 3;
    st.forEach((e, i) => e.classList.toggle("on", i === k));
    if (c2) c2.textContent = CAP[k][0];
    if (p2) p2.textContent = CAP[k][1];
    p = pr(a3);
    bd.forEach((e, i) => e.classList.toggle("on", p > 0.1 + i * 0.1));
    pp.forEach((e, i) =>
      e.classList.toggle("on", i === Math.min(4, Math.floor(p * 5.2))),
    );
    if (tli) tli.style.width = cl(p / 0.8) * 100 + "%";
    if (prev) prev.classList.toggle("on", p > 0.9);
  };
  on(window, "scroll", upd, { passive: true });
  on(window, "resize", upd);
  upd();

  /* Polymer 3D canvas */
  const pc = $("#pc");
  if (pc) {
    const x = pc.getContext("2d");
    const N = 16;
    const KN = [
      [
        "Monomer",
        "A small repeating unit. In polyethylene it is ethylene, C₂H₄.",
      ],
      [
        "Covalent bond",
        "Atoms share electrons, locking monomers into a chain.",
      ],
      [
        "Chain growth",
        "Each new monomer adds to the end, so chains reach thousands of units.",
      ],
      [
        "Cross-link",
        "A bond between chains. More of them make a polymer stiffer.",
      ],
    ];
    const nodes = Array.from({ length: N }, (_, i) => {
      const t = i * 0.7;
      const k = i % 4 === 3 ? 3 : i % 4 === 1 ? 1 : i % 4 === 2 ? 2 : 0;
      return {
        x: Math.cos(t) * 1.1,
        y: (i - N / 2) * 0.3,
        z: Math.sin(t) * 1.1,
        k,
        c: [C[0], C[2], C[1], C[3]][k],
      };
    });
    let W = 0;
    let H = 0;
    let ay = 0.6;
    let ax = 0.2;
    let drag = 0;
    let lx = 0;
    let ly = 0;
    let moved = 0;
    const t0Ref = { v: performance.now() };
    let sel = -1;
    let vis = false;
    let pts = [];
    const rs = () => {
      const d = window.devicePixelRatio || 1;
      W = pc.clientWidth;
      H = pc.clientHeight;
      pc.width = W * d;
      pc.height = H * d;
      x.setTransform(d, 0, 0, d, 0, 0);
    };
    rs();
    on(window, "resize", rs);
    observe(pc, (e) => {
      vis = e[0].isIntersecting;
      if (vis) t0Ref.v = performance.now();
    });
    pc.onpointerdown = (e) => {
      drag = 1;
      lx = e.clientX;
      ly = e.clientY;
      moved = 0;
      pc.style.cursor = "grabbing";
      try {
        pc.setPointerCapture(e.pointerId);
      } catch {
        /* pointer capture is best-effort */
      }
    };
    pc.onpointermove = (e) => {
      if (!drag) return;
      ay += (e.clientX - lx) * 0.01;
      ax = cl(ax + (e.clientY - ly) * 0.01, -1, 1);
      lx = e.clientX;
      ly = e.clientY;
      moved = 1;
    };
    pc.onpointerup = (e) => {
      drag = 0;
      pc.style.cursor = "grab";
      if (moved) return;
      const r = pc.getBoundingClientRect();
      const mx = e.clientX - r.left;
      const my = e.clientY - r.top;
      let b = -1;
      let bd2 = 30;
      pts.forEach((p, i) => {
        const d = Math.hypot(p[0] - mx, p[1] - my);
        if (d < bd2 && p[3]) {
          bd2 = d;
          b = i;
        }
      });
      if (b >= 0) {
        sel = b;
        const it = $("#it");
        const ib = $("#ib");
        if (it) it.textContent = KN[nodes[b].k][0];
        if (ib) ib.textContent = KN[nodes[b].k][1];
      }
    };
    const re = $("#re");
    if (re) {
      re.onclick = () => {
        t0Ref.v = performance.now();
        sel = -1;
      };
      offs.push(() => {
        re.onclick = null;
      });
    }
    offs.push(() => {
      pc.onpointerdown = null;
      pc.onpointermove = null;
      pc.onpointerup = null;
    });
    loop((now) => {
      if (!vis) return;
      if (!drag && !RM) ay += 0.004;
      const sh = RM ? N : Math.floor((now - t0Ref.v) / 220);
      const sc = Math.min(W, H) / 3.6;
      x.clearRect(0, 0, W, H);
      pts = nodes.map((n, i) => {
        let X = n.x * Math.cos(ay) - n.z * Math.sin(ay);
        let Z = n.x * Math.sin(ay) + n.z * Math.cos(ay);
        let Y = n.y * Math.cos(ax) - Z * Math.sin(ax);
        Z = n.y * Math.sin(ax) + Z * Math.cos(ax);
        const k = 1 / (1 - Z * 0.18);
        return [W / 2 + X * sc * k, H / 2 + Y * sc * k, k, i < sh];
      });
      for (let i = 0; i < N; i++) {
        const a = pts[i];
        [i + 1, i + 4].forEach((j, q) => {
          const b = pts[j];
          if (b && a[3] && b[3]) {
            x.strokeStyle = q ? "rgba(217,156,121,.55)" : "#344C3D";
            x.lineWidth = q ? 1.5 : 3;
            x.beginPath();
            x.moveTo(a[0], a[1]);
            x.lineTo(b[0], b[1]);
            x.stroke();
          }
        });
      }
      pts
        .map((p, i) => [p, i])
        .sort((a, b) => a[0][2] - b[0][2])
        .forEach(([p, i]) => {
          if (!p[3]) return;
          x.fillStyle = nodes[i].c;
          x.beginPath();
          x.arc(p[0], p[1], (i === sel ? 19 : 13) * p[2], 0, 7);
          x.fill();
          x.strokeStyle = "#344C3D";
          x.lineWidth = i === sel ? 3 : 1.5;
          x.stroke();
        });
    });
  }

  /* The sample tutor is a React component backed by the live AI endpoint. */

  /* Tools: notes reveal, flashcard flip, quiz, constellation */
  const nt = $("#nt");
  observe(
    nt,
    (e) => {
      if (e[0].isIntersecting && nt) nt.classList.add("in");
    },
    { threshold: 0.5 },
  );
  const fc = $("#fc");
  if (fc) {
    fc.onclick = () => {
      fc.classList.toggle("f");
      if (fc.classList.contains("f")) star(0);
    };
    offs.push(() => {
      fc.onclick = null;
    });
  }
  const SP = [
    [20, 90],
    [50, 70],
    [85, 85],
    [60, 45],
    [110, 60],
    [140, 30],
    [170, 50],
  ];
  if (cs) {
    cs.innerHTML =
      [
        [0, 1],
        [1, 2],
        [1, 3],
        [3, 4],
        [4, 5],
        [5, 6],
      ]
        .map(
          ([a, b]) =>
            '<line x1="' +
            SP[a][0] +
            '" y1="' +
            SP[a][1] +
            '" x2="' +
            SP[b][0] +
            '" y2="' +
            SP[b][1] +
            '" stroke-width="1.5"/>',
        )
        .join("") +
      SP.map((p) => '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="4"/>').join(
        "",
      );
  }
  let lit = 0;
  function star() {
    if (!cs) return;
    const c = cs.querySelectorAll("circle");
    const l = cs.querySelectorAll("line");
    for (let i = 0; i <= Math.min(6, lit); i++) {
      if (c[i]) c[i].classList.add("on");
    }
    if (lit > 0 && l[lit - 1]) l[lit - 1].classList.add("on");
    lit++;
  }
  const qz = $("#qz");
  if (qz) {
    /* Idempotent reset: drop buttons added by a previous init pass. */
    Array.from(qz.querySelectorAll("button")).forEach((b) => b.remove());
    const gap = $("#gap");
    if (gap)
      gap.textContent = "Answer the quiz and flip the card to light stars.";
    [
      ["Ethylene", 1],
      ["Cellulose", 0],
      ["Nylon", 0],
    ].forEach(([t, ok]) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = t;
      b.onclick = () => {
        if (b.classList.contains("ok")) return;
        b.classList.add(ok ? "ok" : "no");
        if (ok) {
          star();
          star();
          if (gap) gap.textContent = "Nice. Monomers and polymers look solid.";
        } else if (gap) {
          gap.textContent =
            "Try the flashcard again to review monomers and polymers.";
        }
      };
      qz.appendChild(b);
      offs.push(() => {
        b.onclick = null;
      });
    });
  }

  return () => {
    offs.forEach((fn) => fn());
    timers.forEach((id) => clearTimeout(id));
    timers.clear();
    rafs.forEach((fn) => fn());
    observers.forEach((io) => io.disconnect());
  };
}

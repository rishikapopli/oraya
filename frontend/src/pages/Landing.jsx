import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import LANDING_CSS from "./landingCss";
import { initLanding } from "./landingScript";
import { LandingTutor } from "../components/LandingTutor";

/* ORAYA landing — editorial scroll-driven page.
   Styles are injected as a route-scoped <style> tag so they only exist
   while this route is mounted; behavior lives in landingScript.js. */

export default function Landing() {
  const rootRef = useRef(null);
  const [sampleSource, setSampleSource] = useState(null);

  useEffect(() => {
    if (!rootRef.current) return undefined;
    return initLanding(rootRef.current);
  }, []);

  return (
    <div ref={rootRef}>
      <style>{LANDING_CSS}</style>

      <nav id="nav">
        <a className="logo" href="#top">
          oraya
        </a>
        <ul>
          <li>
            <a href="#how">Product</a>
          </li>
          <li>
            <a href="#studio">AI Studio</a>
          </li>
          <li>
            <a href="#lab">Explore</a>
          </li>
          <li>
            <a href="#tutor">Tutor</a>
          </li>
          <li>
            <a href="#tools">Learning tools</a>
          </li>
        </ul>
        <div className="nav-actions">
          <Link className="nav-login" to="/login">
            Log in
          </Link>
          <Link className="btn mag" to="/signup">
            Get started
          </Link>
        </div>
      </nav>

      <header className="hero" id="top">
        <canvas id="hc" aria-hidden="true" />
        <div className="stage3" aria-hidden="true">
          <div className="book">
            <div className="pg l" />
            <div className="pg r" />
            <div className="pg flip">
              <i />
              <i />
            </div>
          </div>
          <div className="mark" id="mark">
            {"oraya".split("").map((c, i) => (
              <span key={i} style={{ animationDelay: 3.1 + i * 0.12 + "s" }}>
                {c}
              </span>
            ))}
          </div>
        </div>
        <div className="hl">
          <h1>
            Learning was never meant to be <em>passive.</em>
          </h1>
          <div className="r">
            <p>
              Turn videos into conversations, ideas into visual stories, and
              curiosity into real understanding.
            </p>
            <div className="cta">
              <Link className="btn mag" to="/signup">
                Explore Oraya
              </Link>
              <a className="btn g mag" href="#how">
                See how it works
              </a>
            </div>
          </div>
        </div>
      </header>

      <section className="act a2" id="how">
        <div className="pin">
          <div className="cap">
            <h2 id="c2">Every video hides a map.</h2>
            <p id="p2">Scroll. Oraya pulls the footage apart.</p>
          </div>
          <div className="vs" id="vs">
            <svg viewBox="-50 -50 100 100" id="ln" />
            <div className="frame" id="fr">
              <b />
            </div>
          </div>
          <div className="steps" id="st2">
            <span>Watch</span>
            <span>Analyse</span>
            <span>Understand</span>
            <span>Explore</span>
          </div>
        </div>
      </section>

      <section className="act a3" id="studio">
        <div className="pin">
          <div className="cap">
            <h2>An idea in. A video out.</h2>
            <p>The AI Video Studio drafts, you direct.</p>
          </div>
          <div className="studio">
            <div className="pipe" id="pp">
              <span>Idea</span>
              <span>Script</span>
              <span>Storyboard</span>
              <span>Scenes</span>
              <span>Video</span>
            </div>
            <div className="boards" id="bds" />
            <div className="tl">
              <i id="tli" />
            </div>
            <div className="prev" id="prev">
              <div>
                <h3>How polymers form</h3>
                <p>
                  Illustrative storyboard · render your own narrated explainer
                  in a lecture
                </p>
                <Link to="/learn/new">Create your explainer →</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="a4" id="lab">
        <div className="hd">
          <h2>Poke at polymers.</h2>
          <p>
            Drag to rotate. Select a node to see what it is and why it matters.
          </p>
        </div>
        <div className="lab">
          <canvas
            id="pc"
            tabIndex={0}
            role="img"
            aria-label="Interactive 3D polymer chain. Select nodes for explanations."
          />
          <div className="info">
            <div>
              <h3 id="it">Polymer chain</h3>
              <p id="ib">
                Long chains of repeating units called monomers. Select any node.
              </p>
            </div>
            <button className="btn" id="re" type="button">
              Assemble again
            </button>
          </div>
        </div>
      </section>

      <section className="a5" id="tutor">
        <div>
          <div className="vid">
            <div className="cc" id="cc">
              {sampleSource
                ? sampleSource.quote
                : "A polymer is a long chain of small repeating units called monomers."}
            </div>
            <div className="bar">
              <i
                id="pi"
                style={{
                  width: `${sampleSource ? (sampleSource.start / 280) * 100 : 48}%`,
                }}
              />
              <u
                id="pu"
                style={{
                  left: `${sampleSource ? (sampleSource.start / 280) * 100 : 48}%`,
                }}
              />
            </div>
          </div>
          <p className="note" style={{ marginTop: "12px" }}>
            Live AI answers from an ORAYA-authored sample transcript. The visual
            is an illustration; open a lecture to chat about your own video.
          </p>
        </div>
        <div>
          <h2
            style={{ fontSize: "clamp(36px,5vw,72px)", marginBottom: "22px" }}
          >
            Ask the video anything.
          </h2>
          <LandingTutor onSource={setSampleSource} />
        </div>
      </section>

      <section className="a6" id="tools">
        <h2>From watching to knowing.</h2>
        <p className="note">
          Interactive tool previews.{" "}
          <Link to="/learn/new">
            Open your own lecture for generated notes, quizzes and videos.
          </Link>
        </p>
        <div className="tools">
          <div>
            <div className="notes" id="nt">
              <h3>Notes, written as you watch</h3>
              <ul style={{ padding: 0, margin: 0 }}>
                <li>Monomers are small repeating units.</li>
                <li>Covalent bonds join them into chains.</li>
                <li>Cross-links make a polymer stiffer.</li>
              </ul>
            </div>
            <button
              className="card"
              id="fc"
              type="button"
              aria-label="Flashcard, press to flip"
            >
              <div>
                <span>What joins monomers into a polymer?</span>
                <span>Covalent bonds, formed during polymerisation.</span>
              </div>
            </button>
          </div>
          <div className="quiz" id="qz">
            <h3 style={{ fontSize: "28px" }}>
              Which is the monomer of polyethylene?
            </h3>
          </div>
          <div className="const">
            <h3 style={{ fontSize: "26px", margin: "0 0 6px" }}>
              Your constellation
            </h3>
            <svg viewBox="0 0 200 120" id="cs" />
            <p className="note" id="gap">
              Answer the quiz and flip the card to light stars.
            </p>
          </div>
        </div>
      </section>

      <section className="fin" id="join">
        <div className="mo" style={{ left: "8%", top: "14%", width: "110px" }}>
          <svg viewBox="0 0 100 100">
            <polygon points="50,4 93,28 93,72 50,96 7,72 7,28" fill="#F0D98C" />
          </svg>
        </div>
        <div
          className="mo"
          style={{
            right: "10%",
            top: "20%",
            width: "80px",
            animationDelay: "-4s",
          }}
        >
          <svg viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="46" fill="#C8B6DC" />
          </svg>
        </div>
        <div
          className="mo"
          style={{
            left: "14%",
            bottom: "12%",
            width: "90px",
            animationDelay: "-8s",
          }}
        >
          <svg viewBox="0 0 100 100">
            <rect x="6" y="20" width="88" height="60" rx="8" fill="#344C3D" />
            <polygon points="42,36 42,64 66,50" fill="#F0D98C" />
          </svg>
        </div>
        <div
          className="mo"
          style={{
            right: "12%",
            bottom: "14%",
            width: "120px",
            animationDelay: "-2s",
          }}
        >
          <svg viewBox="0 0 100 100">
            <g stroke="#344C3D" strokeWidth="3">
              <line x1="10" y1="80" x2="40" y2="30" />
              <line x1="40" y1="30" x2="80" y2="60" />
            </g>
            <circle cx="10" cy="80" r="9" fill="#A9BE9D" />
            <circle cx="40" cy="30" r="9" fill="#F7F5EF" />
            <circle cx="80" cy="60" r="9" fill="#A9BE9D" />
          </svg>
        </div>
        <div>
          <h2>Curiosity deserves more than a play button.</h2>
          <Link className="btn mag" to="/signup">
            Start learning with Oraya
          </Link>
        </div>
      </section>

      <footer>
        <span>oraya · Don’t just watch. Understand.</span>
        <span>Light-mode concept build</span>
      </footer>
    </div>
  );
}

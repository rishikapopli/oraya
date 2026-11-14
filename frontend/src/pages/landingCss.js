/* Landing page styles — verbatim from the approved ORAYA landing design.
   Rendered inside Landing.jsx as a route-scoped <style> tag: styles exist
   only while the landing route is mounted, so they never leak into the app. */
const LANDING_CSS = `
:root{color-scheme:light;--iv:#F7F5EF;--iv2:#EFEBDF;--fo:#344C3D;--sa:#A9BE9D;--bu:#F0D98C;--la:#C8B6DC;--te:#D99C79;--ch:#292B27;--ser:'Instrument Serif',Georgia,serif;--sans:'DM Sans',system-ui,sans-serif;box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}
*,*::before,*::after{box-sizing:inherit}html{scroll-behavior:smooth;scroll-padding-top:70px}
body{margin:0;background:var(--iv);color:var(--ch);font:400 17px/1.55 var(--sans);overflow-x:hidden}
h1,h2,h3{font-family:var(--ser);font-weight:400;margin:0;line-height:.95;letter-spacing:-.02em}
h2{font-size:clamp(40px,7vw,104px)}p{margin:0}button{font:inherit;cursor:pointer;color:inherit}
:focus-visible{outline:3px solid var(--fo);outline-offset:3px}
nav{position:fixed;top:env(safe-area-inset-top,0px);left:0;right:0;z-index:50;display:flex;align-items:center;justify-content:space-between;padding:18px 4vw;transition:.4s}
nav.s{background:rgba(247,245,239,.88);backdrop-filter:blur(10px);padding:10px 4vw;border-bottom:1px solid #e3dece}
.logo{font:400 30px var(--ser);letter-spacing:.04em;color:var(--fo);text-decoration:none}
nav ul{display:flex;gap:28px;list-style:none;margin:0;padding:0}nav a{color:inherit;text-decoration:none;font-size:15px;position:relative}
nav ul a::after{content:"";position:absolute;left:0;bottom:-4px;height:2px;width:100%;background:var(--te);transform:scaleX(0);transform-origin:left;transition:.3s}
nav ul a:hover::after,nav ul a.on::after{transform:scaleX(1)}
.btn{display:inline-block;border:0;border-radius:99px;padding:14px 26px;background:var(--fo);color:var(--iv);text-decoration:none;font-weight:500;transition:transform .25s,background .3s}
.btn.g{background:transparent;color:var(--fo);box-shadow:inset 0 0 0 1.5px var(--fo)}.btn:hover{background:var(--ch)}.btn.g:hover{background:var(--bu)}
@media(max-width:760px){nav ul{display:none}}
/* hero */
.hero{position:relative;min-height:100svh;display:grid;grid-template-rows:1fr auto;padding:0 4vw 5vh;overflow:hidden}
#hc{position:absolute;inset:0;width:100%;height:100%}
.stage3{position:relative;display:grid;place-items:center;perspective:1400px;padding-top:12vh}
.book{position:relative;width:min(56vmin,440px);height:min(36vmin,290px);transform-style:preserve-3d;transform:rotateX(30deg) rotateZ(-4deg);filter:drop-shadow(0 40px 30px rgba(52,76,61,.22))}
.pg{position:absolute;top:0;width:50%;height:100%;background:#fcfaf4 repeating-linear-gradient(transparent 0 15px,#e6e0cf 15px 16px) 0 20px/100% 100% no-repeat;border:1px solid #d6d0bd}
.pg.l{left:0;border-radius:8px 0 0 8px;opacity:0;animation:fi .8s 1.9s forwards;background-color:var(--bu)}
.pg.r{right:0;border-radius:0 8px 8px 0}
.flip{right:0;transform-origin:left center;transform-style:preserve-3d;animation:flip 2.6s .5s cubic-bezier(.65,0,.2,1) forwards;background:none;border:0}
.flip i{position:absolute;inset:0;backface-visibility:hidden;border-radius:0 8px 8px 0;background:var(--fo);border:1px solid #243529}
.flip i+i{transform:rotateY(180deg);background:#fcfaf4;border-radius:8px 0 0 8px}
@keyframes flip{to{transform:rotateY(-172deg)}}@keyframes fi{to{opacity:1}}
.mark{position:absolute;top:calc(50% - 60px);font:400 clamp(60px,14vw,190px)/1 var(--ser);color:var(--fo);letter-spacing:.06em;pointer-events:none;display:flex}
.mark span{opacity:0;transform:translateY(40%);animation:up 1s forwards}@keyframes up{to{opacity:1;transform:none}}
.hl{display:grid;grid-template-columns:1.5fr 1fr;gap:4vw;align-items:end;position:relative}
.hl h1{font-size:clamp(44px,8.4vw,132px)}.hl h1 em{font-style:italic;color:var(--te)}
.hl .r p{margin-bottom:22px;max-width:36ch}.hl .r{display:grid}.cta{display:flex;gap:12px;flex-wrap:wrap}
@media(max-width:760px){.hl{grid-template-columns:1fr;gap:20px}.mark{top:30%}}
/* sticky acts */
.act{position:relative}.pin{position:sticky;top:0;height:100svh;overflow:hidden;display:grid;place-items:center}
.cap{position:absolute;left:4vw;top:14vh;max-width:min(480px,70vw);z-index:3}.cap h2{font-size:clamp(34px,5vw,72px)}
.cap p{margin-top:14px;max-width:36ch}
.steps{position:absolute;bottom:5vh;left:0;right:0;display:flex;justify-content:center;gap:clamp(10px,3vw,40px);z-index:3;font:400 clamp(20px,3.4vw,44px) var(--ser)}
.steps span{opacity:.25;transition:.4s}.steps span.on{opacity:1;color:var(--te)}
/* act II */
.a2{height:400vh;background:var(--iv2)}
.vs{position:relative;width:100vmin;height:100vmin;max-height:100svh}
.frame{position:absolute;left:50%;top:50%;width:56vmin;height:34vmin;background:var(--fo);border-radius:14px;transform:translate(-50%,-50%);display:grid;place-items:center;box-shadow:0 30px 60px rgba(41,43,39,.2)}
.frame b{width:9vmin;height:9vmin;border-radius:50%;background:var(--bu);display:grid;place-items:center}.frame b::after{content:"";border-left:3vmin solid var(--fo);border-top:2vmin solid transparent;border-bottom:2vmin solid transparent;margin-left:.8vmin}
.tile{position:absolute;left:50%;top:50%;width:17vmin;height:11vmin;margin:-5.5vmin 0 0 -8.5vmin;opacity:0;border-radius:8px;display:grid;place-items:center;font:12px var(--sans);text-align:center;padding:4px}
.vs svg{position:absolute;inset:0;width:100%;height:100%;opacity:0}
.frag{position:absolute;font:italic 400 clamp(14px,2.2vmin,22px) var(--ser);opacity:0;color:var(--fo);transition:opacity .5s}
/* act III */
.a3{height:450vh}
.studio{width:min(1000px,92vw);margin-top:16vh;background:#fcfaf4;border:1px solid #d6d0bd;border-radius:16px;padding:14px;box-shadow:0 30px 60px rgba(41,43,39,.12);position:relative}
.pipe{display:flex;gap:6px;margin-bottom:12px;font-size:13px;flex-wrap:wrap}.pipe span{padding:4px 12px;border-radius:99px;background:var(--iv2);transition:.4s}.pipe span.on{background:var(--fo);color:var(--iv)}
.boards{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.bd{aspect-ratio:16/10;border:1.5px dashed #c9c3ae;border-radius:8px;padding:8px;display:flex;flex-direction:column;justify-content:space-between;font-size:12px;transition:.5s;background:transparent}
.bd svg{width:100%;height:55%;opacity:0;transform:scale(.8);transition:.6s}.bd small{opacity:0;transition:.6s .2s;line-height:1.3}
.bd.on{border-style:solid;border-color:var(--sa);background:#fff}.bd.on svg{opacity:1;transform:none}.bd.on small{opacity:1}
.bd b{font-weight:600;color:var(--te)}
.tl{height:8px;border-radius:9px;background:var(--iv2);margin-top:12px;overflow:hidden}.tl i{display:block;height:100%;width:0;background:var(--te)}
.prev{position:absolute;inset:0;border-radius:16px;background:var(--fo);color:var(--iv);display:grid;place-items:center;text-align:center;opacity:0;pointer-events:none;transition:.6s}
.prev.on{opacity:1}.prev h3{font-size:clamp(30px,5vw,60px)}.prev p{opacity:.8}
/* act IV */
.a4{padding:16vh 4vw;background:var(--sa);position:relative}
.a4 .hd{max-width:900px;margin-bottom:5vh}.a4 .hd p{margin-top:14px;max-width:44ch}
.lab{display:grid;grid-template-columns:2fr 1fr;gap:20px;min-height:68vh}
#pc{width:100%;height:68vh;border-radius:18px;background:var(--iv);cursor:grab;touch-action:pan-y}
.info{background:var(--iv);border-radius:18px;padding:26px;display:flex;flex-direction:column;justify-content:space-between;gap:14px}.info h3{font-size:36px}
@media(max-width:760px){.lab{grid-template-columns:1fr}}
/* act V */
.a5{padding:18vh 4vw;display:grid;grid-template-columns:1fr 1fr;gap:5vw;align-items:center}
.vid{background:var(--fo);border-radius:16px;aspect-ratio:16/10;position:relative;color:var(--iv);padding:20px;display:flex;flex-direction:column;justify-content:flex-end;overflow:hidden}
.vid .cc{font:italic 22px var(--ser);margin-bottom:14px}.bar{height:6px;background:rgba(255,255,255,.2);border-radius:9px;position:relative}.bar i{position:absolute;left:0;top:0;bottom:0;background:var(--bu);border-radius:9px;transition:width .8s}
.bar u{position:absolute;top:-4px;width:14px;height:14px;border-radius:50%;background:var(--la);transform:translateX(-50%);transition:left .8s}
.chat{background:#fcfaf4;border:1px solid #d6d0bd;border-radius:16px;padding:18px;min-height:420px;display:flex;flex-direction:column;gap:10px}
.msgs{flex:1;display:flex;flex-direction:column;gap:10px}
.m{padding:10px 14px;border-radius:14px;max-width:88%;font-size:15px}.m.u{align-self:flex-end;background:var(--la)}.m.o{background:var(--iv2)}
.ts{border:0;background:var(--te);border-radius:99px;padding:1px 10px;font-size:13px;color:#fff;margin:0 2px;background:#a95f3b}
.chips{display:flex;flex-wrap:wrap;gap:8px}.chips button{border:1.5px solid var(--fo);background:transparent;border-radius:99px;padding:8px 14px;font-size:14px}.chips button:hover{background:var(--bu)}
.note{font-size:13px;opacity:.7}
@media(max-width:860px){.a5{grid-template-columns:1fr}}

.live-tutor{max-height:680px}
.live-tutor .msgs{max-height:390px;min-height:170px;overflow-y:auto;padding:3px;overflow-wrap:anywhere}
.live-tutor-label{display:flex;align-items:center;gap:7px;font-size:12px;font-weight:700;color:#344c3d}
.live-tutor-label>span{width:7px;height:7px;border-radius:50%;background:#3f8a52}
.live-tutor .m{flex-shrink:0;max-width:94%}
.live-tutor .m p{margin:0 0 7px;font-size:14px;line-height:1.65}
.live-tutor .m p:last-child{margin-bottom:0}
.live-tutor .m .live-tutor-origin{font-size:11px;color:#6e6a63;border-top:1px solid #d6d0bd;padding-top:8px;margin-top:10px}
.live-tutor-sources{display:flex;flex-wrap:wrap;gap:5px;margin-top:10px}
.live-tutor-sources button{min-height:44px;min-width:44px}
.live-tutor-thinking{display:flex;align-items:center;gap:8px;font-size:13px}
.live-tutor-form{display:flex;align-items:center;gap:8px;border-top:1px solid #d6d0bd;padding-top:12px}
.live-tutor-form input{flex:1;min-width:0;border:1px solid #b7b09c;border-radius:10px;padding:10px 12px;background:#fff;min-height:44px;font-size:14px}
.live-tutor-form button{width:44px;height:44px;display:grid;place-items:center;border:0;border-radius:12px;background:#344c3d;color:white;cursor:pointer}
.live-tutor button:disabled{opacity:.5;cursor:wait}
.live-tutor-error{font-size:13px;color:#a33225;padding:10px;background:#fbeae5;border-radius:9px}

/* act VI */
.a6{padding:14vh 4vw;background:var(--bu)}.a6 h2{max-width:14ch}
.tools{display:grid;grid-template-columns:1fr 1fr 1.1fr;gap:20px;margin-top:6vh;align-items:start}
.notes{background:#fcfaf4;border-radius:16px;padding:22px}.notes h3{font-size:28px;margin-bottom:10px}
.notes li{margin:0 0 8px;list-style:none;opacity:0;transform:translateX(-12px);transition:.6s}.notes.in li{opacity:1;transform:none}
.notes li:nth-child(2){transition-delay:.3s}.notes li:nth-child(3){transition-delay:.6s}.notes li:nth-child(4){transition-delay:.9s}
.card{perspective:900px;height:210px;cursor:pointer;border:0;background:none;box-shadow:none;width:100%;padding:0}
.card div{position:relative;width:100%;height:100%;transform-style:preserve-3d;transition:transform .8s cubic-bezier(.3,1.3,.5,1)}.card.f div{transform:rotateY(180deg)}
.card span{position:absolute;inset:0;backface-visibility:hidden;border-radius:16px;display:grid;place-items:center;padding:22px;font:400 26px/1.1 var(--ser);text-align:center}
.card span:first-child{background:var(--fo);color:var(--iv)}.card span+span{background:var(--la);transform:rotateY(180deg)}
.quiz{background:#fcfaf4;border-radius:16px;padding:22px;margin-top:14px}.quiz button{display:block;width:100%;text-align:left;border:1.5px solid #d6d0bd;background:transparent;border-radius:10px;padding:10px 14px;margin-top:8px;transition:.3s}
.quiz button.ok{background:var(--sa);border-color:var(--fo);transform:scale(1.02)}.quiz button.no{background:#eebfa6;animation:sh .4s}
@keyframes sh{25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}
.const{background:#fcfaf4;border-radius:16px;padding:14px}.const svg{width:100%;height:auto}.const circle{fill:#d6d0bd;transition:.7s}.const circle.on{fill:var(--te);r:7}.const line{stroke:#d6d0bd;transition:.7s}.const line.on{stroke:var(--fo)}
@media(max-width:900px){.tools{grid-template-columns:1fr}}
/* finale */
.fin{position:relative;min-height:100svh;display:grid;place-items:center;text-align:center;padding:12vh 4vw;overflow:hidden;background:var(--te)}
.fin h2{font-size:clamp(44px,9vw,150px);position:relative;z-index:2;max-width:12ch;margin:0 auto 34px}.fin .btn{position:relative;z-index:2;background:var(--ch)}.fin .btn:hover{background:var(--fo)}
.mo{position:absolute;opacity:.85;animation:dr 14s ease-in-out infinite alternate}@keyframes dr{to{transform:translate(30px,-40px) rotate(40deg)}}
footer{padding:22px 4vw;font-size:14px;display:flex;justify-content:space-between;background:var(--iv)}
@media(prefers-reduced-motion:reduce){*{animation-duration:.01s!important;animation-delay:0s!important;transition-duration:.01s!important}html{scroll-behavior:auto}}
/* ORAYA integration additions: auth links + app .btn/.card class reconciliation */
.nav-actions{display:flex;align-items:center;gap:16px}
.nav-login{color:inherit;text-decoration:none;font-size:15px;position:relative;white-space:nowrap}
.nav-login::after{content:"";position:absolute;left:0;bottom:-4px;height:2px;width:100%;background:var(--te);transform:scaleX(0);transform-origin:left;transition:.3s}
.nav-login:hover::after{transform:scaleX(1)}
`;

export default LANDING_CSS;

import fs from 'node:fs';

const paths = {
  calendar: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M16 3v4M8 3v4M3 11h18M8 16l3 3 5-5"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  doctor: '<path d="M6 3v5a4 4 0 0 0 8 0V3M4 3h4M12 3h4M10 12v3a5 5 0 0 0 10 0v-2"/><circle cx="20" cy="10" r="2"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  video: '<rect x="3" y="6" width="12" height="12" rx="3"/><path d="m15 10 6-3v10l-6-3"/>',
  pin: '<path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8ZM14 2v6h6M8 13h8M8 17h5"/>',
};
const icon = (name, cls='') => `<svg class="ico ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
const audio = JSON.parse(fs.readFileSync('assets/music/audio-data.json','utf8'));
fs.writeFileSync('assets/music/audio-data.js', `window.SALUD_AUDIO=${JSON.stringify({fps:30,frames:audio.frames.slice(0,600)})};`);

const html = `<!doctype html>
<html lang="es" data-resolution="portrait">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=1080, height=1920">
<title>SaludClick · Tu salud, a un clic</title>
<script src="assets/js/gsap.min.js"></script>
<script src="assets/music/audio-data.js"></script>
<style>
@font-face{font-family:Inter;src:url('assets/fonts/inter-latin-400-normal.woff2') format('woff2');font-weight:400;font-display:block}
@font-face{font-family:Inter;src:url('assets/fonts/inter-latin-600-normal.woff2') format('woff2');font-weight:600;font-display:block}
@font-face{font-family:Inter;src:url('assets/fonts/inter-latin-700-normal.woff2') format('woff2');font-weight:700;font-display:block}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:1080px;height:1920px;overflow:hidden;background:#f7fafc}
#root{position:relative;width:100%;height:100%;overflow:hidden;font-family:Inter,sans-serif;color:#0f172a;background:#f7fafc}
.clip{position:absolute;inset:0}.scene{position:absolute;inset:0}.ico{width:40px;height:40px;flex:none;display:block}
.ambient{position:absolute;left:590px;top:1040px;width:370px;height:440px;border:2px solid #a5e2ef;border-radius:84px;background:#e4f8fc}
.ambient2{position:absolute;left:795px;top:230px;width:110px;height:110px;border:2px solid #bae6fd;border-radius:30px}
.top-logo{position:absolute;left:42px;top:90px;width:440px;height:150px;object-fit:contain}
.top-note{position:absolute;right:85px;top:151px;font-size:24px;font-weight:600;letter-spacing:3px;color:#475569}
.rule{position:absolute;left:85px;top:260px;width:910px;height:2px;background:#cbdfe9;transform-origin:left center}
.label{font-size:26px;letter-spacing:4px;font-weight:600;color:#0369a1;line-height:1.4}
.accent{color:#0369a1}.muted{color:#475569}.small{font-size:26px;line-height:1.5;color:#475569}.tiny{font-size:24px;color:#475569}
.headline{font-size:96px;line-height:1.1;font-weight:700;letter-spacing:-5px}
.headline span{display:block}.line{display:block;--hf-line-x:0px;--hf-line-y:0px;transform:translate(var(--hf-line-x),var(--hf-line-y))}
.s1-label{position:absolute;left:85px;top:340px}.s1-title{position:absolute;left:80px;top:435px;width:910px;font-size:142px;line-height:1.06;letter-spacing:-8px}
.s1-copy{position:absolute;left:86px;top:805px;font-size:37px;line-height:1.55;font-weight:400;width:840px}
.hero-card{position:absolute;left:85px;top:1030px;width:910px;height:490px;padding:52px;background:#fff;border:2px solid #bcdfea;border-radius:44px;box-shadow:0 32px 65px rgba(15,66,96,.12)}
.card-top{display:flex;align-items:center;gap:28px}.icon-box{display:flex;align-items:center;justify-content:center;width:100px;height:100px;border-radius:28px;background:#e0f2fe;color:#0369a1}.icon-box .ico{width:54px;height:54px}
.card-top h2{font-size:43px;letter-spacing:-1.8px;line-height:1.2}.card-top p{font-size:27px;color:#475569;margin-top:10px}
.hero-divider{height:2px;background:#deebf2;margin:38px 0 30px}.card-row{display:flex;justify-content:space-between;align-items:center}.row-label{font-size:29px;color:#475569}.row-value{font-size:39px;font-weight:600;margin-top:12px;letter-spacing:-1px}
.hero-badge{display:flex;align-items:center;gap:12px;font-size:25px;color:#075985;background:#e0f2fe;padding:20px 22px;border-radius:24px}.hero-badge .ico{width:31px;height:31px}
.s1-bottom{position:absolute;left:86px;top:1620px;font-size:27px;letter-spacing:1px;color:#475569}
.section-heading{position:absolute;left:84px;top:332px;width:920px}.section-heading h2{margin-top:30px}.section-heading .headline{font-size:89px;line-height:1.1}
.app{position:absolute;left:85px;top:660px;width:910px;border:2px solid #bcdfea;border-radius:40px;background:#fff;box-shadow:0 30px 60px rgba(15,66,96,.11);overflow:hidden}
.app-bar{height:94px;background:#edf7fc;border-bottom:2px solid #d5e8f2;display:flex;align-items:center;justify-content:space-between;padding:0 42px;font-size:26px;font-weight:600;color:#334155}
.app-brand{display:flex;align-items:center;gap:12px;color:#075985;font-size:29px}.app-brand img{width:45px;height:45px;object-fit:contain}.app-inner{padding:38px 42px 40px}
.search{display:flex;align-items:center;gap:20px;border:2px solid #b9d7e7;border-radius:19px;height:94px;padding:0 25px;color:#334155;font-size:31px;background:#f8fbfd}.search .ico{color:#0369a1;width:35px;height:35px}.search .end{margin-left:auto;width:27px}
.doctor-card{margin-top:27px;border:2px solid #cddfe9;border-radius:27px;overflow:hidden;background:#fff}.doctor-visual{height:166px;background:#e0f2fe;display:flex;align-items:center;justify-content:space-between;padding:30px 34px;color:#0369a1}.doctor-visual .ico{height:78px;width:78px}.specialty{background:#fff;color:#075985;font-size:27px;font-weight:600;padding:15px 20px;border-radius:22px}
.doctor-detail{padding:30px 34px}.doctor-name{font-size:44px;font-weight:700;letter-spacing:-1.5px}.doctor-sub{font-size:27px;color:#475569;margin-top:15px}.modality{display:flex;align-items:center;gap:14px;font-size:27px;color:#075985;margin-top:25px}.modality .ico{width:33px;height:33px}
.button{height:92px;background:#0369a1;color:#fff;border-radius:20px;display:flex;align-items:center;justify-content:center;gap:23px;font-size:33px;font-weight:600;letter-spacing:-.6px}.doctor-button{margin-top:28px}.button .ico{height:34px;width:34px}.example{margin-top:21px;font-size:24px;color:#475569;text-align:right}
.under-app{position:absolute;left:86px;top:1600px;display:flex;align-items:center;gap:16px;font-size:31px;color:#334155}.under-app .ico{color:#0369a1}
.tap{position:absolute;width:86px;height:86px;border:4px solid #0284c7;border-radius:50%;background:rgba(14,165,233,.10);opacity:0;pointer-events:none}.tap1{left:730px;top:1405px}
.booking-app{top:618px;height:890px}.booking-inner{padding:34px 42px}.doctor-mini{font-size:34px;letter-spacing:-.6px;font-weight:600}.doctor-mini-sub{font-size:25px;color:#475569;margin-top:10px}.booking-divider{height:2px;background:#d9e9f2;margin:26px 0}
.mode-row{display:flex;gap:20px}.mode{border:2px solid #bbd5e6;background:#f4f9fc;border-radius:18px;padding:20px 23px;display:flex;align-items:center;gap:12px;font-size:26px}.mode.selected{border-color:#0369a1;background:#e0f2fe;color:#075985}.mode .ico{width:30px;height:30px}
.booking-label{font-size:28px;font-weight:600;margin-top:28px}.date-row{margin-top:18px;padding:19px 24px;border:2px solid #bcd7e7;border-radius:17px;font-size:29px;display:flex;align-items:center;justify-content:space-between}.date-row .ico{color:#0369a1;width:33px;height:33px}
.slots{display:flex;gap:18px;margin-top:19px}.slot{flex:1;height:81px;border:2px solid #bcd7e7;border-radius:18px;font-size:31px;display:flex;align-items:center;justify-content:center;font-weight:600;background:#f8fbfd;color:#334155}.confirm-button{margin-top:30px;height:85px}.booking-example{position:absolute;bottom:24px;right:43px;font-size:24px;color:#475569}
.tap2{left:500px;top:1170px}.tap3{left:750px;top:1320px}
.success{position:absolute;left:85px;top:618px;width:910px;height:890px;background:#fff;border:2px solid #bcdfea;border-radius:40px;box-shadow:0 30px 60px rgba(15,66,96,.11);padding:76px 55px;text-align:center;opacity:0}
.success-icon{display:flex;align-items:center;justify-content:center;width:146px;height:146px;margin:0 auto 38px;border-radius:50%;background:#def7f3;color:#0f766e}.success-icon .ico{width:82px;height:82px;stroke-width:2.2}.success h3{font-size:63px;letter-spacing:-2.5px}.success .doctor-name{margin-top:38px;font-size:36px}.success-info{display:flex;justify-content:center;align-items:center;gap:20px;font-size:31px;margin-top:31px;color:#334155}.success-info .ico{color:#0369a1}.success-pills{border-top:2px solid #d9e9f2;margin-top:48px;padding-top:39px;display:flex;justify-content:space-evenly;font-size:27px;color:#075985}
.s3-bottom{position:absolute;left:85px;top:1570px;width:910px;font-size:37px;font-weight:600;line-height:1.4;letter-spacing:-1px}.s3-bottom span{display:block}.s3-bottom .muted{font-size:30px;font-weight:400;margin-top:12px}
.outro-logo{position:absolute;left:100px;top:540px;width:880px;height:300px;object-fit:contain}.outro-label{position:absolute;top:376px;width:100%;text-align:center}.outro-title{position:absolute;left:90px;top:936px;width:900px;text-align:center;font-size:94px;letter-spacing:-4.8px;line-height:1.17}.outro-title span{display:block}.outro-cta{position:absolute;left:225px;top:1280px;width:630px;height:112px;font-size:39px;border-radius:25px}.outro-copy{position:absolute;top:1465px;width:100%;text-align:center;font-size:31px;color:#475569}
.footer{position:absolute;left:85px;top:1740px;width:910px;border-top:2px solid #cbdfe9;padding-top:28px;display:flex;justify-content:space-between;font-size:22px;font-weight:600;letter-spacing:3px;color:#475569}.progress{position:absolute;left:85px;top:1740px;width:910px;height:3px;background:#0284c7;transform-origin:left center}
</style></head>
<body><div id="root" data-composition-id="saludclick" data-start="0" data-duration="20" data-width="1080" data-height="1920">
<div class="ambient" data-layout-ignore></div><div class="ambient2" data-layout-ignore></div>
<div class="brand-header"><img class="top-logo" src="assets/saludclick.png" alt="SaludClick"><p class="top-note">CERCA DE TI</p><div class="rule"></div></div>

<section id="scene-hook" class="clip" data-start="0" data-duration="4.4" data-track-index="1"><div class="scene s1">
<p class="label s1-label">SALUD DIGITAL, MÁS SIMPLE</p>
<h1 class="headline s1-title"><span class="line">Tu salud,</span><span class="line accent">a un clic.</span></h1>
<p class="s1-copy">Encuentra médicos.<br class="unused">Agenda tu cita.</p>
<div class="hero-card"><div class="card-top"><div class="icon-box">${icon('calendar')}</div><div><h2>Tu próxima cita</h2><p>Todo comienza en SaludClick</p></div></div><div class="hero-divider"></div><div class="card-row"><div><div class="row-label">Atención a tu medida</div><div class="row-value">Tú eliges el horario.</div></div></div><div class="hero-badge" style="position:absolute;left:52px;bottom:40px">${icon('video')}Presencial o teleconsulta</div></div>
<p class="s1-bottom">PACIENTES · MÉDICOS · CENTROS DE SALUD</p>
</div></section>

<section id="scene-search" class="clip" data-start="4" data-duration="5.25" data-track-index="2"><div class="scene s2">
<div class="section-heading"><p class="label">01 / ENCUENTRA</p><h2 class="headline"><span class="line">El médico</span><span class="line accent">que buscas.</span></h2></div>
<div class="app search-app"><div class="app-bar"><div class="app-brand"><img src="assets/icono.png" alt="">SaludClick</div><span>Buscar médicos</span></div><div class="app-inner"><div class="search">${icon('search')}<span>Medicina general</span>${icon('chevron','end')}</div><div class="doctor-card"><div class="doctor-visual">${icon('doctor')}<span class="specialty">Medicina general</span></div><div class="doctor-detail"><div class="doctor-name">Dra. Ana Pérez</div><p class="doctor-sub">Consulta médica</p><div class="modality">${icon('video')}Presencial · Teleconsulta</div><div class="button doctor-button">Agendar ${icon('arrow')}</div></div></div><p class="example">Vista de ejemplo</p></div></div>
<div class="under-app">${icon('search')}Busca por especialidad o centro médico.</div><div class="tap tap1" data-layout-ignore></div>
</div></section>

<section id="scene-booking" class="clip" data-start="8.74" data-duration="7.51" data-track-index="3"><div class="scene s3">
<div class="section-heading"><p class="label">02 / AGENDA</p><h2 class="headline"><span class="line">Elige. Confirma.</span><span class="line accent">Listo.</span></h2></div>
<div class="app booking-app"><div class="app-bar"><div class="app-brand"><img src="assets/icono.png" alt="">SaludClick</div><span>Agendar cita</span></div><div class="booking-inner"><div class="doctor-mini">Dra. Ana Pérez</div><div class="doctor-mini-sub">Medicina general</div><div class="booking-divider"></div><div class="mode-row"><div class="mode selected">${icon('pin')}Presencial</div><div class="mode">${icon('video')}Teleconsulta</div></div><div class="booking-label">Fecha de tu cita</div><div class="date-row"><span>Miércoles, 23 de septiembre</span>${icon('calendar')}</div><div class="booking-label">Horarios disponibles</div><div class="slots"><div class="slot">09:00</div><div class="slot chosen">10:30</div><div class="slot">12:00</div></div><div class="button confirm-button">Confirmar cita ${icon('check')}</div></div><p class="booking-example">Vista de ejemplo</p></div>
<div class="success"><div class="success-icon">${icon('check')}</div><h3>Cita confirmada</h3><div class="doctor-name">Dra. Ana Pérez</div><div class="success-info">${icon('calendar')}23 de septiembre</div><div class="success-info">${icon('clock')}10:30 · Presencial</div><div class="success-pills"><span>Mis citas</span><span>Mis recetas</span><span>Mi historial</span></div><p class="example">Vista de ejemplo</p></div>
<div class="s3-bottom"><span>Tus citas, recetas e historial.</span><span class="muted">En un solo lugar.</span></div><div class="tap tap2" data-layout-ignore></div><div class="tap tap3" data-layout-ignore></div>
</div></section>

<section id="scene-close" class="clip" data-start="15.8" data-duration="4.2" data-track-index="4"><div class="scene s4">
<p class="label outro-label">CONTIGO, EN CADA PASO</p><img class="outro-logo" src="assets/saludclick.png" alt="SaludClick, tu salud a un clic de distancia"><h2 class="headline outro-title"><span class="line">Tu salud,</span><span class="line accent">en un solo lugar.</span></h2><div class="button outro-cta">Agendar ahora ${icon('arrow')}</div><p class="outro-copy">Presencial o teleconsulta</p>
</div></section>
<div class="footer"><span>SALUDCLICK</span><span>TU SALUD, MÁS CERCA</span></div><div class="progress"></div>
<audio id="music" data-start="0" data-duration="20" data-track-index="10" data-volume="0.32" data-automation="{&quot;version&quot;:1,&quot;lanes&quot;:[{&quot;target&quot;:&quot;volume&quot;,&quot;points&quot;:[{&quot;t&quot;:0,&quot;v&quot;:0},{&quot;t&quot;:0.4,&quot;v&quot;:0.32},{&quot;t&quot;:18.4,&quot;v&quot;:0.32},{&quot;t&quot;:20,&quot;v&quot;:0}]}]}" src="assets/music/music.mp3"></audio>
<audio id="click-doctor" data-start="7.64" data-duration="0.06" data-track-index="11" data-volume="0.40" src="assets/sfx/click.ogg"></audio>
<audio id="click-slot" data-start="10.93" data-duration="0.06" data-track-index="12" data-volume="0.35" src="assets/sfx/click.ogg"></audio>
<audio id="confirm-sound" data-start="13.11" data-duration="0.18" data-track-index="13" data-volume="0.42" src="assets/sfx/confirm.ogg"></audio>
</div>
<script>
const tl=gsap.timeline({paused:true});
// Registry line-by-line-slide recipe, scaled to the SaludClick 1080x1920 frame.
function lines(sel,start){tl.fromTo(sel,{opacity:0,'--hf-line-x':'-36px','--hf-line-y':'18px'},{opacity:1,'--hf-line-x':'0px','--hf-line-y':'0px',duration:.48,stagger:.12,ease:'power3.out'},start)}
function enter(sel,start,axis='y'){tl.fromTo(sel,{opacity:0,[axis]:38},{opacity:1,[axis]:0,duration:.55,ease:'power3.out'},start)}
function tap(sel,start){tl.fromTo(sel,{opacity:0,scale:.55},{opacity:.65,scale:1,duration:.16,ease:'power2.out'},start);tl.to(sel,{opacity:0,scale:1.45,duration:.36,ease:'power2.out'},start+.16)}
tl.fromTo('.rule',{scaleX:.2},{scaleX:1,duration:1,ease:'power3.out'},0);
tl.to('.ambient',{y:-65,rotation:5,duration:20,ease:'sine.inOut'},0);
tl.to('.ambient2',{y:70,rotation:16,duration:20,ease:'sine.inOut'},0);
tl.fromTo('.progress',{scaleX:0},{scaleX:1,duration:20,ease:'none'},0);
lines('.s1-title .line',.06);enter('.s1-label',.04,'x');enter('.s1-copy',.38);enter('.hero-card',.56);enter('.s1-bottom',1.1);
tl.to('.s1',{opacity:0,x:-60,duration:.38,ease:'power2.inOut'},4);
// Page-slide primitive adapted to staged product panels.
tl.fromTo('.s2',{opacity:0,x:85},{opacity:1,x:0,duration:.48,ease:'power3.out'},4);
lines('.s2 .line',4.12);enter('.search-app',4.24);enter('.doctor-card',4.91);enter('.under-app',5.2);
tap('.tap1',7.64);tl.to('.doctor-button',{scale:.97,duration:.12,yoyo:true,repeat:1},7.64);
// beat-locked: transition at 8.74s.
tl.to('.s2',{opacity:0,x:-65,duration:.45,ease:'power2.inOut'},8.74);
tl.fromTo('.s3',{opacity:0,x:85},{opacity:1,x:0,duration:.5,ease:'power3.out'},8.74);lines('.s3 .line',8.88);enter('.booking-app',9.02);enter('.s3-bottom',9.6);
tap('.tap2',10.93);tl.to('.chosen',{backgroundColor:'#0369a1',borderColor:'#0369a1',color:'#ffffff',duration:.18},10.93);
tap('.tap3',12.55);tl.to('.confirm-button',{scale:.97,duration:.12,yoyo:true,repeat:1},12.55);
// beat-locked: confirmation at 13.11s. Holds through 15.8s.
tl.to('.booking-app',{opacity:0,scale:.97,duration:.32,ease:'power2.in'},13.11);
tl.fromTo('.success',{opacity:0,y:36,scale:.98},{opacity:1,y:0,scale:1,duration:.52,ease:'power3.out'},13.11);
tl.fromTo('.success-icon',{scale:.75},{scale:1,duration:.52,ease:'back.out(1.35)'},13.11);
tl.to('.s3',{opacity:0,y:-35,duration:.4,ease:'power2.inOut'},15.8);tl.to('.brand-header',{opacity:0,duration:.4},15.8);
tl.fromTo('.s4',{opacity:0},{opacity:1,duration:.5,ease:'power2.out'},15.8);
enter('.outro-label',15.95);tl.fromTo('.outro-logo',{scale:.94,y:30,opacity:0},{scale:1,y:0,opacity:1,duration:.75,ease:'power3.out'},15.94);lines('.outro-title .line',16.3);
// beat-locked: final CTA at 17.47s; no exit to black.
enter('.outro-cta',17.47);enter('.outro-copy',17.65);
// Per-frame pre-extracted audio energy gently modulates existing card borders.
// Seek-safe sets preserve sampling under arbitrary renderer seeks.
for(let f=0;f<600;f++){const b=window.SALUD_AUDIO.frames[f].bands;const energy=b.slice(0,4).reduce((a,v)=>a+v,0)/4;tl.set('.hero-card,.search-app,.booking-app,.success',{borderColor:'rgb('+Math.round(174-22*energy)+','+Math.round(216+8*energy)+',237)'},f/30)}
window.__timelines['saludclick']=tl;
</script></body></html>`;
// Body copy uses real line blocks instead of hard line-breaks.
fs.writeFileSync('index.html',html.replace('Encuentra médicos.<br class="unused">Agenda tu cita.','<span style="display:block">Encuentra médicos.</span><span style="display:block">Agenda tu cita.</span>'));


# Brag Plan: SaludClick

## Planning rubric
1. Plataforma que conecta pacientes, médicos y centros de salud para buscar atención, agendar citas y consultar información de salud.
2. Claim real: «Tu salud, tu agenda y tus médicos en un solo lugar» (frontend/app/page.tsx).
3. Hook visual: «Tu salud, a un clic.» con el símbolo original y una tarjeta de cita que entra suavemente.
4. UI: reconstrucción editorial de búsqueda por especialidad, ficha médica y selección de hora, a partir de DoctorCard.tsx y booking/page.tsx. Los datos de ejemplo son ficticios, sin precios, valoraciones ni pacientes reales.
5. Duración exacta: 20 segundos.
6. Preset: polished. Dirección: salud digital clara, cercana y profesional, con espacio y jerarquía tipográfica.
7. Música cálida y limpia, con tres acentos de interfaz suaves. Sin narración (no solicitada).
8. Copy: «Tu salud, tu agenda y tus médicos en un solo lugar. Con SaludClick, encuentra un profesional y agenda tu próxima cita.»
9. Recorrido: busca una especialidad → elige médico y horario → confirma y consulta tu cita.

## Formato e identidad
- Vertical 9:16, 1080 × 1920, 30 fps, 20 s.
- Fondo #f7fafc; texto #0f172a; azul #0ea5e9; azul de contraste #0369a1; turquesa #06b6d4.
- Inter, la familia declarada en globals.css; archivo local.
- Logotipo y símbolo originales de frontend/public.
- Márgenes principales de 80 px, contenido crucial antes de y=1670.

## Storyboard
### 1. Tu salud, a un clic — 0–4 s
Logotipo pequeño arriba. Titular de gran formato en tres líneas, y tarjeta de agenda como ancla visual. Texto de apoyo: «Encuentra médicos. Agenda tu cita.»
Interacción: una tarjeta de cita entra y se asienta. Lectura asentada >2 s.
Audio: comienzo suave de la música.

### 2. Encuentra tu médico — 4–9 s
Panel de producto grande: «Buscar médicos», filtro «Medicina general», ficha de «Dra. Ana Pérez», «Presencial · Teleconsulta», botón «Agendar». Nota discreta «Vista de ejemplo».
Interacción: selección de especialidad, entrada de ficha, toque del botón. Sin atribuir datos a personas reales.
Audio: clic sobrio al agendar; movimiento hacia la reserva en el pulso 8.74 s.

### 3. Elige. Confirma. Listo. — 9–15.8 s
Recreación de agenda con modalidad, tres horas y botón «Confirmar cita». Selección 10:30; confirmación aparece a 13.11 s. Remate: «Tus citas, recetas e historial.»
Interacción: hora seleccionada a 10.93 s, botón presionado, check y confirmación. Estado confirmado se mantiene más de 2 s.
Audio: clic y acento cálido de confirmación.

### 4. SaludClick — 15.8–20 s
Logotipo original grande. «Tu salud, en un solo lugar.» CTA «Agendar ahora». «Presencial o teleconsulta».
Interacción: cierre asentado; CTA llega al pulso 17.47 s, conserva lectura hasta el final.
Audio: música desciende suavemente entre 18.4 y 20 s. No salida a negro.

## Music cue guidance
Happy Beats / Business Moves Vol. 12, ende.app, pista incluida con Brag.
Preset consultado: assets/music/cues/happy-beats-business-moves-vol-12-by-ende-dot-app.music-cues.md, tempo estimado 109.96 BPM.
Cues fuertes: 8.74 (transición), 13.11 (confirmación), 17.47 (CTA). Prioridad a lectura; no nuevas líneas a cada pulso.
Reactividad: variación mínima en el borde de la tarjeta según energía preextraída; texto estable.
SFX: tres acentos cálidos y discretos; nunca superar la presencia musical.

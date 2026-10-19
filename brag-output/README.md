# SaludClick — video vertical

- `brag.mp4`: video final, 20 segundos, 1080 × 1920, 30 fps, H.264 con audio AAC.
- `brag.jpg`: portada seleccionada del momento inicial ya asentado (2.3 s), incorporada también como primer fotograma del MP4.
- `share-copy.txt`: texto en español listo para acompañar el video.
- `composition/`: proyecto Hyperframes editable, con recursos locales y guion de construcción.
- `brag-plan.md` y `composition-brief.md`: concepto, fuentes y storyboard.

Creado con Brag e Hyperframes 0.8.45. Cuatro escenas: presentación, búsqueda de médico, reserva y confirmación, cierre. Textos en español y música instrumental; sin narración. Interfaces recreadas a partir del código de SaludClick, con datos ficticios identificados como ejemplo. No se modificó el código de la aplicación.

## Edición y exportación

Desde `composition/`, editar `build-video.mjs` y ejecutar `node build-video.mjs`. Para abrir el editor: `npm run dev`. Para reproducir la exportación completa en Windows, incluyendo validación y portada:

```powershell
npm ci
.\render.ps1
```

Las fuentes del video son locales y no dependen de peticiones externas al renderizar. Los comandos `npm run dev`, `npm run check` y `npm run render` añaden automáticamente las copias locales de FFmpeg y FFprobe al PATH del proceso, incluido el servidor de Studio y su botón Export. No requieren una instalación global. `npm run doctor` verifica ese entorno. La versión del lanzador se fija en `hyperframesVersion` dentro de `composition/package.json`.

## Recursos

- Marca: `frontend/public/saludclick.png` e `icono.png`, del proyecto SaludClick.
- Tipografía: Inter, distribuida mediante @fontsource/inter; licencia OFL incluida en el paquete.
- Música: Happy Beats / Business Moves Vol. 12, ende.app; recurso incluido en la habilidad Brag.
- Efectos: Kenney, CC0, incluidos en Brag (ui/click2 e impactSoft_medium_001).
- Movimiento: primitivas line-by-line-slide y page-slide del catálogo Hyperframes, adaptadas a la marca y al formato.

`composition/check-report.json` conserva el resultado de validación. Los avisos de superposición corresponden a disoluciones breves; el uso repetido del logo es intencional. Los estados asentados se revisaron visualmente.

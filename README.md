# Modelo operativo: Anemia materna y riesgo neonatal

Aplicacion estatica local para clasificar anemia materna, orientar sospecha etiologica y priorizar riesgo neonatal. Esta version convierte el prototipo HTML monolitico en un modelo operativo con motor clinico separado, historial local, exportacion y configuracion editable.

## Uso local

```bash
cd /Users/jolivares/Documents/Prototipo1
python3 -m http.server 8080
```

Abrir:

```text
http://localhost:8080
```

Tambien puede alojarse como sitio estatico en GitHub Pages, Netlify, Vercel, Cloudflare Pages o cualquier servidor web.

## Archivos principales

- `index.html`: interfaz de captura, resultados, configuracion, historial y referencias.
- `assets/app.css`: estilos responsivos e impresion.
- `assets/clinical-engine.js`: motor puro de clasificacion y score.
- `assets/app.js`: interaccion con la UI, persistencia local y exportaciones.
- `tests/engine.test.html`: pruebas de humo del motor en navegador.
- `docs/analisis-prototipo.md`: analisis tecnico y clinico del prototipo original.

## Alcance clinico

El modelo es academico y de apoyo a la decision. No emite diagnostico definitivo, no sustituye criterio medico, guias nacionales ni protocolos institucionales. Los puntos de corte deben validarse localmente antes de uso asistencial.

# Analisis del prototipo original

## Hallazgos principales

El archivo adjunto `prototipo_anemia_materna_riesgo_neonatal_v3_mejorado.html` ya contenia un MVP funcional en un solo HTML: formulario clinico, clasificacion por trimestre, sospecha etiologica, score neonatal orientativo, alertas y reporte imprimible. La logica era util para demostracion academica y corria sin dependencias externas.

## Fortalezas

- Captura variables maternas, obstetricas, hemograma, perfil ferrico, marcadores de hemolisis y hemoglobinopatias.
- Usa umbrales de Hb por trimestre y diferencia anemia leve, moderada y severa.
- Calcula saturacion de transferrina cuando hay hierro y TIBC.
- Propone etiologias frecuentes: ferropenia, megaloblastica, inflamatoria, hemolisis, hemoglobinopatia, perdida sanguinea y anemia mixta.
- Genera acciones sugeridas, alertas y desenlaces neonatales a vigilar.
- Incluye advertencias claras sobre uso academico y no sustitucion del criterio medico.

## Brechas para operacion real

- Motor clinico acoplado al DOM, dificil de probar, versionar o reutilizar.
- No habia persistencia de casos ni historial.
- No existia exportacion de datos para investigacion o auditoria.
- Los puntos de corte estaban fijos dentro del codigo.
- No habia identificacion de paciente/caso, fecha de evaluacion ni resumen estructurado exportable.
- La validacion se limitaba a Hb y edad gestacional.
- No habia pruebas automatizadas ni pagina de verificacion.
- El despliegue en nube era posible, pero no documentado como flujo operativo.

## Mejoras implementadas

- Separacion del motor clinico en `assets/clinical-engine.js`.
- Interfaz operativa en `index.html` con captura de datos, resultados, configuracion e historial.
- Configuracion local editable para umbrales: ferritina, TSAT, PCR, B12, folato, reticulocitos y marcadores de hemolisis.
- Guardado de casos en `localStorage` con fecha, identificador, resumen, score y datos completos.
- Exportacion del historial en JSON y CSV.
- Limpieza de historial y restauracion de umbrales por defecto.
- Pagina de pruebas de humo en `tests/engine.test.html`.
- Documentacion de ejecucion local y alojamiento estatico.

## Recomendaciones para fase siguiente

- Validar el score con una base de datos local retrospectiva o prospectiva.
- Bloquear el uso asistencial hasta que los umbrales y mensajes sean aprobados por obstetricia, hematologia y comite institucional.
- Agregar autenticacion y base de datos si se alojara con datos reales de pacientes.
- Incorporar trazabilidad de versiones del algoritmo en cada caso guardado.
- Hacer evaluacion de usabilidad con personal clinico antes de piloto.

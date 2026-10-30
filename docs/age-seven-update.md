# Adaptación a 7 años y operaciones en columna

Se revisaron las 50 preguntas en español. El primer ejercicio ahora es 12 + 5. Se mantienen las categorías y la sesión de 50 preguntas, con números e instrucciones más sencillos:

- 10 sumas y 10 restas hasta 50, sin llevadas ni préstamos.
- 10 multiplicaciones introductorias de las tablas del 2, 5 y 10, con explicación mediante sumas repetidas y resultado hasta 50.
- 5 repartos exactos hasta 20 entre 2 o 5 grupos.
- 5 comparaciones hasta 50.
- 5 problemas breves de una operación con cantidades hasta 20.
- 5 preguntas sencillas de figuras y medidas, sin conversiones de unidades.

Las posiciones correctas se distribuyen de forma estática entre las tres opciones: 16, 17 y 17 preguntas. No se generan ejercicios al azar.

`ColumnOperation` usa datos estructurados `operation` y una cuadrícula de dígitos. Muestra las unidades bajo las unidades y las decenas bajo las decenas, también en el resultado. Se incluyen signo, raya y resultado desconocido; el resultado se revela únicamente después de comprobar. La división utiliza la disposición escolar española. Los problemas de reparto conservan su enunciado junto a la operación.

La representación visual incluye una descripción accesible en español. El banco conserva todos los textos independientemente del formato visual. Los nuevos IDs evitan restaurar resultados del banco anterior; hay una prueba que verifica ese reinicio seguro.

## Verificación

- `npm test -- --watch=false`: 20 pruebas correctas en 5 archivos.
- `npm run test:e2e`: 10 escenarios correctos, incluido el recorrido completo de 50 preguntas.
- `npm run typecheck`, `npm run build`, `npm run format:check`: correctos.
- Se comprueban las coordenadas de las unidades de ambos operandos y del resultado para verificar la alineación real, no solo el texto.
- Se verifican los operandos y resultados de las 40 preguntas con cálculo, los límites de dificultad, la corrección matemática y la distribución por categorías.
- Vista a 320, 390, 768, 1024 y 1440 px: sin desbordamiento horizontal. La página puede desplazarse verticalmente en pantallas pequeñas.
- Selección, respuesta correcta e incorrecta, restauración, reinicio, teclado y resultado final comprobados.
- El flujo principal captura errores de consola, errores de página y peticiones fallidas; no se detectaron errores.

Se intentó abrir y actualizar la pestaña del navegador integrado, pero su conexión de control estaba indisponible. La verificación visual se completó con Playwright Chromium y las capturas locales se inspeccionaron con `view_image`. No se ha verificado en navegadores distintos de Chromium ni con dispositivos físicos.

Capturas actuales en `docs/qa/`: `initial-1440.png`, `correct-1440.png`, `initial-390.png`, `division-390.png` y variantes de otros tamaños. Se conservaron la paleta, tipografía, tarjeta y controles; el cambio de composición es el espacio central dedicado al cálculo en columna solicitado.

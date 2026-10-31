# Retos de lógica

El módulo se abre desde la navegación común o en `/logic`. Los 24 retos se agrupan en tres niveles de ocho. Cada reto ofrece tres variantes curadas; los retos 01 y 04 ofrecen cuatro (74 variantes en total). Todos los textos infantiles son originales y están en español de España.

## Arquitectura

- `src/app/logic-challenges/logic-exercise.ts`: unión discriminada de diez mecánicas y sus respuestas; metadatos, figuras, restricciones y variantes tipados.
- `logic-content.ts`: catálogo estable `logic-01` a `logic-24`. No usa aleatoriedad, servicios externos ni contenido generado en tiempo de ejecución.
- `logic-validation.ts`: comprobaciones puras, reflexión vertical, simulación del robot, búsqueda de caminos y enumeración de soluciones de restricciones. No consulta el DOM.
- `logic-workspace.*` y `logic-tile.ts`: interacciones compartidas, SVG geométricos, bloques CSS, tabla de descartes, teclado numérico y experimentación con máquinas.
- `logic-page.*`: catálogo, variantes, niveles, navegación y feedback.
- `logic-progress.ts`: estado mediante señales y localStorage versionado bajo `logic-challenges-v1`, independiente de matemáticas y animales. Valida datos al restaurar; puede seguir en memoria si falla el almacenamiento.

Cada intento guarda variante, respuesta parcial, estado, comprobaciones fallidas, pistas utilizadas y posición de la pista. Al completar se guarda fecha ISO, estrellas y un historial acotado a 20 resultados. La propiedad `attempts` cuenta comprobaciones fallidas más la comprobación final correcta; abrir una sala intermedia no consume un intento. El mejor resultado por actividad se conserva al repetir o cambiar de variante.

Reintentar mantiene la respuesta para corregirla; reiniciar limpia el espacio de trabajo. Reiniciar una tentativa sin terminar mantiene sus intentos y ayudas; reiniciar una variante completada inicia otra tentativa y conserva el mejor resultado. El laboratorio y la tabla opcional de descartes no afectan a la respuesta ni a los intentos. Los experimentos y descartes son ayudas transitorias y no se guardan.

## Progresión

Tres estrellas al resolver a la primera sin pistas, dos al usar una pista o un segundo intento, una con más ayuda. Las estrellas nunca bloquean la finalización. El siguiente nivel se abre al completar cinco actividades distintas del anterior, o tres sin ayuda. El apartado «Para adultos» permite abrir todos los niveles y volver a la apertura gradual.

Se recomienda subir tras tres resultados independientes recientes y practicar un nivel anterior tras dificultades repetidas. Es una orientación, no una prueba diagnóstica; nunca hay cronómetro ni penalizaciones por tiempo.

## Recursos gráficos

**No se necesitan imágenes nuevas ni nombres de archivos de imagen.** Las figuras son SVG y las torres y tableros se dibujan con CSS. La navegación, animales, ropa, frutas y demás iconos usan SVG de la biblioteca Lucide ya instalada, con etiquetas de texto visibles. `logic-icon.ts` reúne únicamente los iconos utilizados. No se usan emojis. Ningún reto depende de distinguir únicamente un color.

## Verificación

```sh
node node_modules/@angular/cli/bin/ng.js test --watch=false
npm run build
node node_modules/@playwright/test/cli.js test e2e/logic-challenges.spec.ts
node node_modules/@playwright/test/cli.js test --config playwright.pages.config.ts
```

Las pruebas del catálogo comprueban soluciones correctas e incorrectas, respuestas incompletas y duplicadas, límites, simetría, cuatro regiones Venn, distractores para cada condición, unicidad de deducciones y alcanzabilidad de caminos. Las de persistencia cubren restauración, datos corruptos, pistas, reintento, reinicio, etapas, estrellas y niveles. Las de navegador resuelven las 74 variantes mediante controles reales, verifican localStorage y recarga, prueban teclado, arrastre, selección completa, acceso adulto y pantalla móvil. Las de Pages verifican los 24 enlaces directos con alojamiento estático sin fallback SPA.

Ejecuta los dos comandos de Playwright de forma secuencial: comparten el directorio temporal `test-results` y cada ejecución lo prepara de nuevo.

La inspiración se limita a los principios públicos de razonamiento, descubrimiento, conjuntos, relaciones y funciones descritos en [Mathematics Enrichment de IMACS](https://www.imacs.org/program/mathematics-enrichment/). No se utiliza su marca en la interfaz ni se reproducen ejercicios, diseños o materiales curriculares propietarios. Esta colección no es un producto ni un currículo de IMACS.

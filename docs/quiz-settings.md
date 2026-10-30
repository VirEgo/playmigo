# Configuración de ejercicios

La cabecera incorpora un botón de ajustes con icono Lucide y nombre accesible «Configurar el test». Abre un diálogo con selección independiente de las siete categorías del banco. Todo el contenido visible sigue en español.

El diálogo trabaja con una selección provisional. Muestra las preguntas disponibles y bloquea la aplicación si no queda ninguna categoría. «Cancelar» y Escape descartan los cambios y devuelven el foco al botón de ajustes. Aplicar una selección distinta reinicia el test con los ejercicios elegidos. Aplicar la misma selección conserva el estado actual. Reiniciar un test filtrado mantiene el filtro.

El orden del banco no cambia. El total, progreso, última pregunta y resultados se calculan sobre el subconjunto activo. Por ejemplo, una respuesta comprobada en un test de 10 sumas representa el 10% de progreso.

## Archivos y persistencia

- `quiz-categories.ts`: categorías y etiquetas en español.
- `quiz-settings.ts` y `quiz-settings.scss`: diálogo accesible, selección provisional, resumen y validación visual.
- `quiz-header.ts` y `quiz-header.scss`: botón y distribución adaptable.
- `math-quiz-page.ts`: apertura y aplicación de la configuración.
- `math-quiz.ts`: filtrado reactivo y transiciones atómicas.
- `quiz-state.ts`: sesión con categorías y estado.
- `quiz-storage.ts`: formato versión 2 bajo la misma clave existente `math-quiz-session-v1`. Categorías y estado se guardan en una sola escritura. Las sesiones válidas de versión 1 se migran con todas las categorías activas.
- `quiz-text.ts`: textos de configuración.
- Pruebas en `math-quiz.spec.ts`, `quiz-storage.spec.ts` y `e2e/quiz-settings.spec.ts`.

## Comprobaciones

Resultado final: `npm test -- --watch=false` pasó 27 pruebas en 5 archivos y `npm run test:e2e` pasó los 15 escenarios. También pasaron `npm run typecheck`, `npm run build` y `npm run format:check`.

Se verifican filtros de una y varias categorías, cambio de total/progreso, finalización de un test de 10 preguntas, restauración después de recargar, reinicio conservando filtros, cancelación, selección vacía, configuración sin cambios, migración y datos corruptos. El recorrido original de 50 preguntas también se mantiene.

Se inspeccionó el diálogo en el navegador integrado. La automatización usa Playwright Chromium con capturas a 1440, 390 y 320 px, además de las pruebas de la página a 1024 y 768 px. No se detectaron errores de consola, errores de página ni peticiones fallidas en el flujo de configuración probado. Se corrigieron el ciclo del foco por Tab y el ajuste de etiquetas en pantallas estrechas.

Las pruebas de teclado verifican Escape, devolución del foco y que Tab no salga del diálogo hacia los controles de la página. La lista puede desplazarse verticalmente en teléfonos pequeños; no hay desbordamiento horizontal.

Capturas: `docs/qa/settings-1440.png`, `settings-390.png`, `settings-320.png` y `settings-applied-390.png`. La paleta, tipografía, bordes y sombras conservan el estilo del entrenador.

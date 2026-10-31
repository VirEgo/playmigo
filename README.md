# Un viaje por el mundo de las matemáticas

Entrenador de matemáticas en español para niños de 7 años, creado con Angular 22, TypeScript estricto y componentes standalone. Incluye 50 preguntas y tres opciones por pregunta, explicaciones, progreso, resultados y recuperación automática de la sesión. Las operaciones se muestran en columna, con unidades y decenas alineadas. Iconos de Lucide y tipografía Nunito incluida en el proyecto, sin peticiones a Google Fonts.

Las sumas y restas usan números hasta 50 sin llevadas; la multiplicación introduce grupos de 2, 5 y 10 y la división usa repartos exactos hasta 20. Los problemas tienen una sola operación y cantidades hasta 20. Consulta `docs/age-seven-update.md` para ver la adaptación y sus pruebas.

## Elegir los ejercicios

Pulsa el botón de ajustes junto a «Volver a empezar». Puedes activar sumas, restas, multiplicaciones, divisiones, comparaciones, problemas de sumas y restas, y figuras/medidas. Se muestra el número de preguntas de la selección: solo sumas produce un test de 10 preguntas; sumas y restas, uno de 20.

«Aplicar y empezar» inicia un test con las categorías elegidas. «Cancelar» o Escape descartan los cambios. Continuar sin modificar la selección mantiene el progreso. Debe quedar al menos una categoría activa. La selección y el progreso se guardan juntos; reiniciar el test conserva las categorías. Las sesiones anteriores se migran sin perder las respuestas válidas.

## Ejercicios diferentes en cada test

Cada test nuevo genera otros números, problemas y posiciones de las respuestas, manteniendo las cantidades y dificultad para 7 años. No se repite la misma operación dentro de una categoría. Las cinco preguntas de geometría conservan sus conceptos y mezclan las opciones. «Volver a empezar» crea un conjunto nuevo; recargar la página recupera exactamente las preguntas y respuestas guardadas. El formato de sesión v3 guarda el banco completo junto a las categorías y el progreso; las sesiones v1/v2 conservan sus preguntas originales hasta iniciar otro test.

## Animals · Valencià

El selector «Matemáticas / Animals · Valencià» permite cambiar al segundo modo (`/animals`). Cada sesión elige 30 animales sin repetir del catálogo original de 55. Las 37 incorporaciones posteriores están temporalmente desactivadas tanto en las preguntas como en las opciones de respuesta; sus datos e ilustraciones se conservan. Cada pregunta muestra una ilustración y tres nombres en valenciano, con alternativas de la misma familia. Las preguntas y opciones se mezclan al reiniciar. Al comprobar, la respuesta correcta aparece en verde con su etiqueta; una elección incorrecta queda marcada en rojo y se muestra el nombre correcto. Hay progreso, resultados y una sesión independiente (`animal-quiz-session-v1`); cambiar de modo conserva el ejercicio de matemáticas. Las sesiones antiguas conservan sus primeras 30 preguntas y respuestas al aplicar el límite. Las sesiones guardadas que contienen animales desactivados se reinician con el catálogo original; las sesiones compatibles conservan la selección actual al recargar.

Las 92 ilustraciones están en `public/animales/`, con nombres por clase y numeración de izquierda a derecha, fila a fila: 24 mamíferos, 23 aves, 9 peces, 6 reptiles, 5 anfibios y 25 invertebrados. `src/app/animal-quiz/data/animal-images.ts` relaciona los archivos con los IDs estables del vocabulario; por ejemplo, `gos: 'animales/mamifers_1.png'`. Las rutas relativas respetan el `base href` al publicar en una subcarpeta. Se conservan los nombres valencianos de las referencias, con «el colom» y «el lloro». Las imágenes no incluyen nombres que revelen la respuesta.

## LM Studio opcional

La variación de números funciona sin IA. Para cambiar también nombres y objetos de los cinco problemas, carga un modelo de texto en LM Studio e inicia su servidor local en el puerto 1234:

```sh
lms server start --port 1234 --bind 127.0.0.1
```

Con `npm start`, abre los ajustes y despliega «Problemas con LM Studio · opcional». Pulsa «Comprobar conexión», elige el modelo y pulsa «Crear problemas nuevos». Debe ser un test recién empezado, sin respuesta seleccionada y con la categoría de problemas activada. Si cambias las categorías, aplica primero la selección y vuelve a abrir los ajustes.

El modelo solo propone nombres ficticios, objetos cotidianos y su género gramatical. El entrenador compone las frases en español y conserva operaciones, cantidades y respuestas. Usa JSON con esquema y valida la respuesta antes de guardarla. La generación solicita `reasoning_effort: none` y permite cancelar o agotar un plazo de dos minutos. Una desconexión o respuesta inválida conserva el test ordinario. No se envían respuestas del niño ni su progreso al modelo.

La conexión pasa por un proxy local al servidor de LM Studio, sin habilitar CORS. Para probar la compilación de producción con el mismo proxy:

```sh
npm run build
npm run preview
```

Abre http://127.0.0.1:4300/. Un hosting que sirva únicamente archivos estáticos necesita un proxy equivalente para usar esta integración. Consulta la [documentación del servidor de LM Studio](https://lmstudio.ai/docs/developer/core/server) y la de [salida estructurada](https://lmstudio.ai/docs/developer/openai-compat/structured-output).

## Requisitos y puesta en marcha

Node.js 22.22.3 o superior compatible con Angular 22 y npm. Entorno verificado: Node 22.22.3 / npm 10.9.8.

```sh
npm ci
npm start
```

Abre http://localhost:4200/. La ruta `/math` redirige al mismo entrenador.

## Comprobaciones

```sh
npm run typecheck
npm test -- --watch=false
npm run build
npm run format:check
npm run test:bridge
npx playwright install chromium
npm run test:e2e
```

Playwright usa Chromium y arranca el servidor automáticamente si no está disponible en http://127.0.0.1:4200. No requiere Google Chrome. Las pruebas de interfaz incluyen la sesión completa de 50 preguntas, aciertos, errores, recarga, reinicio, teclado, datos corruptos y tamaños 320, 390, 768, 1024 y 1440. Las capturas se guardan en `docs/qa/`.

La prueba real con LM Studio se ejecuta solo al establecer `RUN_LM_STUDIO=1`; necesita el servidor y un modelo disponible. En PowerShell: `$env:RUN_LM_STUDIO='1'; npx playwright test e2e/local-model-live.spec.ts`. Las pruebas normales cubren también el servidor desconectado. Las capturas de las nuevas pruebas de variación e IA se guardan en la carpeta temporal del sistema.

La compilación de producción se genera en `dist/child-trainer/browser/`. Para alojarla, sirve esa carpeta con un servidor de archivos estáticos que redirija rutas desconocidas a `index.html`.

## Publicar en GitHub Pages

El proyecto incluye `.github/workflows/pages.yml`. Publica el código fuente, `package-lock.json` y `public/`; `node_modules/` y `dist/` se excluyen de Git. La carpeta local todavía debe inicializarse como repositorio Git si no lo está.

1. Crea un repositorio en GitHub (por ejemplo, `child-trainer`) y sube el proyecto a su rama principal `main` o `master`.
2. En **Settings → Pages → Build and deployment → Source**, selecciona **GitHub Actions**. Consulta la [guía oficial de GitHub](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).
3. En **Actions → Deploy to GitHub Pages**, pulsa **Run workflow**, o envía un nuevo commit a la rama principal. Si tu rama principal tiene otro nombre, añádelo a `on.push.branches` en el workflow.
4. Espera a que termine el trabajo `deploy`. Su enlace abre la web publicada, normalmente `https://USUARIO.github.io/REPOSITORIO/`.

El workflow instala con `npm ci`, verifica tipos y pruebas unitarias, compila, comprueba la web estática con Chromium y despliega con las acciones oficiales de Pages. Obtiene el prefijo de la URL de `actions/configure-pages`: no necesitas escribir el nombre del repositorio en el código. También admite un sitio `USUARIO.github.io` o un dominio personalizado, con prefijo `/`.

Para comprobar localmente la misma compilación:

```sh
npm run build:pages
npm run preview:pages
```

Abre http://127.0.0.1:4301/child-trainer/. Para otro nombre de repositorio:

```sh
npm run build:pages -- --base-href /mi-repositorio/
# Para un dominio propio o un repositorio USUARIO.github.io:
npm run build:pages -- --base-href /
```

En PowerShell, si npm no transmite los argumentos correctamente, usa `node scripts/build-pages.mjs --base-href /mi-repositorio/`.

Los archivos para publicar quedan en `dist/github-pages/browser/`. Se generan `animals/index.html` y `math/index.html` para abrir enlaces directos y recargar sin reglas de reescritura; Pages puede añadir `/` al final de esos enlaces. Al añadir nuevas rutas, actualiza la lista de `scripts/build-pages.mjs`. Las rutas desconocidas muestran el 404 del hosting.

En la compilación de Pages se ocultan los controles opcionales de LM Studio, porque el hosting no ejecuta el proxy local. Las preguntas, categorías y ambos modos funcionan sin servidor; el progreso sigue guardándose en el navegador. La ejecución con `npm start` o `npm run preview` conserva LM Studio.

La prueba de regresión de Pages usa Chromium contra archivos estáticos, con el prefijo `/child-trainer/`, sin proxy ni fallback SPA:

```sh
npx playwright install chromium
npm run test:pages
```

Comprueba imágenes, enlaces directos, recarga, progreso independiente y ajustes en escritorio y móvil. No ejecutes `preview:pages` a la vez que `test:pages`, porque la prueba inicia su propio servidor.

## Organización

- `src/app/math-quiz/question-generator.ts`: genera y valida 50 preguntas. Distribución: 10 sumas, 10 restas, 10 multiplicaciones, 5 divisiones, 5 comparaciones, 5 problemas y 5 de geometría/medidas. `data/math-questions.ts` conserva el banco anterior para migrar sesiones y los conceptos de geometría.
- `local-model.ts`, `proxy.conf.cjs` y `scripts/serve-local.mjs`: integración opcional con LM Studio y servidor de previsualización local.
- `math-question.ts` y `quiz-state.ts`: modelos tipados.
- `math-quiz.ts`: transiciones del cuestionario y señales derivadas. Solo se puntúa al comprobar; el último ejercicio permanece hasta pulsar «Ver mis resultados».
- `quiz-storage.ts`: persistencia con la clave `math-quiz-session-v1` y validación de versión, índices, respuestas, orden y puntuación. Si el almacenamiento falla, se puede continuar en memoria.
- `quiz-text.ts`: textos de interfaz preparados para añadir otros idiomas. Las preguntas se mantienen en el archivo de datos del idioma.
- `quiz-header`, `quiz-progress`, `question-card`, `answer-options`, `answer-feedback`, `quiz-results`: presentación y eventos, sin lógica global duplicada.
- `math-quiz-page.ts`: composición de los componentes y conexión con el servicio.
- `src/styles.scss`: colores, tipografía y estilos compartidos.
- `e2e/math-quiz.spec.ts`: pruebas de navegador.

## Privacidad y accesibilidad

No se solicita el nombre ni se guardan datos personales. El progreso queda en este navegador y se borra con «Volver a empezar». Hay controles nativos, foco visible, selección identificada con un icono además de color, mensajes con región viva y soporte para movimiento reducido.

## Referencia visual y alcance

La referencia es https://temps-verbal.my.canva.site/. Se conservan la composición de una sola columna, la tarjeta crema, los bordes y sombras turquesas y las respuestas pastel. Se adapta el idioma y contenido a matemáticas. La pantalla inicial para introducir el nombre se omite según el flujo solicitado. Se usan iconos SVG de Lucide; no hay emojis.

Consulta `docs/verification.md` para ver los resultados y las diferencias intencionales. No incluye backend, cuentas, analítica ni sincronización entre dispositivos. La publicación en GitHub Pages se configura mediante el workflow descrito arriba.

# well well

Tu proceso médico, a la vista. Sitio web con dos espacios:

- **Pacientes y familiares** (niñas y niños, adultos y personas mayores): ruta, medicinas, citas, expediente, avisos, chat entre pacientes (salas «Pacientes y familias» y «Peques»), Lupita y **Cerca de mí**.
- **Personal del hospital**: recepción, avisos y expedientes.

El chat entre pacientes bloquea teléfonos, correos, enlaces y groserías (en el navegador y también en Supabase), y el personal puede borrar mensajes.

## Para probar la app

**Link publicado:** https://well-well-2.vercel.app

Dos funciones que se pueden probar sin iniciar sesión:

1. **Lupita** (`#/asistente`): escribe una palabra como «anestesia» o «sutura», o una frase como «necesito fisioterapia para mi hijo». Lupita la explica con su diccionario y, si es un lugar, ofrece un botón que abre Cerca de mí.
2. **Cerca de mí** (`#/servicios`): elige una categoría (por ejemplo *Farmacias*), escribe una ciudad (por ejemplo «Guadalajara, Jalisco») y elige el resultado. Aparece la lista de lugares reales con dirección y distancia, el mapa y el botón **Cómo llegar**. Si una categoría no tiene lugares en 5 km, la app ofrece buscar en 10 km.

Para entrar al espacio del paciente o del personal (`#/ingresar`), usa las [cuentas de prueba](#cuentas-de-prueba-modo-demo-sin-supabase) del final.

## Para quién es y por qué un hospital lo usaría

**El problema.** En un hospital, la familia de un paciente recibe mucha información a la vez: estudios, medicinas, horarios, citas y palabras médicas que no conoce. Casi todo llega en papel o de palabra, y se pierde. El personal contesta las mismas preguntas muchas veces, y al salir del hospital la familia no sabe dónde seguir la recuperación (fisioterapia, farmacia, laboratorio).

**Quién lo usa** (cada grupo tiene su propia parte de la app):

| Usuario | Qué necesita | Qué le da well well |
|---|---|---|
| Niñas y niños internados | Entender qué les van a hacer sin miedo | Lupita en modo «Para peques», la ruta del tratamiento paso a paso, la sala «Peques» |
| Familias y cuidadores | Saber qué sigue, cuándo y qué medicina toca | Ruta, medicinas con horario, citas que se agregan al calendario, expediente, avisos |
| Adultos mayores | Letra clara, pocos pasos, sin tecnicismos | Lupita en modo «Para adultos», tono serio (decisión 4), recordatorios en el calendario |
| Personal del hospital (recepción) | Menos llamadas repetidas, avisar a todos a la vez | Espacio del personal: avisos, mensajes con sus pacientes asignados, moderación del chat |
| Pacientes ya en casa | Seguir la recuperación cerca de donde viven | Cerca de mí, con sugerencias según la etapa de recuperación |

**Quién lo pagaría.** El paciente no paga: el cliente es el **hospital**. Lo adopta porque reduce las preguntas repetidas en recepción y mejora la experiencia de la familia. Por eso las cuentas las crea el hospital (decisión 2) y el personal solo ve a sus pacientes asignados.

**Por qué puede funcionar como producto real:**
 Porque funciona con los planes gratuitos de Vercel y Supabase y con servicios de mapas sin clave (decisiones 3 y 5). Un hospital puede hacer una prueba piloto sin presupuesto. Además, el objetivo inicial es un hospital, con unas 500 familias al mes (ver el diagnóstico de escalabilidad). Cada hospital nuevo suma usuarios de forma predecible. Y ninguna función principal depende de la IA integrada; se enciende solo si el hospital decide pagarla, y aun así tiene un tope de gasto.

**Lo que haría falta antes de usarlo con pacientes reales en México:**
- Cumplir con la ley de protección de datos personales.
- Cumplir con las normas del expediente clínico (NOM-004-SSA3-2012) y de los sistemas de información en salud (NOM-024-SSA3-2012).
- Que el contenido de Lupita lo revise personal médico.
- Las capas de seguridad pendientes.

## Rutas

| Ruta | Qué es |
|---|---|
| `#/` | Inicio |
| `#/asistente` | Lupita (abierta para todos; sin sesión usa el diccionario local) |
| `#/servicios` | Cerca de mí (abierta para todos) |
| `#/ingresar` | Iniciar sesión con ID y código |
| `#/app` | Espacio del paciente (inicio, ruta, expediente, medicinas, citas, avisos, chat) |
| `#/personal` | Espacio del personal del hospital |

## Estructura

```
index.html          página única (inicio, Lupita, Cerca de mí, ingresar, app)
styles.css          diseño (paleta de 5 colores + letras recortadas)
fonts/              aquí va la fuente Transcity (ver fonts/LEEME.txt); sin ella se usa Young Serif
Lupita Personaje (offline).html  el personaje de Lupita en un solo archivo, se abre sin servidor
js/cutout.js        letras estilo recorte de revista (atributo data-cut)
js/lupi-art.js      dibujo de Lupita, el personaje del asistente
js/lupi.js          Lupita (usa /api/chat; sin conexión usa un mini diccionario)
js/servicios.js     Cerca de mí: servicios después del alta (OpenStreetMap + Overpass API + Leaflet + rutas OSRM)
js/store.js         Supabase + modo demo (incluye "Mis lugares guardados")
js/calendar.js      archivos .ics y Google Calendar con recordatorios
js/demo-data.js     pacientes y personal de prueba
js/app.js           rutas, carrusel, desplegables, secciones
api/chat.js         función de Vercel que llama a Claude (lee las instrucciones de prompts/)
api/_acceso.js      exige sesión y descuenta el límite de preguntas antes de llamar a Claude
prompts/lupita-system-prompt.md  instrucciones de Lupita para el modelo de IA (system prompt)
vercel.json         incluye la carpeta prompts/ en la función api/chat.js y agrega encabezados de seguridad
evidencia/          capturas de las pruebas (por ejemplo, el filtro del chat en Supabase)
robots.txt          qué pueden indexar los buscadores (no es un candado: ver Capas de seguridad)
package.json        dependencia del SDK de Anthropic que usa api/chat.js
autoevaluacion.md   autoevaluación (10-15 líneas) y declaración de uso de IA
BITÁCORA.md         bitácora del proyecto: pruebas A, B y C, auditoría con una compañera y uso de IA
supabase/schema.sql tablas y reglas de seguridad (RLS)
supabase/seed.sql   datos de ejemplo (opcional)
```

## Cerca de mí (servicios después del alta)

Ruta: `#/servicios` (abierta para todos, sin iniciar sesión) o `#/servicios/<categoría>`.

| Función | Cómo funciona |
|---|---|
| **¿Qué buscan?** | Un solo cuadro de texto: «fisioterapia para mi hijo», «farmacia», «laboratorio»… Lupita reconoce la categoría (hospitales y centros médicos, clínicas de rehabilitación, fisioterapia, farmacias, laboratorios médicos, atención especializada) y la traduce a etiquetas de OpenStreetMap. Si no reconoce una categoría, busca lugares cuyo nombre contenga ese texto (sin importar acentos). Debajo hay botones con las 6 categorías como ideas. |
| **¿Dónde están?** | Ubicación actual del dispositivo (`navigator.geolocation`) o dirección/ciudad escrita (Nominatim de OpenStreetMap). La ubicación no se guarda. |
| **Radio** | 1, 5, 10 o 20 km. Overpass API devuelve los establecimientos reales dentro del radio; la app calcula la distancia en línea recta y los ordena del más cercano al más lejano. |
| **Resultados** | Lista numerada con **nombre y dirección**, tipo de lugar, distancia y botón **Guardar**. Si OpenStreetMap no tiene la dirección registrada, se busca una dirección aproximada con Nominatim (una por segundo) y se marca «(aprox.)». |
| **Mapa** | Leaflet con mosaicos de OpenStreetMap: el punto de partida, el círculo del radio y cada lugar con el mismo número que en la lista. Tocar un número abre el lugar en el mapa y viceversa. |
| **Cómo llegar** | Traza la ruta en el mapa desde el punto de partida (ubicación actual o dirección escrita) hasta el lugar, **en auto o a pie**, con tiempo, distancia e indicaciones paso a paso en español. Usa el servidor OSRM de FOSSGIS (`routing.openstreetmap.de`, el mismo de openstreetmap.org) y `router.project-osrm.org` como respaldo. También ofrece abrir la ruta en Google Maps (enlace normal, sin clave). |
| **Accesibilidad** | Filtros opcionales: entrada para silla de ruedas (`wheelchair`), estacionamiento accesible (`capacity:disabled`), elevador (`elevator`) y baños adaptados (`toilets:wheelchair`). Solo se muestran cuando el dato está registrado; nunca se suponen. Si ningún lugar tiene el dato, la app lo dice y **muestra igual todos los lugares**. Los filtros empiezan apagados en cada visita. |
| **Mis lugares guardados** | Paciente con cuenta en Supabase → tabla `lugares_guardados`. Sin sesión o en modo demo → en el navegador. |
| **Etapa de recuperación** | Sugiere qué buscar según la etapa (preparando la salida, primeras semanas en casa, en rehabilitación, revisiones de control). Se calcula con el paso «Alta» de la ruta o con la columna `etapa_recuperacion`; el hospital puede sugerir categorías con `apoyos_sugeridos`. **No usa el diagnóstico.** Sin sesión, la familia elige la etapa. |
| **Lupita** | Si alguien le escribe a Lupita «necesito un lugar donde mi hijo pueda recibir fisioterapia», reconoce la categoría y ofrece un botón que abre Cerca de mí con esa búsqueda. |

**No hay que configurar nada:** OpenStreetMap, Overpass API, Nominatim, los mosaicos del mapa y los servidores de rutas OSRM son gratuitos y no piden clave. Si un servidor de Overpass está saturado, la app prueba con dos servidores de respaldo y avisa a la familia. Los datos de OpenStreetMap los hace la comunidad y pueden estar incompletos; la app lo dice y recomienda llamar antes de ir. Para mucho tráfico conviene un servidor propio de Overpass/Nominatim.
La ubicación actual del navegador solo funciona en `https://` (Vercel) o en `localhost`.

## Publicar (GitHub → Vercel)

1. Sube esta carpeta a un repositorio de GitHub.
2. En Vercel: **Add New → Project**, importa el repositorio. Framework: **Other**. No hace falta comando de build.
3. Listo: así se publica sin IA (Lupita usa su diccionario y la app no cuesta nada).
4. En **Settings → Environment Variables** agrega las dos variables: `LUPITA_IA` con el valor `activa` y `ANTHROPIC_API_KEY` con tu clave de https://console.anthropic.com. Vuelve a desplegar. Con solo la clave, la IA sigue apagada.

| Variable | ¿Obligatoria? | Para qué |
|---|---|---|
| `LUPITA_IA` | No (la versión publicada no la tiene, ver decisión 5) | Interruptor de la IA: solo con el valor `activa` Lupita llama a Claude |
| `ANTHROPIC_API_KEY` | Solo si `LUPITA_IA=activa` | Clave de Claude; sin el interruptor no se usa aunque exista |
| `SUPABASE_URL` | No | URL de tu proyecto de Supabase (si no está, `api/_acceso.js` usa la que viene en el código) |
| `SUPABASE_PUBLISHABLE_KEY` | No | Clave publicable de Supabase (lo mismo) |

**Modelo de IA (si se enciende la IA):** `api/chat.js` usa `claude-opus-5-5` con esfuerzo bajo (`effort: "low"`), máximo 1024 tokens por respuesta y respaldo automático de modelo si está saturado. Para cambiar el modelo o el costo, edita esa llamada.

## Probar en tu computadora

Cualquier servidor estático sirve para ver el sitio (Lupita usará el diccionario local):

```
npx serve .
```

Para probar también `/api/chat` con la IA, usa la CLI de Vercel con `LUPITA_IA=activa` y `ANTHROPIC_API_KEY` en un archivo `.env.local` (ya está en `.gitignore`). Sin `LUPITA_IA=activa`, `/api/chat` responde `sin_ia`:

```
npx vercel dev
```

## Base de datos (Supabase)

1. En Supabase → SQL Editor, ejecuta `supabase/schema.sql` (crea tablas, reglas RLS, límites de Lupita y el filtro del chat; se puede volver a ejecutar sin borrar datos).
2. Las cuentas las crea el hospital en Authentication → Users: el ID se convierte en correo (`WW-2048-17` → `ww-2048-17@paciente.wellwell.app`) y el código de acceso es la contraseña.
3. Desactiva "Allow new users to sign up" para que nadie cree cuentas por su cuenta.
4. Opcional: `supabase/seed.sql` trae datos de ejemplo.

### Protección de Lupita

`/api/chat` solo responde a pacientes y personal con sesión real de Supabase. Límites: 20 preguntas por persona al día, 5 por minuto y 450 en toda la app al día (se cambian en `consumir_pregunta_lupita`, en `supabase/schema.sql`). Las visitas y las cuentas demo usan el diccionario local.

**Qué pasa con cada pregunta:** Si un paso falla o no se puede comprobar, la pregunta se detiene ahí:

1. **En el navegador** (`js/lupi.js`): si no hay sesión y la palabra está en el diccionario, Lupita responde sin llamar al servidor. Si el servidor no da una respuesta, también usa el diccionario.
2. **`api/chat.js`:** acepta solo `POST` con una pregunta de hasta 300 caracteres.
3. **¿La IA está encendida?** Se necesitan `LUPITA_IA=activa` y la clave. Si no, responde `503 sin_ia` sin revisar la sesión ni gastar del límite.
4. **¿Hay sesión?** (`api/_acceso.js`) Pide un token `Bearer` válido. Si no hay, responde `401`.
5. **¿Quedan preguntas?** (`consumir_pregunta_lupita`, en Supabase) Revisa en este orden: que sea paciente o personal registrado, 20 al día por persona, 5 por minuto y 450 al día en toda la app. La función bloquea la fila de la persona (`for update`), así dos preguntas al mismo tiempo no pueden saltarse el límite.
6. Si Supabase no responde en 5 segundos o devuelve algo inesperado: `503` y no se llama a Claude (falla cerrada).
7. Solo entonces se llama a Claude, con un historial de máximo 6 mensajes y una respuesta de máximo 1024 tokens.

**Estado publicado:** https://well-well-2.vercel.app tiene la IA apagada (no existe `LUPITA_IA=activa`), así que Lupita funciona solo con su diccionario y la app no tiene costo. Con la IA apagada, `/api/chat` responde `503` con `codigo: "sin_ia"` **antes** de revisar la sesión (no gasta preguntas del límite ni crea el cliente de Claude), y Lupita dice «Esa palabra todavía no la conozco» en lugar de un error de conexión. Las palabras del diccionario se responden sin llamar al servidor. Para encender la IA hay que agregar **dos** variables en Vercel, `LUPITA_IA=activa` y `ANTHROPIC_API_KEY`, y volver a desplegar: entonces `/api/chat` sin sesión responde `401 Necesitas iniciar sesión` y aplican los límites de arriba.

### Diagnóstico de escalabilidad

**Diagnóstico original (Sesión 22):** dije que el cuello de botella era el costo de Claude. Con un tope de gasto de US$500 al mes y US$0.011 por pregunta, se alcanzaría el tope con  4,545 usuarios activos al mes. Ese diagnóstico no tomaba en cuenta que `/api/chat` estaba abierta a cualquiera, y el número cambió cuando agregué los límites. Abajo está la versión corregida.

**Usuarios objetivo:** la app es para un hospital, así que el objetivo es 500 familias activas al mes. Con 10 preguntas por familia serían casi 5,000 preguntas al mes (alrededor de 170 diarias), por debajo del tope de 450 al día. Con este objetivo, la app funciona con los planes gratuitos aunque se encienda la IA.

**Versión publicada (sin IA):** el costo es $0 y Lupita deja de ser un riesgo. Lo primero que se acercaría a un límite es Supabase, porque cada persona con sesión abre una conexión en tiempo real para recibir mensajes y avisos al momento; el plan gratuito limita cuántas conexiones simultáneas puede haber. Si se llena, los mensajes llegarán al recargar la página en lugar de al instante.

**Si se enciende la IA (con la clave), el cuello de botella pasa a ser Lupita:**

| Qué | Número real | Límite | ¿Cuándo se rompe? |
|---|---|---|---|
| Límite global de Lupita (puesto por mí) | 450 preguntas/día = 13,500/mes | Tope propio en `consumir_pregunta_lupita` | 1,350 usuarios activos al mes; un día con mucho uso lo alcanza antes |
| Costo de Claude (`claude-opus-5-5`: US$4 por millón de tokens de entrada, US$20 de salida) | ~US$0.010 por pregunta típica; ~US$0.033 en el peor caso (historial completo + 1,024 tokens de respuesta) | Gasto mensual de la cuenta | No se alcanza: el tope global deja el peor caso en ~US$440/mes |
| Vercel (plan gratuito) | Solo `/api/chat` usa funciones: ≤13,500 invocaciones/mes | 1,000,000 invocaciones/mes | Muy lejos |
| Cerca de mí (Overpass, Nominatim, OSRM) | Se llaman desde el navegador de cada familia, no desde mi servidor | Uso justo por IP | Solo con muchísimo tráfico; entonces conviene un servidor propio |

**Cuello de botella:** el límite global de Lupita. Lo puse a propósito porque cambié un riesgo de costo por un límite de uso que yo controlo. Cuando se alcanza, Lupita responde "ya respondió muchas preguntas hoy" y las familias usan el diccionario local hasta el día siguiente; el resto de la app sigue funcionando.

Cada pregunta es una llamada nueva a Claude, sin caché. Si 200 familias preguntan qué es anestesia, se paga 200 veces. El siguiente paso sería guardar en Supabase las respuestas a palabras frecuentes y responder desde ahí. (La caché de prompts de Claude no ayuda aquí: las instrucciones de Lupita son de 500 tokens, menos que el mínimo que se puede guardar.)

Aun así, todavía falta medir: cuántas preguntas hace de verdad cada persona y cuántos usuarios activos hay.

## Capas de seguridad y vulnerabilidades conocidas

well well guarda información médica de niñas, niños y adultos mayores, así que no confío en una sola protección. Uso varias capas (defensa en profundidad): si una falla, la siguiente sigue protegiendo. También documento lo que todavía es vulnerable.

### Capas que ya existen

| # | Capa | Qué evita | Dónde está |
|---|---|---|---|
| 1 | Cuentas creadas por el hospital + ID y código de acceso | Que cualquiera entre con el ID impreso en su hoja de ingreso | Supabase Auth |
| 2 | Reglas RLS en la base de datos | Que un paciente lea datos de otro, o que el personal vea pacientes que no tiene asignados, aunque alguien llame a la API directo | `supabase/schema.sql` |
| 3 | Solo claves publicables en el navegador | Que alguien copie una clave secreta del código. La clave publicable no da permisos: los da la sesión + RLS | `js/store.js`, `api/_acceso.js` |
| 4 | Validación en el servidor | Que se salten reglas del navegador: filtro del chat, largo de los textos, valores permitidos (`check`) | `supabase/schema.sql` |
| 5 | Límites de uso (rate limiting) y falla cerrada en Lupita | Abuso con scripts y gasto sin control | `api/_acceso.js`, `consumir_pregunta_lupita` |
| 6 | Interruptor explícito de la IA | Gastar dinero por una clave olvidada) | `api/chat.js` |
| 7 | Escapar todo el texto antes de mostrarlo (`esc()`) | Que un mensaje con código HTML/JavaScript se ejecute en el navegador de otra persona (XSS) | `js/app.js` |
| 8 | Moderación humana | Lo que un filtro automático no detecta: el personal puede borrar mensajes de la sala | RLS «sala: moderar» |
| 9 | Encabezados de seguridad HTTP | Que la app se abra dentro de otra página para engañar al usuario (`X-Frame-Options`), que el navegador adivine tipos de archivo (`nosniff`), filtrar la URL a otros sitios (`Referrer-Policy`), usar cámara o micrófono (`Permissions-Policy`) | `vercel.json` |
| 10 | Datos mínimos | En la sala solo aparecen apodo + cuarto, nunca el nombre completo. La ubicación de Cerca de mí no se guarda. La etapa de recuperación no usa el diagnóstico | `js/app.js`, `js/servicios.js` |
| 11 | HTTPS | Que alguien lea los datos en el camino | Vercel |

**Lo que NO es una capa de seguridad: `robots.txt`.** Le pide a los buscadores que no indexen `/api/` ni `/prompts/`, pero es una petición, no un candado: un robot malicioso la ignora, y el archivo es público. De hecho, `/prompts/` sigue siendo accesible. No importa porque no es un secreto: el repositorio también es público. **La seguridad de well well no depende de que el código sea secreto**, sino de la sesión y las reglas RLS. Por eso las instrucciones de Lupita no contienen datos de pacientes ni claves.

### Vulnerabilidades conocidas

| Vulnerabilidad | Riesgo | Siguiente paso |
|---|---|---|
| **Códigos de acceso cortos** (6 caracteres, sin segundo factor) | Adivinar el código de un paciente probando muchas veces. Supabase limita los intentos, pero un código como `123456` es débil | Códigos generados al azar por el hospital y un segundo factor (código por SMS o correo) para el personal |
| Modo demo con códigos visibles en `js/demo-data.js` | Cualquiera puede leer las cuentas demo. Solo dan acceso a datos ficticios guardados en ese navegador, nunca a Supabase | En producción, quitar el modo demo del sitio publicado |
| **`autor_nombre` lo escribe el navegador** en la sala | Alguien con sesión podría poner "Recepción" como apodo y hacerse pasar por el personal | Calcular el nombre en la base de datos (trigger) a partir del perfil, no aceptarlo del navegador |
| Filtro de groserías básico | Se evade con variaciones (t0nto) o groserías que no están en la lista | Lista más amplia, normalizar números y símbolos, y seguir con la moderación humana como respaldo |
| **Sin registro de auditoría** | No queda registro de quién abrió qué expediente | Tabla de auditoría con triggers (quién, qué, cuándo), que exigen las normas de expediente clínico |
| **Sin política de contenido (CSP)** | Si apareciera un XSS, el navegador no lo bloquearía | Agregar `Content-Security-Policy` en `vercel.json` con los dominios exactos (Supabase, OpenStreetMap, Leaflet, fuentes) y probar cada función |
| **Plan gratuito de Supabase** | Sin respaldos programados ni recuperación a un punto en el tiempo. Además, Supabase pausa el proyecto si pasa una semana sin uso: me pasó antes de entregar. Mientras está pausado, la app no se cae, porque `js/store.js` usa el modo demo si Supabase no responde. Pero los datos reales no están disponibles hasta restaurarlo | Plan de pago con respaldos, sin pausas, antes de guardar datos reales |
| Servidores públicos de mapas (Overpass, Nominatim, OSRM) | Pueden fallar o limitar el uso. Es un riesgo de datos de disponibilidad | Servidor propio si el tráfico crece (ver diagnóstico) |

## Decisiones de diseño vs. sugerencias del IS

### 1. Seguridad y escalabilidad: Lupita estaba abierta a cualquiera

- **Etapa:** seguridad / escalabilidad (diagnóstico de la Sesión 22).
- **Qué propuso el IS:** al revisar los números, advirtió que `/api/chat` acepta preguntas de cualquiera, sin sesión ni límite. En el peor caso, un script a una pregunta por segundo gastaría $500 en unas 4.3 horas y apagaría Lupita para todos. Propuso exigir sesión en `/api/chat` y guardar un límite de preguntas por persona en la base de datos.
- **Qué decidí:** ACEPTAR Y EXPANDIR. `api/_acceso.js` exige una sesión real de Supabase antes de llamar a Claude, y la función `consumir_pregunta_lupita` (en `supabase/schema.sql`) cuenta 20 preguntas por persona al día, 5 por minuto y 450 para toda la app. Las visitas y las cuentas demo usan el diccionario local.
- **Justificación:** el riesgo no era solo de dinero sino de disponibilidad. Una sola persona con un script podía dejar sin Lupita a todas las familias. Un límite solo por persona no basta (porque alguien puede crear varias cuentas), por eso también hay un tope global, que fija el gasto máximo en US$440/mes aunque la app crezca. Si Supabase no responde, prefiero que Lupita use el diccionario a gastar sin control.
- **Cómo lo verifiqué:** volví a calcular el gasto con el peor caso y los números del código. Con eso vi que mi diagnóstico de la Sesión 22 ya no era correcto: el costo dejó de ser lo primero que se rompe y el límite pasó a ser el tope global (1,350 usuarios al mes).

### 2. Seguridad: entrar solo con el ID de la hoja de registro

- **Etapa:** funcionalidad / seguridad (inicio de sesión).
- **Qué propuso el IS:** en la landing page original, el IS advirtió que las cuentas estaban escritas en `script.js` y cualquiera podría verlas. Con datos médicos reales, el inicio de sesión tiene que validarse en un servidor. Después, al rehacer la app, agregó un código de acceso además del ID, porque el ID del paciente va impreso en la hoja de registro y cualquiera que lo vea en una pulsera podría entrar.
- **Qué decidí:** ACEPTAR. El inicio de sesión ahora pasa por Supabase Auth (ID + código como contraseña), y las reglas RLS de `supabase/schema.sql` hacen que cada paciente solo lea sus datos y el personal solo los de sus pacientes asignados. Además, las cuentas las crea el hospital: se puede apagar el registro abierto. - **Justificación:** Es un expediente médico de niñas, niños y adultos mayores. Un ID visible en una pulsera es un identificador, no una contraseña. Validar en el navegador no protege nada porque el código se puede leer; la validación y los permisos tienen que estar en el servidor (Supabase).

### 3. Google Places vs. OpenStreetMap en "Cerca de mí"

- **Etapa:** funcionalidad / deployment.
- **Qué propuso el IS:** construir "Cerca de mí" con Google Places API y Maps JavaScript API. Para que funcionara, había que activar la facturación en Google Cloud y crear una clave; además, el IS explicó que las condiciones de Google no permiten mostrar resultados de Places en un mapa que no sea de Google.
- **Qué decidí:** RECHAZAR y pedir OpenStreetMap + Overpass API + Leaflet (con Nominatim para direcciones y OSRM para rutas).
- **Justificación:** con Google, cada búsqueda cuesta dinero y necesita una tarjeta y una clave pública en el navegador, que alguien podría copiar y gastar; también me ataba a usar solo mapas de Google. Con OpenStreetMap no hay clave ni facturación ni nada que configurar para desplegar en Vercel. La desventaja es que los datos de la comunidad pueden estar incompletos; por eso la app lo dice, marca las direcciones aproximadas, nunca supone datos de accesibilidad y recomienda llamar antes de ir.

### 4. Mockup

- **Etapa:** mockup.
- **Qué propuso el IS:** en las primeras versiones de la landing y de la app usó una tipografía muy informal.
- **Qué decidí:** REVISAR. Le pedí que el diseño no fuera totalmente infantil porque estamos hablando de un hospital, y después que no usara una tipografía tan informal como antes. Me quedé con la paleta de color y las letras recortadas como detalle, pero con una fuente más seria para el texto.
- **Justificación:** la app la usan niñas y niños, pero también sus papás, adultos mayores y el personal del hospital, y muestra información médica. Un tono demasiado infantil le resta confianza a un expediente y a las indicaciones de medicinas; el toque lúdico se queda en Lupita y en los detalles, no en la información.

### 5. Escalabilidad (costo): publicar Lupita sin IA

- **Etapa:** deployment / escalabilidad.
- **Qué propuso el IS:** para que Lupita respondiera palabras nuevas en el link publicado, crear una clave en console.anthropic.com, agregar un método de pago y guardarla como `ANTHROPIC_API_KEY` en Vercel, con un tope de gasto en la consola como segunda protección.
- **Qué decidí:** REVISAR. Publiqué sin la clave: Lupita responde con su diccionario y sigue llevando a "Cerca de mí". El código de la IA y su protección  quedan publicados y listos: encenderla solo requiere agregar dos variables en Vercel. Al probar yo el link publicado sin clave, encontré dos errores que el IS no había señalado. **Primero:** Lupita respondía "no me pude conectar" y además gastaba una pregunta del límite diario. Lo cambié para que `/api/chat` diga `sin_ia` antes de revisar la sesión y Lupita responda "Esa palabra todavía no la conozco", así se ve como una decisión y no como una falla. **Segundo:** aunque quité la clave de Vercel, el link seguía actuando como si la IA estuviera encendida; en lugar de depender de que la clave exista o no, agregué un interruptor explícito: la IA solo se enciende con `LUPITA_IA=activa` y la clave. Encender algo que cuesta dinero tiene que ser una decisión a propósito, no el efecto de una clave olvidada.
- **Justificación:** es un proyecto sin presupuesto y ninguna función principal depende de la IA. Con la clave, el gasto máximo sería de alrededor de US$440 al mes; sin ella es de $0. Prefiero una Lupita más limitada pero gratuita y segura que depender de una tarjeta. Como muestra el diagnóstico, esta decisión también cambia el cuello de botella.

### 6. El filtro del chat solo existía en el navegador

- **Etapa:** seguridad (revisión final antes de entregar).
- **Qué propuso el IS:** al revisar la entrega, el IS señaló que el README decía que el chat bloqueaba teléfonos, correos, enlaces y groserías, pero ese filtro solo estaba en `js/app.js`. En Supabase, la tabla `sala_mensajes` solo limitaba el largo (240 caracteres). Cualquiera con sesión podía saltarse el filtro mandando el mensaje directo a la API de Supabase, también en la sala "Peques". Propuso repetir el filtro como regla en la base de datos.
- **Qué decidí:** ACEPTAR. Agregué la regla `sala_mensajes_sin_datos_ni_groserias` en `supabase/schema.sql`, con los mismos patrones del navegador. Dejé el filtro del navegador porque da un aviso amable al instante, pero la regla que manda es la del servidor. La puse como `not valid` para que no rechace mensajes viejos, solo los nuevos. No moví a la base de datos el problema de `autor_nombre`: lo dejé documentado en "Vulnerabilidades conocidas".
- **Cómo lo verifiqué:** en el SQL Editor de Supabase intenté insertar en `sala_mensajes` un mensaje con un teléfono. Antes de la regla se guardaba; después, Supabase lo rechaza con el error `sala_mensajes_sin_datos_ni_groserias`. Un mensaje normal se sigue guardando. Capturas de ello en la carpeta de evidencias.
- **Justificación:** es la misma lección que el IS me señaló en el Assignment 1 con `script.js`: **lo que se valida solo en el navegador no protege nada**, porque cualquiera puede saltarse el navegador. En una sala donde escriben niñas y niños, un teléfono o un enlace de un desconocido es justo lo que hay que impedir. Lo documento como hallazgo del IS y no mío: ya conocía esa lección, pero no la había aplicado al chat.

## Historial de commits

Subí casi todo con «Add files via upload» desde la página de GitHub, que pone ese mensaje por defecto. Por eso 40 de los 50 commits tienen mensajes genéricos. Entonces aquí solo explico los commits más importantes.

| Commit | Mensaje original | Qué decisión hay detrás |
|---|---|---|
| `f6fc833` | Add files via upload | Primera versión de la app (Assignment 2): espacios de paciente y personal, Lupita, Supabase con RLS y modo demo |
| `2eac841`, `e00adf9` | Update print statement from 'Hello' to 'Goodbye' | El mensaje no tiene nada que ver con el cambio. Reescriben `app.js` (dosis del día, "Lo que sigue", "Deshacer") y `styles.css` con la paleta y las fuentes nuevas) |
| `8b51ed9` | Add files via upload | Regla RLS para que el personal pueda deshacer solo sus propios avisos |
| `bb57795` | Add files via upload | Crea **"Cerca de mí"** (`js/servicios.js`) y los lugares guardados |
| `7b1b3ce` | Add files via upload | Versión con Google Maps/Places |
| `be1dacb` | Add files via upload | **Rechazo Google** y cambio a OpenStreetMap + Overpass + Nominatim |
| `39806e3` | Add files via upload | Mapa con Leaflet, marcadores numerados y rutas paso a paso con OSRM |
| `12db2b9`, `d0cdfa8` | Update store.js / Add files via upload | Cambio la conexión a otro proyecto de Supabase y en el siguiente commit la regreso al original (`xkfoiggivoxiwwkzcpbe`), que es el que usa la app |
| `dbe7d11` | Add files via upload | Saco las instrucciones de Lupita del código a `prompts/` para tener una sola versión, y creo `vercel.json` para incluirlas al desplegar |
| `431bbf4` | Add files via upload | Lupita exige sesión real y tiene límites de 20/5/450 (decisión 1) |
| `da4228c` | Add files via upload | Lupita funciona sin IA y responde `sin_ia` sin gastar del límite (decisión 5) |
| `02b2d27` | Add files via upload | Interruptor explícito `LUPITA_IA=activa` (decisión 5) |
| `9f8ba30` | Add files via upload | Encabezados HTTP, `robots.txt` y las secciones de mercado y capas de seguridad |

Los demás commits genéricos son menores: colores y estilos (`21e76e9`, `53dd4e9`, `5c5251d`, `8bf5c74`, `a58e7c4`, `9c4fa36`), el rediseño del personaje de Lupita (`ce2eae2`), documentación del README y la bitácora (los «Update BITÁCORA.md», `6da5909`, `45120c9`, `5b3fe8a`, `9a2eb0e`) y dos commits vacíos (`720d438`, `66e6c9e`).

**Errores que reconozco en el historial:**
- Tres commits tienen mensajes que suenan bien pero no coinciden con lo que cambiaron: `9811a37` («Add SQL function to get patient ID») y `a65b026` solo agregan líneas en blanco, y `db13917` solo arregla una viñeta.

## Cuentas de prueba (modo demo, sin Supabase)

| Rol | ID | Código |
|---|---|---|
| Paciente internada (niña) | WW-2048-17 | 123456 |
| Paciente con citas (adulto) | WW-3301-09 | 123456 |
| Niño en casa tras una quemadura (etapa: rehabilitación) | WW-5120-03 | 123456 |
| Adulta mayor en casa tras cirugía de cadera (etapa calculada: primeras semanas) | WW-7702-44 | 123456 |
| Personal del hospital (recepción) | REC-0042 / REC-0107 | apoyo26 |

En modo demo los mensajes se guardan solo en ese navegador (abre dos pestañas para ver paciente y personal conversando). Si el ID existe en Supabase, se usa Supabase.

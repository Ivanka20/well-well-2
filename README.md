# well well

Tu proceso médico, a la vista. Sitio web con dos espacios:

- **Pacientes y familiares** (niñas y niños, adultos y personas mayores): ruta, medicinas, citas, expediente, avisos, chat entre pacientes (salas «Pacientes y familias» y «Peques»), Lupita y **Cerca de mí**.
- **Personal del hospital**: recepción, avisos y expedientes.

El chat entre pacientes bloquea teléfonos, correos, enlaces y groserías, y el personal puede borrar mensajes.

## Para probar la app

**Link publicado:** https://well-well-2.vercel.app

Dos funciones que se pueden probar sin iniciar sesión:

1. **Lupita** (`#/asistente`): escribe una palabra como «anestesia» o «sutura», o una frase como «necesito fisioterapia para mi hijo». Lupita la explica con su diccionario y, si es un lugar, ofrece un botón que abre Cerca de mí.
2. **Cerca de mí** (`#/servicios`): elige una categoría (por ejemplo *Farmacias*), escribe una ciudad (por ejemplo «Guadalajara, Jalisco») y elige el resultado. Aparece la lista de lugares reales con dirección y distancia, el mapa y el botón **Cómo llegar**. Si una categoría no tiene lugares en 5 km, la app ofrece buscar en 10 km.

Para entrar al espacio del paciente o del personal (`#/ingresar`), usa las [cuentas de prueba](#cuentas-de-prueba-modo-demo-sin-supabase) del final.

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
vercel.json         incluye la carpeta prompts/ en la función api/chat.js
package.json        dependencia del SDK de Anthropic que usa api/chat.js
autoevaluacion.md   autoevaluación (el mismo texto que la sección del final de este README)
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
> La ubicación actual del navegador solo funciona en `https://` (Vercel) o en `localhost`.

## Publicar (GitHub → Vercel)

1. Sube esta carpeta a un repositorio de GitHub.
2. En Vercel: **Add New → Project**, importa el repositorio. Framework: **Other**. No hace falta comando de build.
3. Listo: así se publica sin IA (Lupita usa su diccionario y la app cuesta US$0).
4. *(Opcional, para encender la IA)* En **Settings → Environment Variables** agrega **las dos** variables: `LUPITA_IA` con el valor `activa` y `ANTHROPIC_API_KEY` con tu clave de https://console.anthropic.com. Vuelve a desplegar. Con solo la clave, la IA sigue apagada.

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

0. **Si usas tu propio proyecto de Supabase**, cambia `SUPABASE_URL` y `SUPABASE_KEY` (la clave *publishable*, nunca la *secret*) en `js/store.js` y pon los mismos valores en las variables `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY` de Vercel (o cámbialos en `api/_acceso.js`).
1. Supabase → **SQL Editor** → pega y ejecuta `supabase/schema.sql` (es seguro volver a ejecutarlo: agrega las columnas `etapa_recuperacion` y `apoyos_sugeridos` y la tabla `lugares_guardados`; si ya tenías una versión anterior de esa tabla, la ajusta sin borrar nada).
2. Por cada paciente o persona del personal, crea un usuario en **Authentication → Users → Add user** (marca *Auto Confirm*):
   - Paciente `WW-2048-17` → correo `ww-2048-17@paciente.wellwell.app`
   - Personal `REC-0042` → correo `rec-0042@personal.wellwell.app`
   - La contraseña es su **código de acceso** (mínimo 6 caracteres).
3. Llena sus datos en las tablas (o ejecuta `supabase/seed.sql` como ejemplo). Para Cerca de mí, opcionalmente:
   ```sql
   update public.pacientes
   set etapa_recuperacion = 'rehabilitacion',
       apoyos_sugeridos = array['rehabilitacion', 'fisioterapia']
   where codigo = 'WW-2048-17';
   ```
4. Documentos del expediente: sube los PDF a **Storage** y pega su enlace en la columna `url` de la tabla `documentos`. Así los botones "Ver" y "Descargar" abren el archivo real.
5. En **Authentication → Providers → Email**, puedes desactivar "Allow new users to sign up": las cuentas las crea el hospital.

### Protección de Lupita

`/api/chat` solo responde a pacientes y personal con sesión real de Supabase. Límites: **20 preguntas por persona al día, 5 por minuto y 450 en toda la app al día** (se cambian en `consumir_pregunta_lupita`, en `supabase/schema.sql`). Las visitas y las cuentas demo usan el diccionario local.

**Qué pasa con cada pregunta, en orden.** Primero van los pasos que no cuestan nada y al final el único que cuesta. Si un paso falla o no se puede comprobar, la pregunta se detiene ahí:

1. **En el navegador** (`js/lupi.js`): si no hay sesión y la palabra está en el diccionario, Lupita responde sin llamar al servidor. Si el servidor no da una respuesta, también usa el diccionario.
2. **`api/chat.js`:** acepta solo `POST` con una pregunta de hasta 300 caracteres.
3. **¿La IA está encendida?** Se necesitan `LUPITA_IA=activa` y la clave. Si no, responde `503 sin_ia` sin revisar la sesión ni gastar del límite.
4. **¿Hay sesión?** (`api/_acceso.js`) Pide un token `Bearer` válido. Si no hay, responde `401`.
5. **¿Quedan preguntas?** (`consumir_pregunta_lupita`, en Supabase) Revisa en este orden: que sea paciente o personal registrado, 20 al día por persona, 5 por minuto y 450 al día en toda la app. La función bloquea la fila de la persona (`for update`), así dos preguntas al mismo tiempo no pueden saltarse el límite.
6. **Si Supabase no responde en 5 segundos** o devuelve algo inesperado: `503` y no se llama a Claude (falla cerrada).
7. **Solo entonces se llama a Claude**, con un historial de máximo 6 mensajes y una respuesta de máximo 1024 tokens.

**Al publicar, ejecuta primero `supabase/schema.sql` y después despliega en Vercel.** Si la función de límites no existe, Lupita no llama a la IA y usa el diccionario.

**Estado publicado:** https://well-well-2.vercel.app tiene la IA apagada (no existe `LUPITA_IA=activa`), así que Lupita funciona solo con su diccionario y la app cuesta **US$0**. Con la IA apagada, `/api/chat` responde `503` con `codigo: "sin_ia"` **antes** de revisar la sesión (no gasta preguntas del límite ni crea el cliente de Claude), y Lupita dice «Esa palabra todavía no la conozco» en lugar de un error de conexión. Las palabras del diccionario se responden sin llamar al servidor. Para encender la IA hay que agregar **dos** variables en Vercel, `LUPITA_IA=activa` y `ANTHROPIC_API_KEY`, y volver a desplegar: entonces `/api/chat` sin sesión responde `401 Necesitas iniciar sesión` y aplican los límites de arriba.

### Diagnóstico de escalabilidad: dónde se rompe primero

**Diagnóstico original (Sesión 22):** dije que el cuello de botella era el costo de Claude. Con un tope de gasto de US$500 al mes y ~US$0.011 por pregunta, se llegaría al tope con unos **4,545 usuarios** activos al mes (10 preguntas cada uno). Ese diagnóstico no tomaba en cuenta que `/api/chat` estaba abierta a cualquiera (ver decisión 1), y el número cambió cuando agregué los límites. Abajo está la versión corregida.

**Usuarios objetivo (supuesto):** la app es para un hospital, así que el objetivo es **unas 500 familias activas al mes**. Con 10 preguntas por familia serían ~5,000 preguntas al mes (~170 al día), por debajo del tope de 450 al día. Con este objetivo, la app funciona con los planes gratuitos aunque se encienda la IA.

**Versión publicada (sin IA):** el costo es US$0 y Lupita deja de ser un riesgo. Lo primero que se acercaría a un límite es **Supabase**, porque cada persona con sesión abre una conexión en tiempo real (`Store.subscribe` en `js/store.js`) para recibir mensajes y avisos al momento; el plan gratuito limita cuántas conexiones simultáneas puede haber. Si se llena, los mensajes llegarían al recargar la página en lugar de al instante.

**Si se enciende la IA** (con la clave), el cuello de botella pasa a ser Lupita:

| Qué | Número real | Límite | ¿Cuándo se rompe? |
|---|---|---|---|
| **Límite global de Lupita** (puesto por mí) | 450 preguntas/día ≈ 13,500/mes | Tope propio en `consumir_pregunta_lupita` | **~1,350 usuarios activos al mes** (con 10 preguntas cada uno); un día con mucho uso lo alcanza antes |
| Costo de Claude (`claude-opus-5-5`: US$4 por millón de tokens de entrada, US$20 de salida) | ~US$0.010 por pregunta típica; ~US$0.033 en el peor caso (historial completo + 1,024 tokens de respuesta) | Gasto mensual de la cuenta | No se alcanza: el tope global deja el peor caso en ~US$440/mes |
| Vercel (plan gratuito) | Solo `/api/chat` usa funciones: ≤13,500 invocaciones/mes | 1,000,000 invocaciones/mes | Muy lejos |
| Cerca de mí (Overpass, Nominatim, OSRM) | Se llaman desde el navegador de cada familia, no desde mi servidor | Uso justo por IP | Solo con muchísimo tráfico; entonces conviene un servidor propio |

**Cuello de botella:** el límite global de Lupita. Lo puse a propósito: cambié un riesgo de **costo** (que llegaría de golpe) por un **límite de uso** que yo controlo. Cuando se alcanza, Lupita responde «ya respondió muchas preguntas hoy» y las familias usan el diccionario local hasta el día siguiente; el resto de la app sigue funcionando.

**La causa de fondo es de arquitectura:** cada pregunta es una llamada nueva a Claude, sin caché. Si 200 familias preguntan qué es «anestesia», se paga 200 veces. El siguiente paso sería guardar en Supabase las respuestas a palabras frecuentes y responder desde ahí. (La caché de prompts de Claude no ayuda aquí: las instrucciones de Lupita son de ~500 tokens, menos que el mínimo que se puede guardar.)

**Lo que todavía falta medir:** cuántas preguntas hace de verdad cada persona (supuse 10 al mes) y cuántos usuarios activos hay.

## Decisiones de diseño vs. sugerencias del IS

IS = sistema inteligente (Claude, en Claude Code). Cada entrada sale de una conversación real del proyecto.

### 1. Seguridad y escalabilidad: Lupita estaba abierta a cualquiera

- **Etapa:** seguridad / escalabilidad (diagnóstico de la Sesión 22).
- **Qué propuso el IS:** al revisar los números, advirtió que `/api/chat` «acepta preguntas de cualquiera, sin sesión ni límite. En el peor caso, un script a una pregunta por segundo gastaría $500 en unas 4.3 horas y apagaría Lupita para todos». Propuso exigir sesión en `/api/chat` y guardar un límite de preguntas por persona en la base de datos.
- **Qué decidí:** **aceptar y ampliar.** `api/_acceso.js` exige una sesión real de Supabase antes de llamar a Claude, y la función `consumir_pregunta_lupita` (en `supabase/schema.sql`) cuenta 20 preguntas por persona al día, 5 por minuto y 450 para toda la app. Las visitas y las cuentas demo usan el diccionario local.
- **Por qué:** el riesgo no era solo de dinero sino de disponibilidad. Una sola persona con un script podía dejar sin Lupita a todas las familias. Un límite solo por persona no basta (alguien puede crear varias cuentas), por eso también hay un tope global, que fija el gasto máximo en ~US$440/mes aunque la app crezca. Si Supabase no responde, la función no llama a la IA (falla cerrada): prefiero que Lupita use el diccionario a gastar sin control.
- **Cómo lo verifiqué:** volví a calcular el gasto con el peor caso y los números del código (US$0.0326 por pregunta × 450 al día × 30 días ≈ US$440 al mes). Con eso vi que mi diagnóstico de la Sesión 22 ya no era correcto: el costo dejó de ser lo primero que se rompe y el límite pasó a ser el tope global (~1,350 usuarios al mes). Corregí el número en este README.

### 2. Seguridad: entrar solo con el ID de la pulsera

- **Etapa:** funcionalidad / seguridad (inicio de sesión).
- **Qué propuso el IS:** en la landing page original, el IS advirtió que las cuentas estaban escritas en `script.js` y «cualquiera podría verlos. Con datos médicos reales, el inicio de sesión tiene que validarse en un servidor». Después, al rehacer la app, agregó un **código de acceso** además del ID, porque el ID del paciente va impreso en la pulsera y «cualquiera que lo vea en una pulsera podría entrar».
- **Qué decidí:** **aceptar.** El inicio de sesión ahora pasa por Supabase Auth (ID + código como contraseña), y las reglas RLS de `supabase/schema.sql` hacen que cada paciente solo lea sus datos y el personal solo los de sus pacientes asignados. Además, las cuentas las crea el hospital: se puede apagar el registro abierto.
- **Por qué:** es un expediente médico de niñas, niños y adultos mayores. Un ID visible en una pulsera es un identificador, no una contraseña. Validar en el navegador no protege nada porque el código se puede leer; la validación y los permisos tienen que estar en el servidor (Supabase).

### 3. Funcionalidad y deployment: Google Places vs. OpenStreetMap en «Cerca de mí»

- **Etapa:** funcionalidad / deployment.
- **Qué propuso el IS:** construir «Cerca de mí» con **Google Places API (New)** y **Maps JavaScript API**. Para que funcionara había que activar la facturación en Google Cloud y crear una clave; además, el IS explicó que las condiciones de Google no permiten mostrar resultados de Places en un mapa que no sea de Google.
- **Qué decidí:** **rechazar** y pedir OpenStreetMap + Overpass API + Leaflet (con Nominatim para direcciones y OSRM para rutas).
- **Por qué:** con Google, cada búsqueda cuesta dinero y necesita una tarjeta y una clave pública en el navegador, que alguien podría copiar y gastar; también me ataba a usar solo mapas de Google. Con OpenStreetMap no hay clave, ni facturación, ni nada que configurar para desplegar en Vercel. La desventaja es que los datos de la comunidad pueden estar incompletos; por eso la app lo dice, marca las direcciones aproximadas, nunca supone datos de accesibilidad y recomienda llamar antes de ir.

### 4. Mockup: el tono visual de un hospital

- **Etapa:** mockup.
- **Qué propuso el IS:** en las primeras versiones de la landing y de la app usó una tipografía muy informal para el público infantil.
- **Qué decidí:** **revisar.** Le pedí «que el diseño no sea como totalmente infantil… Estamos hablando de un hospital», y después que no usara «una tipografía tan informal como antes». Me quedé con la paleta de color y las letras recortadas como detalle, pero con una serif seria (Transcity, o Young Serif como respaldo) para el texto.
- **Por qué:** la app la usan niñas y niños, pero también sus papás, adultos mayores y el personal del hospital, y muestra información médica. Un tono demasiado infantil le resta confianza a un expediente y a las indicaciones de medicinas; el toque lúdico se queda en Lupita y en los detalles, no en la información.

### 5. Escalabilidad (costo): publicar Lupita sin IA

- **Etapa:** deployment / escalabilidad.
- **Qué propuso el IS:** para que Lupita respondiera palabras nuevas en el link publicado, crear una clave en console.anthropic.com, agregar un método de pago y guardarla como `ANTHROPIC_API_KEY` en Vercel, con un tope de gasto en la consola como segunda protección.
- **Qué decidí:** **revisar.** Publiqué sin la clave: Lupita responde con su diccionario (anestesia, biopsia, catéter, suero, hemograma, tomografía, ayuno, sutura, oxímetro, alta médica…) y sigue llevando a Cerca de mí. El código de la IA y su protección (sesión + límites de la decisión 1) quedan publicados y listos: encenderla solo requiere agregar la clave. Al probar yo el link publicado sin clave encontré dos errores que el IS no había señalado. Primero: Lupita respondía «no me pude conectar» y además gastaba una pregunta del límite diario. Lo cambié para que `/api/chat` diga `sin_ia` antes de revisar la sesión y Lupita responda «Esa palabra todavía no la conozco», así se ve como una decisión y no como una falla. Segundo: aunque quité la clave de Vercel, el link seguía actuando como si la IA estuviera encendida; en lugar de depender de que la clave exista o no, agregué un interruptor explícito: la IA solo se enciende con `LUPITA_IA=activa` **y** la clave. Encender algo que cuesta dinero tiene que ser una decisión a propósito, no el efecto de una clave olvidada.
- **Por qué:** es un proyecto escolar sin presupuesto, y ninguna función principal depende de la IA (ruta, medicinas, citas, expediente, avisos, chat, Cerca de mí y el espacio del personal funcionan sin ella). Con la clave, el gasto máximo sería de ~US$440 al mes; sin ella es US$0 y no hay forma de que alguien me genere un cobro. Prefiero una Lupita más limitada pero gratuita y segura que depender de una tarjeta. Como muestra el diagnóstico, esta decisión también cambia el cuello de botella: deja de ser el costo de la IA y pasa a ser Supabase.

## Cuentas de prueba (modo demo, sin Supabase)

| Rol | ID | Código |
|---|---|---|
| Paciente internada (niña) | WW-2048-17 | 123456 |
| Paciente con citas (adulto) | WW-3301-09 | 123456 |
| Niño en casa tras una quemadura (etapa: rehabilitación) | WW-5120-03 | 123456 |
| Adulta mayor en casa tras cirugía de cadera (etapa calculada: primeras semanas) | WW-7702-44 | 123456 |
| Personal del hospital (recepción) | REC-0042 / REC-0107 | apoyo26 |

En modo demo los mensajes se guardan solo en ese navegador (abre dos pestañas para ver paciente y personal conversando). Si el ID existe en Supabase, se usa Supabase.

## Autoevaluación

El LO en el que más crecí es #Accountability: pasé de aceptar lo que el IS me entregaba a hacerme responsable de cada decisión, admitir mis errores y comprobarlos con números de mi propio proyecto.
En el Assignment 1 (la landing page), el IS me advirtió que las cuentas estaban escritas en `script.js` y que cualquiera podía leerlas; yo no lo había notado.
En la Sesión 22 diagnostiqué mal el cuello de botella: dije que era el costo de Claude (tope de $500 al mes con unos 4,545 usuarios), sin ver que `/api/chat` estaba abierta a cualquiera y que un script podía gastar esos $500 en unas 4.3 horas.
No borré ese error: lo dejé en el README junto a la versión corregida y lo convertí en una decisión: sesión real de Supabase (`api/_acceso.js`) y límites de 20 preguntas por persona al día, 5 por minuto y 450 en toda la app.
Además, encontré yo, sin que el IS los señalara, dos errores en el link publicado: Lupita decía «no me pude conectar» y gastaba una pregunta, y la IA seguía encendida después de quitar la clave; por eso agregué el interruptor `LUPITA_IA=activa` (decisión 5).
También llevé la transparencia a la interfaz, donde no se suele pensar en ella: la app avisa que los datos de OpenStreetMap pueden estar incompletos, marca las direcciones «(aprox.)», nunca supone datos de accesibilidad y Lupita dice «todavía no la conozco» en lugar de inventar.
En otras etapas rechacé Google Places por la facturación y la clave pública en el navegador, y pedí un diseño que no fuera «totalmente infantil» porque es la app de un hospital.
#AlgorithmicStrategies: dividí cada pregunta a Lupita en pasos ordenados que ejecuta la máquina, primero los que no cuestan (¿la IA está encendida?, ¿hay sesión?, ¿quedan preguntas?) y al final la llamada a Claude; si un paso no se puede comprobar, se detiene (falla cerrada).
El orden exacto también cubre un caso límite: `consumir_pregunta_lupita` bloquea la fila (`for update`) para que dos preguntas al mismo tiempo no se salten el límite.
Cerca de mí sigue la misma lógica: texto → categoría → etiquetas de OpenStreetMap → Overpass → distancia (fórmula de Haversine) → ordenar → Nominatim, una por segundo, solo para las direcciones que faltan.
#ComputationalTools: usé la terminología en contextos cuantitativos distintos: costo por millón de tokens (peor caso $0.0326 × 450 × 30 ≈ $440 al mes), límites de uso por persona y globales, radios en km, y conexiones simultáneas de Supabase Realtime como el cuello de botella sin IA.
#Organization: el README va de lo general a lo técnico (cómo probar, despliegue, diagnóstico, decisiones) y cada decisión sigue el mismo formato: etapa, propuesta del IS, mi decisión y por qué.
La evidencia está en «Decisiones de diseño vs. sugerencias del IS», en `supabase/schema.sql`, `api/_acceso.js`, `api/chat.js` y `js/servicios.js`.
Lo que me llevo: usar IA no me quita la responsabilidad; acepté sus propuestas cuando mis números las respaldaban y las cambié o rechacé cuando chocaban con el costo, la seguridad o el público.
Todavía me falta medir el uso real (supuse 10 preguntas por persona al mes), y lo dejo documentado como pendiente.

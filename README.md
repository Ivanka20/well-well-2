# well well

Tu proceso médico, a la vista. Sitio web con dos espacios:

- **Pacientes y familiares** (niñas y niños, adultos y personas mayores): ruta, medicinas, citas, expediente, avisos, chat entre pacientes (salas «Pacientes y familias» y «Peques»), Lupita y **Cerca de mí**.
- **Personal del hospital**: recepción, avisos y expedientes.

El chat entre pacientes bloquea teléfonos, correos, enlaces y groserías, y el personal puede borrar mensajes.

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
3. En **Settings → Environment Variables** agrega `ANTHROPIC_API_KEY` con tu clave de https://console.anthropic.com. Vuelve a desplegar.

| Variable | ¿Obligatoria? | Para qué |
|---|---|---|
| `ANTHROPIC_API_KEY` | Sí, para que Lupita use la IA | Clave de Claude |
| `SUPABASE_URL` | No | URL de tu proyecto de Supabase (si no está, `api/_acceso.js` usa la que viene en el código) |
| `SUPABASE_PUBLISHABLE_KEY` | No | Clave publicable de Supabase (lo mismo) |

**Modelo de IA:** `api/chat.js` usa `claude-opus-5-5` con esfuerzo bajo (`effort: "low"`), máximo 1024 tokens por respuesta y respaldo automático de modelo si está saturado. Para cambiar el modelo o el costo, edita esa llamada.

## Probar en tu computadora

Cualquier servidor estático sirve para ver el sitio (Lupita usará el diccionario local):

```
npx serve .
```

Para probar también `/api/chat` con la IA, usa la CLI de Vercel con `ANTHROPIC_API_KEY` en un archivo `.env.local` (ya está en `.gitignore`):

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

**Al publicar, ejecuta primero `supabase/schema.sql` y después despliega en Vercel.** Si la función de límites no existe, Lupita no llama a la IA y usa el diccionario.

## Cuentas de prueba (modo demo, sin Supabase)

| Rol | ID | Código |
|---|---|---|
| Paciente internada (niña) | WW-2048-17 | 123456 |
| Paciente con citas (adulto) | WW-3301-09 | 123456 |
| Niño en casa tras una quemadura (etapa: rehabilitación) | WW-5120-03 | 123456 |
| Adulta mayor en casa tras cirugía de cadera (etapa calculada: primeras semanas) | WW-7702-44 | 123456 |
| Personal del hospital (recepción) | REC-0042 / REC-0107 | apoyo26 |

En modo demo los mensajes se guardan solo en ese navegador (abre dos pestañas para ver paciente y personal conversando). Si el ID existe en Supabase, se usa Supabase.

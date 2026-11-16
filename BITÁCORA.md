**BITÁCORA DE PROMPTS**

**Paso 1. Especificación de función**
- **¿Qué hace?:** Es una nueva funcionalidad de Well Well diseñada para ayudar a los pacientes y sus familiares a encontrar servicios médicos y de rehabilitación después del alta hospitalaria verificados por especialistas del hospital y recomendados según sea el caso. Mediante la integración con OpenStreetMap y Overpass API, permite buscar hospitales, clínicas, centros de fisioterapia y farmacias según la ubicación del usuario, la categoría del servicio y la distancia deseada. La aplicación obtiene información de establecimientos reales, calcula su proximidad y presenta los resultados en un mapa interactivo y una lista organizada con datos de contacto y opciones para llegar al lugar. Su objetivo es facilitar la continuidad de la recuperación y reducir las dificultades que enfrentan las familias al buscar servicios de apoyo fuera del hospital.
- **Qué datos/inputs necesita:**
   1. Ubicación del usuario que puede obtenerse mediante GPS, con autorización, o introducirse manualmente mediante una dirección o ciudad.
   2. Categoría del establecimiento: el usuario selecciona qué tipo de servicio necesita encontrar (laboratorios, farmacias donde se encuentre el medicamento que necesita, centros de rehabilitación y fisioterapia, etc.)
   3. Radio de búsqueda para establecer la distancia máxima a la que desea encontrar establecimientos (km).
   4. Filtros adicionales: características específicas como accesibilidad para sillas de ruedas, estacionamiento accesible o elevadores, siempre que estos datos estén disponibles en OpenStreetMap.
   5. Datos obtenidos automáticamente mediante la API: nombre del establecimiento, coordenadas geográficas, dirección, categoría, teléfono, sitio web y características de accesibilidad, cuando estén registrados.
- **Cómo se sabrá que funciona:** Se comprobará que funciona mediante pruebas de búsqueda con diferentes ubicaciones, categorías y radios de distancia. Se considerará exitosa cuando la aplicación pueda conectarse correctamente a Overpass API, obtener establecimientos reales de OpenStreetMap y mostrar los resultados correspondientes a los filtros seleccionados. También se verificará que las distancias calculadas sean correctas, que los establecimientos aparezcan en el mapa en sus ubicaciones correspondientes y que la información disponible (nombre, dirección y datos de contacto) coincida con los registros obtenidos de la API.

- **Auditoría con compañero:**
  
     -**Auditor:** Alexhia
  
     - **Observaciones:** La propuesta para la  nueva función complementa el propósito de la app. Será una herramienta que tal vez no se use al momento, pero a largo plazo vale totalmente la pena. Las acciones que se pueden agregar para mejorarla son que, una vez seleccionado el lugar al que desean ir, se pregunte por qué medio de transporte desean llegar al destino y se proponga la mejor ruta.
       
     - **Revisión de los tres campos de especificación:**
       
       1. **Qué hace:** A partir de las observaciones generales, confirmé que la funcionalidad complementa el propósito de Well Well al facilitar la búsqueda de servicios necesarios después del alta hospitalaria.
       2. **Qué datos/inputs necesita:** Su propuesta me hizo identificar que podía incorporar el medio de transporte como un dato adicional para ofrecer opciones de ruta.
       3. **Cómo se sabrá que funciona:** Consideré que no bastaba con mostrar establecimientos cercanos; también era importante comprobar que el usuario pudiera consultar cómo llegar al lugar seleccionado.

Después de la auditoría, implementé los consejos de mi auditor y los agregué a la idea que ya estaba desarrollando. 

**Paso 2. Registro de prueba**

**Prompt:**

"Retomando el código de mi app, well well, que ya tenemos hasta ahora, vamos a agregarle otra función diferente: observar el expediente médico, exportar el expediente médico, ingresar a la sección y demás funciones que desarrollamos hasta ahora. La nueva función será una herramienta que realmente ayude a los pacientes y sus familiares a resolver las necesidades que surgen después de salir del hospital.
El problema que resuelve esta nueva función es:
Imagina que un niño sale del hospital después de recibir tratamiento por una quemadura. Su familia tiene que organizar su recuperación, pero ahora se enfrenta a nuevas preguntas:
* ¿Dónde puede continuar sus sesiones de rehabilitación?
* ¿Qué clínicas ofrecen atención especializada?
* ¿Dónde puede encontrar una farmacia cercana?
* ¿Dónde puede acudir si necesita una revisión médica?
* ¿Qué servicios están cerca de su domicilio?

Actualmente, el familiar tendría que buscar cada servicio por separado en Google Maps, páginas web o directorios diferentes.
Well Well podría centralizar esa búsqueda en un solo lugar.

La función sería  útil para pacientes pediátricos, personas con movilidad limitada y familiares que están organizando los cuidados posteriores al alta, incluso para pacientes de la tercera edad (un gran paréntesis es que la app ya no solo estará dividida para personal del hospital y para pacientes pediátricos y familiares; ahora estará dividida para personal del hospital y pacientes y familiares, así que por favor haz esa modificación).

La nueva herramientas ayudará en estos aspectos:

A. Categorías de servicios
El usuario puede seleccionar qué tipo de apoyo necesita: hospitales y centros médicos, clínicas de rehabilitación, fisioterapia, farmacias, laboratorios médicos, centros de atención especializada.

B. Búsqueda por ubicación
El usuario puede: compartir su ubicación actual, introducir manualmente su dirección o ciudad y elegir un radio de búsqueda de 1, 5, 10 o 20 kilómetros (el sistema consulta establecimientos reales y calcula cuáles están más cerca).

C. Fichas de establecimientos
Cada resultado podría mostrar:
* Nombre del establecimiento.
* Tipo de servicio.
* Dirección.
* Distancia aproximada.
* Teléfono y página web, si están disponibles.
* Botón para consultar cómo llegar.

D. Mis lugares guardados
Los familiares pueden guardar establecimientos favoritos para encontrarlos rápidamente después.

E. Integración con Lupi (y otra cosa que necesito que cambies es el nombre del chatbot, en lugar de Lupi quiero que sea Lupita)
El chatbot podría ayudar a orientar las búsquedas. Ejemplo: "Necesito encontrar un lugar donde mi hijo pueda recibir fisioterapia".
Lupi identifica la categoría y permite iniciar una búsqueda de centros de fisioterapia cercanos.
Para que funcione, necesito que uses datos de OpenStreetMap, Overpass API y Leaflet.

También necesito que le agregues un filtro de búsqueda:
Permitir que el familiar busque establecimientos que tengan características como:
* Entrada accesible para silla de ruedas.
* Estacionamiento accesible.
* Elevadores.
* Baños adaptados.
Esto es especialmente relevante para pacientes con movilidad limitada. Importante: solo mostrarías estas características cuando estén registradas en los datos e incluir recomendaciones según la etapa de recuperación: La app podría utilizar información no sensible del proceso de recuperación para sugerir categorías de búsqueda.
Dame el código necesario para hacer esto posible y que yo pueda agregarlo a mi carpeta de github."

**Lo que la IA propuso que no coincidía con tu especificación:** La IA me dio una propuesta que no completaba mis instrucciones, solo las cumplía a medias, así que mandé este prompt: "Cuando el usuario ingresa su búsqueda, aparece un mensaje de que ya encontró x cantidad de lugares, pero no especifica los nombres de los lugares. Arregla eso. También vuelve a mostrar el mapa señalando los lugares encontrados y señalando una ruta para llegar al lugar de destino a partir del lugar que puso el usuario como referencia".

**Mi decisión:** REVISIÓN. La propuesta inicial de la IA no cumplía completamente con mis criterios de funcionamiento. Aunque mostraba la cantidad de establecimientos encontrados, no presentaba sus nombres ni la información específica de cada uno. Además, había eliminado la representación visual de los establecimientos en el mapa y la ruta hacia el destino seleccionado. Esto contradecía mi especificación, en la que establecí que los resultados debían mostrarse en un mapa interactivo y en una lista organizada con información de los establecimientos y opciones para llegar a ellos. Por eso, decidí solicitar una revisión en lugar de aceptar la primera propuesta.

**Paso 3. Validar que funciona de verdad**
**Qué especifiqué que debía hacer:** Cuando un paciente escribe su ID y su código de acceso, la app los valida contra Supabase. Si son correctos y el ID tiene datos asignados, entra a su espacio y ve sus datos. Si el código es incorrecto, muestra "ID o código de acceso incorrectos".

**CASO DE PRUEBA A**

   **Input exacto:** pestaña «Paciente o familiar», ID de paciente WW-2048-17, código de acceso 123456, botón «Entrar →».
   
   **Estado previo:** usuario ww-2048-17@paciente.wellwell.app creado en Supabase Authentication, sin filas en perfiles ni pacientes.
      
   **Output real:** ! Tu ID existe pero aún no tiene datos asignados:
   
   <img width="400" height="380" alt="image" src="https://github.com/user-attachments/assets/17b5d1b3-d7ac-46fa-bb66-c8bb98387ccb" />


  

**CASO PRUEBA B**

   **Input exacto:** pestaña «Paciente o familiar», ID de paciente WW-2048-17, código de acceso 123456, botón «Entrar →».
   
   **Estado previo:** SQL ejecutado en Supabase para crear su perfil y su registro de paciente. Comprobación:
   
      create or replace function public.mi_paciente_id() returns uuid
      language sql stable security definer set search_path = public as $$
      select id from public.pacientes where perfil_id = auth.uid()
      $$;

   **Output real:** No da ningún mensaje, solo dirige a su sesión e información dentro de la app.

**Mi decisión:** ACEPTAR. La IA me dió exactamente el código para copiar en SQL Editor el Supabase para crear el usuario de prueba con su contraseña y luego al no contar con información sobre ese usuario, Claude Code me dio el código necesario para copiarlo en SQL Editor y establecer la información de nuestro usuario de prueba: <img width="800" height="402" alt="image" src="https://github.com/user-attachments/assets/ca035344-fd8c-4f71-93fa-bef008eae98c" />

**CASO PRUEBA C**

   **Input exacto:** 
      - **Categoría:** Centros de fisioterapia.
      - **Ubicación de referencia:** Estadio Banorte
      - **Radio de búsqueda:** 5 km
      - **Filtro de accesibilidad:** Entrada accesible para silla de ruedas.
   
   **Output real:** No sugirió ningún lugar, solo dejo que el usuario ingresara su información de búsqueda, pero en el mapa no marcó ningún lugar.

**Mi decisión:** RECHAZAR. La IA no sugirió ningún centro de fisioterapia dentro del radio de 5 km ni marcó ningún lugar en el mapa.
Asimismo, el sistema omitió procesar los parámetros clave del input, como la ubicación de referencia en el Estadio Banorte y el filtro de accesibilidad para silla de ruedas.En consecuencia, rechazar el resultado es un juicio correcto, ya que el modelo no entregó la información útil ni cumplió con los requerimientos de la búsqueda.

La prueba C no cumplió con los criterios de funcionamiento de la especificación. Al ingresar una categoría, ubicación, radio de búsqueda y filtro de accesibilidad, la app no mostró ningún establecimiento ni marcador en el mapa.

**Problema detectado:** Al ingresar una categoría, ubicación de referencia, radio de búsqueda y filtro de accesibilidad, la aplicación no mostraba establecimientos ni marcadores en el mapa.

**Prompt ingresado:** "Analiza la implementación actual y determina por qué no se están procesando correctamente los parámetros de búsqueda o por qué no se están mostrando los resultados de Overpass API. Quiero que me expliques qué parte de la implementación está fallando. No quiero que simplemente ocultes el error ni que muestres resultados ficticios.

Después, propón una corrección que permita procesar la ubicación de referencia, consultar establecimientos reales, aplicar correctamente el radio de búsqueda, aplicar el filtro de accesibilidad cuando existan datos registrados, mostrar los establecimientos encontrados en una lista y en el mapa y respetar los criterios de mi especificación original y explícame qué archivos y funciones necesitas modificar."

**Respuesta de la IA:**

Claude Code realizó cambios para solucionar ambos problemas:
- Modificó el comportamiento del filtro de accesibilidad. Cuando ningún establecimiento tiene registrada la característica seleccionada, la aplicación informa al usuario y muestra todos los establecimientos encontrados, aclarando que no hay información disponible sobre esa característica.
- Configuró los filtros para que comiencen desactivados en cada nueva búsqueda.
- Recuperó la visualización del mapa mediante Leaflet y OpenStreetMap.
- Incorporó marcadores numerados que corresponden a los establecimientos de la lista.
- Agregó la representación del punto de partida y del radio de búsqueda.
- Incorporó rutas hacia los establecimientos seleccionados, con opciones para caminar o conducir, distancia, tiempo aproximado e indicaciones paso a paso.

**Pruebas realizadas por la IA:**

Claude Code probó búsquedas reales en Coyoacán. En una de ellas, consultó laboratorios dentro de un radio de 20 km con el filtro de elevador activado. Reportó que encontró 38 establecimientos antes de aplicar el filtro y que, después de la corrección, pudo mostrar los nombres y direcciones de los resultados, así como 20 marcadores en el mapa.También comprobó la generación de rutas a pie y en automóvil, incluyendo la línea de recorrido, el tiempo estimado, la distancia y las indicaciones.

**Decisión:** REVISAR. Todavía necesito comprobar personalmente que la búsqueda funciona con los parámetros del Caso de Prueba C, especialmente con la ubicación del Estadio Banorte, el radio de 5 km y el filtro de entrada accesible para silla de ruedas. Las pruebas realizadas por la IA utilizaron otra categoría, ubicación, radio y característica de accesibilidad, por lo que no son suficientes para dar por validado el caso original.

**Historial de commits**

Entre los commits realizados destacan:

**1. Add SQL function to get patient ID:** 

   - **Archivo modificado:** js/store.js.
   
  - **Cambio realizado:** Documenté la función SQL mi_paciente_id() utilizada para recuperar el identificador del paciente asociado al perfil autenticado en Supabase.
    
  - **Decisión de desarrollo:** Actualizar la configuración de conexión para que la aplicación utilizara el proyecto de Supabase correspondiente a esta versión.

Este cambio permitió trabajar con la identificación y recuperación de la información del paciente durante el proceso de inicio de sesión.

**2. Update store.js:**
  - **Archivo modificado:** js/store.js.
   
  - **Cambio realizado:** Actualicé la URL del proyecto de Supabase y su clave pública (SUPABASE_KEY), utilizadas para inicializar la conexión entre Well Well y la base de datos.
    
  - **Decisión de desarrollo:** Incorporar la lógica necesaria para relacionar al usuario autenticado con su registro de paciente y permitir que Well Well recupere su información correspondiente.

**3. Add test case B details to BITÁCORA.md:** Documenté los detalles de la segunda prueba realizada para validar el funcionamiento del acceso de pacientes.

**4. Update output images and decision descriptions in BITÁCORA.md:** Actualicé la evidencia visual y las explicaciones de las decisiones tomadas durante el proceso de construcción.

**Evidencia: Historial de commits del repositorio:** https://github.com/Ivanka20/well-well-2/commits/main/


**Documentación del chatbot "Lupita"**

Las instrucciones del modelo de IA de Lupita están guardadas en el repositorio en prompts/lupita-system-prompt.md. La función api/chat.js las lee de ese archivo en cada llamada, así que el archivo es la versión que usa el modelo.

**Uso de IA**

Para todo mi proyecto usé Claude. Para crear el código me apoyé en Claude Code: le di todas las instrucciones lo más específicas posible y lo fui guiando para que codificara como tenía en mente mi app. Para el diseño utilicé Claude Design: diseñé las animaciones del chatbot y la presentación visual de la app. Para la creación de la idea y propósito de la app no utilicé para nada IA.

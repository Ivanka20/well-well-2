Autoevaluación

El LO en el que más crecí es #Accountability: pasé de aceptar lo que el IS me entregaba a hacerme responsable de cada decisión, admitir mis errores y comprobarlos con números de mi propio proyecto. En las primeras sesiones aceptaba casi todo lo que recibía de la IA y después me ocasionó más dudas sobre el deploy de mi proyecto.
En el Assignment 1 (la landing page), el IS me advirtió que las cuentas estaban escritas en script.js y que cualquiera podía leerlas; yo no lo había notado.
En la Sesión 22 diagnostiqué mal el cuello de botella: dije que era el costo de Claude (tope de $500 al mes con unos 4,545 usuarios), sin ver que /api/chat estaba abierta a cualquiera y que un script podía gastar esos $500 en unas 4.3 horas. No borré ese error: lo dejé en el README junto a la versión corregida y lo convertí en una decisión: sesión real de Supabase (api/_acceso.js) y límites de 20 preguntas por persona al día, 5 por minuto y 450 en toda la app.
Además, encontré, sin que el IS los señalara, dos errores en el link publicado: Lupita decía "no me pude conectar" y gastaba una pregunta, y la IA seguía encendida después de quitar la clave; por eso agregué el interruptor LUPITA_IA=activa.
También la app avisa que los datos de OpenStreetMap pueden estar incompletos, marca las direcciones (aprox.), nunca supone datos de accesibilidad y Lupita dice "todavía no la conozco" en lugar de inventar.
En otras etapas rechacé Google Places por la facturación y la clave pública en el navegador, y pedí un diseño que no fuera «totalmente infantil» porque es la app de un hospital.

Sobre #AlgorithmicStrategies, dividí cada pregunta a Lupita en pasos ordenados que ejecuta la máquina, primero los que no cuestan, como ¿la IA está encendida?, ¿hay sesión?, ¿quedan preguntas?, y al final la llamada a Claude, y si un paso no se puede comprobar, se detiene.
"Cerca de mí" sigue la misma lógica: texto, categoría, etiquetas de OpenStreetMap, Overpass, distancia (fórmula de Haversine), ordenar, Nominatim.
En #ComputationalTools medí cada parte del proyecto con la unidad que le corresponde: tokens y dólares para la IA ($0.0326 por pregunta en el peor caso × 450 diarios × 30 días = $440 al mes), preguntas por minuto y por día para los límites, kilómetros para "Cerca de mí" y conexiones simultáneas para Supabase Realtime.

En #Organization, el README va de lo general a lo técnico y cada decisión sigue el mismo formato: etapa, propuesta del IS, mi decisión y justificación.
La evidencia está en "Decisiones de diseño vs. sugerencias del IS", en supabase/schema.sql, api/_acceso.js, api/chat.js y js/servicios.js.

En general, para todos los assignments entendí que usar IA aumenta la responsabilidad que adquiero sobre un proyecto y su implementación. Acepté sus propuestas cuando mis números las respaldaban y las cambié o rechacé cuando chocaban con el costo, la seguridad o el público.

**USO DE IA**
Para todo mi proyecto usé Claude. Para crear el código me apoyé en Claude Code: le di todas las instrucciones lo más específicas posible y lo fui guiando para que codificara como tenía en mente mi app. La redacción de mi autoevaluación y README la hice yo, pero Claude me ayudó a darle formato, especialmente en el README, y a completar mis ideas con descripciones más completas y a incluir aspectos de mi desarrollo que no contemplé al inicio. También me ayudo a resumir mi historial de commits.



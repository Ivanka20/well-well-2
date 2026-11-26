Autoevaluación — well well

El LO en el que más crecí es #Accountability: pasé de aceptar lo que el IS me entregaba a hacerme responsable de cada decisión, admitir mis errores y comprobarlos con números de mi propio proyecto.
En el Assignment 1 (la landing page), el IS me advirtió que las cuentas estaban escritas en script.js y que cualquiera podía leerlas; yo no lo había notado.
En la Sesión 22 diagnostiqué mal el cuello de botella: dije que era el costo de Claude (tope de $500 al mes con unos 4,545 usuarios), sin ver que /api/chat estaba abierta a cualquiera y que un script podía gastar esos $500 en unas 4.3 horas.
No borré ese error: lo dejé en el README junto a la versión corregida y lo convertí en una decisión: sesión real de Supabase (api/_acceso.js) y límites de 20 preguntas por persona al día, 5 por minuto y 450 en toda la app.
Además, encontré yo, sin que el IS los señalara, dos errores en el link publicado: Lupita decía «no me pude conectar» y gastaba una pregunta, y la IA seguía encendida después de quitar la clave; por eso agregué el interruptor LUPITA_IA=activa (decisión 5).
También llevé la transparencia a la interfaz, donde no se suele pensar en ella: la app avisa que los datos de OpenStreetMap pueden estar incompletos, marca las direcciones «(aprox.)», nunca supone datos de accesibilidad y Lupita dice «todavía no la conozco» en lugar de inventar.
En otras etapas rechacé Google Places por la facturación y la clave pública en el navegador, y pedí un diseño que no fuera «totalmente infantil» porque es la app de un hospital.
#AlgorithmicStrategies: dividí cada pregunta a Lupita en pasos ordenados que ejecuta la máquina, primero los que no cuestan (¿la IA está encendida?, ¿hay sesión?, ¿quedan preguntas?) y al final la llamada a Claude; si un paso no se puede comprobar, se detiene (falla cerrada).
El orden exacto también cubre un caso límite: consumir_pregunta_lupita bloquea la fila (for update) para que dos preguntas al mismo tiempo no se salten el límite.
Cerca de mí sigue la misma lógica: texto → categoría → etiquetas de OpenStreetMap → Overpass → distancia (fórmula de Haversine) → ordenar → Nominatim, una por segundo, solo para las direcciones que faltan.
#ComputationalTools: usé la terminología en contextos cuantitativos distintos: costo por millón de tokens (peor caso $0.0326 × 450 × 30 ≈ $440 al mes), límites de uso por persona y globales, radios en km, y conexiones simultáneas de Supabase Realtime como el cuello de botella sin IA.
#Organization: el README va de lo general a lo técnico (cómo probar, despliegue, diagnóstico, decisiones) y cada decisión sigue el mismo formato: etapa, propuesta del IS, mi decisión y por qué.
La evidencia está en «Decisiones de diseño vs. sugerencias del IS», en supabase/schema.sql, api/_acceso.js, api/chat.js y js/servicios.js.
Lo que me llevo: usar IA no me quita la responsabilidad; acepté sus propuestas cuando mis números las respaldaban y las cambié o rechacé cuando chocaban con el costo, la seguridad o el público.
Todavía me falta medir el uso real (supuse 10 preguntas por persona al mes), y lo dejo documentado como pendiente.

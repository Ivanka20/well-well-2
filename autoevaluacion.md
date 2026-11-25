Autoevaluación — well well

El LO en el que más crecí es Accountability: pasé de aceptar lo que el sistema inteligente me entregaba a hacerme responsable de cada decisión y de comprobarla con números de mi propio proyecto.
Al inicio del curso, en la landing page, el IS me advirtió que las cuentas estaban escritas en script.js y que cualquiera podía leerlas; yo no lo había notado.
En la Sesión 22 mi diagnóstico decía que el cuello de botella era el costo de Claude, con un tope de $500 al mes que llegaría con unos 4,545 usuarios.
Al revisar ese diagnóstico, el IS me hizo notar algo más grave: /api/chat aceptaba preguntas de cualquiera, sin sesión ni límite, y un script podía gastar $500 en unas 4.3 horas y dejar sin Lupita a todas las familias.
Decidí no quedarme con el diagnóstico en papel: Lupita ahora exige sesión real de Supabase (api/_acceso.js) y la función consumir_pregunta_lupita limita 20 preguntas por persona al día, 5 por minuto y 450 en toda la app.
Después volví a revisar mis propios números contra el código: con ese tope global, el gasto máximo es de unos $440 al mes, así que el costo ya no es lo primero que se rompe.
El cuello de botella real es el límite que yo puse, que se alcanza con unos 1,350 usuarios al mes, y lo corregí en el README en lugar de dejar el número viejo.
Lo mismo hice en otras etapas: rechacé Google Places para «Cerca de mí» porque necesitaba facturación y una clave pública en el navegador, y elegí OpenStreetMap aunque sus datos sean incompletos.
También revisé el diseño: pedí que no fuera «totalmente infantil» porque es la app de un hospital que también usan adultos mayores y personal médico.
La evidencia está en la sección «Decisiones de diseño vs. sugerencias del IS» del README, en supabase/schema.sql y en api/_acceso.js.
Lo que me llevo es que usar IA no me quita la responsabilidad: si Lupita gasta de más o expone un expediente, la decisión fue mía, no del modelo.
Todavía me falta medir el uso real (supuse 10 preguntas por persona al mes), y eso también lo dejo documentado como pendiente.

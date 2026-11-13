/* =========================================================
   Datos de demostración (se usan solo si la cuenta no existe
   en Supabase). Las fechas se calculan a partir de hoy.
   ========================================================= */
(function () {
  function at(days, hh, mm) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    d.setHours(hh, mm || 0, 0, 0);
    return d.toISOString();
  }
  function day(days) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().slice(0, 10);
  }

  // Personal de apoyo (recepción): no son médicos, ayudan a pacientes y familias
  const personal = {
    "REC-0042": { id: "p-42", codigo: "REC-0042", nombre: "Mariana López", puesto: "Recepción", area: "Piso 3 · Pediatría", extension: "3000", horario: "Turno matutino" },
    "REC-0107": { id: "p-107", codigo: "REC-0107", nombre: "Jorge Ruiz", puesto: "Recepción", area: "Consulta externa", extension: "2000", horario: "Turno vespertino" },
  };
  const pacientes = {
    "WW-2048-17": {
      id: "pac-2048",
      codigo: "WW-2048-17",
      nombre: "Sofía Ramírez",
      apodo: "Sofi",
      fecha_nacimiento: "2017-04-12",
      tipo: "internado",
      hospital: "Hospital Infantil del Valle",
      area: "Pediatría",
      cuarto: "304-B",
      tipo_sangre: "O+",
      alergias: ["Penicilina"],
      diagnosticos: ["Apendicitis aguda (operada)"],
      contacto_emergencia: "Laura Ramírez (mamá) · 55 1234 5678",
      equipo: [],
      procedimientos: [
        { id: "pr1", titulo: "Llegada a urgencias", descripcion: "Te revisaron la pancita y te tomaron signos vitales.", fecha: at(-3, 21, 10), estado: "hecho", lugar: "Urgencias", responsable: "Equipo de urgencias" },
        { id: "pr2", titulo: "Ultrasonido de abdomen", descripcion: "Una cámara especial vio tu apéndice sin dolor.", fecha: at(-3, 22, 30), estado: "hecho", lugar: "Imagen", responsable: "Dr. Ortiz" },
        { id: "pr3", titulo: "Cirugía: apendicectomía", descripcion: "Te quitaron el apéndice inflamado mientras dormías.", fecha: at(-2, 8, 0), estado: "hecho", lugar: "Quirófano 2", responsable: "Dra. Elena Torres" },
        { id: "pr4", titulo: "Revisión de la herida", descripcion: "Vemos que tu herida esté limpia y cerrando bien.", fecha: at(0, 11, 0), estado: "hoy", lugar: "Cuarto 304-B", responsable: "Enf. Raúl Méndez" },
        { id: "pr5", titulo: "Análisis de sangre", descripcion: "Un piquete rapidito para ver que no haya infección.", fecha: at(1, 7, 30), estado: "pendiente", lugar: "Cuarto 304-B", responsable: "Laboratorio" },
        { id: "pr6", titulo: "Alta a casa", descripcion: "Si todo va bien, ¡te vas a casa!", fecha: at(2, 12, 0), estado: "pendiente", lugar: "Piso 3", responsable: "Dra. Elena Torres" },
      ],
      medicamentos: [
        { id: "m1", nombre: "Paracetamol", dosis: "250 mg", via: "Por la boca", para_que: "Quitar el dolor y bajar la fiebre", horarios: ["08:00", "14:00", "20:00"], desde: day(-2), hasta: day(3), indicaciones: "Después de comer" },
        { id: "m2", nombre: "Ceftriaxona", dosis: "1 g", via: "Por el suero", para_que: "Ayudar a que no haya infección", horarios: ["09:00", "21:00"], desde: day(-2), hasta: day(1), indicaciones: "La pone tu enfermero" },
        { id: "m3", nombre: "Ondansetrón", dosis: "4 mg", via: "Por la boca", para_que: "Si sientes ganas de vomitar", horarios: ["Solo si lo necesitas"], desde: day(-2), hasta: day(2), indicaciones: "Pídelo a tu enfermero" },
      ],
      citas: [
        { id: "c1", titulo: "Revisión de herida", tipo: "consulta", inicio: at(0, 11, 0), fin: at(0, 11, 30), lugar: "Cuarto 304-B", con_quien: "Enf. Raúl Méndez", indicaciones: "" },
        { id: "c2", titulo: "Análisis de sangre", tipo: "estudio", inicio: at(1, 7, 30), fin: at(1, 7, 45), lugar: "Cuarto 304-B", con_quien: "Laboratorio", indicaciones: "Sin desayunar" },
        { id: "c3", titulo: "Consulta de seguimiento", tipo: "consulta", inicio: at(10, 10, 0), fin: at(10, 10, 30), lugar: "Consulta externa · Consultorio 12", con_quien: "Dra. Elena Torres", indicaciones: "Traer tu carnet" },
      ],
      documentos: [
        { id: "d1", titulo: "Hoja de ingreso", tipo: "Ingreso", fecha: day(-3), resumen: "Dolor abdominal de 12 horas, fiebre de 38.4 °C." },
        { id: "d2", titulo: "Ultrasonido abdominal", tipo: "Estudio", fecha: day(-3), resumen: "Apéndice inflamado, sin perforación." },
        { id: "d3", titulo: "Nota quirúrgica", tipo: "Cirugía", fecha: day(-2), resumen: "Apendicectomía laparoscópica sin complicaciones." },
        { id: "d4", titulo: "Biometría hemática", tipo: "Laboratorio", fecha: day(-1), resumen: "Glóbulos blancos bajando, buena evolución." },
      ],
    },
    "WW-3301-09": {
      id: "pac-3301",
      codigo: "WW-3301-09",
      nombre: "Mateo Herrera",
      apodo: "Mateo",
      fecha_nacimiento: "1990-09-30",
      tipo: "ambulatorio",
      hospital: "Hospital General del Valle",
      area: "Cardiología",
      cuarto: "",
      tipo_sangre: "A+",
      alergias: [],
      diagnosticos: ["Hipertensión arterial"],
      contacto_emergencia: "Ana Herrera · 55 8765 4321",
      equipo: [],
      procedimientos: [
        { id: "q1", titulo: "Primera consulta", descripcion: "Revisión general y toma de presión.", fecha: at(-30, 9, 0), estado: "hecho", lugar: "Consultorio 4", responsable: "Dr. Andrés Salgado" },
        { id: "q2", titulo: "Electrocardiograma", descripcion: "Unos parches leyeron el ritmo de tu corazón.", fecha: at(-28, 10, 0), estado: "hecho", lugar: "Cardiología", responsable: "Técnico de cardiología" },
        { id: "q3", titulo: "Holter de 24 horas", descripcion: "Un aparatito mide tu presión durante un día completo.", fecha: at(4, 9, 0), estado: "pendiente", lugar: "Cardiología · Torre B", responsable: "Dr. Andrés Salgado" },
      ],
      medicamentos: [
        { id: "n1", nombre: "Losartán", dosis: "50 mg", via: "Por la boca", para_que: "Mantener la presión en orden", horarios: ["08:00"], desde: day(-28), hasta: day(60), indicaciones: "Todos los días a la misma hora" },
      ],
      citas: [
        { id: "k1", titulo: "Colocación de Holter", tipo: "estudio", inicio: at(4, 9, 0), fin: at(4, 9, 30), lugar: "Cardiología · Torre B", con_quien: "Dr. Andrés Salgado", indicaciones: "Ropa cómoda, baño antes" },
        { id: "k2", titulo: "Consulta de resultados", tipo: "consulta", inicio: at(12, 12, 0), fin: at(12, 12, 30), lugar: "Consultorio 4", con_quien: "Dr. Andrés Salgado", indicaciones: "" },
      ],
      documentos: [
        { id: "e1", titulo: "Historia clínica", tipo: "Consulta", fecha: day(-30), resumen: "Presión 150/95. Se inicia tratamiento." },
        { id: "e2", titulo: "Electrocardiograma", tipo: "Estudio", fecha: day(-28), resumen: "Ritmo normal." },
      ],
    },
  };

  const asignaciones = {
    "REC-0042": ["WW-2048-17", "WW-3301-09"],
    "REC-0107": ["WW-2048-17", "WW-3301-09"],
  };

  // Avisos que recepción manda a cada paciente
  const mensajesIniciales = {
    "WW-2048-17": [
      { id: "x1", autor_nombre: "Mariana López", autor_rol: "personal", tipo: "recordatorio", leido: false, texto: "Mañana a las 7:30 te toman una muestra de sangre. No desayunes antes, ¡luego te traemos tu comida!", created_at: at(0, 8, 5) },
      { id: "x2", autor_nombre: "Mariana López", autor_rol: "personal", tipo: "mensaje", leido: true, texto: "Tu mamá ya puede pasar a visitarte de 4 a 6 de la tarde.", created_at: at(-1, 12, 20) },
    ],
    "WW-3301-09": [
      { id: "x3", autor_nombre: "Jorge Ruiz", autor_rol: "personal", tipo: "recordatorio", leido: false, texto: "Tu cita para el Holter es en 4 días. Llega 15 minutos antes a Torre B.", created_at: at(0, 9, 0) },
    ],
  };

  // Avisos generales del hospital (banda de la portada)
  const avisosIniciales = [
    { id: "a1", texto: "Horario de visitas: todos los días de 16:00 a 18:00", created_at: at(0, 7, 0) },
    { id: "a2", texto: "La farmacia de planta baja abre las 24 horas", created_at: at(0, 7, 0) },
    { id: "a3", texto: "Cafetería del piso 1: de 7:00 a 21:00", created_at: at(0, 7, 0) },
    { id: "a4", texto: "Sábado: función de títeres en la sala de juegos a las 11:00", created_at: at(0, 7, 0) },
    { id: "a5", texto: "¿Dudas? Recepción del piso 3, extensión 3000", created_at: at(0, 7, 0) },
  ];
  const salaInicial = {
    juegos: [
      { id: "s1", autor_nombre: "Leo · cuarto 301", texto: "¿Alguien quiere jugar memorama en la sala de juegos a las 4?", sticker: "", created_at: at(0, 9, 12) },
      { id: "s2", autor_nombre: "Vale · cuarto 307", texto: "", sticker: "star", created_at: at(0, 9, 20) },
    ],
    general: [
      { id: "s3", autor_nombre: "Mamá de Leo", texto: "La cafetería del piso 1 ya abrió 😊", sticker: "", created_at: at(0, 7, 40) },
    ],
  };

  // Códigos de acceso de prueba (solo modo demo)
  const codigos = { paciente: "123456", personal: "apoyo26" };

  window.DEMO = { personal, pacientes, asignaciones, mensajesIniciales, avisosIniciales, salaInicial, codigos };
})();

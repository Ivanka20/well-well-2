/* =========================================================
   Configuración local de Google Maps (solo para probar en tu
   computadora sin Vercel).

   1. Copia este archivo como  js/config.js
   2. Pega tu clave. js/config.js está en .gitignore, así que
      NO se sube a GitHub.
   En Vercel no hace falta: la clave se lee de la variable de
   entorno GOOGLE_MAPS_API_KEY (ver api/maps-key.js).
   ========================================================= */
window.WW_CONFIG = {
  googleMapsKey: "PEGA_AQUI_TU_CLAVE",
  googleMapsMapId: "",   // opcional: Map ID de Google Cloud (si se deja vacío se usa DEMO_MAP_ID)
  region: "MX",
};

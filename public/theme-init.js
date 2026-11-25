/* Applique le thème choisi avant le premier rendu (évite le flash). Aucune donnée personnelle. */
(function () {
  try {
    var raw = window.localStorage.getItem("cap:v1:prefs");
    var theme = raw ? JSON.parse(raw).theme : null;
    if (theme === "light" || theme === "dark") document.documentElement.setAttribute("data-theme", theme);
  } catch {
    /* stockage indisponible : thème du système */
  }
})();

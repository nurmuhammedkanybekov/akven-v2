// Apply the saved theme before first paint so a dark-mode visitor never sees a white flash.
// A separate file (not inline in index.html) so the Content-Security-Policy can forbid inline scripts.
try {
  var t = localStorage.getItem("akven-theme");
  if (t === "light" || t === "dark") document.documentElement.setAttribute("data-theme", t);
} catch (e) { /* storage blocked: fall back to the system preference in CSS */ }

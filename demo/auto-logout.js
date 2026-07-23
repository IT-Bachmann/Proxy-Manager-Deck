(() => {
  const timeout = 10 * 60 * 1000;
  const login = document.querySelector("#login");
  let timer = 0;
  let lastActivity = Date.now();
  const active = () => login.classList.contains("hidden");
  const stop = () => { clearTimeout(timer); timer = 0; };
  const check = () => {
    if (!active()) return stop();
    const remaining = timeout - (Date.now() - lastActivity);
    if (remaining > 0) return timer = setTimeout(check, remaining);
    document.querySelector("#logout").click();
    setTimeout(() => document.querySelector("#demoLoginError").textContent = "Du wurdest nach 10 Minuten Inaktivität automatisch abgemeldet.", 900);
  };
  const reset = () => {
    if (!active()) return;
    lastActivity = Date.now();
    stop();
    timer = setTimeout(check, timeout);
  };
  new MutationObserver(() => active() ? reset() : stop()).observe(login, {attributes:true, attributeFilter:["class"]});
  ["pointerdown", "keydown", "touchstart", "scroll"].forEach(name => window.addEventListener(name, reset, {passive:true}));
  document.addEventListener("visibilitychange", () => { if (!document.hidden) check(); });
})();

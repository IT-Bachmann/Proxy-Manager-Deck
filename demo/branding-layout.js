(() => {
  const loginBrand = document.querySelector(".login-brand");
  if (!loginBrand || loginBrand.querySelector(".demo-custom-logo")) return;
  const image = document.createElement("img");
  image.className = "demo-custom-logo";
  image.alt = "";
  image.hidden = true;
  loginBrand.insertBefore(image, loginBrand.querySelector("strong"));
  window.applyDemoBranding?.();
  const syncVortex = () => {
    const source = document.querySelector(".brand .demo-custom-logo");
    const vortexLogo = document.querySelector(".book-cover .logo");
    const hasLogo = Boolean(source?.src && !source.hidden);
    document.body.classList.toggle("has-custom-logo", hasLogo);
    if (!vortexLogo) return;
    vortexLogo.textContent = hasLogo ? "" : "P";
    vortexLogo.style.backgroundImage = hasLogo ? `url("${source.src.replaceAll('"', '%22')}")` : "";
  };
  const observer = new MutationObserver(syncVortex);
  document.querySelectorAll(".demo-custom-logo").forEach(logo => observer.observe(logo, {attributes:true, attributeFilter:["src", "hidden"]}));
  syncVortex();
})();

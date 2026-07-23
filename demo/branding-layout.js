(() => {
  const loginBrand = document.querySelector(".login-brand");
  if (!loginBrand || loginBrand.querySelector(".demo-custom-logo")) return;
  const image = document.createElement("img");
  image.className = "demo-custom-logo";
  image.alt = "";
  image.hidden = true;
  loginBrand.insertBefore(image, loginBrand.querySelector("strong"));
  window.applyDemoBranding?.();
})();

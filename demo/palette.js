function mixDemoPaletteColor(first, second, weight) {
  const colors = [first, second].map(color => { const value = parseInt(color.slice(1), 16); return [value >> 16, value >> 8 & 255, value & 255]; });
  return "#" + colors[0].map((channel, index) => Math.round(channel * (1 - weight) + colors[1][index] * weight).toString(16).padStart(2, "0")).join("");
}
function applyDemoPalette() {
  const accent = demoBranding.accent || "#16966a", root = document.documentElement;
  const palette = { "--green": accent, "--green2": accent, "--soft": mixDemoPaletteColor(accent,"#ffffff",.88), "--nav": mixDemoPaletteColor(accent,"#000000",.80), "--nav-active": mixDemoPaletteColor(accent,"#000000",.65), "--nav-hover": mixDemoPaletteColor(accent,"#000000",.72), "--nav-text": mixDemoPaletteColor(accent,"#ffffff",.70), "--nav-muted": mixDemoPaletteColor(accent,"#ffffff",.52), "--nav-line": mixDemoPaletteColor(accent,"#000000",.58), "--dark-bg": mixDemoPaletteColor(accent,"#000000",.88), "--dark-card": mixDemoPaletteColor(accent,"#000000",.79), "--dark-line": mixDemoPaletteColor(accent,"#000000",.62), "--dark-soft": mixDemoPaletteColor(accent,"#000000",.70) };
  Object.entries(palette).forEach(([name,value]) => root.style.setProperty(name,value));
  const background = (demoBranding.background || "#f3f6f4").toLowerCase(); root.style.setProperty("--bg", background === "#f3f6f4" ? mixDemoPaletteColor(accent,"#ffffff",.96) : background);
}
const originalDemoBranding = applyDemoBranding;
applyDemoBranding = function () { originalDemoBranding(); applyDemoPalette(); };
document.addEventListener("click", event => { if (event.target.id === "designSave" || event.target.id === "designReset") setTimeout(applyDemoPalette, 0); });
applyDemoPalette();

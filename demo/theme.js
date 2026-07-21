const themeButton=document.querySelector("#themeToggle");
function applyTheme(theme){
  const dark=theme==="dark";
  document.body.classList.toggle("dark",dark);
  themeButton.textContent=dark?"☀":"☾";
  themeButton.title=dark?"Hellmodus einschalten":"Dunkelmodus einschalten";
}
const savedTheme=localStorage.getItem("proxydeck-theme");
const preferredTheme=savedTheme||(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");
applyTheme(preferredTheme);
themeButton.addEventListener("click",()=>{
  const next=document.body.classList.contains("dark")?"light":"dark";
  localStorage.setItem("proxydeck-theme",next);
  applyTheme(next);
});

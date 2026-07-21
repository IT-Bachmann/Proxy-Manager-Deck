const targetList = document.querySelector("#targetList");
document.querySelector(".menu-button").addEventListener("click",()=>document.querySelector(".sidebar").classList.toggle("open"));
const state = {
  csrf: "",
  hostId: null,
  targets: [
    { address: "", family: "IPv4", weight: 100, mode: "Aktiv", healthy: false }
  ]
};

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
}

function renderTargets() {
  targetList.innerHTML = state.targets.map((target, index) => `
    <article class="target" data-index="${index}">
      <div class="drag">⠿</div>
      <div class="health ${target.healthy ? "healthy" : ""}"><span></span></div>
      <label class="address"><span>Zieladresse</span><input value="${escapeHtml(target.address)}" data-field="address" spellcheck="false" /></label>
      <label class="family"><span>Typ</span><select data-field="family"><option ${target.family === "IPv4" ? "selected" : ""}>IPv4</option><option ${target.family === "IPv6" ? "selected" : ""}>IPv6</option><option>Hostname</option></select></label>
      <label class="weight"><span>Gewicht</span><input type="number" value="${target.weight}" min="1" max="100" data-field="weight" /></label>
      <label class="mode"><span>Modus</span><select data-field="mode"><option ${target.mode === "Aktiv" ? "selected" : ""}>Aktiv</option><option ${target.mode === "Backup" ? "selected" : ""}>Backup</option><option>Aus</option></select></label>
      <button class="remove" data-remove="${index}" aria-label="Ziel entfernen">×</button>
      <div class="target-status"><span class="pulse"></span><strong>Erreichbar</strong><small>${index === 0 ? "18" : "31"} ms</small></div>
    </article>`).join("");
  const enabled = state.targets.filter(target => target.mode !== "Aus").length;
  document.querySelector("#activeCount").textContent = `${enabled} / ${state.targets.length}`;
}

targetList.addEventListener("input", event => {
  const article = event.target.closest(".target");
  if (!article || !event.target.dataset.field) return;
  const value = event.target.dataset.field === "weight" ? Number(event.target.value) : event.target.value;
  state.targets[Number(article.dataset.index)][event.target.dataset.field] = value;
});

targetList.addEventListener("click", event => {
  const index = event.target.dataset.remove;
  if (index === undefined) return;
  state.targets.splice(Number(index), 1);
  renderTargets();
});

document.querySelector("#addTarget").addEventListener("click", () => {
  state.targets.push({ address: "", family: "IPv4", weight: 100, mode: "Aktiv", healthy: false });
  renderTargets();
  targetList.lastElementChild.querySelector("input").focus();
});

function nginxConfig() {
  const domain = document.querySelector("#domain").value.trim();
  const port = document.querySelector("#port").value;
  const scheme = document.querySelector("#scheme").value;
  const strategy = document.querySelector("#strategy").value;
  const strategyLine = strategy === "round_robin" ? "" : `    ${strategy};\n`;
  const servers = state.targets.filter(t => t.address && t.mode !== "Aus").map(target => {
    const host = target.family === "IPv6" ? `[${target.address.replace(/^\[|\]$/g, "")}]` : target.address;
    const backup = target.mode === "Backup" ? " backup" : "";
    return `    server ${host}:${port} weight=${target.weight}${backup} max_fails=3 fail_timeout=30s;`;
  }).join("\n");
  return `upstream ${domain.replace(/[^a-z0-9]/gi, "_")} {\n${strategyLine}${servers}\n    keepalive 32;\n}\n\nserver {\n    listen 80;\n    listen [::]:80;\n    server_name ${domain};\n\n    location / {\n        proxy_pass ${scheme}://${domain.replace(/[^a-z0-9]/gi, "_")};\n        proxy_set_header Host $host;\n        proxy_set_header X-Real-IP $remote_addr;\n        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n        proxy_set_header X-Forwarded-Proto $scheme;\n        proxy_http_version 1.1;\n        proxy_set_header Upgrade $http_upgrade;\n        proxy_set_header Connection "upgrade";\n    }\n}`;
}

const dialog = document.querySelector("#configDialog");
function showConfig() { document.querySelector("#configOutput").textContent = nginxConfig(); dialog.showModal(); }
document.querySelector("#previewButton").addEventListener("click", showConfig);
document.querySelector("#closeDialog").addEventListener("click", () => dialog.close());
document.querySelector("#doneDialog").addEventListener("click", () => dialog.close());
document.querySelector("#copyConfig").addEventListener("click", async () => { await navigator.clipboard.writeText(nginxConfig()); document.querySelector("#copyConfig").textContent = "Kopiert ✓"; });
document.querySelector("#saveButton").addEventListener("click", () => {
  saveHost();
});

async function api(path, options = {}) {
  const response = await fetch(path, { ...options, headers: { "content-type": "application/json", ...(state.csrf ? { "x-csrf-token": state.csrf } : {}), ...(options.headers || {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Anfrage fehlgeschlagen");
  return data;
}

function toast(title, message) {
  const element = document.querySelector("#toast");
  element.querySelector("strong").textContent = title; element.querySelector("small").textContent = message;
  element.classList.add("show"); setTimeout(() => element.classList.remove("show"), 3200);
}

function darkenColor(hex,factor=.68){const value=parseInt(hex.slice(1),16);return "#"+[value>>16,value>>8&255,value&255].map(channel=>Math.round(channel*factor).toString(16).padStart(2,"0")).join("")}function applyBranding(settings){document.documentElement.style.setProperty("--brand",settings.accent||"#1ca471");document.documentElement.style.setProperty("--accent-dark",darkenColor(settings.accent||"#1ca471"));document.documentElement.style.setProperty("--bg",settings.background||"#f4f6f5");document.documentElement.style.setProperty("--brand-dark",settings.accent||"#137d56");document.querySelectorAll(".custom-logo").forEach(img=>{img.src=settings.logo||"";img.hidden=!settings.logo;if(img.previousElementSibling?.classList.contains("brand-mark"))img.previousElementSibling.hidden=Boolean(settings.logo)});if(settings.favicon){let link=document.querySelector('link[rel="icon"]');if(!link){link=document.createElement("link");link.rel="icon";document.head.append(link)}link.href=settings.favicon}}
async function loadBranding(){try{applyBranding(await api("/api/branding"))}catch{}}
function readImage(input){return new Promise((resolve,reject)=>{const file=input.files[0];if(!file)return resolve("");if(file.size>500000)return reject(new Error("Bild ist größer als 500 KB"));const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(new Error("Bild konnte nicht gelesen werden"));reader.readAsDataURL(file)})}

async function loadHosts() {
  const data = await api("/api/proxy-hosts");
  const host = data.items[0];
  if (!host) { document.querySelector(".title-line h1").textContent = "Neuer Proxy Host"; return renderTargets(); }
  state.hostId = host.id; document.querySelector("#domain").value = host.domain; document.querySelector("#port").value = host.port;
  document.querySelector("#scheme").value = host.scheme; document.querySelector("#strategy").value = host.strategy;
  document.querySelector("#websocket").checked = Boolean(host.websocket); document.querySelector("#sslEnabled").checked = Boolean(host.ssl_enabled);
  document.querySelector(".title-line h1").textContent = host.domain;
  state.targets = host.targets.map(target => ({ ...target, family: target.family === "hostname" ? "Hostname" : target.family, mode: target.mode === "backup" ? "Backup" : target.mode === "off" ? "Aus" : "Aktiv", healthy: target.healthy !== 0 }));
  renderTargets();
}

async function saveHost() {
  try {
    const payload = { id: state.hostId, domain: document.querySelector("#domain").value.trim(), scheme: document.querySelector("#scheme").value, port: Number(document.querySelector("#port").value), strategy: document.querySelector("#strategy").value, websocket: document.querySelector("#websocket").checked, ssl_enabled: document.querySelector("#sslEnabled").checked, enabled: true, targets: state.targets.map(target => ({ address: target.address.trim(), family: target.family, weight: Number(target.weight), mode: target.mode === "Backup" ? "backup" : target.mode === "Aus" ? "off" : "active", health_path: "/" })) };
    const result = await api("/api/proxy-hosts", { method: "POST", body: JSON.stringify(payload) }); state.hostId = result.id;
    await api("/api/apply", { method: "POST", body: "{}" }); toast("Gespeichert und aktiviert", "Nginx übernimmt die geprüfte Konfiguration automatisch.");
  } catch (error) { toast("Speichern fehlgeschlagen", error.message); }
}

document.querySelector("#loginForm").addEventListener("submit", async event => {
  event.preventDefault(); const errorBox = document.querySelector("#loginError"); errorBox.textContent = "";
  try { const data = await api("/api/login", { method: "POST", body: JSON.stringify({ username: document.querySelector("#loginUser").value, password: document.querySelector("#loginPassword").value }) }); state.csrf = data.csrf; const loginScreen=document.querySelector("#loginScreen"); loginScreen.classList.add("closing"); await new Promise(resolve=>setTimeout(resolve,900)); loginScreen.classList.add("hidden"); loginScreen.classList.remove("closing"); await loadHosts(); }
  catch (error) { errorBox.textContent = error.message; const card=document.querySelector(".login-card");card.classList.remove("login-denied");void card.offsetWidth;card.classList.add("login-denied"); }
});

async function restoreSession() {
  try { const data = await api("/api/session"); state.csrf = data.csrf; document.querySelector("#loginScreen").classList.add("hidden"); await loadHosts(); }
  catch { renderTargets(); }
}

document.querySelector("#logoutButton").addEventListener("click",async()=>{
  const loginScreen=document.querySelector("#loginScreen");loginScreen.classList.remove("hidden");loginScreen.classList.add("opening");
  try{await api("/api/logout",{method:"POST",body:"{}"})}catch{}
  state.csrf="";
  document.querySelector("#loginPassword").value="";
  setTimeout(()=>loginScreen.classList.remove("opening"),900);
});

const managerDialog = document.querySelector("#managerDialog");
document.querySelector("#closeManager").addEventListener("click", () => managerDialog.close());
document.querySelectorAll("[data-manager]").forEach(link => link.addEventListener("click", async event => {
  event.preventDefault(); const type = link.dataset.manager; const titles = { certificates: ["SSL-Zertifikate", "ACME und Let’s Encrypt"], redirects: ["Weiterleitungen", "Domains sicher auf andere Ziele umleiten"], streams: ["TCP-/UDP-Streams", "Dienste außerhalb von HTTP weiterleiten"], users: ["Benutzerverwaltung", "Konten und Rollen"], notifications: ["Benachrichtigungen", "E-Mail, Telegram und WhatsApp Cloud API"], audit: ["Aktivitäten", "Nachvollziehbare Systemänderungen"], branding:["Design", "Logo, Favicon und Akzentfarbe"], traffic:["Traffic & Hits", "Echte Nginx-Zugriffe der letzten 24 Stunden"] };
  document.querySelector("#managerTitle").textContent = titles[type][0]; document.querySelector("#managerSubtitle").textContent = titles[type][1];
  const content = document.querySelector("#managerContent"); content.innerHTML = '<div class="empty-state">Wird geladen …</div>'; managerDialog.showModal();
  try {
    if(type==="traffic"){const data=await api("/api/traffic?hours=24"),max=Math.max(1,...data.timeline.map(x=>x.hits));content.innerHTML=`<div class="traffic-stats"><div><small>HITS</small><strong>${data.totals.hits.toLocaleString("de-DE")}</strong></div><div><small>ÜBERTRAGEN</small><strong>${(data.totals.bytes/1048576).toFixed(1)} MB</strong></div><div><small>Ø ANTWORTZEIT</small><strong>${data.totals.average_ms} ms</strong></div><div><small>FEHLER</small><strong>${data.totals.errors.toLocaleString("de-DE")}</strong></div></div><div class="traffic-chart">${data.timeline.map(x=>`<i style="height:${Math.max(3,x.hits/max*100)}%" title="${new Date(x.bucket*1000).toLocaleString("de-DE")}: ${x.hits} Hits"></i>`).join("")||"<span>Noch keine Zugriffe erfasst.</span>"}</div><div class="manager-list">${data.hosts.map(x=>`<div class="manager-row"><div><strong>${escapeHtml(x.domain)}</strong><small>${x.average_ms} ms durchschnittlich</small></div><span class="tag">${x.hits.toLocaleString("de-DE")} Hits</span><small>${x.errors} Fehler · ${(x.bytes/1048576).toFixed(1)} MB</small></div>`).join("")||'<div class="empty-state">Noch keine Nginx-Zugriffe erfasst.</div>'}</div>`;return}
    if(type==="branding"){const settings=await api("/api/branding");content.innerHTML=`<form class="quick-form" id="brandingForm"><label><span>Akzentfarbe</span><input name="accent" type="color" value="${settings.accent||"#1ca471"}"></label><label><span>Hintergrundfarbe</span><input name="background" type="color" value="${settings.background||"#f4f6f5"}"></label><label><span>Logo (PNG/JPG, max. 500 KB)</span><input name="logo_file" type="file" accept="image/png,image/jpeg"></label><label><span>Favicon (PNG/JPG/ICO, max. 500 KB)</span><input name="favicon_file" type="file" accept="image/png,image/jpeg,image/x-icon"></label><button class="button primary">Design speichern</button></form><p>Leere Dateifelder behalten die bisher gespeicherten Bilder bei.</p>`;document.querySelector("#brandingForm").addEventListener("submit",async e=>{e.preventDefault();const form=e.currentTarget;try{const logo=await readImage(form.logo_file);const favicon=await readImage(form.favicon_file);const payload={accent:form.accent.value,background:form.background.value,logo:logo||settings.logo||"",favicon:favicon||settings.favicon||""};await api("/api/branding",{method:"POST",body:JSON.stringify(payload)});applyBranding(payload);managerDialog.close();toast("Design gespeichert","Logo, Favicon und Farbe sind jetzt aktiv.")}catch(error){toast("Design nicht gespeichert",error.message)}});return}
    const data = await api(`/api/${type}`); let form = "", providers = [];
    if (type === "certificates") { providers = (await api("/api/acme-providers")).items; form = `<form class="quick-form" id="certForm"><label><span>Domain</span><input name="domain" required></label><label><span>ACME-E-Mail</span><input name="email" type="email" required></label><label><span>Challenge</span><select name="challenge"><option value="http-01">HTTP-01</option><option value="dns-01">DNS-01</option></select></label><label><span>DNS-Anbieter</span><select name="provider_id"><option value="">– auswählen –</option>${providers.map(p=>`<option value="${p.id}">${escapeHtml(p.name)} · ${p.provider}</option>`).join("")}</select></label><button class="button primary">Zertifikat anfordern</button></form><form class="quick-form" id="providerForm"><label><span>Neu oder Schlüssel ändern</span><select name="id"><option value="">Neues DNS-Plugin</option>${providers.map(p=>`<option value="${p.id}">${escapeHtml(p.name)} bearbeiten</option>`).join("")}</select></label><label><span>Plugin-Name</span><input name="name" placeholder="DNS Produktion" required></label><label><span>DNS-Anbieter</span><select name="provider"><option value="cloudflare">Cloudflare</option><option value="digitalocean">DigitalOcean</option><option value="route53">AWS Route 53</option><option value="ionos">IONOS</option><option value="hetzner">Hetzner DNS</option><option value="ipv64">IPv64.net</option><option value="strato">STRATO</option><option value="powerdns">PowerDNS</option></select></label><label><span>API-Token / Benutzer / API-URL</span><input name="primary" type="password" required></label><label><span>Secret / Passwort / Server-ID</span><input name="secondary" type="password"></label><label><span>PowerDNS API-Token</span><input name="tertiary" type="password"></label><label><span>Aktuelles ProxyDeck-Passwort</span><input name="current_password" type="password" autocomplete="current-password" required></label><button class="button">Verschlüsselt speichern</button></form>`; }
    if (type === "users") form = '<form class="quick-form" id="passwordForm"><label><span>Aktuelles Passwort</span><input name="current_password" type="password" autocomplete="current-password" required></label><label><span>Neues Passwort (min. 16 Zeichen)</span><input name="new_password" type="password" autocomplete="new-password" minlength="16" required></label><label><span>Neues Passwort wiederholen</span><input name="confirm_password" type="password" autocomplete="new-password" minlength="16" required></label><button class="button primary">Eigenes Passwort ändern</button></form><form class="quick-form" id="userForm"><label><span>Benutzername</span><input name="username" required></label><label><span>Passwort (min. 16 Zeichen)</span><input name="password" type="password" minlength="16" required></label><label><span>Rolle</span><select name="role"><option>viewer</option><option>operator</option><option>admin</option></select></label><button class="button">Weiteren Benutzer anlegen</button></form>';
    if (type === "redirects") form = '<form class="quick-form" id="redirectForm"><label><span>Domain</span><input name="domain" required></label><label><span>Ziel-URL</span><input name="target" type="url" placeholder="https://example.net" required></label><label><span>Status</span><select name="code"><option>301</option><option>302</option><option>307</option><option>308</option></select></label><button class="button primary">Weiterleitung anlegen</button></form>';
    if (type === "streams") form = '<form class="quick-form" id="streamForm"><label><span>Listen-Port</span><input name="listen_port" type="number" value="9000" required></label><label><span>Ziel</span><input name="target_host" placeholder="192.168.1.40" required></label><label><span>Ziel-Port</span><input name="target_port" type="number" required></label><label><span>Protokoll</span><select name="protocol"><option>tcp</option><option>udp</option></select></label><button class="button primary">Stream anlegen</button></form>';
    if (type === "notifications") form = `<form class="notification-form" id="notificationForm"><div class="form-grid"><label><span>Name</span><input name="name" placeholder="Bereitschaft" required></label><label><span>Kanal</span><select name="channel_type" id="notificationType"><option value="smtp">E-Mail / SMTP</option><option value="telegram">Telegram Bot</option><option value="whatsapp">WhatsApp Cloud API</option></select></label></div><div class="notification-fields" data-notification="smtp"><label><span>SMTP-Server</span><input name="smtp_host" placeholder="smtp.example.com"></label><label><span>Port</span><input name="smtp_port" type="number" value="587" min="1" max="65535"></label><label><span>Verbindungssicherheit</span><select name="smtp_security"><option value="starttls">STARTTLS</option><option value="ssl">SSL/TLS</option><option value="none">Keine</option></select></label><label><span>SMTP-Benutzer</span><input name="smtp_username" autocomplete="username"></label><label><span>SMTP-Passwort</span><input name="smtp_password" type="password" autocomplete="new-password"></label><label><span>Absenderadresse</span><input name="from_email" type="email" placeholder="proxydeck@example.com"></label><label><span>Empfängeradresse</span><input name="to_email" type="email" placeholder="admin@example.com"></label></div><div class="notification-fields" data-notification="telegram" hidden><label><span>Bot-Token</span><input name="bot_token" type="password" placeholder="123456:ABC..."></label><label><span>Chat-ID</span><input name="chat_id" placeholder="-1001234567890"></label></div><div class="notification-fields" data-notification="whatsapp" hidden><label><span>Cloud-API Access-Token</span><input name="access_token" type="password"></label><label><span>Phone-Number-ID</span><input name="phone_number_id"></label><label><span>Empfänger im internationalen Format</span><input name="recipient" placeholder="491701234567"></label><label><span>Graph-API-Version</span><input name="api_version" value="v23.0"></label></div><fieldset class="event-fields"><legend>Ereignisse</legend><label><input type="checkbox" name="events" value="down" checked> Ausfall</label><label><input type="checkbox" name="events" value="up" checked> Wieder erreichbar</label><label><input type="checkbox" name="events" value="certificate" checked> Zertifikatsfehler</label></fieldset><label class="password-confirm"><span>Aktuelles ProxyDeck-Passwort</span><input name="current_password" type="password" autocomplete="current-password" required></label><button class="button primary">Kanal verschlüsselt speichern</button></form>`;    const rows = data.items.map(item => type === "notifications" ? `<div class="manager-row"><div><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.channel_type.toUpperCase())} · ${item.events.map(event=>({down:"Ausfall",up:"Erholung",certificate:"Zertifikat"}[event]||event)).join(" · ")}</small></div><span class="tag">${item.enabled ? "aktiv" : "aus"}</span><button class="button notification-test" data-id="${item.id}">Testen</button></div>` : `<div class="manager-row"><div><strong>${escapeHtml(item.domain || item.username || item.action || `${item.protocol?.toUpperCase()} ${item.listen_port}`)}</strong><small>${escapeHtml(item.email || item.detail || item.target_host || item.role || "")}</small></div><span class="tag">${escapeHtml(item.status || item.role || (item.enabled ? "aktiv" : "aus"))}</span><small>${item.created_at ? new Date(item.created_at * 1000).toLocaleString("de-DE") : ""}</small></div>`).join("");    content.innerHTML = form + `<div class="manager-list">${rows || '<div class="empty-state">Noch keine Einträge vorhanden.</div>'}</div>`;
    const certForm = document.querySelector("#certForm"); if (certForm) certForm.addEventListener("submit", async e => { e.preventDefault(); const values=Object.fromEntries(new FormData(certForm)); if(values.provider_id) values.provider_id=Number(values.provider_id); try { await api("/api/certificates/request", { method:"POST", body:JSON.stringify(values) }); managerDialog.close(); toast("ACME gestartet", `${values.challenge.toUpperCase()} wird im Hintergrund ausgeführt.`); } catch(error){ toast("ACME fehlgeschlagen",error.message); } });
    const providerForm = document.querySelector("#providerForm"); if (providerForm) providerForm.addEventListener("submit", async e => { e.preventDefault(); const values=Object.fromEntries(new FormData(providerForm)); let credentials;if(values.provider==="cloudflare"||["ionos","hetzner","ipv64"].includes(values.provider))credentials={api_token:values.primary};else if(values.provider==="digitalocean")credentials={token:values.primary};else if(values.provider==="route53")credentials={access_key_id:values.primary,secret_access_key:values.secondary};else if(values.provider==="strato")credentials={username:values.primary,password:values.secondary};else credentials={api_url:values.primary,server_id:values.secondary,api_token:values.tertiary}; try { await api("/api/acme-providers",{method:"POST",body:JSON.stringify({id:values.id?Number(values.id):undefined,name:values.name,provider:values.provider,credentials,current_password:values.current_password})}); managerDialog.close(); toast("DNS-Plugin gespeichert","Schlüssel wurden verschlüsselt in SQLite abgelegt."); } catch(error){ toast("Plugin fehlgeschlagen",error.message); } });
    const userForm = document.querySelector("#userForm"); if (userForm) userForm.addEventListener("submit", async e => { e.preventDefault(); const values=Object.fromEntries(new FormData(userForm)); try { await api("/api/users",{method:"POST",body:JSON.stringify(values)}); managerDialog.close(); toast("Benutzer angelegt", values.username); } catch(error){ toast("Anlegen fehlgeschlagen",error.message); } });
    const passwordForm = document.querySelector("#passwordForm"); if (passwordForm) passwordForm.addEventListener("submit", async e => { e.preventDefault(); const values=Object.fromEntries(new FormData(passwordForm)); if(values.new_password!==values.confirm_password){toast("Passwörter stimmen nicht überein","Bitte beide Eingaben prüfen.");return} try{await api("/api/account/password",{method:"POST",body:JSON.stringify({current_password:values.current_password,new_password:values.new_password})});managerDialog.close();state.csrf="";document.querySelector("#loginPassword").value="";document.querySelector("#loginScreen").classList.remove("hidden");toast("Passwort geändert","Alle Sitzungen wurden beendet. Bitte neu anmelden.")}catch(error){toast("Änderung fehlgeschlagen",error.message)} });
    const streamForm = document.querySelector("#streamForm"); if (streamForm) streamForm.addEventListener("submit", async e => { e.preventDefault(); const values=Object.fromEntries(new FormData(streamForm)); try { await api("/api/streams",{method:"POST",body:JSON.stringify(values)}); managerDialog.close(); toast("Stream aktiviert", `${values.protocol.toUpperCase()} ${values.listen_port}`); } catch(error){ toast("Stream fehlgeschlagen",error.message); } });
    const redirectForm = document.querySelector("#redirectForm"); if (redirectForm) redirectForm.addEventListener("submit", async e => { e.preventDefault(); const values=Object.fromEntries(new FormData(redirectForm)); try { await api("/api/redirects",{method:"POST",body:JSON.stringify(values)}); managerDialog.close(); toast("Weiterleitung aktiviert", values.domain); } catch(error){ toast("Weiterleitung fehlgeschlagen",error.message); } });
    const notificationForm = document.querySelector("#notificationForm"); if (notificationForm) { const syncFields=()=>{const selected=notificationForm.channel_type.value;notificationForm.querySelectorAll("[data-notification]").forEach(group=>{group.hidden=group.dataset.notification!==selected;group.querySelectorAll("input,select").forEach(input=>input.required=!group.hidden&&!['smtp_username','smtp_password'].includes(input.name))})};notificationForm.channel_type.addEventListener("change",syncFields);syncFields();notificationForm.addEventListener("submit", async e => { e.preventDefault(); const values=Object.fromEntries(new FormData(notificationForm));const events=[...notificationForm.querySelectorAll('input[name="events"]:checked')].map(input=>input.value);let config;if(values.channel_type==="smtp")config={host:values.smtp_host,port:Number(values.smtp_port),security:values.smtp_security,username:values.smtp_username,password:values.smtp_password,from_email:values.from_email,to_email:values.to_email};else if(values.channel_type==="telegram")config={bot_token:values.bot_token,chat_id:values.chat_id};else config={access_token:values.access_token,phone_number_id:values.phone_number_id,recipient:values.recipient,api_version:values.api_version};try{await api("/api/notifications",{method:"POST",body:JSON.stringify({name:values.name,channel_type:values.channel_type,config,events,enabled:true,current_password:values.current_password})});managerDialog.close();toast("Kanal gespeichert","Zugangsdaten wurden verschlüsselt abgelegt.")}catch(error){toast("Speichern fehlgeschlagen",error.message)}})}
    document.querySelectorAll(".notification-test").forEach(button=>button.addEventListener("click",async()=>{const password=window.prompt("Aktuelles ProxyDeck-Passwort für den Testversand:");if(password===null)return;try{await api("/api/notifications/test",{method:"POST",body:JSON.stringify({id:Number(button.dataset.id),current_password:password})});toast("Testnachricht gesendet","Der Kanal wurde erfolgreich angesprochen.")}catch(error){toast("Test fehlgeschlagen",error.message)}}));  } catch (error) { content.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`; }
}));

loadBranding();restoreSession();

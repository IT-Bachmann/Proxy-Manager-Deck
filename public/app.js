const targetList = document.querySelector("#targetList");
document.querySelector(".menu-button").addEventListener("click",()=>document.querySelector(".sidebar").classList.toggle("open"));
const state = {
  csrf: "",
  hostId: null,
  targets: [
    { address: "demo", family: "Hostname", weight: 100, mode: "Aktiv", healthy: true }
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

async function loadHosts() {
  const data = await api("/api/proxy-hosts");
  const host = data.items[0];
  if (!host) return renderTargets();
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
  try { const data = await api("/api/login", { method: "POST", body: JSON.stringify({ username: document.querySelector("#loginUser").value, password: document.querySelector("#loginPassword").value }) }); state.csrf = data.csrf; document.querySelector("#loginScreen").classList.add("hidden"); await loadHosts(); }
  catch (error) { errorBox.textContent = error.message; }
});

async function restoreSession() {
  try { const data = await api("/api/session"); state.csrf = data.csrf; document.querySelector("#loginScreen").classList.add("hidden"); await loadHosts(); }
  catch { renderTargets(); }
}

const managerDialog = document.querySelector("#managerDialog");
document.querySelector("#closeManager").addEventListener("click", () => managerDialog.close());
document.querySelectorAll("[data-manager]").forEach(link => link.addEventListener("click", async event => {
  event.preventDefault(); const type = link.dataset.manager; const titles = { certificates: ["SSL-Zertifikate", "ACME und Let’s Encrypt"], redirects: ["Weiterleitungen", "Domains sicher auf andere Ziele umleiten"], streams: ["TCP-/UDP-Streams", "Dienste außerhalb von HTTP weiterleiten"], users: ["Benutzerverwaltung", "Konten und Rollen"], notifications: ["Benachrichtigungen", "E-Mail, Telegram und WhatsApp Cloud API"], audit: ["Aktivitäten", "Nachvollziehbare Systemänderungen"] };
  document.querySelector("#managerTitle").textContent = titles[type][0]; document.querySelector("#managerSubtitle").textContent = titles[type][1];
  const content = document.querySelector("#managerContent"); content.innerHTML = '<div class="empty-state">Wird geladen …</div>'; managerDialog.showModal();
  try {
    const data = await api(`/api/${type}`); let form = "", providers = [];
    if (type === "certificates") { providers = (await api("/api/acme-providers")).items; form = `<form class="quick-form" id="certForm"><label><span>Domain</span><input name="domain" required></label><label><span>ACME-E-Mail</span><input name="email" type="email" required></label><label><span>Challenge</span><select name="challenge"><option value="http-01">HTTP-01</option><option value="dns-01">DNS-01</option></select></label><label><span>DNS-Anbieter</span><select name="provider_id"><option value="">– auswählen –</option>${providers.map(p=>`<option value="${p.id}">${escapeHtml(p.name)} · ${p.provider}</option>`).join("")}</select></label><button class="button primary">Zertifikat anfordern</button></form><form class="quick-form" id="providerForm"><label><span>Neu oder Schlüssel ändern</span><select name="id"><option value="">Neues DNS-Plugin</option>${providers.map(p=>`<option value="${p.id}">${escapeHtml(p.name)} bearbeiten</option>`).join("")}</select></label><label><span>Plugin-Name</span><input name="name" placeholder="DNS Produktion" required></label><label><span>DNS-Anbieter</span><select name="provider"><option value="cloudflare">Cloudflare</option><option value="digitalocean">DigitalOcean</option><option value="route53">AWS Route 53</option><option value="ionos">IONOS</option><option value="hetzner">Hetzner DNS</option><option value="ipv64">IPv64.net</option><option value="strato">STRATO</option><option value="powerdns">PowerDNS</option></select></label><label><span>API-Token / Benutzer / API-URL</span><input name="primary" type="password" required></label><label><span>Secret / Passwort / Server-ID</span><input name="secondary" type="password"></label><label><span>PowerDNS API-Token</span><input name="tertiary" type="password"></label><label><span>Aktuelles ProxyDeck-Passwort</span><input name="current_password" type="password" autocomplete="current-password" required></label><button class="button">Verschlüsselt speichern</button></form>`; }
    if (type === "users") form = '<form class="quick-form" id="userForm"><label><span>Benutzername</span><input name="username" required></label><label><span>Passwort (min. 12 Zeichen)</span><input name="password" type="password" required></label><label><span>Rolle</span><select name="role"><option>viewer</option><option>operator</option><option>admin</option></select></label><button class="button primary">Anlegen</button></form>';
    if (type === "redirects") form = '<form class="quick-form" id="redirectForm"><label><span>Domain</span><input name="domain" required></label><label><span>Ziel-URL</span><input name="target" type="url" placeholder="https://example.net" required></label><label><span>Status</span><select name="code"><option>301</option><option>302</option><option>307</option><option>308</option></select></label><button class="button primary">Weiterleitung anlegen</button></form>';
    if (type === "streams") form = '<form class="quick-form" id="streamForm"><label><span>Listen-Port</span><input name="listen_port" type="number" value="9000" required></label><label><span>Ziel</span><input name="target_host" placeholder="192.168.1.40" required></label><label><span>Ziel-Port</span><input name="target_port" type="number" required></label><label><span>Protokoll</span><select name="protocol"><option>tcp</option><option>udp</option></select></label><button class="button primary">Stream anlegen</button></form>';
    if (type === "notifications") form = '<form class="quick-form" id="notificationForm"><label><span>Name</span><input name="name" placeholder="Bereitschaft" required></label><label><span>Kanal</span><select name="channel_type"><option value="smtp">E-Mail / SMTP</option><option value="telegram">Telegram Bot</option><option value="whatsapp">WhatsApp Cloud API</option></select></label><label><span>Host / Bot-Token / Access-Token</span><input name="primary" type="password" required></label><label><span>Absender / Chat-ID / Phone-Number-ID</span><input name="secondary" required></label><label><span>Empfänger-E-Mail / WhatsApp-Nummer</span><input name="tertiary"></label><label><span>SMTP Benutzer</span><input name="username"></label><label><span>SMTP Passwort</span><input name="smtp_password" type="password"></label><label><span>SMTP Port</span><input name="port" type="number" value="587"></label><label><span>Aktuelles ProxyDeck-Passwort</span><input name="current_password" type="password" autocomplete="current-password" required></label><button class="button primary">Kanal speichern</button></form>';
    const rows = data.items.map(item => `<div class="manager-row"><div><strong>${escapeHtml(item.domain || item.username || item.action || `${item.protocol?.toUpperCase()} ${item.listen_port}`)}</strong><small>${escapeHtml(item.email || item.detail || item.target_host || item.role || "")}</small></div><span class="tag">${escapeHtml(item.status || item.role || (item.enabled ? "aktiv" : "aus"))}</span><small>${item.created_at ? new Date(item.created_at * 1000).toLocaleString("de-DE") : ""}</small></div>`).join("");
    content.innerHTML = form + `<div class="manager-list">${rows || '<div class="empty-state">Noch keine Einträge vorhanden.</div>'}</div>`;
    const certForm = document.querySelector("#certForm"); if (certForm) certForm.addEventListener("submit", async e => { e.preventDefault(); const values=Object.fromEntries(new FormData(certForm)); if(values.provider_id) values.provider_id=Number(values.provider_id); try { await api("/api/certificates/request", { method:"POST", body:JSON.stringify(values) }); managerDialog.close(); toast("ACME gestartet", `${values.challenge.toUpperCase()} wird im Hintergrund ausgeführt.`); } catch(error){ toast("ACME fehlgeschlagen",error.message); } });
    const providerForm = document.querySelector("#providerForm"); if (providerForm) providerForm.addEventListener("submit", async e => { e.preventDefault(); const values=Object.fromEntries(new FormData(providerForm)); let credentials;if(values.provider==="cloudflare"||["ionos","hetzner","ipv64"].includes(values.provider))credentials={api_token:values.primary};else if(values.provider==="digitalocean")credentials={token:values.primary};else if(values.provider==="route53")credentials={access_key_id:values.primary,secret_access_key:values.secondary};else if(values.provider==="strato")credentials={username:values.primary,password:values.secondary};else credentials={api_url:values.primary,server_id:values.secondary,api_token:values.tertiary}; try { await api("/api/acme-providers",{method:"POST",body:JSON.stringify({id:values.id?Number(values.id):undefined,name:values.name,provider:values.provider,credentials,current_password:values.current_password})}); managerDialog.close(); toast("DNS-Plugin gespeichert","Schlüssel wurden verschlüsselt in SQLite abgelegt."); } catch(error){ toast("Plugin fehlgeschlagen",error.message); } });
    const userForm = document.querySelector("#userForm"); if (userForm) userForm.addEventListener("submit", async e => { e.preventDefault(); const values=Object.fromEntries(new FormData(userForm)); try { await api("/api/users",{method:"POST",body:JSON.stringify(values)}); managerDialog.close(); toast("Benutzer angelegt", values.username); } catch(error){ toast("Anlegen fehlgeschlagen",error.message); } });
    const streamForm = document.querySelector("#streamForm"); if (streamForm) streamForm.addEventListener("submit", async e => { e.preventDefault(); const values=Object.fromEntries(new FormData(streamForm)); try { await api("/api/streams",{method:"POST",body:JSON.stringify(values)}); managerDialog.close(); toast("Stream aktiviert", `${values.protocol.toUpperCase()} ${values.listen_port}`); } catch(error){ toast("Stream fehlgeschlagen",error.message); } });
    const redirectForm = document.querySelector("#redirectForm"); if (redirectForm) redirectForm.addEventListener("submit", async e => { e.preventDefault(); const values=Object.fromEntries(new FormData(redirectForm)); try { await api("/api/redirects",{method:"POST",body:JSON.stringify(values)}); managerDialog.close(); toast("Weiterleitung aktiviert", values.domain); } catch(error){ toast("Weiterleitung fehlgeschlagen",error.message); } });
    const notificationForm = document.querySelector("#notificationForm"); if (notificationForm) notificationForm.addEventListener("submit", async e => { e.preventDefault(); const values=Object.fromEntries(new FormData(notificationForm)); let config;if(values.channel_type==="smtp")config={host:values.primary,port:Number(values.port||587),from_email:values.secondary,to_email:values.tertiary,username:values.username,password:values.smtp_password,security:"starttls"};else if(values.channel_type==="telegram")config={bot_token:values.primary,chat_id:values.secondary};else config={access_token:values.primary,phone_number_id:values.secondary,recipient:values.tertiary,api_version:"v23.0"};try{await api("/api/notifications",{method:"POST",body:JSON.stringify({name:values.name,channel_type:values.channel_type,config,events:["down","up","certificate"],enabled:true,current_password:values.current_password})});managerDialog.close();toast("Kanal gespeichert","Zugangsdaten wurden verschlüsselt abgelegt.")}catch(error){toast("Speichern fehlgeschlagen",error.message)} });
  } catch (error) { content.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`; }
}));

restoreSession();

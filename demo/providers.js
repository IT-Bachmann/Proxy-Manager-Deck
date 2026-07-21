function providers(){return title("DNS-Plugins","API-Zugänge für automatische DNS-01-Challenges – verschlüsselt und nur nach erneuter Passwortprüfung änderbar.")+`<section class="card list-card"><div class="toolbar"><strong>Konfigurierte Anbieter</strong><button class="btn primary" data-add-provider>＋ DNS-Plugin</button></div>${simpleTableInner(["Name","Anbieter","Schlüssel",""],state.providers.map(p=>[`<strong>${esc(p.name)}</strong>`,esc(p.provider),'<span class="status">Verschlüsselt</span>',`<button class="icon-btn" data-edit-provider="${p.id}">✎</button>`]))}</section>`}

function openProviderModal(id){
  const item=state.providers.find(p=>p.id===id);
  $("#modalTitle").textContent=item?"DNS-Plugin ändern":"DNS-Plugin anlegen";
  $("#modalSubtitle").textContent="Schlüssel werden verschlüsselt in SQLite gespeichert";
  $("#modalBody").innerHTML=`<div class="form-grid"><label>Name<input id="dpName" value="${esc(item?.name||"")}" required></label><label>Anbieter<select id="dpType">${["Cloudflare","DigitalOcean","AWS Route 53","IONOS","Hetzner DNS","IPv64.net","STRATO","PowerDNS"].map(x=>`<option ${item?.provider===x?"selected":""}>${x}</option>`).join("")}</select></label><label>API-Token / Benutzer / URL<input id="dpPrimary" type="password" value="demo-api-key"></label><label>Secret / Passwort / Server-ID<input id="dpSecondary" type="password"></label><label class="wide">Aktuelles ProxyDeck-Passwort<input id="dpPassword" type="password" placeholder="proxydeck-demo" autocomplete="current-password"></label></div><p style="color:var(--muted);font-size:10px">Gespeicherte Schlüssel werden niemals wieder angezeigt. Beim Ändern wird ein vollständig neuer Schlüssel verschlüsselt abgelegt.</p>`;
  modalAction=()=>{
    if($("#dpPassword").value!=="proxydeck-demo")return notify("Passwort falsch","Die Schlüsseländerung wurde nicht gespeichert.");
    const data={id:item?.id||Date.now(),name:$("#dpName").value,provider:$("#dpType").value,configured:true};
    if(item)Object.assign(item,data);else state.providers.push(data);
    addActivity(item?"DNS-Schlüssel rotiert":"DNS-Plugin angelegt",data.name+" · admin");
    finish("DNS-Plugin gespeichert","Der Schlüssel wurde verschlüsselt abgelegt.");
  };
  $("#modal").showModal();
}

document.addEventListener("click",event=>{
  if(event.target.closest("[data-add-provider]"))openProviderModal();
  const id=event.target.closest("[data-edit-provider]")?.dataset.editProvider;
  if(id)openProviderModal(Number(id));
});

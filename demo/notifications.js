function notifications(){return title("Benachrichtigungen","Ausfälle, Erholungen und Zertifikatsfehler sofort melden.")+`<section class="card list-card"><div class="toolbar"><strong>Benachrichtigungskanäle</strong><button class="btn primary" data-add-notification>＋ Kanal</button></div>${simpleTableInner(["Name","Typ","Ereignisse","Status",""],state.notifications.map(n=>[`<strong>${esc(n.name)}</strong>`,esc(n.type),"Ausfall · Erholung · Zertifikat",status(n.enabled),`<div class="row-actions"><button class="icon-btn" title="Testnachricht" data-test-notification="${n.id}">▷</button><button class="icon-btn" data-edit-notification="${n.id}">✎</button></div>`]))}</section>`}

function openNotificationModal(id){
  const item=state.notifications.find(n=>n.id===id);
  $("#modalTitle").textContent=item?"Kanal bearbeiten":"Benachrichtigungskanal";
  $("#modalSubtitle").textContent="SMTP, Telegram Bot oder WhatsApp Cloud API";
  $("#modalBody").innerHTML=`<div class="form-grid"><label>Name<input id="ntName" value="${esc(item?.name||"")}"></label><label>Typ<select id="ntType">${["E-Mail","Telegram","WhatsApp"].map(x=>`<option ${item?.type===x?"selected":""}>${x}</option>`).join("")}</select></label><label>Host / Bot-Token / Access-Token<input type="password" value="demo-secret"></label><label>Empfänger / Chat-ID / Phone-ID<input value="demo-recipient"></label><label class="wide">Aktuelles ProxyDeck-Passwort<input id="ntPassword" type="password" placeholder="proxydeck-demo"></label></div><p style="color:var(--muted);font-size:10px">Benachrichtigungen: Upstream ausgefallen, wieder erreichbar und ACME-/Zertifikatsfehler.</p>`;
  modalAction=()=>{if($("#ntPassword").value!=="proxydeck-demo")return notify("Passwort falsch","Der Kanal wurde nicht gespeichert.");const data={id:item?.id||Date.now(),name:$("#ntName").value,type:$("#ntType").value,enabled:true};if(item)Object.assign(item,data);else state.notifications.push(data);addActivity("Benachrichtigungskanal gespeichert",data.name+" · admin");finish("Kanal gespeichert","Zugangsdaten wurden verschlüsselt abgelegt.")};
  $("#modal").showModal();
}

document.addEventListener("click",event=>{
  if(event.target.closest("[data-add-notification]"))openNotificationModal();
  const edit=event.target.closest("[data-edit-notification]")?.dataset.editNotification;if(edit)openNotificationModal(Number(edit));
  const test=event.target.closest("[data-test-notification]")?.dataset.testNotification;if(test)notify("Testnachricht gesendet",state.notifications.find(n=>n.id==test)?.name||"Kanal");
});

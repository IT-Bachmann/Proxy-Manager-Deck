(() => {
  const limit = 2 * 1024 * 1024;
  window.demoReadImage = input => new Promise((resolve, reject) => {
    const file = input.files[0];
    if (!file) return resolve("");
    if (file.size > limit) return reject(new Error("Bild ist größer als 2 MB"));
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Bild konnte nicht gelesen werden"));
    reader.readAsDataURL(file);
  });
  const updateLabels = root => {
    root.querySelectorAll?.("label").forEach(label => {
      for (const node of label.childNodes) if (node.nodeType === Node.TEXT_NODE && node.nodeValue.includes("max. 500 KB")) node.nodeValue = node.nodeValue.replace("max. 500 KB", "max. 2 MB");
    });
  };
  new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(node => node.nodeType === 1 && updateLabels(node)))).observe(document.body, {subtree:true, childList:true});
})();

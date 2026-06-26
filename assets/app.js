(function(){
  "use strict";

  const CASES_KEY = "anemiaRiskCases.v1";
  const CONFIG_KEY = "anemiaRiskConfig.v1";
  const form = document.getElementById("caseForm");
  const resultContent = document.getElementById("resultContent");
  const historyBody = document.getElementById("historyBody");
  const configForm = document.getElementById("configForm");
  const caseCount = document.getElementById("caseCount");
  let latest = null;

  const configLabels = {
    ferritinLow:"Ferritina baja",
    ferritinVeryLow:"Ferritina muy baja",
    tsatLow:"TSAT baja",
    pcrHigh:"PCR alta",
    b12Low:"B12 baja",
    folateLow:"Folato bajo",
    reticHigh:"Reticulocitos altos",
    ldhHigh:"LDH alta",
    bilirubinHigh:"Bilirrubina alta",
    haptoglobinLow:"Haptoglobina baja",
    hba2High:"HbA2 alta"
  };

  function readJson(key, fallback){
    try{
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    }catch(_err){
      return fallback;
    }
  }

  function writeJson(key, value){
    localStorage.setItem(key, JSON.stringify(value));
  }

  function getConfig(){
    return Object.assign({}, AnemiaRiskEngine.DEFAULT_CONFIG, readJson(CONFIG_KEY, {}));
  }

  function readForm(){
    const data = {};
    new FormData(form).forEach((value, key) => { data[key] = value; });
    data.caseId = document.getElementById("caseId").value.trim() || `CASO-${new Date().toISOString().slice(0,19).replace(/[-:T]/g,"")}`;
    return data;
  }

  function badge(item){
    return `<span class="badge ${item.level}">${escapeHtml(item.label || item.name)}</span>`;
  }

  function escapeHtml(value){
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;" }[char]));
  }

  function list(items){
    return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
  }

  function metric(label, value, sub){
    return `<div class="metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><small>${escapeHtml(sub || "")}</small></div>`;
  }

  function renderResult(result){
    if(!result.ok){
      resultContent.className = "notice";
      resultContent.innerHTML = `<strong>Faltan datos obligatorios:</strong> ${escapeHtml(result.errors.join(", "))}.`;
      return;
    }
    resultContent.className = "";
    const tsat = result.calculated.tsat === null ? "No disponible" : `${result.calculated.tsat}%${result.calculated.tsatWasCalculated ? " calculada" : ""}`;
    resultContent.innerHTML = `
      <div class="metric-grid">
        ${metric("Trimestre", result.trimester.label, `Umbral Hb ${result.trimester.hbCut || "-"} g/dL`)}
        ${metric("Clasificacion", result.severity.name, result.morphology.name)}
        ${metric("Score neonatal", result.score, result.risk.name)}
        ${metric("Completitud", `${result.completeness}%`, `TSAT ${tsat}`)}
      </div>
      <div class="progress"><div style="width:${result.risk.percent}%"></div></div>
      <p>${badge(result.severity)} ${badge(result.morphology)} ${badge(result.risk)}</p>
      <div class="result-section"><h3>Sospecha etiologica</h3><p>${result.etiologies.map(badge).join("")}</p></div>
      <div class="result-section"><h3>Interpretacion orientativa</h3>${list(result.interpretation)}</div>
      <div class="result-section"><h3>Examenes recomendados o faltantes</h3>${list(result.exams)}</div>
      <div class="result-section"><h3>Desenlaces neonatales a vigilar</h3>${list(result.outcomes)}</div>
      <div class="result-section"><h3>Acciones sugeridas</h3>${list(result.actions)}</div>
      <div class="${result.alerts.length ? "notice" : "empty-state"}"><strong>${result.alerts.length ? "Alertas:" : "Sin alertas criticas automaticas."}</strong>${result.alerts.length ? list(result.alerts) : " Correlacionar con signos vitales, examen fisico y criterio medico."}</div>
    `;
  }

  function analyze(){
    latest = {input: readForm(), result: AnemiaRiskEngine.calculate(readForm(), getConfig()), createdAt: new Date().toISOString()};
    renderResult(latest.result);
    return latest;
  }

  function saveCurrent(){
    const current = analyze();
    if(!current.result.ok){
      toast("No se guardo: faltan datos obligatorios.");
      return;
    }
    const cases = readJson(CASES_KEY, []);
    cases.unshift(current);
    writeJson(CASES_KEY, cases.slice(0, 500));
    renderHistory();
    toast("Caso guardado en historial local.");
  }

  function renderHistory(){
    const cases = readJson(CASES_KEY, []);
    caseCount.textContent = `${cases.length} caso${cases.length === 1 ? "" : "s"}`;
    if(!cases.length){
      historyBody.innerHTML = `<tr><td colspan="8">Sin casos guardados todavia.</td></tr>`;
      return;
    }
    historyBody.innerHTML = cases.map((item, index) => {
      const r = item.result;
      const input = item.input || {};
      return `<tr>
        <td>${escapeHtml(new Date(item.createdAt).toLocaleString())}</td>
        <td>${escapeHtml(input.caseId)}</td>
        <td>${escapeHtml(input.hb || "")}</td>
        <td>${escapeHtml(input.eg || "")}</td>
        <td>${escapeHtml(r.severity.name)}</td>
        <td>${escapeHtml(r.score)}</td>
        <td>${badge(r.risk)}</td>
        <td><button type="button" class="ghost" data-load="${index}">Cargar</button></td>
      </tr>`;
    }).join("");
  }

  function loadCase(index){
    const cases = readJson(CASES_KEY, []);
    const item = cases[index];
    if(!item) return;
    Object.entries(item.input || {}).forEach(([key, value]) => {
      const field = form.elements[key] || document.getElementById(key);
      if(field) field.value = value;
    });
    latest = {input: readForm(), result: AnemiaRiskEngine.calculate(readForm(), getConfig()), createdAt: new Date().toISOString()};
    renderResult(latest.result);
    toast("Caso cargado.");
  }

  function download(filename, mime, content){
    const blob = new Blob([content], {type:mime});
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function exportCsv(){
    const cases = readJson(CASES_KEY, []);
    const rows = [["fecha","caso","edad","eg","hb","vcm","ferritina","score","riesgo","clasificacion","resumen"]];
    cases.forEach((item) => rows.push([
      item.createdAt, item.input.caseId, item.input.edad, item.input.eg, item.input.hb, item.input.vcm, item.input.ferritina,
      item.result.score, item.result.risk.name, item.result.severity.name, item.result.summary
    ]));
    const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g,'""')}"`).join(",")).join("\n");
    download("historial-anemia-riesgo-neonatal.csv", "text/csv;charset=utf-8", csv);
  }

  function renderConfig(){
    const config = getConfig();
    configForm.innerHTML = Object.keys(AnemiaRiskEngine.DEFAULT_CONFIG).map((key) => `
      <label>${configLabels[key] || key}
        <input type="number" step="0.1" name="${key}" value="${escapeHtml(config[key])}">
      </label>
    `).join("");
  }

  function saveConfig(){
    const config = {};
    new FormData(configForm).forEach((value, key) => { config[key] = Number(value); });
    writeJson(CONFIG_KEY, config);
    latest = analyze();
    toast("Configuracion actualizada.");
  }

  function demo(){
    const values = {
      caseId:"DEMO-ANEMIA-001", edad:24, eg:35, controles:3, multiple:0, prematuro:0, bpn_prev:1, hta:0, dm:0, infeccion:0, sangrado:0, sintomas:1, adherencia:1,
      hb:7.8, hto:25, vcm:74, hcm:23, chcm:30, rdw:17.5, rbc:3.7, plaquetas:260, leucos:8.8,
      ferritina:12, hierro:38, tibc:430, tsat:"", pcr:"", creatinina:"", b12:"", folato:"", retic:"", ldh:"", bili:"", hapto:"", coombs:"", frotis:"micro", hba2:"", hbs:"", familia:0, notes:"Caso demostrativo de anemia moderada microcitica con ferropenia probable."
    };
    Object.entries(values).forEach(([key, value]) => {
      const field = form.elements[key] || document.getElementById(key);
      if(field) field.value = value;
    });
    analyze();
  }

  function toast(message){
    const el = document.createElement("div");
    el.className = "toast";
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 2400);
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    analyze();
  });
  form.addEventListener("reset", () => {
    setTimeout(() => {
      latest = null;
      resultContent.className = "empty-state";
      resultContent.textContent = "Complete los datos y presione Analizar caso.";
    }, 0);
  });
  document.getElementById("saveCase").addEventListener("click", saveCurrent);
  document.getElementById("loadDemo").addEventListener("click", demo);
  document.getElementById("printReport").addEventListener("click", () => window.print());
  document.getElementById("exportJson").addEventListener("click", () => download("historial-anemia-riesgo-neonatal.json", "application/json", JSON.stringify(readJson(CASES_KEY, []), null, 2)));
  document.getElementById("exportCsv").addEventListener("click", exportCsv);
  document.getElementById("clearHistory").addEventListener("click", () => {
    if(confirm("Desea borrar el historial local?")){
      writeJson(CASES_KEY, []);
      renderHistory();
      toast("Historial borrado.");
    }
  });
  document.getElementById("resetConfig").addEventListener("click", () => {
    localStorage.removeItem(CONFIG_KEY);
    renderConfig();
    analyze();
    toast("Umbrales restaurados.");
  });
  configForm.addEventListener("input", saveConfig);
  historyBody.addEventListener("click", (event) => {
    const button = event.target.closest("[data-load]");
    if(button) loadCase(Number(button.dataset.load));
  });

  renderConfig();
  renderHistory();
  analyze();
})();

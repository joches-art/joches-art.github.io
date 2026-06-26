(function(global){
  "use strict";

  const DEFAULT_CONFIG = {
    ferritinLow: 30,
    ferritinVeryLow: 15,
    tsatLow: 20,
    pcrHigh: 5,
    b12Low: 200,
    folateLow: 4,
    reticHigh: 2.5,
    ldhHigh: 250,
    bilirubinHigh: 1.2,
    haptoglobinLow: 25,
    hba2High: 3.5
  };

  function numberOrNull(value){
    if(value === "" || value === null || typeof value === "undefined") return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function bool(value){
    return value === true || value === 1 || value === "1" || value === "si";
  }

  function round(value, digits){
    const factor = Math.pow(10, digits || 1);
    return Math.round(value * factor) / factor;
  }

  function trimester(weeks){
    const eg = numberOrNull(weeks);
    if(!eg || eg < 1) return {label:"No definido", key:0, hbCut:null, hctCut:null};
    if(eg < 14) return {label:"Primer trimestre", key:1, hbCut:11.0, hctCut:33};
    if(eg < 28) return {label:"Segundo trimestre", key:2, hbCut:10.5, hctCut:32};
    return {label:"Tercer trimestre", key:3, hbCut:11.0, hctCut:33};
  }

  function anemiaSeverity(hb, tri){
    const value = numberOrNull(hb);
    if(value === null || !tri.hbCut) return {name:"No clasificable", level:"neutral", points:0, anemia:false};
    if(value >= tri.hbCut) return {name:"Sin anemia por Hb para el trimestre", level:"low", points:0, anemia:false};
    if(value < 7) return {name:"Anemia severa", level:"critical", points:5, anemia:true};
    if(value < 10) return {name:"Anemia moderada", level:"high", points:3, anemia:true};
    return {name:"Anemia leve", level:"medium", points:1, anemia:true};
  }

  function morphology(vcm){
    const value = numberOrNull(vcm);
    if(value === null) return {name:"No clasificable", level:"neutral"};
    if(value < 80) return {name:"Microcitica", level:"info"};
    if(value > 100) return {name:"Macrocitica", level:"medium"};
    return {name:"Normocitica", level:"low"};
  }

  function normalizeInput(input){
    const src = input || {};
    const out = {};
    Object.keys(src).forEach((key) => {
      const value = src[key];
      if(typeof value === "string") out[key] = value.trim();
      else out[key] = value;
    });
    return out;
  }

  function calculate(input, customConfig){
    const data = normalizeInput(input);
    const config = Object.assign({}, DEFAULT_CONFIG, customConfig || {});
    const missingRequired = [];
    const hb = numberOrNull(data.hb);
    const eg = numberOrNull(data.eg);
    if(hb === null) missingRequired.push("Hemoglobina materna");
    if(eg === null) missingRequired.push("Edad gestacional");
    if(missingRequired.length){
      return {ok:false, errors:missingRequired, config};
    }

    const tri = trimester(eg);
    const sev = anemiaSeverity(hb, tri);
    const mor = morphology(data.vcm);
    const ferritin = numberOrNull(data.ferritina);
    const iron = numberOrNull(data.hierro);
    const tibc = numberOrNull(data.tibc);
    const tsatInput = numberOrNull(data.tsat);
    const tsat = tsatInput !== null ? tsatInput : (iron !== null && tibc !== null && tibc > 0 ? (iron / tibc) * 100 : null);
    const pcr = numberOrNull(data.pcr);
    const b12 = numberOrNull(data.b12);
    const folate = numberOrNull(data.folato);
    const retic = numberOrNull(data.retic);
    const ldh = numberOrNull(data.ldh);
    const bilirubin = numberOrNull(data.bili);
    const haptoglobin = numberOrNull(data.hapto);
    const hba2 = numberOrNull(data.hba2);
    const vcm = numberOrNull(data.vcm);
    const rdw = numberOrNull(data.rdw);
    const rbc = numberOrNull(data.rbc);
    const controls = numberOrNull(data.controles);
    const age = numberOrNull(data.edad);
    const symptoms = numberOrNull(data.sintomas) || 0;
    const adherence = numberOrNull(data.adherencia) || 0;

    const flags = {
      ferritinLow: ferritin !== null && ferritin < config.ferritinLow,
      ferritinVeryLow: ferritin !== null && ferritin < config.ferritinVeryLow,
      tsatLow: tsat !== null && tsat < config.tsatLow,
      pcrHigh: pcr !== null && pcr > config.pcrHigh,
      b12Low: b12 !== null && b12 < config.b12Low,
      folateLow: folate !== null && folate < config.folateLow,
      reticHigh: retic !== null && retic > config.reticHigh,
      ldhHigh: ldh !== null && ldh > config.ldhHigh,
      bilirubinHigh: bilirubin !== null && bilirubin > config.bilirubinHigh,
      haptoglobinLow: haptoglobin !== null && haptoglobin < config.haptoglobinLow,
      coombsPositive: data.coombs === "pos",
      smearHemolysis: data.frotis === "hemolisis",
      smearSickle: data.frotis === "sickle",
      hba2High: hba2 !== null && hba2 > config.hba2High,
      hbsDetected: data.hbs === "1",
      familyHistory: bool(data.familia),
      bleeding: bool(data.sangrado),
      infection: bool(data.infeccion)
    };

    const micro = vcm !== null && vcm < 80;
    const macro = vcm !== null && vcm > 100;
    const probable = {
      ferropenia: sev.anemia && (flags.ferritinLow || (micro && flags.tsatLow) || (micro && rdw !== null && rdw > 15)),
      megaloblastica: sev.anemia && (macro || flags.b12Low || flags.folateLow),
      inflamatoria: sev.anemia && ((flags.pcrHigh || flags.infection) && ferritin !== null && ferritin >= config.ferritinLow && (flags.tsatLow || (iron !== null && iron < 60))),
      hemolisis: sev.anemia && (flags.reticHigh && (flags.ldhHigh || flags.bilirubinHigh || flags.haptoglobinLow || flags.coombsPositive || flags.smearHemolysis)),
      hemoglobinopatia: sev.anemia && ((micro && ferritin !== null && ferritin >= config.ferritinLow && ((rbc !== null && rbc >= 5) || flags.familyHistory)) || flags.hba2High || flags.hbsDetected || flags.smearSickle),
      perdida: sev.anemia && flags.bleeding
    };
    probable.mixta = Object.keys(probable).filter((key) => key !== "mixta" && probable[key]).length >= 2;
    probable.deficienciaHierroSinAnemia = !sev.anemia && flags.ferritinLow;

    const etiologies = [];
    const interpretation = [];
    if(probable.deficienciaHierroSinAnemia){
      etiologies.push({label:"Deficiencia de hierro sin anemia", level:"medium"});
      interpretation.push("La Hb no cumple criterio de anemia para el trimestre, pero la ferritina baja sugiere reservas de hierro disminuidas.");
    }
    if(!sev.anemia && !probable.deficienciaHierroSinAnemia){
      etiologies.push({label:"Sin anemia patologica por Hb", level:"low"});
      interpretation.push("La hemoglobina esta por encima del umbral de anemia para el trimestre ingresado.");
    }
    if(probable.ferropenia){
      etiologies.push({label:"Probable anemia ferropenica", level:flags.ferritinVeryLow ? "high" : "medium"});
      interpretation.push("Patron compatible con ferropenia por Hb baja con ferritina baja, TSAT baja o microcitosis/anisocitosis.");
    }
    if(probable.megaloblastica){
      if(flags.b12Low) etiologies.push({label:"Deficit probable de vitamina B12", level:"medium"});
      if(flags.folateLow) etiologies.push({label:"Deficit probable de folato", level:"medium"});
      if(!flags.b12Low && !flags.folateLow) etiologies.push({label:"Macrocitosis: descartar B12/folato", level:"medium"});
      interpretation.push("El patron macrocitico o valores bajos de B12/folato orientan a anemia megaloblastica.");
    }
    if(probable.inflamatoria){
      etiologies.push({label:"Probable anemia inflamatoria", level:"medium"});
      interpretation.push("Inflamacion, ferritina no baja y TSAT baja sugieren componente inflamatorio o enfermedad cronica.");
    }
    if(probable.hemolisis){
      etiologies.push({label:"Alerta: probable hemolisis", level:"critical"});
      interpretation.push("Reticulocitos elevados con marcadores de hemolisis ameritan valoracion medica prioritaria.");
    }
    if(probable.hemoglobinopatia){
      etiologies.push({label:"Sospecha de hemoglobinopatia", level:"high"});
      interpretation.push("Microcitosis con ferritina no baja, HbA2 elevada, HbS/variante o antecedente familiar orienta a hemoglobinopatia.");
    }
    if(probable.perdida){
      etiologies.push({label:"Perdida sanguinea activa o reciente", level:"critical"});
      interpretation.push("El sangrado actual cambia la prioridad clinica y requiere evaluar causa obstetrica u otra fuente.");
    }
    if(probable.mixta){
      etiologies.push({label:"Probable anemia mixta", level:"high"});
      interpretation.push("Hay dos o mas patrones etiologicos; no conviene asumir una causa unica sin completar estudios.");
    }
    if(sev.anemia && etiologies.length === 0){
      etiologies.push({label:"Anemia: etiologia no definida", level:"neutral"});
      interpretation.push("Se requiere ampliar estudios para clasificar la causa probable.");
    }

    const exams = [];
    if(ferritin === null) exams.push("Ferritina serica para evaluar reservas de hierro.");
    if(tsat === null || iron === null || tibc === null) exams.push("Hierro serico, TIBC/transferrina y saturacion de transferrina.");
    if((ferritin !== null && ferritin >= config.ferritinLow && sev.anemia) && pcr === null) exams.push("PCR para interpretar ferritina y descartar componente inflamatorio.");
    if((macro || probable.megaloblastica) && (b12 === null || folate === null)) exams.push("Vitamina B12 y folato serico.");
    if(sev.anemia && retic === null) exams.push("Reticulocitos para diferenciar baja produccion, perdida o hemolisis.");
    if((flags.reticHigh || probable.hemolisis || flags.smearHemolysis) && (ldh === null || bilirubin === null || haptoglobin === null || !data.coombs)) exams.push("Panel de hemolisis: LDH, bilirrubina indirecta, haptoglobina y Coombs directo.");
    if((micro && !flags.ferritinLow) || probable.hemoglobinopatia || flags.familyHistory) exams.push("Electroforesis de hemoglobina o HPLC.");
    if(sev.anemia && !data.frotis) exams.push("Frotis de sangre periferica.");
    if(flags.bleeding) exams.push("Evaluacion de sangrado y estabilidad hemodinamica segun criterio.");
    if(sev.anemia && numberOrNull(data.creatinina) === null) exams.push("Creatinina si hay sospecha renal o anemia persistente.");
    if(exams.length === 0) exams.push("No se identifican examenes faltantes criticos con los datos ingresados.");

    let score = sev.points;
    if(sev.anemia && sev.points >= 3 && eg >= 32) score += 2;
    if(controls !== null){
      if(controls <= 3) score += 2;
      else if(controls < 6) score += 1;
    }
    let obstetric = 0;
    if(bool(data.prematuro)) obstetric += 2;
    if(bool(data.bpn_prev)) obstetric += 2;
    score += Math.min(obstetric, 3);
    if(age !== null && (age < 18 || age > 35)) score += 1;
    if(bool(data.multiple)) score += 2;
    if(bool(data.hta)) score += 2;
    if(bool(data.dm)) score += 1;
    if(flags.infection || flags.pcrHigh) score += 1;
    if(flags.bleeding) score += 2;
    score += adherence;
    if(flags.ferritinLow) score += 1;
    if(flags.b12Low || flags.folateLow) score += 1;
    if(probable.hemolisis) score += 3;
    if(symptoms === 1) score += 1;
    if(symptoms === 2) score += 3;

    let risk = {name:"Riesgo neonatal bajo", level:"low", percent:25};
    if(score >= 4 && score <= 7) risk = {name:"Riesgo neonatal moderado", level:"medium", percent:55};
    if(score >= 8) risk = {name:"Riesgo neonatal alto", level:"high", percent:82};
    if(hb < 7 || probable.hemolisis || (flags.bleeding && symptoms >= 1) || symptoms === 2) risk = {name:"Prioridad clinica critica", level:"critical", percent:100};

    const actionsByLevel = {
      low: ["Continuar control prenatal regular.", "Mantener suplementacion indicada por protocolo local.", "Repetir hemograma segun control prenatal."],
      medium: ["Programar revaloracion clinica cercana.", "Confirmar etiologia con examenes sugeridos.", "Reforzar adherencia, tolerancia y consejeria alimentaria.", "Documentar seguimiento de Hb y sintomas."],
      high: ["Revaloracion obstetrica prioritaria.", "Control prenatal estrecho y vigilancia fetal segun criterio medico.", "Completar estudios etiologicos.", "Valorar interconsulta con obstetricia/hematologia.", "Preparar plan neonatal si el parto esta proximo."],
      critical: ["Evaluacion medica urgente o prioritaria.", "Descartar sangrado activo, hemolisis u otra causa aguda.", "Considerar manejo hospitalario segun criterio medico.", "No diferir la atencion por falta de examenes complementarios si hay datos de alarma."]
    };

    const alerts = [];
    if(hb < 7) alerts.push("Hb menor de 7 g/dL.");
    if(symptoms === 2) alerts.push("Sintomas severos reportados.");
    if(probable.hemolisis) alerts.push("Patron compatible con hemolisis.");
    if(flags.bleeding) alerts.push("Sangrado actual.");
    if(eg >= 37 && sev.anemia) alerts.push("Gestacion a termino con anemia.");

    const outcomes = sev.anemia ? [
      "Bajo peso al nacer.",
      "Parto pretermino, especialmente con anemia moderada/severa o comorbilidades.",
      "Mayor necesidad de vigilancia neonatal si coexisten controles insuficientes, sangrado, infeccion o antecedente obstetrico."
    ] : ["No se identifica anemia por Hb con los datos actuales; mantener vigilancia prenatal."];
    if(hb < 7 || risk.level === "critical") outcomes.push("Mayor riesgo de compromiso materno-fetal y necesidad de atencion prioritaria.");

    const completenessFields = [hb, eg, vcm, ferritin, tsat, b12, folate, retic, ldh, bilirubin, haptoglobin];
    const completeness = Math.round(completenessFields.filter((value) => value !== null).length / completenessFields.length * 100);

    return {
      ok:true,
      config,
      trimester:tri,
      severity:sev,
      morphology:mor,
      calculated:{tsat: tsat === null ? null : round(tsat, 1), tsatWasCalculated: tsatInput === null && iron !== null && tibc !== null},
      flags,
      probable,
      etiologies,
      interpretation,
      exams,
      score,
      risk,
      actions: actionsByLevel[risk.level],
      alerts,
      outcomes,
      completeness,
      summary: `${sev.name}; ${risk.name}; score ${score}`
    };
  }

  global.AnemiaRiskEngine = {DEFAULT_CONFIG, calculate, trimester, anemiaSeverity, morphology, numberOrNull};
})(window);

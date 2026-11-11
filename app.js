(() => {
  "use strict";

  const ROOT_ID = "archibarthes-root";
  const APP_VERSION = "1.4.0";
  const DEFAULT_DB = "GF_Copie_EcoleCentrale";
  const BASE_RECTYPE = "102";
  const PAGE_LIMIT = 20;
  const SEARCH_DEBOUNCE_MS = 300;
  const MOUNT_POLL_INTERVAL_MS = 100;
  const MOUNT_TIMEOUT_MS = 30000;

  const ALLOWED_HTML_TAGS = new Set([
    "p",
    "br",
    "b",
    "strong",
    "i",
    "em",
    "u",
    "sup",
    "sub",
    "hr",
    "blockquote",
    "ul",
    "ol",
    "li",
    "span",
    "div",
    "table",
    "thead",
    "tbody",
    "tr",
    "td",
    "th",
    "a"
  ]);

  const DROP_CONTENT_TAGS = new Set([
    "script",
    "style",
    "iframe",
    "object",
    "embed",
    "noscript",
    "svg",
    "math",
    "template"
  ]);

  const FRENCH_MONTHS = [
    "janvier",
    "février",
    "mars",
    "avril",
    "mai",
    "juin",
    "juillet",
    "août",
    "septembre",
    "octobre",
    "novembre",
    "décembre"
  ];

  const SUPPORTS_NATIVE_POPOVER =
    typeof HTMLElement !== "undefined" &&
    Object.hasOwn(HTMLElement.prototype, "popover");

  const SUPPORTS_ANCHOR_AREA =
    typeof CSS !== "undefined" &&
    typeof CSS.supports === "function" &&
    CSS.supports("position-area: block-end");

  function resolveConfig(root) {
    const attrDb = root.getAttribute("data-db");
    const attrBase = root.getAttribute("data-api-base");
    const globalCfg =
      typeof window !== "undefined" && window.ARCHIBARTHES_CONFIG
        ? window.ARCHIBARTHES_CONFIG
        : {};

    const db = (attrDb || globalCfg.db || DEFAULT_DB).trim();
    let heuristBase = "https://heurist.huma-num.fr/heurist";

    if (attrBase || globalCfg.apiBase) {
      heuristBase = String(attrBase || globalCfg.apiBase).replace(/\/+$/, "");
    } else if (
      typeof window !== "undefined" &&
      window.location &&
      /^https?:$/i.test(window.location.protocol)
    ) {
      const pathMatch = window.location.pathname.match(/^(.*?\/heurist)(?:\/|$)/i);
      const isHeuristHost = /heurist/i.test(window.location.hostname);
      if (pathMatch || isHeuristHost) {
        const prefix = pathMatch ? pathMatch[1] : "/heurist";
        heuristBase = window.location.origin + prefix;
      }
    }

    return {
      db,
      heuristBase,
      recordOutputUrl: `${heuristBase}/hserv/controller/record_output.php`,
      fileDownloadUrl: `${heuristBase}/hserv/controller/fileDownload.php`,
      noticeViewUrl: `${heuristBase}/viewers/record/renderRecordData.php`
    };
  }

  function normalizeForSearch(str) {
    return String(str || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  }

  function extractTextFromHtml(html) {
    if (!html) return "";
    if (!/<[a-z][\s\S]*>/i.test(html)) {
      return String(html).trim();
    }
    const parser = new DOMParser();
    const doc = parser.parseFromString(String(html), "text/html");
    return (doc.body.textContent || "").replace(/\s+/g, " ").trim();
  }

  function collectDetailEntries(record) {
    const entries = [];
    if (!record || typeof record !== "object") return entries;

    if (Array.isArray(record.details)) {
      for (const item of record.details) {
        if (!item || typeof item !== "object") continue;
        entries.push({
          dtyId: String(item.dty_ID ?? item.dtyId ?? item.id ?? ""),
          fieldName: String(item.fieldName ?? item.name ?? ""),
          fieldType: String(item.fieldType ?? item.type ?? ""),
          value: item.value ?? item.val ?? null,
          termLabel: item.termLabel ? String(item.termLabel) : ""
        });
      }
    } else if (record.details && typeof record.details === "object") {
      for (const [key, group] of Object.entries(record.details)) {
        if (Array.isArray(group)) {
          for (const val of group) {
            entries.push({
              dtyId: String(key),
              fieldName: "",
              fieldType: "",
              value: val,
              termLabel: ""
            });
          }
        } else if (group && typeof group === "object") {
          for (const val of Object.values(group)) {
            entries.push({
              dtyId: String(key),
              fieldName: "",
              fieldType: "",
              value: val,
              termLabel: ""
            });
          }
        } else {
          entries.push({
            dtyId: String(key),
            fieldName: "",
            fieldType: "",
            value: group,
            termLabel: ""
          });
        }
      }
    }

    if (record.d && typeof record.d === "object") {
      for (const [key, arr] of Object.entries(record.d)) {
        const list = Array.isArray(arr) ? arr : [arr];
        for (const val of list) {
          entries.push({
            dtyId: String(key),
            fieldName: "",
            fieldType: "",
            value: val,
            termLabel: ""
          });
        }
      }
    }

    return entries;
  }

  function formatIsoDateFr(iso) {
    const m = String(iso || "").match(/^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?/);
    if (!m) return String(iso || "");
    const year = m[1];
    const month = m[2] ? parseInt(m[2], 10) : null;
    const day = m[3] ? parseInt(m[3], 10) : null;

    if (month && day && month >= 1 && month <= 12) {
      const dayLabel = day === 1 ? "1er" : String(day);
      return `${dayLabel} ${FRENCH_MONTHS[month - 1]} ${year}`;
    }
    if (month && month >= 1 && month <= 12) {
      const monthName = FRENCH_MONTHS[month - 1];
      return `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`;
    }
    return year;
  }

  function parseDateValue(rawVal) {
    if (rawVal === null || rawVal === undefined || rawVal === "") {
      return null;
    }

    if (Array.isArray(rawVal)) {
      for (const item of rawVal) {
        const parsed = parseDateValue(item);
        if (parsed) return parsed;
      }
      return null;
    }

    if (typeof rawVal === "object") {
      if (rawVal.timestamp && rawVal.timestamp.in) {
        const base = String(rawVal.timestamp.in).trim();
        const yearMatch = base.match(/\b(\d{4})\b/);
        const prefix = rawVal.timestamp.circa ? "v. " : "";
        return {
          raw: base,
          display: prefix + formatIsoDateFr(base),
          year: yearMatch ? yearMatch[1] : ""
        };
      }
      if (rawVal.start || rawVal.end) {
        const startStr = rawVal.start?.earliest || rawVal.start?.latest || "";
        const endStr = rawVal.end?.latest || rawVal.end?.earliest || "";
        const yearMatch = (startStr || endStr).match(/\b(\d{4})\b/);
        const sm = String(startStr).match(/^(\d{4})-(\d{2})-(\d{2})$/);
        const em = String(endStr).match(/^(\d{4})-(\d{2})-(\d{2})$/);
        let display = "";
        if (sm && em && sm[1] === em[1] && sm[2] === em[2] && sm[3] === "01") {
          const monthIdx = parseInt(sm[2], 10) - 1;
          const mName = FRENCH_MONTHS[monthIdx] || sm[2];
          display = `${mName.charAt(0).toUpperCase() + mName.slice(1)} ${sm[1]}`;
        } else if (startStr && endStr && startStr !== endStr) {
          display = `${formatIsoDateFr(startStr)} – ${formatIsoDateFr(endStr)}`;
        } else {
          display = formatIsoDateFr(startStr || endStr);
        }
        return {
          raw: startStr || endStr,
          display: display || "Date approximative",
          year: yearMatch ? yearMatch[1] : ""
        };
      }
      if (rawVal.value) {
        return parseDateValue(rawVal.value);
      }
      return null;
    }

    const str = String(rawVal).trim();
    if (!str) return null;
    const yearMatch = str.match(/\b(\d{4})\b/);
    return {
      raw: str,
      display: formatIsoDateFr(str),
      year: yearMatch ? yearMatch[1] : ""
    };
  }

  function extractEntityList(entries, matchers, directValues) {
    const items = [];
    const seen = new Set();

    const addItem = (val, fieldId) => {
      if (val === null || val === undefined || val === "") return;
      if (Array.isArray(val)) {
        for (const v of val) addItem(v, fieldId);
        return;
      }
      if (typeof val === "object") {
        const id = val.id !== undefined && val.id !== null ? String(val.id) : "";
        const label = String(
          val.title ?? val.label ?? val.name ?? val.value ?? ""
        )
          .replace(/\s+/g, " ")
          .trim();
        if (!label) return;
        const key = `${id}|${label.toLowerCase()}`;
        if (seen.has(key)) return;
        seen.add(key);
        items.push({ id, label, fieldId });
        return;
      }
      const label = String(val).replace(/\s+/g, " ").trim();
      if (!label) return;
      const key = `|${label.toLowerCase()}`;
      if (seen.has(key)) return;
      seen.add(key);
      items.push({ id: "", label, fieldId });
    };

    for (const val of directValues) {
      addItem(val, "");
    }

    for (const det of entries) {
      if (matchers(det)) {
        const labelCandidate =
          det.termLabel && det.termLabel.trim() ? det.termLabel : det.value;
        if (
          typeof det.value === "object" &&
          det.value !== null &&
          !Array.isArray(det.value)
        ) {
          addItem(det.value, det.dtyId);
        } else {
          addItem(labelCandidate, det.dtyId);
        }
      }
    }

    return items;
  }

  function resolveScanUrl(val, config) {
    if (!val) return null;

    if (typeof val === "string") {
      const s = val.trim();
      if (!s) return null;
      if (/^(https?:)?\/\//i.test(s) || s.startsWith("/")) {
        return { url: s, filename: "" };
      }
      if (/^[a-f0-9]{20,}$/i.test(s)) {
        return {
          url: `${config.fileDownloadUrl}?db=${encodeURIComponent(config.db)}&file=${encodeURIComponent(s)}`,
          filename: ""
        };
      }
      return null;
    }

    if (Array.isArray(val)) {
      if (typeof val[0] === "string" && val[0].trim()) {
        return resolveScanUrl(val[0], config);
      }
      return null;
    }

    if (typeof val === "object") {
      const fileObj = val.file && typeof val.file === "object" ? val.file : val;
      const extUrl = fileObj.ulf_ExternalFileReference || fileObj.url || val.url;
      if (typeof extUrl === "string" && /^(https?:)?\/\//i.test(extUrl.trim())) {
        return {
          url: extUrl.trim(),
          filename: String(fileObj.ulf_OrigFileName || "")
        };
      }
      const obfuscatedId =
        val.fileid ||
        fileObj.ulf_ObfuscatedFileID ||
        fileObj.fileid ||
        fileObj.id;
      if (obfuscatedId) {
        return {
          url: `${config.fileDownloadUrl}?db=${encodeURIComponent(config.db)}&file=${encodeURIComponent(String(obfuscatedId))}`,
          filename: String(fileObj.ulf_OrigFileName || "")
        };
      }
    }

    return null;
  }

  function normalizeRecord(raw, config) {
    const id = String(raw.rec_ID ?? raw.recID ?? raw.id ?? "");
    const entries = collectDetailEntries(raw);

    // Numéro BnF
    let numero = "";
    const rawNum = raw.numero ?? raw.f1056;
    if (rawNum !== undefined && rawNum !== null && String(rawNum).trim()) {
      numero = String(rawNum).trim();
    } else {
      const numEntry = entries.find(
        (d) => d.dtyId === "1056" || /^num[ée]ro$/i.test(d.fieldName.trim())
      );
      if (numEntry && numEntry.value !== null && numEntry.value !== undefined) {
        numero = String(numEntry.value).trim();
      }
    }
    if (!numero) {
      numero = id || "—";
    }

    // Titre
    const title =
      String(raw.rec_Title ?? raw.recTitle ?? raw.title ?? "").trim() ||
      "Note sans titre";

    // Date
    let dateInfo = parseDateValue(raw.Date ?? raw.f9);
    if (!dateInfo) {
      const dateEntry = entries.find(
        (d) =>
          d.dtyId === "9" ||
          d.fieldType === "date" ||
          /date|ann[ée]e/i.test(d.fieldName)
      );
      if (dateEntry) {
        dateInfo = parseDateValue(dateEntry.value);
      }
    }
    if (!dateInfo) {
      for (const [k, v] of Object.entries(raw)) {
        if (/date|annee|année/i.test(k) && v) {
          dateInfo = parseDateValue(v);
          if (dateInfo) break;
        }
      }
    }
    if (!dateInfo) {
      dateInfo = { raw: "", display: "Sans date", year: "" };
    }

    // Scans du manuscrit
    const scans = [];
    const seenScanUrls = new Set();
    const pushScan = (candidate) => {
      const resolved = resolveScanUrl(candidate, config);
      if (resolved && resolved.url && !seenScanUrls.has(resolved.url)) {
        seenScanUrls.add(resolved.url);
        scans.push(resolved);
      }
    };

    pushScan(raw.f1071_originalvalue);
    pushScan(raw.f1071);

    const primaryScanEntries = entries.filter(
      (d) =>
        d.dtyId === "1071" ||
        /num[ée]risation/i.test(d.fieldName)
    );
    for (const det of primaryScanEntries) {
      pushScan(det.value);
    }

    if (scans.length === 0) {
      const fallbackScanEntries = entries.filter(
        (d) =>
          d.dtyId === "39" ||
          d.fieldType === "file" ||
          /scan|image/i.test(d.fieldName)
      );
      for (const det of fallbackScanEntries) {
        pushScan(det.value);
      }
    }

    // Transcription (priorité stricte à f4 / f4s / retranscription, en excluant le crédit dty_ID=964)
    let transcriptionHtml = "";
    if (typeof raw.f4 === "string" && raw.f4.trim()) {
      transcriptionHtml = raw.f4;
    } else if (Array.isArray(raw.f4s) && raw.f4s.length > 0) {
      transcriptionHtml = raw.f4s.filter(Boolean).join(" ");
    } else {
      const f4Entries = entries.filter(
        (d) => d.dtyId === "4" || /^retranscription$/i.test(d.fieldName.trim())
      );
      if (f4Entries.length > 0) {
        transcriptionHtml = f4Entries
          .map((d) => (d.value !== null && d.value !== undefined ? String(d.value) : ""))
          .filter((s) => s.trim())
          .join("\n");
      }
    }

    if (!transcriptionHtml) {
      const fallbackTextEntry = entries.find(
        (d) =>
          d.dtyId !== "964" &&
          /retranscription|transcription|texte/i.test(d.fieldName) &&
          typeof d.value === "string" &&
          d.value.trim()
      );
      if (fallbackTextEntry) {
        transcriptionHtml = fallbackTextEntry.value;
      } else {
        for (const [k, v] of Object.entries(raw)) {
          if (
            /transcription|texte/i.test(k) &&
            typeof v === "string" &&
            v.trim()
          ) {
            transcriptionHtml = v;
            break;
          }
        }
      }
    }

    // Personnes (f16 Personne, f15 Auteurs/artistes cités, f573 fallback)
    const persons = extractEntityList(
      entries,
      (d) =>
        d.dtyId === "16" ||
        d.dtyId === "15" ||
        d.dtyId === "573" ||
        /personne|auteur/i.test(d.fieldName),
      [raw.Personne, raw.f573]
    );

    // Lieux (f238 Lieux, f375 fallback)
    const places = extractEntityList(
      entries,
      (d) =>
        d.dtyId === "238" ||
        d.dtyId === "375" ||
        /^lieux?$/i.test(d.fieldName.trim()),
      [raw.Lieux, raw.f375]
    );

    // Genres (f1073 genre, f1107 fallback)
    const genres = extractEntityList(
      entries,
      (d) =>
        d.dtyId === "1073" ||
        d.dtyId === "1107" ||
        /^genre$/i.test(d.fieldName.trim()),
      [raw.genre, raw.f1107]
    ).map((g) => ({
      ...g,
      label: g.label.replace(/\.\(/g, " · (")
    }));

    // Cote BnF (f1218 ou f977 Cote d'origine, sinon Fonds Roland Barthes)
    let cote = "";
    const directCote = raw.f1218;
    if (typeof directCote === "string" && directCote.trim()) {
      cote = directCote.trim();
    } else {
      const coteEntry = entries.find(
        (d) =>
          d.dtyId === "1218" ||
          d.dtyId === "977" ||
          /cote/i.test(d.fieldName)
      );
      if (coteEntry && coteEntry.value) {
        const valStr =
          typeof coteEntry.value === "object"
            ? String(coteEntry.value.title ?? coteEntry.value.label ?? "").trim()
            : String(coteEntry.value).trim();
        if (valStr) {
          cote = /^fonds/i.test(valStr)
            ? valStr
            : `Fonds Roland Barthes — ${valStr}`;
        }
      }
    }
    if (!cote) {
      cote = "Fonds Roland Barthes";
    }

    // URL vers la notice complète
    const rawRecUrl = String(raw.recURL ?? raw.rec_URL ?? "").trim();
    const noticeUrl =
      rawRecUrl && (/^https?:\/\//i.test(rawRecUrl) || rawRecUrl.startsWith("/"))
        ? rawRecUrl
        : `${config.noticeViewUrl}?db=${encodeURIComponent(config.db)}&recID=${encodeURIComponent(id)}`;

    return {
      id,
      numero,
      title,
      date: dateInfo,
      scans,
      transcriptionHtml,
      transcriptionPlain: extractTextFromHtml(transcriptionHtml),
      persons,
      places,
      genres,
      cote,
      noticeUrl
    };
  }

  function sanitizeNodeInto(sourceNode, targetParent, recordId) {
    if (sourceNode.nodeType === Node.TEXT_NODE) {
      targetParent.appendChild(document.createTextNode(sourceNode.nodeValue || ""));
      return;
    }

    if (sourceNode.nodeType !== Node.ELEMENT_NODE) return;

    const tag = sourceNode.tagName.toLowerCase();
    if (DROP_CONTENT_TAGS.has(tag)) return;

    if (!ALLOWED_HTML_TAGS.has(tag)) {
      for (const child of sourceNode.childNodes) {
        sanitizeNodeInto(child, targetParent, recordId);
      }
      return;
    }

    const cleanEl = document.createElement(tag);

    if (tag === "a") {
      const href = (sourceNode.getAttribute("href") || "").trim();
      const nameAttr = (sourceNode.getAttribute("name") || "").trim();
      const idAttr = (sourceNode.getAttribute("id") || "").trim();

      if (href.startsWith("#") && href.length > 1) {
        cleanEl.setAttribute("href", `#ab-${recordId}-${href.slice(1)}`);
      } else if (/^https?:\/\//i.test(href)) {
        cleanEl.setAttribute("href", href);
        cleanEl.setAttribute("target", "_blank");
        cleanEl.setAttribute("rel", "noopener noreferrer");
      }

      if (idAttr) {
        cleanEl.setAttribute("id", `ab-${recordId}-${idAttr}`);
      } else if (nameAttr) {
        cleanEl.setAttribute("id", `ab-${recordId}-${nameAttr}`);
      }
    }

    for (const child of sourceNode.childNodes) {
      sanitizeNodeInto(child, cleanEl, recordId);
    }

    targetParent.appendChild(cleanEl);
  }

  function finalizeSanitizedLinks(container, recordId) {
    const anchors = container.querySelectorAll("a");
    for (const a of anchors) {
      const href = (a.getAttribute("href") || "").trim();
      const idAttr = (a.getAttribute("id") || "").trim();
      const nameAttr = (a.getAttribute("name") || "").trim();

      if (idAttr && !idAttr.startsWith(`ab-${recordId}-`)) {
        a.setAttribute("id", `ab-${recordId}-${idAttr}`);
      } else if (!idAttr && nameAttr) {
        a.setAttribute("id", `ab-${recordId}-${nameAttr}`);
      }
      a.removeAttribute("name");

      if (href.startsWith("#") && href.length > 1) {
        const targetSlug = href.slice(1);
        if (!targetSlug.startsWith(`ab-${recordId}-`)) {
          a.setAttribute("href", `#ab-${recordId}-${targetSlug}`);
        }
      } else if (/^https?:\/\//i.test(href)) {
        a.setAttribute("href", href);
        a.setAttribute("target", "_blank");
        a.setAttribute("rel", "noopener noreferrer");
      } else {
        a.removeAttribute("href");
      }
    }
  }

  function renderSanitizedTranscription(container, rawHtml, recordId) {
    container.replaceChildren();

    if (!rawHtml || !rawHtml.trim()) {
      const emptyP = document.createElement("p");
      emptyP.className = "ab-transcription-empty";
      emptyP.textContent = "Transcription non disponible pour cette fiche.";
      container.appendChild(emptyP);
      return;
    }

    if (!/<[a-z][\s\S]*>/i.test(rawHtml)) {
      const paragraphs = rawHtml.split(/\r?\n+/).filter((p) => p.trim());
      for (const line of paragraphs) {
        const p = document.createElement("p");
        p.textContent = line.trim();
        container.appendChild(p);
      }
      return;
    }

    if (typeof Element !== "undefined" && "setHTML" in Element.prototype) {
      try {
        container.setHTML(rawHtml, {
          sanitizer: {
            elements: Array.from(ALLOWED_HTML_TAGS),
            attributes: ["href", "id", "name"]
          }
        });
        finalizeSanitizedLinks(container, recordId);
        if (container.textContent && container.textContent.trim()) {
          return;
        }
        container.replaceChildren();
      } catch (_err) {
        container.replaceChildren();
      }
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(rawHtml, "text/html");
    const frag = document.createDocumentFragment();

    for (const child of doc.body.childNodes) {
      sanitizeNodeInto(child, frag, recordId);
    }

    if (!frag.textContent || !frag.textContent.trim()) {
      const emptyP = document.createElement("p");
      emptyP.className = "ab-transcription-empty";
      emptyP.textContent = "Transcription non disponible pour cette fiche.";
      container.appendChild(emptyP);
      return;
    }

    container.appendChild(frag);
  }

  function buildFacetsFromRecords(records) {
    const dateCounts = new Map();
    const personMap = new Map();
    const placeMap = new Map();

    for (const rec of records) {
      if (rec.date && rec.date.year) {
        const y = rec.date.year;
        const entry = dateCounts.get(y) || {
          key: y,
          label: y,
          count: 0
        };
        entry.count += 1;
        dateCounts.set(y, entry);
      }

      for (const p of rec.persons) {
        const mapKey = p.id ? `id:${p.id}` : `name:${normalizeForSearch(p.label)}`;
        const entry = personMap.get(mapKey) || {
          key: mapKey,
          id: p.id,
          label: p.label,
          fieldIds: new Set(),
          count: 0
        };
        if (p.fieldId) entry.fieldIds.add(p.fieldId);
        entry.count += 1;
        personMap.set(mapKey, entry);
      }

      for (const l of rec.places) {
        const mapKey = l.id ? `id:${l.id}` : `name:${normalizeForSearch(l.label)}`;
        const entry = placeMap.get(mapKey) || {
          key: mapKey,
          id: l.id,
          label: l.label,
          fieldIds: new Set(),
          count: 0
        };
        if (l.fieldId) entry.fieldIds.add(l.fieldId);
        entry.count += 1;
        placeMap.set(mapKey, entry);
      }
    }

    const dates = Array.from(dateCounts.values()).sort((a, b) =>
      a.label.localeCompare(b.label, "fr", { numeric: true })
    );

    const sortByCountThenAlpha = (a, b) =>
      b.count - a.count || a.label.localeCompare(b.label, "fr");

    const persons = Array.from(personMap.values()).sort(sortByCountThenAlpha);
    const places = Array.from(placeMap.values()).sort(sortByCountThenAlpha);

    return { dates, persons, places };
  }

  function buildHeuristQuery(state, facets) {
    const clauses = [{ t: BASE_RECTYPE }];
    const humanParts = [`t:${BASE_RECTYPE}`];

    const tokens = state.searchQuery
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (tokens.length > 0) {
      for (const token of tokens) {
        clauses.push({ any: [{ title: token }, { f: token }] });
      }
      humanParts.push(`(${tokens.map((t) => `"${t}"`).join(" AND ")})`);
    }

    // Facette Date (OR entre dates sélectionnées)
    if (state.selected.dates.size > 0) {
      const selectedDates = Array.from(state.selected.dates);
      const datePredicates = selectedDates.map((y) => ({ "f:9": y }));
      clauses.push(
        datePredicates.length === 1 ? datePredicates[0] : { any: datePredicates }
      );
      humanParts.push(`(${selectedDates.map((y) => `f:9:${y}`).join(" OR ")})`);
    }

    // Facette Personne (OR entre personnes sélectionnées)
    if (state.selected.persons.size > 0) {
      const personByKey = new Map(facets.persons.map((p) => [p.key, p]));
      const personPredicates = [];
      const personLabels = [];

      for (const key of state.selected.persons) {
        const option = personByKey.get(key);
        if (!option) continue;
        personLabels.push(`"${option.label}"`);
        if (option.id) {
          const fieldIds = Array.from(option.fieldIds).filter((fid) =>
            ["15", "16", "573"].includes(fid)
          );
          const targets = fieldIds.length > 0 ? fieldIds : ["16"];
          for (const fid of targets) {
            personPredicates.push({ [`f:${fid}`]: option.id });
          }
        } else {
          personPredicates.push({ "f:573": option.label });
          personPredicates.push({ f: option.label });
        }
      }

      if (personPredicates.length > 0) {
        clauses.push(
          personPredicates.length === 1
            ? personPredicates[0]
            : { any: personPredicates }
        );
        humanParts.push(
          `(${personLabels.map((l) => `Personne:${l}`).join(" OR ")})`
        );
      }
    }

    // Facette Lieu (OR entre lieux sélectionnés)
    if (state.selected.places.size > 0) {
      const placeByKey = new Map(facets.places.map((l) => [l.key, l]));
      const placePredicates = [];
      const placeLabels = [];

      for (const key of state.selected.places) {
        const option = placeByKey.get(key);
        if (!option) continue;
        placeLabels.push(`"${option.label}"`);
        if (option.id) {
          const fieldIds = Array.from(option.fieldIds).filter((fid) =>
            ["238", "375"].includes(fid)
          );
          const targets = fieldIds.length > 0 ? fieldIds : ["238"];
          for (const fid of targets) {
            placePredicates.push({ [`f:${fid}`]: option.id });
          }
        } else {
          placePredicates.push({ "f:375": option.label });
          placePredicates.push({ f: option.label });
        }
      }

      if (placePredicates.length > 0) {
        clauses.push(
          placePredicates.length === 1
            ? placePredicates[0]
            : { any: placePredicates }
        );
        humanParts.push(`(${placeLabels.map((l) => `Lieu:${l}`).join(" OR ")})`);
      }
    }

    const q = clauses.length === 1 ? `t:${BASE_RECTYPE}` : JSON.stringify(clauses);
    return {
      q,
      humanQuery: humanParts.join(" AND ")
    };
  }

  function getRandomIndex(length, excludeIndex = -1) {
    if (length <= 1) return 0;
    const pickRaw = () => {
      if (
        typeof crypto !== "undefined" &&
        typeof crypto.getRandomValues === "function"
      ) {
        const buf = new Uint32Array(1);
        crypto.getRandomValues(buf);
        return Math.floor((buf[0] / 4294967296) * length);
      }
      return Math.floor(Math.random() * length);
    };

    let idx = pickRaw();
    if (idx === excludeIndex) {
      idx = (idx + 1 + (pickRaw() % (length - 1))) % length;
    }
    return idx;
  }

  function formatFrNumber(num) {
    if (typeof num !== "number" || !Number.isFinite(num)) return "—";
    try {
      return new Intl.NumberFormat("fr-FR").format(num);
    } catch (_e) {
      return String(num);
    }
  }

  function createSvgIcon(type) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("width", "16");
    svg.setAttribute("height", "16");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2.2");
    svg.setAttribute("stroke-linecap", "square");
    svg.setAttribute("stroke-linejoin", "miter");
    svg.setAttribute("aria-hidden", "true");

    if (type === "search") {
      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("cx", "11");
      circle.setAttribute("cy", "11");
      circle.setAttribute("r", "7");
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", "16.5");
      line.setAttribute("y1", "16.5");
      line.setAttribute("x2", "21");
      line.setAttribute("y2", "21");
      svg.append(circle, line);
    } else if (type === "chevron") {
      svg.setAttribute("width", "14");
      svg.setAttribute("height", "14");
      const poly = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
      poly.setAttribute("points", "6 9 12 15 18 9");
      svg.appendChild(poly);
    } else if (type === "shuffle") {
      const p1 = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
      p1.setAttribute("points", "16 3 21 3 21 8");
      const l1 = document.createElementNS("http://www.w3.org/2000/svg", "line");
      l1.setAttribute("x1", "4");
      l1.setAttribute("y1", "20");
      l1.setAttribute("x2", "21");
      l1.setAttribute("y2", "3");
      const p2 = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
      p2.setAttribute("points", "21 16 21 21 16 21");
      const l2 = document.createElementNS("http://www.w3.org/2000/svg", "line");
      l2.setAttribute("x1", "15");
      l2.setAttribute("y1", "15");
      l2.setAttribute("x2", "21");
      l2.setAttribute("y2", "21");
      const l3 = document.createElementNS("http://www.w3.org/2000/svg", "line");
      l3.setAttribute("x1", "4");
      l3.setAttribute("y1", "4");
      l3.setAttribute("x2", "9");
      l3.setAttribute("y2", "9");
      svg.append(p1, l1, p2, l2, l3);
    } else if (type === "book") {
      const cover = document.createElementNS("http://www.w3.org/2000/svg", "path");
      cover.setAttribute(
        "d",
        "M2 5.5C5.2 4.3 8.6 4.5 12 6.5c3.4-2 6.8-2.2 10-1v13c-3.2-1.2-6.6-1-10 1-3.4-2-6.8-2.2-10-1z"
      );
      const spine = document.createElementNS("http://www.w3.org/2000/svg", "line");
      spine.setAttribute("x1", "12");
      spine.setAttribute("y1", "6.5");
      spine.setAttribute("x2", "12");
      spine.setAttribute("y2", "19.5");
      svg.append(cover, spine);
    }
    return svg;
  }

  function sanitizeCloneForFlip(sourceEl) {
    const clone = sourceEl.cloneNode(true);
    if (typeof clone.removeAttribute === "function") {
      clone.removeAttribute("id");
    }
    if (typeof clone.querySelectorAll === "function") {
      for (const el of clone.querySelectorAll("[id]")) {
        el.removeAttribute("id");
      }
      for (const interactive of clone.querySelectorAll("a, button, input, select, textarea")) {
        interactive.setAttribute("tabindex", "-1");
      }
    }
    return clone;
  }

  function mountApp(root) {
    if (!root) return;
    if (
      root.dataset.abMounted === "true" &&
      root.dataset.abVersion === APP_VERSION
    ) {
      return;
    }
    root.dataset.abMounted = "true";
    root.dataset.abVersion = APP_VERSION;

    const config = resolveConfig(root);
    const isApplePlatform =
      typeof navigator !== "undefined" &&
      /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent || "");

    const state = {
      view: "home",
      searchQuery: "",
      offset: 0,
      limit: PAGE_LIMIT,
      totalCount: 0,
      records: [],
      isLoading: false,
      error: null,
      facetsInitialized: false,
      facets: { dates: [], persons: [], places: [] },
      corpusRecords: [],
      corpusTotal: 0,
      corpusLoaded: false,
      corpusLoading: false,
      corpusError: null,
      currentRandomRecord: null,
      randomDrawCount: 0,
      randomLoading: false,
      randomError: null,
      drawnRandomIds: new Set(),
      lastRandomOffset: -1,
      notebookIndex: 0,
      notebookLoading: false,
      notebookError: null,
      notebookRecordsByIndex: new Map(),
      selected: {
        dates: new Set(),
        persons: new Set(),
        places: new Set()
      },
      popoverSearch: {
        dates: "",
        persons: "",
        places: ""
      }
    };

    const queryCache = new Map();
    let corpusPromise = null;
    let activeAbortController = null;
    let debounceTimer = null;
    let activeRandomToken = 0;
    let activeNotebookToken = 0;
    let activeFlipCancel = null;
    let activeViewNavId = 0;

    // Construction du squelette DOM
    root.replaceChildren();
    const shell = document.createElement("section");
    shell.className = "ab-shell";
    shell.setAttribute("aria-label", "Explorateur ArchiBarthes — Fiches de Roland Barthes");

    // 1. En-tête éditorial + navigation entre les vues
    const masthead = document.createElement("header");
    masthead.className = "ab-masthead";

    const brand = document.createElement("div");
    brand.className = "ab-brand";
    const brandMark = document.createElement("div");
    brandMark.className = "ab-brand-mark";
    brandMark.setAttribute("aria-hidden", "true");

    const titleGroup = document.createElement("div");
    const kicker = document.createElement("p");
    kicker.className = "ab-kicker";
    kicker.textContent = "Heurist · Édition critique numérique";

    const h1 = document.createElement("h1");
    h1.className = "ab-title";
    h1.textContent = "ArchiBarthes — Le Grand Fichier";

    const subtitle = document.createElement("p");
    subtitle.className = "ab-subtitle";
    subtitle.textContent =
      "Fonds Roland Barthes · Bibliothèque nationale de France (NAF 28630)";

    titleGroup.append(kicker, h1, subtitle);
    brand.append(brandMark, titleGroup);

    const mastheadAside = document.createElement("div");
    mastheadAside.className = "ab-masthead-aside";

    const viewNav = document.createElement("nav");
    viewNav.className = "ab-view-nav";
    viewNav.setAttribute("aria-label", "Navigation ArchiBarthes");

    const createNavTab = (viewKey, labelText) => {
      const tab = document.createElement("button");
      tab.type = "button";
      tab.className = "ab-nav-tab";
      tab.dataset.view = viewKey;
      tab.textContent = labelText;
      if (viewKey === "home") {
        tab.setAttribute("aria-current", "page");
      }
      return tab;
    };

    const navHomeBtn = createNavTab("home", "Présentation");
    const navSearchBtn = createNavTab("search", "Recherche");
    const navRandomBtn = createNavTab("random", "Fiche aléatoire");
    const navNotebookBtn = createNavTab("notebook", "Carnet de note");
    const navButtons = {
      home: navHomeBtn,
      search: navSearchBtn,
      random: navRandomBtn,
      notebook: navNotebookBtn
    };
    viewNav.append(navHomeBtn, navSearchBtn, navRandomBtn, navNotebookBtn);

    const corpusBadge = document.createElement("div");
    corpusBadge.className = "ab-corpus-badge";
    corpusBadge.textContent = "Corpus t:102";

    mastheadAside.append(viewNav, corpusBadge);
    masthead.append(brand, mastheadAside);

    // 2A. Vue 1 : Page de présentation (vue d'accueil par défaut)
    const homeView = document.createElement("div");
    homeView.className = "ab-view ab-view-home";
    homeView.dataset.view = "home";
    homeView.setAttribute("aria-hidden", "false");

    const homeHero = document.createElement("section");
    homeHero.className = "ab-home-hero";
    homeHero.setAttribute("aria-labelledby", "ab-home-heading");

    const heroMain = document.createElement("div");
    heroMain.className = "ab-hero-main";

    const heroEyebrow = document.createElement("p");
    heroEyebrow.className = "ab-hero-eyebrow";
    heroEyebrow.textContent = "Présentation du fonds · NAF 28630";

    const homeHeading = document.createElement("h2");
    homeHeading.id = "ab-home-heading";
    homeHeading.className = "ab-hero-title";
    homeHeading.tabIndex = -1;
    homeHeading.textContent = "Le Grand Fichier de Roland Barthes";

    const heroLead = document.createElement("p");
    heroLead.className = "ab-hero-lead";
    heroLead.textContent =
      "Instrument de travail quotidien, le Grand Fichier rassemble les notes de lecture, fragments critiques et repères biographiques rédigés sur fiches bristol par Roland Barthes. Cette interface donne accès aux fac-similés manuscrits conservés à la Bibliothèque nationale de France ainsi qu’à leur transcription critique structurée dans Heurist.";

    const heroActions = document.createElement("div");
    heroActions.className = "ab-hero-actions";

    const ctaSearchBtn = document.createElement("button");
    ctaSearchBtn.type = "button";
    ctaSearchBtn.className = "ab-cta-btn ab-cta-search";
    ctaSearchBtn.appendChild(createSvgIcon("search"));
    const ctaSearchLabel = document.createElement("span");
    ctaSearchLabel.textContent = "Accéder à la recherche →";
    ctaSearchBtn.appendChild(ctaSearchLabel);

    const ctaRandomBtn = document.createElement("button");
    ctaRandomBtn.type = "button";
    ctaRandomBtn.className = "ab-cta-btn ab-cta-random";
    ctaRandomBtn.appendChild(createSvgIcon("shuffle"));
    const ctaRandomLabel = document.createElement("span");
    ctaRandomLabel.textContent = "Générer une fiche aléatoire";
    ctaRandomBtn.appendChild(ctaRandomLabel);

    const ctaNotebookBtn = document.createElement("button");
    ctaNotebookBtn.type = "button";
    ctaNotebookBtn.className = "ab-cta-btn ab-cta-notebook";
    ctaNotebookBtn.appendChild(createSvgIcon("book"));
    const ctaNotebookLabel = document.createElement("span");
    ctaNotebookLabel.textContent = "Carnet de note";
    ctaNotebookBtn.appendChild(ctaNotebookLabel);

    heroActions.append(ctaSearchBtn, ctaRandomBtn, ctaNotebookBtn);
    heroMain.append(heroEyebrow, homeHeading, heroLead, heroActions);

    const heroAside = document.createElement("aside");
    heroAside.className = "ab-hero-aside";
    heroAside.setAttribute("aria-label", "Repères chiffrés du corpus");

    const metricsTitle = document.createElement("h3");
    metricsTitle.className = "ab-metrics-title";
    metricsTitle.textContent = "Repères du corpus (t:102)";

    const metricsList = document.createElement("dl");
    metricsList.className = "ab-hero-metrics";

    const createMetricCard = (labelText) => {
      const card = document.createElement("div");
      card.className = "ab-metric-card";
      const dt = document.createElement("dt");
      dt.className = "ab-metric-label";
      dt.textContent = labelText;
      const dd = document.createElement("dd");
      dd.className = "ab-metric-value";
      dd.textContent = "…";
      card.append(dt, dd);
      metricsList.appendChild(card);
      return dd;
    };

    const metricCountVal = createMetricCard("Fiches indexées");
    const metricDatesVal = createMetricCard("Années datées");
    const metricPersonsVal = createMetricCard("Personnes & auteurs");
    const metricPlacesVal = createMetricCard("Lieux mentionnés");

    const metricNote = document.createElement("p");
    metricNote.className = "ab-metric-note";
    metricNote.textContent = `Base Heurist ${config.db} — fac-similés BnF et transcriptions diplomatiques.`;

    heroAside.append(metricsTitle, metricsList, metricNote);
    homeHero.append(heroMain, heroAside);

    const homePillars = document.createElement("div");
    homePillars.className = "ab-home-pillars";

    const pillarDefs = [
      {
        index: "01 · Moteur de recherche",
        title: "Recherche & facettes combinées",
        desc: `Interrogation plein texte (raccourci ${isApplePlatform ? "⌘K" : "Ctrl+K"}), filtres croisés par Date, Personne et Lieu avec pagination par lots de 20 fiches.`
      },
      {
        index: "02 · Lecture synoptique",
        title: "Manuscrit & transcription",
        desc: "Confrontation directe du scan manuscrit (vues Recto / Verso et ouverture plein écran) avec le texte critique annoté et sa notice complète."
      },
      {
        index: "03 · Exploration libre",
        title: "Tirage aléatoire dans le fichier",
        desc: "Ouverture immédiate d’une fiche tirée au sort dans le fonds pour découvrir une note de Roland Barthes au hasard de l’archive."
      },
      {
        index: "04 · Carnet de note",
        title: "Feuilletage animé sur bureau",
        desc: "Consultation séquentielle des fiches au sein d’un carnet relié posé sur un bureau, avec animation de page tournée."
      }
    ];

    for (const p of pillarDefs) {
      const card = document.createElement("article");
      card.className = "ab-pillar-card";

      const pIdx = document.createElement("span");
      pIdx.className = "ab-pillar-index";
      pIdx.textContent = p.index;

      const pTitle = document.createElement("h3");
      pTitle.className = "ab-pillar-title";
      pTitle.textContent = p.title;

      const pDesc = document.createElement("p");
      pDesc.className = "ab-pillar-desc";
      pDesc.textContent = p.desc;

      card.append(pIdx, pTitle, pDesc);
      homePillars.appendChild(card);
    }

    homeView.append(homeHero, homePillars);

    // 2B. Vue 2 : Page Recherche & filtres (cachée et inerte au départ)
    const searchView = document.createElement("div");
    searchView.className = "ab-view ab-view-search is-inactive";
    searchView.dataset.view = "search";
    searchView.setAttribute("aria-hidden", "true");
    searchView.setAttribute("inert", "");
    searchView.inert = true;

    const searchToolbar = document.createElement("div");
    searchToolbar.className = "ab-search-toolbar";

    const searchInfo = document.createElement("div");
    searchInfo.className = "ab-search-info";

    const searchHeading = document.createElement("h2");
    searchHeading.id = "ab-search-heading";
    searchHeading.className = "ab-search-heading";
    searchHeading.tabIndex = -1;
    searchHeading.textContent = "Recherche et filtres";

    const searchSub = document.createElement("p");
    searchSub.className = "ab-search-sub";
    searchSub.textContent =
      "Interrogation plein texte et facettes croisées sur le corpus t:102.";

    searchInfo.append(searchHeading, searchSub);

    const searchActions = document.createElement("div");
    searchActions.className = "ab-search-actions";

    const searchBackHomeBtn = document.createElement("button");
    searchBackHomeBtn.type = "button";
    searchBackHomeBtn.className = "ab-toolbar-btn ab-back-home-btn";
    searchBackHomeBtn.textContent = "← Retour à l’accueil";

    const searchToRandomBtn = document.createElement("button");
    searchToRandomBtn.type = "button";
    searchToRandomBtn.className = "ab-toolbar-btn ab-search-to-random-btn";
    searchToRandomBtn.textContent = "Fiche aléatoire";

    const searchToNotebookBtn = document.createElement("button");
    searchToNotebookBtn.type = "button";
    searchToNotebookBtn.className = "ab-toolbar-btn ab-search-to-notebook-btn";
    searchToNotebookBtn.textContent = "Carnet de note";

    searchActions.append(searchBackHomeBtn, searchToRandomBtn, searchToNotebookBtn);
    searchToolbar.append(searchInfo, searchActions);

    // Moteur de recherche & filtres (<search>)
    const searchLandmark = document.createElement("search");
    searchLandmark.className = "ab-controls";
    searchLandmark.setAttribute("aria-label", "Recherche et filtres des fiches");

    const searchForm = document.createElement("form");
    searchForm.className = "ab-search-form";
    searchForm.noValidate = true;

    const searchLabel = document.createElement("label");
    searchLabel.className = "ab-visually-hidden";
    searchLabel.setAttribute("for", "ab-search-input");
    searchLabel.textContent = "Rechercher dans les fiches de Roland Barthes";

    const searchField = document.createElement("div");
    searchField.className = "ab-search-field";

    const searchIconWrap = document.createElement("span");
    searchIconWrap.className = "ab-search-icon";
    searchIconWrap.appendChild(createSvgIcon("search"));

    const searchInput = document.createElement("input");
    searchInput.id = "ab-search-input";
    searchInput.className = "ab-search-input";
    searchInput.type = "search";
    searchInput.name = "q";
    searchInput.autocomplete = "off";
    searchInput.placeholder =
      "Rechercher par mot-clé, transcription, numéro BnF, personne ou lieu…";

    const searchClearBtn = document.createElement("button");
    searchClearBtn.type = "button";
    searchClearBtn.className = "ab-search-clear";
    searchClearBtn.setAttribute("aria-label", "Effacer la recherche");
    searchClearBtn.textContent = "×";
    searchClearBtn.hidden = true;

    const kbdHint = document.createElement("kbd");
    kbdHint.className = "ab-kbd-hint";
    kbdHint.textContent = isApplePlatform ? "⌘K" : "Ctrl+K";
    kbdHint.setAttribute("aria-hidden", "true");

    searchField.append(searchIconWrap, searchInput, searchClearBtn, kbdHint);

    const searchSubmitBtn = document.createElement("button");
    searchSubmitBtn.type = "submit";
    searchSubmitBtn.className = "ab-search-submit";
    searchSubmitBtn.textContent = "Rechercher";

    searchForm.append(searchLabel, searchField, searchSubmitBtn);

    // Barre horizontale de filtres
    const filterBar = document.createElement("div");
    filterBar.className = "ab-filter-bar";

    const filterLabel = document.createElement("span");
    filterLabel.className = "ab-filter-label";
    filterLabel.textContent = "Filtrer par :";
    filterBar.appendChild(filterLabel);

    const facetConfigs = [
      { key: "dates", label: "Date", popoverId: "ab-popover-dates" },
      { key: "persons", label: "Personne", popoverId: "ab-popover-persons" },
      { key: "places", label: "Lieu", popoverId: "ab-popover-places" }
    ];

    const facetRefs = {};

    for (const fc of facetConfigs) {
      const group = document.createElement("div");
      group.className = "ab-filter-group";

      const btn = document.createElement("button");
      btn.type = "button";
      btn.id = `ab-trigger-${fc.key}`;
      btn.className = "ab-filter-btn";
      btn.setAttribute("aria-expanded", "false");
      btn.setAttribute("aria-controls", fc.popoverId);
      if (SUPPORTS_NATIVE_POPOVER) {
        btn.setAttribute("popovertarget", fc.popoverId);
      }

      const btnText = document.createElement("span");
      btnText.textContent = fc.label;

      const badge = document.createElement("span");
      badge.className = "ab-filter-badge";
      badge.hidden = true;
      badge.textContent = "0";

      const chev = document.createElement("span");
      chev.className = "ab-filter-chevron";
      chev.appendChild(createSvgIcon("chevron"));

      btn.append(btnText, badge, chev);

      const popover = document.createElement("div");
      popover.id = fc.popoverId;
      popover.className = "ab-popover";
      if (SUPPORTS_NATIVE_POPOVER) {
        popover.setAttribute("popover", "auto");
      }
      popover.setAttribute("role", "region");
      popover.setAttribute("aria-label", `Filtrer par ${fc.label}`);

      const popHead = document.createElement("div");
      popHead.className = "ab-popover-head";

      const popSearchLabel = document.createElement("label");
      popSearchLabel.className = "ab-visually-hidden";
      popSearchLabel.setAttribute("for", `ab-pop-search-${fc.key}`);
      popSearchLabel.textContent = `Filtrer les options pour ${fc.label}`;

      const popSearch = document.createElement("input");
      popSearch.id = `ab-pop-search-${fc.key}`;
      popSearch.className = "ab-popover-search";
      popSearch.type = "search";
      popSearch.placeholder = `Filtrer (${fc.label.toLowerCase()})…`;

      const popClear = document.createElement("button");
      popClear.type = "button";
      popClear.className = "ab-popover-clear";
      popClear.textContent = "Effacer";
      popClear.hidden = true;

      popHead.append(popSearchLabel, popSearch, popClear);

      const optionsFieldset = document.createElement("fieldset");
      optionsFieldset.className = "ab-popover-options";

      const legend = document.createElement("legend");
      legend.className = "ab-visually-hidden";
      legend.textContent = `Options de filtre ${fc.label}`;
      optionsFieldset.appendChild(legend);

      popover.append(popHead, optionsFieldset);
      group.append(btn, popover);
      filterBar.appendChild(group);

      facetRefs[fc.key] = {
        key: fc.key,
        label: fc.label,
        btn,
        badge,
        popover,
        popSearch,
        popClear,
        optionsFieldset
      };
    }

    const resetBtn = document.createElement("button");
    resetBtn.type = "button";
    resetBtn.className = "ab-reset-btn";
    resetBtn.textContent = "Réinitialiser";
    resetBtn.hidden = true;
    filterBar.appendChild(resetBtn);

    const activeChips = document.createElement("div");
    activeChips.className = "ab-active-chips";
    activeChips.setAttribute("aria-label", "Filtres actifs");
    activeChips.hidden = true;

    searchLandmark.append(searchForm, filterBar, activeChips);

    // 3. Barre de statut et pagination supérieure
    const statusBar = document.createElement("div");
    statusBar.className = "ab-status-bar";

    const statusSummary = document.createElement("div");
    statusSummary.className = "ab-status-summary";

    const statusCount = document.createElement("span");
    statusCount.className = "ab-status-count";
    statusCount.setAttribute("aria-live", "off");
    statusCount.textContent = "Chargement du corpus…";

    const statusPage = document.createElement("span");
    statusPage.className = "ab-status-page";
    statusPage.textContent = "Page 1 sur 1";

    statusSummary.append(statusCount, statusPage);

    const createPaginationNav = (ariaLabel) => {
      const nav = document.createElement("nav");
      nav.className = "ab-pagination";
      nav.setAttribute("aria-label", ariaLabel);

      const prevBtn = document.createElement("button");
      prevBtn.type = "button";
      prevBtn.className = "ab-page-btn";
      prevBtn.textContent = "← Précédent";
      prevBtn.disabled = true;

      const nextBtn = document.createElement("button");
      nextBtn.type = "button";
      nextBtn.className = "ab-page-btn";
      nextBtn.textContent = "Suivant →";
      nextBtn.disabled = true;

      nav.append(prevBtn, nextBtn);
      return { nav, prevBtn, nextBtn };
    };

    const topPag = createPaginationNav("Pagination supérieure");
    statusBar.append(statusSummary, topPag.nav);

    // 4. Zone de résultats
    const resultsRegion = document.createElement("div");
    resultsRegion.className = "ab-results-region";

    // 5. Pagination inférieure
    const bottomPagWrap = document.createElement("div");
    bottomPagWrap.className = "ab-bottom-pagination";
    bottomPagWrap.hidden = true;

    const bottomPageText = document.createElement("span");
    bottomPageText.className = "ab-status-page";
    bottomPageText.textContent = "Page 1 sur 1";

    const bottomPag = createPaginationNav("Pagination inférieure");
    bottomPagWrap.append(bottomPageText, bottomPag.nav);

    searchView.append(
      searchToolbar,
      searchLandmark,
      statusBar,
      resultsRegion,
      bottomPagWrap
    );

    // 2C. Vue 3 : Page Fiche générée aléatoirement (cachée et inerte au départ)
    const randomView = document.createElement("div");
    randomView.className = "ab-view ab-view-random is-inactive";
    randomView.dataset.view = "random";
    randomView.setAttribute("aria-hidden", "true");
    randomView.setAttribute("inert", "");
    randomView.inert = true;

    const randomToolbar = document.createElement("div");
    randomToolbar.className = "ab-random-toolbar";

    const randomInfo = document.createElement("div");
    randomInfo.className = "ab-random-info";

    const randomHeading = document.createElement("h2");
    randomHeading.id = "ab-random-heading";
    randomHeading.className = "ab-random-heading";
    randomHeading.tabIndex = -1;
    randomHeading.textContent = "Fiche générée aléatoirement";

    const randomSub = document.createElement("p");
    randomSub.className = "ab-random-sub";
    randomSub.textContent = "Tirage aléatoire dans l’ensemble du corpus t:102.";

    randomInfo.append(randomHeading, randomSub);

    const randomActions = document.createElement("div");
    randomActions.className = "ab-random-actions";

    const randomBackHomeBtn = document.createElement("button");
    randomBackHomeBtn.type = "button";
    randomBackHomeBtn.className = "ab-page-btn";
    randomBackHomeBtn.textContent = "← Présentation";

    const randomGoSearchBtn = document.createElement("button");
    randomGoSearchBtn.type = "button";
    randomGoSearchBtn.className = "ab-page-btn";
    randomGoSearchBtn.textContent = "Accéder à la recherche";

    const randomDrawBtn = document.createElement("button");
    randomDrawBtn.type = "button";
    randomDrawBtn.className = "ab-random-draw-btn";
    randomDrawBtn.appendChild(createSvgIcon("shuffle"));
    const randomDrawLabel = document.createElement("span");
    randomDrawLabel.textContent = "Autre fiche aléatoire";
    randomDrawBtn.appendChild(randomDrawLabel);

    randomActions.append(randomBackHomeBtn, randomGoSearchBtn, randomDrawBtn);
    randomToolbar.append(randomInfo, randomActions);

    const randomStage = document.createElement("div");
    randomStage.className = "ab-random-stage";

    randomView.append(randomToolbar, randomStage);

    // 2D. Vue 4 : Page Carnet de note sur bureau avec cigares (cachée et inerte au départ)
    const notebookView = document.createElement("div");
    notebookView.className = "ab-view ab-view-notebook is-inactive";
    notebookView.dataset.view = "notebook";
    notebookView.setAttribute("aria-hidden", "true");
    notebookView.setAttribute("inert", "");
    notebookView.inert = true;

    const nbToolbar = document.createElement("div");
    nbToolbar.className = "ab-notebook-toolbar";

    const nbInfo = document.createElement("div");
    nbInfo.className = "ab-notebook-info";

    const notebookHeading = document.createElement("h2");
    notebookHeading.id = "ab-notebook-heading";
    notebookHeading.className = "ab-notebook-heading";
    notebookHeading.tabIndex = -1;
    notebookHeading.textContent = "Carnet de note";

    const notebookSub = document.createElement("p");
    notebookSub.className = "ab-notebook-sub";
    notebookSub.textContent =
      "Feuilletage des fiches de Roland Barthes sur le bureau (boutons ou touches ← / →).";

    nbInfo.append(notebookHeading, notebookSub);

    const nbActions = document.createElement("div");
    nbActions.className = "ab-notebook-actions";

    const nbBackHomeBtn = document.createElement("button");
    nbBackHomeBtn.type = "button";
    nbBackHomeBtn.className = "ab-page-btn";
    nbBackHomeBtn.textContent = "← Présentation";

    const nbGoSearchBtn = document.createElement("button");
    nbGoSearchBtn.type = "button";
    nbGoSearchBtn.className = "ab-page-btn";
    nbGoSearchBtn.textContent = "Accéder à la recherche";

    const nbRandomPageBtn = document.createElement("button");
    nbRandomPageBtn.type = "button";
    nbRandomPageBtn.className = "ab-random-draw-btn";
    nbRandomPageBtn.appendChild(createSvgIcon("shuffle"));
    const nbRandomPageLabel = document.createElement("span");
    nbRandomPageLabel.textContent = "Page au hasard";
    nbRandomPageBtn.appendChild(nbRandomPageLabel);

    nbActions.append(nbBackHomeBtn, nbGoSearchBtn, nbRandomPageBtn);
    nbToolbar.append(nbInfo, nbActions);

    const nbDesk = document.createElement("div");
    nbDesk.className = "ab-notebook-desk";

    const nbBookWrap = document.createElement("div");
    nbBookWrap.className = "ab-book-wrap";

    const nbBookCover = document.createElement("div");
    nbBookCover.className = "ab-book-cover";

    const nbBookStage = document.createElement("div");
    nbBookStage.className = "ab-book-stage";

    const nbLeftSlot = document.createElement("div");
    nbLeftSlot.className = "ab-page-slot ab-page-slot--left";

    const nbRightSlot = document.createElement("div");
    nbRightSlot.className = "ab-page-slot ab-page-slot--right";

    nbBookStage.append(nbLeftSlot, nbRightSlot);
    nbBookCover.appendChild(nbBookStage);

    const nbStateOverlay = document.createElement("div");
    nbStateOverlay.className = "ab-nb-state-overlay";
    nbStateOverlay.hidden = true;

    const nbControls = document.createElement("nav");
    nbControls.className = "ab-notebook-controls";
    nbControls.setAttribute("aria-label", "Navigation du carnet de note");

    const nbPrevBtn = document.createElement("button");
    nbPrevBtn.type = "button";
    nbPrevBtn.className = "ab-nb-nav-btn ab-nb-prev-btn";
    nbPrevBtn.textContent = "← Page précédente";
    nbPrevBtn.disabled = true;

    const nbCenterTools = document.createElement("div");
    nbCenterTools.className = "ab-nb-center-tools";

    const nbCounter = document.createElement("span");
    nbCounter.className = "ab-nb-counter";
    nbCounter.setAttribute("aria-live", "polite");
    nbCounter.textContent = "Chargement…";

    const nbJumpForm = document.createElement("form");
    nbJumpForm.className = "ab-nb-jump-form";
    nbJumpForm.noValidate = true;

    const nbJumpLabel = document.createElement("label");
    nbJumpLabel.className = "ab-nb-jump-label";
    nbJumpLabel.setAttribute("for", "ab-nb-jump-input");
    nbJumpLabel.textContent = "Folio :";

    const nbJumpInput = document.createElement("input");
    nbJumpInput.id = "ab-nb-jump-input";
    nbJumpInput.className = "ab-nb-jump-input";
    nbJumpInput.type = "number";
    nbJumpInput.min = "1";
    nbJumpInput.step = "1";
    nbJumpInput.inputMode = "numeric";
    nbJumpInput.value = "1";

    const nbJumpSubmit = document.createElement("button");
    nbJumpSubmit.type = "submit";
    nbJumpSubmit.className = "ab-page-btn ab-nb-jump-btn";
    nbJumpSubmit.textContent = "Aller";
    nbJumpSubmit.setAttribute("aria-label", "Aller au folio saisi");

    nbJumpForm.append(nbJumpLabel, nbJumpInput, nbJumpSubmit);
    nbCenterTools.append(nbCounter, nbJumpForm);

    const nbNextBtn = document.createElement("button");
    nbNextBtn.type = "button";
    nbNextBtn.className = "ab-nb-nav-btn ab-nb-next-btn";
    nbNextBtn.textContent = "Page suivante →";
    nbNextBtn.disabled = true;

    nbControls.append(nbPrevBtn, nbCenterTools, nbNextBtn);
    nbBookWrap.append(nbBookCover, nbStateOverlay, nbControls);
    nbDesk.appendChild(nbBookWrap);
    notebookView.append(nbToolbar, nbDesk);

    const viewElements = {
      home: homeView,
      search: searchView,
      random: randomView,
      notebook: notebookView
    };

    shell.append(masthead, homeView, searchView, randomView, notebookView);
    root.appendChild(shell);

    // --- Positionnement et gestion des popovers ---
    function positionPopoverFallback(trigger, popover) {
      if (SUPPORTS_ANCHOR_AREA) return;
      const rect = trigger.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const popWidth = Math.min(320, vw - 24);
      const estimatedHeight = 340;

      let left = rect.left;
      if (left + popWidth > vw - 12) {
        left = Math.max(12, rect.right - popWidth);
      }
      left = Math.max(12, left);

      let top = rect.bottom + 6;
      if (top + estimatedHeight > vh - 12 && rect.top - estimatedHeight - 6 > 12) {
        top = Math.max(12, rect.top - estimatedHeight - 6);
      }

      popover.style.setProperty("--ab-popover-top", `${Math.round(top)}px`);
      popover.style.setProperty("--ab-popover-left", `${Math.round(left)}px`);
    }

    function closeAllManualPopovers(exceptKey) {
      for (const fc of facetConfigs) {
        if (fc.key === exceptKey) continue;
        const ref = facetRefs[fc.key];
        if (!SUPPORTS_NATIVE_POPOVER) {
          ref.popover.classList.remove("is-open");
          ref.btn.setAttribute("aria-expanded", "false");
        } else if (ref.popover.matches(":popover-open")) {
          ref.popover.hidePopover();
        }
      }
    }

    for (const fc of facetConfigs) {
      const ref = facetRefs[fc.key];

      if (SUPPORTS_NATIVE_POPOVER) {
        ref.popover.addEventListener("beforetoggle", (event) => {
          const opening = event.newState === "open";
          ref.btn.setAttribute("aria-expanded", opening ? "true" : "false");
          if (opening) {
            positionPopoverFallback(ref.btn, ref.popover);
          }
        });

        ref.popover.addEventListener("toggle", (event) => {
          const isOpen = event.newState === "open";
          ref.btn.setAttribute("aria-expanded", isOpen ? "true" : "false");
          if (isOpen) {
            positionPopoverFallback(ref.btn, ref.popover);
            requestAnimationFrame(() => {
              ref.popSearch.focus({ preventScroll: true });
            });
          }
        });
      } else {
        ref.btn.addEventListener("click", (event) => {
          event.stopPropagation();
          const willOpen = !ref.popover.classList.contains("is-open");
          closeAllManualPopovers(fc.key);
          if (willOpen) {
            positionPopoverFallback(ref.btn, ref.popover);
            ref.popover.classList.add("is-open");
            ref.btn.setAttribute("aria-expanded", "true");
            requestAnimationFrame(() => {
              ref.popSearch.focus({ preventScroll: true });
            });
          } else {
            ref.popover.classList.remove("is-open");
            ref.btn.setAttribute("aria-expanded", "false");
          }
        });

        ref.popover.addEventListener("click", (event) => {
          event.stopPropagation();
        });
      }

      ref.popSearch.addEventListener("input", () => {
        state.popoverSearch[fc.key] = ref.popSearch.value;
        renderFacetOptions(fc.key);
      });

      ref.popClear.addEventListener("click", () => {
        if (state.selected[fc.key].size === 0) return;
        state.selected[fc.key].clear();
        state.offset = 0;
        updateFilterIndicators();
        renderFacetOptions(fc.key);
        executeSearch();
      });
    }

    if (!SUPPORTS_NATIVE_POPOVER) {
      document.addEventListener("pointerdown", (event) => {
        const target = event.target;
        if (!target || !root.contains(target)) {
          closeAllManualPopovers(null);
          return;
        }
        const insideGroup = target.closest(".ab-filter-group");
        if (!insideGroup) {
          closeAllManualPopovers(null);
        }
      });

      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
          for (const fc of facetConfigs) {
            const ref = facetRefs[fc.key];
            if (ref.popover.classList.contains("is-open")) {
              closeAllManualPopovers(null);
              ref.btn.focus();
              break;
            }
          }
        }
      });
    }

    window.addEventListener(
      "resize",
      () => {
        for (const fc of facetConfigs) {
          const ref = facetRefs[fc.key];
          const isOpen = SUPPORTS_NATIVE_POPOVER
            ? ref.popover.matches(":popover-open")
            : ref.popover.classList.contains("is-open");
          if (isOpen) {
            positionPopoverFallback(ref.btn, ref.popover);
          }
        }
      },
      { passive: true }
    );

    // --- Rendu des options dans chaque popover ---
    function renderFacetOptions(facetKey) {
      const ref = facetRefs[facetKey];
      const options = state.facets[facetKey] || [];
      const filterTerm = normalizeForSearch(state.popoverSearch[facetKey]);
      const selectedSet = state.selected[facetKey];

      const fieldset = ref.optionsFieldset;
      const legend = fieldset.querySelector("legend");
      fieldset.replaceChildren();
      if (legend) fieldset.appendChild(legend);

      if (!state.facetsInitialized && state.isLoading) {
        const loadingMsg = document.createElement("p");
        loadingMsg.className = "ab-popover-empty";
        loadingMsg.textContent = "Chargement des options…";
        fieldset.appendChild(loadingMsg);
        return;
      }

      const filtered = filterTerm
        ? options.filter((opt) => normalizeForSearch(opt.label).includes(filterTerm))
        : options;

      if (filtered.length === 0) {
        const emptyMsg = document.createElement("p");
        emptyMsg.className = "ab-popover-empty";
        emptyMsg.textContent = "Aucune option correspondante.";
        fieldset.appendChild(emptyMsg);
        return;
      }

      const frag = document.createDocumentFragment();
      for (let i = 0; i < filtered.length; i += 1) {
        const opt = filtered[i];
        const rowId = `ab-opt-${facetKey}-${i}`;

        const rowLabel = document.createElement("label");
        rowLabel.className = "ab-option-row";
        rowLabel.setAttribute("for", rowId);

        const left = document.createElement("span");
        left.className = "ab-option-left";

        const checkbox = document.createElement("input");
        checkbox.id = rowId;
        checkbox.type = "checkbox";
        checkbox.className = "ab-checkbox";
        checkbox.value = opt.key;
        checkbox.checked = selectedSet.has(opt.key);

        checkbox.addEventListener("change", () => {
          if (checkbox.checked) {
            selectedSet.add(opt.key);
          } else {
            selectedSet.delete(opt.key);
          }
          state.offset = 0;
          updateFilterIndicators();
          executeSearch();
        });

        const textSpan = document.createElement("span");
        textSpan.className = "ab-option-text";
        textSpan.textContent = opt.label;

        left.append(checkbox, textSpan);

        const countSpan = document.createElement("span");
        countSpan.className = "ab-option-count";
        countSpan.textContent = String(opt.count);

        rowLabel.append(left, countSpan);
        frag.appendChild(rowLabel);
      }

      fieldset.appendChild(frag);
    }

    function renderAllFacetOptions() {
      for (const fc of facetConfigs) {
        renderFacetOptions(fc.key);
      }
    }

    function updateFilterIndicators() {
      let totalSelected = 0;
      for (const fc of facetConfigs) {
        const count = state.selected[fc.key].size;
        totalSelected += count;
        const ref = facetRefs[fc.key];
        ref.badge.textContent = String(count);
        ref.badge.hidden = count === 0;
        ref.popClear.hidden = count === 0;
        ref.btn.classList.toggle("has-selection", count > 0);
      }

      const hasAnyFilter = totalSelected > 0 || state.searchQuery.trim().length > 0;
      resetBtn.hidden = !hasAnyFilter;
      searchClearBtn.hidden = searchInput.value.length === 0;

      // Puces actives
      activeChips.replaceChildren();
      if (!hasAnyFilter) {
        activeChips.hidden = true;
        return;
      }

      const frag = document.createDocumentFragment();

      if (state.searchQuery.trim()) {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "ab-chip";
        chip.setAttribute("aria-label", `Retirer le mot-clé ${state.searchQuery.trim()}`);

        const typeSpan = document.createElement("span");
        typeSpan.className = "ab-chip-type";
        typeSpan.textContent = "Texte";

        const valSpan = document.createElement("span");
        valSpan.textContent = `"${state.searchQuery.trim()}" ×`;

        chip.append(typeSpan, valSpan);
        chip.addEventListener("click", () => {
          searchInput.value = "";
          state.searchQuery = "";
          state.offset = 0;
          updateFilterIndicators();
          executeSearch();
        });
        frag.appendChild(chip);
      }

      for (const fc of facetConfigs) {
        const byKey = new Map(state.facets[fc.key].map((o) => [o.key, o]));
        for (const key of state.selected[fc.key]) {
          const opt = byKey.get(key);
          const labelText = opt ? opt.label : key;
          const chip = document.createElement("button");
          chip.type = "button";
          chip.className = "ab-chip";
          chip.setAttribute("aria-label", `Retirer le filtre ${fc.label} ${labelText}`);

          const typeSpan = document.createElement("span");
          typeSpan.className = "ab-chip-type";
          typeSpan.textContent = fc.label;

          const valSpan = document.createElement("span");
          valSpan.textContent = `${labelText} ×`;

          chip.append(typeSpan, valSpan);
          chip.addEventListener("click", () => {
            state.selected[fc.key].delete(key);
            state.offset = 0;
            updateFilterIndicators();
            renderFacetOptions(fc.key);
            executeSearch();
          });
          frag.appendChild(chip);
        }
      }

      activeChips.appendChild(frag);
      activeChips.hidden = false;
    }

    // --- Rendu des fiches et pagination ---
    function createScanPlaceholder() {
      const box = document.createElement("div");
      box.className = "ab-scan-placeholder";
      box.textContent = "[ Scan non disponible ]";
      return box;
    }

    function renderCard(rec, options = {}) {
      const titleTag = options.titleTag === "h3" ? "h3" : "h2";
      const anchorKey = options.idPrefix
        ? `${options.idPrefix}-${rec.id}`
        : rec.id;
      const article = document.createElement("article");
      article.className = "ab-card";

      // En-tête : FICHE BNF N° ... à gauche, date à droite
      const header = document.createElement("header");
      header.className = "ab-card-header";

      const badge = document.createElement("span");
      badge.className = "ab-card-badge";
      badge.textContent = `FICHE BNF N° ${rec.numero}`;

      const dateEl = document.createElement("time");
      dateEl.className = "ab-card-date";
      if (rec.date.raw) {
        dateEl.setAttribute("datetime", rec.date.raw);
      }
      dateEl.textContent = rec.date.display;

      header.append(badge, dateEl);

      // Corps synoptique
      const body = document.createElement("div");
      body.className = "ab-card-body";

      // Colonne gauche : Scan du manuscrit
      const scanCol = document.createElement("div");
      scanCol.className = "ab-card-scan-col";

      const scanFrame = document.createElement("div");
      scanFrame.className = "ab-scan-frame";

      if (rec.scans.length === 0) {
        scanFrame.appendChild(createScanPlaceholder());
        scanCol.appendChild(scanFrame);
      } else {
        let activeIndex = 0;
        const img = document.createElement("img");
        img.className = "ab-scan-img";
        img.loading = "lazy";
        img.decoding = "async";
        img.src = rec.scans[0].url;
        img.alt = `Scan manuscrit de la fiche BnF n° ${rec.numero}`;

        img.addEventListener("error", () => {
          scanFrame.replaceChildren(createScanPlaceholder());
        });

        scanFrame.appendChild(img);

        const scanActions = document.createElement("div");
        scanActions.className = "ab-scan-actions";

        const fullScreenLink = document.createElement("a");
        fullScreenLink.className = "ab-fullscreen-btn";
        fullScreenLink.href = rec.scans[0].url;
        fullScreenLink.target = "_blank";
        fullScreenLink.rel = "noopener noreferrer";
        fullScreenLink.textContent = "Plein écran ↗";
        fullScreenLink.setAttribute(
          "aria-label",
          `Ouvrir le scan de la fiche BnF n° ${rec.numero} en plein écran dans un nouvel onglet`
        );

        if (rec.scans.length > 1) {
          const tabs = document.createElement("div");
          tabs.className = "ab-scan-tabs";
          const tabBtns = [];

          rec.scans.forEach((scanItem, idx) => {
            const tabBtn = document.createElement("button");
            tabBtn.type = "button";
            tabBtn.className = "ab-scan-tab";
            tabBtn.setAttribute("aria-pressed", idx === 0 ? "true" : "false");
            tabBtn.textContent =
              rec.scans.length === 2
                ? idx === 0
                  ? "Recto"
                  : "Verso"
                : `Vue ${idx + 1}`;

            tabBtn.addEventListener("click", () => {
              if (activeIndex === idx) return;
              activeIndex = idx;
              tabBtns.forEach((b, bIdx) => {
                b.setAttribute("aria-pressed", bIdx === idx ? "true" : "false");
              });
              scanFrame.replaceChildren(img);
              img.src = scanItem.url;
              img.alt = `Scan manuscrit (${tabBtn.textContent}) de la fiche BnF n° ${rec.numero}`;
              fullScreenLink.href = scanItem.url;
            });

            tabBtns.push(tabBtn);
            tabs.appendChild(tabBtn);
          });

          scanActions.appendChild(tabs);
        }

        scanActions.appendChild(fullScreenLink);
        scanCol.append(scanFrame, scanActions);
      }

      // Colonne droite : Transcription
      const textCol = document.createElement("div");
      textCol.className = "ab-card-text-col";

      const titleHeading = document.createElement(titleTag);
      titleHeading.className = "ab-card-title";
      titleHeading.textContent = rec.title;

      const transDiv = document.createElement("div");
      transDiv.className = "ab-transcription";
      renderSanitizedTranscription(transDiv, rec.transcriptionHtml, anchorKey);

      textCol.append(titleHeading, transDiv);
      body.append(scanCol, textCol);

      // Pied de fiche : métadonnées encadrées + Notice complète →
      const footer = document.createElement("footer");
      footer.className = "ab-card-footer";

      const metaTags = document.createElement("div");
      metaTags.className = "ab-meta-tags";

      const appendMetaBlock = (keyText, valText) => {
        const block = document.createElement("span");
        block.className = "ab-meta-block";

        const kEl = document.createElement("span");
        kEl.className = "ab-meta-key";
        kEl.textContent = `${keyText} :`;

        const vEl = document.createElement("span");
        vEl.className = "ab-meta-val";
        vEl.textContent = valText;

        block.append(kEl, vEl);
        metaTags.appendChild(block);
      };

      appendMetaBlock("Cote BnF", rec.cote);

      for (const g of rec.genres) {
        appendMetaBlock("Genre", g.label);
      }
      for (const p of rec.persons) {
        appendMetaBlock("Personne", p.label);
      }
      for (const l of rec.places) {
        appendMetaBlock("Lieu", l.label);
      }

      const noticeLink = document.createElement("a");
      noticeLink.className = "ab-notice-link";
      noticeLink.href = rec.noticeUrl;
      noticeLink.target = "_blank";
      noticeLink.rel = "noopener noreferrer";
      noticeLink.textContent = "Notice complète →";
      noticeLink.setAttribute(
        "aria-label",
        `Notice complète de la fiche BnF n° ${rec.numero} dans Heurist`
      );

      footer.append(metaTags, noticeLink);
      article.append(header, body, footer);
      return article;
    }

    function syncStatusLiveMode() {
      const shouldAnnounce =
        state.view === "search" && !state.isLoading && !state.error;
      statusCount.setAttribute("aria-live", shouldAnnounce ? "polite" : "off");
    }

    function updateHomeMetrics() {
      const count = state.corpusTotal || state.corpusRecords.length;
      if (count > 0) {
        corpusBadge.textContent = `${formatFrNumber(count)} fiches · t:${BASE_RECTYPE}`;
        metricCountVal.textContent = formatFrNumber(count);
      }
      if (state.facetsInitialized) {
        metricDatesVal.textContent = formatFrNumber(state.facets.dates.length);
        metricPersonsVal.textContent = formatFrNumber(state.facets.persons.length);
        metricPlacesVal.textContent = formatFrNumber(state.facets.places.length);
      }
    }

    function renderResults() {
      const total = state.totalCount;
      const currentPage = Math.floor(state.offset / state.limit) + 1;
      const totalPages = Math.max(1, Math.ceil(total / state.limit));

      syncStatusLiveMode();

      if (state.isLoading) {
        statusCount.textContent = "Chargement des fiches…";
        statusPage.textContent = `Page ${currentPage} sur ${totalPages}`;
        topPag.prevBtn.disabled = true;
        topPag.nextBtn.disabled = true;
        bottomPagWrap.hidden = true;

        const loadingBox = document.createElement("div");
        loadingBox.className = "ab-state-box";

        const title = document.createElement("p");
        title.className = "ab-state-title";
        title.textContent = "Interrogation de l’archive Heurist";

        const desc = document.createElement("p");
        desc.className = "ab-state-desc";
        desc.textContent = `Base ${config.db} — récupération des fiches (lot de ${state.limit})…`;

        const progress = document.createElement("progress");
        progress.className = "ab-progress";
        progress.setAttribute("aria-label", "Chargement des fiches en cours");

        loadingBox.append(title, desc, progress);
        resultsRegion.replaceChildren(loadingBox);
        return;
      }

      if (state.error) {
        statusCount.textContent = "Erreur de chargement";
        statusPage.textContent = "Page 1 sur 1";
        topPag.prevBtn.disabled = true;
        topPag.nextBtn.disabled = true;
        bottomPagWrap.hidden = true;

        const errBox = document.createElement("div");
        errBox.className = "ab-state-box is-error";
        errBox.setAttribute("role", "alert");

        const title = document.createElement("p");
        title.className = "ab-state-title";
        title.textContent = "Impossible de charger les fiches depuis Heurist";

        const desc = document.createElement("p");
        desc.className = "ab-state-desc";
        desc.textContent = state.error;

        const retryBtn = document.createElement("button");
        retryBtn.type = "button";
        retryBtn.className = "ab-page-btn";
        retryBtn.textContent = "Réessayer";
        retryBtn.addEventListener("click", () => executeSearch({ forceRetry: true }));

        const errHomeBtn = document.createElement("button");
        errHomeBtn.type = "button";
        errHomeBtn.className = "ab-toolbar-btn ab-back-home-btn";
        errHomeBtn.textContent = "← Retour à l’accueil";
        errHomeBtn.addEventListener("click", () =>
          switchView("home", { moveFocus: true })
        );

        const stateActions = document.createElement("div");
        stateActions.className = "ab-state-actions";
        stateActions.append(retryBtn, errHomeBtn);

        errBox.append(title, desc, stateActions);
        resultsRegion.replaceChildren(errBox);
        return;
      }

      if (total === 0 || state.records.length === 0) {
        statusCount.textContent = "Affichage de 0 sur 0 fiches";
        statusPage.textContent = "Page 1 sur 1";
        topPag.prevBtn.disabled = true;
        topPag.nextBtn.disabled = true;
        bottomPagWrap.hidden = true;

        const emptyBox = document.createElement("div");
        emptyBox.className = "ab-state-box";

        const title = document.createElement("p");
        title.className = "ab-state-title";
        title.textContent = "Aucune fiche ne correspond à votre recherche";

        const desc = document.createElement("p");
        desc.className = "ab-state-desc";
        desc.textContent =
          "Essayez d’élargir vos termes de recherche ou de décocher certains filtres.";

        emptyBox.append(title, desc);
        resultsRegion.replaceChildren(emptyBox);
        return;
      }

      const startIdx = state.offset + 1;
      const endIdx = Math.min(state.offset + state.records.length, total);
      const pageLabel = `Page ${currentPage} sur ${totalPages}`;
      const countLabel = `Affichage de ${startIdx}-${endIdx} sur ${total} fiches`;

      statusCount.textContent = countLabel;
      statusPage.textContent = pageLabel;
      bottomPageText.textContent = pageLabel;

      const hasPrev = state.offset > 0;
      const hasNext = state.offset + state.limit < total;

      topPag.prevBtn.disabled = !hasPrev;
      topPag.nextBtn.disabled = !hasNext;
      bottomPag.prevBtn.disabled = !hasPrev;
      bottomPag.nextBtn.disabled = !hasNext;
      bottomPagWrap.hidden = total <= state.limit && currentPage === 1;

      const list = document.createElement("div");
      list.className = "ab-cards-list";
      const frag = document.createDocumentFragment();
      for (const rec of state.records) {
        frag.appendChild(renderCard(rec, { titleTag: "h3", idPrefix: "s" }));
      }
      list.appendChild(frag);
      resultsRegion.replaceChildren(list);
    }

    function renderRandomView() {
      randomDrawBtn.disabled = state.randomLoading;

      if (state.randomLoading) {
        randomSub.textContent = "Sélection d’une fiche aléatoire en cours…";

        const loadingBox = document.createElement("div");
        loadingBox.className = "ab-state-box";

        const title = document.createElement("p");
        title.className = "ab-state-title";
        title.textContent = "Tirage dans l’archive Heurist";

        const desc = document.createElement("p");
        desc.className = "ab-state-desc";
        desc.textContent = `Base ${config.db} — chargement d’une fiche aléatoire…`;

        const progress = document.createElement("progress");
        progress.className = "ab-progress";
        progress.setAttribute("aria-label", "Chargement d’une fiche aléatoire en cours");

        loadingBox.append(title, desc, progress);
        randomStage.replaceChildren(loadingBox);
        return;
      }

      if (state.randomError) {
        randomSub.textContent = "Erreur lors du tirage aléatoire.";

        const errBox = document.createElement("div");
        errBox.className = "ab-state-box is-error";
        errBox.setAttribute("role", "alert");

        const title = document.createElement("p");
        title.className = "ab-state-title";
        title.textContent = "Impossible d’afficher une fiche aléatoire";

        const desc = document.createElement("p");
        desc.className = "ab-state-desc";
        desc.textContent = state.randomError;

        const retryBtn = document.createElement("button");
        retryBtn.type = "button";
        retryBtn.className = "ab-page-btn";
        retryBtn.textContent = "Réessayer";
        retryBtn.addEventListener("click", () => drawRandomRecord());

        errBox.append(title, desc, retryBtn);
        randomStage.replaceChildren(errBox);
        return;
      }

      if (!state.currentRandomRecord) {
        randomSub.textContent = "Cliquez sur « Autre fiche aléatoire » pour lancer un tirage.";
        randomStage.replaceChildren();
        return;
      }

      const rec = state.currentRandomRecord;
      const totalLabel = formatFrNumber(
        state.corpusTotal || state.corpusRecords.length
      );
      randomSub.textContent = `Tirage n° ${state.randomDrawCount} — Fiche BnF n° ${rec.numero} (sur ${totalLabel} fiches)`;
      randomStage.replaceChildren(renderCard(rec, { titleTag: "h3", idPrefix: "r" }));
    }

    // --- Rendu et feuilletage animé du Carnet de note ---
    function getTotalNotebookPages() {
      return state.corpusTotal || state.corpusRecords.length || 0;
    }

    function cancelActiveFlip() {
      if (typeof activeFlipCancel === "function") {
        activeFlipCancel();
        activeFlipCancel = null;
      }
    }

    function buildNotebookLeftPage(rec, index, total) {
      const page = document.createElement("article");
      page.className = "ab-nb-page ab-nb-page--left";
      page.setAttribute(
        "aria-label",
        `Page de gauche — Fac-similé et métadonnées de la fiche BnF n° ${rec.numero}`
      );

      const head = document.createElement("header");
      head.className = "ab-nb-page-head";

      const badge = document.createElement("span");
      badge.className = "ab-card-badge";
      badge.textContent = `FICHE BNF N° ${rec.numero}`;

      const dateEl = document.createElement("time");
      dateEl.className = "ab-card-date";
      if (rec.date.raw) {
        dateEl.setAttribute("datetime", rec.date.raw);
      }
      dateEl.textContent = rec.date.display;

      const folio = document.createElement("span");
      folio.className = "ab-nb-folio";
      folio.textContent = `Folio ${formatFrNumber(index + 1)} / ${formatFrNumber(total)}`;

      head.append(badge, dateEl, folio);

      const scanBox = document.createElement("div");
      scanBox.className = "ab-nb-scan-box";

      const scanFrame = document.createElement("div");
      scanFrame.className = "ab-nb-scan-frame";

      if (rec.scans.length === 0) {
        scanFrame.appendChild(createScanPlaceholder());
        scanBox.appendChild(scanFrame);
      } else {
        const img = document.createElement("img");
        img.className = "ab-nb-scan-img";
        img.loading = "eager";
        img.decoding = "async";
        img.src = rec.scans[0].url;
        img.alt = `Scan manuscrit de la fiche BnF n° ${rec.numero}`;

        img.addEventListener("error", () => {
          scanFrame.replaceChildren(createScanPlaceholder());
        });

        scanFrame.appendChild(img);

        const scanActions = document.createElement("div");
        scanActions.className = "ab-scan-actions";

        const fullScreenLink = document.createElement("a");
        fullScreenLink.className = "ab-fullscreen-btn";
        fullScreenLink.href = rec.scans[0].url;
        fullScreenLink.target = "_blank";
        fullScreenLink.rel = "noopener noreferrer";
        fullScreenLink.textContent = "Plein écran ↗";
        fullScreenLink.setAttribute(
          "aria-label",
          `Ouvrir le scan de la fiche BnF n° ${rec.numero} en plein écran dans un nouvel onglet`
        );

        if (rec.scans.length > 1) {
          let activeScanIdx = 0;
          const tabs = document.createElement("div");
          tabs.className = "ab-scan-tabs";
          const tabBtns = [];

          rec.scans.forEach((scanItem, sIdx) => {
            const tabBtn = document.createElement("button");
            tabBtn.type = "button";
            tabBtn.className = "ab-scan-tab";
            tabBtn.setAttribute("aria-pressed", sIdx === 0 ? "true" : "false");
            tabBtn.textContent =
              rec.scans.length === 2
                ? sIdx === 0
                  ? "Recto"
                  : "Verso"
                : `Vue ${sIdx + 1}`;

            tabBtn.addEventListener("click", () => {
              if (activeScanIdx === sIdx) return;
              activeScanIdx = sIdx;
              tabBtns.forEach((b, bIdx) => {
                b.setAttribute("aria-pressed", bIdx === sIdx ? "true" : "false");
              });
              scanFrame.replaceChildren(img);
              img.src = scanItem.url;
              img.alt = `Scan manuscrit (${tabBtn.textContent}) de la fiche BnF n° ${rec.numero}`;
              fullScreenLink.href = scanItem.url;
            });

            tabBtns.push(tabBtn);
            tabs.appendChild(tabBtn);
          });

          scanActions.appendChild(tabs);
        }

        scanActions.appendChild(fullScreenLink);
        scanBox.append(scanFrame, scanActions);
      }

      const metaList = document.createElement("div");
      metaList.className = "ab-nb-meta-list";

      const addMeta = (keyText, valText) => {
        const block = document.createElement("span");
        block.className = "ab-meta-block";

        const kEl = document.createElement("span");
        kEl.className = "ab-meta-key";
        kEl.textContent = `${keyText} :`;

        const vEl = document.createElement("span");
        vEl.className = "ab-meta-val";
        vEl.textContent = valText;

        block.append(kEl, vEl);
        metaList.appendChild(block);
      };

      addMeta("Cote BnF", rec.cote);
      for (const g of rec.genres) {
        addMeta("Genre", g.label);
      }
      for (const p of rec.persons) {
        addMeta("Personne", p.label);
      }
      for (const l of rec.places) {
        addMeta("Lieu", l.label);
      }

      const foot = document.createElement("div");
      foot.className = "ab-nb-page-foot";

      const noticeLink = document.createElement("a");
      noticeLink.className = "ab-notice-link";
      noticeLink.href = rec.noticeUrl;
      noticeLink.target = "_blank";
      noticeLink.rel = "noopener noreferrer";
      noticeLink.textContent = "Notice complète →";
      noticeLink.setAttribute(
        "aria-label",
        `Notice complète de la fiche BnF n° ${rec.numero} dans Heurist`
      );

      foot.appendChild(noticeLink);
      page.append(head, scanBox, metaList, foot);
      return page;
    }

    function buildNotebookRightPage(rec, index, total) {
      const page = document.createElement("article");
      page.className = "ab-nb-page ab-nb-page--right";
      page.setAttribute(
        "aria-label",
        `Page de droite — Transcription de la fiche BnF n° ${rec.numero}`
      );

      const head = document.createElement("header");
      head.className = "ab-nb-page-head";

      const kindLabel = document.createElement("span");
      kindLabel.className = "ab-nb-folio";
      kindLabel.textContent = "Transcription critique";

      const pageTag = document.createElement("span");
      pageTag.className = "ab-nb-folio";
      pageTag.textContent = `${formatFrNumber(index + 1)} / ${formatFrNumber(total)}`;

      head.append(kindLabel, pageTag);

      const titleHeading = document.createElement("h3");
      titleHeading.className = "ab-nb-title";
      titleHeading.textContent = rec.title;

      const transDiv = document.createElement("div");
      transDiv.className = "ab-nb-transcription";
      renderSanitizedTranscription(transDiv, rec.transcriptionHtml, `nb-${rec.id}`);

      page.append(head, titleHeading, transDiv);
      return page;
    }

    function updateNotebookControls(rec) {
      const total = getTotalNotebookPages();
      const disabledAll = state.notebookLoading || total === 0;

      nbPrevBtn.disabled = disabledAll || state.notebookIndex <= 0;
      nbNextBtn.disabled = disabledAll || state.notebookIndex >= total - 1;
      nbRandomPageBtn.disabled = state.notebookLoading || total <= 1;
      nbJumpInput.disabled = disabledAll;
      nbJumpSubmit.disabled = disabledAll;

      if (total > 0) {
        nbJumpInput.max = String(total);
        nbJumpInput.value = String(state.notebookIndex + 1);
        nbCounter.textContent = `Fiche ${formatFrNumber(state.notebookIndex + 1)} sur ${formatFrNumber(total)}`;
        if (rec) {
          notebookSub.textContent = `Fiche BnF n° ${rec.numero} · ${rec.date.display} — utilise les boutons ou les flèches ← / →.`;
        }
      } else if (state.notebookLoading) {
        nbCounter.textContent = "Chargement…";
      } else {
        nbCounter.textContent = "Aucune fiche";
      }
    }

    function renderNotebookOverlayState() {
      if (state.notebookLoading) {
        nbBookCover.hidden = true;
        nbStateOverlay.hidden = false;

        const loadingBox = document.createElement("div");
        loadingBox.className = "ab-state-box";

        const title = document.createElement("p");
        title.className = "ab-state-title";
        title.textContent = "Ouverture du carnet de note";

        const desc = document.createElement("p");
        desc.className = "ab-state-desc";
        desc.textContent = `Base ${config.db} — chargement du folio…`;

        const progress = document.createElement("progress");
        progress.className = "ab-progress";
        progress.setAttribute("aria-label", "Chargement du carnet en cours");

        loadingBox.append(title, desc, progress);
        nbStateOverlay.replaceChildren(loadingBox);
        return;
      }

      if (state.notebookError) {
        nbBookCover.hidden = true;
        nbStateOverlay.hidden = false;

        const errBox = document.createElement("div");
        errBox.className = "ab-state-box is-error";
        errBox.setAttribute("role", "alert");

        const title = document.createElement("p");
        title.className = "ab-state-title";
        title.textContent = "Impossible d’ouvrir cette page du carnet";

        const desc = document.createElement("p");
        desc.className = "ab-state-desc";
        desc.textContent = state.notebookError;

        const retryBtn = document.createElement("button");
        retryBtn.type = "button";
        retryBtn.className = "ab-page-btn";
        retryBtn.textContent = "Réessayer";
        retryBtn.addEventListener("click", () => {
          openNotebookAt(state.notebookIndex, { animate: false, forceRetry: true });
        });

        errBox.append(title, desc, retryBtn);
        nbStateOverlay.replaceChildren(errBox);
        return;
      }

      nbStateOverlay.hidden = true;
      nbStateOverlay.replaceChildren();
      nbBookCover.hidden = false;
    }

    function animateNotebookTurn(oldLeft, oldRight, newLeft, newRight, direction) {
      cancelActiveFlip();

      const reducedMotion =
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (reducedMotion || !oldLeft || !oldRight) {
        nbLeftSlot.replaceChildren(newLeft);
        nbRightSlot.replaceChildren(newRight);
        return;
      }

      let isMobile = false;
      if (typeof getComputedStyle === "function") {
        const cols = getComputedStyle(nbBookStage).gridTemplateColumns || "";
        const trackCount = cols.trim() ? cols.trim().split(/\s+/).length : 2;
        isMobile = trackCount <= 1;
      } else if (typeof nbDesk.clientWidth === "number" && nbDesk.clientWidth > 0) {
        isMobile = nbDesk.clientWidth <= 720;
      }

      const leaf = document.createElement("div");
      leaf.setAttribute("aria-hidden", "true");
      leaf.setAttribute("inert", "");
      leaf.inert = true;

      const frontFace = document.createElement("div");
      frontFace.className = "ab-flip-face ab-flip-face--front";

      const backFace = document.createElement("div");
      backFace.className = "ab-flip-face ab-flip-face--back";

      if (isMobile) {
        leaf.className = `ab-flip-leaf is-mobile ${direction === "next" ? "is-next" : "is-prev"} is-animating`;
        if (direction === "next") {
          nbLeftSlot.replaceChildren(newLeft);
          nbRightSlot.replaceChildren(newRight);
          frontFace.append(
            sanitizeCloneForFlip(oldLeft),
            sanitizeCloneForFlip(oldRight)
          );
        } else {
          frontFace.append(
            sanitizeCloneForFlip(newLeft),
            sanitizeCloneForFlip(newRight)
          );
        }
      } else {
        leaf.className = `ab-flip-leaf ${direction === "next" ? "is-next" : "is-prev"} is-animating`;
        if (direction === "next") {
          nbRightSlot.replaceChildren(newRight);
          frontFace.appendChild(sanitizeCloneForFlip(oldRight));
          backFace.appendChild(sanitizeCloneForFlip(newLeft));
        } else {
          nbLeftSlot.replaceChildren(newLeft);
          frontFace.appendChild(sanitizeCloneForFlip(oldLeft));
          backFace.appendChild(sanitizeCloneForFlip(newRight));
        }
      }

      leaf.append(frontFace, backFace);
      nbBookStage.appendChild(leaf);

      let finished = false;
      let fallbackTimer = null;

      const finishFlip = () => {
        if (finished) return;
        finished = true;
        if (fallbackTimer) {
          clearTimeout(fallbackTimer);
          fallbackTimer = null;
        }
        leaf.removeEventListener("animationend", onAnimEnd);
        leaf.removeEventListener("animationcancel", finishFlip);
        if (nbLeftSlot.firstElementChild !== newLeft) {
          nbLeftSlot.replaceChildren(newLeft);
        }
        if (nbRightSlot.firstElementChild !== newRight) {
          nbRightSlot.replaceChildren(newRight);
        }
        if (typeof leaf.remove === "function") {
          leaf.remove();
        } else if (leaf.parentNode) {
          leaf.parentNode.removeChild(leaf);
        }
        if (activeFlipCancel === finishFlip) {
          activeFlipCancel = null;
        }
      };

      const onAnimEnd = (event) => {
        if (event && event.target !== leaf) return;
        finishFlip();
      };

      const anims =
        typeof leaf.getAnimations === "function" ? leaf.getAnimations() : [];
      if (!anims || anims.length === 0) {
        finishFlip();
        return;
      }

      activeFlipCancel = finishFlip;
      leaf.addEventListener("animationend", onAnimEnd);
      leaf.addEventListener("animationcancel", finishFlip);
      fallbackTimer = setTimeout(finishFlip, 800);
    }

    async function fetchNotebookRecord(index) {
      if (index < state.corpusRecords.length && state.corpusRecords[index]) {
        return state.corpusRecords[index];
      }
      if (state.notebookRecordsByIndex.has(index)) {
        return state.notebookRecordsByIndex.get(index);
      }
      const { normalized } = await fetchHeuristRecords(
        `t:${BASE_RECTYPE}`,
        1,
        index,
        undefined
      );
      if (normalized.length === 0) {
        throw new Error("Fiche introuvable à cette position.");
      }
      state.notebookRecordsByIndex.set(index, normalized[0]);
      return normalized[0];
    }

    async function openNotebookAt(targetIndex, options = {}) {
      const { animate = false, direction = null, forceRetry = false } = options;
      const token = ++activeNotebookToken;
      const prevIndex = state.notebookIndex;

      try {
        if (!state.corpusLoaded || forceRetry) {
          state.notebookError = null;
          state.notebookLoading = true;
          renderNotebookOverlayState();
          updateNotebookControls(null);
          await ensureCorpusLoaded(forceRetry || Boolean(state.corpusError));
          if (token !== activeNotebookToken) return;
        }

        const total = getTotalNotebookPages();
        if (total === 0) {
          throw new Error("Aucune fiche disponible dans le corpus t:102.");
        }

        const clamped = Math.max(0, Math.min(Number(targetIndex) || 0, total - 1));
        let rec = null;

        if (clamped < state.corpusRecords.length && state.corpusRecords[clamped]) {
          rec = state.corpusRecords[clamped];
        } else if (state.notebookRecordsByIndex.has(clamped)) {
          rec = state.notebookRecordsByIndex.get(clamped);
        } else {
          state.notebookError = null;
          state.notebookLoading = true;
          renderNotebookOverlayState();
          updateNotebookControls(null);
          rec = await fetchNotebookRecord(clamped);
          if (token !== activeNotebookToken) return;
        }

        state.notebookLoading = false;
        state.notebookError = null;
        renderNotebookOverlayState();

        const oldLeft = nbLeftSlot.firstElementChild;
        const oldRight = nbRightSlot.firstElementChild;
        const newLeft = buildNotebookLeftPage(rec, clamped, total);
        const newRight = buildNotebookRightPage(rec, clamped, total);

        state.notebookIndex = clamped;
        updateNotebookControls(rec);

        if (animate && oldLeft && oldRight && clamped !== prevIndex) {
          const dir = direction || (clamped > prevIndex ? "next" : "prev");
          animateNotebookTurn(oldLeft, oldRight, newLeft, newRight, dir);
        } else {
          cancelActiveFlip();
          nbLeftSlot.replaceChildren(newLeft);
          nbRightSlot.replaceChildren(newRight);
        }

        if (total > state.corpusRecords.length && clamped + 1 < total) {
          fetchNotebookRecord(clamped + 1).catch(() => {});
        }
      } catch (err) {
        if (token !== activeNotebookToken) return;
        cancelActiveFlip();
        state.notebookLoading = false;
        state.notebookError =
          err && err.message
            ? err.message
            : "Erreur réseau lors du chargement du carnet.";
        renderNotebookOverlayState();
        updateNotebookControls(null);
      }
    }

    function turnNotebookBy(delta) {
      if (state.notebookLoading) return;
      const total = getTotalNotebookPages();
      if (total === 0) return;
      const nextIndex = Math.max(
        0,
        Math.min(state.notebookIndex + delta, total - 1)
      );
      if (nextIndex === state.notebookIndex) return;
      openNotebookAt(nextIndex, {
        animate: true,
        direction: delta > 0 ? "next" : "prev"
      });
    }

    // --- Chargement depuis l'API Heurist ---
    function extractRecordsFromResponse(payload) {
      const container = payload?.heurist || payload?.data || payload || {};
      let rawRecords = container.records || [];
      if (!Array.isArray(rawRecords) && rawRecords && typeof rawRecords === "object") {
        const order = Array.isArray(container.order) ? container.order : null;
        if (order) {
          rawRecords = order.map((id) => rawRecords[String(id)]).filter(Boolean);
        } else {
          rawRecords = Object.values(rawRecords);
        }
      }

      const rawCount =
        container.count ??
        container.total ??
        container.reccount_total ??
        payload?.count ??
        payload?.total;
      const parsedTotal =
        rawCount !== undefined && rawCount !== null && rawCount !== ""
          ? Number(rawCount)
          : null;

      return {
        rawRecords: Array.isArray(rawRecords) ? rawRecords : [],
        serverTotal: Number.isFinite(parsedTotal) ? parsedTotal : null
      };
    }

    async function fetchHeuristRecords(q, limit, offset, signal) {
      const params = new URLSearchParams();
      params.set("db", config.db);
      params.set("q", q);
      params.set("limit", String(limit));
      params.set("offset", String(offset));
      params.set("format", "json");
      params.set("extended", "2");

      const requestUrl = `${config.recordOutputUrl}?${params.toString()}`;
      const response = await fetch(requestUrl, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal
      });

      const rawText = await response.text();
      let data;
      try {
        data = JSON.parse(rawText);
      } catch (_parseErr) {
        throw new Error(
          `Réponse non JSON reçue depuis Heurist (HTTP ${response.status}).`
        );
      }

      if (!response.ok || data.error) {
        const msg =
          data.message?.replace(/<[^>]+>/g, " ").trim() ||
          data.error ||
          `Erreur HTTP ${response.status}`;
        throw new Error(msg);
      }

      const { rawRecords, serverTotal } = extractRecordsFromResponse(data);
      const normalized = rawRecords.map((r) => normalizeRecord(r, config));
      const serverDidSlice =
        serverTotal !== null &&
        serverTotal > normalized.length &&
        normalized.length <= limit;

      return {
        normalized,
        serverTotal,
        serverDidSlice
      };
    }

    function applyBaseCorpusPayload(normalized, serverTotal, serverDidSlice) {
      state.corpusRecords = normalized;
      state.corpusTotal = serverDidSlice ? serverTotal : normalized.length;
      state.corpusLoaded = true;
      state.corpusLoading = false;
      state.corpusError = null;

      if (!state.facetsInitialized) {
        state.facets = buildFacetsFromRecords(normalized);
        state.facetsInitialized = true;
        renderAllFacetOptions();
      }

      if (!serverDidSlice) {
        queryCache.set(`t:${BASE_RECTYPE}`, normalized);
      }

      updateHomeMetrics();
    }

    async function ensureCorpusLoaded(force = false) {
      if (state.corpusLoaded && !force) {
        return state.corpusRecords;
      }
      if (corpusPromise && !force) {
        return corpusPromise;
      }

      state.corpusLoading = true;
      state.corpusError = null;

      const currentQ = buildHeuristQuery(state, state.facets).q;
      if (currentQ === `t:${BASE_RECTYPE}` && state.records.length === 0) {
        state.isLoading = true;
        state.error = null;
        renderResults();
      }

      corpusPromise = (async () => {
        try {
          const { normalized, serverTotal, serverDidSlice } =
            await fetchHeuristRecords(
              `t:${BASE_RECTYPE}`,
              state.limit,
              0,
              undefined
            );
          applyBaseCorpusPayload(normalized, serverTotal, serverDidSlice);

          const latestQuery = buildHeuristQuery(state, state.facets).q;
          if (latestQuery === `t:${BASE_RECTYPE}` && state.offset === 0) {
            state.totalCount = state.corpusTotal;
            state.records = serverDidSlice
              ? normalized
              : normalized.slice(0, state.limit);
            state.isLoading = false;
            state.error = null;
            statusBar.dataset.query = `t:${BASE_RECTYPE}`;
            renderResults();
          }

          return normalized;
        } catch (err) {
          state.corpusLoading = false;
          state.corpusError =
            err && err.message
              ? err.message
              : "Erreur réseau lors de la connexion à l’API Heurist.";
          corpusPromise = null;

          const latestQuery = buildHeuristQuery(state, state.facets).q;
          if (latestQuery === `t:${BASE_RECTYPE}` && state.records.length === 0) {
            state.isLoading = false;
            state.error = state.corpusError;
            renderResults();
          }
          throw err;
        }
      })();

      return corpusPromise;
    }

    async function drawRandomRecord() {
      const token = ++activeRandomToken;
      state.randomError = null;
      state.randomLoading = true;
      renderRandomView();

      try {
        if (!state.corpusLoaded) {
          await ensureCorpusLoaded(Boolean(state.corpusError));
        }
        if (token !== activeRandomToken) return;

        let chosen = null;
        const pool = state.corpusRecords;
        const total = state.corpusTotal || pool.length;

        if (total > pool.length && total > 0) {
          const randOffset = getRandomIndex(total, state.lastRandomOffset);
          state.lastRandomOffset = randOffset;
          const { normalized } = await fetchHeuristRecords(
            `t:${BASE_RECTYPE}`,
            1,
            randOffset,
            undefined
          );
          if (token !== activeRandomToken) return;
          if (normalized.length > 0) {
            chosen = normalized[0];
          }
        }

        if (!chosen && pool.length > 0) {
          const currentId = state.currentRandomRecord
            ? state.currentRandomRecord.id
            : null;
          let remaining = pool.filter((r) => !state.drawnRandomIds.has(r.id));
          if (remaining.length === 0) {
            state.drawnRandomIds.clear();
            remaining =
              pool.length > 1 && currentId
                ? pool.filter((r) => r.id !== currentId)
                : pool;
          }
          const idx = getRandomIndex(remaining.length);
          chosen = remaining[idx];
          state.drawnRandomIds.add(chosen.id);
        }

        if (!chosen) {
          throw new Error("Aucune fiche disponible dans le corpus t:102.");
        }

        state.currentRandomRecord = chosen;
        state.randomDrawCount += 1;
        state.randomLoading = false;
        state.randomError = null;
        renderRandomView();
      } catch (err) {
        if (token !== activeRandomToken) return;
        state.randomLoading = false;
        state.randomError =
          err && err.message
            ? err.message
            : "Impossible de tirer une fiche aléatoire depuis Heurist.";
        renderRandomView();
      }
    }

    async function executeSearch(options = {}) {
      const { scrollTop = false, forceRetry = false } = options;
      const { q, humanQuery } = buildHeuristQuery(state, state.facets);
      statusBar.dataset.query = humanQuery;

      const baseQuery = `t:${BASE_RECTYPE}`;

      // Si l'endpoint a déjà renvoyé la totalité des résultats non paginés pour cette requête q,
      // on découpe instantanément la tranche [offset, offset + limit] sans re-télécharger tout le flux.
      const cachedFull = !forceRetry ? queryCache.get(q) : null;
      if (cachedFull) {
        state.totalCount = cachedFull.length;
        state.records = cachedFull.slice(state.offset, state.offset + state.limit);
        state.isLoading = false;
        state.error = null;
        renderResults();
        if (scrollTop) {
          scrollIntoViewCleanly();
        }
        return;
      }

      if (q === baseQuery && state.offset === 0) {
        if (state.corpusLoaded && !forceRetry) {
          state.totalCount = state.corpusTotal;
          state.records = state.corpusRecords.slice(0, state.limit);
          state.isLoading = false;
          state.error = null;
          renderResults();
          if (scrollTop) {
            scrollIntoViewCleanly();
          }
          return;
        }
        if (corpusPromise || forceRetry) {
          state.isLoading = true;
          state.error = null;
          renderResults();
          try {
            await ensureCorpusLoaded(forceRetry);
            if (scrollTop) {
              scrollIntoViewCleanly();
            }
            return;
          } catch (_baseErr) {
            return;
          }
        }
      }

      if (activeAbortController) {
        activeAbortController.abort();
      }
      activeAbortController = new AbortController();
      const { signal } = activeAbortController;

      state.isLoading = true;
      state.error = null;
      renderResults();

      try {
        const { normalized, serverTotal, serverDidSlice } =
          await fetchHeuristRecords(q, state.limit, state.offset, signal);

        if (q === baseQuery && state.offset === 0 && !state.corpusLoaded) {
          applyBaseCorpusPayload(normalized, serverTotal, serverDidSlice);
        }

        if (serverDidSlice) {
          state.totalCount = serverTotal;
          state.records = normalized;
        } else {
          if (normalized.length > state.limit || q === baseQuery) {
            queryCache.set(q, normalized);
          }
          state.totalCount = normalized.length;
          state.records = normalized.slice(state.offset, state.offset + state.limit);
        }

        state.isLoading = false;
        state.error = null;
        renderResults();

        if (scrollTop) {
          scrollIntoViewCleanly();
        }
      } catch (err) {
        if (err && err.name === "AbortError") {
          return;
        }
        state.isLoading = false;
        state.error =
          err && err.message
            ? err.message
            : "Erreur réseau lors de la connexion à l’API Heurist.";
        renderResults();
      }
    }

    function scrollIntoViewCleanly() {
      const reducedMotion =
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      statusBar.scrollIntoView({
        behavior: reducedMotion ? "auto" : "smooth",
        block: "start"
      });
    }

    function switchView(nextView, options = {}) {
      if (!viewElements[nextView]) return;
      const {
        moveFocus = true,
        focusTarget = null,
        drawNewRandom = false,
        scrollToTop = true
      } = options;

      if (state.view === "search" && nextView !== "search") {
        closeAllManualPopovers(null);
      }
      if (state.view === "notebook" && nextView !== "notebook") {
        cancelActiveFlip();
      }

      state.view = nextView;

      const applyViewDom = () => {
        for (const [key, viewEl] of Object.entries(viewElements)) {
          const active = key === state.view;
          viewEl.classList.toggle("is-inactive", !active);
          viewEl.setAttribute("aria-hidden", active ? "false" : "true");
          if (active) {
            viewEl.removeAttribute("inert");
            viewEl.inert = false;
            navButtons[key].setAttribute("aria-current", "page");
          } else {
            viewEl.setAttribute("inert", "");
            viewEl.inert = true;
            navButtons[key].removeAttribute("aria-current");
          }
        }
        syncStatusLiveMode();
      };

      const finalizeFocus = () => {
        if (scrollToTop && typeof root.getBoundingClientRect === "function") {
          const rect = root.getBoundingClientRect();
          if (rect.top < 0 && typeof root.scrollIntoView === "function") {
            const reduced =
              typeof window.matchMedia === "function" &&
              window.matchMedia("(prefers-reduced-motion: reduce)").matches;
            root.scrollIntoView({
              behavior: reduced ? "auto" : "smooth",
              block: "start"
            });
          }
        }
        if (!moveFocus) return;

        if (focusTarget && typeof focusTarget.focus === "function") {
          focusTarget.focus({ preventScroll: true });
          if (focusTarget === searchInput && searchInput.value) {
            searchInput.select();
          }
          return;
        }

        if (state.view === "home") {
          homeHeading.focus({ preventScroll: true });
        } else if (state.view === "search") {
          searchInput.focus({ preventScroll: true });
        } else if (state.view === "random") {
          randomHeading.focus({ preventScroll: true });
        } else if (state.view === "notebook") {
          notebookHeading.focus({ preventScroll: true });
        }
      };

      const reducedMotion =
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const navId = ++activeViewNavId;

      if (!reducedMotion && typeof document.startViewTransition === "function") {
        const vt = document.startViewTransition(() => {
          applyViewDom();
        });
        vt.finished
          .catch(() => {})
          .finally(() => {
            if (navId === activeViewNavId) {
              finalizeFocus();
            }
          });
      } else {
        applyViewDom();
        finalizeFocus();
      }

      if (state.view === "search") {
        if (state.records.length === 0 && !state.isLoading) {
          executeSearch({ forceRetry: Boolean(state.error) });
        }
      } else if (state.view === "random") {
        if (drawNewRandom || (!state.currentRandomRecord && !state.randomLoading)) {
          drawRandomRecord();
        } else {
          renderRandomView();
        }
      } else if (state.view === "notebook") {
        openNotebookAt(state.notebookIndex, {
          animate: false,
          forceRetry: Boolean(state.notebookError)
        });
      }
    }

    // --- Navigation entre les vues (Présentation / Recherche / Fiche aléatoire / Carnet de note) ---
    navHomeBtn.addEventListener("click", () => {
      switchView("home", { moveFocus: true });
    });

    navSearchBtn.addEventListener("click", () => {
      switchView("search", { moveFocus: true });
    });

    navRandomBtn.addEventListener("click", () => {
      switchView("random", { moveFocus: true });
    });

    navNotebookBtn.addEventListener("click", () => {
      switchView("notebook", { moveFocus: true });
    });

    ctaSearchBtn.addEventListener("click", () => {
      switchView("search", { moveFocus: true });
    });

    ctaRandomBtn.addEventListener("click", () => {
      switchView("random", { moveFocus: true, drawNewRandom: true });
    });

    ctaNotebookBtn.addEventListener("click", () => {
      switchView("notebook", { moveFocus: true });
    });

    searchBackHomeBtn.addEventListener("click", () => {
      switchView("home", { moveFocus: true });
    });

    searchToRandomBtn.addEventListener("click", () => {
      switchView("random", { moveFocus: true });
    });

    searchToNotebookBtn.addEventListener("click", () => {
      switchView("notebook", { moveFocus: true });
    });

    randomBackHomeBtn.addEventListener("click", () => {
      switchView("home", { moveFocus: true });
    });

    randomGoSearchBtn.addEventListener("click", () => {
      switchView("search", { moveFocus: true });
    });

    randomDrawBtn.addEventListener("click", () => {
      drawRandomRecord();
    });

    nbBackHomeBtn.addEventListener("click", () => {
      switchView("home", { moveFocus: true });
    });

    nbGoSearchBtn.addEventListener("click", () => {
      switchView("search", { moveFocus: true });
    });

    nbRandomPageBtn.addEventListener("click", () => {
      const total = getTotalNotebookPages();
      if (total <= 1 || state.notebookLoading) return;
      const randIdx = getRandomIndex(total, state.notebookIndex);
      openNotebookAt(randIdx, {
        animate: true,
        direction: randIdx > state.notebookIndex ? "next" : "prev"
      });
    });

    nbPrevBtn.addEventListener("click", () => {
      turnNotebookBy(-1);
    });

    nbNextBtn.addEventListener("click", () => {
      turnNotebookBy(1);
    });

    nbJumpForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const total = getTotalNotebookPages();
      if (total === 0 || state.notebookLoading) return;
      const rawVal = parseInt(nbJumpInput.value, 10);
      if (!Number.isFinite(rawVal)) return;
      const target = Math.max(0, Math.min(rawVal - 1, total - 1));
      if (target === state.notebookIndex) {
        nbJumpInput.value = String(target + 1);
        return;
      }
      openNotebookAt(target, {
        animate: true,
        direction: target > state.notebookIndex ? "next" : "prev"
      });
    });

    // --- Événements de recherche, pagination et raccourcis ---
    function triggerImmediateSearch() {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }
      const nextQuery = searchInput.value.trim();
      if (nextQuery === state.searchQuery && state.offset === 0 && !state.error) {
        return;
      }
      state.searchQuery = nextQuery;
      state.offset = 0;
      updateFilterIndicators();
      executeSearch();
    }

    searchInput.addEventListener("input", () => {
      searchClearBtn.hidden = searchInput.value.length === 0;
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        state.searchQuery = searchInput.value.trim();
        state.offset = 0;
        updateFilterIndicators();
        executeSearch();
      }, SEARCH_DEBOUNCE_MS);
    });

    searchInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        if (event.isComposing || event.keyCode === 229) {
          return;
        }
        triggerImmediateSearch();
      }
    });

    searchForm.addEventListener("submit", (event) => {
      event.preventDefault();
      triggerImmediateSearch();
    });

    searchClearBtn.addEventListener("click", () => {
      searchInput.value = "";
      state.searchQuery = "";
      state.offset = 0;
      updateFilterIndicators();
      executeSearch();
      searchInput.focus();
    });

    resetBtn.addEventListener("click", () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }
      searchInput.value = "";
      state.searchQuery = "";
      state.offset = 0;
      for (const fc of facetConfigs) {
        state.selected[fc.key].clear();
        state.popoverSearch[fc.key] = "";
        facetRefs[fc.key].popSearch.value = "";
      }
      updateFilterIndicators();
      renderAllFacetOptions();
      executeSearch();
    });

    const goToPrevPage = (fromBottom) => {
      if (state.offset <= 0 || state.isLoading) return;
      state.offset = Math.max(0, state.offset - state.limit);
      executeSearch({ scrollTop: fromBottom });
    };

    const goToNextPage = (fromBottom) => {
      if (state.offset + state.limit >= state.totalCount || state.isLoading) return;
      state.offset += state.limit;
      executeSearch({ scrollTop: fromBottom });
    };

    topPag.prevBtn.addEventListener("click", () => goToPrevPage(false));
    topPag.nextBtn.addEventListener("click", () => goToNextPage(false));
    bottomPag.prevBtn.addEventListener("click", () => goToPrevPage(true));
    bottomPag.nextBtn.addEventListener("click", () => goToNextPage(true));

    // Raccourci clavier Ctrl + K / Cmd + K (bascule vers la recherche) et ← / → dans le Carnet de note
    document.addEventListener("keydown", (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (state.view !== "search") {
          switchView("search", { moveFocus: true, focusTarget: searchInput });
          return;
        }
        searchInput.focus();
        if (searchInput.value) {
          searchInput.select();
        }
        return;
      }

      if (
        state.view === "notebook" &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.altKey &&
        (event.key === "ArrowLeft" || event.key === "ArrowRight")
      ) {
        const tgt = event.target;
        const tag = tgt && tgt.tagName ? tgt.tagName.toLowerCase() : "";
        if (tag === "input" || tag === "textarea" || tag === "select") {
          return;
        }
        event.preventDefault();
        turnNotebookBy(event.key === "ArrowRight" ? 1 : -1);
      }
    });

    // Lancement initial sur la page de présentation + préchargement silencieux du corpus
    renderAllFacetOptions();
    ensureCorpusLoaded().catch(() => {});
  }

  // --- Initialisation tolérante à l'injection dynamique dans Heurist CMS ---
  function init() {
    const existing = document.getElementById(ROOT_ID);
    if (existing) {
      mountApp(existing);
      return;
    }

    let observer = null;
    let pollTimer = null;
    let stopTimer = null;

    const cleanup = () => {
      if (observer) {
        observer.disconnect();
        observer = null;
      }
      if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
      }
      if (stopTimer) {
        clearTimeout(stopTimer);
        stopTimer = null;
      }
      document.removeEventListener("DOMContentLoaded", tryMount);
    };

    const tryMount = () => {
      const el = document.getElementById(ROOT_ID);
      if (el) {
        cleanup();
        mountApp(el);
      }
    };

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", tryMount);
    }

    if (typeof MutationObserver === "function" && document.documentElement) {
      observer = new MutationObserver(tryMount);
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true
      });
    }

    pollTimer = setInterval(tryMount, MOUNT_POLL_INTERVAL_MS);
    stopTimer = setTimeout(cleanup, MOUNT_TIMEOUT_MS);
  }

  init();
})();

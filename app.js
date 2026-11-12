(() => {
  "use strict";

  const ROOT_ID = "archibarthes-root";
  const APP_VERSION = "2.0.0";
  const DEFAULT_DB = "GF_Copie_EcoleCentrale";
  const SEARCH_DEBOUNCE_MS = 220;
  const MOUNT_POLL_INTERVAL_MS = 100;
  const MOUNT_TIMEOUT_MS = 30000;

  const PORTRAIT_URL =
    "https://upload.wikimedia.org/wikipedia/commons/thumb/3/3c/Roland_Barthes_1953.jpg/800px-Roland_Barthes_1953.jpg";

  const ROUTES = ["presentation", "recherche", "decouverte", "methodes"];
  const ROUTE_TITLES = {
    presentation: "Présentation | ArchiBarthes — Le Grand Fichier de Roland Barthes",
    recherche: "Recherche | ArchiBarthes — Le Grand Fichier de Roland Barthes",
    decouverte: "Découverte | ArchiBarthes — Le Grand Fichier de Roland Barthes",
    methodes: "Méthodes | ArchiBarthes — Le Grand Fichier de Roland Barthes"
  };

  /* =========================================================================
     CONTENU ÉDITORIAL CONFIGURABLE (FACILEMENT MODIFIABLE PAR L'ÉQUIPE)
     ========================================================================= */
  const EDITORIAL_CONFIG = {
    heroKicker: "ARCHIVES LITTÉRAIRES · ÉDITION NUMÉRIQUE",
    heroTitlePrefix: "Le Grand Fichier de Roland ",
    heroTitleHighlight: "Barthes.",
    heroSubtitle:
      "Édition critique et génétique des fiches manuscrites conservées à la Bibliothèque nationale de France (NAF 28630).",
    portraitCaption: "Roland Barthes, 1953",
    portraitCredit: "© Henri Cartier-Bresson",
    aboutKicker: "À PROPOS DU PROJET",
    aboutTitle: "Une édition critique et ouverte du « Grand Fichier »",
    aboutBody:
      "Porté par l'Université de Nantes en partenariat avec le CNRS et hébergé sur l'infrastructure Huma-Num, le programme ArchiBarthes donne accès aux fiches de notes autographes rédigées par Roland Barthes entre 1968 et 1980. Chaque fiche articule fac-similé haute définition, transcription génétique, appareil de notes critiques et indexation croisée des personnes, des lieux et des renvois internes.",
    team: [
      {
        name: "M. Messager",
        role: "Responsable scientifique",
        affiliation: "Nantes Université",
        bio: "Direction scientifique de l'édition critique, établissement philologique des transcriptions, appareil d'annotation et coordination de l'encodage sous Heurist."
      }
    ],
    methodsIntro: {
      kicker: "PROTOCOLES & CHOIX ÉDITORIAUX",
      title: "Méthodes de l'édition numérique",
      lead: "Principes archivistiques, philologiques, documentaires et logiciels qui fondent l'édition critique du Grand Fichier de Roland Barthes."
    },
    methodsCards: [
      {
        num: "01",
        tag: "ARCHIVES BNF · NAF 28630",
        title: "Le fonds manuscrit à la BnF",
        summary:
          "Les fiches bristol autographes conservées au département des Manuscrits de la Bibliothèque nationale de France (fonds Roland Barthes, NAF 28630) couvrent la période 1968–1980. Classées à l'origine dans des enveloppes thématiques et chronologiques, elles documentent au jour le jour observations, lectures, scènes vues et fragments théoriques.",
        points: [
          "Conservation de la cote d'origine BnF et du classement en enveloppes (1968–1977, etc.).",
          "Numérisation complète recto et verso lorsque le verso comporte des ajouts ou variantes.",
          "Datation fine au jour près ou par fourchette chronologique lorsque la mention reste lacunaire."
        ]
      },
      {
        num: "02",
        tag: "PHILOLOGIE & CRITIQUE",
        title: "Protocole de transcription critique",
        summary:
          "La transcription restitue l'état du manuscrit avec fidélité tout en garantissant sa lisibilité critique. Les soulignements, ajouts marginaux au crayon, graphies singulières et abréviations d'auteur sont préservés ou élucidés grâce à un appareil de notes reliées au texte.",
        points: [
          "Mise en regard synoptique permanente du scan HD et du texte établi.",
          "Appels de notes interactifs ([1], [i]) précisant contexte historique, variantes et sources.",
          "Repérage systématique des renvois internes entre fiches (cf. fiche n°…) pour recomposer les réseaux de pensée."
        ]
      },
      {
        num: "03",
        tag: "HUMA-NUM · HEURIST",
        title: "Modélisation dans Heurist (Huma-Num)",
        summary:
          "L'ensemble du corpus est structuré dans la base relationnelle Heurist (GF_Copie_EcoleCentrale) déployée sur les serveurs de la TGIR Huma-Num. Ce modèle relie les fiches (t:102) aux référentiels normalisés des personnes (t:10) et des lieux (t:12).",
        points: [
          "Typologie des personnes distinguant artistes (musiciens, cinéastes, peintres…) et autres figures du corpus.",
          "Hiérarchie géographique structurée par pays, ville et micro-lieu parisien ou marocain.",
          "Contrôle strict des vocabulaires de genres et de thèmes sans enfermement propriétaire."
        ]
      },
      {
        num: "04",
        tag: "OPEN SCIENCE · VANILLA JS",
        title: "Architecture numérique ouverte",
        summary:
          "L'interface repose sur une architecture web découplée (headless) sans framework ni étape de compilation. Injectée directement au-dessus de l'API JSON Heurist, elle privilégie la pérennité du code, la légèreté réseau et l'accessibilité WCAG AA.",
        points: [
          "100 % Vanilla JavaScript ES2022+ et CSS isolé sous #archibarthes-root via @layer.",
          "Filtrage multicritère instantané et recherche sensible à la casse [Aa] activée par défaut.",
          "Modales natives <dialog>, navigation clavier complète et prise en charge du mode contraste élevé."
        ]
      }
    ]
  };

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

  const ALLOWED_HTML_TAGS = new Set([
    "p",
    "br",
    "b",
    "strong",
    "i",
    "em",
    "u",
    "s",
    "del",
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
    "template",
    "form",
    "input",
    "button"
  ]);

  /* =========================================================================
     OUTILS DE CONFIGURATION & RESEAU
     ========================================================================= */
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

  async function fetchHeuristRecords(config, query, limit = 1500) {
    const all = [];
    const seen = new Set();
    let offset = 0;

    for (let page = 0; page < 12; page += 1) {
      const url = new URL(config.recordOutputUrl);
      url.searchParams.set("db", config.db);
      url.searchParams.set("q", query);
      url.searchParams.set("limit", String(limit));
      url.searchParams.set("offset", String(offset));
      url.searchParams.set("format", "json");
      url.searchParams.set("extended", "2");

      const res = await fetch(url.toString(), {
        method: "GET",
        headers: { Accept: "application/json" }
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} (${query})`);
      }
      const data = await res.json();
      const heurist = data?.heurist || data || {};
      const recs = Array.isArray(heurist.records) ? heurist.records : [];
      const totalCount = Number(heurist.resultCount ?? heurist.recordCount ?? recs.length) || recs.length;

      let addedThisBatch = 0;
      for (const r of recs) {
        const rid = String(r?.rec_ID ?? r?.recID ?? "");
        if (!rid || seen.has(rid)) continue;
        seen.add(rid);
        all.push(r);
        addedThisBatch += 1;
      }

      if (all.length >= totalCount || recs.length === 0 || addedThisBatch === 0) {
        break;
      }
      offset += recs.length;
    }

    return all;
  }

  /* =========================================================================
     EXTRACTION & NORMALISATION DES DONNÉES HEURIST
     ========================================================================= */
  function normalizeLoose(str) {
    return String(str || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  }

  function extractTextFromHtml(html) {
    if (!html) return "";
    if (!/<[a-z][\s\S]*>/i.test(html)) {
      return String(html).replace(/\s+/g, " ").trim();
    }
    const parser = new DOMParser();
    const doc = parser.parseFromString(String(html), "text/html");
    const gtx = doc.getElementById("gtx-trans");
    if (gtx) gtx.remove();
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
        const list = Array.isArray(group)
          ? group
          : group && typeof group === "object"
          ? Object.values(group)
          : [group];
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
        const ym = base.match(/\b(\d{4})\b/);
        const prefix = rawVal.timestamp.circa ? "v. " : "";
        return {
          raw: base,
          display: prefix + formatIsoDateFr(base),
          year: ym ? ym[1] : "",
          yearNum: ym ? parseInt(ym[1], 10) : null
        };
      }
      if (rawVal.start || rawVal.end) {
        const startStr = rawVal.start?.earliest || rawVal.start?.latest || "";
        const endStr = rawVal.end?.latest || rawVal.end?.earliest || "";
        const ym = (startStr || endStr).match(/\b(\d{4})\b/);
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
          year: ym ? ym[1] : "",
          yearNum: ym ? parseInt(ym[1], 10) : null
        };
      }
      if (rawVal.value) {
        return parseDateValue(rawVal.value);
      }
      return null;
    }

    const str = String(rawVal).trim();
    if (!str) return null;
    const ym = str.match(/\b(\d{4})\b/);
    return {
      raw: str,
      display: formatIsoDateFr(str),
      year: ym ? ym[1] : "",
      yearNum: ym ? parseInt(ym[1], 10) : null
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
        const label = String(val.title ?? val.label ?? val.name ?? val.value ?? "")
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

    for (const val of directValues) addItem(val, "");
    for (const det of entries) {
      if (matchers(det)) {
        const labelCandidate =
          det.termLabel && det.termLabel.trim() ? det.termLabel : det.value;
        if (typeof det.value === "object" && det.value !== null && !Array.isArray(det.value)) {
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
      return val.length > 0 ? resolveScanUrl(val[0], config) : null;
    }
    if (typeof val === "object") {
      const fileObj = val.file && typeof val.file === "object" ? val.file : val;
      const extUrl = fileObj.ulf_ExternalFileReference || fileObj.url || val.url;
      if (typeof extUrl === "string" && /^(https?:)?\/\//i.test(extUrl.trim())) {
        return { url: extUrl.trim(), filename: String(fileObj.ulf_OrigFileName || "") };
      }
      const obf =
        val.fileid ||
        fileObj.ulf_ObfuscatedFileID ||
        fileObj.fileid ||
        fileObj.id;
      if (obf) {
        return {
          url: `${config.fileDownloadUrl}?db=${encodeURIComponent(config.db)}&file=${encodeURIComponent(String(obf))}`,
          filename: String(fileObj.ulf_OrigFileName || "")
        };
      }
    }
    return null;
  }

  function parseNumeroSortKey(numStr, recId) {
    const cleaned = String(numStr || "").trim();
    const m = cleaned.match(/^0*(\d+)(.*)$/);
    if (m) {
      return {
        n: parseInt(m[1], 10),
        suffix: m[2].trim().toLowerCase(),
        idNum: parseInt(String(recId || "0"), 10) || 0
      };
    }
    return {
      n: Number.MAX_SAFE_INTEGER,
      suffix: cleaned.toLowerCase(),
      idNum: parseInt(String(recId || "0"), 10) || 0
    };
  }

  function compareFichesAscending(a, b) {
    if (a.sortKey.n !== b.sortKey.n) return a.sortKey.n - b.sortKey.n;
    if (a.sortKey.suffix !== b.sortKey.suffix) {
      return a.sortKey.suffix.localeCompare(b.sortKey.suffix, "fr");
    }
    return a.sortKey.idNum - b.sortKey.idNum;
  }

  /* =========================================================================
     INDEX RÉFÉRENTIELS T:10 (PERSONNES) & T:12 (LIEUX)
     ========================================================================= */
  function buildPersonDirectory(rawPersons) {
    const byId = new Map();
    const byName = new Map();

    for (const r of rawPersons) {
      const id = String(r.rec_ID ?? r.recID ?? "");
      const name = String(r.rec_Title ?? r.recTitle ?? "").replace(/\s+/g, " ").trim();
      if (!id && !name) continue;
      const entries = collectDetailEntries(r);
      const types = entries
        .filter((d) => d.dtyId === "263" || /person type/i.test(d.fieldName))
        .map((d) => d.termLabel || String(d.value || ""))
        .filter(Boolean);

      const isArtist = types.some((t) => /artiste/i.test(t));
      const info = {
        id,
        name,
        types,
        status: isArtist ? "artistes" : "autres"
      };
      if (id) byId.set(id, info);
      if (name) byName.set(name.toLowerCase(), info);
    }
    return { byId, byName };
  }

  function buildPlaceDirectory(rawPlaces) {
    const byId = new Map();
    const byName = new Map();

    for (const r of rawPlaces) {
      const id = String(r.rec_ID ?? r.recID ?? "");
      const name = String(r.rec_Title ?? r.recTitle ?? "").replace(/\s+/g, " ").trim();
      if (!id && !name) continue;
      const entries = collectDetailEntries(r);
      const paysEntry = entries.find((d) => d.dtyId === "231" || /^pays$/i.test(d.fieldName.trim()));
      const villeEntry = entries.find((d) => d.dtyId === "1072" || /^ville$/i.test(d.fieldName.trim()));
      const paysRaw = paysEntry && paysEntry.value ? String(paysEntry.value).trim() : "";
      const pays = paysRaw || "Non précisé / Transports";
      const ville = villeEntry && villeEntry.value ? String(villeEntry.value).trim() : "";

      const info = { id, name, pays, ville };
      if (id) byId.set(id, info);
      if (name) byName.set(name.toLowerCase(), info);
    }
    return { byId, byName };
  }

  /* =========================================================================
     EXTRACTEUR DE TRANSCRIPTION & NOTES CRITIQUES ([1], [i], _ftn, _edn)
     ========================================================================= */
  function extractFootnoteKey(str) {
    const m = String(str || "").match(/\[([0-9]+|[ivxlcdm]+)\]/i);
    if (m) return m[1];
    const idm = String(str || "").match(/(?:_ftn|_edn)(?:ref)?([0-9]+)/i);
    return idm ? idm[1] : "";
  }

  function sanitizeRichNodeInto(src, target, noteMap, onNoteRefFound) {
    if (src.nodeType === Node.TEXT_NODE) {
      target.appendChild(document.createTextNode(src.nodeValue || ""));
      return;
    }
    if (src.nodeType !== Node.ELEMENT_NODE) return;

    const tag = src.tagName.toLowerCase();
    if (DROP_CONTENT_TAGS.has(tag)) return;
    if (src.id === "gtx-trans" || src.classList?.contains("gtx-trans-icon")) return;

    // Intercepter les appels de notes inline (<a href="#_ftn1" name="_ftnref1">[1]</a> ou #_edn1)
    if (tag === "a") {
      const href = (src.getAttribute("href") || "").trim();
      const nameAttr = (src.getAttribute("name") || "").trim();
      if (/^#_(?:ftn|edn)\d+/i.test(href) || /^_(?:ftn|edn)ref\d+/i.test(nameAttr)) {
        const text = (src.textContent || "").trim();
        const key = extractFootnoteKey(text) || extractFootnoteKey(href) || extractFootnoteKey(nameAttr);
        if (key && noteMap.has(key)) {
          const btn = document.createElement("button");
          btn.type = "button";
          btn.className = "ab-note-ref";
          btn.dataset.noteKey = key;
          btn.textContent = `[${key}]`;
          btn.setAttribute("aria-label", `Note critique ${key}`);
          btn.setAttribute("aria-expanded", "false");
          target.appendChild(btn);
          if (onNoteRefFound) onNoteRefFound(key);
          return;
        }
      }
    }

    if (!ALLOWED_HTML_TAGS.has(tag)) {
      for (const ch of src.childNodes) {
        sanitizeRichNodeInto(ch, target, noteMap, onNoteRefFound);
      }
      return;
    }

    const cleanEl = document.createElement(tag);
    if (tag === "a") {
      const href = (src.getAttribute("href") || "").trim();
      if (/^https?:\/\//i.test(href)) {
        cleanEl.setAttribute("href", href);
        cleanEl.setAttribute("target", "_blank");
        cleanEl.setAttribute("rel", "noopener noreferrer");
      }
    }

    for (const ch of src.childNodes) {
      sanitizeRichNodeInto(ch, cleanEl, noteMap, onNoteRefFound);
    }

    target.appendChild(cleanEl);
  }

  function sanitizePlainNoteHtml(rawHtml) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(rawHtml || "", "text/html");
    const out = document.createElement("div");

    const walk = (node, dest) => {
      if (node.nodeType === Node.TEXT_NODE) {
        dest.appendChild(document.createTextNode(node.nodeValue || ""));
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      const tag = node.tagName.toLowerCase();
      if (DROP_CONTENT_TAGS.has(tag) || node.id === "gtx-trans") return;
      if (tag === "a") {
        const href = (node.getAttribute("href") || "").trim();
        if (/^#_(?:ftn|edn)ref/i.test(href)) {
          // Supprime le rappel [1] redondant en debut de définition
          return;
        }
        if (/^https?:\/\//i.test(href)) {
          const a = document.createElement("a");
          a.setAttribute("href", href);
          a.setAttribute("target", "_blank");
          a.setAttribute("rel", "noopener noreferrer");
          for (const c of node.childNodes) walk(c, a);
          dest.appendChild(a);
          return;
        }
      }
      if (!ALLOWED_HTML_TAGS.has(tag)) {
        for (const c of node.childNodes) walk(c, dest);
        return;
      }
      const el = document.createElement(tag);
      for (const c of node.childNodes) walk(c, el);
      dest.appendChild(el);
    };

    for (const child of doc.body.childNodes) walk(child, out);
    return {
      html: out.innerHTML.trim(),
      plain: (out.textContent || "").replace(/\s+/g, " ").trim()
    };
  }

  function parseTranscriptionAndNotes(rawHtml) {
    if (!rawHtml || !String(rawHtml).trim()) {
      return {
        bodyFragmentHtml: "",
        notes: []
      };
    }

    if (!/<[a-z][\s\S]*>/i.test(rawHtml)) {
      const paras = String(rawHtml)
        .split(/\r?\n+/)
        .map((l) => l.trim())
        .filter(Boolean)
        .map((l) => {
          const p = document.createElement("p");
          p.textContent = l;
          return p.outerHTML;
        })
        .join("");
      return { bodyFragmentHtml: paras, notes: [] };
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(String(rawHtml), "text/html");
    const gtx = doc.getElementById("gtx-trans");
    if (gtx) gtx.remove();

    const noteMap = new Map();
    const backLinks = Array.from(
      doc.body.querySelectorAll('a[href^="#_ftnref"], a[href^="#_ednref"], a[name^="_ftn"], a[name^="_edn"]')
    ).filter((a) => {
      const href = a.getAttribute("href") || "";
      const nm = a.getAttribute("name") || "";
      return /^#_(?:ftn|edn)ref/i.test(href) || (/^_(?:ftn|edn)\d+/i.test(nm) && !/ref/i.test(nm));
    });

    // Repérer d'abord si un <hr> sépare le corps des notes
    const hrs = Array.from(doc.body.querySelectorAll("hr"));
    let splitHr = null;
    for (const hr of hrs) {
      let sib = hr.nextElementSibling;
      let containsNoteDef = false;
      while (sib) {
        if (backLinks.some((bl) => sib.contains(bl) || sib === bl)) {
          containsNoteDef = true;
          break;
        }
        sib = sib.nextElementSibling;
      }
      if (containsNoteDef) {
        splitHr = hr;
        break;
      }
    }

    const removedNoteBlocks = new Set();

    if (splitHr) {
      let cur = splitHr.nextElementSibling;
      removedNoteBlocks.add(splitHr);
      let currentKey = "";
      let currentChunks = [];

      const flushNote = () => {
        if (!currentKey) return;
        const sanitized = sanitizePlainNoteHtml(currentChunks.join("\n"));
        noteMap.set(currentKey, {
          key: currentKey,
          html: sanitized.html || "<p><em>Note critique non renseignée dans la notice.</em></p>",
          plain: sanitized.plain || "Note critique non renseignée dans la notice."
        });
      };

      while (cur) {
        removedNoteBlocks.add(cur);
        const defAnchor = cur.querySelector(
          'a[href^="#_ftnref"], a[href^="#_ednref"], a[name^="_ftn"]:not([name*="_ftnref"]), a[name^="_edn"]:not([name*="_ednref"])'
        );
        if (defAnchor) {
          flushNote();
          currentKey =
            extractFootnoteKey(defAnchor.textContent) ||
            extractFootnoteKey(defAnchor.getAttribute("href")) ||
            extractFootnoteKey(defAnchor.getAttribute("name")) ||
            String(noteMap.size + 1);
          currentChunks = [cur.outerHTML];
        } else if (currentKey) {
          currentChunks.push(cur.outerHTML);
        }
        cur = cur.nextElementSibling;
      }
      flushNote();
    } else if (backLinks.length > 0) {
      // Cas sans <hr> (ex. rec 2318) : paragraphe de note isolé en bas
      for (const bl of backLinks) {
        const block = bl.closest("p, div") || bl;
        removedNoteBlocks.add(block);
        const key =
          extractFootnoteKey(bl.textContent) ||
          extractFootnoteKey(bl.getAttribute("href")) ||
          extractFootnoteKey(bl.getAttribute("name"));
        if (key) {
          const sanitized = sanitizePlainNoteHtml(block.outerHTML || "");
          noteMap.set(key, {
            key,
            html: sanitized.html || "<p><em>Note critique non renseignée dans la notice.</em></p>",
            plain: sanitized.plain || "Note critique non renseignée dans la notice."
          });
        }
      }
    }

    // Assurer que tout marqueur inline sans texte de note reçoive une entrée de secours
    const refAnchors = doc.body.querySelectorAll('a[href^="#_ftn"], a[href^="#_edn"]');
    for (const ra of refAnchors) {
      const key = extractFootnoteKey(ra.textContent) || extractFootnoteKey(ra.getAttribute("href"));
      if (key && !noteMap.has(key)) {
        noteMap.set(key, {
          key,
          html: "<p><em>Note critique non renseignée dans la notice.</em></p>",
          plain: "Note critique non renseignée dans la notice."
        });
      }
    }

    // Retirer du DOM les blocs de notes déplacés dans les bulles
    for (const blk of removedNoteBlocks) {
      blk.remove();
    }

    const bodyContainer = document.createElement("div");
    const referencedOrder = [];
    const seenKeys = new Set();

    for (const ch of doc.body.childNodes) {
      sanitizeRichNodeInto(ch, bodyContainer, noteMap, (key) => {
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          referencedOrder.push(key);
        }
      });
    }

    const notes = [];
    for (const key of referencedOrder) {
      if (noteMap.has(key)) notes.push(noteMap.get(key));
    }
    for (const [key, note] of noteMap.entries()) {
      if (!seenKeys.has(key)) notes.push(note);
    }

    return {
      bodyFragmentHtml: bodyContainer.innerHTML,
      notes
    };
  }

  function normalizeRecord(raw, config, personDir, placeDir) {
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
    if (!numero) numero = id || "—";

    const title =
      String(raw.rec_Title ?? raw.recTitle ?? raw.title ?? "").trim() ||
      "Note sans titre";

    // Date
    let dateInfo = parseDateValue(raw.Date ?? raw.f9);
    if (!dateInfo) {
      const dateEntry = entries.find(
        (d) => d.dtyId === "9" || d.fieldType === "date" || /date|ann[ée]e/i.test(d.fieldName)
      );
      if (dateEntry) dateInfo = parseDateValue(dateEntry.value);
    }
    if (!dateInfo) {
      dateInfo = { raw: "", display: "Sans date", year: "", yearNum: null };
    }

    // Scans HD
    const scans = [];
    const seenUrls = new Set();
    const pushScan = (candidate) => {
      const resolved = resolveScanUrl(candidate, config);
      if (resolved && resolved.url && !seenUrls.has(resolved.url)) {
        seenUrls.add(resolved.url);
        scans.push(resolved);
      }
    };

    pushScan(raw.f1071_originalvalue);
    pushScan(raw.f1071);
    for (const det of entries) {
      if (det.dtyId === "1071" || /num[ée]risation/i.test(det.fieldName)) {
        pushScan(det.value);
      }
    }
    if (scans.length === 0) {
      for (const det of entries) {
        if (det.dtyId === "39" || det.fieldType === "file" || /scan|image/i.test(det.fieldName)) {
          pushScan(det.value);
        }
      }
    }

    // Retranscription HTML (priorité dty_ID=4 / f4, en excluant le crédit dty_ID=964)
    let rawTranscription = "";
    if (typeof raw.f4 === "string" && raw.f4.trim()) {
      rawTranscription = raw.f4;
    } else if (Array.isArray(raw.f4s) && raw.f4s.length > 0) {
      rawTranscription = raw.f4s.filter(Boolean).join("\n");
    } else {
      const f4Entries = entries.filter(
        (d) => d.dtyId === "4" || /^retranscription$/i.test(d.fieldName.trim())
      );
      rawTranscription = f4Entries
        .map((d) => (d.value !== null && d.value !== undefined ? String(d.value) : ""))
        .filter((s) => s.trim())
        .join("\n");
    }

    const parsedDoc = parseTranscriptionAndNotes(rawTranscription);
    const bodyPlain = extractTextFromHtml(parsedDoc.bodyFragmentHtml);
    const notesPlain = parsedDoc.notes.map((n) => n.plain).join(" ");

    // Personnes liées enrichies via t:10
    const rawPersons = extractEntityList(
      entries,
      (d) => d.dtyId === "16" || d.dtyId === "15" || d.dtyId === "573" || /personne|auteur/i.test(d.fieldName),
      [raw.Personne, raw.f573]
    );
    const persons = rawPersons.map((p) => {
      const dirInfo =
        (p.id && personDir.byId.get(p.id)) ||
        personDir.byName.get(p.label.toLowerCase()) ||
        null;
      const types = dirInfo ? dirInfo.types : [];
      const status = dirInfo
        ? dirInfo.status
        : /peintre|musicien|cineaste|cinéaste|acteur|chanteur|artiste/i.test(p.label)
        ? "artistes"
        : "autres";
      return {
        key: p.id ? `id:${p.id}` : `lbl:${p.label.toLowerCase()}`,
        id: p.id,
        label: p.label,
        status,
        types
      };
    });

    // Lieux liés enrichis via t:12
    const rawPlaces = extractEntityList(
      entries,
      (d) => d.dtyId === "238" || d.dtyId === "375" || /^lieux?$/i.test(d.fieldName.trim()),
      [raw.Lieux, raw.f375]
    );
    const places = rawPlaces.map((pl) => {
      const dirInfo =
        (pl.id && placeDir.byId.get(pl.id)) ||
        placeDir.byName.get(pl.label.toLowerCase()) ||
        null;
      return {
        key: pl.id ? `id:${pl.id}` : `lbl:${pl.label.toLowerCase()}`,
        id: pl.id,
        label: pl.label,
        pays: dirInfo ? dirInfo.pays : "Non précisé / Transports",
        ville: dirInfo ? dirInfo.ville : ""
      };
    });

    // Genres
    const genres = extractEntityList(
      entries,
      (d) => d.dtyId === "1073" || d.dtyId === "1107" || /^genre$/i.test(d.fieldName.trim()),
      [raw.genre, raw.f1107]
    ).map((g) => ({
      ...g,
      label: g.label.replace(/\.\(/g, " · (")
    }));

    // Cote BnF
    let cote = "";
    const directCote = raw.f1218;
    if (typeof directCote === "string" && directCote.trim()) {
      cote = directCote.trim();
    } else {
      const coteEntry = entries.find(
        (d) => d.dtyId === "1218" || d.dtyId === "977" || /cote/i.test(d.fieldName)
      );
      if (coteEntry && coteEntry.value) {
        const vStr =
          typeof coteEntry.value === "object"
            ? String(coteEntry.value.title ?? coteEntry.value.label ?? "").trim()
            : String(coteEntry.value).trim();
        if (vStr) {
          cote = /^fonds/i.test(vStr) ? vStr : `Fonds Roland Barthes — ${vStr}`;
        }
      }
    }
    if (!cote) cote = "Fonds Roland Barthes";

    // Liens bruts vers d'autres fiches (liens directs t:102 + mentions textuelles "fiche n° X")
    const directLinkedIds = [];
    const referencedNums = new Set();
    const selfNormNum = numero.replace(/^0+/, "") || numero;

    for (const det of entries) {
      const val = det.value;
      if (val && typeof val === "object" && String(val.type) === "102" && val.id) {
        const targetId = String(val.id);
        if (targetId !== id) directLinkedIds.push(targetId);
      }
      const txt =
        val && typeof val === "object"
          ? String(val.title || val.label || "")
          : typeof val === "string"
          ? val
          : "";
      if (txt && /fiche/i.test(txt)) {
        const plainChunk = extractTextFromHtml(txt);
        const re = /fiches?\s*(?:n[°ºo.]?\s*)?(\d{1,4})(?:\s*[,et]+\s*(\d{1,4}))?/gi;
        let match;
        while ((match = re.exec(plainChunk)) !== null) {
          for (const grp of [match[1], match[2]]) {
            if (!grp) continue;
            const norm = grp.replace(/^0+/, "") || "0";
            if (norm !== selfNormNum) referencedNums.add(norm);
          }
        }
      }
    }

    const rawRecUrl = String(raw.recURL ?? raw.rec_URL ?? "").trim();
    const noticeUrl =
      rawRecUrl && (/^https?:\/\//i.test(rawRecUrl) || rawRecUrl.startsWith("/"))
        ? rawRecUrl
        : `${config.noticeViewUrl}?db=${encodeURIComponent(config.db)}&recID=${encodeURIComponent(id)}`;

    const searchableSegments = [
      numero,
      title,
      dateInfo.display,
      cote,
      bodyPlain,
      notesPlain,
      ...genres.map((g) => g.label),
      ...persons.map((p) => p.label),
      ...places.map((pl) => `${pl.label} ${pl.pays} ${pl.ville}`)
    ].filter(Boolean);

    const searchExact = searchableSegments.join(" · ");
    const searchLoose = normalizeLoose(searchExact);

    return {
      id,
      numero,
      normNumero: selfNormNum,
      sortKey: parseNumeroSortKey(numero, id),
      title,
      date: dateInfo,
      scans,
      bodyHtml: parsedDoc.bodyFragmentHtml,
      bodyPlain,
      notes: parsedDoc.notes,
      notesPlain,
      persons,
      places,
      genres,
      cote,
      noticeUrl,
      directLinkedIds,
      referencedNums: Array.from(referencedNums),
      relatedFiches: [],
      searchExact,
      searchLoose
    };
  }

  /* =========================================================================
     LOGOS SVG OFFICIELS & ILLUSTRATIONS SUR-MESURE
     ========================================================================= */
  function createCnrsLogoSvg() {
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", "0 0 116 40");
    svg.setAttribute("class", "ab-logo-svg");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", "CNRS");

    const title = document.createElementNS(svgNS, "title");
    title.textContent = "CNRS — Centre national de la recherche scientifique";
    svg.appendChild(title);

    // Capsule / écu CNRS bleu institutionnel
    const pathBg = document.createElementNS(svgNS, "path");
    pathBg.setAttribute(
      "d",
      "M8 6 C14 2, 34 2, 42 7 C49 11, 50 28, 42 33 C34 38, 14 38, 8 33 C2 28, 2 11, 8 6 Z"
    );
    pathBg.setAttribute("fill", "#00294B");
    pathBg.setAttribute("stroke", "#000000");
    pathBg.setAttribute("stroke-width", "1.5");
    svg.appendChild(pathBg);

    const arc = document.createElementNS(svgNS, "path");
    arc.setAttribute("d", "M12 13 C19 9, 32 10, 38 14");
    arc.setAttribute("fill", "none");
    arc.setAttribute("stroke", "#00B5E2");
    arc.setAttribute("stroke-width", "2.2");
    arc.setAttribute("stroke-linecap", "round");
    svg.appendChild(arc);

    const emblemTxt = document.createElementNS(svgNS, "text");
    emblemTxt.setAttribute("x", "25");
    emblemTxt.setAttribute("y", "26");
    emblemTxt.setAttribute("text-anchor", "middle");
    emblemTxt.setAttribute("fill", "#FFFFFF");
    emblemTxt.setAttribute("font-family", "Arial, Helvetica, sans-serif");
    emblemTxt.setAttribute("font-weight", "900");
    emblemTxt.setAttribute("font-size", "11.5");
    emblemTxt.setAttribute("letter-spacing", "0.6");
    emblemTxt.textContent = "cnrs";
    svg.appendChild(emblemTxt);

    const labelTop = document.createElementNS(svgNS, "text");
    labelTop.setAttribute("x", "56");
    labelTop.setAttribute("y", "25");
    labelTop.setAttribute("fill", "#000000");
    labelTop.setAttribute("font-family", "Arial, Helvetica, sans-serif");
    labelTop.setAttribute("font-weight", "900");
    labelTop.setAttribute("font-size", "14");
    labelTop.setAttribute("letter-spacing", "0.6");
    labelTop.textContent = "CNRS";
    svg.appendChild(labelTop);

    return svg;
  }

  function createNantesUnivLogoSvg() {
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", "0 0 172 40");
    svg.setAttribute("class", "ab-logo-svg");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", "Nantes Université");

    const title = document.createElementNS(svgNS, "title");
    title.textContent = "Nantes Université";
    svg.appendChild(title);

    // Monogramme N géométrique officiel stylisé
    const frame = document.createElementNS(svgNS, "rect");
    frame.setAttribute("x", "2");
    frame.setAttribute("y", "5");
    frame.setAttribute("width", "30");
    frame.setAttribute("height", "30");
    frame.setAttribute("fill", "#000000");
    svg.appendChild(frame);

    const nLeft = document.createElementNS(svgNS, "path");
    nLeft.setAttribute("d", "M9 28 V12 H13.5 L20.5 22.5 V12 H25 V28 H20.5 L13.5 17.5 V28 Z");
    nLeft.setAttribute("fill", "#FFFFFF");
    svg.appendChild(nLeft);

    const accentDot = document.createElementNS(svgNS, "rect");
    accentDot.setAttribute("x", "27");
    accentDot.setAttribute("y", "5");
    accentDot.setAttribute("width", "5");
    accentDot.setAttribute("height", "5");
    accentDot.setAttribute("fill", "#E8FF5A");
    svg.appendChild(accentDot);

    const wordTop = document.createElementNS(svgNS, "text");
    wordTop.setAttribute("x", "40");
    wordTop.setAttribute("y", "19");
    wordTop.setAttribute("fill", "#000000");
    wordTop.setAttribute("font-family", "Arial, Helvetica, sans-serif");
    wordTop.setAttribute("font-weight", "900");
    wordTop.setAttribute("font-size", "13");
    wordTop.setAttribute("letter-spacing", "-0.2");
    wordTop.textContent = "Nantes";
    svg.appendChild(wordTop);

    const wordBot = document.createElementNS(svgNS, "text");
    wordBot.setAttribute("x", "40");
    wordBot.setAttribute("y", "32");
    wordBot.setAttribute("fill", "#000000");
    wordBot.setAttribute("font-family", "Arial, Helvetica, sans-serif");
    wordBot.setAttribute("font-weight", "700");
    wordBot.setAttribute("font-size", "11.5");
    wordBot.textContent = "Université";
    svg.appendChild(wordBot);

    return svg;
  }

  function createPortraitFallbackEl() {
    const wrap = document.createElement("div");
    wrap.className = "ab-hero-portrait-fallback";
    wrap.setAttribute("aria-label", "Illustration archivistique : Roland Barthes, 1953");

    const topMeta = document.createElement("div");
    topMeta.className = "ab-section-label";
    topMeta.textContent = "PORTRAIT · PARIS, 1953";

    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", "0 0 240 240");
    svg.setAttribute("aria-hidden", "true");
    svg.style.width = "84%";
    svg.style.margin = "auto";

    // Trame graphique Neubrutalism inspirée portrait 1953
    const bgRect = document.createElementNS(svgNS, "rect");
    bgRect.setAttribute("x", "12");
    bgRect.setAttribute("y", "12");
    bgRect.setAttribute("width", "216");
    bgRect.setAttribute("height", "216");
    bgRect.setAttribute("fill", "#D4C4FF");
    bgRect.setAttribute("stroke", "#000000");
    bgRect.setAttribute("stroke-width", "3");
    svg.appendChild(bgRect);

    // Rayures éditoriales
    for (let y = 26; y <= 212; y += 14) {
      const line = document.createElementNS(svgNS, "line");
      line.setAttribute("x1", "18");
      line.setAttribute("y1", String(y));
      line.setAttribute("x2", "222");
      line.setAttribute("y2", String(y));
      line.setAttribute("stroke", "#000000");
      line.setAttribute("stroke-opacity", "0.12");
      line.setAttribute("stroke-width", "1.5");
      svg.appendChild(line);
    }

    // Silhouette stylisée buste + lunettes / coupe 1953
    const shoulders = document.createElementNS(svgNS, "path");
    shoulders.setAttribute("d", "M44 226 C52 174, 82 158, 120 158 C158 158, 188 174, 196 226 Z");
    shoulders.setAttribute("fill", "#000000");
    svg.appendChild(shoulders);

    const collar = document.createElementNS(svgNS, "path");
    collar.setAttribute("d", "M98 158 L120 184 L142 158 Z");
    collar.setAttribute("fill", "#FFFFFF");
    collar.setAttribute("stroke", "#000000");
    collar.setAttribute("stroke-width", "2");
    svg.appendChild(collar);

    const head = document.createElementNS(svgNS, "path");
    head.setAttribute(
      "d",
      "M82 94 C82 58, 158 58, 158 94 C158 134, 142 154, 120 154 C98 154, 82 134, 82 94 Z"
    );
    head.setAttribute("fill", "#FDFBF4");
    head.setAttribute("stroke", "#000000");
    head.setAttribute("stroke-width", "3");
    svg.appendChild(head);

    const hair = document.createElementNS(svgNS, "path");
    hair.setAttribute(
      "d",
      "M80 96 C78 64, 102 48, 128 50 C152 52, 164 68, 160 94 C150 76, 134 74, 114 76 C96 78, 86 86, 80 96 Z"
    );
    hair.setAttribute("fill", "#000000");
    svg.appendChild(hair);

    // Regard & traits minimalistes
    const browL = document.createElementNS(svgNS, "path");
    browL.setAttribute("d", "M95 96 L112 95 M128 95 L145 96");
    browL.setAttribute("stroke", "#000000");
    browL.setAttribute("stroke-width", "2.8");
    browL.setAttribute("stroke-linecap", "round");
    svg.appendChild(browL);

    const nose = document.createElementNS(svgNS, "path");
    nose.setAttribute("d", "M120 98 L117 118 L125 120");
    nose.setAttribute("fill", "none");
    nose.setAttribute("stroke", "#000000");
    nose.setAttribute("stroke-width", "2.4");
    svg.appendChild(nose);

    const mouth = document.createElementNS(svgNS, "path");
    mouth.setAttribute("d", "M108 132 Q120 136 132 131");
    mouth.setAttribute("fill", "none");
    mouth.setAttribute("stroke", "#000000");
    mouth.setAttribute("stroke-width", "2.4");
    svg.appendChild(mouth);

    // Monogramme RB / Cote NAF 28630 centré proprement dans un badge jaune dimensionné
    const stampShadow = document.createElementNS(svgNS, "rect");
    stampShadow.setAttribute("x", "22");
    stampShadow.setAttribute("y", "192");
    stampShadow.setAttribute("width", "86");
    stampShadow.setAttribute("height", "28");
    stampShadow.setAttribute("fill", "#000000");
    svg.appendChild(stampShadow);

    const stamp = document.createElementNS(svgNS, "rect");
    stamp.setAttribute("x", "19");
    stamp.setAttribute("y", "189");
    stamp.setAttribute("width", "86");
    stamp.setAttribute("height", "28");
    stamp.setAttribute("fill", "#E8FF5A");
    stamp.setAttribute("stroke", "#000000");
    stamp.setAttribute("stroke-width", "2.5");
    svg.appendChild(stamp);

    const stampTxt = document.createElementNS(svgNS, "text");
    stampTxt.setAttribute("x", "62");
    stampTxt.setAttribute("y", "207");
    stampTxt.setAttribute("text-anchor", "middle");
    stampTxt.setAttribute("fill", "#000000");
    stampTxt.setAttribute("font-family", "monospace");
    stampTxt.setAttribute("font-weight", "900");
    stampTxt.setAttribute("font-size", "12");
    stampTxt.textContent = "NAF 28630";
    svg.appendChild(stampTxt);

    const botMeta = document.createElement("div");
    botMeta.className = "ab-section-label";
    botMeta.textContent = "FONDS BARTHES · BNF";

    wrap.append(topMeta, svg, botMeta);
    return wrap;
  }

  function createAshtraySvg() {
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("viewBox", "0 0 180 140");
    svg.setAttribute("class", "ab-ashtray-svg");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", "Cendrier en céramique et cigare posé sur le bureau");

    const defs = document.createElementNS(svgNS, "defs");
    const pat = document.createElementNS(svgNS, "pattern");
    pat.setAttribute("id", "ab-ash-dots");
    pat.setAttribute("width", "6");
    pat.setAttribute("height", "6");
    pat.setAttribute("patternUnits", "userSpaceOnUse");
    const dot = document.createElementNS(svgNS, "circle");
    dot.setAttribute("cx", "2");
    dot.setAttribute("cy", "2");
    dot.setAttribute("r", "0.9");
    dot.setAttribute("fill", "#444");
    pat.appendChild(dot);
    defs.appendChild(pat);
    svg.appendChild(defs);

    // Corps carré aux coins biseautés du cendrier (vue top-down)
    const outer = document.createElementNS(svgNS, "rect");
    outer.setAttribute("x", "18");
    outer.setAttribute("y", "22");
    outer.setAttribute("width", "96");
    outer.setAttribute("height", "96");
    outer.setAttribute("rx", "14");
    outer.setAttribute("fill", "#E8DEC8");
    outer.setAttribute("stroke", "#000000");
    outer.setAttribute("stroke-width", "3");
    svg.appendChild(outer);

    // Cuve intérieure
    const inner = document.createElementNS(svgNS, "circle");
    inner.setAttribute("cx", "66");
    inner.setAttribute("cy", "70");
    inner.setAttribute("r", "34");
    inner.setAttribute("fill", "#C6BCA4");
    inner.setAttribute("stroke", "#000000");
    inner.setAttribute("stroke-width", "2.5");
    svg.appendChild(inner);

    // Cendres au fond
    const ash = document.createElementNS(svgNS, "ellipse");
    ash.setAttribute("cx", "60");
    ash.setAttribute("cy", "72");
    ash.setAttribute("rx", "20");
    ash.setAttribute("ry", "13");
    ash.setAttribute("fill", "url(#ab-ash-dots)");
    svg.appendChild(ash);

    // Encoches du cendrier
    for (const [rx, ry, rw, rh] of [
      [59, 20, 14, 12],
      [104, 63, 12, 14]
    ]) {
      const notch = document.createElementNS(svgNS, "rect");
      notch.setAttribute("x", String(rx));
      notch.setAttribute("y", String(ry));
      notch.setAttribute("width", String(rw));
      notch.setAttribute("height", String(rh));
      notch.setAttribute("fill", "#A99D83");
      notch.setAttribute("stroke", "#000000");
      notch.setAttribute("stroke-width", "2");
      svg.appendChild(notch);
    }

    // Cigare posé en diagonale dans l'encoche droite
    const cigarGroup = document.createElementNS(svgNS, "g");
    cigarGroup.setAttribute("transform", "rotate(-16 112 72)");

    const cigarBody = document.createElementNS(svgNS, "rect");
    cigarBody.setAttribute("x", "68");
    cigarBody.setAttribute("y", "64");
    cigarBody.setAttribute("width", "92");
    cigarBody.setAttribute("height", "15");
    cigarBody.setAttribute("rx", "6");
    cigarBody.setAttribute("fill", "#7A4924");
    cigarBody.setAttribute("stroke", "#000000");
    cigarBody.setAttribute("stroke-width", "2.5");
    cigarGroup.appendChild(cigarBody);

    // Bague dorée/jaune acide du cigare
    const band = document.createElementNS(svgNS, "rect");
    band.setAttribute("x", "124");
    band.setAttribute("y", "64");
    band.setAttribute("width", "12");
    band.setAttribute("height", "15");
    band.setAttribute("fill", "#E8FF5A");
    band.setAttribute("stroke", "#000000");
    band.setAttribute("stroke-width", "2");
    cigarGroup.appendChild(band);

    // Pointe cendre + braise incandescente
    const tipAsh = document.createElementNS(svgNS, "rect");
    tipAsh.setAttribute("x", "62");
    tipAsh.setAttribute("y", "64.5");
    tipAsh.setAttribute("width", "12");
    tipAsh.setAttribute("height", "14");
    tipAsh.setAttribute("rx", "3");
    tipAsh.setAttribute("fill", "#8E8A82");
    tipAsh.setAttribute("stroke", "#000000");
    tipAsh.setAttribute("stroke-width", "2");
    cigarGroup.appendChild(tipAsh);

    const ember = document.createElementNS(svgNS, "circle");
    ember.setAttribute("cx", "65");
    ember.setAttribute("cy", "71.5");
    ember.setAttribute("r", "4");
    ember.setAttribute("fill", "#FF5E3A");
    ember.setAttribute("class", "ab-cigar-ember");
    cigarGroup.appendChild(ember);

    svg.appendChild(cigarGroup);

    // Volutes de fumée
    const wisp1 = document.createElementNS(svgNS, "path");
    wisp1.setAttribute("d", "M66 56 Q56 40 68 28 Q78 18 66 8");
    wisp1.setAttribute("fill", "none");
    wisp1.setAttribute("stroke", "#FFFFFF");
    wisp1.setAttribute("stroke-width", "2.5");
    wisp1.setAttribute("stroke-linecap", "round");
    wisp1.setAttribute("class", "ab-smoke-wisp");
    svg.appendChild(wisp1);

    const wisp2 = document.createElementNS(svgNS, "path");
    wisp2.setAttribute("d", "M74 52 Q84 36 74 22");
    wisp2.setAttribute("fill", "none");
    wisp2.setAttribute("stroke", "#E8FF5A");
    wisp2.setAttribute("stroke-width", "2");
    wisp2.setAttribute("stroke-linecap", "round");
    wisp2.setAttribute("class", "ab-smoke-wisp ab-smoke-wisp--2");
    svg.appendChild(wisp2);

    return svg;
  }

  /* =========================================================================
     APPLICATION PRINCIPALE (MOUNT & ÉTAT SPA)
     ========================================================================= */
  function mountApp(root) {
    if (!root || root.dataset.abMounted === "true") return;
    root.dataset.abMounted = "true";
    root.dataset.abVersion = APP_VERSION;

    const config = resolveConfig(root);

    const state = {
      route: "presentation",
      corpus: [],
      sortedCorpus: [],
      filtered: [],
      byId: new Map(),
      byNormNumero: new Map(),
      personDir: { byId: new Map(), byName: new Map() },
      placeDir: { byId: new Map(), byName: new Map() },
      loading: true,
      loadError: "",
      corpusReady: false,

      // Bornes chronologiques dynamiques
      bounds: {
        minYear: 1968,
        maxYear: 1980
      },

      // Filtres Page Recherche
      filters: {
        query: "",
        caseSensitive: true, // [Aa] ACTIF PAR DÉFAUT
        startYear: 1968,
        endYear: 1980,
        includeUndated: true,
        selectedCountries: new Set(),
        selectedPlaces: new Set(),
        placeFilterText: "",
        personStatus: "all", // "all" | "artistes" | "autres"
        selectedPersons: new Set(),
        personFilterText: ""
      },

      // Sélection & lecteur Page Recherche
      selectedFicheId: null,
      activeScanIdx: 0,
      zoomLevel: 1,
      panX: 0,
      panY: 0,

      // Page Découverte
      discoveryIndex: 0,
      discoveryScanIdx: 0,
      discoveryTurnDir: "",

      // Actions post-navigation (ex: focus search input)
      pendingFocusTarget: ""
    };

    let searchDebounceTimer = null;
    let tooltipAnchorBtn = null;
    let tooltipHideTimer = null;

    // -----------------------------------------------------------------------
    // SQUELETTE DOM PERSISTANT
    // -----------------------------------------------------------------------
    root.replaceChildren();

    const header = document.createElement("header");
    header.className = "ab-header";
    const headerShell = document.createElement("div");
    headerShell.className = "ab-shell ab-header-inner";

    const logosWrap = document.createElement("div");
    logosWrap.className = "ab-logos";
    const cnrsLink = document.createElement("a");
    cnrsLink.className = "ab-logo-link";
    cnrsLink.href = "#presentation";
    cnrsLink.setAttribute("aria-label", "CNRS — Accueil ArchiBarthes");
    cnrsLink.appendChild(createCnrsLogoSvg());

    const logoSep = document.createElement("span");
    logoSep.className = "ab-logo-sep";
    logoSep.setAttribute("aria-hidden", "true");

    const nantesLink = document.createElement("a");
    nantesLink.className = "ab-logo-link";
    nantesLink.href = "#presentation";
    nantesLink.setAttribute("aria-label", "Nantes Université — Accueil ArchiBarthes");
    nantesLink.appendChild(createNantesUnivLogoSvg());

    logosWrap.append(cnrsLink, logoSep, nantesLink);

    const nav = document.createElement("nav");
    nav.className = "ab-nav";
    nav.setAttribute("aria-label", "Navigation principale");

    const navItems = [
      { id: "presentation", label: "Présentation" },
      { id: "recherche", label: "Recherche" },
      { id: "decouverte", label: "Découverte" },
      { id: "methodes", label: "Méthodes" }
    ];
    const navLinks = new Map();
    for (const item of navItems) {
      const a = document.createElement("a");
      a.className = "ab-nav-link";
      a.href = `#${item.id}`;
      a.dataset.route = item.id;
      a.textContent = item.label;
      a.addEventListener("click", (e) => {
        e.preventDefault();
        navigateTo(item.id);
      });
      navLinks.set(item.id, a);
      nav.appendChild(a);
    }

    headerShell.append(logosWrap, nav);
    header.appendChild(headerShell);

    const statusShell = document.createElement("div");
    statusShell.className = "ab-shell";
    const statusBanner = document.createElement("div");
    statusBanner.className = "ab-status-banner";
    statusBanner.setAttribute("aria-live", "polite");
    statusBanner.hidden = true;
    statusShell.appendChild(statusBanner);

    const mainEl = document.createElement("main");
    mainEl.className = "ab-main";
    mainEl.id = "ab-main-region";

    // Tooltip flottant partagé pour les notes critiques [1], [i]
    const noteTooltip = document.createElement("div");
    noteTooltip.id = "ab-note-tooltip";
    noteTooltip.className = "ab-note-tooltip";
    noteTooltip.setAttribute("role", "tooltip");
    noteTooltip.hidden = true;

    const noteTooltipHead = document.createElement("div");
    noteTooltipHead.className = "ab-note-tooltip-head";
    const noteTooltipTitle = document.createElement("span");
    noteTooltipTitle.className = "ab-section-label";
    const noteTooltipClose = document.createElement("button");
    noteTooltipClose.type = "button";
    noteTooltipClose.className = "ab-btn ab-btn--sm";
    noteTooltipClose.textContent = "✕";
    noteTooltipClose.setAttribute("aria-label", "Fermer la note");
    noteTooltipClose.addEventListener("click", () => hideNoteTooltip(true));
    noteTooltipHead.append(noteTooltipTitle, noteTooltipClose);

    const noteTooltipBody = document.createElement("div");
    noteTooltip.append(noteTooltipHead, noteTooltipBody);

    noteTooltip.addEventListener("mouseenter", () => {
      clearTimeout(tooltipHideTimer);
    });
    noteTooltip.addEventListener("mouseleave", () => {
      scheduleHideTooltip();
    });

    // Modale native <dialog> Plein écran Scan HD
    const zoomDialog = document.createElement("dialog");
    zoomDialog.id = "ab-zoom-dialog";
    zoomDialog.className = "ab-dialog";
    zoomDialog.setAttribute("aria-labelledby", "ab-zoom-dialog-title");
    zoomDialog.setAttribute("closedby", "any");

    const zoomDlgHead = document.createElement("div");
    zoomDlgHead.className = "ab-dialog-head";
    const zoomDlgTitle = document.createElement("h2");
    zoomDlgTitle.id = "ab-zoom-dialog-title";
    zoomDlgTitle.className = "ab-dialog-title";
    zoomDlgTitle.textContent = "Scan du manuscrit";

    const zoomDlgActions = document.createElement("div");
    zoomDlgActions.className = "ab-zoom-group";
    const dlgZoomOutBtn = document.createElement("button");
    dlgZoomOutBtn.type = "button";
    dlgZoomOutBtn.className = "ab-btn ab-btn--sm";
    dlgZoomOutBtn.textContent = "Zoom −";
    const dlgZoomResetBtn = document.createElement("button");
    dlgZoomResetBtn.type = "button";
    dlgZoomResetBtn.className = "ab-btn ab-btn--sm";
    dlgZoomResetBtn.textContent = "100 %";
    const dlgZoomInBtn = document.createElement("button");
    dlgZoomInBtn.type = "button";
    dlgZoomInBtn.className = "ab-btn ab-btn--sm";
    dlgZoomInBtn.textContent = "Zoom +";
    const dlgCloseForm = document.createElement("form");
    dlgCloseForm.method = "dialog";
    const dlgCloseBtn = document.createElement("button");
    dlgCloseBtn.type = "submit";
    dlgCloseBtn.className = "ab-btn ab-btn--sm ab-btn--dark";
    dlgCloseBtn.textContent = "Fermer [Échap]";
    dlgCloseForm.appendChild(dlgCloseBtn);

    zoomDlgActions.append(dlgZoomOutBtn, dlgZoomResetBtn, dlgZoomInBtn, dlgCloseForm);
    zoomDlgHead.append(zoomDlgTitle, zoomDlgActions);

    const zoomDlgStage = document.createElement("div");
    zoomDlgStage.className = "ab-dialog-stage";
    const zoomDlgImg = document.createElement("img");
    zoomDlgImg.className = "ab-dialog-img";
    zoomDlgImg.alt = "";
    zoomDlgStage.appendChild(zoomDlgImg);
    zoomDialog.append(zoomDlgHead, zoomDlgStage);

    // Modale native <dialog> Notes critiques agrandies
    const notesDialog = document.createElement("dialog");
    notesDialog.id = "ab-notes-dialog";
    notesDialog.className = "ab-dialog ab-dialog--narrow";
    notesDialog.setAttribute("aria-labelledby", "ab-notes-dialog-title");
    notesDialog.setAttribute("closedby", "any");

    const notesDlgHead = document.createElement("div");
    notesDlgHead.className = "ab-dialog-head";
    const notesDlgTitle = document.createElement("h2");
    notesDlgTitle.id = "ab-notes-dialog-title";
    notesDlgTitle.className = "ab-dialog-title";
    notesDlgTitle.textContent = "Appareil de notes critiques";
    const notesCloseForm = document.createElement("form");
    notesCloseForm.method = "dialog";
    const notesCloseBtn = document.createElement("button");
    notesCloseBtn.type = "submit";
    notesCloseBtn.className = "ab-btn ab-btn--sm ab-btn--dark";
    notesCloseBtn.textContent = "Fermer [Échap]";
    notesCloseForm.appendChild(notesCloseBtn);
    notesDlgHead.append(notesDlgTitle, notesCloseForm);

    const notesDlgBody = document.createElement("div");
    notesDlgBody.className = "ab-dialog-notes-body";
    notesDialog.append(notesDlgHead, notesDlgBody);

    // Fallback light-dismiss pour navigateurs sans closedby="any"
    if (typeof HTMLDialogElement !== "undefined" && !("closedBy" in HTMLDialogElement.prototype)) {
      const outside = (e, dlg) => {
        const r = dlg.getBoundingClientRect();
        return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
      };
      for (const dlg of [zoomDialog, notesDialog]) {
        let pressedOutside = false;
        dlg.addEventListener("pointerdown", (e) => {
          pressedOutside = outside(e, dlg);
        });
        dlg.addEventListener("pointerup", (e) => {
          if (pressedOutside && outside(e, dlg)) dlg.close();
        });
      }
    }

    root.append(header, statusShell, mainEl, noteTooltip, zoomDialog, notesDialog);

    // -----------------------------------------------------------------------
    // GESTION ZOOM & PAN PARTAGÉE (LECTEUR + DIALOG)
    // -----------------------------------------------------------------------
    let modalZoom = 1;
    let modalPanX = 0;
    let modalPanY = 0;

    function applyModalZoomTransform() {
      zoomDlgImg.style.transform = `translate(${modalPanX}px, ${modalPanY}px) scale(${modalZoom})`;
      zoomDlgStage.classList.toggle("is-zoomed", modalZoom > 1);
      dlgZoomResetBtn.textContent = `${Math.round(modalZoom * 100)} %`;
    }

    function bindDragPan(stageEl, getZoom, getPan, setPan) {
      let dragging = false;
      let startX = 0;
      let startY = 0;
      let baseX = 0;
      let baseY = 0;

      stageEl.addEventListener("pointerdown", (e) => {
        if (e.button !== 0 || getZoom() <= 1) return;
        dragging = true;
        startX = e.clientX;
        startY = e.clientY;
        const pan = getPan();
        baseX = pan.x;
        baseY = pan.y;
        stageEl.classList.add("is-dragging");
        try {
          stageEl.setPointerCapture(e.pointerId);
        } catch (_) {}
      });

      stageEl.addEventListener("pointermove", (e) => {
        if (!dragging) return;
        setPan(baseX + (e.clientX - startX), baseY + (e.clientY - startY));
      });

      const endDrag = () => {
        dragging = false;
        stageEl.classList.remove("is-dragging");
      };
      stageEl.addEventListener("pointerup", endDrag);
      stageEl.addEventListener("pointercancel", endDrag);
      stageEl.addEventListener("lostpointercapture", endDrag);
    }

    bindDragPan(
      zoomDlgStage,
      () => modalZoom,
      () => ({ x: modalPanX, y: modalPanY }),
      (x, y) => {
        modalPanX = x;
        modalPanY = y;
        applyModalZoomTransform();
      }
    );

    dlgZoomInBtn.addEventListener("click", () => {
      modalZoom = Math.min(4, +(modalZoom + 0.35).toFixed(2));
      applyModalZoomTransform();
    });
    dlgZoomOutBtn.addEventListener("click", () => {
      modalZoom = Math.max(0.75, +(modalZoom - 0.35).toFixed(2));
      if (modalZoom <= 1) {
        modalPanX = 0;
        modalPanY = 0;
      }
      applyModalZoomTransform();
    });
    dlgZoomResetBtn.addEventListener("click", () => {
      modalZoom = 1;
      modalPanX = 0;
      modalPanY = 0;
      applyModalZoomTransform();
    });

    function openScanModal(fiche, scanIdx) {
      const scan = fiche?.scans?.[scanIdx] || fiche?.scans?.[0];
      if (!scan) return;
      zoomDlgTitle.textContent = `Fiche BnF n° ${fiche.numero} — ${fiche.title}`;
      zoomDlgImg.src = scan.url;
      zoomDlgImg.alt = `Scan haute définition de la fiche ${fiche.numero}`;
      modalZoom = 1;
      modalPanX = 0;
      modalPanY = 0;
      applyModalZoomTransform();
      if (typeof zoomDialog.showModal === "function") {
        zoomDialog.showModal();
      } else {
        zoomDialog.setAttribute("open", "");
      }
    }

    function openNotesModal(fiche) {
      if (!fiche || fiche.notes.length === 0) return;
      notesDlgTitle.textContent = `Notes critiques — Fiche BnF n° ${fiche.numero}`;
      notesDlgBody.replaceChildren();
      for (const note of fiche.notes) {
        const card = document.createElement("article");
        card.className = "ab-note-card";
        const badge = document.createElement("span");
        badge.className = "ab-kicker";
        badge.textContent = `NOTE [${note.key}]`;
        const content = document.createElement("div");
        content.className = "ab-transcription-prose";
        content.style.marginBlockStart = "0.6rem";
        content.innerHTML = note.html;
        card.append(badge, content);
        notesDlgBody.appendChild(card);
      }
      if (typeof notesDialog.showModal === "function") {
        notesDialog.showModal();
      } else {
        notesDialog.setAttribute("open", "");
      }
    }

    // -----------------------------------------------------------------------
    // TOOLTIP NOTES CRITIQUES ([1], [i]) ANCRÉ AU BOUTON DÉCLENCHEUR
    // -----------------------------------------------------------------------
    function positionNoteTooltip(btn) {
      if (!btn || noteTooltip.hidden) return;
      const rect = btn.getBoundingClientRect();
      const ttRect = noteTooltip.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const margin = 10;

      let top = rect.bottom + 8;
      if (top + ttRect.height > vh - margin && rect.top - ttRect.height - 8 > margin) {
        top = rect.top - ttRect.height - 8;
      }
      let left = rect.left + rect.width / 2 - ttRect.width / 2;
      left = Math.max(margin, Math.min(left, vw - ttRect.width - margin));

      noteTooltip.style.top = `${Math.round(top)}px`;
      noteTooltip.style.left = `${Math.round(left)}px`;
    }

    function showNoteTooltip(btn, fiche) {
      clearTimeout(tooltipHideTimer);
      const key = btn?.dataset?.noteKey;
      const note = fiche?.notes?.find((n) => n.key === key);
      if (!note) return;

      if (tooltipAnchorBtn && tooltipAnchorBtn !== btn) {
        tooltipAnchorBtn.setAttribute("aria-expanded", "false");
        tooltipAnchorBtn.removeAttribute("aria-describedby");
      }
      tooltipAnchorBtn = btn;
      btn.setAttribute("aria-expanded", "true");
      btn.setAttribute("aria-describedby", "ab-note-tooltip");

      noteTooltipTitle.textContent = `NOTE CRITIQUE [${note.key}]`;
      noteTooltipBody.innerHTML = note.html;
      noteTooltip.hidden = false;
      positionNoteTooltip(btn);
    }

    function hideNoteTooltip(returnFocus = false) {
      clearTimeout(tooltipHideTimer);
      noteTooltip.hidden = true;
      if (tooltipAnchorBtn) {
        tooltipAnchorBtn.setAttribute("aria-expanded", "false");
        tooltipAnchorBtn.removeAttribute("aria-describedby");
        if (returnFocus) tooltipAnchorBtn.focus();
        tooltipAnchorBtn = null;
      }
    }

    function scheduleHideTooltip() {
      clearTimeout(tooltipHideTimer);
      tooltipHideTimer = setTimeout(() => hideNoteTooltip(false), 180);
    }

    function wireFootnoteButtons(container, fiche) {
      const buttons = container.querySelectorAll(".ab-note-ref");
      for (const btn of buttons) {
        btn.addEventListener("mouseenter", () => showNoteTooltip(btn, fiche));
        btn.addEventListener("mouseleave", scheduleHideTooltip);
        btn.addEventListener("focus", () => showNoteTooltip(btn, fiche));
        btn.addEventListener("blur", (e) => {
          if (e.relatedTarget && noteTooltip.contains(e.relatedTarget)) return;
          scheduleHideTooltip();
        });
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          if (!noteTooltip.hidden && tooltipAnchorBtn === btn) {
            hideNoteTooltip(false);
          } else {
            showNoteTooltip(btn, fiche);
          }
        });
      }
    }

    // -----------------------------------------------------------------------
    // MOTEUR DE FILTRES COMBINABLES (PAGE 2)
    // -----------------------------------------------------------------------
    function applyFilters() {
      const f = state.filters;
      const qRaw = f.query.trim();
      const qLoose = qRaw ? normalizeLoose(qRaw) : "";
      const isFullDateSpan =
        f.startYear <= state.bounds.minYear && f.endYear >= state.bounds.maxYear;

      const results = [];
      for (const rec of state.sortedCorpus) {
        // 1. Mots-clés (+ sensibilité à la casse [Aa])
        if (qRaw) {
          if (f.caseSensitive) {
            if (!rec.searchExact.includes(qRaw)) continue;
          } else {
            if (!rec.searchLoose.includes(qLoose)) continue;
          }
        }

        // 2. Plage chronologique + fiches sans date
        if (rec.date.yearNum === null) {
          if (!f.includeUndated) continue;
        } else if (!isFullDateSpan) {
          if (rec.date.yearNum < f.startYear || rec.date.yearNum > f.endYear) {
            continue;
          }
        }

        // 3. Lieux hiérarchique (Pays / Lieu)
        if (f.selectedCountries.size > 0) {
          const hasCountry = rec.places.some((pl) => f.selectedCountries.has(pl.pays));
          if (!hasCountry) continue;
        }
        if (f.selectedPlaces.size > 0) {
          const hasPlace = rec.places.some((pl) => f.selectedPlaces.has(pl.key));
          if (!hasPlace) continue;
        }

        // 4. Personnes hiérarchique (Statut / Personne)
        if (f.personStatus !== "all") {
          const hasStatus = rec.persons.some((p) => p.status === f.personStatus);
          if (!hasStatus) continue;
        }
        if (f.selectedPersons.size > 0) {
          const hasPerson = rec.persons.some((p) => f.selectedPersons.has(p.key));
          if (!hasPerson) continue;
        }

        results.push(rec);
      }

      state.filtered = results;

      // Sélection automatique de la 1re fiche si aucune sélection valide
      if (!results.some((r) => r.id === state.selectedFicheId)) {
        state.selectedFicheId = results.length > 0 ? results[0].id : null;
        state.activeScanIdx = 0;
        state.zoomLevel = 1;
        state.panX = 0;
        state.panY = 0;
      }
    }

    function hasActiveFilters() {
      const f = state.filters;
      return Boolean(
        f.query.trim() ||
          f.startYear > state.bounds.minYear ||
          f.endYear < state.bounds.maxYear ||
          !f.includeUndated ||
          f.selectedCountries.size > 0 ||
          f.selectedPlaces.size > 0 ||
          f.personStatus !== "all" ||
          f.selectedPersons.size > 0
      );
    }

    function resetAllFilters() {
      state.filters.query = "";
      state.filters.startYear = state.bounds.minYear;
      state.filters.endYear = state.bounds.maxYear;
      state.filters.includeUndated = true;
      state.filters.selectedCountries.clear();
      state.filters.selectedPlaces.clear();
      state.filters.placeFilterText = "";
      state.filters.personStatus = "all";
      state.filters.selectedPersons.clear();
      state.filters.personFilterText = "";
      applyFilters();
    }

    function computeFacetCatalogs() {
      const countries = new Map();
      const places = new Map();
      const persons = new Map();

      for (const rec of state.sortedCorpus) {
        const seenRecCountries = new Set();
        for (const pl of rec.places) {
          if (!seenRecCountries.has(pl.pays)) {
            seenRecCountries.add(pl.pays);
            countries.set(pl.pays, (countries.get(pl.pays) || 0) + 1);
          }
          const existing = places.get(pl.key) || {
            key: pl.key,
            label: pl.label,
            pays: pl.pays,
            count: 0
          };
          existing.count += 1;
          places.set(pl.key, existing);
        }

        for (const p of rec.persons) {
          const existing = persons.get(p.key) || {
            key: p.key,
            label: p.label,
            status: p.status,
            count: 0
          };
          existing.count += 1;
          persons.set(p.key, existing);
        }
      }

      return {
        countries: Array.from(countries.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "fr")),
        places: Array.from(places.values()).sort((a, b) => a.label.localeCompare(b.label, "fr")),
        persons: Array.from(persons.values()).sort((a, b) => a.label.localeCompare(b.label, "fr"))
      };
    }

    // -----------------------------------------------------------------------
    // RENDU DES 4 PAGES
    // -----------------------------------------------------------------------
    function renderHeaderState() {
      for (const [id, link] of navLinks.entries()) {
        if (id === state.route) {
          link.setAttribute("aria-current", "page");
        } else {
          link.removeAttribute("aria-current");
        }
      }
      if (typeof document !== "undefined" && ROUTE_TITLES[state.route]) {
        document.title = ROUTE_TITLES[state.route];
      }
    }

    function updateStatusBanner() {
      if (state.loadError) {
        statusBanner.className = "ab-status-banner ab-status-banner--error";
        statusBanner.textContent = `Erreur de chargement Heurist : ${state.loadError}`;
        statusBanner.hidden = false;
      } else if (state.loading && state.route !== "presentation" && state.route !== "methodes") {
        statusBanner.className = "ab-status-banner";
        statusBanner.textContent = "Chargement du corpus ArchiBarthes depuis Huma-Num / Heurist…";
        statusBanner.hidden = false;
      } else {
        statusBanner.hidden = true;
      }
    }

    function drawRandomDiscoveryIndex(avoidCurrent = true) {
      const len = state.sortedCorpus.length;
      if (len <= 1) return 0;
      let idx = Math.floor(Math.random() * len);
      if (avoidCurrent && idx === state.discoveryIndex) {
        idx = (idx + 1 + Math.floor(Math.random() * (len - 1))) % len;
      }
      return idx;
    }

    function navigateTo(route, options = {}) {
      const cleanRoute = ROUTES.includes(route) ? route : "presentation";
      hideNoteTooltip(false);

      if (options.randomDraw) {
        state.discoveryIndex = drawRandomDiscoveryIndex(false);
        state.discoveryScanIdx = 0;
        state.discoveryTurnDir = "";
      } else if (cleanRoute === "decouverte" && state.route !== "decouverte" && state.corpusReady) {
        // Entrer sur #decouverte tire toujours une fiche au hasard immédiatement
        state.discoveryIndex = drawRandomDiscoveryIndex(false);
        state.discoveryScanIdx = 0;
        state.discoveryTurnDir = "";
      }

      if (options.focusTarget) {
        state.pendingFocusTarget = options.focusTarget;
      }

      const targetHash = `#${cleanRoute}`;
      if (window.location.hash !== targetHash) {
        window.location.hash = targetHash;
      }

      state.route = cleanRoute;
      renderApp();

      if (state.pendingFocusTarget) {
        const focusId = state.pendingFocusTarget;
        state.pendingFocusTarget = "";
        const targetEl = document.getElementById(focusId);
        if (targetEl) targetEl.focus();
      }
    }

    /* ----- PAGE 1 : PRESENTATION ----- */
    function renderPresentation() {
      const shell = document.createElement("div");
      shell.className = "ab-shell";

      // 1. Hero 2 colonnes
      const hero = document.createElement("section");
      hero.className = "ab-hero";
      hero.setAttribute("aria-labelledby", "ab-hero-h1");

      const heroCopy = document.createElement("div");
      heroCopy.className = "ab-hero-copy";

      const kicker = document.createElement("span");
      kicker.className = "ab-kicker";
      kicker.textContent = EDITORIAL_CONFIG.heroKicker;

      const h1 = document.createElement("h1");
      h1.id = "ab-hero-h1";
      h1.className = "ab-hero-title";
      h1.tabIndex = -1;
      h1.append(document.createTextNode(EDITORIAL_CONFIG.heroTitlePrefix));
      const hl = document.createElement("mark");
      hl.className = "ab-hl-lavender";
      hl.textContent = EDITORIAL_CONFIG.heroTitleHighlight;
      h1.appendChild(hl);

      const sub = document.createElement("p");
      sub.className = "ab-hero-sub";
      sub.textContent = EDITORIAL_CONFIG.heroSubtitle;

      const ctas = document.createElement("div");
      ctas.className = "ab-hero-actions";

      const btnExplore = document.createElement("button");
      btnExplore.type = "button";
      btnExplore.className = "ab-btn ab-btn--acid";
      btnExplore.textContent = "Explorer la Recherche →";
      btnExplore.addEventListener("click", () => navigateTo("recherche"));

      const btnDiscover = document.createElement("button");
      btnDiscover.type = "button";
      btnDiscover.className = "ab-btn ab-btn--cyan";
      btnDiscover.textContent = "Découverte aléatoire ↗";
      btnDiscover.addEventListener("click", () =>
        navigateTo("decouverte", { randomDraw: true })
      );

      ctas.append(btnExplore, btnDiscover);
      heroCopy.append(kicker, h1, sub, ctas);

      // Colonne droite : Portrait Cartier-Bresson 1953 + fallback esthétique
      const portraitCard = document.createElement("figure");
      portraitCard.className = "ab-hero-portrait-card";

      const cornerBadge = document.createElement("span");
      cornerBadge.className = "ab-hero-portrait-tag";
      cornerBadge.textContent = "01 / LE FONDS";

      const frame = document.createElement("div");
      frame.className = "ab-hero-portrait-frame";

      const img = document.createElement("img");
      img.className = "ab-hero-portrait-img";
      img.src = PORTRAIT_URL;
      img.alt = "Portrait de Roland Barthes en 1953 photographié par Henri Cartier-Bresson";
      img.loading = "eager";
      img.decoding = "async";
      img.addEventListener("error", () => {
        frame.replaceChildren(createPortraitFallbackEl());
      });
      frame.appendChild(img);

      const cap = document.createElement("figcaption");
      cap.className = "ab-hero-portrait-caption";
      const capTitle = document.createElement("span");
      capTitle.textContent = EDITORIAL_CONFIG.portraitCaption;
      const capCredit = document.createElement("span");
      capCredit.className = "ab-hero-portrait-credit";
      capCredit.textContent = EDITORIAL_CONFIG.portraitCredit;
      cap.append(capTitle, capCredit);

      portraitCard.append(cornerBadge, frame, cap);
      hero.append(heroCopy, portraitCard);

      // 2. 3 Cartes d'accès rapide
      const quickSection = document.createElement("section");
      quickSection.className = "ab-quick-section";
      quickSection.setAttribute("aria-labelledby", "ab-quick-heading");

      const quickLabel = document.createElement("h2");
      quickLabel.id = "ab-quick-heading";
      quickLabel.className = "ab-section-label";
      quickLabel.textContent = "ACCÈS DIRECT AU CORPUS";

      const quickGrid = document.createElement("div");
      quickGrid.className = "ab-quick-grid";

      const quickCardsData = [
        {
          num: "01",
          mod: "ab-quick-card--01",
          title: "Découverte aléatoire",
          desc: "Ouvrir le carnet sur le bureau éditorial avec une fiche manuscrite tirée au hasard, puis feuilleter par ordre de cote.",
          action: () => navigateTo("decouverte", { randomDraw: true })
        },
        {
          num: "02",
          mod: "ab-quick-card--02",
          title: "Recherche par mots-clés",
          desc: "Interroger en direct les transcriptions et notes critiques avec sensibilité à la casse [Aa] et accès rapide Ctrl+K.",
          action: () => navigateTo("recherche", { focusTarget: "ab-search-input" })
        },
        {
          num: "03",
          mod: "ab-quick-card--03",
          title: "Recherche par filtres",
          desc: "Croiser chronologie (1968–1980), pays, lieux géographiques et personnes selon leur statut dans le corpus.",
          action: () => navigateTo("recherche", { focusTarget: "ab-year-min" })
        }
      ];

      for (const card of quickCardsData) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = `ab-quick-card ${card.mod}`;
        btn.addEventListener("click", card.action);

        const top = document.createElement("div");
        top.className = "ab-quick-card-top";
        const num = document.createElement("span");
        num.className = "ab-quick-num";
        num.textContent = card.num;
        const arr = document.createElement("span");
        arr.className = "ab-quick-arrow";
        arr.setAttribute("aria-hidden", "true");
        arr.textContent = "↗";
        top.append(num, arr);

        const body = document.createElement("div");
        const title = document.createElement("h3");
        title.className = "ab-quick-title";
        title.textContent = card.title;
        const desc = document.createElement("p");
        desc.className = "ab-quick-desc";
        desc.style.marginBlockStart = "0.5rem";
        desc.textContent = card.desc;
        body.append(title, desc);

        btn.append(top, body);
        quickGrid.appendChild(btn);
      }

      quickSection.append(quickLabel, quickGrid);

      // 3. À propos du projet & équipe
      const aboutSection = document.createElement("section");
      aboutSection.className = "ab-about-section";
      aboutSection.setAttribute("aria-labelledby", "ab-about-h2");

      const aboutBox = document.createElement("div");
      aboutBox.className = "ab-about-box";

      const aboutLeft = document.createElement("div");
      const aboutKicker = document.createElement("span");
      aboutKicker.className = "ab-section-label";
      aboutKicker.textContent = EDITORIAL_CONFIG.aboutKicker;

      const aboutH2 = document.createElement("h2");
      aboutH2.id = "ab-about-h2";
      aboutH2.className = "ab-about-heading";
      aboutH2.textContent = EDITORIAL_CONFIG.aboutTitle;

      const aboutP = document.createElement("p");
      aboutP.className = "ab-about-text";
      aboutP.textContent = EDITORIAL_CONFIG.aboutBody;

      const methodBtn = document.createElement("button");
      methodBtn.type = "button";
      methodBtn.className = "ab-btn ab-btn--sm";
      methodBtn.textContent = "Consulter la méthode de travail →";
      methodBtn.addEventListener("click", () => navigateTo("methodes"));

      aboutLeft.append(aboutKicker, aboutH2, aboutP, methodBtn);

      const teamCol = document.createElement("div");
      teamCol.className = "ab-team-list";
      const teamHeading = document.createElement("div");
      teamHeading.className = "ab-section-label";
      teamHeading.textContent = "DIRECTION SCIENTIFIQUE & ÉQUIPE";
      teamCol.appendChild(teamHeading);

      for (const member of EDITORIAL_CONFIG.team) {
        const tCard = document.createElement("article");
        tCard.className = "ab-team-card";
        const role = document.createElement("span");
        role.className = "ab-team-role";
        role.textContent = member.role;
        const name = document.createElement("h3");
        name.className = "ab-team-name";
        name.textContent = member.name;
        const affil = document.createElement("p");
        affil.className = "ab-team-affil";
        affil.textContent = member.affiliation;
        const bio = document.createElement("p");
        bio.className = "ab-team-bio";
        bio.textContent = member.bio;
        tCard.append(role, name, affil, bio);
        teamCol.appendChild(tCard);
      }

      if (state.corpusReady) {
        const statsCard = document.createElement("div");
        statsCard.className = "ab-team-card";
        statsCard.style.backgroundColor = "var(--ab-acid)";
        const stLbl = document.createElement("span");
        stLbl.className = "ab-section-label";
        stLbl.textContent = "CORPUS CHARGÉ EN LIGNE";
        const stVal = document.createElement("p");
        stVal.style.fontWeight = "800";
        stVal.style.marginBlockStart = "0.25rem";
        stVal.textContent = `${state.sortedCorpus.length.toLocaleString("fr-FR")} fiches · ${state.bounds.minYear}–${state.bounds.maxYear}`;
        statsCard.append(stLbl, stVal);
        teamCol.appendChild(statsCard);
      }

      aboutBox.append(aboutLeft, teamCol);
      aboutSection.appendChild(aboutBox);

      shell.append(hero, quickSection, aboutSection);
      return shell;
    }

    /* ----- PAGE 2 : RECHERCHE & EXPLORATION ----- */
    function renderRecherche() {
      const shell = document.createElement("div");
      shell.className = "ab-shell";

      const head = document.createElement("div");
      head.className = "ab-search-header";
      const h1 = document.createElement("h1");
      h1.className = "ab-page-title";
      h1.tabIndex = -1;
      h1.textContent = "Explorer & filtrer le fichier";
      const totalTag = document.createElement("span");
      totalTag.className = "ab-kicker";
      totalTag.textContent = state.corpusReady
        ? `${state.filtered.length} / ${state.sortedCorpus.length} FICHES`
        : "CHARGEMENT…";
      head.append(h1, totalTag);
      shell.appendChild(head);

      // Conteneurs dynamiques pour mises à jour ciblées sans perdre le focus clavier
      const deck = document.createElement("section");
      deck.className = "ab-filter-deck";
      deck.setAttribute("aria-label", "Filtres combinables de recherche");

      const catalog = computeFacetCatalogs();
      const f = state.filters;

      // Ligne 1 : Barre mots-clés + [Aa] (active par défaut)
      const searchRow = document.createElement("div");
      searchRow.className = "ab-search-row";

      const searchLabel = document.createElement("label");
      searchLabel.htmlFor = "ab-search-input";
      searchLabel.className = "ab-visually-hidden";
      searchLabel.textContent = "Rechercher par mot-clé dans les transcriptions et métadonnées";

      const searchWrap = document.createElement("div");
      searchWrap.className = "ab-search-input-wrap";

      const searchInput = document.createElement("input");
      searchInput.id = "ab-search-input";
      searchInput.type = "search";
      searchInput.className = "ab-search-input";
      searchInput.placeholder =
        "Rechercher un mot-clé, un nom, une date ou un n° de fiche…";
      searchInput.value = f.query;

      const kbdHint = document.createElement("kbd");
      kbdHint.className = "ab-kbd";
      kbdHint.textContent =
        typeof navigator !== "undefined" && /Mac|iPhone|iPad/i.test(navigator.platform || "")
          ? "⌘K"
          : "Ctrl+K";

      searchWrap.append(searchInput, kbdHint);

      const caseBtn = document.createElement("button");
      caseBtn.type = "button";
      caseBtn.id = "ab-case-toggle";
      caseBtn.className = "ab-case-btn";
      caseBtn.setAttribute("aria-pressed", f.caseSensitive ? "true" : "false");
      caseBtn.textContent = f.caseSensitive ? "[Aa] Casse exacte" : "[Aa] Casse libre";
      caseBtn.title = "Basculer la sensibilité à la casse";

      searchRow.append(searchLabel, searchWrap, caseBtn);

      // Ligne 2 : 3 facettes (Chronologie | Lieux hiérarchique | Personnes statut)
      const facetsGrid = document.createElement("div");
      facetsGrid.className = "ab-facets-grid";

      // Facette 1 : Chronologie double-slider
      const dateCard = document.createElement("div");
      dateCard.className = "ab-facet-card";
      const dateHead = document.createElement("div");
      dateHead.className = "ab-facet-head";
      const dateLbl = document.createElement("span");
      dateLbl.className = "ab-section-label";
      dateLbl.textContent = "1. CHRONOLOGIE";
      const dateReadout = document.createElement("span");
      dateReadout.className = "ab-facet-readout";
      dateReadout.textContent = `De ${f.startYear} à ${f.endYear}`;
      dateHead.append(dateLbl, dateReadout);

      const rangeStage = document.createElement("div");
      rangeStage.className = "ab-range-stage";

      const rail = document.createElement("div");
      rail.className = "ab-range-rail";
      const fill = document.createElement("div");
      fill.className = "ab-range-fill";
      rail.appendChild(fill);

      const minInput = document.createElement("input");
      minInput.id = "ab-year-min";
      minInput.type = "range";
      minInput.className = "ab-dual-range ab-dual-range--start";
      minInput.min = String(state.bounds.minYear);
      minInput.max = String(state.bounds.maxYear);
      minInput.step = "1";
      minInput.value = String(f.startYear);
      minInput.setAttribute("aria-label", "Année de début");

      const maxInput = document.createElement("input");
      maxInput.id = "ab-year-max";
      maxInput.type = "range";
      maxInput.className = "ab-dual-range ab-dual-range--end";
      maxInput.min = String(state.bounds.minYear);
      maxInput.max = String(state.bounds.maxYear);
      maxInput.step = "1";
      maxInput.value = String(f.endYear);
      maxInput.setAttribute("aria-label", "Année de fin");

      const syncSliderVisuals = () => {
        const span = Math.max(1, state.bounds.maxYear - state.bounds.minYear);
        const pctStart = ((f.startYear - state.bounds.minYear) / span) * 100;
        const pctEnd = ((f.endYear - state.bounds.minYear) / span) * 100;
        fill.style.setProperty("--ab-fill-start", `${pctStart}%`);
        fill.style.setProperty("--ab-fill-end", `${pctEnd}%`);
        minInput.setAttribute("aria-valuetext", `Année de début ${f.startYear}`);
        maxInput.setAttribute("aria-valuetext", `Année de fin ${f.endYear}`);
        dateReadout.textContent = `De ${f.startYear} à ${f.endYear}`;
        // Évite le blocage si les deux curseurs se chevauchent sur la borne haute
        if (f.startYear >= state.bounds.maxYear - 1) {
          minInput.style.zIndex = "5";
          maxInput.style.zIndex = "4";
        } else {
          minInput.style.zIndex = "3";
          maxInput.style.zIndex = "4";
        }
      };
      syncSliderVisuals();

      rangeStage.append(rail, minInput, maxInput);

      const boundsRow = document.createElement("div");
      boundsRow.className = "ab-range-bounds";
      const bMin = document.createElement("span");
      bMin.textContent = String(state.bounds.minYear);
      const bMax = document.createElement("span");
      bMax.textContent = String(state.bounds.maxYear);
      boundsRow.append(bMin, bMax);

      const undatedLabel = document.createElement("label");
      undatedLabel.className = "ab-check-inline";
      const undatedCb = document.createElement("input");
      undatedCb.type = "checkbox";
      undatedCb.checked = f.includeUndated;
      const undatedTxt = document.createElement("span");
      undatedTxt.textContent = "Inclure les fiches sans date";
      undatedLabel.append(undatedCb, undatedTxt);

      dateCard.append(dateHead, rangeStage, boundsRow, undatedLabel);

      // Facette 2 : Lieux hiérarchique (Pays -> Lieu)
      const placeCard = document.createElement("div");
      placeCard.className = "ab-facet-card";
      const placeHead = document.createElement("div");
      placeHead.className = "ab-facet-head";
      const placeLbl = document.createElement("span");
      placeLbl.className = "ab-section-label";
      placeLbl.textContent = "2. LIEUX (PAYS → LIEU)";
      const placeCnt = document.createElement("span");
      placeCnt.className = "ab-facet-readout";
      placeCnt.textContent =
        f.selectedCountries.size + f.selectedPlaces.size > 0
          ? `${f.selectedCountries.size + f.selectedPlaces.size} actif(s)`
          : `${catalog.places.length} lieux`;
      placeHead.append(placeLbl, placeCnt);

      const countryRow = document.createElement("div");
      countryRow.className = "ab-pill-row";
      for (const [paysName, count] of catalog.countries) {
        const pBtn = document.createElement("button");
        pBtn.type = "button";
        pBtn.className = "ab-seg-btn ab-seg-btn--cyan";
        const active = f.selectedCountries.has(paysName);
        pBtn.setAttribute("aria-pressed", active ? "true" : "false");
        const shortPays = paysName === "Non précisé / Transports" ? "Autres / Transports" : paysName;
        pBtn.textContent = `${shortPays} (${count})`;
        pBtn.addEventListener("click", () => {
          if (f.selectedCountries.has(paysName)) {
            f.selectedCountries.delete(paysName);
          } else {
            f.selectedCountries.add(paysName);
          }
          // Garde uniquement les lieux compatibles avec les pays cochés si sélection active
          if (f.selectedCountries.size > 0) {
            for (const plKey of Array.from(f.selectedPlaces)) {
              const info = catalog.places.find((x) => x.key === plKey);
              if (info && !f.selectedCountries.has(info.pays)) {
                f.selectedPlaces.delete(plKey);
              }
            }
          }
          applyFilters();
          refreshSearchResults();
        });
        countryRow.appendChild(pBtn);
      }

      const placeSearchInput = document.createElement("input");
      placeSearchInput.type = "search";
      placeSearchInput.className = "ab-mini-filter";
      placeSearchInput.placeholder = "Filtrer la liste des lieux…";
      placeSearchInput.setAttribute("aria-label", "Filtrer les lieux disponibles");
      placeSearchInput.value = f.placeFilterText;

      const placeList = document.createElement("div");
      placeList.className = "ab-checklist";

      const renderPlaceChecklist = () => {
        placeList.replaceChildren();
        const needle = normalizeLoose(f.placeFilterText);
        const visiblePlaces = catalog.places.filter((pl) => {
          if (f.selectedCountries.size > 0 && !f.selectedCountries.has(pl.pays)) return false;
          if (needle && !normalizeLoose(pl.label).includes(needle)) return false;
          return true;
        });

        if (visiblePlaces.length === 0) {
          const empty = document.createElement("p");
          empty.style.fontSize = "0.8rem";
          empty.style.padding = "0.35rem";
          empty.textContent = "Aucun lieu correspondant.";
          placeList.appendChild(empty);
          return;
        }

        for (const pl of visiblePlaces) {
          const lbl = document.createElement("label");
          lbl.className = "ab-check-item";
          const left = document.createElement("span");
          left.className = "ab-check-item-left";
          const cb = document.createElement("input");
          cb.type = "checkbox";
          cb.checked = f.selectedPlaces.has(pl.key);
          cb.addEventListener("change", () => {
            if (cb.checked) f.selectedPlaces.add(pl.key);
            else f.selectedPlaces.delete(pl.key);
            applyFilters();
            refreshSearchResults();
          });
          const txt = document.createElement("span");
          txt.textContent = pl.label;
          left.append(cb, txt);

          const cnt = document.createElement("span");
          cnt.className = "ab-check-count";
          cnt.textContent = String(pl.count);
          lbl.append(left, cnt);
          placeList.appendChild(lbl);
        }
      };
      renderPlaceChecklist();

      placeCard.append(placeHead, countryRow, placeSearchInput, placeList);

      // Facette 3 : Personnes (Statut : Tous / Artistes / Autres + liste multi-sélection)
      const personCard = document.createElement("div");
      personCard.className = "ab-facet-card";
      const personHead = document.createElement("div");
      personHead.className = "ab-facet-head";
      const personLbl = document.createElement("span");
      personLbl.className = "ab-section-label";
      personLbl.textContent = "3. PERSONNES (STATUT → NOM)";
      const personCnt = document.createElement("span");
      personCnt.className = "ab-facet-readout";
      personCnt.textContent =
        f.selectedPersons.size > 0
          ? `${f.selectedPersons.size} choisie(s)`
          : `${catalog.persons.length} pers.`;
      personHead.append(personLbl, personCnt);

      const statusRow = document.createElement("div");
      statusRow.className = "ab-pill-row";
      const statusChoices = [
        { id: "all", label: "Tous" },
        { id: "artistes", label: "Artistes" },
        { id: "autres", label: "Autres" }
      ];
      for (const st of statusChoices) {
        const sBtn = document.createElement("button");
        sBtn.type = "button";
        sBtn.className = "ab-seg-btn";
        sBtn.setAttribute("aria-pressed", f.personStatus === st.id ? "true" : "false");
        sBtn.textContent = st.label;
        sBtn.addEventListener("click", () => {
          f.personStatus = st.id;
          if (st.id !== "all") {
            for (const pKey of Array.from(f.selectedPersons)) {
              const info = catalog.persons.find((x) => x.key === pKey);
              if (info && info.status !== st.id) f.selectedPersons.delete(pKey);
            }
          }
          applyFilters();
          refreshSearchResults();
        });
        statusRow.appendChild(sBtn);
      }

      const personSearchInput = document.createElement("input");
      personSearchInput.type = "search";
      personSearchInput.className = "ab-mini-filter";
      personSearchInput.placeholder = "Filtrer la liste des personnes…";
      personSearchInput.setAttribute("aria-label", "Filtrer les personnes disponibles");
      personSearchInput.value = f.personFilterText;

      const personList = document.createElement("div");
      personList.className = "ab-checklist";

      const renderPersonChecklist = () => {
        personList.replaceChildren();
        const needle = normalizeLoose(f.personFilterText);
        const visiblePersons = catalog.persons.filter((p) => {
          if (f.personStatus !== "all" && p.status !== f.personStatus) return false;
          if (needle && !normalizeLoose(p.label).includes(needle)) return false;
          return true;
        });

        if (visiblePersons.length === 0) {
          const empty = document.createElement("p");
          empty.style.fontSize = "0.8rem";
          empty.style.padding = "0.35rem";
          empty.textContent = "Aucune personne correspondante.";
          personList.appendChild(empty);
          return;
        }

        for (const p of visiblePersons) {
          const lbl = document.createElement("label");
          lbl.className = "ab-check-item";
          const left = document.createElement("span");
          left.className = "ab-check-item-left";
          const cb = document.createElement("input");
          cb.type = "checkbox";
          cb.checked = f.selectedPersons.has(p.key);
          cb.addEventListener("change", () => {
            if (cb.checked) f.selectedPersons.add(p.key);
            else f.selectedPersons.delete(p.key);
            applyFilters();
            refreshSearchResults();
          });
          const txt = document.createElement("span");
          txt.textContent = p.label;
          left.append(cb, txt);

          const cnt = document.createElement("span");
          cnt.className = "ab-check-count";
          cnt.textContent = String(p.count);
          lbl.append(left, cnt);
          personList.appendChild(lbl);
        }
      };
      renderPersonChecklist();

      personCard.append(personHead, statusRow, personSearchInput, personList);
      facetsGrid.append(dateCard, placeCard, personCard);

      // Barre des filtres actifs + réinitialisation
      const activeBar = document.createElement("div");
      activeBar.className = "ab-active-filters";

      deck.append(searchRow, facetsGrid, activeBar);
      shell.appendChild(deck);

      // Split Master (30%) / Detail (70%)
      const split = document.createElement("div");
      split.className = "ab-master-detail";

      const masterCol = document.createElement("aside");
      masterCol.className = "ab-master-col";
      masterCol.setAttribute("aria-label", "Liste des fiches filtrées");

      const masterHead = document.createElement("div");
      masterHead.className = "ab-master-head";
      const masterCount = document.createElement("span");
      masterCount.className = "ab-master-count";
      masterCount.setAttribute("aria-live", "polite");
      masterHead.appendChild(masterCount);

      const masterList = document.createElement("div");
      masterList.className = "ab-master-list";
      masterList.setAttribute("role", "listbox");
      masterList.setAttribute("aria-label", "Fiches correspondantes");

      masterCol.append(masterHead, masterList);

      const detailCol = document.createElement("section");
      detailCol.className = "ab-detail-col";
      detailCol.setAttribute("aria-label", "Lecteur critique de la fiche sélectionnée");

      split.append(masterCol, detailCol);
      shell.appendChild(split);

      // ---------------------------------------------------------------------
      // MISES À JOUR CIBLÉES DE LA ZONE RÉSULTATS & TAGS ACTIFS
      // ---------------------------------------------------------------------
      const renderActiveTags = () => {
        activeBar.replaceChildren();
        const tags = [];

        if (f.query.trim()) {
          tags.push({
            label: `Mot-clé : « ${f.query.trim()} » (${f.caseSensitive ? "casse exacte" : "casse libre"})`,
            clear: () => {
              f.query = "";
              searchInput.value = "";
            }
          });
        }
        if (f.startYear > state.bounds.minYear || f.endYear < state.bounds.maxYear) {
          tags.push({
            label: `Années : ${f.startYear}–${f.endYear}`,
            clear: () => {
              f.startYear = state.bounds.minYear;
              f.endYear = state.bounds.maxYear;
              minInput.value = String(f.startYear);
              maxInput.value = String(f.endYear);
              syncSliderVisuals();
            }
          });
        }
        if (!f.includeUndated) {
          tags.push({
            label: "Sans date exclues",
            clear: () => {
              f.includeUndated = true;
              undatedCb.checked = true;
            }
          });
        }
        for (const c of f.selectedCountries) {
          tags.push({
            label: `Pays : ${c}`,
            clear: () => f.selectedCountries.delete(c)
          });
        }
        for (const plKey of f.selectedPlaces) {
          const info = catalog.places.find((x) => x.key === plKey);
          tags.push({
            label: `Lieu : ${info ? info.label : plKey}`,
            clear: () => f.selectedPlaces.delete(plKey)
          });
        }
        if (f.personStatus !== "all") {
          tags.push({
            label: `Statut : ${f.personStatus === "artistes" ? "Artistes" : "Autres"}`,
            clear: () => {
              f.personStatus = "all";
            }
          });
        }
        for (const pKey of f.selectedPersons) {
          const info = catalog.persons.find((x) => x.key === pKey);
          tags.push({
            label: `Personne : ${info ? info.label : pKey}`,
            clear: () => f.selectedPersons.delete(pKey)
          });
        }

        if (tags.length === 0) {
          activeBar.hidden = true;
          return;
        }
        activeBar.hidden = false;

        for (const t of tags) {
          const tBtn = document.createElement("button");
          tBtn.type = "button";
          tBtn.className = "ab-filter-tag";
          tBtn.textContent = `${t.label} ✕`;
          tBtn.setAttribute("aria-label", `Retirer le filtre ${t.label}`);
          tBtn.addEventListener("click", () => {
            t.clear();
            applyFilters();
            refreshSearchResults();
          });
          activeBar.appendChild(tBtn);
        }

        const resetBtn = document.createElement("button");
        resetBtn.type = "button";
        resetBtn.className = "ab-btn ab-btn--sm ab-btn--dark";
        resetBtn.textContent = "Réinitialiser tous les filtres";
        resetBtn.addEventListener("click", () => {
          resetAllFilters();
          renderApp();
        });
        activeBar.appendChild(resetBtn);
      };

      const renderMasterList = () => {
        const count = state.filtered.length;
        masterCount.textContent =
          count <= 1 ? `${count} fiche correspond` : `${count.toLocaleString("fr-FR")} fiches correspondent`;
        totalTag.textContent = state.corpusReady
          ? `${count} / ${state.sortedCorpus.length} FICHES`
          : "CHARGEMENT…";

        masterList.replaceChildren();
        if (count === 0) {
          const empty = document.createElement("div");
          empty.style.padding = "1.25rem";
          empty.style.fontSize = "0.9rem";
          empty.textContent = state.loading
            ? "Chargement des fiches en cours…"
            : "Aucune fiche ne correspond à ces critères combinés.";
          masterList.appendChild(empty);
          return;
        }

        for (const fiche of state.filtered) {
          const item = document.createElement("button");
          item.type = "button";
          item.className = "ab-fiche-item";
          item.setAttribute("role", "option");
          const isSelected = fiche.id === state.selectedFicheId;
          item.setAttribute("aria-selected", isSelected ? "true" : "false");
          if (isSelected) item.setAttribute("aria-current", "true");

          const top = document.createElement("div");
          top.className = "ab-fiche-item-top";
          const bnf = document.createElement("span");
          bnf.className = "ab-bnf-pill";
          bnf.textContent = `N° ${fiche.numero}`;
          const dt = document.createElement("span");
          dt.className = "ab-fiche-item-date";
          dt.textContent = fiche.date.display;
          top.append(bnf, dt);

          const ttl = document.createElement("span");
          ttl.className = "ab-fiche-item-title";
          ttl.textContent = fiche.title;

          item.append(top, ttl);
          item.addEventListener("click", () => {
            if (state.selectedFicheId === fiche.id) return;
            hideNoteTooltip(false);
            state.selectedFicheId = fiche.id;
            state.activeScanIdx = 0;
            state.zoomLevel = 1;
            state.panX = 0;
            state.panY = 0;
            renderMasterList();
            renderDetailPane();
          });

          masterList.appendChild(item);
        }
      };

      const renderDetailPane = () => {
        detailCol.replaceChildren();
        hideNoteTooltip(false);

        const fiche = state.byId.get(state.selectedFicheId) || state.filtered[0] || null;
        if (!fiche) {
          const emptyBox = document.createElement("div");
          emptyBox.style.padding = "2rem";
          emptyBox.style.textAlign = "center";
          const p = document.createElement("p");
          p.style.fontWeight = "700";
          p.textContent = state.loading
            ? "Récupération des notices manuscrites en cours…"
            : "Sélectionnez ou ajustez vos filtres pour afficher une fiche.";
          emptyBox.appendChild(p);
          if (!state.loading && hasActiveFilters()) {
            const rst = document.createElement("button");
            rst.type = "button";
            rst.className = "ab-btn ab-btn--acid";
            rst.style.marginBlockStart = "1rem";
            rst.textContent = "Réinitialiser tous les filtres";
            rst.addEventListener("click", () => {
              resetAllFilters();
              renderApp();
            });
            emptyBox.appendChild(rst);
          }
          detailCol.appendChild(emptyBox);
          return;
        }

        // Topbar du lecteur (N° BnF, Date complète, Cote, Genres)
        const topbar = document.createElement("div");
        topbar.className = "ab-detail-topbar";
        const pills = document.createElement("div");
        pills.className = "ab-detail-meta-pills";

        const bnfBadge = document.createElement("span");
        bnfBadge.className = "ab-detail-badge";
        bnfBadge.textContent = `FICHE BNF N° ${fiche.numero}`;

        const dateBadge = document.createElement("span");
        dateBadge.className = "ab-detail-badge ab-detail-badge--neutral";
        dateBadge.textContent = fiche.date.display;

        const coteBadge = document.createElement("span");
        coteBadge.className = "ab-detail-badge ab-detail-badge--neutral";
        coteBadge.textContent = fiche.cote;

        pills.append(bnfBadge, dateBadge, coteBadge);
        for (const g of fiche.genres) {
          const gb = document.createElement("span");
          gb.className = "ab-detail-badge ab-detail-badge--neutral";
          gb.textContent = g.label;
          pills.appendChild(gb);
        }

        const extLink = document.createElement("a");
        extLink.className = "ab-btn ab-btn--sm";
        extLink.href = fiche.noticeUrl;
        extLink.target = "_blank";
        extLink.rel = "noopener noreferrer";
        extLink.textContent = "Notice Heurist ↗";

        topbar.append(pills, extLink);

        // Corps synoptique : Scan HD (gauche) / Transcription & Notes (droite)
        const synoptic = document.createElement("div");
        synoptic.className = "ab-synoptic-body";

        const scanPane = document.createElement("div");
        scanPane.className = "ab-scan-pane";

        const scanControls = document.createElement("div");
        scanControls.className = "ab-scan-controls";

        const scanTabs = document.createElement("div");
        scanTabs.className = "ab-scan-tabs";
        if (fiche.scans.length > 0) {
          fiche.scans.forEach((_, idx) => {
            const tab = document.createElement("button");
            tab.type = "button";
            tab.className = "ab-seg-btn";
            const label =
              idx === 0 ? "Recto" : idx === 1 ? "Verso" : `Vue ${idx + 1}`;
            tab.textContent = label;
            tab.setAttribute("aria-pressed", idx === state.activeScanIdx ? "true" : "false");
            tab.addEventListener("click", () => {
              state.activeScanIdx = idx;
              state.zoomLevel = 1;
              state.panX = 0;
              state.panY = 0;
              renderDetailPane();
            });
            scanTabs.appendChild(tab);
          });
        }

        const zoomGroup = document.createElement("div");
        zoomGroup.className = "ab-zoom-group";

        const stage = document.createElement("div");
        stage.className = "ab-zoom-stage";
        const activeScan = fiche.scans[state.activeScanIdx] || fiche.scans[0] || null;
        let inlineImg = null;

        const zOutBtn = document.createElement("button");
        zOutBtn.type = "button";
        zOutBtn.className = "ab-btn ab-btn--sm";
        zOutBtn.textContent = "Zoom −";

        const zResetBtn = document.createElement("button");
        zResetBtn.type = "button";
        zResetBtn.className = "ab-btn ab-btn--sm";
        zResetBtn.textContent = `${Math.round(state.zoomLevel * 100)} %`;

        const zInBtn = document.createElement("button");
        zInBtn.type = "button";
        zInBtn.className = "ab-btn ab-btn--sm";
        zInBtn.textContent = "Zoom +";

        const fullBtn = document.createElement("button");
        fullBtn.type = "button";
        fullBtn.className = "ab-btn ab-btn--sm ab-btn--acid";
        fullBtn.textContent = "Agrandir en plein écran ↗";

        const syncInlineZoom = () => {
          if (!inlineImg) return;
          inlineImg.style.transform = `translate(${state.panX}px, ${state.panY}px) scale(${state.zoomLevel})`;
          stage.classList.toggle("is-zoomed", state.zoomLevel > 1);
          zResetBtn.textContent = `${Math.round(state.zoomLevel * 100)} %`;
        };

        if (activeScan) {
          inlineImg = document.createElement("img");
          inlineImg.className = "ab-zoom-img";
          inlineImg.src = activeScan.url;
          inlineImg.alt = `Numérisation de la fiche BnF n° ${fiche.numero}`;
          stage.appendChild(inlineImg);
          syncInlineZoom();

          bindDragPan(
            stage,
            () => state.zoomLevel,
            () => ({ x: state.panX, y: state.panY }),
            (x, y) => {
              state.panX = x;
              state.panY = y;
              syncInlineZoom();
            }
          );

          zInBtn.addEventListener("click", () => {
            state.zoomLevel = Math.min(3.5, +(state.zoomLevel + 0.35).toFixed(2));
            syncInlineZoom();
          });
          zOutBtn.addEventListener("click", () => {
            state.zoomLevel = Math.max(0.75, +(state.zoomLevel - 0.35).toFixed(2));
            if (state.zoomLevel <= 1) {
              state.panX = 0;
              state.panY = 0;
            }
            syncInlineZoom();
          });
          zResetBtn.addEventListener("click", () => {
            state.zoomLevel = 1;
            state.panX = 0;
            state.panY = 0;
            syncInlineZoom();
          });
          fullBtn.addEventListener("click", () => openScanModal(fiche, state.activeScanIdx));
        } else {
          const emptyScan = document.createElement("div");
          emptyScan.className = "ab-scan-empty";
          emptyScan.textContent = "[ Scan non disponible ]";
          stage.appendChild(emptyScan);
          zOutBtn.disabled = true;
          zResetBtn.disabled = true;
          zInBtn.disabled = true;
          fullBtn.disabled = true;
        }

        zoomGroup.append(zOutBtn, zResetBtn, zInBtn);
        scanControls.append(scanTabs, zoomGroup);

        const panHint = document.createElement("div");
        panHint.className = "ab-pan-hint";
        const panTxt = document.createElement("span");
        panTxt.textContent = activeScan
          ? "Astuce : zoomez puis faites glisser l'image."
          : "Aucun fac-similé attaché à cette notice.";
        panHint.append(panTxt, fullBtn);

        scanPane.append(scanControls, stage, panHint);

        // Sous-colonne droite : Transcription + appels de notes + bouton Agrandir les notes
        const textPane = document.createElement("div");
        textPane.className = "ab-text-pane";

        const textTop = document.createElement("div");
        const detailTitle = document.createElement("h2");
        detailTitle.className = "ab-detail-title";
        detailTitle.textContent = fiche.title;

        const prose = document.createElement("div");
        prose.className = "ab-transcription-prose";
        if (fiche.bodyHtml && fiche.bodyHtml.trim()) {
          prose.innerHTML = fiche.bodyHtml;
          wireFootnoteButtons(prose, fiche);
        } else {
          const emptyP = document.createElement("p");
          emptyP.className = "ab-transcription-empty";
          emptyP.textContent = "Transcription non disponible pour cette fiche.";
          prose.appendChild(emptyP);
        }

        textTop.append(detailTitle, prose);

        if (fiche.notes.length > 0) {
          const notesBar = document.createElement("div");
          notesBar.className = "ab-notes-bar";
          const nbLbl = document.createElement("span");
          nbLbl.className = "ab-section-label";
          nbLbl.textContent = `NOTES CRITIQUES (${fiche.notes.length}) — SURVOLER OU CLIQUER [1]`;
          const expandBtn = document.createElement("button");
          expandBtn.type = "button";
          expandBtn.className = "ab-btn ab-btn--sm ab-btn--lavender";
          expandBtn.textContent = "Agrandir les notes ↗";
          expandBtn.addEventListener("click", () => openNotesModal(fiche));
          notesBar.append(nbLbl, expandBtn);
          textTop.appendChild(notesBar);
        }

        textPane.appendChild(textTop);
        synoptic.append(scanPane, textPane);

        // Pied de fiche : Entités cliquables (Personnes, Lieux, Fiches liées / renvois)
        const footer = document.createElement("footer");
        footer.className = "ab-entity-footer";

        if (fiche.persons.length > 0) {
          const row = document.createElement("div");
          row.className = "ab-entity-group";
          const lbl = document.createElement("span");
          lbl.className = "ab-entity-label";
          lbl.textContent = "Personnes";
          row.appendChild(lbl);
          for (const p of fiche.persons) {
            const chip = document.createElement("button");
            chip.type = "button";
            chip.className = "ab-entity-chip ab-entity-chip--person";
            chip.textContent = `👤 ${p.label}`;
            chip.title = `Filtrer le corpus sur ${p.label}`;
            chip.addEventListener("click", () => {
              state.filters.selectedPersons.clear();
              state.filters.selectedPersons.add(p.key);
              state.filters.personStatus = "all";
              applyFilters();
              refreshSearchResults();
            });
            row.appendChild(chip);
          }
          footer.appendChild(row);
        }

        if (fiche.places.length > 0) {
          const row = document.createElement("div");
          row.className = "ab-entity-group";
          const lbl = document.createElement("span");
          lbl.className = "ab-entity-label";
          lbl.textContent = "Lieux";
          row.appendChild(lbl);
          for (const pl of fiche.places) {
            const chip = document.createElement("button");
            chip.type = "button";
            chip.className = "ab-entity-chip ab-entity-chip--place";
            chip.textContent = `📍 ${pl.label}`;
            chip.title = `Filtrer le corpus sur ${pl.label}`;
            chip.addEventListener("click", () => {
              state.filters.selectedPlaces.clear();
              state.filters.selectedPlaces.add(pl.key);
              state.filters.selectedCountries.clear();
              applyFilters();
              refreshSearchResults();
            });
            row.appendChild(chip);
          }
          footer.appendChild(row);
        }

        if (fiche.relatedFiches.length > 0) {
          const row = document.createElement("div");
          row.className = "ab-entity-group";
          const lbl = document.createElement("span");
          lbl.className = "ab-entity-label";
          lbl.textContent = "Fiches liées";
          row.appendChild(lbl);
          for (const rf of fiche.relatedFiches) {
            const chip = document.createElement("button");
            chip.type = "button";
            chip.className = "ab-entity-chip ab-entity-chip--xref";
            chip.textContent = `🔗 Fiche n° ${rf.numero}`;
            chip.title = `Ouvrir la fiche ${rf.numero} : ${rf.title}`;
            chip.addEventListener("click", () => {
              // S'assure que la fiche cible apparaît bien dans le lecteur
              if (!state.filtered.some((x) => x.id === rf.id)) {
                resetAllFilters();
              }
              state.selectedFicheId = rf.id;
              state.activeScanIdx = 0;
              state.zoomLevel = 1;
              state.panX = 0;
              state.panY = 0;
              renderApp();
            });
            row.appendChild(chip);
          }
          footer.appendChild(row);
        }

        detailCol.append(topbar, synoptic);
        if (footer.childElementCount > 0) detailCol.appendChild(footer);
      };

      const refreshSearchResults = () => {
        // Met à jour compteurs, pills actives, listes et résultats sans recréer les inputs focussés
        placeCnt.textContent =
          f.selectedCountries.size + f.selectedPlaces.size > 0
            ? `${f.selectedCountries.size + f.selectedPlaces.size} actif(s)`
            : `${catalog.places.length} lieux`;
        personCnt.textContent =
          f.selectedPersons.size > 0
            ? `${f.selectedPersons.size} choisie(s)`
            : `${catalog.persons.length} pers.`;

        for (const btn of countryRow.querySelectorAll("button")) {
          const name = btn.textContent.replace(/\s*\(\d+\)$/, "");
          const realName = name === "Autres / Transports" ? "Non précisé / Transports" : name;
          btn.setAttribute("aria-pressed", f.selectedCountries.has(realName) ? "true" : "false");
        }
        const statusBtns = statusRow.querySelectorAll("button");
        statusChoices.forEach((st, i) => {
          if (statusBtns[i]) {
            statusBtns[i].setAttribute("aria-pressed", f.personStatus === st.id ? "true" : "false");
          }
        });

        renderPlaceChecklist();
        renderPersonChecklist();
        renderActiveTags();
        renderMasterList();
        renderDetailPane();
      };

      // Écouteurs contrôles de recherche
      searchInput.addEventListener("input", () => {
        f.query = searchInput.value;
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(() => {
          applyFilters();
          refreshSearchResults();
        }, SEARCH_DEBOUNCE_MS);
      });

      searchInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          clearTimeout(searchDebounceTimer);
          f.query = searchInput.value;
          applyFilters();
          refreshSearchResults();
        }
      });

      caseBtn.addEventListener("click", () => {
        f.caseSensitive = !f.caseSensitive;
        caseBtn.setAttribute("aria-pressed", f.caseSensitive ? "true" : "false");
        caseBtn.textContent = f.caseSensitive ? "[Aa] Casse exacte" : "[Aa] Casse libre";
        applyFilters();
        refreshSearchResults();
      });

      minInput.addEventListener("input", () => {
        const val = parseInt(minInput.value, 10);
        f.startYear = Math.min(val, f.endYear);
        minInput.value = String(f.startYear);
        syncSliderVisuals();
        applyFilters();
        refreshSearchResults();
      });

      maxInput.addEventListener("input", () => {
        const val = parseInt(maxInput.value, 10);
        f.endYear = Math.max(val, f.startYear);
        maxInput.value = String(f.endYear);
        syncSliderVisuals();
        applyFilters();
        refreshSearchResults();
      });

      undatedCb.addEventListener("change", () => {
        f.includeUndated = undatedCb.checked;
        applyFilters();
        refreshSearchResults();
      });

      placeSearchInput.addEventListener("input", () => {
        f.placeFilterText = placeSearchInput.value;
        renderPlaceChecklist();
      });

      personSearchInput.addEventListener("input", () => {
        f.personFilterText = personSearchInput.value;
        renderPersonChecklist();
      });

      renderActiveTags();
      renderMasterList();
      renderDetailPane();

      return shell;
    }

    /* ----- PAGE 3 : DÉCOUVERTE (BUREAU TOP-DOWN + CENDRIER + CARNET 3D) ----- */
    function renderDecouverte() {
      const shell = document.createElement("div");
      shell.className = "ab-shell";

      const scene = document.createElement("section");
      scene.className = "ab-desk-scene";
      scene.setAttribute("aria-labelledby", "ab-desk-h1");

      const topbar = document.createElement("div");
      topbar.className = "ab-desk-topbar";

      const ashtraySlot = document.createElement("div");
      ashtraySlot.className = "ab-ashtray-slot";
      ashtraySlot.appendChild(createAshtraySvg());

      const deskCaption = document.createElement("div");
      deskCaption.className = "ab-desk-caption";
      const deskH1 = document.createElement("h1");
      deskH1.id = "ab-desk-h1";
      deskH1.tabIndex = -1;
      deskH1.style.fontSize = "1.05rem";
      deskH1.style.fontWeight = "900";
      deskH1.textContent = "Carnet de découverte — Bureau d'édition";
      const deskSub = document.createElement("p");
      deskSub.style.fontSize = "0.8rem";
      deskSub.style.marginBlockStart = "0.15rem";
      deskSub.textContent = "Feuilletage séquentiel par ordre croissant des numéros de fiches.";
      deskCaption.append(deskH1, deskSub);
      ashtraySlot.appendChild(deskCaption);

      const randomBtn = document.createElement("button");
      randomBtn.type = "button";
      randomBtn.className = "ab-btn ab-btn--acid";
      randomBtn.textContent = "🎲 Tirer une fiche au hasard";
      randomBtn.addEventListener("click", () => {
        state.discoveryIndex = drawRandomDiscoveryIndex(true);
        state.discoveryScanIdx = 0;
        state.discoveryTurnDir = "next";
        renderApp();
      });

      topbar.append(ashtraySlot, randomBtn);
      scene.appendChild(topbar);

      const total = state.sortedCorpus.length;
      if (total === 0) {
        const loadingBook = document.createElement("div");
        loadingBook.className = "ab-notebook";
        loadingBook.style.padding = "3rem";
        loadingBook.style.display = "grid";
        loadingBook.style.placeItems = "center";
        const p = document.createElement("p");
        p.style.fontWeight = "800";
        p.textContent = state.loading
          ? "Ouverture du carnet et tirage d'une fiche aléatoire…"
          : "Aucune fiche disponible.";
        loadingBook.appendChild(p);
        scene.appendChild(loadingBook);
        shell.appendChild(scene);
        return shell;
      }

      const idx = Math.max(0, Math.min(state.discoveryIndex, total - 1));
      const fiche = state.sortedCorpus[idx];

      const stage = document.createElement("div");
      stage.className = "ab-notebook-stage";

      const notebook = document.createElement("article");
      notebook.className = "ab-notebook";
      if (state.discoveryTurnDir === "next") {
        notebook.classList.add("is-turning-next");
      } else if (state.discoveryTurnDir === "prev") {
        notebook.classList.add("is-turning-prev");
      }

      // Page de gauche : Scan manuscrit + switch recto/verso + zoom dialog
      const leftPage = document.createElement("div");
      leftPage.className = "ab-notebook-page ab-notebook-page--left";

      const leftHead = document.createElement("div");
      leftHead.style.display = "flex";
      leftHead.style.flexWrap = "wrap";
      leftHead.style.justifyContent = "space-between";
      leftHead.style.alignItems = "center";
      leftHead.style.gap = "0.5rem";

      const leftTag = document.createElement("span");
      leftTag.className = "ab-kicker";
      leftTag.textContent = `FICHE N° ${fiche.numero} · ${idx + 1} / ${total}`;

      const scanTools = document.createElement("div");
      scanTools.className = "ab-scan-tabs";
      if (fiche.scans.length > 1) {
        fiche.scans.forEach((_, sIdx) => {
          const sb = document.createElement("button");
          sb.type = "button";
          sb.className = "ab-seg-btn";
          sb.textContent = sIdx === 0 ? "Recto" : sIdx === 1 ? "Verso" : `Vue ${sIdx + 1}`;
          sb.setAttribute("aria-pressed", sIdx === state.discoveryScanIdx ? "true" : "false");
          sb.addEventListener("click", () => {
            state.discoveryScanIdx = sIdx;
            state.discoveryTurnDir = "";
            renderApp();
          });
          scanTools.appendChild(sb);
        });
      }
      if (fiche.scans.length > 0) {
        const zBtn = document.createElement("button");
        zBtn.type = "button";
        zBtn.className = "ab-btn ab-btn--sm";
        zBtn.textContent = "Agrandir ↗";
        zBtn.addEventListener("click", () => openScanModal(fiche, state.discoveryScanIdx));
        scanTools.appendChild(zBtn);
      }

      leftHead.append(leftTag, scanTools);

      const scanBox = document.createElement("div");
      scanBox.className = "ab-notebook-scan-box";
      const curScan = fiche.scans[state.discoveryScanIdx] || fiche.scans[0] || null;
      if (curScan) {
        const sImg = document.createElement("img");
        sImg.className = "ab-notebook-scan-img";
        sImg.src = curScan.url;
        sImg.alt = `Fac-similé de la fiche BnF n° ${fiche.numero}`;
        scanBox.appendChild(sImg);
      } else {
        const empty = document.createElement("div");
        empty.className = "ab-scan-empty";
        empty.textContent = "[ Scan non disponible ]";
        scanBox.appendChild(empty);
      }

      const leftFoot = document.createElement("div");
      leftFoot.className = "ab-section-label";
      leftFoot.textContent = fiche.cote;

      leftPage.append(leftHead, scanBox, leftFoot);

      // Page de droite : Transcription lignée + titre + date + notes interactives + coin corné
      const rightPage = document.createElement("div");
      rightPage.className = "ab-notebook-page ab-notebook-page--right";

      const rightContent = document.createElement("div");
      const metaRow = document.createElement("div");
      metaRow.style.display = "flex";
      metaRow.style.flexWrap = "wrap";
      metaRow.style.justifyContent = "space-between";
      metaRow.style.gap = "0.5rem";
      metaRow.style.marginBlockEnd = "0.75rem";

      const dBadge = document.createElement("span");
      dBadge.className = "ab-detail-badge";
      dBadge.textContent = fiche.date.display;

      const openSearchBtn = document.createElement("button");
      openSearchBtn.type = "button";
      openSearchBtn.className = "ab-btn ab-btn--sm";
      openSearchBtn.textContent = "Ouvrir dans la Recherche →";
      openSearchBtn.addEventListener("click", () => {
        resetAllFilters();
        state.selectedFicheId = fiche.id;
        navigateTo("recherche");
      });
      metaRow.append(dBadge, openSearchBtn);

      const titleH2 = document.createElement("h2");
      titleH2.className = "ab-detail-title";
      titleH2.textContent = fiche.title;

      const prose = document.createElement("div");
      prose.className = "ab-transcription-prose";
      if (fiche.bodyHtml && fiche.bodyHtml.trim()) {
        prose.innerHTML = fiche.bodyHtml;
        wireFootnoteButtons(prose, fiche);
      } else {
        const em = document.createElement("p");
        em.className = "ab-transcription-empty";
        em.textContent = "Transcription non disponible pour cette fiche.";
        prose.appendChild(em);
      }

      rightContent.append(metaRow, titleH2, prose);

      const rightFoot = document.createElement("div");
      rightFoot.style.display = "flex";
      rightFoot.style.flexWrap = "wrap";
      rightFoot.style.gap = "0.45rem";
      rightFoot.style.paddingInlineEnd = "2.5rem";
      if (fiche.notes.length > 0) {
        const expNotes = document.createElement("button");
        expNotes.type = "button";
        expNotes.className = "ab-btn ab-btn--sm ab-btn--lavender";
        expNotes.textContent = `Agrandir les notes (${fiche.notes.length}) ↗`;
        expNotes.addEventListener("click", () => openNotesModal(fiche));
        rightFoot.appendChild(expNotes);
      }

      const dogear = document.createElement("button");
      dogear.type = "button";
      dogear.className = "ab-dogear";
      dogear.setAttribute("aria-label", "Tourner vers la fiche suivante");
      dogear.title = "Tourner la page (fiche suivante)";
      dogear.addEventListener("click", () => stepDiscovery(1));

      rightPage.append(rightContent, rightFoot, dogear);
      notebook.append(leftPage, rightPage);
      stage.appendChild(notebook);

      // Barre de navigation Précédent / Suivant séquentielle
      const footerBar = document.createElement("div");
      footerBar.className = "ab-notebook-footer";

      const prevBtn = document.createElement("button");
      prevBtn.type = "button";
      prevBtn.className = "ab-btn ab-btn--lavender";
      prevBtn.textContent = "← Fiche précédente";
      prevBtn.addEventListener("click", () => stepDiscovery(-1));

      const orderIndicator = document.createElement("span");
      orderIndicator.className = "ab-kicker";
      orderIndicator.textContent = `ORDRE CROISSANT · FICHE ${fiche.numero} (${idx + 1} / ${total})`;

      const nextBtn = document.createElement("button");
      nextBtn.type = "button";
      nextBtn.className = "ab-btn ab-btn--cyan";
      nextBtn.textContent = "Fiche suivante →";
      nextBtn.addEventListener("click", () => stepDiscovery(1));

      footerBar.append(prevBtn, orderIndicator, nextBtn);

      scene.append(stage, footerBar);
      shell.appendChild(scene);
      return shell;
    }

    function stepDiscovery(delta) {
      const len = state.sortedCorpus.length;
      if (len === 0) return;
      state.discoveryIndex = (state.discoveryIndex + delta + len) % len;
      state.discoveryScanIdx = 0;
      state.discoveryTurnDir = delta >= 0 ? "next" : "prev";
      renderApp();
    }

    /* ----- PAGE 4 : MÉTHODES ----- */
    function renderMethodes() {
      const shell = document.createElement("div");
      shell.className = "ab-shell";

      const intro = document.createElement("section");
      intro.className = "ab-methods-intro";
      intro.setAttribute("aria-labelledby", "ab-methods-h1");

      const kicker = document.createElement("span");
      kicker.className = "ab-kicker";
      kicker.style.alignSelf = "flex-start";
      kicker.textContent = EDITORIAL_CONFIG.methodsIntro.kicker;

      const h1 = document.createElement("h1");
      h1.id = "ab-methods-h1";
      h1.className = "ab-page-title";
      h1.tabIndex = -1;
      h1.textContent = EDITORIAL_CONFIG.methodsIntro.title;

      const lead = document.createElement("p");
      lead.style.maxWidth = "68ch";
      lead.style.color = "var(--ab-ink-muted)";
      lead.textContent = EDITORIAL_CONFIG.methodsIntro.lead;

      intro.append(kicker, h1, lead);

      const grid = document.createElement("div");
      grid.className = "ab-methods-grid";

      EDITORIAL_CONFIG.methodsCards.forEach((card, i) => {
        const art = document.createElement("article");
        art.className = "ab-method-card";

        const bar = document.createElement("div");
        bar.className = `ab-method-card-bar ab-method-card-bar--${i % 4}`;
        const tag = document.createElement("span");
        tag.textContent = card.tag;
        const num = document.createElement("span");
        num.textContent = card.num;
        bar.append(tag, num);

        const body = document.createElement("div");
        body.className = "ab-method-card-body";

        const title = document.createElement("h2");
        title.className = "ab-method-card-title";
        title.textContent = card.title;

        const summary = document.createElement("p");
        summary.className = "ab-method-card-text";
        summary.textContent = card.summary;

        const ul = document.createElement("ul");
        ul.className = "ab-method-points";
        for (const pt of card.points) {
          const li = document.createElement("li");
          const bullet = document.createElement("span");
          bullet.setAttribute("aria-hidden", "true");
          bullet.textContent = "■";
          const span = document.createElement("span");
          span.textContent = pt;
          li.append(bullet, span);
          ul.appendChild(li);
        }

        body.append(title, summary, ul);
        art.append(bar, body);
        grid.appendChild(art);
      });

      shell.append(intro, grid);
      return shell;
    }

    function renderApp() {
      renderHeaderState();
      updateStatusBanner();
      mainEl.replaceChildren();

      if (state.route === "recherche") {
        mainEl.appendChild(renderRecherche());
      } else if (state.route === "decouverte") {
        mainEl.appendChild(renderDecouverte());
      } else if (state.route === "methodes") {
        mainEl.appendChild(renderMethodes());
      } else {
        mainEl.appendChild(renderPresentation());
      }
    }

    // -----------------------------------------------------------------------
    // GESTIONNAIRES GLOBAUX CLAVIER & HASH ROUTING
    // -----------------------------------------------------------------------
    function parseHashRoute() {
      const clean = (window.location.hash || "").replace(/^#/, "").toLowerCase();
      return ROUTES.includes(clean) ? clean : "presentation";
    }

    window.addEventListener("hashchange", () => {
      const nextRoute = parseHashRoute();
      if (nextRoute !== state.route) {
        if (nextRoute === "decouverte" && state.corpusReady) {
          state.discoveryIndex = drawRandomDiscoveryIndex(false);
          state.discoveryScanIdx = 0;
          state.discoveryTurnDir = "";
        }
        state.route = nextRoute;
        renderApp();
      }
    });

    document.addEventListener("keydown", (e) => {
      // Ctrl+K / Cmd+K ouvre la recherche et focus l'input mots-clés
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        navigateTo("recherche", { focusTarget: "ab-search-input" });
        return;
      }

      if (e.key === "Escape" && !noteTooltip.hidden) {
        hideNoteTooltip(true);
        return;
      }

      // Flèches Précédent / Suivant sur la vue Découverte (hors modale / champ de saisie)
      if (state.route === "decouverte" && !zoomDialog.open && !notesDialog.open) {
        const tag = document.activeElement?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
        if (e.key === "ArrowRight") {
          e.preventDefault();
          stepDiscovery(1);
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          stepDiscovery(-1);
        }
      }
    });

    document.addEventListener("click", (e) => {
      if (noteTooltip.hidden) return;
      if (noteTooltip.contains(e.target)) return;
      if (e.target.closest?.(".ab-note-ref")) return;
      hideNoteTooltip(false);
    });

    // -----------------------------------------------------------------------
    // CHARGEMENT COMPLET DU CORPUS EN PARALLÈLE (t:102, t:10, t:12)
    // -----------------------------------------------------------------------
    async function initCorpus() {
      try {
        const [rawFiches, rawPersons, rawPlaces] = await Promise.all([
          fetchHeuristRecords(config, "t:102", 1500),
          fetchHeuristRecords(config, "t:10", 600).catch(() => []),
          fetchHeuristRecords(config, "t:12", 500).catch(() => [])
        ]);

        state.personDir = buildPersonDirectory(rawPersons);
        state.placeDir = buildPlaceDirectory(rawPlaces);

        const normalized = rawFiches.map((r) =>
          normalizeRecord(r, config, state.personDir, state.placeDir)
        );
        normalized.sort(compareFichesAscending);

        const byId = new Map();
        const byNormNumero = new Map();
        const validYears = [];

        for (const f of normalized) {
          byId.set(f.id, f);
          if (f.normNumero && !byNormNumero.has(f.normNumero)) {
            byNormNumero.set(f.normNumero, f);
          }
          if (f.date.yearNum !== null && f.date.yearNum >= 1950 && f.date.yearNum <= 1985) {
            validYears.push(f.date.yearNum);
          }
        }

        // Résolution des renvois croisés entre fiches
        for (const f of normalized) {
          const linked = [];
          const seenTargetIds = new Set();
          for (const tid of f.directLinkedIds) {
            const t = byId.get(tid);
            if (t && t.id !== f.id && !seenTargetIds.has(t.id)) {
              seenTargetIds.add(t.id);
              linked.push({ id: t.id, numero: t.numero, title: t.title });
            }
          }
          for (const refNum of f.referencedNums) {
            const t = byNormNumero.get(refNum);
            if (t && t.id !== f.id && !seenTargetIds.has(t.id)) {
              seenTargetIds.add(t.id);
              linked.push({ id: t.id, numero: t.numero, title: t.title });
            }
          }
          f.relatedFiches = linked;
        }

        if (validYears.length > 0) {
          state.bounds.minYear = Math.min(...validYears);
          state.bounds.maxYear = Math.max(...validYears);
          state.filters.startYear = state.bounds.minYear;
          state.filters.endYear = state.bounds.maxYear;
        }

        state.corpus = normalized;
        state.sortedCorpus = normalized;
        state.byId = byId;
        state.byNormNumero = byNormNumero;
        state.loading = false;
        state.corpusReady = true;

        applyFilters();

        if (state.route === "decouverte" && normalized.length > 0) {
          state.discoveryIndex = drawRandomDiscoveryIndex(false);
        }
        renderApp();
      } catch (err) {
        state.loading = false;
        state.loadError = err?.message || "Connexion impossible à l'API Heurist.";
        renderApp();
      }
    }

    // Premier rendu immédiat sur la route demandée (#presentation par défaut)
    state.route = parseHashRoute();
    renderApp();
    initCorpus();
  }

  /* =========================================================================
     BOOTSTRAP TOLÉRANT L'INJECTION DYNAMIQUE DANS HEURIST CMS
     ========================================================================= */
  function bootstrap() {
    const existing = document.getElementById(ROOT_ID);
    if (existing) {
      mountApp(existing);
      return;
    }

    const startedAt = Date.now();
    const timer = setInterval(() => {
      const root = document.getElementById(ROOT_ID);
      if (root) {
        clearInterval(timer);
        mountApp(root);
      } else if (Date.now() - startedAt > MOUNT_TIMEOUT_MS) {
        clearInterval(timer);
      }
    }, MOUNT_POLL_INTERVAL_MS);
  }

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", bootstrap, { once: true });
    } else {
      bootstrap();
    }
  }
})();

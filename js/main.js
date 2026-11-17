/* =========================================================
   TI PIRAKUA: leitor de livro (flipbook) + interações da página
   Cada página do PDF traz duas páginas A4 em pé (página dupla).
   Elas foram separadas em imagens e o livro é montado com StPageFlip:
   duas páginas abertas, virando uma página por vez.
   ========================================================= */
(() => {
  "use strict";

  const TOTAL = 74;

  /* Sumário: [número, título, página impressa no livro] */
  const EDITIONS = {
    pt: {
      name: "Português",
      dir: "assets/pages/pt/",
      pdf: "assets/pdf/PIRAKUA_portugues_ebook.pdf",
      kicker: "Plano de Gestão Territorial e Ambiental - PGTA",
      titleTop: "TI",
      date: "Julho de 2026",
      tocTitle: "Sumário",
      toc: [
        ["1", "Introdução", 8],
        ["2", "O Projeto de Gestão Territorial e Ambiental - PGTA", 12],
        ["3", "Agentes Socioambientais", 20],
        ["4", "O Povo Guarani Kaiowa", 24],
        ["5", "Terra Indígena Pirakua", 28],
        ["6", "Etnomapeamento participativo da TI Pirakua", 40],
        ["7", "Regiões da TI Pirakua", 46],
        ["7.1", "Morro", 49],
        ["7.2", "Salto Ka’i / Cachoeira do Macaco (Morro)", 52],
        ["7.3", "Cascavel", 56],
        ["7.4", "Piri", 60],
        ["7.5", "Centro/Jaguary/Ponte", 66],
        ["7.6", "Palmeiras", 72],
        ["8", "Casas", 78],
        ["9", "Recursos Naturais", 82],
        ["10", "Recursos Hídricos", 84],
        ["11", "Construção participativa do PGTA e definição dos eixos temáticos", 90],
        ["12", "Reuniões de consulta e debate dos eixos temáticos – PGTA / Pirakua", 92],
        ["13", "Agricultura e autonomia alimentar", 98],
        ["14", "Reflorestamento e recuperação ambiental", 104],
        ["15", "Cultura tradicional", 108],
        ["16", "Território", 112],
        ["17", "Infraestrutura e qualidade de vida", 118],
        ["18", "Saúde e medicina tradicional", 122],
        ["19", "Segurança das mulheres e fortalecimento da participação feminina", 126],
        ["20", "Propostas de Intervenção - PGTA da Terra Indígena Pirakua", 130],
        ["21", "Referências", 138]
      ]
    },
    gn: {
      name: "Guarani",
      dir: "assets/pages/gn/",
      pdf: "assets/pdf/PIRAKUA_guarani_ebook.pdf",
      kicker: "Jejapoarã Rehegua Tekoha Ñeñangarekorã - PGTA",
      titleTop: "TEKOHA",
      date: "Jasypokõi 2026",
      tocTitle: "Techaukaha",
      toc: [
        ["1", "Ñepyrũmby", 8],
        ["2", "Jejapoarã rehegua tekoha ñeñangarekorã - PGTA", 12],
        ["3", "Tekoha ñeñangarekohára", 20],
        ["4", "Guarani kaiowa retã", 24],
        ["5", "Tekoha Pirakua", 28],
        ["6", "Jehecha oñondive mba’e mba’épa oĩ tekoha Pirakuápe", 40],
        ["7", "Yvy te’ýi Pirakua Rekoha renda Kuéry", 46],
        ["7.1", "Morro", 49],
        ["7.2", "Salto Ka’i / (Morrope)", 52],
        ["7.3", "Cascavel", 56],
        ["7.4", "Piri", 60],
        ["7.5", "Centro/Jaguary/Ponte", 66],
        ["7.6", "Palmeiras", 72],
        ["8", "Óy kuéry", 78],
        ["9", "Tembiporupy Tekoha Mba’éva", 82],
        ["10", "Y jeporu kuéra", 84],
        ["11", "Jejapo oñondivepa PGTA ha oñemboheko umi oñeñe’ẽva’erã rehegua", 90],
        ["12", "Ñembyaty jeporavo ha ñembohovai ñemongueta va’erãre Pirakuápe", 92],
        ["13", "Kokue ha je’upyrã ijeheguikuaáva", 98],
        ["14", "Ñambohoky ha ñamoĩporãjevy ñande jererégua", 104],
        ["15", "Teko tee avamba’ekuaa", 108],
        ["16", "Tekoha tuichakue", 112],
        ["17", "Tekoporãrã ha infraestrutura rehegua", 118],
        ["18", "Tesãi ha mba’ekuaa pohãno rupi", 122],
        ["19", "Kuñangue kyhyje’ỹ ha ñemõmbarete atyhárupi jeho", 126],
        ["20", "Jehesamondo - porã PGTA tekoha Pirakua", 130],
        ["21", "Ykekoha kuatiahaipyréra", 138]
      ]
    }
  };

  /* página impressa no livro → índice da página no leitor (0-based).
     Ex.: a pág. impressa 8 é a 10ª página (capa = índice 0). */
  const printedToIndex = (p) => p + 1;

  /* ---------- armazenamento seguro ---------- */
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* ignore */ } }
  };

  /* ---------- elementos ---------- */
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  const book = $("#book");
  const prevBtn = $("#prevBtn");
  const nextBtn = $("#nextBtn");
  const range = $("#pageRange");
  const label = $("#pageLabel");
  const thumbsEl = $("#thumbs");
  const thumbsBtn = $("#thumbsBtn");
  const reader = $("#leitor");

  /* Cada página do livro é um A4 deitado (842 × 595).
     No PDF: pág. 1 = capa, págs. 2–73 = pares de páginas lado a lado,
     pág. 74 = contracapa. Foram separadas em p001.jpg … p146.jpg. */
  const PAGES = 1 + (TOTAL - 2) * 2 + 1; // 146

  /* ---------- estado ---------- */
  let lang = store.get("pirakua:lang") === "gn" ? "gn" : "pt";
  let page = 0;          // índice da página (0-based) mostrada pelo livro
  let flip = null;       // instância do StPageFlip

  const pageSrc = (i, l = lang) => `${EDITIONS[l].dir}p${String(i + 1).padStart(3, "0")}.jpg`;
  const spreadSrc = (n, l = lang) => `${EDITIONS[l].dir}${String(n).padStart(3, "0")}.jpg`;
  const thumbSrc = (n, l = lang) => `${EDITIONS[l].dir}t${String(n).padStart(3, "0")}.jpg`;
  const LAST = PAGES - 1;
  // página do leitor → página do PDF (1 = capa, 2–73 = pares, 74 = contracapa)
  const spreadOf = (i) => (i === 0 ? 1 : i === LAST ? TOTAL : Math.floor((i + 1) / 2) + 1);
  // página do PDF → primeira página do leitor que ela contém
  const firstPageOf = (n) => (n <= 1 ? 0 : n >= TOTAL ? LAST : 2 * n - 3);
  // par visível com o livro aberto: capa e contracapa aparecem sozinhas
  const pairOf = (i) => {
    if (i === 0 || i === LAST) return [i, i];
    const first = i % 2 ? i : i - 1;
    return [first, Math.min(first + 1, LAST - 1)];
  };

  /* ---------- pré-carregamento das páginas vizinhas ---------- */
  const cache = new Set();
  function preloadAround(i) {
    for (let k = i - 2; k <= i + 5; k++) {
      if (k < 0 || k >= PAGES) continue;
      const url = pageSrc(k);
      if (cache.has(url)) continue;
      cache.add(url);
      const img = new Image();
      img.src = url;
    }
  }

  /* ---------- livro (StPageFlip) ---------- */
  function buildBook(startPage) {
    if (flip) { flip.destroy(); flip = null; }
    const host = document.createElement("div");
    host.className = "flip";
    for (let i = 0; i < PAGES; i++) {
      const pg = document.createElement("div");
      // capa à direita; depois ímpares à esquerda e pares à direita
      const side = i === 0 ? "right" : i % 2 ? "left" : "right";
      pg.className = `page page--${side}` + (i === 0 || i === LAST ? " page--cover" : "");
      pg.innerHTML = `<img src="${pageSrc(i)}" alt="Página ${i + 1}" loading="lazy" draggable="false">`;
      host.appendChild(pg);
    }
    book.appendChild(host);

    flip = new St.PageFlip(host, {
      width: 842,        // A4 deitado
      height: 595,
      size: "stretch",
      minWidth: 300,     // abaixo de 600px de largura: uma página por vez
      maxWidth: 2000,
      minHeight: 212,
      maxHeight: 1414,
      showCover: true,   // capa e contracapa sozinhas, como um livro fechado
      usePortrait: true,
      autoSize: true,
      drawShadow: true,
      maxShadowOpacity: 0.45,
      flippingTime: 850,
      mobileScrollSupport: false,
      startPage: startPage
    });
    flip.on("flip", (e) => { page = e.data; updateUI(); });
    flip.on("changeOrientation", () => updateUI());
    // ao começar a abrir/fechar, o livro desliza de volta para o centro
    flip.on("changeState", (e) => {
      if (e.data === "flipping" || e.data === "user_fold") book.classList.remove("is-front", "is-back");
    });
    flip.on("init", (e) => { page = e.data.page; updateUI(); });
    flip.loadFromHTML(host.querySelectorAll(".page"));
    page = flip.getCurrentPageIndex();
    updateUI();
  }

  const isPortrait = () => flip && flip.getOrientation() === "portrait";

  function updateUI() {
    if (!flip) return;
    // livro fechado: centraliza a capa / contracapa em vez de deixar meio livro vazio
    const open = isPortrait();
    book.classList.toggle("is-front", !open && page === 0);
    book.classList.toggle("is-back", !open && page === LAST);
    // com o livro aberto mostramos o par esquerda/direita; no celular, uma página
    const [first, last] = isPortrait() ? [page, page] : pairOf(page);
    label.textContent = first === last ? `${first + 1} / ${PAGES}` : `${first + 1}–${last + 1} / ${PAGES}`;
    range.value = first + 1;
    range.style.setProperty("--fill", `${(first / (PAGES - 1)) * 100}%`);
    prevBtn.disabled = first <= 0;
    nextBtn.disabled = last >= PAGES - 1;

    const sp = spreadOf(first);
    $$(".thumb", thumbsEl).forEach((t) => t.classList.toggle("is-current", +t.dataset.spread === sp));
    const active = $(".thumb.is-current", thumbsEl);
    if (active && !thumbsEl.hidden) {
      thumbsEl.scrollTo({ left: active.offsetLeft - thumbsEl.clientWidth / 2 + active.clientWidth / 2, behavior: "smooth" });
    }
    store.set(`pirakua:page:${lang}`, String(first));
    preloadAround(first);
  }

  function goToPage(i) {
    if (!flip) return;
    i = Math.max(0, Math.min(PAGES - 1, i | 0));
    const visible = isPortrait() ? [page, page] : pairOf(page);
    if (i >= visible[0] && i <= visible[1]) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      flip.turnToPage(i);
      page = i;
      updateUI();
    } else {
      flip.flip(i);
    }
  }
  const next = () => flip && flip.flipNext();
  const prev = () => flip && flip.flipPrev();

  /* ---------- miniaturas (uma por página dupla do PDF) ---------- */
  function buildThumbs() {
    thumbsEl.innerHTML = "";
    const frag = document.createDocumentFragment();
    for (let n = 1; n <= TOTAL; n++) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "thumb";
      b.dataset.spread = n;
      const a = firstPageOf(n) + 1;
      const txt = n === 1 ? "Capa" : n === TOTAL ? "Contracapa" : `${a}–${a + 1}`;
      const single = n === 1 || n === TOTAL; // capa/contracapa: uma página; o resto: par
      b.innerHTML = `<img src="${thumbSrc(n)}" width="320" height="${single ? 226 : 113}" alt="" loading="lazy"><span>${txt}</span>`;
      b.setAttribute("aria-label", n === 1 || n === TOTAL ? `Ir para a ${txt.toLowerCase()}` : `Ir para as páginas ${txt}`);
      frag.appendChild(b);
    }
    thumbsEl.appendChild(frag);
  }
  thumbsEl.addEventListener("click", (e) => {
    const t = e.target.closest(".thumb");
    if (t) goToPage(firstPageOf(+t.dataset.spread));
  });
  thumbsBtn.addEventListener("click", () => {
    const show = thumbsEl.hidden;
    if (show && !thumbsEl.children.length) buildThumbs();
    thumbsEl.hidden = !show;
    thumbsBtn.setAttribute("aria-pressed", String(show));
    updateUI();
  });

  /* ---------- sumário ---------- */
  function buildToc() {
    const ed = EDITIONS[lang];
    $("#tocTitle").textContent = ed.tocTitle;
    const list = $("#tocList");
    list.innerHTML = "";
    ed.toc.forEach(([num, name, printed]) => {
      const li = document.createElement("li");
      li.className = "toc__item" + (num.includes(".") ? " toc__item--sub" : "");
      li.innerHTML = `
        <button type="button" data-index="${printedToIndex(printed)}">
          <span class="toc__num">${num}</span>
          <span class="toc__name"></span>
          <span class="toc__page">p. ${printed}</span>
        </button>`;
      li.querySelector(".toc__name").textContent = name;
      list.appendChild(li);
    });
  }
  $("#tocList").addEventListener("click", (e) => {
    const b = e.target.closest("button[data-index]");
    if (!b) return;
    $("#bookWrap").scrollIntoView({ behavior: "smooth" });
    setTimeout(() => goToPage(+b.dataset.index), 450);
  });

  /* ---------- idioma / edição ---------- */
  function setLang(l) {
    if (flip && l === lang) return;
    lang = l;
    store.set("pirakua:lang", l);
    const ed = EDITIONS[l];
    document.documentElement.lang = l === "gn" ? "gn" : "pt-BR";

    $$(".lang__btn").forEach((b) => b.classList.toggle("is-active", b.dataset.lang === l));
    $$(".js-download").forEach((a) => a.setAttribute("href", ed.pdf));
    $$("[data-i18n]").forEach((el) => { el.textContent = ed[el.dataset.i18n]; });
    $("#editionName").textContent = ed.name;

    buildToc();
    if (thumbsEl.children.length) buildThumbs();

    const saved = parseInt(store.get(`pirakua:page:${l}`), 10);
    buildBook(saved >= 0 && saved < PAGES ? saved : 0);
  }
  $$(".lang__btn").forEach((b) => b.addEventListener("click", () => setLang(b.dataset.lang)));
  $$(".js-read").forEach((b) => b.addEventListener("click", () => {
    setLang(b.dataset.lang);
    $("#bookWrap").scrollIntoView({ behavior: "smooth" });
  }));

  /* ---------- controles ---------- */
  prevBtn.addEventListener("click", prev);
  nextBtn.addEventListener("click", next);
  $("#firstBtn").addEventListener("click", () => goToPage(0));
  $("#lastBtn").addEventListener("click", () => goToPage(PAGES - 1));

  range.max = PAGES;
  range.addEventListener("input", () => {
    label.textContent = `${range.value} / ${PAGES}`;
    range.style.setProperty("--fill", `${((range.value - 1) / (PAGES - 1)) * 100}%`);
  });
  range.addEventListener("change", () => goToPage(+range.value - 1));

  // teclado (quando o leitor estiver visível ou o livro focado)
  let readerVisible = false;
  new IntersectionObserver(([e]) => { readerVisible = e.isIntersecting; }, { threshold: 0.35 }).observe(book);
  document.addEventListener("keydown", (e) => {
    if (!$("#lightbox").hidden) {
      if (e.key === "Escape") closeZoom();
      return;
    }
    if (!readerVisible && document.activeElement !== book) return;
    if (e.target.matches("input, textarea")) return;
    if (e.key === "ArrowRight" || e.key === "PageDown") { e.preventDefault(); next(); }
    if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); prev(); }
    if (e.key === "Home") { e.preventDefault(); goToPage(0); }
    if (e.key === "End") { e.preventDefault(); goToPage(PAGES - 1); }
  });

  /* ---------- tela cheia ---------- */
  const fsBtn = $("#fsBtn");
  if (!document.fullscreenEnabled) fsBtn.hidden = true;
  fsBtn.addEventListener("click", () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else reader.requestFullscreen().catch(() => {});
  });

  /* ---------- zoom ---------- */
  const lightbox = $("#lightbox");
  const lbImg = $("#lightboxImg");
  const lbScroll = $("#lightboxScroll");
  function openZoom() {
    // amplia o que está aberto: uma página (celular) ou o par de páginas
    const [a, b] = isPortrait() ? [page, page] : pairOf(page);
    lbImg.src = a === b ? pageSrc(a) : spreadSrc(spreadOf(a));
    const txt = a === b ? `pág. ${a + 1}` : `págs. ${a + 1}–${b + 1}`;
    lbImg.alt = txt;
    $("#lightboxLabel").textContent = `${EDITIONS[lang].name} · ${txt} / ${PAGES}`;
    lbScroll.classList.remove("is-big");
    lightbox.hidden = false;
    document.body.style.overflow = "hidden";
    $("#lightboxClose").focus();
  }
  function closeZoom() {
    lightbox.hidden = true;
    document.body.style.overflow = "";
    $("#zoomBtn").focus();
  }
  $("#zoomBtn").addEventListener("click", openZoom);
  $("#lightboxClose").addEventListener("click", closeZoom);
  lbImg.addEventListener("click", (e) => {
    const big = !lbScroll.classList.contains("is-big");
    const rect = lbImg.getBoundingClientRect();
    const rx = (e.clientX - rect.left) / rect.width;
    const ry = (e.clientY - rect.top) / rect.height;
    lbScroll.classList.toggle("is-big", big);
    if (big) {
      lbScroll.scrollLeft = rx * lbImg.clientWidth - lbScroll.clientWidth / 2;
      lbScroll.scrollTop = ry * lbImg.clientHeight - lbScroll.clientHeight / 2;
    }
  });

  /* ---------- cabeçalho e menu ---------- */
  const topbar = $(".topbar");
  const onScroll = () => topbar.classList.toggle("is-solid", window.scrollY > 40);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  const menuToggle = $("#menuToggle");
  const nav = $("#nav");
  menuToggle.addEventListener("click", () => {
    const open = !nav.classList.contains("is-open");
    nav.classList.toggle("is-open", open);
    menuToggle.setAttribute("aria-expanded", String(open));
    topbar.classList.add("is-solid");
  });
  nav.addEventListener("click", (e) => {
    if (e.target.closest("a")) {
      nav.classList.remove("is-open");
      menuToggle.setAttribute("aria-expanded", "false");
    }
  });

  /* ---------- revelar ao rolar ---------- */
  const revealEls = $$(".about__text, .about__photo, .toc__inner, .dl-card, .reader__head");
  revealEls.forEach((el) => el.classList.add("reveal"));
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("is-visible"); io.unobserve(e.target); }
    });
  }, { threshold: 0.12 });
  revealEls.forEach((el) => io.observe(el));

  /* ---------- início ---------- */
  setLang(lang);
})();

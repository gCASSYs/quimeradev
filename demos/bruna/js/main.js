/*
 * Interações do site — JavaScript puro, sem dependências.
 * Privacidade: nenhuma resposta do formulário é enviada a servidores deste site,
 * armazenada (localStorage/cookies), registrada em logs ou analytics.
 */
(function () {
  "use strict";

  var cfg = window.SITE_CONFIG || {};
  var WA = /^55\d{10,11}$/.test(cfg.whatsapp || "") ? cfg.whatsapp : "";
  var IG = /^[a-zA-Z0-9._]{1,30}$/.test(cfg.instagram || "") ? cfg.instagram : "";
  var GREETING = "Olá, Bruna! Vi seu site e gostaria de conversar sobre o acompanhamento nutricional.";

  function waLink(message) {
    return "https://wa.me/" + WA + "?text=" + encodeURIComponent(message);
  }
  function $all(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  /* ─── Configuração: mostra apenas o que estiver preenchido ───────────── */
  $all("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });

  if (WA) {
    $all("[data-wa-link]").forEach(function (a) {
      a.href = waLink(GREETING);
      a.hidden = false;
    });
    $all("[data-wa-item]").forEach(function (el) { el.hidden = false; });
    $all("[data-wa-fallback]").forEach(function (el) { el.remove(); });
  }

  if (IG) {
    $all("[data-instagram-link]").forEach(function (a) {
      a.href = "https://instagram.com/" + IG;
      a.hidden = false;
    });
    $all("[data-instagram-handle]").forEach(function (el) { el.textContent = "@" + IG; });
    $all("[data-instagram-item]").forEach(function (el) { el.hidden = false; });
  }

  // Link de avaliações: só aceita endereços do Google Maps.
  var REVIEWS = /^https:\/\/(www\.)?google\.[a-z.]+\/maps\/|^https:\/\/maps\.app\.goo\.gl\//.test(cfg.googleReviewsUrl || "") ? cfg.googleReviewsUrl : "";
  if (REVIEWS) {
    $all("[data-reviews-link]").forEach(function (a) { a.href = REVIEWS; });
    $all("[data-reviews]").forEach(function (el) { el.hidden = false; });
  }

  /* ─── Cabeçalho: fundo ao rolar + menu móvel ─────────────────────────── */
  var header = document.getElementById("header");
  var menuBtn = document.getElementById("menu-btn");
  var menu = document.getElementById("menu-mobile");

  function onScroll() {
    header.classList.toggle("is-scrolled", window.scrollY > 40 || !menu.hidden);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  function setMenu(open) {
    menu.hidden = !open;
    menuBtn.setAttribute("aria-expanded", String(open));
    menuBtn.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
    onScroll();
  }
  menuBtn.addEventListener("click", function () { setMenu(menu.hidden); });
  $all("a, button", menu).forEach(function (el) {
    el.addEventListener("click", function () { setMenu(false); });
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !menu.hidden) { setMenu(false); menuBtn.focus(); }
  });
  window.addEventListener("resize", function () { if (window.innerWidth > 860) setMenu(false); });

  /* ─── Revelação ao rolar (um único IntersectionObserver) ─────────────── */
  var revealEls = $all("[data-reveal]");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("is-visible"); io.unobserve(e.target); }
      });
    }, { threshold: 0.1, rootMargin: "0px 0px -40px 0px" });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* ─── Formulário (montado a partir do <template>) ───────────────────── */
  var formCount = 0;

  function buildMessage(nome, modalidade, details) {
    var name = nome.trim().replace(/\s+/g, " ").slice(0, 60);
    var first = "Olá, Bruna! " + (name ? "Meu nome é " + name + ". " : "") +
      "Vi seu site e gostaria de agendar uma consulta" + (modalidade ? " " + modalidade : "") + ".";
    var lines = [first];
    if (details) {
      if (details.objetivo) lines.push("Objetivo: " + details.objetivo);
      if (details.atividade) lines.push("Pratico atividade física: " + details.atividade);
      if (details.dificuldade) lines.push("Maior dificuldade: " + details.dificuldade);
    }
    return lines.join("\n");
  }

  function mountForm(host, defaultModality, autofocus) {
    host.innerHTML = "";
    if (!WA) {
      host.appendChild(document.getElementById("contact-unavailable-tpl").content.cloneNode(true));
      return;
    }
    var frag = document.getElementById("contact-form-tpl").content.cloneNode(true);
    var form = frag.querySelector("form");
    var p = "f" + ++formCount + "-";

    // IDs únicos (o formulário existe na página e no modal ao mesmo tempo).
    $all("[data-id]", form).forEach(function (el) { el.id = p + el.getAttribute("data-id"); });
    $all("[data-for]", form).forEach(function (el) { el.htmlFor = p + el.getAttribute("data-for"); });
    $all("[data-name]", form).forEach(function (el) { el.name = p + el.getAttribute("data-name"); });

    var get = function (id) { return form.querySelector("#" + p + id); };
    var nome = get("nome"), erro = get("erro"), detalhar = get("detalhar"), extra = get("extra");
    var preview = get("preview"), fallback = get("fallback"), fallbackLink = get("fallback-link");
    detalhar.setAttribute("aria-controls", extra.id);
    get("direto").href = waLink(GREETING);

    $all('input[type="radio"]', form).forEach(function (r) { r.checked = r.value === (defaultModality || ""); });

    function current() {
      var mod = (form.querySelector('input[type="radio"]:checked') || {}).value || "";
      var details = detalhar.checked
        ? { objetivo: get("objetivo").value, atividade: get("atividade").value, dificuldade: get("dificuldade").value }
        : null;
      return buildMessage(nome.value, mod, details);
    }
    function update() {
      extra.hidden = !detalhar.checked;
      preview.textContent = current();
    }
    form.addEventListener("input", update);
    form.addEventListener("change", update);

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!nome.value.trim()) {
        erro.textContent = "Informe como prefere ser chamada(o).";
        erro.hidden = false;
        nome.setAttribute("aria-invalid", "true");
        nome.setAttribute("aria-describedby", erro.id);
        nome.focus();
        return;
      }
      erro.hidden = true;
      nome.removeAttribute("aria-invalid");
      nome.removeAttribute("aria-describedby");
      var url = waLink(current());
      fallbackLink.href = url;
      fallback.hidden = false;
      window.open(url, "_blank", "noopener,noreferrer");
    });

    update();
    host.appendChild(frag);
    if (autofocus) nome.focus();
  }

  $all("[data-contact-form]:not([data-modal])").forEach(function (host) { mountForm(host, "", false); });

  /* ─── Modal de agendamento (<dialog> nativo) ─────────────────────────── */
  var dialog = document.getElementById("booking");
  var modalHost = dialog.querySelector("[data-contact-form]");
  var opener = null;
  var waFloat = document.getElementById("wa-float");

  function openBooking(modality, trigger) {
    opener = trigger || document.activeElement;
    mountForm(modalHost, modality, true); // formulário sempre limpo
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
    document.documentElement.classList.add("modal-open");
    if (!dialog.contains(document.activeElement)) dialog.querySelector("[data-close-booking]").focus();
  }
  function closeBooking() {
    if (typeof dialog.close === "function") dialog.close();
    else { dialog.removeAttribute("open"); onClose(); }
  }
  function onClose() {
    document.documentElement.classList.remove("modal-open");
    modalHost.innerHTML = ""; // descarta o que foi digitado
    if (opener && opener.focus) opener.focus(); // devolve o foco
  }

  $all("[data-open-booking]").forEach(function (btn) {
    btn.addEventListener("click", function () { openBooking(btn.getAttribute("data-open-booking") || "", btn); });
  });
  dialog.querySelector("[data-close-booking]").addEventListener("click", closeBooking);
  dialog.addEventListener("close", onClose);
  dialog.addEventListener("click", function (e) { if (e.target === dialog) closeBooking(); }); // clique no fundo

  /* ─── Botão flutuante do WhatsApp ────────────────────────────────────── */
  if (WA && waFloat) {
    var footer = document.querySelector("footer");
    var updateFloat = function () {
      var nearFooter = footer.getBoundingClientRect().top < window.innerHeight - 40;
      var show = window.scrollY > 300 && !nearFooter && !dialog.open;
      waFloat.classList.toggle("is-visible", show);
      waFloat.tabIndex = show ? 0 : -1;
      waFloat.setAttribute("aria-hidden", String(!show));
    };
    window.addEventListener("scroll", updateFloat, { passive: true });
    window.addEventListener("resize", updateFloat);
    dialog.addEventListener("close", updateFloat);
    updateFloat();
  }
})();

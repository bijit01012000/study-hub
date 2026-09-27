/* ===========================================================================
   Study Hub — site behaviour
   Themes · sidebar · global search · bookmarks · active section · copy link
   =========================================================================== */
(function () {
  "use strict";
  var LS_THEME = "sh:theme", LS_STARS = "sh:stars";
  var THEMES = ["light", "dark", "nord", "dracula", "solarized-light", "solarized-dark", "paper"];

  function store(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function loadJSON(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  var SITE = window.SITE || { docs: {}, subjects: [] };

  /* ---------------- theme ---------------- */
  function currentTheme() { var t = document.documentElement.getAttribute("data-theme"); return THEMES.indexOf(t) !== -1 ? t : "light"; }
  function applyTheme(t) {
    if (THEMES.indexOf(t) === -1) t = "light";
    document.documentElement.setAttribute("data-theme", t);
    store(LS_THEME, t);
    var sel = document.getElementById("theme-select"); if (sel) sel.value = t;
  }
  var themeSel = document.getElementById("theme-select");
  applyTheme(currentTheme());
  if (themeSel) themeSel.addEventListener("change", function () { applyTheme(themeSel.value); });

  /* ---------------- mobile sidebar ---------------- */
  var burger = document.getElementById("hamburger");
  var scrim = document.querySelector(".scrim");
  if (burger) burger.addEventListener("click", function () { document.body.classList.toggle("nav-open"); });
  if (scrim) scrim.addEventListener("click", function () { document.body.classList.remove("nav-open"); });
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest(".sidebar a");
    if (a && window.matchMedia("(max-width: 1000px)").matches) document.body.classList.remove("nav-open");
  });

  /* ---------------- bookmarks ---------------- */
  var stars = loadJSON(LS_STARS, []);
  function isStarred(s) { return stars.indexOf(s) !== -1; }
  function saveStars() { store(LS_STARS, JSON.stringify(stars)); renderBookmarks(); }
  function renderBookmarks() {
    var block = document.getElementById("bookmarks"), list = document.getElementById("bookmarks-list");
    if (!block || !list) return;
    list.innerHTML = "";
    if (!stars.length) { block.style.display = "none"; return; }
    block.style.display = "";
    stars.forEach(function (slug) {
      var d = SITE.docs[slug]; if (!d) return;
      var li = document.createElement("li");
      li.className = "side-link-row";
      var a = document.createElement("a");
      a.href = d.url; a.textContent = d.title; a.title = d.subjectName + " \u203a " + d.title;
      var b = document.createElement("button");
      b.className = "star on"; b.textContent = "\u2605"; b.title = "Remove bookmark";
      b.addEventListener("click", function (e) { e.preventDefault(); stars = stars.filter(function (x) { return x !== slug; }); saveStars(); syncStars(); });
      li.appendChild(a); li.appendChild(b); list.appendChild(li);
    });
  }
  function syncStars() {
    document.querySelectorAll(".star[data-doc]").forEach(function (btn) {
      var slug = btn.getAttribute("data-doc"), on = isStarred(slug), label = btn.getAttribute("data-label");
      btn.classList.toggle("on", on);
      btn.textContent = label ? ((on ? "\u2605 " : "\u2606 ") + label) : (on ? "\u2605" : "\u2606");
      btn.title = on ? "Remove bookmark" : "Bookmark";
    });
  }
  document.querySelectorAll(".star[data-doc]").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.preventDefault(); e.stopPropagation();
      var slug = btn.getAttribute("data-doc");
      if (isStarred(slug)) stars = stars.filter(function (x) { return x !== slug; }); else stars.push(slug);
      saveStars(); syncStars();
    });
  });

  /* ---------------- search ---------------- */
  var sideResults = document.getElementById("search-results");
  var heroInput = document.getElementById("hero-search");
  var heroResults = document.getElementById("hero-results");
  if (heroInput && !heroResults) {
    heroResults = document.createElement("div");
    heroResults.id = "hero-results";
    heroResults.className = "hero-results";
    heroInput.parentNode.appendChild(heroResults);
  }
  function hideSide() {
    document.querySelectorAll("#sidebar .side-block").forEach(function (b) { if (b.id !== "search-results") b.style.display = ""; });
  }
  function runSearch(term, box) {
    term = (term || "").trim().toLowerCase();
    if (term.length < 2) {
      if (box) { box.classList.remove("show"); box.innerHTML = ""; }
      if (box === heroResults) hideSide();
      else hideSide();
      return;
    }
    var hits = (window.SEARCH_INDEX || []).filter(function (r) { return r.text.toLowerCase().indexOf(term) !== -1; }).slice(0, 60);
    var html = !hits.length
      ? '<div class="sr-empty">No matches for "' + esc(term) + '"</div>'
      : hits.map(function (r) {
          var label = '<span class="sr-lect">' + esc(r.subject) + " \u203a " + esc(r.doc) + (r.section ? " \u203a" : "") + "</span> ";
          return '<a class="sr-item" href="' + esc(r.url) + '">' + label + esc(r.section || r.doc) + "</a>";
        }).join("");
    if (box) { box.classList.add("show"); box.innerHTML = html; }
    if (box === sideResults) document.querySelectorAll("#sidebar .side-block").forEach(function (b) { if (b.id !== "search-results") b.style.display = ""; });
  }
  var sideInput = document.getElementById("q");
  if (sideInput && sideResults) sideInput.addEventListener("input", function () { runSearch(sideInput.value, sideResults); });
  if (heroInput && heroResults) heroInput.addEventListener("input", function () { runSearch(heroInput.value, heroResults); });
  document.addEventListener("keydown", function (e) {
    if (e.key === "/" && !e.target.matches("input,textarea")) {
      e.preventDefault();
      (sideInput || heroInput || {}).focus && (sideInput || heroInput).focus();
    }
  });

  /* ---------------- active section ---------------- */
  var sectionLinks = document.querySelectorAll(".sections a");
  if (sectionLinks.length) {
    var map = {};
    sectionLinks.forEach(function (a) { var id = a.getAttribute("href").split("#")[1]; if (id) map[id] = a; });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting && map[en.target.id]) {
          sectionLinks.forEach(function (a) { a.classList.remove("active"); });
          map[en.target.id].classList.add("active");
        }
      });
    }, { rootMargin: "-70px 0px -75% 0px", threshold: 0 });
    document.querySelectorAll(".article h2[id]").forEach(function (h) { io.observe(h); });
  }

  /* ---------------- heading anchors + copy link ---------------- */
  document.querySelectorAll(".article h2[id], .article h3[id]").forEach(function (h) {
    var b = document.createElement("button");
    b.className = "anchor-btn"; b.textContent = "#"; b.title = "Copy link to this section";
    b.addEventListener("click", function () {
      var url = location.href.split("#")[0] + "#" + h.id;
      copy(url, b);
    });
    h.appendChild(b);
  });
  var copyBtn = document.getElementById("copy-link");
  if (copyBtn) copyBtn.addEventListener("click", function () { copy(location.href.split("#")[0], copyBtn); });
  function copy(text, el) {
    var done = function () { var o = el.textContent; el.textContent = "copied"; setTimeout(function () { el.textContent = o; }, 1100); };
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, done); else done();
  }

  renderBookmarks();
  syncStars();
})();

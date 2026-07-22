document.documentElement.classList.add("js");
history.scrollRestoration = "manual";

const tabs = [...document.querySelectorAll("[data-tab-link]")];
const panels = [...document.querySelectorAll("[data-panel]")];
const tabNames = panels.map((panel) => panel.dataset.panel);
const translations = {
  ko: {
    "meta.description": "TaeeunKil의 개발, 배움, 생각을 기록하는 개인 웹사이트입니다.",
    skip: "본문으로 건너뛰기",
    logoLabel: "홈으로 이동",
    navLabel: "주요 메뉴",
    languageLabel: "언어 선택",
    "nav.home": "홈",
    "nav.writing": "글",
    "nav.about": "소개",
    "home.meta": "개인 웹사이트",
    "home.place": "대전 · 2026",
    "home.intro": "개발하며 배우고, 오래 남기고 싶은 것을 씁니다.",
    "writing.title": "글",
    "writing.emptyTitle": "첫 글을 준비하고 있습니다.",
    "writing.emptyBody": "완성된 생각보다 배우는 과정을 남기겠습니다.",
    "about.title": "소개",
    "about.mapLabel": "TaeeunKil을 소개하는 마인드맵",
    "about.who": "나는 누구인가",
    "about.education": "01 / 교육",
    "about.ssafy": "SSAFY 13기",
    "about.base": "02 / 기반",
    "about.daejeon": "대전",
    "about.major": "03 / 전공",
    "about.physics": "물리학과",
    "about.campus": "04 / 학교",
    "about.cnu": "충남대학교",
    "about.company": "05 / 회사",
    status: { home: "홈", writing: "글", about: "소개" },
  },
  en: {
    "meta.description": "TaeeunKil's personal website for code, learning, and ideas.",
    skip: "Skip to content",
    logoLabel: "Go to home",
    navLabel: "Main navigation",
    languageLabel: "Choose language",
    "nav.home": "Home",
    "nav.writing": "Writing",
    "nav.about": "About",
    "home.meta": "Personal website",
    "home.place": "Daejeon · 2026",
    "home.intro": "I build, learn, and write down what I want to keep.",
    "writing.title": "Writing",
    "writing.emptyTitle": "The first post is on its way.",
    "writing.emptyBody": "I'll document the process of learning, not only finished thoughts.",
    "about.title": "About",
    "about.mapLabel": "A mind map introducing TaeeunKil",
    "about.who": "WHO AM I",
    "about.education": "01 / EDUCATION",
    "about.ssafy": "SSAFY 13th",
    "about.base": "02 / BASE",
    "about.daejeon": "Daejeon",
    "about.major": "03 / MAJOR",
    "about.physics": "Physics",
    "about.campus": "04 / CAMPUS",
    "about.cnu": "Chungnam National University",
    "about.company": "05 / COMPANY",
    status: { home: "Home", writing: "Writing", about: "About" },
  },
};

let currentLanguage = "ko";

function setLanguage(language, { persist = true } = {}) {
  currentLanguage = translations[language] ? language : "ko";
  const copy = translations[currentLanguage];

  document.documentElement.lang = currentLanguage;
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = copy[element.dataset.i18n];
  });
  document.querySelectorAll("[data-i18n-aria]").forEach((element) => {
    element.setAttribute("aria-label", copy[element.dataset.i18nAria]);
  });
  document.querySelectorAll("[data-i18n-content]").forEach((element) => {
    element.setAttribute("content", copy[element.dataset.i18nContent]);
  });
  document.querySelectorAll("[data-language]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.language === currentLanguage));
  });

  const activeName = tabNames[Number(getComputedStyle(document.documentElement).getPropertyValue("--panel-index"))] ?? "home";
  document.querySelector("#current-label").textContent = copy.status[activeName];

  if (persist) {
    try { localStorage.setItem("language", currentLanguage); } catch {}
  }
}

function selectTab(name, { updateHistory = true } = {}) {
  const index = tabNames.indexOf(name);
  const safeIndex = index === -1 ? 0 : index;
  const activeName = tabNames[safeIndex];

  document.documentElement.style.setProperty("--panel-index", safeIndex);
  document.querySelector("#current-label").textContent = translations[currentLanguage].status[activeName];

  tabs.forEach((tab) => {
    const active = tab.dataset.tabLink === activeName;
    tab.setAttribute("aria-selected", String(active));
    tab.setAttribute("tabindex", active ? "0" : "-1");
  });

  panels.forEach((panel) => {
    const active = panel.dataset.panel === activeName;
    panel.setAttribute("aria-hidden", String(!active));
    panel.inert = !active;
    if (active) panel.scrollTop = 0;
  });

  if (updateHistory && location.hash !== `#${activeName}`) {
    history.pushState(null, "", `#${activeName}`);
  }
}

tabs.forEach((tab) => {
  tab.addEventListener("click", (event) => {
    event.preventDefault();
    selectTab(tab.dataset.tabLink);
  });

  tab.addEventListener("keydown", (event) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;

    event.preventDefault();
    const currentIndex = tabNames.indexOf(tab.dataset.tabLink);
    const direction = event.key === "ArrowRight" ? 1 : -1;
    const nextIndex = (currentIndex + direction + tabNames.length) % tabNames.length;
    const nextName = tabNames[nextIndex];
    const nextTab = tabs.find((item) => item.dataset.tabLink === nextName && item.closest("nav"));

    selectTab(nextName);
    nextTab?.focus();
  });
});

document.querySelectorAll("[data-language]").forEach((button) => {
  button.addEventListener("click", () => setLanguage(button.dataset.language));
});

window.addEventListener("popstate", () => {
  selectTab(location.hash.slice(1), { updateHistory: false });
});

let savedLanguage;
try { savedLanguage = localStorage.getItem("language"); } catch {}
const initialLanguage = savedLanguage ?? (navigator.language.toLowerCase().startsWith("ko") ? "ko" : "en");
setLanguage(initialLanguage, { persist: false });
selectTab(location.hash.slice(1), { updateHistory: false });
window.scrollTo(0, 0);
window.addEventListener("load", () => window.scrollTo(0, 0), { once: true });

const mindMap = document.querySelector(".mind-map");
const mindNodes = [...document.querySelectorAll(".mind-node")];
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

mindMap?.addEventListener("pointermove", (event) => {
  if (reduceMotion.matches) return;

  const bounds = mindMap.getBoundingClientRect();
  const x = (event.clientX - bounds.left) / bounds.width - 0.5;
  const y = (event.clientY - bounds.top) / bounds.height - 0.5;

  mindNodes.forEach((node) => {
    const depth = Number(node.dataset.depth ?? 1);
    node.style.setProperty("--shift-x", `${x * depth * 18}px`);
    node.style.setProperty("--shift-y", `${y * depth * 14}px`);
  });
});

mindMap?.addEventListener("pointerleave", () => {
  mindNodes.forEach((node) => {
    node.style.setProperty("--shift-x", "0px");
    node.style.setProperty("--shift-y", "0px");
  });
});

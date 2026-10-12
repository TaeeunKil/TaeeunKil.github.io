document.documentElement.classList.add("js");
history.scrollRestoration = "manual";

const tabs = [...document.querySelectorAll("[data-tab-link]")];
const panels = [...document.querySelectorAll("[data-panel]")];
const tabNames = panels.map((panel) => panel.dataset.panel);
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
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
    "home.intro": "AI를 활용해 웹 기능 구현부터 배포와 운영 확인까지 연결하는 개발자 길태은입니다.",
    "writing.title": "글",
    "writing.loading": "글을 불러오고 있습니다.",
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
    "home.intro": "I'm Taeeun Kil. I use AI to connect web development with deployment and operational checks.",
    "writing.title": "Writing",
    "writing.loading": "Loading writing.",
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
  },
};

let currentLanguage = "ko";
let postsCache = [];
let tabTransitionTimer;
const TAB_FADE_OUT_MS = 280;

function setLanguage(language, { persist = true } = {}) {
  currentLanguage = translations[language] ? language : "ko";
  const copy = translations[currentLanguage];

  document.querySelectorAll('[data-ko][data-en]').forEach((element) => {
    element.textContent = element.dataset[currentLanguage];
  });
  document.querySelectorAll('[data-ko-aria]').forEach((element) => {
    element.setAttribute('aria-label', element.dataset[currentLanguage + 'Aria']);
  });

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

  if (persist) {
    try { localStorage.setItem("language", currentLanguage); } catch {}
  }
  renderPostList();
}

function renderPostList() {
  const list = document.querySelector("[data-post-list]");
  if (!list || postsCache.length === 0) return;

  list.innerHTML = postsCache.map((post, index) => {
    const title = post.title[currentLanguage] ?? post.title.ko;
    const summary = post.summary[currentLanguage] ?? post.summary.ko;
    const number = String(post.number ?? index + 1).padStart(3, "0");
    const displayDate = post.date.replaceAll("-", ".");
    return `<a class="post-row" href="post.html?id=${encodeURIComponent(post.id)}">
      <span class="post-number">${number}</span>
      <time datetime="${post.date}">${displayDate}</time>
      <div><h3>${title}</h3><p>${summary}</p></div>
      <img class="post-thumbnail" src="${post.thumbnail}" alt="" width="160" height="100" loading="lazy" decoding="async">
    </a>`;
  }).join("");
  list.classList.remove("is-loading");
  list.setAttribute("aria-busy", "false");
}

async function loadPosts() {
  const list = document.querySelector("[data-post-list]");

  try {
    const response = await fetch("data/posts.json?v=20261012-thumbnails");
    if (!response.ok) throw new Error("Post index could not be loaded");
    postsCache = await response.json();
    postsCache.sort((a, b) => b.date.localeCompare(a.date));
    renderPostList();
  } catch {
    list?.classList.remove("is-loading");
    list?.setAttribute("aria-busy", "false");
  }
}

function selectTab(name, { updateHistory = true } = {}) {
  const isPortfolio = name === 'portfolio';
  const index = tabNames.indexOf(isPortfolio ? 'home' : name);
  const safeIndex = index === -1 ? 0 : index;
  const activeName = tabNames[safeIndex];
  const activePanel = panels[safeIndex];
  const currentPanel = panels.find((panel) => panel.classList.contains("is-active"));

  document.documentElement.style.setProperty("--panel-index", safeIndex);

  tabs.forEach((tab) => {
    const active = tab.dataset.tabLink === activeName;
    tab.setAttribute("aria-selected", String(active));
    tab.setAttribute("tabindex", active ? "0" : "-1");
  });

  if (tabTransitionTimer) {
    window.clearTimeout(tabTransitionTimer);
    tabTransitionTimer = undefined;
  }

  if (!currentPanel || currentPanel === activePanel) {
    panels.forEach((panel) => {
      const active = panel === activePanel;
      panel.classList.toggle("is-active", active);
      panel.classList.remove("is-exiting");
      panel.setAttribute("aria-hidden", String(!active));
      panel.inert = !active;
      if (active) positionHome(panel, isPortfolio);
    });
  } else {
    currentPanel.classList.remove("is-active");
    currentPanel.classList.add("is-exiting");
    currentPanel.setAttribute("aria-hidden", "true");
    currentPanel.inert = true;

    activePanel.classList.remove("is-active", "is-exiting");
    activePanel.setAttribute("aria-hidden", "true");
    activePanel.inert = true;

    tabTransitionTimer = window.setTimeout(() => {
      panels.forEach((panel) => {
        const active = panel === activePanel;
        panel.classList.toggle("is-active", active);
        panel.classList.remove("is-exiting");
        panel.setAttribute("aria-hidden", String(!active));
        panel.inert = !active;
        if (active) positionHome(panel, isPortfolio);
      });
      tabTransitionTimer = undefined;
    }, reduceMotion.matches ? 0 : TAB_FADE_OUT_MS);
  }

  const targetHash = isPortfolio ? 'portfolio' : activeName;
  if (updateHistory && location.hash !== `#${targetHash}`) {
    history.pushState(null, "", `#${targetHash}`);
  }
}

function positionHome(panel, isPortfolio) {
  const portfolio = document.getElementById('portfolio');
  panel.scrollTo({ top: isPortfolio ? portfolio.offsetTop : 0, behavior: 'instant' });
}

document.querySelector('.portfolio-jump').addEventListener('click', (event) => {
  event.preventDefault();
  const home = document.getElementById('home');
  const portfolio = document.getElementById('portfolio');
  home.scrollTo({ top: portfolio.offsetTop, behavior: reduceMotion.matches ? 'instant' : 'smooth' });
  document.getElementById('portfolio-title').focus({ preventScroll: true });
  if (location.hash !== '#portfolio') history.pushState(null, '', '#portfolio');
});

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
loadPosts();
window.scrollTo(0, 0);
window.addEventListener("load", () => window.scrollTo(0, 0), { once: true });

const mindMap = document.querySelector(".mind-map");
document.querySelectorAll('[data-project-open]').forEach((button) => {
  button.addEventListener('click', () => {
    const dialog = document.getElementById(button.dataset.projectOpen);
    dialog.showModal();
    dialog.scrollTop = 0;
  });
});
document.querySelectorAll('.project-dialog').forEach((dialog) => {
  dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    const bounds = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) dialog.close();
  });
});
const mindNodes = [...document.querySelectorAll(".mind-node")];

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

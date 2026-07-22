const postCopy = {
  ko: {
    skip: "본문으로 건너뛰기",
    logoLabel: "홈으로 이동",
    navLabel: "주요 메뉴",
    languageLabel: "언어 선택",
    home: "홈",
    writing: "글",
    about: "소개",
    back: "← 글 목록",
    loading: "글을 불러오고 있습니다.",
    notFound: "글을 찾을 수 없습니다.",
    unavailable: "이 글은 아직 영어 본문을 제공하지 않습니다. 한국어 원문을 표시합니다.",
  },
  en: {
    skip: "Skip to content",
    logoLabel: "Go to home",
    navLabel: "Main navigation",
    languageLabel: "Choose language",
    home: "Home",
    writing: "Writing",
    about: "About",
    back: "← All writing",
    loading: "Loading the post.",
    notFound: "Post not found.",
    unavailable: "An English version is not available yet. Showing the original Korean post.",
  },
};

const query = new URLSearchParams(location.search);
const postId = query.get("id");
let language = "ko";
let activePost;

function storedLanguage() {
  try { return localStorage.getItem("language"); } catch { return null; }
}

function setPostLanguage(nextLanguage, { persist = true } = {}) {
  language = postCopy[nextLanguage] ? nextLanguage : "ko";
  const copy = postCopy[language];
  document.documentElement.lang = language;

  document.querySelectorAll("[data-post-copy]").forEach((element) => {
    element.textContent = copy[element.dataset.postCopy];
  });
  document.querySelectorAll("[data-post-aria]").forEach((element) => {
    element.setAttribute("aria-label", copy[element.dataset.postAria]);
  });
  document.querySelectorAll("[data-language]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.language === language));
  });

  if (persist) {
    try { localStorage.setItem("language", language); } catch {}
  }
  if (activePost) renderPost(activePost);
}

async function renderPost(post) {
  const title = post.title[language] ?? post.title.ko;
  const summary = post.summary[language] ?? post.summary.ko;
  const contentPath = post.content[language] ?? post.content.ko;
  const usesFallback = language !== "ko" && !post.content[language];

  document.title = `${title} — TaeeunKil`;
  document.querySelector('meta[name="description"]').content = summary;
  document.querySelector("#post-title").textContent = title;
  document.querySelector("#post-date").textContent = post.date.replaceAll("-", ".");
  document.querySelector("#post-date").dateTime = post.date;
  document.querySelector("#post-tags").textContent = post.tags.join(" · ");
  document.querySelector("#post-summary").textContent = summary;

  const response = await fetch(contentPath);
  if (!response.ok) throw new Error("Post content could not be loaded");
  const body = document.querySelector("#post-body");
  body.innerHTML = `${usesFallback ? `<p class="translation-note">${postCopy[language].unavailable}</p>` : ""}${await response.text()}`;
}

async function loadPost() {
  try {
    const response = await fetch("data/posts.json");
    if (!response.ok) throw new Error("Post index could not be loaded");
    const posts = await response.json();
    activePost = posts.find((post) => post.id === postId);
    if (!activePost) throw new Error("Post not found");
    await renderPost(activePost);
  } catch {
    document.querySelector("#post-title").textContent = postCopy[language].notFound;
    document.querySelector("#post-body").innerHTML = "";
  }
}

document.querySelectorAll("[data-language]").forEach((button) => {
  button.addEventListener("click", () => setPostLanguage(button.dataset.language));
});

const initialLanguage = storedLanguage() ?? (navigator.language.toLowerCase().startsWith("ko") ? "ko" : "en");
setPostLanguage(initialLanguage, { persist: false });
loadPost();

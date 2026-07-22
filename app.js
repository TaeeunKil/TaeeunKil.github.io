document.documentElement.classList.add("js");
history.scrollRestoration = "manual";

const tabs = [...document.querySelectorAll("[data-tab-link]")];
const panels = [...document.querySelectorAll("[data-panel]")];
const tabNames = panels.map((panel) => panel.dataset.panel);
const labels = {
  home: "Home",
  writing: "Writing",
  about: "About",
};

function selectTab(name, { updateHistory = true } = {}) {
  const index = tabNames.indexOf(name);
  const safeIndex = index === -1 ? 0 : index;
  const activeName = tabNames[safeIndex];

  document.documentElement.style.setProperty("--panel-index", safeIndex);
  document.querySelector("#current-label").textContent = labels[activeName];

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

window.addEventListener("popstate", () => {
  selectTab(location.hash.slice(1), { updateHistory: false });
});

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

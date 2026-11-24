// =====================================================================
// ⬆️⬇️ Admin pages: floating "맨 위로 / 맨 아래로" buttons (web + mobile).
// They scroll whatever is on top: the open popup (player editor, item
// manager …) if there is one, otherwise the page. Shown only on admin
// pages (#/admin…) and only when there is something to scroll.
// =====================================================================
import { h } from "../core/util.js";

const isAdmin = () => String(document.body.dataset.page || "").startsWith("admin");
// the scroll target: the last open modal (scrollable), else the window
function target() {
    const boxes = [...document.querySelectorAll(".modal-back .modal")];
    for (let i = boxes.length - 1; i >= 0; i--) if (boxes[i].scrollHeight > boxes[i].clientHeight + 8) return boxes[i];
    return null;
}
const span = el => el ? { top: el.scrollTop, max: el.scrollHeight - el.clientHeight } : { top: window.scrollY, max: document.documentElement.scrollHeight - window.innerHeight };
function go(where) {
    const el = target(), { top: now, max } = span(el);
    const top = where === "top" ? 0 : max;
    (el || window).scrollTo({ top, behavior: Math.abs(top - now) > 5000 ? "auto" : "smooth" }); // a very long list: jump at once
}

export function installScrollFab() {
    if (document.querySelector(".scroll-fab")) return;
    const up = h("button.sf-btn", { type: "button", title: "맨 위로", "aria-label": "맨 위로", onclick: () => go("top") }, "▲");
    const down = h("button.sf-btn", { type: "button", title: "맨 아래로", "aria-label": "맨 아래로", onclick: () => go("bottom") }, "▼");
    const fab = h("div.scroll-fab", up, down);
    document.body.append(fab);
    let raf = 0;
    const update = () => {
        raf = 0;
        const el = target(), { top, max } = span(el);
        const show = isAdmin() && max > 80;
        fab.classList.toggle("on", show);
        up.disabled = top < 20; down.disabled = top > max - 20;
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(update); };
    window.addEventListener("scroll", kick, { passive: true });
    window.addEventListener("resize", kick);
    window.addEventListener("hashchange", () => setTimeout(kick, 50));
    document.addEventListener("scroll", kick, { capture: true, passive: true }); // a modal scrolling
    new MutationObserver(kick).observe(document.body, { childList: true, subtree: true });
    kick();
}

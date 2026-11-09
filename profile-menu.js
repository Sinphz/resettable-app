import { accountSession } from "./account-session.js";

const wrapper = document.querySelector(".profile-menu-wrap");
const trigger = document.getElementById("profileMenuToggle");
const menu = document.getElementById("profileMenu");
const accountOption = document.getElementById("profileAccountOption");
const accountLabel = document.getElementById("profileAccountLabel");

if (wrapper && trigger && menu && accountOption && accountLabel) {
  let open = false;

  function setOpen(nextOpen, focusTarget = null) {
    open = nextOpen;
    menu.hidden = !open;
    trigger.setAttribute("aria-expanded", String(open));
    if (focusTarget) focusTarget.focus();
  }

  accountSession.subscribe(() => {
    if (!accountSession.ready) {
      accountLabel.textContent = accountSession.error ? "Account unavailable" : "Checking account…";
      accountOption.disabled = !accountSession.error;
      return;
    }

    accountOption.disabled = false;
    accountLabel.textContent = accountSession.user ? "My Account" : "Log in";
  });

  trigger.addEventListener("click", () => setOpen(!open));
  trigger.addEventListener("keydown", event => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    const items = [...menu.querySelectorAll('[role="menuitem"]:not(:disabled)')];
    setOpen(true, event.key === "ArrowUp" ? items.at(-1) : items[0]);
  });

  menu.addEventListener("keydown", event => {
    const items = [...menu.querySelectorAll('[role="menuitem"]:not(:disabled)')];
    if (!items.length) return;
    const currentIndex = items.indexOf(document.activeElement);
    let targetIndex;
    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      targetIndex = (currentIndex + 1) % items.length;
    } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      targetIndex = (currentIndex - 1 + items.length) % items.length;
    } else if (event.key === "Home") {
      targetIndex = 0;
    } else if (event.key === "End") {
      targetIndex = items.length - 1;
    } else {
      return;
    }
    event.preventDefault();
    items[targetIndex].focus();
  });

  menu.querySelectorAll('[role="menuitem"]').forEach(item => {
    item.addEventListener("click", () => setOpen(false));
  });

  document.addEventListener("pointerdown", event => {
    if (open && !wrapper.contains(event.target)) setOpen(false);
  });
  document.addEventListener("keydown", event => {
    if (open && event.key === "Escape") {
      event.preventDefault();
      setOpen(false, trigger);
    }
  });
  menu.addEventListener("focusout", () => {
    queueMicrotask(() => {
      if (open && !wrapper.contains(document.activeElement)) setOpen(false);
    });
  });
}

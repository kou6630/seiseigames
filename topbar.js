const TOPBAR_STYLE_ID = "seiseigamesTopbarStyle";

function injectTopbarStyles() {
  if (document.getElementById(TOPBAR_STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = TOPBAR_STYLE_ID;
  style.textContent = `
    .seisei-topbar {
      display: flex;
      width: 100%;
      box-sizing: border-box;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 18px;
      padding: 14px 16px;
      border-radius: 18px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
      flex-wrap: wrap;
    }

    .seisei-topbar-left {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
      flex-wrap: wrap;
    }

    .seisei-topbar-avatar {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      border: 1px solid rgba(255, 255, 255, 0.14);
      background: rgba(255, 255, 255, 0.08);
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      background-position: center;
      background-repeat: no-repeat;
      background-size: cover;
    }

    .seisei-topbar-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .seisei-topbar-meta {
      min-width: 0;
    }

    .seisei-topbar-name {
      font-size: 16px;
      font-weight: 700;
      color: #f8fafc;
      word-break: break-word;
    }

    .seisei-topbar-sub {
      margin-top: 2px;
      font-size: 13px;
      color: #cbd5e1;
      word-break: break-all;
    }

    .seisei-topbar-actions {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
      margin-left: auto;
    }

    .seisei-topbar-button {
      appearance: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 42px;
      padding: 0 14px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: #f8fafc;
      font-size: 14px;
      font-weight: 700;
      line-height: 1;
      text-decoration: none;
      white-space: nowrap;
      box-sizing: border-box;
      outline: none;
      cursor: pointer;
      box-shadow: none;
    }

    .seisei-topbar-button:hover {
      transform: none;
    }

    .seisei-topbar-button:active {
      transform: none;
    }

    .seisei-topbar-button.gear {
      width: 48px;
      min-width: 48px;
      height: 48px;
      min-height: 48px;
      padding: 0;
      border-radius: 16px;
      font-size: 22px;
      line-height: 1;
      flex-shrink: 0;
    }

    .seisei-topbar-button.hidden {
      display: none;
    }
  `;

  document.head.appendChild(style);
}

function createElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (typeof text === "string") element.textContent = text;
  return element;
}

function setAvatarContent(target, imagePath, altText) {
  if (!target) return;
  target.innerHTML = "";
  target.style.backgroundImage = "none";

  const src = String(imagePath || "").trim();
  if (!src) return;

  const image = document.createElement("img");
  image.src = src;
  image.alt = String(altText || "avatar");
  target.appendChild(image);
}

function createButton(item = {}) {
  const button = createElement("button", `seisei-topbar-button${item.gear ? " gear" : ""}`, item.label || "");
  button.type = "button";
  if (item.id) button.dataset.topbarId = String(item.id);
  if (item.ariaLabel) button.setAttribute("aria-label", String(item.ariaLabel));
  if (item.hidden) button.classList.add("hidden");
  return button;
}

export function createTopbar(options = {}) {
  injectTopbarStyles();

  const root = createElement("div", "seisei-topbar");
  const left = createElement("div", "seisei-topbar-left");
  const avatar = createElement("div", "seisei-topbar-avatar");
  const meta = createElement("div", "seisei-topbar-meta");
  const name = createElement("div", "seisei-topbar-name", "---");
  const sub = createElement("div", "seisei-topbar-sub", "コイン: 0");
  const actions = createElement("div", "seisei-topbar-actions");

  meta.append(name, sub);
  left.append(avatar, meta);
  root.append(left, actions);

  const buttons = new Map();
  const actionItems = Array.isArray(options.actions) ? options.actions : [];
  actionItems.forEach(function(item) {
    const button = createButton(item);
    actions.appendChild(button);
    if (item.id) {
      buttons.set(String(item.id), button);
    }
    if (typeof item.onClick === "function") {
      button.addEventListener("click", function(event) {
        item.onClick(event, api);
      });
    }
  });

  function setProfile(profile = {}) {
    const nickname = String(profile.nickname || profile.name || "---");
    const coin = Number(profile.coin || 0);
    name.textContent = nickname;
    sub.textContent = typeof profile.subText === "string" ? profile.subText : `コイン: ${coin}`;
    setAvatarContent(avatar, profile.photoURL, nickname);
  }

  function setButtonVisible(id, visible) {
    const button = buttons.get(String(id));
    if (!button) return;
    button.classList.toggle("hidden", !visible);
  }

  function setButtonText(id, text) {
    const button = buttons.get(String(id));
    if (!button) return;
    button.textContent = String(text || "");
  }

  function setButtonDisabled(id, disabled) {
    const button = buttons.get(String(id));
    if (!button) return;
    button.disabled = Boolean(disabled);
  }

  function getButton(id) {
    return buttons.get(String(id)) || null;
  }

  const api = {
    element: root,
    setProfile,
    setButtonVisible,
    setButtonText,
    setButtonDisabled,
    getButton,
  };

  setProfile(options.profile || {});

  return api;
}


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
      flex-wrap: nowrap;
    }

    .seisei-topbar.same-as-selectgame {
      padding: 14px 16px;
      border-radius: 18px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
    }

    .seisei-topbar-left {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
      flex-wrap: nowrap;
      flex: 1 1 auto;
      overflow: hidden;
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

    .seisei-topbar-profile {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
      flex: 1 1 auto;
      overflow: hidden;
    }

    .seisei-topbar-stats {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: nowrap;
      min-width: 0;
      flex-shrink: 0;
    }

    .seisei-topbar-stat {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 36px;
      padding: 0 12px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid rgba(255, 255, 255, 0.08);
      color: #f8fafc;
      font-size: 13px;
      font-weight: 700;
      white-space: nowrap;
    }

    .seisei-topbar-stat.hidden {
      display: none;
    }

    .seisei-topbar-name {
      font-size: 16px;
      font-weight: 700;
      color: #f8fafc;
      word-break: break-word;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .seisei-topbar-sub {
      margin-top: 2px;
      font-size: 13px;
      color: #cbd5e1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .seisei-topbar-actions {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      gap: 10px;
      flex-wrap: nowrap;
      margin-left: auto;
      flex-shrink: 0;
    }

    .seisei-topbar-inline-actions {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: nowrap;
      flex-shrink: 0;
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
  if (item.title) button.title = String(item.title);
  return button;
}

function normalizePosition(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (raw === "left") return "left";
  if (raw === "stats") return "stats";
  return "right";
}

function openHref(href) {
  const next = String(href || "").trim();
  if (!next) return;
  window.location.href = next;
}

function buildPresetActions(options = {}) {
  const mode = String(options.mode || "").trim();
  const onOpenSettings = typeof options.onOpenSettings === "function" ? options.onOpenSettings : null;
  const itemPageHref = String(options.itemPageHref || "./items.html").trim() || "./items.html";
  const homeHref = String(options.homeHref || "./index.html").trim() || "./index.html";
  const avatarSelectHref = String(options.avatarSelectHref || "./avatarselect.html").trim() || "./avatarselect.html";
  const avatarGachaHref = String(options.avatarGachaHref || "./avatargacha.html").trim() || "./avatargacha.html";
  const gameSelectHref = String(options.gameSelectHref || "./selectgame.html").trim() || "./selectgame.html";
  const actions = [];

  if (mode === "game" || mode === "items" || mode === "avatar") {
    if (mode === "game" || mode === "items") {
      actions.push({
        id: "items",
        label: "持ち物",
        onClick: function() { openHref(itemPageHref); }
      });
    }

    if (mode === "avatar") {
      actions.push({
        id: "gacha",
        label: "アバターガチャ",
        onClick: function() { openHref(avatarGachaHref); }
      });
      actions.push({
        id: "select",
        label: "ゲーム選択",
        onClick: function() { openHref(gameSelectHref); }
      });
    }

    actions.push({
      id: "home",
      label: "ホーム",
      onClick: function() { openHref(homeHref); }
    });

    actions.push({
      id: "settings",
      label: "⚙",
      gear: true,
      ariaLabel: "設定",
      onClick: function(event, api) {
        if (onOpenSettings) onOpenSettings(event, api);
      }
    });
  }

  if (mode === "gacha") {
    actions.push({
      id: "avatar",
      label: "アバター選択",
      onClick: function() { openHref(avatarSelectHref); }
    });
    actions.push({
      id: "select",
      label: "ゲーム選択",
      onClick: function() { openHref(gameSelectHref); }
    });
    actions.push({
      id: "home",
      label: "ホーム",
      onClick: function() { openHref(homeHref); }
    });
  }

  return actions;
}

export function createTopbar(options = {}) {
  injectTopbarStyles();

  const root = createElement("div", "seisei-topbar same-as-selectgame");
  const left = createElement("div", "seisei-topbar-left");
  const avatar = createElement("div", "seisei-topbar-avatar");
  const profile = createElement("div", "seisei-topbar-profile");
  const meta = createElement("div", "seisei-topbar-meta");
  const name = createElement("div", "seisei-topbar-name", "---");
  const sub = createElement("div", "seisei-topbar-sub", "ユーザー情報");
  const stats = createElement("div", "seisei-topbar-stats");
  const inlineActions = createElement("div", "seisei-topbar-inline-actions");
  const actions = createElement("div", "seisei-topbar-actions");

  if (options.className) {
    root.className = `seisei-topbar same-as-selectgame ${String(options.className).trim()}`.trim();
  }

  meta.append(name, sub);
  profile.append(avatar, meta);
  left.append(inlineActions, profile, stats);
  root.append(left, actions);

  const buttons = new Map();
  const statsMap = new Map();
  const statItems = Array.isArray(options.stats) ? options.stats : [];
  statItems.forEach(function(item) {
    const stat = createElement("div", "seisei-topbar-stat", item && item.text ? item.text : "");
    if (item && item.id) {
      stat.dataset.topbarStatId = String(item.id);
      statsMap.set(String(item.id), stat);
    }
    if (item && item.hidden) stat.classList.add("hidden");
    stats.appendChild(stat);
  });

  const actionItems = Array.isArray(options.actions) ? options.actions : [];
  actionItems.forEach(function(item) {
    const button = createButton(item);
    const position = normalizePosition(item && item.position);
    const target = position === "left" ? inlineActions : actions;
    target.appendChild(button);
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
    name.textContent = nickname;
    sub.textContent = typeof profile.subText === "string" ? profile.subText : "ユーザー情報";
    sub.style.display = sub.textContent ? "block" : "none";
    setAvatarContent(avatar, profile.photoURL, nickname);
  }

  function setStatText(id, text) {
    const stat = statsMap.get(String(id));
    if (!stat) return;
    stat.textContent = String(text || "");
  }

  function setStatVisible(id, visible) {
    const stat = statsMap.get(String(id));
    if (!stat) return;
    stat.classList.toggle("hidden", !visible);
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
    setStatText,
    setStatVisible,
    setButtonVisible,
    setButtonText,
    setButtonDisabled,
    getButton,
  };

  setProfile(options.profile || {});

  return api;
}

export function createSeiSeiTopbar(options = {}) {
  const merged = { ...options };
  if (!Array.isArray(merged.actions) || !merged.actions.length) {
    merged.actions = buildPresetActions(options);
  }
  return createTopbar(merged);
}



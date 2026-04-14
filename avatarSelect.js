import { createTopbar } from "./topbar.js";

const AVATAR_SELECT_STYLE_ID = "avatarSelectStyle";
const AVATAR_TOTAL_COUNT = 100;

function injectAvatarSelectStyles() {
  if (document.getElementById(AVATAR_SELECT_STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = AVATAR_SELECT_STYLE_ID;
  style.textContent = `
    .avatar-select-overlay {
      position: fixed;
      inset: 0;
      z-index: 15100;
      display: none;
      align-items: stretch;
      justify-content: center;
      background:
        radial-gradient(circle at top left, rgba(56, 189, 248, 0.16), transparent 30%),
        radial-gradient(circle at top right, rgba(129, 140, 248, 0.16), transparent 28%),
        linear-gradient(160deg, rgba(2, 6, 23, 0.96), rgba(15, 23, 42, 0.98));
      font-family: "Segoe UI", "Hiragino Sans", "Yu Gothic UI", sans-serif;
      color: #f8fafc;
      backdrop-filter: blur(10px);
    }

    .avatar-select-overlay.show {
      display: flex;
      animation: avatar-select-fade-in 180ms ease;
    }

    .avatar-select-panel {
      width: min(100%, 1660px);
      height: 100vh;
      overflow: auto;
      padding: 24px;
      background: transparent;
    }

    .avatar-select-topbar-mount {
      margin-bottom: 0;
    }

    .avatar-select-message-box {
      min-height: 24px;
      margin-bottom: 16px;
      color: #fde68a;
      font-size: 14px;
      line-height: 1.7;
      word-break: break-word;
    }

    .avatar-select-grid {
      display: grid;
      grid-template-columns: repeat(10, minmax(0, 1fr));
      gap: 20px 18px;
      align-items: start;
    }

    .avatar-select-slot {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }

    .avatar-select-card {
      position: relative;
      appearance: none;
      width: 100%;
      aspect-ratio: 1 / 1;
      border: 3px solid rgba(255,255,255,0.18);
      border-radius: 22px;
      background: linear-gradient(180deg, rgba(125, 211, 252, 0.08), rgba(129, 140, 248, 0.08));
      color: #f8fafc;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 10px;
      overflow: hidden;
      transition: transform 0.16s ease, filter 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.05);
    }

    .avatar-select-card:hover {
      transform: translateY(-2px);
    }

    .avatar-select-card.rank-c {
      border-color: rgba(255,255,255,0.78);
    }

    .avatar-select-card.rank-b {
      border-color: rgba(59, 130, 246, 0.95);
    }

    .avatar-select-card.rank-a {
      border-color: rgba(239, 68, 68, 0.95);
    }

    .avatar-select-card.rank-s {
      border-color: rgba(245, 197, 24, 0.98);
      box-shadow: 0 0 0 1px rgba(255,255,255,0.18), inset 0 1px 0 rgba(255,255,255,0.12);
    }

    .avatar-select-card.selected {
      transform: translateY(-2px);
      box-shadow: 0 0 0 3px rgba(138, 255, 169, 0.24), inset 0 1px 0 rgba(255,255,255,0.08);
    }

    .avatar-select-card.locked {
      background: linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.03));
      opacity: 0.92;
    }

    .avatar-select-preview {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      border-radius: 16px;
      background:
        radial-gradient(circle at 30% 25%, rgba(255,255,255,0.12), transparent 22%),
        radial-gradient(circle at 70% 75%, rgba(129, 140, 248, 0.18), transparent 28%),
        rgba(255,255,255,0.05);
    }

    .avatar-select-preview img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      user-select: none;
      -webkit-user-drag: none;
    }

    .avatar-select-preview-fallback {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      font-size: clamp(28px, 2.2vw, 44px);
      font-weight: 900;
      color: #f8fafc;
      background: transparent;
    }

    .avatar-select-no {
      font-size: 16px;
      line-height: 1;
      font-weight: 900;
      color: rgba(248, 250, 252, 0.92);
    }

    @keyframes avatar-select-fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @media (max-width: 1400px) {
      .avatar-select-grid {
        grid-template-columns: repeat(8, minmax(0, 1fr));
      }
    }

    @media (max-width: 1100px) {
      .avatar-select-grid {
        grid-template-columns: repeat(6, minmax(0, 1fr));
      }
    }

    @media (max-width: 860px) {
      .avatar-select-panel {
        padding: 14px 14px 24px;
      }

      .avatar-select-message-box,
      .avatar-select-close {
        font-size: 15px;
      }

      .avatar-select-grid {
        grid-template-columns: repeat(4, minmax(0, 1fr));
      }
    }

    @media (max-width: 560px) {
      .avatar-select-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
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

function getAvatarNumberFromId(id, fallbackIndex) {
  const raw = String(id || "");
  const matched = raw.match(/(\d+)/);
  const number = matched ? Number(matched[1]) : Number(fallbackIndex) + 1;
  return Math.max(1, Math.min(AVATAR_TOTAL_COUNT, number));
}

function getAvatarRank(no) {
  if (no >= 91) return "S";
  if (no >= 71) return "A";
  if (no >= 41) return "B";
  return "C";
}

function getAvatarRankClass(rank) {
  if (rank === "S") return "rank-s";
  if (rank === "A") return "rank-a";
  if (rank === "B") return "rank-b";
  return "rank-c";
}

function pickAvatarNumberText(value) {
  const text = String(value || "");
  let digits = "";
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (ch >= "0" && ch <= "9") {
      digits += ch;
    } else if (digits) {
      break;
    }
  }
  return digits;
}

function normalizeAvatarItemId(item, fallbackNo) {
  const rawId = String(item && item.id ? item.id : "").trim();
  if (rawId) {
    const digits = pickAvatarNumberText(rawId);
    if (digits) {
      return "avatar_" + String(Number(digits));
    }
    return rawId;
  }

  const rawName = String(item && item.name ? item.name : "").trim();
  const digits = pickAvatarNumberText(rawName);
  if (digits) {
    return "avatar_" + String(Number(digits));
  }

  return "avatar_" + String(fallbackNo);
}

function normalizeAvatars(avatars) {
  const input = Array.isArray(avatars) ? avatars : [];
  const byNo = new Map();

  input.forEach(function(item, index) {
    const rawNo = Number(item && item.no);
    const normalizedId = normalizeAvatarItemId(item, index + 1);
    const digits = pickAvatarNumberText(normalizedId);
    const no = Number.isInteger(rawNo) && rawNo >= 1 && rawNo <= AVATAR_TOTAL_COUNT
      ? rawNo
      : (digits ? getAvatarNumberFromId(normalizedId, index) : index + 1);

    byNo.set(no, {
      id: "avatar_" + String(no),
      no,
      name: String(item && item.name ? item.name : "No" + String(no)),
      owned: Boolean(item && item.owned),
      image: String(item && item.image ? item.image : "").split("\\").join("/"),
      rank: getAvatarRank(no),
    });
  });

  return Array.from({ length: AVATAR_TOTAL_COUNT }, function(_, index) {
    const no = index + 1;
    const existing = byNo.get(no);
    if (existing) return existing;
    return {
      id: "avatar_" + String(no),
      no,
      name: "No" + String(no),
      owned: false,
      image: "",
      rank: getAvatarRank(no),
    };
  });
}

export function createAvatarSelectScreen(options = {}) {
  injectAvatarSelectStyles();

  let avatars = normalizeAvatars(options.avatars);
  let selectedAvatarId = String(options.selectedAvatarId || (avatars.find(function(item) {
    return item.owned;
  }) || avatars[0] || {}).id || "");
  const onSelect = typeof options.onSelect === "function" ? options.onSelect : null;

  const overlay = createElement("section", "avatar-select-overlay");
  overlay.setAttribute("aria-hidden", "true");

  const panel = createElement("div", "avatar-select-panel");
  const topbarMount = createElement("div", "avatar-select-topbar-mount");
  const messageBox = createElement("div", "avatar-select-message-box", "");
  const grid = createElement("div", "avatar-select-grid");

  let isOpen = false;

  const defaultTopbarActions = [
    {
      id: "settings",
      label: "⚙",
      gear: true,
      ariaLabel: "設定",
      onClick: function(event) {
        if (event) {
          event.preventDefault();
          event.stopPropagation();
        }
        if (typeof options.onSettings === "function") {
          options.onSettings();
          return;
        }
        setMessage("設定は後でつなげます");
      },
    },
    {
      id: "home",
      label: "ホーム",
      onClick: function(event) {
        if (event) {
          event.preventDefault();
          event.stopPropagation();
        }
        close();
      },
    },
  ];

  const topbar = createTopbar({
    profile: options.profile || {},
    actions: Array.isArray(options.topbarActions) && options.topbarActions.length
      ? options.topbarActions
      : defaultTopbarActions,
  });

  function applyTopbarProfile(profile = {}) {
    topbar.setProfile({
      nickname: profile.nickname || profile.name || "---",
      coin: Number(profile.coin || 0),
      photoURL: profile.photoURL || "",
    });
  }

  applyTopbarProfile(options.profile || {});
  topbarMount.appendChild(topbar.element);

  panel.append(topbarMount, messageBox, grid);
  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  function setMessage(text) {
    if (messageBox) {
      messageBox.textContent = String(text || "");
    }
    return String(text || "");
  }

  function createPreview(item) {
    const preview = createElement("div", "avatar-select-preview");
    if (item.owned && item.image) {
      const image = document.createElement("img");
      image.src = item.image;
      image.alt = item.name;
      preview.appendChild(image);
      return preview;
    }

    const fallback = createElement("div", "avatar-select-preview-fallback", item.owned ? String(item.no) : "?");
    preview.appendChild(fallback);
    return preview;
  }

  function render() {
    grid.innerHTML = "";

    avatars.forEach(function(item) {
      const slot = createElement("div", "avatar-select-slot");
      const card = createElement("button", `avatar-select-card ${getAvatarRankClass(item.rank)}`);
      const no = createElement("div", "avatar-select-no", `No${item.no}`);
      card.type = "button";

      if (item.id === selectedAvatarId) {
        card.classList.add("selected");
      }
      if (!item.owned) {
        card.classList.add("locked");
      }

      const preview = createPreview(item);
      card.appendChild(preview);

      card.addEventListener("click", async function() {
        if (!item.owned) {
          setMessage(`No${item.no} はまだ持っていません`);
          return;
        }

        if (item.id === selectedAvatarId) {
          setMessage(`No${item.no} が選ばれています`);
          return;
        }

        selectedAvatarId = item.id;
        render();
        setMessage(`No${item.no} に変更しました`);

        if (onSelect) {
          try {
            await onSelect(item);
          } catch (error) {
            console.error(error);
            setMessage("変更に失敗しました");
          }
        }
      });

      slot.append(card, no);
      grid.appendChild(slot);
    });
  }

  function open() {
    applyTopbarProfile(options.profile || {});
    overlay.classList.add("show");
    overlay.setAttribute("aria-hidden", "false");
    isOpen = true;
    render();
  }

  function close() {
    overlay.classList.remove("show");
    overlay.setAttribute("aria-hidden", "true");
    isOpen = false;
  }

  function setAvatars(nextAvatars, nextSelectedAvatarId) {
    avatars = normalizeAvatars(nextAvatars);
    if (typeof nextSelectedAvatarId === "string") {
      selectedAvatarId = nextSelectedAvatarId;
    } else if (!avatars.some(function(item) { return item.id === selectedAvatarId; })) {
      selectedAvatarId = (avatars.find(function(item) { return item.owned; }) || avatars[0] || {}).id || "";
    }
    render();
  }

  function setSelectedAvatar(nextSelectedAvatarId) {
    selectedAvatarId = String(nextSelectedAvatarId || "");
    render();
  }

  function setProfile(profile = {}) {
    options.profile = profile;
    applyTopbarProfile(profile);
  }

  overlay.addEventListener("click", function(event) {
    if (event.target === overlay) {
      close();
    }
  });

  document.addEventListener("keydown", function(event) {
    if (!isOpen) return;
    if (event.key === "Escape") close();
  });

  render();

  return {
    element: overlay,
    open,
    close,
    render,
    setMessage,
    setAvatars,
    setSelectedAvatar,
    setProfile,
    isOpen: function() {
      return isOpen;
    },
  };
}





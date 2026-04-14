
import { createTopbar } from "./topbar.js";

const AVATAR_GACHA_STYLE_ID = "avatarGachaStyle";
const DEFAULT_COST_SINGLE = 100;
const DEFAULT_COST_FIVE = 500;

function injectAvatarGachaStyles() {
  if (document.getElementById(AVATAR_GACHA_STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = AVATAR_GACHA_STYLE_ID;
  style.textContent = `
    .avatar-gacha-overlay {
      position: fixed;
      inset: 0;
      z-index: 15000;
      display: none;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      background: #dcdcdc center center / cover no-repeat;
      font-family: "Segoe UI", "Hiragino Sans", "Yu Gothic UI", sans-serif;
      color: #ffffff;
    }

    .avatar-gacha-overlay.show {
      display: flex;
      animation: avatar-gacha-fade-in 220ms ease;
    }

    .avatar-gacha-shell {
      position: relative;
      width: 100vw;
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }

    .avatar-gacha-background {
      position: absolute;
      inset: 0;
      background-position: center center;
      background-size: cover;
      background-repeat: no-repeat;
      opacity: 1;
      pointer-events: none;
    }

    .avatar-gacha-earth-wrap {
      position: absolute;
      left: 50%;
      top: 31%;
      transform: translate(-50%, -50%);
      width: min(34vw, 360px);
      aspect-ratio: 1 / 1;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
      filter: drop-shadow(0 0 18px rgba(65, 160, 255, 0.18));
    }

    .avatar-gacha-earth {
      position: relative;
      width: 100%;
      height: 100%;
      object-fit: contain;
      animation: avatar-gacha-earth-rotate 18s linear infinite;
      user-select: none;
      -webkit-user-drag: none;
    }

    .avatar-gacha-flash {
      position: absolute;
      inset: 0;
      pointer-events: none;
      background: #ffffff;
      opacity: 0;
    }

    .avatar-gacha-shell.is-playing .avatar-gacha-flash {
      animation: avatar-gacha-flash-burst 1500ms ease forwards;
    }

    .avatar-gacha-shell.is-playing .avatar-gacha-earth-wrap {
      animation: avatar-gacha-earth-charge 1500ms ease forwards;
    }

    .avatar-gacha-ui {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      padding: 28px 32px 40px;
      pointer-events: none;
    }

    .avatar-gacha-topbar-mount {
      width: min(100%, 1100px);
      margin-bottom: 0;
      pointer-events: auto;
      align-self: center;
    }

    .avatar-gacha-title-box {
      display: none;
    }

    .avatar-gacha-bottom {
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-end;
      gap: 18px;
      flex: 1;
      pointer-events: auto;
    }

    .avatar-gacha-buttons {
      width: 100%;
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 32px;
      padding: 0 20%;
    }

    .avatar-gacha-message {
      display: none;
    }

    .avatar-gacha-button {
      appearance: none;
      border: 0;
      background: transparent;
      padding: 0;
      cursor: pointer;
      transition: transform 0.16s ease, filter 0.16s ease, opacity 0.16s ease;
      filter: drop-shadow(0 22px 30px rgba(0,0,0,0.34));
    }

    .avatar-gacha-button:hover {
      transform: translateY(-2px) scale(1.01);
    }

    .avatar-gacha-button:active {
      transform: translateY(0) scale(0.99);
    }

    .avatar-gacha-button:disabled {
      opacity: 0.72;
      cursor: default;
      transform: none;
    }

    .avatar-gacha-button-image {
      display: block;
      width: min(18vw, 220px);
      max-width: 220px;
      min-width: 180px;
      height: auto;
      user-select: none;
      -webkit-user-drag: none;
      pointer-events: none;
    }

    .avatar-gacha-result {
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%) scale(0.86);
      width: min(92vw, 880px);
      padding: 24px;
      border-radius: 28px;
      background: rgba(8, 18, 40, 0.8);
      border: 1px solid rgba(255,255,255,0.12);
      box-shadow: 0 28px 80px rgba(0,0,0,0.34);
      backdrop-filter: blur(14px);
      text-align: center;
      opacity: 0;
      pointer-events: none;
    }

    .avatar-gacha-result.show {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1);
      transition: opacity 180ms ease, transform 220ms ease;
    }

    .avatar-gacha-result-label {
      font-size: 14px;
      font-weight: 800;
      letter-spacing: 0.12em;
      color: rgba(184, 223, 255, 0.9);
    }

    .avatar-gacha-result-name {
      margin-top: 12px;
      font-size: clamp(30px, 4vw, 48px);
      line-height: 1.08;
      font-weight: 900;
      color: #ffffff;
      text-shadow: 0 12px 26px rgba(0,0,0,0.26);
      word-break: break-word;
    }

    .avatar-gacha-result-note {
      margin-top: 12px;
      font-size: 14px;
      line-height: 1.7;
      color: rgba(230, 240, 255, 0.86);
    }

    .avatar-gacha-result-grid {
      margin-top: 18px;
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 14px;
    }

    .avatar-gacha-result-card {
      aspect-ratio: 1 / 1;
      border-radius: 20px;
      border: 2px solid rgba(255,255,255,0.14);
      background: rgba(255,255,255,0.06);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 10px;
      font-size: 18px;
      font-weight: 900;
      color: #ffffff;
      word-break: break-word;
      text-align: center;
      overflow: hidden;
    }

    .avatar-gacha-result-card img {
      width: 100%;
      height: 100%;
      max-width: 88px;
      max-height: 88px;
      object-fit: contain;
      user-select: none;
      -webkit-user-drag: none;
      flex: 1;
    }

    .avatar-gacha-result-card-name {
      font-size: 14px;
      line-height: 1.3;
      font-weight: 900;
    }

    @keyframes avatar-gacha-fade-in {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes avatar-gacha-earth-rotate {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    @keyframes avatar-gacha-earth-charge {
      0% { transform: translate(-50%, -50%) scale(1) rotate(0deg); }
      25% { transform: translate(-50%, -50%) scale(1.18) rotate(5deg); }
      55% { transform: translate(-50%, -50%) scale(1.55) rotate(-4deg); }
      76% { transform: translate(-50%, -50%) scale(4.6) rotate(0deg); }
      100% { transform: translate(-50%, -50%) scale(1) rotate(0deg); }
    }

    @keyframes avatar-gacha-flash-burst {
      0% { opacity: 0; }
      35% { opacity: 0.18; }
      58% { opacity: 1; }
      78% { opacity: 1; }
      100% { opacity: 0; }
    }

    @media (max-width: 900px) {
      .avatar-gacha-shell {
        width: 100vw;
        height: 100vh;
        padding: 16px;
      }

      .avatar-gacha-ui {
        padding: 18px 16px 20px;
      }

      .avatar-gacha-top {
        align-items: center;
      }

      .avatar-gacha-button-image {
        width: min(34vw, 220px);
        min-width: 130px;
      }

      .avatar-gacha-buttons {
        padding: 0 4%;
        gap: 16px;
      }

      .avatar-gacha-earth-wrap {
        width: min(46vw, 260px);
        top: 29%;
      }

      .avatar-gacha-result-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
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

function getDisplayAvatarName(value, fallback = "") {
  return String(value || fallback || "")
    .replace(/^\s*\d+\s*[-ー－]\s*/, "")
    .trim();
}

function normalizePool(pool) {
  if (!Array.isArray(pool) || pool.length === 0) {
    return [
      { id: "avatar_earth", name: "地球アバター" },
      { id: "avatar_star", name: "スターアバター" },
      { id: "avatar_comet", name: "コメットアバター" },
    ];
  }
  return pool.map(function(item, index) {
    const rawName = String(item && item.name ? item.name : `アバター${index + 1}`);
    return {
      id: String(item && item.id ? item.id : `avatar_${index + 1}`),
      name: getDisplayAvatarName(rawName, `アバター${index + 1}`),
      image: String(item && item.image ? item.image : "").trim().split(String.fromCharCode(92)).join("/"),
      rarity: String(item && item.rarity ? item.rarity : ""),
    };
  });
}

function pickRandomAvatar(pool) {
  const safePool = normalizePool(pool);
  const index = Math.floor(Math.random() * safePool.length);
  return safePool[index];
}

function wait(ms) {
  return new Promise(function(resolve) {
    window.setTimeout(resolve, ms);
  });
}

export function createAvatarGachaScreen(options = {}) {
  injectAvatarGachaStyles();

  const avatarPool = normalizePool(options.avatarPool);
  const singleCost = Number.isFinite(Number(options.singleCost)) ? Number(options.singleCost) : DEFAULT_COST_SINGLE;
  const fiveCost = Number.isFinite(Number(options.fiveCost)) ? Number(options.fiveCost) : DEFAULT_COST_FIVE;
  const backgroundImage = String(options.backgroundImage || "img/ガチャ画面/ガチャ背景.jpg").trim();
  const earthImage = String(options.earthImage || "img/ガチャ画面/地球.jpg").trim();
  const singleButtonImage = String(options.singleButtonImage || "img/ガチャ画面/1回ガチャ.png")
    .trim()
    .replace(/\\/g, "/")
    .replace(/1回ガチャ\.(jpg|jpeg)$/i, "1回ガチャ.png");
  const fiveButtonImage = String(options.fiveButtonImage || "img/ガチャ画面/5回ガチャ.png")
    .trim()
    .replace(/\\/g, "/")
    .replace(/5回ガチャ\.(jpg|jpeg)$/i, "5回ガチャ.png");

  const overlay = createElement("section", "avatar-gacha-overlay");
  overlay.setAttribute("aria-hidden", "true");

  const background = createElement("div", "avatar-gacha-background");
  background.style.backgroundImage = backgroundImage ? `url("${backgroundImage}")` : "none";

  const shell = createElement("div", "avatar-gacha-shell");
  const earthWrap = createElement("div", "avatar-gacha-earth-wrap");
  const earth = createElement("img", "avatar-gacha-earth");
  earth.alt = "地球";
  earth.src = earthImage;

  const flash = createElement("div", "avatar-gacha-flash");
  const ui = createElement("div", "avatar-gacha-ui");
  const topbarMount = createElement("div", "avatar-gacha-topbar-mount");

  const bottom = createElement("div", "avatar-gacha-bottom");
  const message = createElement("div", "avatar-gacha-message", `1回 ${singleCost}コイン / 5回 ${fiveCost}コイン`);
  const buttons = createElement("div", "avatar-gacha-buttons");
  const singleButton = createElement("button", "avatar-gacha-button");
  singleButton.type = "button";
  singleButton.setAttribute("aria-label", "1回ガチャる");

  const singleButtonVisual = singleButtonImage
    ? createElement("img", "avatar-gacha-button-image")
    : createElement("div", "avatar-gacha-button-image");
  const fiveButton = createElement("button", "avatar-gacha-button");
  fiveButton.type = "button";
  fiveButton.setAttribute("aria-label", "5回ガチャる");
  const fiveButtonVisual = fiveButtonImage
    ? createElement("img", "avatar-gacha-button-image")
    : createElement("div", "avatar-gacha-button-image");

  if (singleButtonImage) {
    singleButtonVisual.src = singleButtonImage;
    singleButtonVisual.alt = "1回ガチャる";
  } else {
    singleButtonVisual.style.display = "grid";
    singleButtonVisual.style.placeItems = "center";
    singleButtonVisual.style.aspectRatio = "1 / 1";
    singleButtonVisual.style.borderRadius = "999px";
    singleButtonVisual.style.background = "#b5e60f";
    singleButtonVisual.style.color = "#000";
    singleButtonVisual.style.fontWeight = "900";
    singleButtonVisual.style.textAlign = "center";
    singleButtonVisual.style.lineHeight = "1.14";
    singleButtonVisual.style.padding = "18% 12% 14%";
    singleButtonVisual.innerHTML = '<div><div style="font-size:28%;">ガチャ1回</div></div>';
  }

  if (fiveButtonImage) {
    fiveButtonVisual.src = fiveButtonImage;
    fiveButtonVisual.alt = "5回ガチャる";
  } else {
    fiveButtonVisual.style.display = "grid";
    fiveButtonVisual.style.placeItems = "center";
    fiveButtonVisual.style.aspectRatio = "1 / 1";
    fiveButtonVisual.style.borderRadius = "999px";
    fiveButtonVisual.style.background = "#b5e60f";
    fiveButtonVisual.style.color = "#000";
    fiveButtonVisual.style.fontWeight = "900";
    fiveButtonVisual.style.textAlign = "center";
    fiveButtonVisual.style.lineHeight = "1.14";
    fiveButtonVisual.style.padding = "18% 12% 14%";
    fiveButtonVisual.innerHTML = '<div><div style="font-size:28%;">ガチャ5回</div></div>';
  }

  const result = createElement("div", "avatar-gacha-result");
  result.style.pointerEvents = "none";
  const resultLabel = createElement("div", "avatar-gacha-result-label", "GET");
  const resultName = createElement("div", "avatar-gacha-result-name", "");
  const resultNote = createElement("div", "avatar-gacha-result-note", "");
  const resultGrid = createElement("div", "avatar-gacha-result-grid");

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

  topbarMount.appendChild(topbar.element);
  singleButton.appendChild(singleButtonVisual);
  fiveButton.appendChild(fiveButtonVisual);
  buttons.append(singleButton, fiveButton);
  bottom.append(message, buttons);
  result.append(resultLabel, resultName, resultNote, resultGrid);
  ui.append(topbarMount, bottom);
  earthWrap.append(earth);
  shell.append(background, earthWrap, flash, ui, result);
  overlay.append(shell);
  document.body.appendChild(overlay);

  let isOpen = false;
  let isPlaying = false;
  let resultClosable = false;
  let profile = options.profile || {};

  function setMessage(text) {
    message.textContent = String(text || "");
  }

  function applyTopbarProfile(nextProfile = {}) {
    profile = nextProfile;
    topbar.setProfile({
      nickname: profile.nickname || profile.name || "---",
      coin: Number(profile.coin || 0),
      photoURL: profile.photoURL || "",
    });
  }

  function open() {
    overlay.classList.add("show");
    overlay.setAttribute("aria-hidden", "false");
    isOpen = true;
    hideResult();
    setMessage(`1回 ${singleCost}コイン / 5回 ${fiveCost}コイン`);
  }

  function close() {
    if (isPlaying) return;
    overlay.classList.remove("show");
    overlay.setAttribute("aria-hidden", "true");
    isOpen = false;
    hideResult();
    setMessage(`1回 ${singleCost}コイン / 5回 ${fiveCost}コイン`);
  }

  function showResult(name, items = []) {
    resultName.textContent = String(name || "");
    resultGrid.innerHTML = "";
    items.forEach(function(item) {
      const card = createElement("div", "avatar-gacha-result-card");
      const imagePath = String(item && item.image ? item.image : "").trim();
      if (imagePath) {
        const image = document.createElement("img");
        image.src = imagePath;
        image.alt = String(item && item.name ? item.name : "avatar");
        card.appendChild(image);
      }
      const nameText = createElement("div", "avatar-gacha-result-card-name", String(item && item.name ? item.name : "---"));
      card.appendChild(nameText);
      resultGrid.appendChild(card);
    });
    result.classList.add("show");
    result.style.pointerEvents = "auto";
    resultClosable = true;
  }

  function hideResult() {
    result.classList.remove("show");
    resultName.textContent = "";
    resultNote.textContent = "";
    resultGrid.innerHTML = "";
    result.style.pointerEvents = "none";
    resultClosable = false;
  }

  function closeResultOnly() {
    if (isPlaying) return;
    hideResult();
    setMessage("");
  }

  async function playSingle(customDrawHandler) {
    if (isPlaying) return null;
    isPlaying = true;
    hideResult();
    setMessage("ガチャ中...");
    singleButton.disabled = true;
    fiveButton.disabled = true;
    shell.classList.remove("is-playing");
    void shell.offsetWidth;
    shell.classList.add("is-playing");

    let picked = null;
    try {
      await wait(1500);
      picked = typeof customDrawHandler === "function"
        ? await customDrawHandler({ cost: singleCost, avatarPool })
        : pickRandomAvatar(avatarPool);

      const finalPick = picked && picked.name ? picked : pickRandomAvatar(avatarPool);
      resultNote.textContent = "画面クリックで閉じる";
      showResult(finalPick.name, [finalPick]);
      setMessage(`${finalPick.name} を引きました`);
      return finalPick;
    } finally {
      shell.classList.remove("is-playing");
      singleButton.disabled = false;
      fiveButton.disabled = false;
      isPlaying = false;
    }
  }

  async function playFive(customDrawHandler) {
    if (isPlaying) return null;
    isPlaying = true;
    hideResult();
    setMessage("5回ガチャ中...");
    singleButton.disabled = true;
    fiveButton.disabled = true;
    shell.classList.remove("is-playing");
    void shell.offsetWidth;
    shell.classList.add("is-playing");

    try {
      await wait(1500);
      const picks = typeof customDrawHandler === "function"
        ? await customDrawHandler({ cost: fiveCost, count: 5, avatarPool })
        : Array.from({ length: 5 }, function() {
            return pickRandomAvatar(avatarPool);
          });
      const safePicks = Array.isArray(picks) && picks.length
        ? picks.slice(0, 5).map(function(item) {
            return item && item.name ? item : pickRandomAvatar(avatarPool);
          })
        : Array.from({ length: 5 }, function() {
            return pickRandomAvatar(avatarPool);
          });

      resultNote.textContent = "画面クリックで閉じる";
      showResult("5回ガチャ結果", safePicks);
      setMessage("5枚の結果を表示しています");
      return safePicks;
    } finally {
      shell.classList.remove("is-playing");
      singleButton.disabled = false;
      fiveButton.disabled = false;
      isPlaying = false;
    }
  }

  overlay.addEventListener("click", function() {
    if (!resultClosable || isPlaying) return;
    closeResultOnly();
  });

  result.addEventListener("click", function(event) {
    event.stopPropagation();
    if (!resultClosable || isPlaying) return;
    closeResultOnly();
  });

  const api = {
    element: overlay,
    open,
    close,
    playSingle,
    playFive,
    setMessage,
    showResult,
    hideResult,
    setProfile: applyTopbarProfile,
    isOpen: function() {
      return isOpen;
    },
    isPlaying: function() {
      return isPlaying;
    },
  };

  singleButton.addEventListener("click", function() {
    api.playSingle();
  });

  fiveButton.addEventListener("click", function() {
    api.playFive();
  });

  document.addEventListener("keydown", function(event) {
    if (!isOpen) return;
    if (event.key === "Escape") close();
  });

  applyTopbarProfile(profile);

  return api;
}




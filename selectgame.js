


import {
  signInWithGoogle,
  signOutUser,
  onUserChanged,
} from "./shared/firebase.js";
import {
  getUserData,
  updateUserData,
  grantFirstGameSelectLoginBonus,
  grantDailyLoginBonus,
  useUserCoin,
  selectAvatar,
  unlockAvatarOrGrantFragment,
  resolveAvatarGachaBatch,
  resetUserAvatarByUid,
} from "./shared/userDate.js";
import { createAvatarSelectScreen } from "./avatarSelect.js";
import { createAvatarGachaScreen } from "./avatarGacha.js";
import { createTopbar } from "./topbar.js";

const statusDot = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const userBox = document.getElementById("userBox");
const userPhoto = document.getElementById("userPhoto");
const userName = document.getElementById("userName");
const userEmail = document.getElementById("userEmail");
const message = document.getElementById("message");
const menuCards = document.querySelectorAll(".menu-card");
const gameSelectCard = document.getElementById("gameSelectCard");
const avatarGachaCard = document.getElementById("avatarGachaCard");
const gameSelectScreen = document.getElementById("gameSelectScreen");
const gameSelectTopbarMount = document.getElementById("gameSelectTopbarMount");
const adminTopbarMount = document.getElementById("adminTopbarMount");
const avatarGachaHomeOpenTargets = ["gameSelectUserPhoto", "userPhoto", "userName"];
const nicknameModal = document.getElementById("nicknameModal");
const nicknameInput = document.getElementById("nicknameInput");
const nicknameError = document.getElementById("nicknameError");
const nicknameSaveBtn = document.getElementById("nicknameSaveBtn");
const adminEntryBtn = document.getElementById("adminEntryBtn");
const adminScreen = document.getElementById("adminScreen");
const adminCloseBtn = document.getElementById("adminCloseBtn");
const adminSearchInput = document.getElementById("adminSearchInput");
const adminUserList = document.getElementById("adminUserList");
const adminSelectedUser = document.getElementById("adminSelectedUser");
const adminCoinInput = document.getElementById("adminCoinInput");
const adminAddCoinBtn = document.getElementById("adminAddCoinBtn");
const adminRemoveCoinBtn = document.getElementById("adminRemoveCoinBtn");
const adminResetAvatarBtn = document.getElementById("adminResetAvatarBtn");
const adminStatus = document.getElementById("adminStatus");
const dailyLoginBonusOverlay = document.getElementById("dailyLoginBonusOverlay");
const dailyLoginBonusGrid = document.getElementById("dailyLoginBonusGrid");
const dailyLoginBonusResult = document.getElementById("dailyLoginBonusResult");
const dailyLoginBonusResultRank = document.getElementById("dailyLoginBonusResultRank");
const dailyLoginBonusResultCoin = document.getElementById("dailyLoginBonusResultCoin");
const dailyLoginBonusStage = document.querySelector(".daily-login-bonus-stage");
const dailyLoginBonusScale = document.querySelector(".daily-login-bonus-scale");

const SELECTGAME_VOLUME_STORAGE_KEY = "daifugo_app_volume_v1";
const SELECTGAME_SETTINGS_OVERLAY_ID = "selectgameSettingsOverlay";
const RENAME_COST_COIN = 100;

let currentUser = null;
let currentProfile = null;
let isAdminUser = false;
let adminUsers = [];
let adminSelectedUid = "";
let stopOnlineUsersSubscription = null;
let selectgameBgmAudio = null;
let selectgameAudioUnlocked = false;
let selectgameSettingsButton = null;
let selectgameSettingsCloseButton = null;
let selectgameSettingsOverlay = null;
let selectgameSeVolumeSlider = null;
let selectgameBgmVolumeSlider = null;
let selectgameSeVolumeValue = null;
let selectgameBgmVolumeValue = null;
let selectgameSettingsNicknameInput = null;
let selectgameSettingsSaveNicknameButton = null;
let selectgameSettingsMessage = null;
let dailyLoginBonusClosingHandlerAttached = false;
let avatarSelectScreen = null;
let avatarGachaScreen = null;
let avatarGachaIntroScreen = null;
let gameSelectTopbar = null;
let adminTopbar = null;
const SELECTGAME_BGM_PATH = "./audio/bgm/seiseigame.wav";
const AVATAR_FRAGMENT_IMAGE = "img/その他/アバターの欠片.png";

const ADMIN_EMAILS = ["takoponnsama6630@gmail.com"];
const AVATAR_GACHA_POOL = [
  { id: "avatar_1", name: "1-虹靴", image: "img/アバター/1-虹靴.png", rarity: "C" },
  { id: "avatar_2", name: "2-古い野球玉", image: "img/アバター/2-古い野球玉.png", rarity: "C" },
  { id: "avatar_3", name: "3-焼きちくわ", image: "img/アバター/3-焼きちくわ.png", rarity: "C" },
  { id: "avatar_4", name: "4-ブルーアップル", image: "img/アバター/4-ブルーアップル.png", rarity: "C" },
  { id: "avatar_5", name: "5-チーズ", image: "img/アバター/5-チーズ.png", rarity: "C" },
  { id: "avatar_6", name: "6-カラースプレー", image: "img/アバター/6-カラースプレー.png", rarity: "C" },
  { id: "avatar_41", name: "41-ネズミ", image: "img/アバター/41-ネズミ.png", rarity: "B" },
  { id: "avatar_42", name: "42-ピンクカエル", image: "img/アバター/42-ピンクカエル.png", rarity: "B" },
  { id: "avatar_43", name: "43-タバコマン", image: "img/アバター/43-タバコマン.png", rarity: "B" },
  { id: "avatar_44", name: "44-凶悪アヒル", image: "img/アバター/44-凶悪アヒル.png", rarity: "B" },
  { id: "avatar_71", name: "71-素ゴリ", image: "img/アバター/71-素ゴリ.png", rarity: "A" },
  { id: "avatar_72", name: "72-素りな", image: "img/アバター/72-素りな.png", rarity: "A" },
  { id: "avatar_73", name: "73-素めそ", image: "img/アバター/73-素めそ.png", rarity: "A" },
  { id: "avatar_91", name: "91-カエルゴリ", image: "img/アバター/91-カエルゴリ.png", rarity: "S" },
  { id: "avatar_92", name: "92-カエルりな", image: "img/アバター/92-カエルりな.png", rarity: "S" },
  { id: "avatar_93", name: "93-カエルめそ", image: "img/アバター/93-カエルめそ.png", rarity: "S" },
];

function setMessage(text = "") {
  if (message) {
    message.textContent = text;
  }
}

function sanitizeNickname(value = "") {
  return String(value).trim().replace(/\s+/g, " ").slice(0, 20);
}

function getFallbackNickname(user) {
  const fromName = sanitizeNickname(user && user.displayName ? user.displayName : "");
  if (fromName) return fromName;

  const email = String(user && user.email ? user.email : "");
  const fromEmail = sanitizeNickname(email.split("@")[0] || "");
  if (fromEmail) return fromEmail;

  return "ゲスト";
}

function isAdminAccount(user) {
  if (!user) return false;
  return ADMIN_EMAILS.includes(String(user.email || "").toLowerCase());
}

function clampSelectgameVolume(value) {
  if (!Number.isFinite(Number(value))) return 100;
  return Math.max(0, Math.min(100, Number(value)));
}

function getStoredSelectgameVolumes() {
  try {
    const raw = localStorage.getItem(SELECTGAME_VOLUME_STORAGE_KEY);
    const saved = raw ? JSON.parse(raw) : {};
    return {
      se: clampSelectgameVolume(saved && saved.se),
      bgm: clampSelectgameVolume(saved && saved.bgm),
    };
  } catch (error) {
    console.error(error);
    return { se: 100, bgm: 100 };
  }
}

function saveStoredSelectgameVolumes(nextVolumes) {
  const safeVolumes = {
    se: clampSelectgameVolume(nextVolumes && nextVolumes.se),
    bgm: clampSelectgameVolume(nextVolumes && nextVolumes.bgm),
  };
  try {
    localStorage.setItem(SELECTGAME_VOLUME_STORAGE_KEY, JSON.stringify(safeVolumes));
  } catch (error) {
    console.error(error);
  }
  return safeVolumes;
}

function applySelectgameBgmVolume() {
  if (!selectgameBgmAudio) return;
  selectgameBgmAudio.volume = getStoredSelectgameVolumes().bgm / 100;
}

function ensureSelectgameBgm() {
  if (selectgameBgmAudio) return selectgameBgmAudio;
  try {
    const audio = new Audio(SELECTGAME_BGM_PATH);
    audio.loop = true;
    audio.preload = "auto";
    audio.playsInline = true;
    selectgameBgmAudio = audio;
    applySelectgameBgmVolume();
  } catch (error) {
    console.error(error);
  }
  return selectgameBgmAudio;
}

function primeSelectgameBgmFromGesture() {
  const audio = ensureSelectgameBgm();
  if (!audio || selectgameAudioUnlocked) return;
  try {
    applySelectgameBgmVolume();
    const playPromise = audio.play();
    if (playPromise && typeof playPromise.then === "function") {
      playPromise.then(function() {
        selectgameAudioUnlocked = true;
        audio.pause();
        audio.currentTime = 0;
      }).catch(function(error) {
        console.error(error);
      });
      return;
    }
    selectgameAudioUnlocked = true;
    audio.pause();
    audio.currentTime = 0;
  } catch (error) {
    console.error(error);
  }
}

function ensureSelectgameSettingsUi() {
  if (selectgameSettingsOverlay && selectgameSettingsButton) return;
  if (!gameSelectScreen) return;

  ensureSharedTopbars();
  if (!selectgameSettingsButton && gameSelectTopbar && typeof gameSelectTopbar.getButton === "function") {
    selectgameSettingsButton = gameSelectTopbar.getButton("settings");
  }

  if (selectgameSettingsOverlay) return;

  const overlay = document.createElement("div");
  overlay.id = SELECTGAME_SETTINGS_OVERLAY_ID;
  overlay.className = "settingsOverlay hidden";
  overlay.setAttribute("aria-hidden", "true");
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.display = "flex";
  overlay.style.alignItems = "center";
  overlay.style.justifyContent = "center";
  overlay.style.padding = "20px";
  overlay.style.background = "rgba(3, 6, 16, 0.62)";
  overlay.style.backdropFilter = "blur(10px)";
  overlay.style.zIndex = "16000";

  const modal = document.createElement("div");
  modal.className = "settingsModal";
  modal.style.width = "min(100%, 560px)";
  modal.style.maxHeight = "min(88dvh, 820px)";
  modal.style.overflowY = "auto";
  modal.style.padding = "22px 18px 18px";
  modal.style.borderRadius = "24px";
  modal.style.border = "1px solid rgba(255,255,255,0.12)";
  modal.style.background = "rgba(18, 10, 36, 0.96)";
  modal.style.boxShadow = "0 26px 80px rgba(0,0,0,0.42)";

  const head = document.createElement("div");
  head.style.display = "flex";
  head.style.alignItems = "center";
  head.style.justifyContent = "space-between";
  head.style.gap = "12px";
  head.style.marginBottom = "14px";

  const titleWrap = document.createElement("div");
  const mini = document.createElement("div");
  mini.textContent = "SETTINGS";
  mini.style.fontSize = "11px";
  mini.style.fontWeight = "800";
  mini.style.letterSpacing = "0.12em";
  mini.style.color = "rgba(255,243,204,0.72)";
  mini.style.marginBottom = "6px";

  const title = document.createElement("div");
  title.textContent = "設定";
  title.style.fontSize = "22px";
  title.style.lineHeight = "1.2";
  title.style.fontWeight = "900";
  title.style.color = "#f8f5ff";

  titleWrap.appendChild(mini);
  titleWrap.appendChild(title);

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.textContent = "閉じる";
  closeButton.style.width = "auto";
  closeButton.style.minWidth = "92px";
  closeButton.style.height = "48px";
  closeButton.style.padding = "0 16px";
  closeButton.style.borderRadius = "14px";
  closeButton.style.color = "#f8f5ff";
  closeButton.style.background = "rgba(255,255,255,0.08)";
  closeButton.style.border = "1px solid rgba(255,255,255,0.14)";
  closeButton.style.fontSize = "16px";
  closeButton.style.fontWeight = "900";
  closeButton.addEventListener("click", function() {
    closeSelectgameSettings();
  });
  selectgameSettingsCloseButton = closeButton;

  head.appendChild(titleWrap);
  head.appendChild(closeButton);

  function createVolumePanel(labelText) {
    const panel = document.createElement("div");
    panel.style.padding = "14px 16px";
    panel.style.borderRadius = "18px";
    panel.style.border = "1px solid rgba(255,255,255,0.1)";
    panel.style.background = "rgba(255,255,255,0.06)";
    panel.style.marginBottom = "12px";

    const label = document.createElement("div");
    label.textContent = labelText;
    label.style.fontSize = "14px";
    label.style.fontWeight = "800";
    label.style.color = "#ffe39a";
    label.style.letterSpacing = "0.02em";
    label.style.marginBottom = "10px";

    const row = document.createElement("div");
    row.style.display = "flex";
    row.style.alignItems = "center";
    row.style.gap = "12px";

    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = "0";
    slider.max = "100";
    slider.step = "1";
    slider.style.flex = "1";

    const value = document.createElement("div");
    value.style.minWidth = "44px";
    value.style.textAlign = "right";
    value.style.fontSize = "13px";
    value.style.fontWeight = "800";
    value.style.color = "rgba(248,245,255,0.78)";

    row.appendChild(slider);
    row.appendChild(value);
    panel.appendChild(label);
    panel.appendChild(row);

    return { panel, slider, value };
  }

  const sePanelSet = createVolumePanel("SE");
  const bgmPanelSet = createVolumePanel("BGM");

  sePanelSet.slider.addEventListener("input", function() {
    const current = getStoredSelectgameVolumes();
    const safe = saveStoredSelectgameVolumes({ se: sePanelSet.slider.value, bgm: current.bgm });
    if (selectgameSeVolumeValue) selectgameSeVolumeValue.textContent = String(safe.se);
  });

  bgmPanelSet.slider.addEventListener("input", function() {
    const current = getStoredSelectgameVolumes();
    const safe = saveStoredSelectgameVolumes({ se: current.se, bgm: bgmPanelSet.slider.value });
    if (selectgameBgmVolumeValue) selectgameBgmVolumeValue.textContent = String(safe.bgm);
    applySelectgameBgmVolume();
  });

  const namePanel = document.createElement("div");
  namePanel.style.padding = "14px 16px";
  namePanel.style.borderRadius = "18px";
  namePanel.style.border = "1px solid rgba(255,255,255,0.1)";
  namePanel.style.background = "rgba(255,255,255,0.06)";

  const nameLabel = document.createElement("div");
  nameLabel.textContent = "名前変更（100コイン消費）";
  nameLabel.style.fontSize = "14px";
  nameLabel.style.fontWeight = "800";
  nameLabel.style.color = "#ffe39a";
  nameLabel.style.letterSpacing = "0.02em";
  nameLabel.style.marginBottom = "10px";

  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.maxLength = 20;
  nameInput.placeholder = "ニックネームを入力";
  nameInput.style.width = "100%";
  nameInput.style.padding = "14px 16px";
  nameInput.style.borderRadius = "16px";
  nameInput.style.border = "1px solid rgba(255,255,255,0.12)";
  nameInput.style.background = "rgba(255,255,255,0.06)";
  nameInput.style.color = "#f8f5ff";
  nameInput.style.fontSize = "16px";
  nameInput.style.outline = "none";
  nameInput.style.marginBottom = "12px";

  const saveButton = document.createElement("button");
  saveButton.type = "button";
  saveButton.textContent = "名前を変更する";
  saveButton.style.width = "100%";
  saveButton.style.height = "46px";
  saveButton.style.border = "1px solid rgba(255,255,255,0.14)";
  saveButton.style.borderRadius = "14px";
  saveButton.style.background = "linear-gradient(90deg, #7dd3fc, #a5b4fc)";
  saveButton.style.color = "#08111f";
  saveButton.style.fontSize = "15px";
  saveButton.style.fontWeight = "900";

  const settingsMessage = document.createElement("div");
  settingsMessage.style.minHeight = "20px";
  settingsMessage.style.marginTop = "10px";
  settingsMessage.style.fontSize = "13px";
  settingsMessage.style.color = "rgba(248,245,255,0.78)";

  saveButton.addEventListener("click", async function() {
    if (!currentUser) {
      settingsMessage.textContent = "ログイン後に変更できます";
      settingsMessage.style.color = "#ffd2d2";
      return;
    }
    const nickname = sanitizeNickname(nameInput.value);
    if (!nickname) {
      settingsMessage.textContent = "名前を入れてください";
      settingsMessage.style.color = "#ffd2d2";
      return;
    }
    const currentName = sanitizeNickname((currentProfile && currentProfile.nickname) || "");
    if (nickname === currentName) {
      settingsMessage.textContent = "同じ名前です";
      settingsMessage.style.color = "#ffd2d2";
      return;
    }
    saveButton.disabled = true;
    settingsMessage.textContent = "";
    try {
      if (currentName) {
        await useUserCoin(RENAME_COST_COIN, currentUser);
      }
      await updateUserData({ nickname }, currentUser);
      await loadProfile(currentUser);
      nameInput.value = sanitizeNickname((currentProfile && currentProfile.nickname) || "");
      settingsMessage.textContent = currentName ? "名前を変更しました" : "ニックネームを登録しました";
      settingsMessage.style.color = "rgba(248,245,255,0.78)";
    } catch (error) {
      console.error(error);
      settingsMessage.textContent = error && error.message ? error.message : "変更に失敗しました";
      settingsMessage.style.color = "#ffd2d2";
    } finally {
      saveButton.disabled = false;
    }
  });

  namePanel.appendChild(nameLabel);
  namePanel.appendChild(nameInput);
  namePanel.appendChild(saveButton);
  namePanel.appendChild(settingsMessage);

  modal.appendChild(head);
  modal.appendChild(sePanelSet.panel);
  modal.appendChild(bgmPanelSet.panel);
  modal.appendChild(namePanel);
  overlay.appendChild(modal);
  overlay.addEventListener("click", function(event) {
    if (event.target === overlay) closeSelectgameSettings();
  });
  document.body.appendChild(overlay);

  selectgameSettingsOverlay = overlay;
  selectgameSeVolumeSlider = sePanelSet.slider;
  selectgameBgmVolumeSlider = bgmPanelSet.slider;
  selectgameSeVolumeValue = sePanelSet.value;
  selectgameBgmVolumeValue = bgmPanelSet.value;
  selectgameSettingsNicknameInput = nameInput;
  selectgameSettingsSaveNicknameButton = saveButton;
  selectgameSettingsMessage = settingsMessage;
}

function openSelectgameSettings() {
  ensureSelectgameSettingsUi();
  if (!selectgameSettingsOverlay) return;
  const currentVolumes = getStoredSelectgameVolumes();
  if (selectgameSeVolumeSlider) selectgameSeVolumeSlider.value = String(currentVolumes.se);
  if (selectgameBgmVolumeSlider) selectgameBgmVolumeSlider.value = String(currentVolumes.bgm);
  if (selectgameSeVolumeValue) selectgameSeVolumeValue.textContent = String(currentVolumes.se);
  if (selectgameBgmVolumeValue) selectgameBgmVolumeValue.textContent = String(currentVolumes.bgm);
  if (selectgameSettingsNicknameInput) {
    selectgameSettingsNicknameInput.value = sanitizeNickname((currentProfile && currentProfile.nickname) || "");
  }
  if (selectgameSettingsMessage) {
    selectgameSettingsMessage.textContent = "";
    selectgameSettingsMessage.style.color = "rgba(248,245,255,0.78)";
  }
  selectgameSettingsOverlay.classList.remove("hidden");
  selectgameSettingsOverlay.setAttribute("aria-hidden", "false");
}

function closeSelectgameSettings() {
  if (!selectgameSettingsOverlay) return;
  selectgameSettingsOverlay.classList.add("hidden");
  selectgameSettingsOverlay.setAttribute("aria-hidden", "true");
}

function syncSelectgameSettingsVisibility() {
  ensureSelectgameSettingsUi();
  if (!selectgameSettingsButton) return;
  const open = !!(gameSelectScreen && gameSelectScreen.classList.contains("show"));
  selectgameSettingsButton.style.display = open ? "inline-flex" : "none";
  if (!open) closeSelectgameSettings();
}

function playSelectgameBgm() {
  const audio = ensureSelectgameBgm();
  if (!audio) return;
  try {
    applySelectgameBgmVolume();
    if (!audio.paused) return;
    audio.play().then(function() {
      selectgameAudioUnlocked = true;
    }).catch(function(error) {
      console.error(error);
    });
  } catch (error) {
    console.error(error);
  }
}

function stopSelectgameBgm() {
  if (!selectgameBgmAudio) return;
  try {
    selectgameBgmAudio.pause();
    selectgameBgmAudio.currentTime = 0;
  } catch (error) {
    console.error(error);
  }
}

function setAdminEntryVisible(visible) {
  if (gameSelectTopbar) {
    gameSelectTopbar.setButtonVisible("admin", Boolean(visible));
  }
}

function setAdminStatus(text = "") {
  if (adminStatus) {
    adminStatus.textContent = text;
  }
}

function openAdminScreen() {
  if (adminScreen) {
    adminScreen.classList.add("show");
  }
}

async function getAdminDataModule() {
  return import("./shared/userDate.js");
}

function closeAdminScreen() {
  if (stopOnlineUsersSubscription) {
    stopOnlineUsersSubscription();
    stopOnlineUsersSubscription = null;
  }
  if (adminScreen) {
    adminScreen.classList.remove("show");
  }
}

function resetAdminView() {
  adminUsers = [];
  adminSelectedUid = "";
  if (adminSearchInput) adminSearchInput.value = "";
  if (adminCoinInput) adminCoinInput.value = "";
  if (adminSelectedUser) adminSelectedUser.textContent = "対象ユーザーを選んでください。";
  if (adminUserList) adminUserList.innerHTML = '<div class="admin-empty">読み込み前です。</div>';
  setAdminStatus("");
}

function renderAdminUsers(keyword = "") {
  if (!adminUserList) return;

  const search = String(keyword || "").trim().toLowerCase();
  const filtered = adminUsers.filter((user) => {
    if (!search) return true;
    const text = `${user.nickname || ""} ${user.name || ""} ${user.email || ""}`.toLowerCase();
    return text.includes(search);
  });

  if (!filtered.length) {
    adminUserList.innerHTML = '<div class="admin-empty">該当ユーザーがいません。</div>';
    return;
  }

  adminUserList.innerHTML = filtered.map((user) => {
    const label = user.nickname || user.name || "名前なし";
    const email = user.email || "オンライン中";
    const coin = Number.isFinite(Number(user.coin)) ? Number(user.coin) : null;
    return `
      <button type="button" class="admin-user-item" data-admin-user="${user.uid}">
        <div class="admin-user-main">
          <div class="admin-user-name">${label}</div>
          <div class="admin-user-sub">${email}</div>
        </div>
        <div class="admin-user-coin">${coin === null ? "オンライン中" : `コイン: ${coin}`}</div>
      </button>
    `;
  }).join("");

  adminUserList.querySelectorAll("[data-admin-user]").forEach((button) => {
    button.addEventListener("click", () => {
      adminSelectedUid = button.getAttribute("data-admin-user") || "";
      const target = adminUsers.find((user) => user.uid === adminSelectedUid);
      if (!target) return;
      if (adminSelectedUser) {
        adminSelectedUser.textContent = `${target.nickname || target.name || "名前なし"} / ${target.email || "オンライン中"} / ${Number.isFinite(Number(target.coin)) ? `コイン: ${Number(target.coin)}` : "オンライン中"}`;
      }
      setAdminStatus("");
    });
  });
}

async function loadAdminUsers() {
  if (!isAdminUser) return;
  if (stopOnlineUsersSubscription) {
    stopOnlineUsersSubscription();
    stopOnlineUsersSubscription = null;
  }
  adminUsers = [];
  if (adminUserList) {
    adminUserList.innerHTML = '<div class="admin-empty">読み込み中です。</div>';
  }
  setAdminStatus("");

  const adminModule = await getAdminDataModule();
  const getAllUsersData = adminModule && typeof adminModule.getAllUsersData === "function"
    ? adminModule.getAllUsersData
    : null;

  if (!getAllUsersData) {
    if (adminUserList) {
      adminUserList.innerHTML = '<div class="admin-empty">一覧取得の接続に失敗しました。</div>';
    }
    setAdminStatus("一覧取得の接続に失敗しました。");
    return;
  }

  const list = await getAllUsersData(currentUser);
  adminUsers = Array.isArray(list) ? list : [];
  renderAdminUsers(adminSearchInput ? adminSearchInput.value : "");
}

async function applyAdminCoin(mode) {
  if (!isAdminUser) return;
  if (!adminSelectedUid) {
    setAdminStatus("対象ユーザーを選んでください。");
    return;
  }
  const amount = Math.max(0, Math.floor(Number(adminCoinInput ? adminCoinInput.value : 0)));
  if (!amount) {
    setAdminStatus("コイン数を入力してください。");
    return;
  }

  const adminModule = await getAdminDataModule();
  const addUserCoinByUid = adminModule && typeof adminModule.addUserCoinByUid === "function"
    ? adminModule.addUserCoinByUid
    : null;
  const useUserCoinByUid = adminModule && typeof adminModule.useUserCoinByUid === "function"
    ? adminModule.useUserCoinByUid
    : null;

  if ((mode === "add" && !addUserCoinByUid) || (mode !== "add" && !useUserCoinByUid)) {
    setAdminStatus("コイン操作の接続に失敗しました。");
    return;
  }

  setAdminStatus("更新中です。");

  const updated = mode === "add"
    ? await addUserCoinByUid(adminSelectedUid, amount, currentUser)
    : await useUserCoinByUid(adminSelectedUid, amount, currentUser);

  adminUsers = adminUsers.map((user) => user.uid === updated.uid ? updated : user);
  renderAdminUsers(adminSearchInput ? adminSearchInput.value : "");

  if (adminSelectedUser) {
    adminSelectedUser.textContent = `${updated.nickname || updated.name || "名前なし"} / ${updated.email || "オンライン中"} / ${Number.isFinite(Number(updated.coin)) ? `コイン: ${Number(updated.coin)}` : "オンライン中"}`;
  }

  if (currentUser && updated.uid === currentUser.uid) {
    currentProfile = {
      ...(currentProfile || {}),
      ...updated,
      isAdmin: true,
    };
    applyProfileToGameSelect(currentProfile, currentUser);
  }

  if (adminCoinInput) adminCoinInput.value = "";
  setAdminStatus(mode === "add" ? "コインを付与しました。" : "コインを没収しました。");
}

async function applyAdminAvatarReset() {
  if (!isAdminUser) return;
  if (!adminSelectedUid) {
    setAdminStatus("対象ユーザーを選んでください。");
    return;
  }

  setAdminStatus("リセット中です。");

  const updated = await resetUserAvatarByUid(adminSelectedUid, currentUser);

  adminUsers = adminUsers.map((user) => user.uid === updated.uid ? updated : user);
  renderAdminUsers(adminSearchInput ? adminSearchInput.value : "");

  if (adminSelectedUser) {
    adminSelectedUser.textContent = `${updated.nickname || updated.name || "名前なし"} / ${updated.email || "オンライン中"} / ${Number.isFinite(Number(updated.coin)) ? `コイン: ${Number(updated.coin)}` : "オンライン中"}`;
  }

  if (currentUser && updated.uid === currentUser.uid) {
    currentProfile = {
      ...(currentProfile || {}),
      ...updated,
      isAdmin: true,
    };
    applyProfileToGameSelect(currentProfile, currentUser);
  }

  setAdminStatus("アバター所持をリセットしました。");
}

async function loadProfile(user) {
  try {
    const data = await getUserData(user);
    currentProfile = data;
    isAdminUser = Boolean(data && data.isAdmin) || isAdminAccount(user);
    applyProfileToGameSelect(data, user);
    return data;
  } catch (error) {
    console.error(error);
    const fallback = {
      nickname: "",
      coin: 0,
      isAdmin: isAdminAccount(user),
    };
    currentProfile = fallback;
    isAdminUser = fallback.isAdmin;
    applyProfileToGameSelect(fallback, user);
    return fallback;
  }
}

function openNicknameModal(defaultValue = "") {
  if (!nicknameModal || !nicknameInput || !nicknameError) return;
  nicknameError.textContent = "";
  nicknameInput.value = defaultValue;
  nicknameModal.classList.add("show");
  requestAnimationFrame(() => nicknameInput.focus());
}

function closeNicknameModal() {
  if (!nicknameModal || !nicknameError) return;
  nicknameModal.classList.remove("show");
  nicknameError.textContent = "";
}

function showFirstLoginBonusOverlay() {
  const overlay = document.getElementById("firstLoginBonusOverlay");
  if (!overlay) return;
  overlay.classList.add("show");
  if (!overlay.dataset.bound) {
    overlay.addEventListener("click", function() {
      overlay.classList.remove("show");
    });
    overlay.dataset.bound = "1";
  }
}

function buildDailyLoginBonusCardSlots() {
  return Array.from({ length: 50 }, function(_, index) {
    return { index };
  });
}

function closeDailyLoginBonusOverlay() {
  if (dailyLoginBonusOverlay) {
    dailyLoginBonusOverlay.classList.remove("show");
  }
}

function closeDailyLoginBonusResult() {
  if (dailyLoginBonusResult) {
    dailyLoginBonusResult.classList.remove("show");
  }
}

function applyDailyLoginBonusAutoScale() {
  if (!dailyLoginBonusScale || !dailyLoginBonusOverlay) return;

  const overlayWidth = dailyLoginBonusOverlay.clientWidth;
  const overlayHeight = dailyLoginBonusOverlay.clientHeight;
  if (!overlayWidth || !overlayHeight) return;

  const baseWidth = 1184;
  const baseHeight = 900;
  const horizontalPadding = overlayWidth > 1100 ? 48 : 28;
  const verticalPadding = overlayWidth > 1100 ? 48 : 28;
  const nextScale = Math.min(
    1,
    (overlayWidth - horizontalPadding) / baseWidth,
    (overlayHeight - verticalPadding) / baseHeight,
  );

  dailyLoginBonusScale.style.transform = overlayWidth > 1100
    ? `scale(${Math.max(0.1, nextScale)})`
    : "none";
}

function bindDailyLoginBonusAutoScale() {
  applyDailyLoginBonusAutoScale();
}

function showDailyLoginBonusResult(rank, coin) {
  if (!dailyLoginBonusResult || !dailyLoginBonusResultRank || !dailyLoginBonusResultCoin) return;
  dailyLoginBonusResultRank.textContent = String(rank || "");
  dailyLoginBonusResultCoin.textContent = `${Number(coin || 0)}コイン`;
  dailyLoginBonusResult.classList.add("show");
  if (!dailyLoginBonusClosingHandlerAttached) {
    dailyLoginBonusResult.addEventListener("click", function() {
      closeDailyLoginBonusResult();
    });
    dailyLoginBonusClosingHandlerAttached = true;
  }
}

function showDailyLoginBonusPicker(onPick) {
  if (!dailyLoginBonusOverlay || !dailyLoginBonusGrid) return;
  const cards = buildDailyLoginBonusCardSlots();
  dailyLoginBonusGrid.innerHTML = "";

  cards.forEach(function(card) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "daily-login-bonus-card";
    button.textContent = "?";
    button.addEventListener("click", async function() {
      const buttons = dailyLoginBonusGrid.querySelectorAll(".daily-login-bonus-card");
      buttons.forEach(function(item) {
        item.disabled = true;
      });
      try {
        await onPick(card);
      } catch (error) {
        console.error(error);
      }
    }, { once: true });
    dailyLoginBonusGrid.appendChild(button);
  });

  dailyLoginBonusOverlay.classList.add("show");
  bindDailyLoginBonusAutoScale();
}

async function openGameSelectWithBonus() {
  closeAdminScreen();
  openGameSelectScreen();

  try {
    const firstResult = await grantFirstGameSelectLoginBonus(currentUser);
    if (firstResult && firstResult.userData) {
      currentProfile = firstResult.userData;
      applyProfileToGameSelect(firstResult.userData, currentUser);
      if (firstResult.awarded) {
        showFirstLoginBonusOverlay();
      }
    }

    const dailyResult = await grantDailyLoginBonus(currentUser);
    if (dailyResult && dailyResult.userData) {
      currentProfile = dailyResult.userData;
      applyProfileToGameSelect(dailyResult.userData, currentUser);
    }

    if (dailyResult && dailyResult.available) {
      showDailyLoginBonusPicker(async function(card) {
        const confirmed = await grantDailyLoginBonus(currentUser, card);
        if (confirmed && confirmed.userData) {
          currentProfile = confirmed.userData;
          applyProfileToGameSelect(confirmed.userData, currentUser);
        }
        closeDailyLoginBonusOverlay();
        showDailyLoginBonusResult(
          confirmed && confirmed.rank ? confirmed.rank : "",
          confirmed && Number.isFinite(Number(confirmed.amount)) ? confirmed.amount : 0,
        );
      });
    }
  } catch (error) {
    console.error(error);
  }
}

function getAvatarPoolMap() {
  return AVATAR_GACHA_POOL.reduce(function(map, item) {
    map.set(String(item.id), item);
    return map;
  }, new Map());
}

function getProfileAvatarImage(profile, user) {
  const selectedAvatar = String(profile && profile.selectedAvatar ? profile.selectedAvatar : "");
  const avatarInfo = getAvatarPoolMap().get(selectedAvatar);
  if (avatarInfo && avatarInfo.image) {
    return avatarInfo.image;
  }
  return "";
}

function setCircleAvatar(element, imagePath, altText) {
  if (!element) return;
  element.innerHTML = "";
  element.style.background = "rgba(255, 255, 255, 0.08)";
  element.style.backgroundImage = "none";
  element.style.backgroundPosition = "center";
  element.style.backgroundSize = "cover";
  element.style.backgroundRepeat = "no-repeat";

  if (!imagePath) return;

  if (element.tagName === "IMG") {
    element.src = imagePath;
    element.alt = altText || "avatar";
    return;
  }

  element.style.backgroundImage = `url("${String(imagePath).replace(/"/g, '\"')}")`;
}

function ensureSharedTopbars() {
  if (!gameSelectTopbar && gameSelectTopbarMount) {
    gameSelectTopbar = createTopbar({
      profile: {
        nickname: "---",
        coin: 0,
        photoURL: "",
      },
      actions: [
        {
          id: "settings",
          label: "⚙",
          gear: true,
          ariaLabel: "設定",
          onClick: function() {
            openSelectgameSettings();
          },
        },
        {
          id: "avatar",
          label: "アバター変更",
          onClick: async function() {
            if (!currentUser) return;
            try {
              await loadProfile(currentUser);
              openAvatarSelectScreen();
            } catch (error) {
              console.error(error);
              setMessage("アバター表示に失敗しました。");
            }
          },
        },
        {
          id: "admin",
          label: "運営",
          hidden: true,
          onClick: async function() {
            if (!isAdminUser) return;
            resetAdminView();
            openAdminScreen();
            try {
              await loadAdminUsers();
            } catch (error) {
              console.error(error);
              if (adminUserList) {
                adminUserList.innerHTML = '<div class="admin-empty">オンライン一覧の読み込みに失敗しました。</div>';
              }
              setAdminStatus("オンライン一覧の読み込みに失敗しました。");
            }
          },
        },
        {
          id: "home",
          label: "ホーム",
          onClick: function() {
            closeAdminScreen();
            closeGameSelectScreen();
          },
        },
      ],
    });
    gameSelectTopbarMount.appendChild(gameSelectTopbar.element);
  }

  if (!adminTopbar && adminTopbarMount) {
    adminTopbar = createTopbar({
      profile: {
        nickname: "運営ページ",
        subText: "管理メニュー",
        photoURL: "",
      },
      actions: [
        {
          id: "close",
          label: "閉じる",
          onClick: function() {
            closeAdminScreen();
          },
        },
      ],
    });
    adminTopbarMount.appendChild(adminTopbar.element);
  }
}

function applyTopbarProfiles(profile) {
  const nickname = profile && profile.nickname ? profile.nickname : "ニックネーム未設定";
  const coin = Number((profile && profile.coin) || 0);
  const avatarImage = getProfileAvatarImage(profile, currentUser);

  if (gameSelectTopbar) {
    gameSelectTopbar.setProfile({
      nickname,
      coin,
      photoURL: avatarImage,
    });
    gameSelectTopbar.setButtonVisible("admin", Boolean(isAdminUser));
  }

  if (adminTopbar) {
    adminTopbar.setProfile({
      nickname,
      subText: `管理中 / コイン: ${coin}`,
      photoURL: avatarImage,
    });
  }
}

function applyProfileToGameSelect(profile, user) {
  const nickname = profile && profile.nickname ? profile.nickname : "ニックネーム未設定";
  const coin = Number((profile && profile.coin) || 0);
  const avatarImage = getProfileAvatarImage(profile, user);

  if (userName) {
    userName.textContent = nickname;
  }
  applyTopbarProfiles(profile);
  setCircleAvatar(userPhoto, avatarImage, nickname);
  if (avatarSelectScreen) {
    if (typeof avatarSelectScreen.setAvatars === "function") {
      avatarSelectScreen.setAvatars(
        getAvatarOptions(profile),
        profile && profile.selectedAvatar ? profile.selectedAvatar : "default",
      );
    }
    if (typeof avatarSelectScreen.setProfile === "function") {
      avatarSelectScreen.setProfile({
        nickname,
        coin,
        photoURL: avatarImage,
      });
    }
  }
  if (avatarGachaScreen && typeof avatarGachaScreen.setProfile === "function") {
    avatarGachaScreen.setProfile({
      nickname,
      coin,
      photoURL: avatarImage,
    });
  }
  if (avatarGachaIntroScreen && typeof avatarGachaIntroScreen.setProfile === "function") {
    avatarGachaIntroScreen.setProfile({
      nickname,
      coin,
      photoURL: avatarImage,
    });
  }
}

async function ensureNicknameBeforeOpen() {
  if (!currentUser) return false;
  const data = await loadProfile(currentUser);
  const nickname = sanitizeNickname((data && data.nickname) || "");
  if (nickname) return true;
  openNicknameModal("");
  return false;
}

function pickAvatarGachaRarity() {
  const roll = Math.random() * 100;
  if (roll < 0.5) return "S";
  if (roll < 1.5) return "A";
  if (roll < 30) return "B";
  return "C";
}

function pickAvatarGachaItem() {
  const rarity = pickAvatarGachaRarity();
  const targets = AVATAR_GACHA_POOL.filter(function(item) {
    return item.rarity === rarity;
  });
  const pool = targets.length ? targets : AVATAR_GACHA_POOL;
  return pool[Math.floor(Math.random() * pool.length)];
}

function getAvatarOptions(profile) {
  const poolMap = getAvatarPoolMap();
  const poolItems = Array.from(poolMap.values());

  function normalizeAvatarId(value) {
    const raw = String(value || "").trim();
    if (!raw || raw === "default") return "";
    if (poolMap.has(raw)) return raw;

    const matched = raw.match(/(\d+)/);
    if (matched) {
      const byNumberId = "avatar_" + String(Number(matched[1]));
      if (poolMap.has(byNumberId)) return byNumberId;
    }

    const byName = poolItems.find(function(item) {
      return String(item && item.name ? item.name : "") === raw;
    });
    return byName ? byName.id : "";
  }

  const ownedAvatarSet = new Set(
    (Array.isArray(profile && profile.ownedAvatars) ? profile.ownedAvatars : [])
      .map(normalizeAvatarId)
      .filter(Boolean)
  );

  const selectedAvatar = normalizeAvatarId(profile && profile.selectedAvatar ? profile.selectedAvatar : "")
    || Array.from(ownedAvatarSet)[0]
    || "";

  const items = [];
  for (let no = 1; no <= 100; no += 1) {
    const id = "avatar_" + String(no);
    const avatarInfo = poolMap.get(id);
    const owned = ownedAvatarSet.has(id);
    items.push({
      id,
      no,
      name: avatarInfo && avatarInfo.name ? avatarInfo.name : "No" + String(no),
      note: "使うアバターを選べます",
      owned,
      image: owned && avatarInfo && avatarInfo.image ? String(avatarInfo.image).replace(/\\/g, "/") : "",
      selected: id === selectedAvatar,
    });
  }

  return items;
}

function createCommonTopbarActions(closeHandler) {
  return [
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
        openSelectgameSettings();
      },
    },
    {
      id: "avatar",
      label: "アバター変更",
      onClick: async function(event) {
        if (event) {
          event.preventDefault();
          event.stopPropagation();
        }
        if (!currentUser) return;
        try {
          await loadProfile(currentUser);
          openAvatarSelectScreen();
        } catch (error) {
          console.error(error);
          setMessage("アバター表示に失敗しました。");
        }
      },
    },
    {
      id: "admin",
      label: "運営",
      hidden: !isAdminUser,
      onClick: async function(event) {
        if (event) {
          event.preventDefault();
          event.stopPropagation();
        }
        if (!isAdminUser) return;
        if (typeof closeHandler === "function") {
          closeHandler();
        }
        resetAdminView();
        openAdminScreen();
        try {
          await loadAdminUsers();
        } catch (error) {
          console.error(error);
          if (adminUserList) {
            adminUserList.innerHTML = '<div class="admin-empty">オンライン一覧の読み込みに失敗しました。</div>';
          }
          setAdminStatus("オンライン一覧の読み込みに失敗しました。");
        }
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
        if (typeof closeHandler === "function") {
          closeHandler();
        }
      },
    },
  ];
}

function ensureAvatarSelectScreen() {
  if (avatarSelectScreen) return avatarSelectScreen;

  avatarSelectScreen = createAvatarSelectScreen({
    avatars: getAvatarOptions(currentProfile),
    selectedAvatarId: currentProfile && currentProfile.selectedAvatar ? currentProfile.selectedAvatar : "default",
    profile: {
      nickname: currentProfile && currentProfile.nickname ? currentProfile.nickname : "ニックネーム未設定",
      coin: Number((currentProfile && currentProfile.coin) || 0),
      photoURL: getProfileAvatarImage(currentProfile, currentUser),
    },
    topbarActions: createCommonTopbarActions(function() {
      if (avatarSelectScreen) {
        avatarSelectScreen.close();
      }
    }),
    onSelect: async function(item) {
      if (!currentUser || !item || !item.id) return;
      await selectAvatar(item.id, currentUser);
      await loadProfile(currentUser);
      if (avatarSelectScreen) {
        avatarSelectScreen.setAvatars(
          getAvatarOptions(currentProfile),
          currentProfile && currentProfile.selectedAvatar ? currentProfile.selectedAvatar : item.id,
        );
        avatarSelectScreen.setProfile({
          nickname: currentProfile && currentProfile.nickname ? currentProfile.nickname : "ニックネーム未設定",
          coin: Number((currentProfile && currentProfile.coin) || 0),
          photoURL: getProfileAvatarImage(currentProfile, currentUser),
        });
      }
    },
  });

  return avatarSelectScreen;
}

function openAvatarSelectScreen() {
  if (!currentUser) return;
  const screen = ensureAvatarSelectScreen();
  if (!screen) return;
  screen.setAvatars(
    getAvatarOptions(currentProfile),
    currentProfile && currentProfile.selectedAvatar ? currentProfile.selectedAvatar : "default",
  );
  screen.setProfile({
    nickname: currentProfile && currentProfile.nickname ? currentProfile.nickname : "ニックネーム未設定",
    coin: Number((currentProfile && currentProfile.coin) || 0),
    photoURL: getProfileAvatarImage(currentProfile, currentUser),
  });
  screen.setMessage("");
  screen.open();
}

function ensureAvatarGachaIntroScreen() {
  if (avatarGachaIntroScreen) return avatarGachaIntroScreen;

  const overlay = document.createElement("section");
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.zIndex = "14950";
  overlay.style.display = "none";
  overlay.style.background = "rgba(2, 6, 23, 0.96)";
  overlay.style.fontFamily = '"Segoe UI", "Hiragino Sans", "Yu Gothic UI", sans-serif';
  overlay.style.color = "#f8fafc";

  const wrap = document.createElement("div");
  wrap.style.width = "100%";
  wrap.style.height = "100%";
  wrap.style.padding = "24px";
  wrap.style.display = "flex";
  wrap.style.flexDirection = "column";
  wrap.style.gap = "18px";

  const topbarMount = document.createElement("div");

  const imageList = document.createElement("div");
  imageList.style.flex = "1";
  imageList.style.minHeight = "0";
  imageList.style.display = "flex";
  imageList.style.flexDirection = "column";
  imageList.style.alignItems = "stretch";
  imageList.style.gap = "18px";
  imageList.style.overflowY = "auto";
  imageList.style.paddingRight = "4px";

  const topbar = createTopbar({
    profile: {
      nickname: currentProfile && currentProfile.nickname ? currentProfile.nickname : "ニックネーム未設定",
      coin: Number((currentProfile && currentProfile.coin) || 0),
      photoURL: getProfileAvatarImage(currentProfile, currentUser),
    },
    actions: createCommonTopbarActions(function() {
      close();
    }),
  });

  function createIntroImage(src, enabled) {
    const isEnabled = enabled !== false;
    const imageWrap = document.createElement("div");
    imageWrap.style.width = "100%";
    imageWrap.style.flexShrink = "0";
    imageWrap.style.position = "relative";
    imageWrap.style.borderRadius = "24px";
    imageWrap.style.overflow = "hidden";
    imageWrap.style.background = "rgba(255,255,255,0.04)";
    imageWrap.style.border = "1px solid rgba(255,255,255,0.08)";
    imageWrap.style.display = "flex";
    imageWrap.style.alignItems = "center";
    imageWrap.style.justifyContent = "center";
    imageWrap.style.cursor = isEnabled ? "pointer" : "default";
    imageWrap.style.opacity = isEnabled ? "1" : "0.42";
    imageWrap.style.filter = isEnabled ? "none" : "brightness(0.68)";

    const image = document.createElement("img");
    image.alt = "ガチャ紹介";
    image.src = src;
    image.style.display = "block";
    image.style.width = "100%";
    image.style.height = "auto";
    image.style.maxHeight = "calc(100vh - 180px)";
    image.style.objectFit = "contain";
    image.style.userSelect = "none";
    image.style.webkitUserDrag = "none";

    imageWrap.appendChild(image);
    if (isEnabled) {
      imageWrap.addEventListener("click", function(event) {
        event.preventDefault();
        event.stopPropagation();
        close();
        openAvatarGachaScreen();
      });
    }

    return imageWrap;
  }

  const introImages = [
    createIntroImage("img/ガチャ画面/ガチャカエル版.png", true),
    createIntroImage("img/ガチャ画面/ガチャウサギ版.png", false),
    createIntroImage("img/ガチャ画面/ガチャサカナ版.png", false),
  ];

  topbarMount.appendChild(topbar.element);
  introImages.forEach(function(item) {
    imageList.appendChild(item);
  });
  wrap.append(topbarMount, imageList);
  overlay.appendChild(wrap);
  document.body.appendChild(overlay);

  function applyProfile() {
    const nickname = currentProfile && currentProfile.nickname ? currentProfile.nickname : "ニックネーム未設定";
    const coin = Number((currentProfile && currentProfile.coin) || 0);
    const avatarImage = getProfileAvatarImage(currentProfile, currentUser);
    topbar.setProfile({
      nickname,
      coin,
      photoURL: avatarImage,
    });
    topbar.setButtonVisible("admin", Boolean(isAdminUser));
  }

  function open() {
    applyProfile();
    overlay.style.display = "block";
  }

  function close() {
    overlay.style.display = "none";
  }

  avatarGachaIntroScreen = {
    open,
    close,
    setProfile: applyProfile,
  };

  return avatarGachaIntroScreen;
}

function ensureAvatarGachaScreen() {
  if (avatarGachaScreen) return avatarGachaScreen;

  avatarGachaScreen = createAvatarGachaScreen({
    avatarPool: AVATAR_GACHA_POOL,
    singleCost: 100,
    fiveCost: 500,
    profile: {
      nickname: currentProfile && currentProfile.nickname ? currentProfile.nickname : "ニックネーム未設定",
      coin: Number((currentProfile && currentProfile.coin) || 0),
      photoURL: getProfileAvatarImage(currentProfile, currentUser),
    },
    backgroundImage: "img/ガチャ画面/ガチャ背景.jpg",
    earthImage: "img/ガチャ画面/地球.jpg",
    singleButtonImage: "img/ガチャ画面/1回ガチャ.png",
    fiveButtonImage: "img/ガチャ画面/5回ガチャ.png",
    topbarActions: createCommonTopbarActions(function() {
      if (avatarGachaScreen) {
        avatarGachaScreen.close();
      }
    }),
    onSettings: function() {
      openSelectgameSettings();
    },
  });

  return avatarGachaScreen;
}

function openAvatarGachaScreen() {
  if (!currentUser) return;
  const screen = ensureAvatarGachaScreen();
  if (!screen) return;
  screen.setProfile({
    nickname: currentProfile && currentProfile.nickname ? currentProfile.nickname : "ニックネーム未設定",
    coin: Number((currentProfile && currentProfile.coin) || 0),
    photoURL: getProfileAvatarImage(currentProfile, currentUser),
  });
  screen.setMessage("");
  screen.hideResult();
  screen.open();

  if (screen.element && !screen.element.dataset.gachaBound) {
    screen.element.dataset.gachaBound = "1";

    if (typeof screen.playSingle === "function") {
      const originalPlaySingle = screen.playSingle;
      screen.playSingle = function() {
        return originalPlaySingle(async function() {
          if (!currentUser) throw new Error("ログインが必要です");
          const picked = pickAvatarGachaItem();
          const batchResult = await resolveAvatarGachaBatch([picked.id], 100, currentUser);
          if (batchResult && batchResult.userData) {
            currentProfile = batchResult.userData;
            applyProfileToGameSelect(batchResult.userData, currentUser);
          } else {
            await loadProfile(currentUser);
          }
          if (batchResult && Array.isArray(batchResult.duplicatedAvatarIds) && batchResult.duplicatedAvatarIds.includes(picked.id)) {
            return {
              ...picked,
              image: AVATAR_FRAGMENT_IMAGE,
              name: `アバターの欠片×${Number(batchResult.fragmentAmount || 0)}`,
            };
          }
          return picked;
        });
      };
    }

    if (typeof screen.playFive === "function") {
      const originalPlayFive = screen.playFive;
      screen.playFive = function() {
        return originalPlayFive(async function() {
          if (!currentUser) throw new Error("ログインが必要です");
          const picks = Array.from({ length: 5 }, function() {
            return pickAvatarGachaItem();
          });
          const batchResult = await resolveAvatarGachaBatch(
            picks.map(function(item) { return item.id; }),
            500,
            currentUser,
          );
          if (batchResult && batchResult.userData) {
            currentProfile = batchResult.userData;
            applyProfileToGameSelect(batchResult.userData, currentUser);
          } else {
            await loadProfile(currentUser);
          }

          const duplicatedRemain = Array.isArray(batchResult && batchResult.duplicatedAvatarIds)
            ? batchResult.duplicatedAvatarIds.slice()
            : [];

          return picks.map(function(picked) {
            const duplicatedIndex = duplicatedRemain.indexOf(picked.id);
            if (duplicatedIndex === -1) {
              return picked;
            }
            duplicatedRemain.splice(duplicatedIndex, 1);
            return {
              ...picked,
              image: AVATAR_FRAGMENT_IMAGE,
              name: `アバターの欠片×${Number(batchResult && batchResult.fragmentAmount || 0)}`,
            };
          });
        });
      };
    }
  }
}

function openAvatarGachaIntroScreen() {
  if (!currentUser) return;
  const screen = ensureAvatarGachaIntroScreen();
  if (!screen) return;
  screen.setProfile({
    nickname: currentProfile && currentProfile.nickname ? currentProfile.nickname : "ニックネーム未設定",
    coin: Number((currentProfile && currentProfile.coin) || 0),
    photoURL: getProfileAvatarImage(currentProfile, currentUser),
  });
  screen.open();
}

function openGameSelectScreen() {
  if (gameSelectScreen) {
    gameSelectScreen.classList.add("show");
  }
  ensureSharedTopbars();
  syncSelectgameSettingsVisibility();
  playSelectgameBgm();
}

function closeGameSelectScreen() {
  if (gameSelectScreen) {
    gameSelectScreen.classList.remove("show");
  }
  syncSelectgameSettingsVisibility();
  stopSelectgameBgm();
}

function updateLoggedOutView() {
  currentUser = null;
  currentProfile = null;
  isAdminUser = false;

  if (statusDot) statusDot.classList.remove("ok");
  if (statusText) statusText.textContent = "未ログイン";
  menuCards.forEach((card) => card.classList.add("locked"));
  if (loginBtn) loginBtn.style.display = "inline-flex";
  if (logoutBtn) logoutBtn.style.display = "none";
  if (userBox) userBox.classList.remove("show");
  if (userPhoto) userPhoto.src = "";
  if (userName) userName.textContent = "---";
  if (userEmail) userEmail.textContent = "---";
  setAdminEntryVisible(false);
  closeAdminScreen();
  resetAdminView();
  closeNicknameModal();
  const firstLoginBonusOverlay = document.getElementById("firstLoginBonusOverlay");
  if (firstLoginBonusOverlay) firstLoginBonusOverlay.classList.remove("show");
  closeDailyLoginBonusOverlay();
  closeDailyLoginBonusResult();
  closeGameSelectScreen();
}

async function updateLoggedInView(user) {
  currentUser = user;
  isAdminUser = isAdminAccount(user);

  if (statusDot) statusDot.classList.add("ok");
  if (statusText) statusText.textContent = "ログイン中";
  menuCards.forEach((card) => card.classList.remove("locked"));
  if (loginBtn) loginBtn.style.display = "none";
  if (logoutBtn) logoutBtn.style.display = "inline-flex";
  if (userBox) userBox.classList.add("show");
  setCircleAvatar(userPhoto, "", "avatar");
  if (userName) userName.textContent = user.displayName || "名前なし";
  if (userEmail) userEmail.textContent = user.email || "メールなし";
  ensureSharedTopbars();
  setAdminEntryVisible(isAdminUser);

  const profile = await loadProfile(user);
  ensureAvatarGachaIntroScreen();
  ensureAvatarGachaScreen();
  setAdminEntryVisible(Boolean(profile && profile.isAdmin) || isAdminAccount(user));
  resetAdminView();
}

if (loginBtn) {
  loginBtn.addEventListener("click", async () => {
    setMessage("");
    loginBtn.disabled = true;
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error(error);
      setMessage("ログインに失敗しました。設定を確認してください。");
    } finally {
      loginBtn.disabled = false;
    }
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    setMessage("");
    logoutBtn.disabled = true;
    try {
      await signOutUser();
    } catch (error) {
      console.error(error);
      setMessage("ログアウトに失敗しました。");
    } finally {
      logoutBtn.disabled = false;
    }
  });
}

if (gameSelectCard) {
  gameSelectCard.addEventListener("click", async () => {
    if (gameSelectCard.classList.contains("locked")) return;
    setMessage("");
    primeSelectgameBgmFromGesture();
    try {
      const canOpen = await ensureNicknameBeforeOpen();
      if (!canOpen) {
        stopSelectgameBgm();
        return;
      }
      await openGameSelectWithBonus();
    } catch (error) {
      console.error(error);
      stopSelectgameBgm();
      setMessage("読み込みに失敗しました。");
    }
  });
}

if (avatarGachaCard) {
  avatarGachaCard.addEventListener("click", async () => {
    if (avatarGachaCard.classList.contains("locked")) return;
    setMessage("");
    primeSelectgameBgmFromGesture();
    try {
      const canOpen = await ensureNicknameBeforeOpen();
      if (!canOpen) {
        stopSelectgameBgm();
        return;
      }
      openAvatarGachaIntroScreen();
    } catch (error) {
      console.error(error);
      stopSelectgameBgm();
      setMessage("ガチャ紹介画面の読み込みに失敗しました。");
    }
  });
}

if (adminCloseBtn) {
  adminCloseBtn.addEventListener("click", () => {
    closeAdminScreen();
  });
}

if (adminSearchInput) {
  adminSearchInput.addEventListener("input", () => {
    renderAdminUsers(adminSearchInput.value);
  });
}

if (adminAddCoinBtn) {
  adminAddCoinBtn.addEventListener("click", async () => {
    try {
      await applyAdminCoin("add");
    } catch (error) {
      console.error(error);
      setAdminStatus(error && error.message ? error.message : "コイン付与に失敗しました。");
    }
  });
}

if (adminRemoveCoinBtn) {
  adminRemoveCoinBtn.addEventListener("click", async () => {
    try {
      await applyAdminCoin("remove");
    } catch (error) {
      console.error(error);
      setAdminStatus(error && error.message ? error.message : "コイン没収に失敗しました。");
    }
  });
}

if (adminResetAvatarBtn) {
  adminResetAvatarBtn.addEventListener("click", async () => {
    try {
      await applyAdminAvatarReset();
    } catch (error) {
      console.error(error);
      setAdminStatus(error && error.message ? error.message : "アバター所持リセットに失敗しました。");
    }
  });
}

if (nicknameSaveBtn) {
  nicknameSaveBtn.addEventListener("click", async () => {
    if (!currentUser) return;
    const nickname = sanitizeNickname(nicknameInput ? nicknameInput.value : "");
    if (!nickname) {
      if (nicknameError) nicknameError.textContent = "ニックネームを入力してください。";
      return;
    }

    nicknameSaveBtn.disabled = true;
    if (nicknameError) nicknameError.textContent = "";

    try {
      await updateUserData({ nickname }, currentUser);
      await loadProfile(currentUser);
      closeNicknameModal();
      await openGameSelectWithBonus();
    } catch (error) {
      console.error(error);
      if (nicknameError) nicknameError.textContent = "登録に失敗しました。";
    } finally {
      nicknameSaveBtn.disabled = false;
    }
  });
}

document.addEventListener("visibilitychange", function() {
  if (document.hidden) {
    stopSelectgameBgm();
    return;
  }
  if (gameSelectScreen && gameSelectScreen.classList.contains("show")) {
    playSelectgameBgm();
  }
});

window.addEventListener("beforeunload", function() {
  stopSelectgameBgm();
});

window.addEventListener("resize", function() {
  applyDailyLoginBonusAutoScale();
});

window.addEventListener("orientationchange", function() {
  applyDailyLoginBonusAutoScale();
});

syncSelectgameSettingsVisibility();

onUserChanged(async (user) => {
  setMessage("");
  if (user) {
    try {
      await updateLoggedInView(user);
    } catch (error) {
      console.error(error);
      setMessage("読み込みに失敗しました。");
    }
    return;
  }
  updateLoggedOutView();
});






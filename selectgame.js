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
} from "./shared/userDate.js";

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
const gameSelectUserPhoto = document.getElementById("gameSelectUserPhoto");
const gameSelectUserName = document.getElementById("gameSelectUserName");
const gameSelectUserSub = document.getElementById("gameSelectUserSub");
const gameSelectHomeBtn = document.getElementById("gameSelectHomeBtn");
const gameSelectSettingsBtn = document.getElementById("gameSelectSettingsBtn");
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
const adminStatus = document.getElementById("adminStatus");
const dailyLoginBonusOverlay = document.getElementById("dailyLoginBonusOverlay");
const dailyLoginBonusGrid = document.getElementById("dailyLoginBonusGrid");
const dailyLoginBonusResult = document.getElementById("dailyLoginBonusResult");
const dailyLoginBonusResultRank = document.getElementById("dailyLoginBonusResultRank");
const dailyLoginBonusResultCoin = document.getElementById("dailyLoginBonusResultCoin");

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
const SELECTGAME_BGM_PATH = "./audio/bgm/seiseigame.wav";

const ADMIN_EMAILS = ["takoponnsama6630@gmail.com"];

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

  if (!selectgameSettingsButton && gameSelectSettingsBtn) {
    gameSelectSettingsBtn.textContent = "⚙";
    gameSelectSettingsBtn.setAttribute("aria-label", "設定");
    gameSelectSettingsBtn.style.width = "48px";
    gameSelectSettingsBtn.style.minWidth = "48px";
    gameSelectSettingsBtn.style.height = "48px";
    gameSelectSettingsBtn.style.padding = "0";
    gameSelectSettingsBtn.style.borderRadius = "16px";
    gameSelectSettingsBtn.style.fontSize = "22px";
    gameSelectSettingsBtn.style.lineHeight = "1";
    gameSelectSettingsBtn.style.cursor = "pointer";
    gameSelectSettingsBtn.addEventListener("click", function(event) {
      event.stopPropagation();
      openSelectgameSettings();
    });
    selectgameSettingsButton = gameSelectSettingsBtn;
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
  overlay.style.zIndex = "12000";

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
  if (!adminEntryBtn) return;
  adminEntryBtn.classList.toggle("show", Boolean(visible));
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

function applyProfileToGameSelect(profile, user) {
  const nickname = profile && profile.nickname ? profile.nickname : "ニックネーム未設定";
  const coin = Number((profile && profile.coin) || 0);

  if (userName) {
    userName.textContent = nickname;
  }
  if (gameSelectUserName) {
    gameSelectUserName.textContent = nickname;
  }
  if (gameSelectUserSub) {
    gameSelectUserSub.textContent = `コイン: ${coin}`;
  }
  if (gameSelectUserPhoto) {
    gameSelectUserPhoto.style.background = "rgba(255, 255, 255, 0.08)";
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

function openGameSelectScreen() {
  if (gameSelectScreen) {
    gameSelectScreen.classList.add("show");
  }
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
  if (gameSelectUserName) gameSelectUserName.textContent = "---";
  if (gameSelectUserSub) gameSelectUserSub.textContent = "コイン: 0";
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
  if (userPhoto) userPhoto.src = user.photoURL || "";
  if (userName) userName.textContent = user.displayName || "名前なし";
  if (userEmail) userEmail.textContent = user.email || "メールなし";
  setAdminEntryVisible(isAdminUser);

  const profile = await loadProfile(user);
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
  avatarGachaCard.addEventListener("click", () => {
    if (avatarGachaCard.classList.contains("locked")) return;
    setMessage("アバターガチャはこれからつなげます。");
  });
}

if (gameSelectHomeBtn) {
  gameSelectHomeBtn.addEventListener("click", () => {
    closeAdminScreen();
    closeGameSelectScreen();
  });
}

if (adminEntryBtn) {
  adminEntryBtn.addEventListener("click", async () => {
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

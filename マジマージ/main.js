import { setupCanvas } from './board.js';
import { setupInput } from './input.js';
import { draw } from './render.js';
import { createTopbar } from '../topbar.js';
import { onUserChanged } from '../shared/firebase.js';
import { getUserData, getAvatarImageById, normalizeAvatarId } from '../shared/userDate.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const gameTopbarMount = document.getElementById('gameTopbarMount');

let gameTopbar = null;

function fitGamePageToScreen() {
    const gamePage = document.querySelector('.game-page');
    if (!gamePage) return;

    gamePage.style.transform = 'scale(1)';

    const margin = 16;
    const rect = gamePage.getBoundingClientRect();
    const scaleX = (window.innerWidth - margin) / rect.width;
    const scaleY = (window.innerHeight - margin) / rect.height;
    const scale = Math.min(1, scaleX, scaleY);

    gamePage.style.transform = 'scale(' + scale + ')';
}

function getProfileAvatarImage(profile) {
    const selectedAvatar = normalizeAvatarId(profile && profile.selectedAvatar ? profile.selectedAvatar : '');
    const imagePath = String(getAvatarImageById(selectedAvatar) || '').replace(/^\//, '');
    return imagePath ? '../' + imagePath : '';
}

function ensureTopbar() {
    if (gameTopbar || !gameTopbarMount) return;

    gameTopbar = createTopbar({
        profile: { nickname: '---', subText: 'ユーザー情報', photoURL: '' },
        stats: [{ id: 'coin', text: 'コイン: 0' }],
        actions: [
            { id: 'items', label: '持ち物', onClick: function() { window.location.href = '../items.html'; } },
            { id: 'home', label: 'ホーム', onClick: function() { window.location.href = '../selectgame.html'; } },
            { id: 'settings', label: '⚙', gear: true, ariaLabel: '設定' }
        ]
    });

    gameTopbarMount.appendChild(gameTopbar.element);
}

function applyTopbarProfile(profile) {
    if (!gameTopbar || !profile) return;

    const nickname = String(profile.nickname || profile.name || 'ニックネーム未設定');
    const coin = Number(profile.coin || 0);
    const avatarImage = getProfileAvatarImage(profile);

    gameTopbar.setProfile({ nickname: nickname, subText: 'ユーザー情報', photoURL: avatarImage });
    gameTopbar.setStatText('coin', 'コイン: ' + coin);
}

ensureTopbar();

onUserChanged(async function(user) {
    if (!user) {
        window.location.href = '../index.html';
        return;
    }

    const profile = await getUserData(user);
    applyTopbarProfile(profile);
});

setupCanvas(canvas);
fitGamePageToScreen();
window.addEventListener('resize', fitGamePageToScreen);
setupInput(canvas);
draw(ctx, canvas);


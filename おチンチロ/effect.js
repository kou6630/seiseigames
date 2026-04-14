export function injectEffectStyle() {
  if (document.getElementById("ochinchiro-effect-style")) return;

  const style = document.createElement("style");
  style.id = "ochinchiro-effect-style";
  style.textContent = `
    .ochi-effect-layer {
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 9999;
      overflow: hidden;
    }

    .ochi-flash-message {
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%) scale(0.92);
      min-width: 320px;
      max-width: min(88vw, 900px);
      padding: 22px 30px;
      border-radius: 24px;
      background: rgba(20, 8, 12, 0.72);
      border: 1px solid rgba(255, 220, 180, 0.22);
      box-shadow:
        0 20px 60px rgba(0, 0, 0, 0.38),
        inset 0 1px 0 rgba(255, 255, 255, 0.08);
      color: #fff3e3;
      font-size: clamp(28px, 4vw, 54px);
      font-weight: 800;
      letter-spacing: 0.08em;
      text-align: center;
      opacity: 0;
      animation: ochiFlashMessage 1.1s ease forwards;
      backdrop-filter: blur(10px);
    }

    .ochi-result-pop {
      position: absolute;
      left: 50%;
      top: 18%;
      transform: translateX(-50%) scale(0.9);
      padding: 16px 26px;
      border-radius: 999px;
      background: linear-gradient(180deg, rgba(255, 210, 143, 0.96) 0%, rgba(255, 184, 96, 0.96) 100%);
      color: #2c1209;
      font-size: clamp(22px, 3vw, 40px);
      font-weight: 900;
      letter-spacing: 0.08em;
      box-shadow: 0 16px 40px rgba(255, 157, 77, 0.28);
      opacity: 0;
      animation: ochiResultPop 1s ease forwards;
    }

    .ochi-shake-target {
      animation: ochiShake 0.45s ease;
    }

    .ochi-dice-roll-glow {
      animation: ochiDiceGlow 0.8s ease infinite alternate;
    }

    @keyframes ochiFlashMessage {
      0% {
        opacity: 0;
        transform: translate(-50%, -50%) scale(0.92);
      }
      20% {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1);
      }
      78% {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1);
      }
      100% {
        opacity: 0;
        transform: translate(-50%, -50%) scale(1.04);
      }
    }

    @keyframes ochiResultPop {
      0% {
        opacity: 0;
        transform: translateX(-50%) scale(0.8);
      }
      18% {
        opacity: 1;
        transform: translateX(-50%) scale(1.06);
      }
      100% {
        opacity: 0;
        transform: translateX(-50%) scale(1);
      }
    }

    @keyframes ochiShake {
      0% { transform: translate3d(0, 0, 0); }
      20% { transform: translate3d(-6px, 2px, 0); }
      40% { transform: translate3d(6px, -2px, 0); }
      60% { transform: translate3d(-4px, 1px, 0); }
      80% { transform: translate3d(4px, -1px, 0); }
      100% { transform: translate3d(0, 0, 0); }
    }

    @keyframes ochiDiceGlow {
      0% {
        filter: drop-shadow(0 0 0 rgba(255, 200, 120, 0.2));
      }
      100% {
        filter: drop-shadow(0 0 18px rgba(255, 200, 120, 0.55));
      }
    }
  `;

  document.head.appendChild(style);
}

export function ensureEffectLayer() {
  let layer = document.getElementById("ochinchiro-effect-layer");
  if (layer) return layer;

  layer = document.createElement("div");
  layer.id = "ochinchiro-effect-layer";
  layer.className = "ochi-effect-layer";
  document.body.appendChild(layer);
  return layer;
}

export function showFlashMessage(text = "") {
  const layer = ensureEffectLayer();
  const node = document.createElement("div");
  node.className = "ochi-flash-message";
  node.textContent = text;
  layer.appendChild(node);

  window.setTimeout(() => {
    node.remove();
  }, 1150);
}

export function showResultPop(text = "") {
  const layer = ensureEffectLayer();
  const node = document.createElement("div");
  node.className = "ochi-result-pop";
  node.textContent = text;
  layer.appendChild(node);

  window.setTimeout(() => {
    node.remove();
  }, 1000);
}

export function shakeElement(target) {
  if (!target) return;
  target.classList.remove("ochi-shake-target");
  void target.offsetWidth;
  target.classList.add("ochi-shake-target");

  window.setTimeout(() => {
    target.classList.remove("ochi-shake-target");
  }, 450);
}

export function setDiceRolling(target, isRolling) {
  if (!target) return;
  target.classList.toggle("ochi-dice-roll-glow", Boolean(isRolling));
}

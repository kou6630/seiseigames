const THREE_VERSION = "0.160.0";
const CANNON_VERSION = "0.20.0";
const PHYSICS_STEP = 1 / 60;
const MAX_SIM_SECONDS = 20;
const SETTLE_FRAMES = 24;
const DICE_SIZE = 0.64;
const DICE_HALF = DICE_SIZE / 2;
const BOWL_RADIUS = 3.9;
const BOWL_REST_Y = -2.65;
const BOWL_REST_Z = -1.2;
const PLATE_FLOOR_SIZE = 6.8;
const PLATE_FLOOR_THICKNESS = 0.9;
const PLATE_WALL_COUNT = 32;
const PLATE_WALL_RADIUS = 3.45;
const PLATE_WALL_WIDTH = 0.74;
const PLATE_WALL_HEIGHT = 0.72;
const PLATE_WALL_THICKNESS = 0.36;
const PLATE_WALL_Y = 0.18;
const RESULT_DICE_SHOW_MS = 1400;
const PRE_DROP_SPIN_SECONDS = 0.75;
const WAITING_DICE_SPIN_SPEED = 1.35;

let enginePromise = null;

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

    .ochi-physics-stage {
      position: absolute;
      inset: 0;
      pointer-events: none;
      overflow: hidden;
    }

    .ochi-physics-canvas {
      width: 100%;
      height: 100%;
      display: block;
      pointer-events: none;
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

export function createDiceNode(value = 1) {
  const node = document.createElement("div");
  node.dataset.value = String(value);
  return node;
}

export async function animateDiceDrop(layer, diceValues = [], options = {}) {
  if (!layer) return { dice: [], values: [], nodes: [] };

  injectEffectStyle();

  const { THREE, CANNON } = await loadPhysicsEngine();
  const count = Array.isArray(diceValues) && diceValues.length ? diceValues.length : 3;
  const stage = createStage(layer);
  const renderer = new THREE.WebGLRenderer({
    canvas: stage.canvas,
    alpha: true,
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(stage.width, stage.height, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = createEffectCamera(THREE, stage);
  addEffectLights(THREE, scene);

  const world = new CANNON.World({
    gravity: new CANNON.Vec3(0, -28, 0),
  });
  world.allowSleep = true;
  world.broadphase = new CANNON.SAPBroadphase(world);
  world.defaultContactMaterial.friction = 0.36;
  world.defaultContactMaterial.restitution = 0.26;

  const materials = {
    dice: new CANNON.Material("dice"),
    bowl: new CANNON.Material("bowl"),
  };

  world.addContactMaterial(new CANNON.ContactMaterial(materials.dice, materials.bowl, {
    friction: 0.08,
    restitution: 0.26,
  }));

  world.addContactMaterial(new CANNON.ContactMaterial(materials.dice, materials.dice, {
    friction: 0.22,
    restitution: 0.08,
  }));

  const bowlVisual = createBowlVisual(THREE);
  bowlVisual.mesh.position.set(0, BOWL_REST_Y, BOWL_REST_Z);
  scene.add(bowlVisual.mesh);

  const bowlBody = createBowlBody(CANNON, THREE, materials.bowl);
  bowlBody.position.set(0, BOWL_REST_Y, BOWL_REST_Z);
  world.addBody(bowlBody);

  const diceEntries = Array.from({ length: count }, (_, index) => {
    const entry = createDieEntry(THREE, CANNON, index, materials.dice);
    const initial = Array.isArray(options.initialQuaternions) ? options.initialQuaternions[index] : null;
    if (initial) {
      entry.body.quaternion.set(
        Number(initial.x || 0),
        Number(initial.y || 0),
        Number(initial.z || 0),
        Number(typeof initial.w === "number" ? initial.w : 1)
      );
      entry.mesh.quaternion.copy(entry.body.quaternion);
    }
    world.addBody(entry.body);
    scene.add(entry.mesh);
    return entry;
  });

  const clock = new THREE.Clock();
  let settleFrames = 0;
  let elapsed = 0;
  let preDropElapsed = 0;
  let diceReleased = Array.isArray(options.initialQuaternions) && options.initialQuaternions.length >= count;

  return new Promise((resolve, reject) => {
    let finished = false;

    function cleanup() {
      if (finished) return;
      finished = true;
      renderer.dispose();
      disposeScene(scene);
      stage.root.remove();
    }

    function step() {
      try {
        const delta = Math.min(clock.getDelta(), 1 / 30);
        elapsed += delta;

        if (!diceReleased) {
          preDropElapsed += delta;
          spinDiceBeforeDrop(diceEntries, delta);
          renderer.render(scene, camera);

          if (preDropElapsed < PRE_DROP_SPIN_SECONDS) {
            requestAnimationFrame(step);
            return;
          }

          releaseDice(diceEntries);
          diceReleased = true;
        }

        world.step(PHYSICS_STEP, delta, 20);

        syncDiceMeshes(diceEntries);
        renderer.render(scene, camera);

        const allSleeping = diceEntries.every((entry) => entry.body.sleepState === 2);
        if (allSleeping) {
          settleFrames += 1;
        } else {
          settleFrames = 0;
        }

        if (settleFrames >= SETTLE_FRAMES) {
          const values = diceEntries.map((entry) => getTopFaceValue(entry.body.quaternion));
          const nodes = values.map((value) => createDiceNode(value));
          const handName = getChinchiroHandName(values);
          showFinalDiceLine(THREE, scene, diceEntries, values);
          showResultPop(handName);
          renderer.render(scene, camera);

          window.setTimeout(() => {
            cleanup();
            resolve({ dice: values, values, nodes });
          }, RESULT_DICE_SHOW_MS);
          return;
        }

        if (elapsed >= MAX_SIM_SECONDS) {
          cleanup();
          reject(new Error("物理演算が自然停止しませんでした"));
          return;
        }

        requestAnimationFrame(step);
      } catch (error) {
        cleanup();
        reject(error);
      }
    }

    requestAnimationFrame(step);
  });
}

export async function startWaitingDiceSpin(layer, count = 3) {
  if (!layer) return null;

  injectEffectStyle();

  const { THREE } = await loadPhysicsEngine();
  const stage = createStage(layer);
  const renderer = new THREE.WebGLRenderer({
    canvas: stage.canvas,
    alpha: true,
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(stage.width, stage.height, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = createEffectCamera(THREE, stage);
  addEffectLights(THREE, scene);

  const bowlVisual = createBowlVisual(THREE);
  bowlVisual.mesh.position.set(0, BOWL_REST_Y, BOWL_REST_Z);
  scene.add(bowlVisual.mesh);

  const meshes = Array.from({ length: count }, (_, index) => {
    const mesh = new THREE.Mesh(createRoundedDiceGeometry(THREE), buildDieMaterials(THREE));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.position.set((index - 1) * 0.78, 7.2, BOWL_REST_Z + (index - 1) * 0.3);
    mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    scene.add(mesh);
    return mesh;
  });

  let stopped = false;
  let animationId = 0;
  const clock = new THREE.Clock();

  function frame() {
    if (stopped) return;
    const delta = Math.min(clock.getDelta(), 1 / 30);
    meshes.forEach((mesh, index) => {
      mesh.rotation.x += delta * WAITING_DICE_SPIN_SPEED * (4.8 + index * 0.7);
      mesh.rotation.y += delta * WAITING_DICE_SPIN_SPEED * (5.7 + index * 0.6);
      mesh.rotation.z += delta * WAITING_DICE_SPIN_SPEED * (4.2 + index * 0.5);
    });
    renderer.render(scene, camera);
    animationId = requestAnimationFrame(frame);
  }

  frame();

  return {
    getQuaternions() {
      return meshes.map((mesh) => ({
        x: mesh.quaternion.x,
        y: mesh.quaternion.y,
        z: mesh.quaternion.z,
        w: mesh.quaternion.w,
      }));
    },
    stop() {
      if (stopped) return;
      stopped = true;
      if (animationId) cancelAnimationFrame(animationId);
      renderer.dispose();
      disposeScene(scene);
      stage.root.remove();
    },
  };
}

function createEffectCamera(THREE, stage) {
  const camera = new THREE.PerspectiveCamera(24, stage.width / Math.max(1, stage.height), 0.1, 50);
  camera.position.set(0, 22.5, 5.5);
  camera.lookAt(0, -0.6, -1.8);
  return camera;
}

function addEffectLights(THREE, scene) {
  const ambient = new THREE.AmbientLight(0xffffff, 1.2);
  scene.add(ambient);

  const keyLight = new THREE.DirectionalLight(0xffe4b8, 1.5);
  keyLight.position.set(2.5, 7, 1.8);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  keyLight.shadow.camera.near = 0.5;
  keyLight.shadow.camera.far = 20;
  keyLight.shadow.camera.left = -6;
  keyLight.shadow.camera.right = 6;
  keyLight.shadow.camera.top = 6;
  keyLight.shadow.camera.bottom = -6;
  scene.add(keyLight);

  const fillLight = new THREE.PointLight(0xffc88a, 0.9, 18);
  fillLight.position.set(-2.6, 4.2, -2.4);
  scene.add(fillLight);
}

function loadPhysicsEngine() {
  if (!enginePromise) {
    enginePromise = Promise.all([
      import(`https://esm.sh/three@${THREE_VERSION}`),
      import(`https://esm.sh/cannon-es@${CANNON_VERSION}`),
    ]).then(([THREE, CANNON]) => ({ THREE, CANNON }));
  }
  return enginePromise;
}

function createStage(layer) {
  const rect = layer.getBoundingClientRect();
  const root = document.createElement("div");
  root.className = "ochi-physics-stage";

  const canvas = document.createElement("canvas");
  canvas.className = "ochi-physics-canvas";
  root.appendChild(canvas);
  layer.innerHTML = "";
  layer.appendChild(root);

  return {
    root,
    canvas,
    width: Math.max(1, Math.round(rect.width || layer.clientWidth || 300)),
    height: Math.max(1, Math.round(rect.height || layer.clientHeight || 300)),
  };
}

function createBowlVisual(THREE) {
  const group = new THREE.Group();

  const floorGeometry = new THREE.CylinderGeometry(BOWL_RADIUS, BOWL_RADIUS, 0.22, 72);
  const floorMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x4e2615,
    roughness: 0.5,
    metalness: 0.04,
    transparent: true,
    opacity: 0.92,
  });
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.receiveShadow = true;
  group.add(floor);

  const rimGeometry = new THREE.TorusGeometry(BOWL_RADIUS, 0.22, 18, 72);
  const rimMaterial = new THREE.MeshStandardMaterial({
    color: 0x2f140b,
    roughness: 0.46,
    metalness: 0.05,
  });
  const rim = new THREE.Mesh(rimGeometry, rimMaterial);
  rim.position.y = 0.32;
  rim.rotation.x = Math.PI / 2;
  rim.receiveShadow = true;
  group.add(rim);

  return { mesh: group };
}

function createBowlBody(CANNON, THREE, material) {
  const body = new CANNON.Body({
    mass: 0,
    material,
    type: CANNON.Body.STATIC,
  });

  const floorShape = new CANNON.Box(new CANNON.Vec3(
    PLATE_FLOOR_SIZE / 2,
    PLATE_FLOOR_THICKNESS / 2,
    PLATE_FLOOR_SIZE / 2
  ));
  body.addShape(floorShape, new CANNON.Vec3(0, -PLATE_FLOOR_THICKNESS / 2, 0));

  const wallShape = new CANNON.Box(new CANNON.Vec3(
    PLATE_WALL_WIDTH / 2,
    PLATE_WALL_HEIGHT / 2,
    PLATE_WALL_THICKNESS / 2
  ));

  for (let index = 0; index < PLATE_WALL_COUNT; index += 1) {
    const angle = (Math.PI * 2 * index) / PLATE_WALL_COUNT;
    const x = Math.cos(angle) * PLATE_WALL_RADIUS;
    const z = Math.sin(angle) * PLATE_WALL_RADIUS;
    const rotation = new CANNON.Quaternion();
    rotation.setFromEuler(0, -angle, 0, "XYZ");
    body.addShape(
      wallShape,
      new CANNON.Vec3(x, PLATE_WALL_Y, z),
      rotation
    );
  }

  return body;
}

function createDieEntry(THREE, CANNON, index, material) {
  const geometry = createRoundedDiceGeometry(THREE);
  const materials = buildDieMaterials(THREE);
  const mesh = new THREE.Mesh(geometry, materials);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  const body = new CANNON.Body({
    mass: 1,
    material,
    shape: new CANNON.Box(new CANNON.Vec3(DICE_HALF, DICE_HALF, DICE_HALF)),
    position: new CANNON.Vec3((index - 1) * 0.78, 7.2, BOWL_REST_Z + (index - 1) * 0.3),
    linearDamping: 0.16,
    angularDamping: 0.18,
    allowSleep: true,
    sleepSpeedLimit: 0.06,
    sleepTimeLimit: 0.9,
  });

  body.quaternion.setFromEuler(
    Math.random() * Math.PI,
    Math.random() * Math.PI,
    Math.random() * Math.PI,
    "XYZ"
  );

  body.velocity.set((Math.random() - 0.5) * 0.7, -0.55 - Math.random() * 0.3, (Math.random() - 0.5) * 0.7);
  body.angularVelocity.set((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10);
  body.applyImpulse(
    new CANNON.Vec3((Math.random() - 0.5) * 0.18, 0, (Math.random() - 0.5) * 0.18),
    new CANNON.Vec3((Math.random() - 0.5) * DICE_HALF, (Math.random() - 0.5) * DICE_HALF, (Math.random() - 0.5) * DICE_HALF)
  );

  return { mesh, body };
}

function createRoundedDiceGeometry(THREE) {
  const geometry = new THREE.BoxGeometry(DICE_SIZE, DICE_SIZE, DICE_SIZE, 6, 6, 6);
  const position = geometry.attributes.position;
  const half = DICE_SIZE / 2;
  const radius = DICE_SIZE * 0.12;
  const inner = half - radius;
  const vector = new THREE.Vector3();
  const clamped = new THREE.Vector3();

  for (let index = 0; index < position.count; index += 1) {
    vector.fromBufferAttribute(position, index);
    clamped.set(
      Math.max(-inner, Math.min(inner, vector.x)),
      Math.max(-inner, Math.min(inner, vector.y)),
      Math.max(-inner, Math.min(inner, vector.z))
    );
    vector.sub(clamped);
    if (vector.lengthSq() > 0) {
      vector.normalize().multiplyScalar(radius).add(clamped);
      position.setXYZ(index, vector.x, vector.y, vector.z);
    }
  }

  geometry.computeVertexNormals();
  return geometry;
}

function buildDieMaterials(THREE) {
  return [
    createPipMaterial(THREE, 3),
    createPipMaterial(THREE, 4),
    createPipMaterial(THREE, 2),
    createPipMaterial(THREE, 5),
    createPipMaterial(THREE, 1),
    createPipMaterial(THREE, 6),
  ];
}

function createPipMaterial(THREE, value) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#f5ecdc";
  ctx.fillRect(0, 0, 256, 256);

  const gradient = ctx.createLinearGradient(0, 0, 256, 256);
  gradient.addColorStop(0, "rgba(255,255,255,0.52)");
  gradient.addColorStop(1, "rgba(0,0,0,0.08)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);

  ctx.strokeStyle = "rgba(90, 68, 44, 0.26)";
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, 248, 248);

  const positions = {
    c: [128, 128],
    tl: [70, 70],
    tr: [186, 70],
    bl: [70, 186],
    br: [186, 186],
    ml: [70, 128],
    mr: [186, 128],
  };

  const map = {
    1: ["c"],
    2: ["tl", "br"],
    3: ["tl", "c", "br"],
    4: ["tl", "tr", "bl", "br"],
    5: ["tl", "tr", "c", "bl", "br"],
    6: ["tl", "tr", "ml", "mr", "bl", "br"],
  };

  ctx.fillStyle = "#2f2318";
  (map[value] || ["c"]).forEach((key) => {
    const [x, y] = positions[key];
    ctx.beginPath();
    ctx.arc(x, y, 18, 0, Math.PI * 2);
    ctx.fill();
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshPhysicalMaterial({
    map: texture,
    roughness: 0.22,
    metalness: 0.0,
    clearcoat: 0.45,
    clearcoatRoughness: 0.32,
    reflectivity: 0.42,
  });
}

function syncDiceMeshes(entries) {
  entries.forEach((entry) => {
    entry.mesh.position.copy(entry.body.position);
    entry.mesh.quaternion.copy(entry.body.quaternion);
  });
}

function spinDiceBeforeDrop(entries, delta) {
  entries.forEach((entry, index) => {
    entry.mesh.position.copy(entry.body.position);
    entry.mesh.rotation.x += delta * (5.2 + index * 0.8);
    entry.mesh.rotation.y += delta * (6.4 + index * 0.7);
    entry.mesh.rotation.z += delta * (4.6 + index * 0.6);
  });
}

function releaseDice(entries) {
  entries.forEach((entry) => {
    entry.body.quaternion.set(
      entry.mesh.quaternion.x,
      entry.mesh.quaternion.y,
      entry.mesh.quaternion.z,
      entry.mesh.quaternion.w
    );
  });
}

function showFinalDiceLine(THREE, scene, entries, values) {
  entries.forEach((entry, index) => {
    entry.body.sleep();
    entry.body.velocity.set(0, 0, 0);
    entry.body.angularVelocity.set(0, 0, 0);
    entry.mesh.position.set((index - 1) * 0.95, BOWL_REST_Y + 0.82, BOWL_REST_Z - 1.35);
    entry.mesh.quaternion.copy(getFaceUpQuaternion(THREE, values[index]));
    entry.mesh.scale.setScalar(1.16);
    scene.add(entry.mesh);
  });
}

function getFaceUpQuaternion(THREE, value) {
  const normals = {
    1: new THREE.Vector3(0, 0, 1),
    2: new THREE.Vector3(0, 1, 0),
    3: new THREE.Vector3(1, 0, 0),
    4: new THREE.Vector3(-1, 0, 0),
    5: new THREE.Vector3(0, -1, 0),
    6: new THREE.Vector3(0, 0, -1),
  };
  const source = normals[Number(value)] || normals[1];
  const target = new THREE.Vector3(0, 1, 0);
  const quaternion = new THREE.Quaternion();
  quaternion.setFromUnitVectors(source, target);
  return quaternion;
}

function getChinchiroHandName(values = []) {
  const sorted = [...values].map(Number).sort((a, b) => a - b);
  if (sorted.length !== 3) return "不正";
  if (sorted[0] === 1 && sorted[1] === 1 && sorted[2] === 1) return "ピンゾロ";
  if (sorted[0] === sorted[1] && sorted[1] === sorted[2]) return `${sorted[0]}のアラシ`;
  if (sorted[0] === 4 && sorted[1] === 5 && sorted[2] === 6) return "シゴロ";
  if (sorted[0] === 1 && sorted[1] === 2 && sorted[2] === 3) return "ヒフミ";
  if (sorted[0] === sorted[1]) return `${sorted[2]}の目`;
  if (sorted[1] === sorted[2]) return `${sorted[0]}の目`;
  return "目なし";
}

function isDieSettled(body) {
  return body.sleepState === 2;
}

function getTopFaceValue(quaternion) {
  const q = quaternion;
  const faces = [
    { value: 1, normal: new q.constructor(0, 0, 1, 0) },
  ];

  const normals = [
    { value: 1, vec: { x: 0, y: 0, z: 1 } },
    { value: 6, vec: { x: 0, y: 0, z: -1 } },
    { value: 3, vec: { x: 1, y: 0, z: 0 } },
    { value: 4, vec: { x: -1, y: 0, z: 0 } },
    { value: 2, vec: { x: 0, y: 1, z: 0 } },
    { value: 5, vec: { x: 0, y: -1, z: 0 } },
  ];

  let bestValue = 1;
  let bestY = -Infinity;

  normals.forEach((face) => {
    const rotated = quaternion.vmult(face.vec);
    if (rotated.y > bestY) {
      bestY = rotated.y;
      bestValue = face.value;
    }
  });

  return bestValue;
}

function disposeScene(scene) {
  scene.traverse((item) => {
    if (item.geometry) {
      item.geometry.dispose();
    }

    if (Array.isArray(item.material)) {
      item.material.forEach(disposeMaterial);
      return;
    }

    if (item.material) {
      disposeMaterial(item.material);
    }
  });
}

function disposeMaterial(material) {
  if (material.map) material.map.dispose();
  material.dispose();
}


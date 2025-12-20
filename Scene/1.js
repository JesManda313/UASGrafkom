import * as THREE from "three";

let isActive = false;
let scene1PlayerObjects = [];
let sceneReference = null;
let userPlayerReference = null;
let sceneCamera = null;
let sceneCheckCollision = null; // Store the collision function
let sceneTimer = 0;

// Konfigurasi Posisi
const CENTER = new THREE.Vector3(4.655, -4.097, -3.99);
// Colors order: cyan, pink, hitam, putih, ungu, hijau, biru, merah, kuning, oranye
const COLORS = [
  "#00fbff", // Cyan (Index 0)
  "#ed54ba", // Pink (Index 1)
  "#000000", // Hitam (Index 2)
  "#ffffff", // Putih (Index 3)
  "#6b2fbb", // Ungu (Index 4)
  "#00ff3c", // Hijau (Index 5)
  "#0000ff", // Biru (Index 6)
  "#ff0000", // Merah (Index 7)
  "#ffff00", // Kuning (Index 8)
  "#ffa500", // Orange (Index 9)
];

const scene1Data = [];

// Generate Position Data
const CENTER_X = 4.68;
const CENTER_Z = -3.76;
const RADIUS = 0.24;
const START_ANGLE = 18 * (Math.PI / 180);
const ANGLE_STEP = -36 * (Math.PI / 180);

for (let i = 0; i < 10; i++) {
  const angle = START_ANGLE + i * ANGLE_STEP;
  const x = CENTER_X + RADIUS * Math.sin(angle);
  const z = CENTER_Z + RADIUS * Math.cos(angle);

  // Yaw: Face the center.
  const yaw = angle + Math.PI;

  scene1Data.push({
    color: COLORS[i],
    startPos: new THREE.Vector3(x, 0.005, z),
    rotationY: yaw,
  });
}

// Movement Targets
const POS_SIDE = new THREE.Vector3(5.77, 0.005, -3.75);
const POS_NEAR = new THREE.Vector3(4.63, 0.005, -2.92);
const POS_OTHER = new THREE.Vector3(4.65, 0.005, -2.73);
const POS_PURPLE = new THREE.Vector3(4.15, 0.005, -3.64);

// Special Waypoints
// Green (Single Position now)
const POS_GREEN = new THREE.Vector3(4.08, 0.005, -3.55);

// Yellow
const WP_YELLOW_1 = new THREE.Vector3(4.98, 0.005, -3.59);
const WP_YELLOW_2 = new THREE.Vector3(4.33, 0.005, -3.06);

const CHARACTER_SPEED = 0.2;

// Camera Start Pose
const CAM_START_POS = { x: 4.7, z: -3.35, y: 0.15 };
const CAM_END_Z = -3.3;
const CAM_YAW = -179.7 * (Math.PI / 180);
const CAM_PITCH = -21.9 * (Math.PI / 180);

// --- HELPER FUNCTIONS ---

function isBehindCamera(camera, position) {
  if (!camera) return false;
  const v = position.clone();
  v.applyMatrix4(camera.matrixWorldInverse);
  return v.z > 0.2;
}

// Helper to test a movement and return result + distance moved
function tryMove(startPos, direction, dist, checkCollision) {
  const proposed = startPos.clone().addScaledVector(direction, dist);
  let actual = proposed.clone();

  if (checkCollision) {
    actual = checkCollision(startPos, proposed);
  }

  const moved = actual.distanceTo(startPos);
  return { pos: actual, moved: moved };
}

function moveCharacterTo(player, target, delta, camera, checkCollision) {
  // Stop only if behind camera (allow passing through)
  if (isBehindCamera(camera, player.mesh.position)) {
    player.isMoving = false;
    return true; // Reached (stopped)
  }

  const oldPos = player.mesh.position.clone();
  const dir = target.clone().sub(oldPos);
  dir.y = 0;
  const totalDist = dir.length();

  if (totalDist > 0.01) {
    dir.normalize();
    const stepDist = CHARACTER_SPEED * delta;
    let moveDist = stepDist;
    if (moveDist > totalDist) moveDist = totalDist;

    let shouldMove = true;
    let finalPos = oldPos.clone();

    const needsAvoidance =
      checkCollision &&
      (player.colorHex === COLORS[5] || player.colorHex === COLORS[8]);

    if (needsAvoidance) {
      // 1. Try Direct Path
      const directResult = tryMove(oldPos, dir, moveDist, checkCollision);

      if (directResult.moved < moveDist * 0.5) {
        // Left 45 deg
        const leftDir = dir
          .clone()
          .applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 4);
        const leftResult = tryMove(oldPos, leftDir, moveDist, checkCollision);

        // Right 45 deg
        const rightDir = dir
          .clone()
          .applyAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 4);
        const rightResult = tryMove(oldPos, rightDir, moveDist, checkCollision);

        if (
          leftResult.moved > directResult.moved &&
          leftResult.moved > rightResult.moved
        ) {
          finalPos.copy(leftResult.pos);
        } else if (rightResult.moved > directResult.moved) {
          finalPos.copy(rightResult.pos);
        } else {
          finalPos.copy(directResult.pos);
        }
      } else {
        finalPos.copy(directResult.pos);
      }
    } else {
      if (moveDist >= totalDist) {
        finalPos.copy(target);
        shouldMove = false; // Reached
      } else {
        finalPos.addScaledVector(dir, moveDist);
      }
    }

    player.mesh.position.copy(finalPos);

    const newDist = finalPos.distanceTo(target);
    player.isMoving = newDist > 0.05;

    if (player.isMoving) {
      const movedDir = finalPos.clone().sub(oldPos);
      if (movedDir.lengthSq() > 0.000001) {
        player.mesh.rotation.y = Math.atan2(movedDir.x, movedDir.z);
      }
      return false; // Not reached yet
    } else {
      return true; // Reached
    }
  } else {
    player.mesh.position.copy(target);
    player.isMoving = false;
    return true; // Reached
  }
}

// --- FUNGSI UTAMA ---

export async function initializeScene1(
  scene,
  createPlayerFunc,
  playerObj,
  camera,
  checkCollision
) {
  if (!playerObj) return;
  isActive = true;
  sceneTimer = 0;

  sceneReference = scene;
  userPlayerReference = playerObj;
  sceneCamera = camera;
  sceneCheckCollision = checkCollision;

  // Set Initial Camera Pose
  if (sceneCamera) {
    sceneCamera.position.set(CAM_START_POS.x, CAM_START_POS.y, CAM_START_POS.z);

    const dir = new THREE.Vector3(
      Math.sin(CAM_YAW) * Math.cos(CAM_PITCH),
      Math.sin(CAM_PITCH),
      Math.cos(CAM_YAW) * Math.cos(CAM_PITCH)
    );
    sceneCamera.lookAt(
      CAM_START_POS.x + dir.x,
      CAM_START_POS.y + dir.y,
      CAM_START_POS.z + dir.z
    );
  }

  userPlayerReference.mesh.visible = false;

  for (let i = 0; i < scene1Data.length; i++) {
    const data = scene1Data[i];

    const player = await createPlayerFunc(
      scene,
      data.startPos,
      data.color,
      camera
    );

    player.mesh.rotation.y = data.rotationY;
    player.isMoving = false;
    player.isWaiting = false;
    player.targetPos = null;
    player.pathQueue = []; // Queue for waypoints
    player.hasPathAssigned = false;
    player.colorHex = data.color;

    player.mesh.visible = true;
    scene1PlayerObjects.push(player);
  }
}

export function updateScene1(delta) {
  if (!isActive) return;

  sceneTimer += delta;

  // Camera Animation: Z from -3.35 to -3.3 over 5s
  if (sceneCamera && sceneTimer <= 5.0) {
    const t = sceneTimer / 5.0; // 0 to 1
    const currentZ = CAM_START_POS.z + (CAM_END_Z - CAM_START_POS.z) * t;
    sceneCamera.position.z = currentZ;
  }

  if (userPlayerReference && userPlayerReference.mesh) {
    userPlayerReference.mesh.visible = false;
  }

  // --- TIMELINE LOGIC ---

  // 1.5s: Red moves to (5.77, -3.75)
  if (sceneTimer >= 1.5) {
    const red = scene1PlayerObjects[7];
    if (red && !red.targetPos) red.targetPos = POS_SIDE;
  }

  // 2.0s: Green moves straight to single pos
  if (sceneTimer >= 2.0) {
    const green = scene1PlayerObjects[5];
    const orange = scene1PlayerObjects[9];
    const pink = scene1PlayerObjects[1];

    // Green
    if (green && !green.targetPos && !green.hasPathAssigned) {
      green.targetPos = POS_GREEN;
      green.hasPathAssigned = true;
    }

    if (orange && !orange.targetPos) orange.targetPos = POS_NEAR;
    if (pink && !pink.targetPos) pink.targetPos = POS_NEAR;
  }

  // 2.5s:
  // User requested moves
  if (sceneTimer >= 2.5) {
    const blue = scene1PlayerObjects[6];
    const cyan = scene1PlayerObjects[0];
    const black = scene1PlayerObjects[2];
    const purple = scene1PlayerObjects[4];

    if (blue && !blue.targetPos) blue.targetPos = POS_SIDE;
    if (cyan && !cyan.targetPos) cyan.targetPos = POS_SIDE;
    if (black && !black.targetPos) black.targetPos = POS_OTHER;
    if (purple && !purple.targetPos) purple.targetPos = POS_PURPLE;
  }

  // 2.7s: Yellow move (Waypoints)
  if (sceneTimer >= 2.7) {
    const yellow = scene1PlayerObjects[8];
    if (
      yellow &&
      !yellow.targetPos &&
      yellow.pathQueue.length === 0 &&
      !yellow.hasPathAssigned
    ) {
      yellow.pathQueue = [WP_YELLOW_1, WP_YELLOW_2];
      yellow.hasPathAssigned = true;
    }
  }

  // 2.9s: White move
  if (sceneTimer >= 2.9) {
    const white = scene1PlayerObjects[3];
    if (white && !white.targetPos) white.targetPos = POS_OTHER;
  }

  // Apply Movements & Process Queue
  scene1PlayerObjects.forEach((player) => {
    // Path Queue Processing
    if (!player.targetPos && player.pathQueue.length > 0) {
      player.targetPos = player.pathQueue.shift();
    }

    if (player.targetPos) {
      const reached = moveCharacterTo(
        player,
        player.targetPos,
        delta,
        sceneCamera,
        sceneCheckCollision
      );
      if (reached) {
        player.targetPos = null;
      }
    }

    if (player.update) {
      player.update(delta, {
        position: player.mesh.position,
        oldPosition: player.mesh.position,
        isMoving: player.isMoving,
      });
    }
  });

  if (document.getElementById("pos"))
    document.getElementById("pos").innerText =
      "Timer: " + sceneTimer.toFixed(2);
  if (document.getElementById("dir"))
    document.getElementById("dir").innerText = "Scene 1 Playing";
}

export function clearScene1() {
  isActive = false;

  scene1PlayerObjects.forEach((player) => {
    // Force stop walking sound
    if (player.update) {
      player.update(0, {
        position: player.mesh.position,
        oldPosition: player.mesh.position,
        isMoving: false,
      });
    }

    if (player.mixer) player.mixer.stopAllAction();
    if (sceneReference && player.mesh) sceneReference.remove(player.mesh);
  });

  scene1PlayerObjects = [];

  if (userPlayerReference && userPlayerReference.mesh) {
    userPlayerReference.mesh.visible = true;
  }
}

export function isScene1Active() {
  return isActive;
}

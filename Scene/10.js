import * as THREE from "three";

let isActive = false;
let sceneReference = null;
let userPlayerReference = null;
let sceneCamera = null;
let sceneTimer = 0;
let sceneSound = null; // Variabel untuk menyimpan audio
let tingSound = null;
let tingPlayedCount = 0;
let shadowChar = null;

// Shadow Character Config
const SHADOW_POS = new THREE.Vector3(0.92, 0.005, -1.86);
const SHADOW_START_TIME = 0.65; // DELAY_TIME (0.5) + MOVE_DURATION (0.15)
const BLINK_DURATION = 0.2;
const BLINK_COUNT = 3;

// Camera Config
const CAM_START_X = 0.87;
const CAM_START_Y = 0.1;
const CAM_START_Z = -2.62;

const CAM_END_Z = -2.55;

const CAM_YAW = 1 * (Math.PI / 180);
const CAM_PITCH = -12 * (Math.PI / 180);

const DELAY_TIME = 0.5;
const MOVE_DURATION = 0.15;
const STAY_DURATION = 2.0;

export function initializeScene10(scene, createPlayerFunc, playerObj, camera) {
  isActive = true;
  sceneTimer = 0;
  tingPlayedCount = 0;
  sceneReference = scene;
  userPlayerReference = playerObj;
  sceneCamera = camera;

  // Hide user player
  if (userPlayerReference && userPlayerReference.mesh) {
    userPlayerReference.mesh.visible = false;
  }

  // ================= AUDIO SETUP =================
  if (camera) {
    // Mencari AudioListener yang biasanya sudah ditempelkan ke camera di main.js
    const listener = camera.children.find((c) => c.type === "AudioListener");

    if (listener) {
      sceneSound = new THREE.Audio(listener);
      const audioLoader = new THREE.AudioLoader();

      audioLoader.load("backsound/sceneHilang.mp3", (buffer) => {
        if (isActive) {
          // Cek lagi apakah scene masih aktif saat loading selesai
          sceneSound.setBuffer(buffer);
          sceneSound.setVolume(0.6);
          sceneSound.play();
        }
      });

      // Ting Sound
      tingSound = new THREE.Audio(listener);
      audioLoader.load("backsound/ting_cut.mp3", (buffer) => {
        if (!isActive) return;
        tingSound.setBuffer(buffer);
        tingSound.setLoop(false);
        tingSound.setVolume(0.5);
      });
    }

    // Set Initial Camera Pose
    camera.position.set(CAM_START_X, CAM_START_Y, CAM_START_Z);

    const dir = new THREE.Vector3(
      Math.sin(CAM_YAW) * Math.cos(CAM_PITCH),
      Math.sin(CAM_PITCH),
      Math.cos(CAM_YAW) * Math.cos(CAM_PITCH)
    );

    camera.lookAt(
      camera.position.x + dir.x,
      camera.position.y + dir.y,
      camera.position.z + dir.z
    );
  }

  // Create Shadow Character
  const shadowCallback = async () => {
    const player = await createPlayerFunc(scene, SHADOW_POS, "#000000", camera);
    shadowChar = player;

    // Force Black Silhouette Material
    const blackMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    player.mesh.traverse((o) => {
      if (o.isMesh) o.material = blackMat;
    });

    player.mesh.visible = false;
  };
  shadowCallback();
}

export function updateScene10(delta) {
  if (!isActive) return;

  sceneTimer += delta;

  if (userPlayerReference && userPlayerReference.mesh) {
    userPlayerReference.mesh.visible = false;
  }

  // Camera Animation
  if (sceneCamera) {
    // 0 to 0.5s: Stay at Start
    if (sceneTimer < DELAY_TIME) {
      sceneCamera.position.set(CAM_START_X, CAM_START_Y, CAM_START_Z);
    }
    // 0.5 to 0.65s: Move Z to -2.55
    else if (sceneTimer < DELAY_TIME + MOVE_DURATION) {
      const t = (sceneTimer - DELAY_TIME) / MOVE_DURATION;
      const currentZ = CAM_START_Z + (CAM_END_Z - CAM_START_Z) * t;
      sceneCamera.position.set(CAM_START_X, CAM_START_Y, currentZ);
    }
    // > 0.65s: Stay at Target
    else {
      sceneCamera.position.set(CAM_START_X, CAM_START_Y, CAM_END_Z);
    }
  }

  // Shadow Character Blink Logic
  if (shadowChar && shadowChar.mesh) {
    if (sceneTimer >= SHADOW_START_TIME) {
      const timeSinceStart = sceneTimer - SHADOW_START_TIME;
      const cycleDuration = BLINK_DURATION * 2; // On + Off
      const currentCycle = Math.floor(timeSinceStart / cycleDuration);
      const timeInCycle = timeSinceStart % cycleDuration;

      if (currentCycle < BLINK_COUNT) {
        // Visible for first half of cycle
        const isVisible = timeInCycle < BLINK_DURATION;
        shadowChar.mesh.visible = isVisible;

        if (isVisible) {
          if (tingPlayedCount === currentCycle) {
            if (tingSound && tingSound.buffer) {
              if (tingSound.isPlaying) tingSound.stop();
              tingSound.play();
              tingPlayedCount++;
            }
          }
        }
      } else {
        // Finished
        shadowChar.mesh.visible = false;
      }
    } else {
      shadowChar.mesh.visible = false;
    }
  }
}

export function clearScene10() {
  isActive = false;

  // Berhentikan suara saat scene ditutup
  if (sceneSound && sceneSound.isPlaying) {
    sceneSound.stop();
  }
  sceneSound = null;

  if (tingSound) {
    if (tingSound.isPlaying) tingSound.stop();
    tingSound = null;
  }

  if (userPlayerReference && userPlayerReference.mesh) {
    userPlayerReference.mesh.visible = true;
  }

  if (shadowChar) {
    if (sceneReference && shadowChar.mesh) {
      sceneReference.remove(shadowChar.mesh);
    }
    shadowChar = null;
  }
}

export function isScene10Active() {
  return isActive;
}

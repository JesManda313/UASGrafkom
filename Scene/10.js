import * as THREE from "three";

let isActive = false;
let sceneReference = null;
let userPlayerReference = null;
let sceneCamera = null;
let sceneTimer = 0;
let sceneSound = null; // Variabel untuk menyimpan audio

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
        if (isActive) { // Cek lagi apakah scene masih aktif saat loading selesai
          sceneSound.setBuffer(buffer);
          sceneSound.setLoop(false); // Set true jika ingin berulang
          sceneSound.setVolume(0.6);
          sceneSound.play();
        }
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
}

export function clearScene10() {
  isActive = false;

  // Berhentikan suara saat scene ditutup
  if (sceneSound && sceneSound.isPlaying) {
    sceneSound.stop();
  }
  sceneSound = null;

  if (userPlayerReference && userPlayerReference.mesh) {
    userPlayerReference.mesh.visible = true;
  }
}

export function isScene10Active() {
  return isActive;
}
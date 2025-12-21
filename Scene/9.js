import * as THREE from "three";
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.167/examples/jsm/loaders/GLTFLoader.js";

let isActive = false;
let scene9Player = null;
let sceneReference = null;
let sceneCamera = null;
let redOverlay = null;

// hand Vars
let handMesh = null;
let sabotageSound = null;
let successSound = null;
let breathSound = null;
let waveSound = null;

// Sound Flags
let successPlayed = false;
let breathPlayed = false;
let wavePlayedCount = 0; // 0=none, 1=first wave, 2=second wave

// Timing & State
let sceneTimer = 0;
let overlayTimer = 0;
let overlayActive = false;

// Camera Start Pose
const CAM_START_X = 0.85;
const CAM_START_Y = 0.1;
const CAM_START_Z = -3.0;
const CAM_YAW = 170 * (Math.PI / 180);
const CAM_PITCH = -12 * (Math.PI / 180);

// Player Color & Movement
const GREEN_COLOR = "#00ff3c";
const MOVE_DURATION = 3.0;
const PLAYER_START_POS = new THREE.Vector3(0.77, 0.005, -2.61);
const PLAYER_END_POS = new THREE.Vector3(0.83, 0.005, -3.24);

const HAND_COLOR = "#00ff3c";

// hand Movement
const hand_START_POS = new THREE.Vector3(0.83, 0.07, -3.27); // Starting near player
const hand_TARGET_POS = new THREE.Vector3(0.87, 0.097, -3.28);
const hand_MOVE_DURATION = 0.5;
const hand_STAY_DURATION = 3.0;

// Phase 4
const hand_RETURN_DURATION = 0.3;
const TOTAL_ANIM_TIME =
  MOVE_DURATION +
  hand_MOVE_DURATION +
  hand_STAY_DURATION +
  hand_RETURN_DURATION;
const STRETCH_DURATION = 1.0;
const BASE_SCALE = 0.019; // From character.js

// (Lighting)
const OVERLAY_INTERVAL = 1.5;
const OVERLAY_DURATION = 0.5;

// Add userPlayerReference to module scope
let userPlayerReference = null;

export async function initializeScene9(
  scene,
  createPlayerFunc,
  playerObj,
  camera
) {
  // If scene is already running, force clear it first to reset
  if (scene9Player) {
    clearScene9();
  }
  if (sabotageSound) {
    if (sabotageSound.isPlaying) sabotageSound.stop();
    sabotageSound = null;
  }
  if (successSound) {
    if (successSound.isPlaying) successSound.stop();
    successSound = null;
  }
  if (breathSound) {
    if (breathSound.isPlaying) breathSound.stop();
    breathSound = null;
  }
  if (waveSound) {
    if (waveSound.isPlaying) waveSound.stop();
    waveSound = null;
  }

  isActive = true;
  sceneTimer = 0;
  successPlayed = false;
  breathPlayed = false;
  wavePlayedCount = 0;
  // Initialize to interval so it blinks immediately
  overlayTimer = OVERLAY_INTERVAL;
  overlayActive = false;
  sceneReference = scene;
  sceneCamera = camera;
  userPlayerReference = playerObj;

  // Hide user player
  if (userPlayerReference && userPlayerReference.mesh) {
    userPlayerReference.mesh.visible = false;
  }

  try {
    // 1. Create Green Character
    const player = await createPlayerFunc(
      scene,
      PLAYER_START_POS,
      GREEN_COLOR,
      camera
    );

    // 2. Load hand Asset
    const loader = new GLTFLoader();
    loader.load(
      "assets/hand_r.glb",
      (gltf) => {
        if (!isActive) return;

        const model = gltf.scene;

        // Scale
        model.scale.set(0.018, 0.018, 0.018);

        model.position.copy(hand_START_POS);

        model.rotation.set(0, -Math.PI / 2, Math.PI);

        // Visibility Check
        model.visible = sceneTimer >= MOVE_DURATION;

        // New Material Logic (Scene 15 Style)
        const greenMat = new THREE.MeshStandardMaterial({
          color: HAND_COLOR,
          roughness: 0.7,
          metalness: 0.5,
          side: THREE.DoubleSide,
        });

        const outlineMat = new THREE.MeshBasicMaterial({
          color: 0x000000,
          side: THREE.BackSide,
        });

        const meshes = [];
        model.traverse((o) => {
          if (o.isMesh) {
            meshes.push(o);
          }
        });

        meshes.forEach((o) => {
          o.material = greenMat;
          o.castShadow = true;
          o.receiveShadow = true;
          o.frustumCulled = false; // Prevent culling

          // Outline
          const outline = o.clone();
          outline.geometry = o.geometry;
          outline.material = outlineMat;
          outline.scale.set(1.05, 1.05, 1.05);
          o.add(outline);
        });

        scene.add(model);
        handMesh = model;
      },
      undefined,
      (err) => console.error("FAILED to load hand.glb", err)
    );

    if (!isActive) {
      if (player.update) {
        player.update(0, {
          position: player.mesh.position,
          oldPosition: player.mesh.position,
          isMoving: false,
        });
      }
      if (player.mesh) scene.remove(player.mesh);
      if (player.mixer) player.mixer.stopAllAction();
      return;
    }

    scene9Player = player;

    // Setup Camera
    if (camera) {
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

      scene.add(camera);
    }

    const overlayGeometry = new THREE.PlaneGeometry(2, 2);
    const overlayMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0.25,
      depthTest: false,
    });

    redOverlay = new THREE.Mesh(overlayGeometry, overlayMaterial);
    redOverlay.position.z = -0.5; // In front of camera
    redOverlay.visible = false;

    if (camera) {
      camera.add(redOverlay);
    }

    // Initialize Sound
    if (camera) {
      const listener = camera.children.find((c) => c.type === "AudioListener");
      if (listener) {
        sabotageSound = new THREE.Audio(listener);
        camera.add(sabotageSound); // IMPORTANT: Add to hierarchy so traverse finds it
        const audioLoader = new THREE.AudioLoader();
        audioLoader.load(
          "backsound/among-us-alarme-sabotage-393155.mp3",
          function (buffer) {
            sabotageSound.setBuffer(buffer);
            sabotageSound.setLoop(true);
            sabotageSound.setVolume(0.5);
          }
        );

        // Success Sound
        successSound = new THREE.Audio(listener);
        camera.add(successSound);
        audioLoader.load("backsound/success.mp3", (buffer) => {
          if (!isActive) return;
          successSound.setBuffer(buffer);
          successSound.setLoop(false);
          successSound.setVolume(0.5);
        });

        // Breath Sound
        breathSound = new THREE.Audio(listener);
        camera.add(breathSound);
        audioLoader.load("backsound/menghelaNapas.mp3", (buffer) => {
          if (!isActive) return;
          breathSound.setBuffer(buffer);
          breathSound.setLoop(false);
          breathSound.setVolume(0.5);
        });

        // Wave Sound
        waveSound = new THREE.Audio(listener);
        camera.add(waveSound);
        audioLoader.load("backsound/lambaiTangan.mp3", (buffer) => {
          if (!isActive) return;
          waveSound.setBuffer(buffer);
          waveSound.setLoop(false);
          waveSound.setVolume(0.5);
        });
      }
    }

    player.isMoving = false;

    const facingDir = new THREE.Vector3()
      .subVectors(PLAYER_END_POS, PLAYER_START_POS)
      .normalize();
    if (facingDir.lengthSq() > 0.001) {
      player.mesh.rotation.y = Math.atan2(facingDir.x, facingDir.z);
    }
  } catch (e) {
    console.error("Error initializing Scene 9:", e);
    isActive = false;
  }
}

export function updateScene9(delta) {
  if (!isActive) return;

  sceneTimer += delta;
  overlayTimer += delta;

  // --- Lighting & Sound ---
  // Stop lighting when hand returns (Before End of Phase 3)
  const END_PHASE_3_TIME =
    MOVE_DURATION + hand_MOVE_DURATION + hand_STAY_DURATION - 0.5;

  if (sceneTimer < END_PHASE_3_TIME) {
    // Play Sound
    if (sabotageSound && !sabotageSound.isPlaying && sabotageSound.buffer) {
      sabotageSound.play();
    }

    // Success Sound Trigger
    const SUCCESS_TRIGGER_TIME = END_PHASE_3_TIME - 0.3;
    if (sceneTimer >= SUCCESS_TRIGGER_TIME && !successPlayed) {
      if (successSound && successSound.buffer) {
        successSound.play();
        successPlayed = true;
      }
    }

    if (redOverlay) {
      // Turn on overlay
      if (!overlayActive && overlayTimer >= OVERLAY_INTERVAL) {
        overlayActive = true;
        overlayTimer = 0;
        redOverlay.visible = true;
      }

      // Turn off overlay
      if (overlayActive && overlayTimer >= OVERLAY_DURATION) {
        overlayActive = false;
        overlayTimer = 0;
        redOverlay.visible = false;
      }
    }
  } else {
    // Stop Sound
    if (sabotageSound && sabotageSound.isPlaying) {
      sabotageSound.stop();
    }

    // Breath Sound Trigger (Start of Stretch Phase) -> TOTAL_ANIM_TIME
    if (sceneTimer >= TOTAL_ANIM_TIME && !breathPlayed) {
      if (breathSound && breathSound.buffer) {
        breathSound.play();
        breathPlayed = true;
      }
    }

    // Force off if time exceeded
    if (redOverlay) {
      redOverlay.visible = false;
      overlayActive = false;
    }
  }

  // --- Character Animation Logic ---
  if (scene9Player && scene9Player.mesh) {
    let isMoving = false;

    // Phase 1: Move Character (0s - 3s)
    if (sceneTimer < MOVE_DURATION) {
      const t = sceneTimer / MOVE_DURATION; // 0 to 1
      scene9Player.mesh.position.lerpVectors(
        PLAYER_START_POS,
        PLAYER_END_POS,
        t
      );
      isMoving = true;
    }
    // Phase 2: Stopped
    else {
      scene9Player.mesh.position.copy(PLAYER_END_POS);
      isMoving = false;
    }

    // Phase 3: hand Animation (> 3s)
    if (sceneTimer >= MOVE_DURATION && handMesh) {
      handMesh.visible = true;
      // hand Logic
      const handTime = sceneTimer - MOVE_DURATION;

      if (handTime < hand_MOVE_DURATION) {
        // Move to target
        const t = handTime / hand_MOVE_DURATION;
        handMesh.position.lerpVectors(hand_START_POS, hand_TARGET_POS, t);
      } else if (handTime < hand_MOVE_DURATION + hand_STAY_DURATION) {
        // Stay
        handMesh.position.copy(hand_TARGET_POS);
      } else {
        // Return Phase
        const handTotalStayTime = hand_MOVE_DURATION + hand_STAY_DURATION;
        const returnTime = handTime - handTotalStayTime;
        const hand_RETURN_DURATION = 0.3;

        if (returnTime < hand_RETURN_DURATION) {
          const t = returnTime / hand_RETURN_DURATION;
          handMesh.position.lerpVectors(hand_TARGET_POS, hand_START_POS, t);
        } else {
          // Finished returning, hide it
          handMesh.visible = false;
        }
      }
    }

    // Phase 4: Player Stretch Animation
    // Constants moved to top level

    if (
      sceneTimer >= TOTAL_ANIM_TIME &&
      sceneTimer < TOTAL_ANIM_TIME + STRETCH_DURATION
    ) {
      const stretchTime = sceneTimer - TOTAL_ANIM_TIME;
      const t = stretchTime / STRETCH_DURATION; // 0 to 1

      // Sine wave for smooth stretch up and down (0 -> 1 -> 0)
      const stretchFactor = 1 + Math.sin(t * Math.PI) * 0.2;

      scene9Player.mesh.scale.set(
        BASE_SCALE,
        BASE_SCALE * stretchFactor,
        BASE_SCALE
      );
    } else {
      // Reset scale outside of animation window
      scene9Player.mesh.scale.set(BASE_SCALE, BASE_SCALE, BASE_SCALE);
    }

    // Phase 5: Turn to Camera (0.2s)
    const TURN_START_TIME = TOTAL_ANIM_TIME + STRETCH_DURATION;
    const TURN_DURATION = 0.2;

    // Phase 6: Hand Wave (1.5s)
    // DELAY 0.2s after turn before wave starts
    const WAVE_DELAY = 0.2;
    const WAVE_START_TIME = TURN_START_TIME + TURN_DURATION + WAVE_DELAY;
    const WAVE_DURATION = 1.5;

    // --- Phase 5 Logic ---
    if (
      sceneTimer >= TURN_START_TIME &&
      sceneTimer < TURN_START_TIME + TURN_DURATION
    ) {
      const turnT = (sceneTimer - TURN_START_TIME) / TURN_DURATION;

      const targetPos = new THREE.Vector3(
        CAM_START_X,
        scene9Player.mesh.position.y,
        CAM_START_Z
      );
      const dummy = new THREE.Object3D();
      dummy.position.copy(scene9Player.mesh.position);
      dummy.lookAt(targetPos);
      const targetRotationY = dummy.rotation.y;

      const facingDir = new THREE.Vector3()
        .subVectors(PLAYER_END_POS, PLAYER_START_POS)
        .normalize();
      const startRotationY = Math.atan2(facingDir.x, facingDir.z);

      const lerp = (s, e, t) => s + (e - s) * t;
      scene9Player.mesh.rotation.y = lerp(
        startRotationY,
        targetRotationY,
        turnT
      );
    }
    // Stick to target rotation after turn
    else if (sceneTimer >= TURN_START_TIME + TURN_DURATION) {
      const targetPos = new THREE.Vector3(
        CAM_START_X,
        scene9Player.mesh.position.y,
        CAM_START_Z
      );
      scene9Player.mesh.lookAt(targetPos);
    }

    // --- Phase 6 Logic (Hand Reappears & Waves Up-Left/Up-Right) ---
    if (
      sceneTimer >= WAVE_START_TIME &&
      sceneTimer < WAVE_START_TIME + WAVE_DURATION &&
      handMesh
    ) {
      handMesh.visible = true;

      const waveT = (sceneTimer - WAVE_START_TIME) / WAVE_DURATION;

      // 1st Wave
      if (wavePlayedCount === 0) {
        if (waveSound && waveSound.buffer) {
          if (waveSound.isPlaying) waveSound.stop();
          waveSound.play();
          wavePlayedCount = 1;
        }
      }

      // 2nd Wave (at 50% progress)
      if (wavePlayedCount === 1 && waveT >= 0.5) {
        if (waveSound && waveSound.buffer) {
          if (waveSound.isPlaying) waveSound.stop();
          waveSound.play();
          wavePlayedCount = 2;
        }
      }

      const waveFreq = Math.PI * 4; // 2 cycles
      const xOffset = Math.sin(waveT * waveFreq) * 0.01; // Left/Right
      const yOffset = Math.abs(Math.sin(waveT * waveFreq)) * 0.01; // Up/Down

      handMesh.position.set(
        hand_TARGET_POS.x + xOffset,
        hand_TARGET_POS.y + yOffset,
        hand_TARGET_POS.z
      );

      const tiltAngle = Math.sin(waveT * waveFreq) * 0.3;
      handMesh.rotation.set(0, -Math.PI / 2, Math.PI + tiltAngle);
    } else if (sceneTimer >= WAVE_START_TIME + WAVE_DURATION && handMesh) {
      // Hide after wave
      handMesh.visible = false;
    }

    // Phase 7: Shock Animation (0.2s after Wave wait 0.3s)
    const SHOCK_DELAY = 0.3;
    const SHOCK_START_TIME = WAVE_START_TIME + WAVE_DURATION + SHOCK_DELAY;
    const SHOCK_DURATION = 0.2;

    if (
      sceneTimer >= SHOCK_START_TIME &&
      sceneTimer < SHOCK_START_TIME + SHOCK_DURATION
    ) {
      const shockT = (sceneTimer - SHOCK_START_TIME) / SHOCK_DURATION;
      const shockFactor = 1 + Math.sin(shockT * Math.PI) * 0.2; // 1.2x scale

      scene9Player.mesh.scale.set(
        BASE_SCALE * shockFactor,
        BASE_SCALE * shockFactor,
        BASE_SCALE * shockFactor
      );
    } else if (sceneTimer >= SHOCK_START_TIME + SHOCK_DURATION) {
      // Reset to normal
      scene9Player.mesh.scale.set(BASE_SCALE, BASE_SCALE, BASE_SCALE);
    }

    if (scene9Player.update) {
      scene9Player.update(delta, {
        position: scene9Player.mesh.position,
        oldPosition: scene9Player.mesh.position,
        isMoving: isMoving,
      });
    }
  }

  if (sceneCamera) {
    sceneCamera.position.set(CAM_START_X, CAM_START_Y, CAM_START_Z);
  }
}

export function clearScene9() {
  isActive = false;

  if (scene9Player) {
    // Force stop walking sound
    if (scene9Player.update) {
      scene9Player.update(0, {
        position: scene9Player.mesh.position,
        oldPosition: scene9Player.mesh.position,
        isMoving: false,
      });
    }

    if (scene9Player.mixer) scene9Player.mixer.stopAllAction();
    if (sceneReference && scene9Player.mesh)
      sceneReference.remove(scene9Player.mesh);
    scene9Player = null;
  }

  // Clear hand
  if (handMesh) {
    if (sceneReference) sceneReference.remove(handMesh);
    handMesh = null;
  }

  if (sabotageSound) {
    if (sabotageSound.isPlaying) sabotageSound.stop();
    sabotageSound = null;
  }
  if (successSound) {
    if (successSound.isPlaying) successSound.stop();
    successSound = null;
  }
  if (breathSound) {
    if (breathSound.isPlaying) breathSound.stop();
    breathSound = null;
  }
  if (waveSound) {
    if (waveSound.isPlaying) waveSound.stop();
    waveSound = null;
  }

  if (redOverlay && sceneCamera) {
    sceneCamera.remove(redOverlay);
    redOverlay.geometry.dispose();
    redOverlay.material.dispose();
    redOverlay = null;
  }

  if (userPlayerReference && userPlayerReference.mesh) {
    userPlayerReference.mesh.visible = true;
  }
}

export function isScene9Active() {
  return isActive;
}

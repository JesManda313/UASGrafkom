import * as THREE from "three";

const lightGreen = "#00ff3c";

let singleCharacter = null;
let sceneRef = null;
let cameraRef = null;
let sabotageSound = null;
let writingSound = null; 
let isActive = false;

// ================= CONFIG =================

// Kecepatan per detik
const ROTATE_SPEED = THREE.MathUtils.degToRad(240);
const MOVE_SPEED = 0.2;

// Delay sebelum sabotase dimulai
const START_DELAY = 4;
let startDelayTimer = 0;
let hasStarted = false;

// Timer khusus untuk sound writing (Loop 2x = 2 detik)
let writingTimer = 0;
const WRITING_DURATION = 2.0; 

// Overlay merah (efek sabotase)
let redOverlay = null;
let overlayTimer = 0;
let overlayActive = false;
const OVERLAY_INTERVAL = 1.5;
const OVERLAY_DURATION = 0.5;

let stepIndex = 0;

// ================= PATH DATA =================

const pathSteps = [
    { type: "rotate", targetYaw: 90 },
    { type: "move", targetPos: new THREE.Vector3(2.45, 0.005, -3.02) },
    { type: "rotate", targetYaw: 0 },
    { type: "move", targetPos: new THREE.Vector3(2.45, 0.005, -2.80) },
    { type: "rotate", targetYaw: -50 },
    { type: "move", targetPos: new THREE.Vector3(2.04, 0.005, -2.45) },
];

// ================= INITIALIZE =================

export async function initializeScene5(scene, camera, createPlayerFunc) {
    if (singleCharacter) return;

    sceneRef = scene;
    cameraRef = camera;

    const startPos = new THREE.Vector3(2.40, 0.005, -3.02);
    const player = await createPlayerFunc(scene, startPos, lightGreen, camera);

    // Yaw/hadapan awal karakter
    player.mesh.rotation.y = THREE.MathUtils.degToRad(165);

    // ===== Overlay Merah Setup =====
    const overlayGeometry = new THREE.PlaneGeometry(2, 2);
    const overlayMaterial = new THREE.MeshBasicMaterial({
        color: 0xff0000,
        transparent: true,
        opacity: 0.25,
        depthTest: false
    });

    redOverlay = new THREE.Mesh(overlayGeometry, overlayMaterial);
    redOverlay.position.z = -0.5; // Berada tepat di depan kamera
    redOverlay.visible = false;

    camera.add(redOverlay);
    scene.add(camera);

    singleCharacter = player;

    // Reset State Scene
    stepIndex = 0;
    startDelayTimer = 0;
    hasStarted = false;
    overlayTimer = 0;
    overlayActive = false;
    writingTimer = 0; 

    // ===== Sound Setup =====
    if (camera) {
        const listener = camera.children.find((c) => c.type === "AudioListener");
        if (listener) {
            const audioLoader = new THREE.AudioLoader();

            // 1. Sabotage Sound (Alarm)
            sabotageSound = new THREE.Audio(listener);
            audioLoader.load("backsound/among-us-alarme-sabotage-393155.mp3", (buffer) => {
                sabotageSound.setBuffer(buffer);
                sabotageSound.setLoop(true);
                sabotageSound.setVolume(0.5);
            });

            // 2. Writing Sound (Loop 2x saja)
            writingSound = new THREE.Audio(listener);
            audioLoader.load("backsound/writing.mp3", (buffer) => {
                writingSound.setBuffer(buffer);
                writingSound.setLoop(true); // Diaktifkan agar bisa mengulang ke detik ke-2
                writingSound.setVolume(0.8);
                writingSound.play();
            });
        }
    }

    isActive = true;
}

// ================= UPDATE =================

export function updateScene5(delta) {
    if (!singleCharacter || !isActive) return;

    const mesh = singleCharacter.mesh;

    // ===== Logika Stop Writing Sound (Berhenti setelah 2x putaran / 2 detik) =====
    if (writingSound && writingSound.isPlaying) {
        writingTimer += delta;
        if (writingTimer >= WRITING_DURATION) {
            writingSound.stop();
        }
    }

    // ===== Logika Delay Awal (Menunggu sebelum karakter bergerak & sabotase nyala) =====
    if (!hasStarted) {
        startDelayTimer += delta;

        singleCharacter.update(delta, {
            position: mesh.position,
            oldPosition: mesh.position,
            isMoving: false
        });

        if (startDelayTimer >= START_DELAY) {
            hasStarted = true;
            overlayActive = true;
            overlayTimer = 0;
            redOverlay.visible = true;
            
            // Nyalakan alarm sabotase
            if (sabotageSound && !sabotageSound.isPlaying && sabotageSound.buffer) {
                sabotageSound.play();
            }
        }
        return;
    }
    
    // ===== Logika Kedipan Overlay Merah =====
    if (redOverlay) {
        overlayTimer += delta;
        if (!overlayActive && overlayTimer >= OVERLAY_INTERVAL) {
            overlayActive = true;
            overlayTimer = 0;
            redOverlay.visible = true;
        }
        if (overlayActive && overlayTimer >= OVERLAY_DURATION) {
            overlayActive = false;
            overlayTimer = 0;
            redOverlay.visible = false;
        }
    }

    // ===== Logika Pergerakan Karakter (Pathfinding) =====
    const step = pathSteps[stepIndex];

    if (!step) {
        // Jika path sudah habis, karakter diam di tempat
        singleCharacter.update(delta, {
            position: mesh.position,
            oldPosition: mesh.position,
            isMoving: false
        });
        return;
    }

    // ROTASI
    if (step.type === "rotate") {
        const targetYaw = THREE.MathUtils.degToRad(step.targetYaw);
        const rotateStep = ROTATE_SPEED * delta;
        mesh.rotation.y -= rotateStep;
        if (mesh.rotation.y <= targetYaw) {
            mesh.rotation.y = targetYaw;
            stepIndex++;
        }
    }
    // JALAN
    else if (step.type === "move") {
        const moveStep = MOVE_SPEED * delta;
        const dir = step.targetPos.clone().sub(mesh.position);
        const dist = dir.length();

        if (dist <= moveStep) {
            mesh.position.copy(step.targetPos);
            stepIndex++;
        } else {
            dir.normalize();
            mesh.position.addScaledVector(dir, moveStep);
        }
    }

    const oldPos = mesh.position.clone();
    singleCharacter.update(delta, {
        position: mesh.position,
        oldPosition: oldPos,
        isMoving: step.type === "move"
    });
}

// ================= CLEAR =================

export function clearScene5() {
    if (!singleCharacter) return;

    // Stop animasi player
    if (singleCharacter.mixer) singleCharacter.mixer.stopAllAction();
    if (singleCharacter.stopAll) singleCharacter.stopAll();

    // Hapus karakter dari scene
    if (sceneRef) sceneRef.remove(singleCharacter.mesh);

    // Hentikan semua suara
    if (sabotageSound) {
        if (sabotageSound.isPlaying) sabotageSound.stop();
        sabotageSound = null;
    }
    if (writingSound) {
        if (writingSound.isPlaying) writingSound.stop();
        writingSound = null;
    }

    // Hapus overlay merah
    if (redOverlay && cameraRef) {
        cameraRef.remove(redOverlay);
        redOverlay.geometry.dispose();
        redOverlay.material.dispose();
    }

    // Reset variabel global
    redOverlay = null;
    overlayTimer = 0;
    overlayActive = false;
    writingTimer = 0;
    singleCharacter = null;
    isActive = false;
}

// ================= STATE CHECK =================

export function isScene5Active() {
    return isActive;
}
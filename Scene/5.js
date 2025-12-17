import * as THREE from "three";

const lightGreen = "#00ff3c";

let singleCharacter = null;
let sceneRef = null;
let cameraRef = null;
let isActive = false;

// ================= CONFIG =================

// kecepatan PER DETIK
const ROTATE_SPEED = THREE.MathUtils.degToRad(240);
const MOVE_SPEED = 0.2;

// delay awal
const START_DELAY = 4;
let startDelayTimer = 0;
let hasStarted = false;

// overlay merah
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

// ================= INIT =================

export async function initializeScene5(scene, camera, createPlayerFunc) {
    if (singleCharacter) return;

    sceneRef = scene;
    cameraRef = camera;

    const startPos = new THREE.Vector3(2.40, 0.005, -3.02);
    const player = await createPlayerFunc(scene, startPos, lightGreen);

    // yaw awal
    player.mesh.rotation.y = THREE.MathUtils.degToRad(165);

    // ===== overlay merah =====
    const overlayGeometry = new THREE.PlaneGeometry(2, 2);
    const overlayMaterial = new THREE.MeshBasicMaterial({
        color: 0xff0000,
        transparent: true,
        opacity: 0.25,
        depthTest: false
    });

    redOverlay = new THREE.Mesh(overlayGeometry, overlayMaterial);
    redOverlay.position.z = -0.5;
    redOverlay.visible = false;

    camera.add(redOverlay);
    scene.add(camera);

    singleCharacter = player;

    stepIndex = 0;
    startDelayTimer = 0;
    hasStarted = false;

    overlayTimer = 0;
    overlayActive = false;

    isActive = true;
}

// ================= UPDATE =================

export function updateScene5(delta) {
    if (!singleCharacter || !isActive) return;

    const mesh = singleCharacter.mesh;

    // ===== delay awal =====
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
        }
        return;
    }
    
    // ===== overlay logic =====
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

    const step = pathSteps[stepIndex];

    if (!step) {
        // karakter selesai, tapi overlay tetap jalan
        singleCharacter.update(delta, {
            position: mesh.position,
            oldPosition: mesh.position,
            isMoving: false
        });
        return;
    }

    // ===== ROTATE =====
    if (step.type === "rotate") {
        const targetYaw = THREE.MathUtils.degToRad(step.targetYaw);
        const rotateStep = ROTATE_SPEED * delta;

        mesh.rotation.y -= rotateStep;

        if (mesh.rotation.y <= targetYaw) {
            mesh.rotation.y = targetYaw;
            stepIndex++;
        }
    }

    // ===== MOVE =====
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

    if (singleCharacter.mixer) {
        singleCharacter.mixer.stopAllAction();
    }

    if (sceneRef) {
        sceneRef.remove(singleCharacter.mesh);
    }

    if (redOverlay && cameraRef) {
        cameraRef.remove(redOverlay);
        redOverlay.geometry.dispose();
        redOverlay.material.dispose();
    }

    redOverlay = null;
    overlayTimer = 0;
    overlayActive = false;

    singleCharacter = null;
    isActive = false;
}

// ================= STATE =================

export function isScene5Active() {
    return isActive;
}

import * as THREE from "three";

const lightGreen = "#00ff3c";

let singleCharacter = null;
let sceneRef = null;
let cameraRef = null;
let sabotageSound = null;
let writingSound = null; 
let surpriseSound = null; // Tambahan variabel sound surprise
let isActive = false;

// ===== Shock Animation =====
const STRETCH_DURATION = 0.2;
const STRETCH_AMOUNT = 1.15;

let isStretching = false;
let stretchTime = 0;
let baseScale = new THREE.Vector3();

const AFTER_STRETCH_DELAY = 0.5;

let waitAfterStretch = false;
let afterStretchTime = 0;

// ================= CONFIG =================

const ROTATE_SPEED = THREE.MathUtils.degToRad(240);
const MOVE_SPEED = 0.2;

const START_DELAY = 4;
let startDelayTimer = 0;
let hasStarted = false;

let writingTimer = 0;
const WRITING_DURATION = 2.0; 

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

    player.mesh.rotation.y = THREE.MathUtils.degToRad(165);

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
    writingTimer = 0; 

    isStretching = false;
    stretchTime = 0;
    waitAfterStretch = false;
    afterStretchTime = 0;

    if (camera) {
        const listener = camera.children.find((c) => c.type === "AudioListener");
        if (listener) {
            const audioLoader = new THREE.AudioLoader();

            // 1. Sabotage Sound
            sabotageSound = new THREE.Audio(listener);
            audioLoader.load("backsound/among-us-alarme-sabotage-393155.mp3", (buffer) => {
                sabotageSound.setBuffer(buffer);
                sabotageSound.setLoop(true);
                sabotageSound.setVolume(0.5);
            });

            // 2. Writing Sound
            writingSound = new THREE.Audio(listener);
            audioLoader.load("backsound/writing.mp3", (buffer) => {
                writingSound.setBuffer(buffer);
                writingSound.setLoop(true);
                writingSound.setVolume(0.8);
                writingSound.play();
            });

            // 3. Surprise Sound (Tambahan)
            surpriseSound = new THREE.Audio(listener);
            audioLoader.load("backsound/surprise-sound-effect-99300.mp3", (buffer) => {
                surpriseSound.setBuffer(buffer);
                surpriseSound.setLoop(false); // Sekali putar saja
                surpriseSound.setVolume(0.3);
            });
        }
    }

    isActive = true;
}

// ================= UPDATE =================

export function updateScene5(delta) {
    if (!singleCharacter || !isActive) return;

    const mesh = singleCharacter.mesh;

    if (writingSound && writingSound.isPlaying) {
        writingTimer += delta;
        if (writingTimer >= WRITING_DURATION) {
            writingSound.stop();
        }
    }

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
            
            // Aktifkan Shock/Stretch
            isStretching = true;
            stretchTime = 0;
            baseScale.copy(mesh.scale);
            
            // --- PLAY SURPRISE SOUND DI SINI ---
            if (surpriseSound && !surpriseSound.isPlaying && surpriseSound.buffer) {
                surpriseSound.play();
            }

            if (sabotageSound && !sabotageSound.isPlaying && sabotageSound.buffer) {
                sabotageSound.play();
            }
        }
        return;
    }
    
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

    if (isStretching) {
        stretchTime += delta;
        const half = STRETCH_DURATION / 2;
        let stretchFactor;

        if (stretchTime <= half) {
            stretchFactor = THREE.MathUtils.lerp(1, STRETCH_AMOUNT, stretchTime / half);
        } else if (stretchTime <= STRETCH_DURATION) {
            stretchFactor = THREE.MathUtils.lerp(STRETCH_AMOUNT, 1, (stretchTime - half) / half);
        } else {
            mesh.scale.copy(baseScale);
            isStretching = false;
            waitAfterStretch = true;
            afterStretchTime = 0;
            return;
        }

        mesh.scale.set(baseScale.x, baseScale.y * stretchFactor, baseScale.z);
        singleCharacter.update(delta, {
            position: mesh.position, oldPosition: mesh.position, isMoving: false
        });
        return;
    }

    if (waitAfterStretch) {
        afterStretchTime += delta;
        singleCharacter.update(delta, {
            position: mesh.position, oldPosition: mesh.position, isMoving: false
        });
        if (afterStretchTime >= AFTER_STRETCH_DELAY) waitAfterStretch = false;
        return;
    }

    const step = pathSteps[stepIndex];
    if (!step) {
        singleCharacter.update(delta, {
            position: mesh.position, oldPosition: mesh.position, isMoving: false
        });
        return;
    }

    if (step.type === "rotate") {
        const targetYaw = THREE.MathUtils.degToRad(step.targetYaw);
        const rotateStep = ROTATE_SPEED * delta;
        mesh.rotation.y -= rotateStep;
        if (mesh.rotation.y <= targetYaw) {
            mesh.rotation.y = targetYaw;
            stepIndex++;
        }
    } else if (step.type === "move") {
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

    if (singleCharacter.mixer) singleCharacter.mixer.stopAllAction();
    if (sceneRef) sceneRef.remove(singleCharacter.mesh);

    if (sabotageSound && sabotageSound.isPlaying) sabotageSound.stop();
    if (writingSound && writingSound.isPlaying) writingSound.stop();
    if (surpriseSound && surpriseSound.isPlaying) surpriseSound.stop(); // Hentikan surprise sound

    if (redOverlay && cameraRef) {
        cameraRef.remove(redOverlay);
        redOverlay.geometry.dispose();
        redOverlay.material.dispose();
    }

    sabotageSound = null;
    writingSound = null;
    surpriseSound = null; // Reset
    redOverlay = null;
    singleCharacter = null;
    isActive = false;
}

export function isScene5Active() {
    return isActive;
}
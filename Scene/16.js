import * as THREE from "three";

const lightGreen = "#00ff3c";

let singleCharacter = null;
let sceneRef = null;
let isActive = false;


// yaw dalam radian
const START_YAW = THREE.MathUtils.degToRad(-80);
const TARGET_YAW = THREE.MathUtils.degToRad(90);

// besar putaran per frame (kartun)
const ROTATE_STEP = THREE.MathUtils.degToRad(6);

// jeda sebelum muter (detik)
const ROTATE_DELAY = 0.6;

let delayTimer = 0;
let startRotate = false;

export async function initializeScene16(scene, createPlayerFunc) {
    if (singleCharacter) return;

    sceneRef = scene;

    const startPosition = new THREE.Vector3(1.06, 0.005, -2.24);
    const player = await createPlayerFunc(scene, startPosition, lightGreen);

    // yaw awal
    player.mesh.rotation.y = START_YAW;

    delayTimer = 0;
    startRotate = false;

    singleCharacter = player;
    isActive = true;
}

export function updateScene16(delta) {
    if (!singleCharacter) return;
    if (!isActive) return;

    const mesh = singleCharacter.mesh;

    // fase jeda
    if (!startRotate) {
        delayTimer += delta;

        if (delayTimer >= ROTATE_DELAY) {
            startRotate = true;
        }
    }
    // fase muter kartun
    else {
        if (mesh.rotation.y < TARGET_YAW) {
            mesh.rotation.y += ROTATE_STEP;

            if (mesh.rotation.y >= TARGET_YAW) {
                mesh.rotation.y = TARGET_YAW;
                isActive = false; // selesai
            }
        }
    }

    const oldPos = mesh.position.clone();

    singleCharacter.update(delta, {
        position: mesh.position,
        oldPosition: oldPos,
        isMoving: false
    });
}

export function clearScene16() {
    if (!singleCharacter) return;

    if (singleCharacter.mixer) {
        singleCharacter.mixer.stopAllAction();
    }

    if (sceneRef) {
        sceneRef.remove(singleCharacter.mesh);
    }

    singleCharacter = null;
    isActive = false;
}

export function isScene16Active() {
    return isActive;
}

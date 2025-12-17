import * as THREE from "three";

const ROTATION_SPEED = 2.5;
const lightGreen = "#4CB864";

let singleCharacter = null;
let sceneRef = null;

// target kemiringan (derajat)
const TARGET_TILT_Z = THREE.MathUtils.degToRad(-25);
let isActive = false;

export async function initializeScene12(scene, createPlayerFunc) {
    if (singleCharacter) return;

    sceneRef = scene;

    const startPosition = new THREE.Vector3(0.66, 0.025, -2.65);
    const player = await createPlayerFunc(scene, startPosition, lightGreen);

    // Menghadap Z positif
    player.mesh.rotation.y = 0;

    // Mulai dari tidak miring
    player.mesh.rotation.z = 0;

    // Simpan target rotasi
    player.targetTiltZ = TARGET_TILT_Z;

    singleCharacter = player;
    isActive = true;
}

export function updateScene12(delta) {
    if (!singleCharacter) return;
    if(!isActive) return;

    // Lerp miring bertahap
    const currentZ = singleCharacter.mesh.rotation.z;
    const targetZ = singleCharacter.targetTiltZ;

    const t = Math.min(ROTATION_SPEED * delta, 1);
    singleCharacter.mesh.rotation.z = THREE.MathUtils.lerp(
        currentZ,
        targetZ,
        t
    );

    const oldPos = singleCharacter.mesh.position.clone();

    singleCharacter.update(delta, {
        position: singleCharacter.mesh.position,
        oldPosition: oldPos,
        isMoving: false
    });
}

export function clearScene12() {
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

export function isScene12Active(){
    return isActive;
}

import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.167/examples/jsm/loaders/GLTFLoader.js";
import * as THREE from "three";

const lightGreen = "#00ff3c";

let singleCharacter = null;
let sceneRef = null;
let cameraRef = null;
let isActive = false;
let gun = null;

// recoil config
const RECOIL_DURATION = 0.12;
const RECOIL_ANGLE_GUN = THREE.MathUtils.degToRad(-45);
const RECOIL_ANGLE_CHAR = THREE.MathUtils.degToRad(-45);

const THROW_TARGET = new THREE.Vector3(0.58, 0.005, -2.12);

let recoilTime = 0;
let isRecoiling = false;
let recoilTriggered = false;

let gunBaseRotZ = 0;

// basis karakter
let charBaseQuat = new THREE.Quaternion();
let charBasePos = new THREE.Vector3();

// yaw
const START_YAW = THREE.MathUtils.degToRad(-80);
const TARGET_YAW = THREE.MathUtils.degToRad(90);

const ROTATE_STEP = THREE.MathUtils.degToRad(6);
const ROTATE_DELAY = 0.6;

let delayTimer = 0;
let startRotate = false;

const GUN_POSITION = new THREE.Vector3(1.07, 0.033, -2.35);

let gunShotSound = null;

export async function initializeScene16(scene, createPlayerFunc, camera) {
    if (singleCharacter) return;

    sceneRef = scene;
    cameraRef = camera;

    const startPosition = new THREE.Vector3(1.06, 0.005, -2.24);
    const player = await createPlayerFunc(scene, startPosition, lightGreen, camera);

    player.mesh.rotation.y = START_YAW;

    delayTimer = 0;
    startRotate = false;
    recoilTriggered = false;
    isRecoiling = false;

    const loader = new GLTFLoader();
    loader.load("assets/m1911.glb", gltf => {
        gun = gltf.scene;

        gun.scale.set(0.00005, 0.00005, 0.00005);
        gun.position.copy(GUN_POSITION);

        gunBaseRotZ = gun.rotation.z;

        sceneRef.add(gun);
    });

    // gun shot sound
    gunShotSound = new THREE.Audio(camera.children.find(o => o.type === "AudioListener"));

    const audioLoader = new THREE.AudioLoader();
    audioLoader.load("backsound/gun-shot-359196.wav", buffer => {
        gunShotSound.setBuffer(buffer);
        gunShotSound.setVolume(0.8);
    });


    singleCharacter = player;
    isActive = true;
}

export function updateScene16(delta) {
    if (!singleCharacter) return;

    const mesh = singleCharacter.mesh;

    // fase delay
    if (!startRotate) {
        delayTimer += delta;
        if (delayTimer >= ROTATE_DELAY) {
            startRotate = true;
        }
    }
    // fase muter karakter
    else if (!recoilTriggered) {
        mesh.rotation.y += ROTATE_STEP;

        if (mesh.rotation.y >= TARGET_YAW) {
            mesh.rotation.y = TARGET_YAW;

            // trigger recoil sekali saja
            recoilTriggered = true;
            isRecoiling = true;
            recoilTime = 0;

            charBaseQuat.copy(mesh.quaternion);
            charBasePos.copy(mesh.position);

            // PLAY SOUND SEKALI
            if (gunShotSound && !gunShotSound.isPlaying) {
                gunShotSound.play(0);
            }
        }
    }

    const oldPos = mesh.position.clone();

    singleCharacter.update(delta, {
        position: mesh.position,
        oldPosition: oldPos,
        isMoving: false
    });

    // recoil
    if (isRecoiling && gun) {
        recoilTime += delta;
        const t = Math.min(recoilTime / RECOIL_DURATION, 1);

        const kickPhase = Math.min(t / 0.3, 1);

        // recoil pistol
        gun.rotation.z =
            gunBaseRotZ + RECOIL_ANGLE_GUN * (1 - kickPhase);

        // recoil karakter ke belakang relatif hadapnya
        const recoilQuat = new THREE.Quaternion();
        recoilQuat.setFromAxisAngle(
            new THREE.Vector3(1, 0, 0),
            RECOIL_ANGLE_CHAR
        );

        mesh.quaternion.copy(charBaseQuat).multiply(recoilQuat);

        // karakter kelempar
        mesh.position.lerpVectors(
            charBasePos,
            THROW_TARGET,
            t
        );

        if (t >= 1) {
            gun.rotation.z = gunBaseRotZ;
            isRecoiling = false;
        }
    }
}

export function clearScene16() {
    if (!singleCharacter) return;

    if (singleCharacter.mixer) {
        singleCharacter.mixer.stopAllAction();
    }

    if (sceneRef) {
        sceneRef.remove(singleCharacter.mesh);
    }

    if (gun) {
        sceneRef.remove(gun);
        gun.traverse(o => {
            if (o.isMesh) {
                o.geometry.dispose();
                if (o.material.map) o.material.map.dispose();
                o.material.dispose();
            }
        });
        gun = null;
    }

    if (gunShotSound) {
        gunShotSound.stop();
        gunShotSound.disconnect();
        gunShotSound = null;
    }

    singleCharacter = null;
    isActive = false;
    recoilTriggered = false;
}

export function isScene16Active() {
    return isActive;
}

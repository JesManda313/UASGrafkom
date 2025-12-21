import * as THREE from "three";
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.167/examples/jsm/loaders/GLTFLoader.js";

let scene15Active = false;
let scene15PlayerObjects = [];
let sceneReference = null;
let userPlayerReference = null;
let scene15StartTime = 0;

// HAND
let handGroup = null;
let handFadeStart = 0;

// AUDIO
let scene15Listener = null;
let scene15Sound = null;

// =====================
// CHARACTER POSITION
// =====================
const POS_X = 1.07;
const POS_Y = 0.000001;
const POS_Z = -2.28;
const YAW_DEG = -50.6;

// =====================
// HAND TRANSFORM (TARGET)
// =====================
const HAND_X = 1.04;
const HAND_Y = 0.015;
const HAND_Z = -2.22;

const HAND_START_X = HAND_X - 0.01;

const HAND_YAW = 129.7 * Math.PI / 180;
const HAND_PITCH = -7 * Math.PI / 180;
const HAND_ROLL = -45 * Math.PI / 180;

// =====================
// TIMING
// =====================
const TILT_START = 2.0;
const TILT_DURATION = 2.0;

const HAND_APPEAR_TIME = 0.8;
const HAND_FADE_DURATION = 0.6;
const HAND_RISE = 0.02;

// =====================

export async function initializeScene15(scene, createPlayerFunc, playerObj, camera) {
    if (scene15Active) return;

    sceneReference = scene;
    userPlayerReference = playerObj;

    if (userPlayerReference?.mesh) {
        userPlayerReference.mesh.visible = false;
    }

    // =====================
    // AUDIO SETUP
    // =====================
    scene15Listener = new THREE.AudioListener();
    camera.add(scene15Listener);

    scene15Sound = new THREE.Audio(scene15Listener);
    const audioLoader = new THREE.AudioLoader();

    audioLoader.load("backsound/scene15Audio.mp3", (buffer) => {
        scene15Sound.setBuffer(buffer);
        scene15Sound.setLoop(false);
        scene15Sound.setVolume(0.7);
        scene15Sound.play();
    });

    // =====================
    // CREATE CHARACTER
    // =====================
    const player = await createPlayerFunc(
        scene,
        new THREE.Vector3(POS_X, POS_Y, POS_Z),
        "#00ff3c",
        camera
    );

    player.mesh.rotation.order = "YXZ";
    player.mesh.rotation.y = YAW_DEG * Math.PI / 180;
    player.mesh.rotation.x = 0;

    scene15PlayerObjects.push(player);

    // =====================
    // LOAD HAND
    // =====================
    const loader = new GLTFLoader();
    loader.load("assets/tangan.glb", (gltf) => {
        if (!scene15Active) return;

        const handContainer = new THREE.Group();

        gltf.scene.traverse(obj => {
            if (
                obj.isMesh &&
                (obj.name.toLowerCase().includes("nose2") ||
                 obj.name.toLowerCase().includes("nose3"))
            ) {
                const mat = new THREE.MeshBasicMaterial({
                    color: 0x00cc30,
                    transparent: true,
                    opacity: 0,
                    side: THREE.DoubleSide
                });

                const mesh = obj.clone();
                mesh.material = mat;
                handContainer.add(mesh);

                const outline = obj.clone();
                outline.material = new THREE.MeshBasicMaterial({
                    color: 0x000000,
                    side: THREE.BackSide
                });
                outline.scale.multiplyScalar(1.05);
                handContainer.add(outline);
            }
        });

        handContainer.scale.set(0.0009, 0.0009, 0.0009);
        handContainer.position.set(
            HAND_START_X,
            HAND_Y - HAND_RISE,
            HAND_Z
        );

        handContainer.rotation.order = "YXZ";
        handContainer.rotation.set(HAND_PITCH, HAND_YAW, HAND_ROLL);

        handContainer.visible = false;
        scene.add(handContainer);
        handGroup = handContainer;
    });

    scene15Active = true;
    scene15StartTime = performance.now();
}

export function updateScene15(delta) {
    if (!scene15Active) return false;

    const elapsed = (performance.now() - scene15StartTime) / 1000;

    // =====================
    // CHARACTER TILT
    // =====================
    scene15PlayerObjects.forEach(player => {
        if (player.mixer) player.mixer.update(delta);

        if (elapsed > TILT_START) {
            const t = Math.min((elapsed - TILT_START) / TILT_DURATION, 1);
            const smooth = t * t * (3 - 2 * t);
            player.mesh.rotation.x = smooth * (15 * Math.PI / 180);
        }
    });

    // =====================
    // HAND APPEAR + MOVE
    // =====================
    if (handGroup && elapsed >= HAND_APPEAR_TIME) {
        if (handFadeStart === 0) {
            handFadeStart = elapsed;
            handGroup.visible = true;
        }

        const t = Math.min(
            (elapsed - handFadeStart) / HAND_FADE_DURATION,
            1
        );
        const smooth = t * t * (3 - 2 * t);

        handGroup.position.x =
            HAND_START_X + (HAND_X - HAND_START_X) * smooth;

        handGroup.position.y =
            HAND_Y - HAND_RISE + HAND_RISE * smooth;

        handGroup.traverse(obj => {
            if (obj.material?.transparent) {
                obj.material.opacity = smooth;
            }
        });
    }

    return true;
}

export function clearScene15() {
    if (!scene15Active) return;

    scene15PlayerObjects.forEach(p => {
        if (p.mixer) p.mixer.stopAllAction();
        sceneReference.remove(p.mesh);
    });

    if (handGroup) {
        sceneReference.remove(handGroup);
        handGroup = null;
    }

    // STOP AUDIO
    if (scene15Sound && scene15Sound.isPlaying) {
        scene15Sound.stop();
    }

    scene15PlayerObjects = [];
    scene15Active = false;
    handFadeStart = 0;

    if (userPlayerReference?.mesh) {
        userPlayerReference.mesh.visible = true;
    }
}

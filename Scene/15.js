import * as THREE from "three";

let scene15Active = false;
let scene15PlayerObjects = [];
let sceneReference = null;
let userPlayerReference = null;
let scene15StartTime = 0;

// Position: 1.07, 0.005, -2.27
const POS_X = 1.07;
const POS_Y = 0.000001;
const POS_Z = -2.28;
const YAW_DEG = -50.6; // Match end of Scene 14

export async function initializeScene15(scene, createPlayerFunc, playerObj, camera) {
    if (scene15Active) return;

    sceneReference = scene;
    userPlayerReference = playerObj;

    // Sembunyikan player user jika ada
    if (userPlayerReference && userPlayerReference.mesh) {
        userPlayerReference.mesh.visible = false;
    }

    // Create NPC
    const startPos = new THREE.Vector3(POS_X, POS_Y, POS_Z);
    const color = "#00ff3c"; // Green as requested in 14.js

    const player = await createPlayerFunc(scene, startPos, color, camera);

    // Set Orientation
    // Set Rotation Order to ensure Yaw applies first, then Pitch
    player.mesh.rotation.order = "YXZ";

    // Yaw (Y-axis)
    player.mesh.rotation.y = YAW_DEG * Math.PI / 180;

    // Orientasi Awal: Tegak
    player.mesh.rotation.x = 0;
    player.mesh.rotation.z = 0;

    player.mesh.visible = true;
    scene15PlayerObjects.push(player);

    scene15Active = true;
    scene15StartTime = performance.now();
}

export function updateScene15(delta) {
    if (!scene15Active) return false;

    // Static scene, no movement updates needed. 
    // Just keep mixer running if there's idle animation (breathing)
    scene15PlayerObjects.forEach(player => {
        if (player.mixer) player.mixer.update(delta);

        // ANIMASI CONDONG KE DEPAN (TILT FORWARD)
        const elapsed = (performance.now() - scene15StartTime) / 1000;
        const startDelay = 2.0;    // Jeda sebelum mulai menunduk
        const duration = 2.0;      // Durasi gerakan menunduk

        // Target kemiringan (dalam radian). 
        // 15 derajat = 15 * Math.PI / 180 = ~0.26 rad
        // "Sedikit condong" -> Coba 15 derajat.
        const targetTilt = 15 * Math.PI / 180;

        if (elapsed > startDelay) {
            const t = Math.min((elapsed - startDelay) / duration, 1.0);
            const smoothT = t * t * (3 - 2 * t); // Easing

            // Gunakan minus jika positif malah mendongak
            player.mesh.rotation.x = smoothT * targetTilt;
        } else {
            player.mesh.rotation.x = 0;
        }
    });

    if (document.getElementById("pos")) document.getElementById("pos").innerText = "Scene 15 Active: Looking Down";

    return true;
}

export function clearScene15() {
    if (!scene15Active) return;

    scene15PlayerObjects.forEach(player => {
        if (player.mixer) player.mixer.stopAllAction();
        if (sceneReference) {
            // Reset rotation before removing just in case, though new instances are created
            // Removing mesh from scene
            sceneReference.remove(player.mesh);
        }
    });

    scene15PlayerObjects = [];
    scene15Active = false;

    // Munculkan lagi player user
    if (userPlayerReference && userPlayerReference.mesh) {
        userPlayerReference.mesh.visible = true;
    }
}

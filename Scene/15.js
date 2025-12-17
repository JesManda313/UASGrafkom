import * as THREE from "three";

let scene15Active = false;
let scene15PlayerObjects = [];
let sceneReference = null;
let userPlayerReference = null;

// Position: 1.03, 0.005, -2.36
const POS_X = 1.03;
const POS_Y = 0.005;
const POS_Z = -2.36;
const YAW_DEG = -6.9; // Match end of Scene 14

export async function initializeScene15(scene, createPlayerFunc, playerObj) {
    if (scene15Active) return;

    sceneReference = scene;
    userPlayerReference = playerObj;

    // Sembunyikan player user jika ada
    if (userPlayerReference && userPlayerReference.mesh) {
        userPlayerReference.mesh.visible = false;
    }

    // Create NPC
    const startPos = new THREE.Vector3(POS_X, POS_Y, POS_Z);
    const color = "#00ff3cff"; // Green as requested in 14.js

    const player = await createPlayerFunc(scene, startPos, color);

    // Set Orientation
    // Yaw (Y-axis)
    player.mesh.rotation.y = YAW_DEG * Math.PI / 180;

    // Pitch (X-axis) - "Looking down"
    // Experiment: Tilt forward ~20-30 degrees
    player.mesh.rotation.x = 25 * Math.PI / 180;

    player.mesh.visible = true;
    scene15PlayerObjects.push(player);

    scene15Active = true;
}

export function updateScene15(delta) {
    if (!scene15Active) return false;

    // Static scene, no movement updates needed. 
    // Just keep mixer running if there's idle animation (breathing)
    scene15PlayerObjects.forEach(player => {
        if (player.mixer) player.mixer.update(delta);
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

import * as THREE from "three";

const CHARACTER_SPEED = 0.2; // Slow speed for small area
const SMOOTH_FACTOR = 0.05;

const scene14MovementData = [
    {
        color: "#00ff3c", // Default as requested or standard
        start: new THREE.Vector3(0.79, 0.005, -2.55),
        startYaw: -91.9 * Math.PI / 180,
        path: [
            // 1. Diam di tempat, putar ke Yaw 47.5
            {
                pos: new THREE.Vector3(0.79, 0.005, -2.55),
                wait: 2.0, // Waktu tunggu untuk putar
                yaw: 47.5 * Math.PI / 180
            },
            // 2. Jalan ke 0.98, -2.40 (Yaw otomatis mengikuti arah jalan ~56 deg)
            new THREE.Vector3(0.98, 0.005, -2.40),
            // 3. Jalan ke 1.03, -2.36
            new THREE.Vector3(1.03, 0.005, -2.36)
        ],
        // 4. Akhirnya putar ke -6.9
        yawEnd: -6.9 * Math.PI / 180
    }
];

let scene14Active = false;
let scene14PlayerObjects = [];
let sceneReference = null;
let userPlayerReference = null;

// --- LOGIC PERGERAKAN (Disederhanakan dari Scene 2) ---

function updateCharacterMovement(player, delta) {

    if (player.isWaiting) {
        player.isMoving = false;

        // Yaw Smoothing
        if (player.targetYaw !== null) {
            let currentYaw = player.mesh.rotation.y;
            let targetYaw = player.targetYaw;

            let deltaYaw = targetYaw - currentYaw;
            // Normalize angle -PI to PI
            while (deltaYaw > Math.PI) deltaYaw -= 2 * Math.PI;
            while (deltaYaw < -Math.PI) deltaYaw += 2 * Math.PI;

            currentYaw += deltaYaw * SMOOTH_FACTOR; // Smooth rotation

            // Snap if close
            if (Math.abs(deltaYaw) < 0.01) currentYaw = targetYaw;

            player.mesh.rotation.y = currentYaw;
        }

        player.waitTimer += delta;
        if (player.waitTimer >= player.waitDuration) {
            player.isWaiting = false;
            player.waitTimer = 0;
            player.currentGoal = null;
            player.targetYaw = null;
        }
        return false;
    }

    if (!player.currentGoal && player.targetPath.length > 0) {
        let nextGoal = player.targetPath.shift();

        if (nextGoal.pos && nextGoal.wait !== undefined) {
            // Ini adalah instruction untuk WAIT + ROTATE
            player.currentGoal = nextGoal.pos; // Sebenarnya posisinya sama, tapi kita set target
            player.waitDuration = nextGoal.wait;
            player.isWaiting = true;
            player.targetYaw = nextGoal.yaw !== undefined ? nextGoal.yaw : null;
        } else if (nextGoal instanceof THREE.Vector3) {
            player.currentGoal = nextGoal;
        } else {
            player.currentGoal = new THREE.Vector3(nextGoal.x, nextGoal.y, nextGoal.z);
        }
    }

    if (player.currentGoal) {
        const oldPos = player.mesh.position.clone();
        const dir = player.currentGoal.clone().sub(oldPos);
        dir.y = 0;

        const distance = dir.length();

        // Kalau jarak masih jauh, jalan
        if (distance > CHARACTER_SPEED * delta) {
            dir.normalize();
            const newPos = oldPos.clone().addScaledVector(dir, CHARACTER_SPEED * delta);

            // Menghadap arah jalan
            const yaw = Math.atan2(dir.x, dir.z);
            // Simple rotation snap for walking (or smooth it if desired, but snap is safer for pathing)
            player.mesh.rotation.y = yaw;

            player.mesh.position.copy(newPos);
            player.isMoving = true;
            return true;
        } else {
            // Sudah sampai
            player.mesh.position.copy(player.currentGoal);
            player.currentGoal = null;
            player.isMoving = false;

            if (player.isWaiting) {
                return false;
            } else if (player.targetPath.length === 0) {
                // Selesai semua path, set final rotation
                player.targetYaw = player.yawEnd; // Kita gunakan mekanisme waiting untuk final rot
                player.waitDuration = 9999; // Abadi diam
                player.isWaiting = true;
                return false;
            }
            return true;
        }
    }

    return false;
}

export async function initializeScene14(scene, createPlayerFunc, playerObj, camera) {
    if (scene14Active) return;

    sceneReference = scene;
    userPlayerReference = playerObj;

    // Sembunyikan player user jika ada
    if (userPlayerReference && userPlayerReference.mesh) {
        userPlayerReference.mesh.visible = false;
    }

    for (let i = 0; i < scene14MovementData.length; i++) {
        const data = scene14MovementData[i];

        // Buat NPC
        // createPlayerFunc(scene, startPos, color)
        const player = await createPlayerFunc(scene, data.start, data.color || "#ff0000", camera);

        // Set rotasi awal
        if (data.startYaw !== undefined) {
            player.mesh.rotation.y = data.startYaw;
        }

        // Setup properties
        player.targetPath = data.path.map(item => {
            if (item.pos) return { pos: item.pos.clone(), wait: item.wait, yaw: item.yaw };
            if (item instanceof THREE.Vector3) return item.clone();
            return new THREE.Vector3(item.x, item.y, item.z);
        });

        player.yawEnd = data.yawEnd;
        player.currentGoal = null;
        player.isMoving = false;
        player.isWaiting = false;
        player.waitDuration = 0;
        player.waitTimer = 0;
        player.targetYaw = null;

        player.mesh.visible = true;
        scene14PlayerObjects.push(player);
    }

    scene14Active = true;
}

export function updateScene14(delta) {
    if (!scene14Active) return false;

    scene14PlayerObjects.forEach(player => {
        const oldPos = player.mesh.position.clone();

        // Panggil logic pergerakan
        const moved = updateCharacterMovement(player, delta);

        // Update animasi mixer & visual
        // note: player.update dari character.js biasanya handle mixer.update
        if (player.update) {
            player.update(delta, {
                position: player.mesh.position,
                oldPosition: oldPos,
                isMoving: player.isMoving
            });
        }
    });

    if (document.getElementById("pos")) document.getElementById("pos").innerText = "Scene 14 Active";

    return true;
}

export function clearScene14() {
    if (!scene14Active) return;

    scene14PlayerObjects.forEach(player => {
        if (player.update) {
            player.update(0, {
                position: player.mesh.position,
                oldPosition: player.mesh.position,
                isMoving: false,
            });
        }
        if (player.mixer) player.mixer.stopAllAction();
        if (sceneReference) sceneReference.remove(player.mesh);
    });

    scene14PlayerObjects = [];
    scene14Active = false;

    // Munculkan lagi player user
    if (userPlayerReference && userPlayerReference.mesh) {
        userPlayerReference.mesh.visible = true;
    }
}

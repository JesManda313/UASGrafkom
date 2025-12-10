import * as THREE from "three";

const CHARACTER_SPEED = 0.2;
const ROTATION_SPEED = 2.5; 

const lightGreen = "#4CB864"; // hijau muda

// Rotasi menghadap target X
const yawToTarget = Math.atan2((1.00 - 1.74), ( -2.54 - -2.54 )); // arah ke X 1.00
// Hasilnya akan 180 derajat (pi rad)

const lookLeft = yawToTarget + Math.PI / 2;   // +90
const lookRight = yawToTarget - Math.PI / 2;  // -90

const movementData = {
    color: lightGreen,
    start: new THREE.Vector3(1.74, 0.005, -2.54),

    path: [

        // 1. Jalan ke X 1.00 Z sama
        new THREE.Vector3(1.00, 0.005, -2.54),

        // 2. Noleh kiri 90
        { 
            pos: new THREE.Vector3(1.00, 0.005, -2.54), 
            wait: 1.5,
            yaw: lookLeft
        },

        // 3. Noleh kanan 90
        { 
            pos: new THREE.Vector3(1.00, 0.005, -2.54), 
            wait: 1.5,
            yaw: lookRight
        },

        // 4. Jalan ke Z -2.97
        new THREE.Vector3(1.00, 0.005, -2.97)
    ],

    yawEnd: lookRight // After everything, face right
};

let singleCharacter = null;
let sceneRef = null;

export async function initializeScene6(scene, createPlayerFunc) {
    if (singleCharacter) return;

    sceneRef = scene;

    const data = movementData;

    const player = await createPlayerFunc(scene, data.start, data.color);

    player.targetPath = data.path.map(it => {
        if (it.pos) return { pos: it.pos.clone(), wait: it.wait, yaw: it.yaw };
        if (it instanceof THREE.Vector3) return it.clone();
        return new THREE.Vector3(it.x, it.y, it.z);
    });

    player.yawEnd = data.yawEnd;
    player.currentGoal = null;
    player.isMoving = false;
    player.isWaiting = false;
    player.waitDuration = 0;
    player.waitTimer = 0;
    player.targetYaw = null;
    player.initialYaw = null;

    singleCharacter = player;
}

export function updateScene6(delta) {
    if (!singleCharacter) return;

    const oldPos = singleCharacter.mesh.position.clone();
    const moved = updateCharacterMovement(singleCharacter, delta);

    if (moved || singleCharacter.isWaiting) {
        singleCharacter.update(delta, {
            position: singleCharacter.mesh.position,
            oldPosition: oldPos,
            isMoving: singleCharacter.isMoving
        });
    }
}

export function clearScene6() {
    if (!singleCharacter) return;

    if (singleCharacter.mixer) singleCharacter.mixer.stopAllAction();
    if (sceneRef) sceneRef.remove(singleCharacter.mesh);

    singleCharacter = null;
}

function updateCharacterMovement(player, delta) {
    if ((!player.targetPath || player.targetPath.length === 0) && !player.currentGoal) {
        player.isMoving = false;
        return false;
    }

    if (!player.currentGoal) {
        player.currentGoal = player.targetPath.shift();
    }

    const goal = player.currentGoal;

    // Wait
    if (goal.wait && !player.isWaiting) {
        player.isWaiting = true;

        player.isMoving = goal.yaw !== undefined;

        player.waitTimer = 0;
        player.waitDuration = goal.wait;

        if (goal.yaw !== undefined) {
            player.targetYaw = goal.yaw;
            player.initialYaw = player.mesh.rotation.y;
        }

        return true;
    }

    if (player.isWaiting) {
        player.isMoving = player.targetYaw !== null;
        player.waitTimer += delta;

        if (player.targetYaw !== null) {
            const t = Math.min((player.waitTimer / player.waitDuration) * ROTATION_SPEED, 1);
            player.mesh.rotation.y = THREE.MathUtils.lerp(
                player.initialYaw, 
                player.targetYaw, 
                t
            );
            // Jika rotasi sudah selesai, hentikan animasi jalan
            if (t >= 1) {
                player.isMoving = false;
            }
        }

        if (player.waitTimer >= player.waitDuration) {
            player.isWaiting = false;
            player.currentGoal = null;
            player.targetYaw = null;
        }

        return true;
    }

    const targetPos = goal.pos ?? goal;

    const pos = player.mesh.position;
    const dir = targetPos.clone().sub(pos);
    const dist = dir.length();

    if (dist < 0.001) {
        player.isMoving = false;      // sampai di titik
        if (goal.yaw !== undefined) {
            player.targetYaw = goal.yaw;
            player.initialYaw = player.mesh.rotation.y;
        }
        player.currentGoal = null;
        return true;
    }

    // Bergerak
    player.isMoving = true;

    dir.normalize();
    pos.add(dir.multiplyScalar(CHARACTER_SPEED * delta));

    const targetYawMove = Math.atan2(dir.x, dir.z);
    player.mesh.rotation.y = targetYawMove;

    return true;
}

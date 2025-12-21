import * as THREE from "three";

const CHARACTER_SPEED = 0.2;
const SMOOTH_FACTOR = 0.05;
const BASE_SCALE = 0.019;

const scene14MovementData = [
    {
        color: "#00ff3c",
        start: new THREE.Vector3(0.79, 0.005, -2.55),
        startYaw: -91.9 * Math.PI / 180,
        path: [
            {
                pos: new THREE.Vector3(0.79, 0.005, -2.55),
                wait: 1.0,
                yaw: -91.9 * Math.PI / 180,
                doStretch: false,
                playSwoosh: false
            },
            {
                pos: new THREE.Vector3(0.79, 0.005, -2.55),
                wait: 1.0,
                yaw: 47.5 * Math.PI / 180,
                doStretch: false,
                playSwoosh: true
            },
            {
                pos: new THREE.Vector3(0.79, 0.005, -2.55),
                wait: 0.7,
                yaw: 47.5 * Math.PI / 180,
                doStretch: false
            },
            {
                pos: new THREE.Vector3(0.79, 0.005, -2.55),
                wait: 0.45,
                yaw: 47.5 * Math.PI / 180,
                doStretch: true
            },
            {
                pos: new THREE.Vector3(0.79, 0.005, -2.55),
                wait: 0.5,
                yaw: 47.5 * Math.PI / 180,
                doStretch: false
            },
            new THREE.Vector3(0.98, 0.005, -2.40),
            new THREE.Vector3(1.03, 0.005, -2.36)
        ],
        yawEnd: -6.9 * Math.PI / 180
    }
];

let scene14Active = false;
let scene14PlayerObjects = [];
let sceneReference = null;
let userPlayerReference = null;

// Variabel Audio
let swooshSound = null;
let surpriseSound = null;
let scene14Audio = null; // Audio baru

function playEffect(sound) {
    if (sound && sound.buffer) {
        if (sound.isPlaying) sound.stop();
        sound.play();
    }
}

function updateCharacterMovement(player, delta) {
    // Logika Timer Audio Scene 14 (Berjalan secara independen setelah stretch selesai)
    if (player.pendingSceneAudio) {
        player.sceneAudioTimer += delta;
        if (player.sceneAudioTimer >= 0.75) { // Jeda 1 detik
            playEffect(scene14Audio);
            player.pendingSceneAudio = false;
            player.sceneAudioTimer = 0;
        }
    }

    if (player.isWaiting) {
        player.isMoving = false;

        if (player.targetYaw !== null) {
            let currentYaw = player.mesh.rotation.y;
            let targetYaw = player.targetYaw;
            let deltaYaw = targetYaw - currentYaw;

            while (deltaYaw > Math.PI) deltaYaw -= 2 * Math.PI;
            while (deltaYaw < -Math.PI) deltaYaw += 2 * Math.PI;

            if (player.needsSwooshSound && Math.abs(deltaYaw) > 0.05) {
                playEffect(swooshSound);
                player.needsSwooshSound = false;
            }

            currentYaw += deltaYaw * SMOOTH_FACTOR;
            if (Math.abs(deltaYaw) < 0.01) currentYaw = targetYaw;
            player.mesh.rotation.y = currentYaw;
        }

        if (player.shouldStretch) {
            if (player.needsSurpriseSound) {
                playEffect(surpriseSound);
                player.needsSurpriseSound = false;
            }

            const t = player.waitTimer / player.waitDuration;
            const stretchFactor = 1 + Math.sin(t * Math.PI) * 0.2;
            player.mesh.scale.set(BASE_SCALE, BASE_SCALE * stretchFactor, BASE_SCALE);
        }

        player.waitTimer += delta;

        if (player.waitTimer >= player.waitDuration) {
            // Cek jika baru saja selesai melakukan stretch
            if (player.shouldStretch) {
                player.pendingSceneAudio = true;
                player.sceneAudioTimer = 0;
            }

            player.mesh.scale.set(BASE_SCALE, BASE_SCALE, BASE_SCALE);
            player.isWaiting = false;
            player.shouldStretch = false;
            player.waitTimer = 0;
            player.currentGoal = null;
        }
        return false;
    }

    if (!player.currentGoal && player.targetPath.length > 0) {
        let nextGoal = player.targetPath.shift();

        if (nextGoal.pos && nextGoal.wait !== undefined) {
            player.currentGoal = nextGoal.pos;
            player.waitDuration = nextGoal.wait;
            player.isWaiting = true;
            player.targetYaw = nextGoal.yaw !== undefined ? nextGoal.yaw : null;
            player.shouldStretch = nextGoal.doStretch || false;
            player.needsSwooshSound = nextGoal.playSwoosh || false;
            player.needsSurpriseSound = nextGoal.doStretch || false;
        } else {
            player.currentGoal = nextGoal instanceof THREE.Vector3
                ? nextGoal
                : new THREE.Vector3(nextGoal.x, nextGoal.y, nextGoal.z);
        }
    }

    if (player.currentGoal) {
        const dir = player.currentGoal.clone().sub(player.mesh.position);
        dir.y = 0;

        if (dir.length() > CHARACTER_SPEED * delta) {
            dir.normalize();
            player.mesh.rotation.y = Math.atan2(dir.x, dir.z);
            player.mesh.position.addScaledVector(dir, CHARACTER_SPEED * delta);
            player.isMoving = true;
        } else {
            player.mesh.position.copy(player.currentGoal);
            player.currentGoal = null;
            player.isMoving = false;

            if (player.targetPath.length === 0) {
                player.targetYaw = player.yawEnd;
                player.waitDuration = 9999;
                player.isWaiting = true;
            }
        }
    }
    return false;
}

export async function initializeScene14(scene, createPlayerFunc, playerObj, camera) {
    if (scene14Active) return;

    sceneReference = scene;
    userPlayerReference = playerObj;

    if (camera) {
        const listener = camera.children.find(c => c.type === "AudioListener") || new THREE.AudioListener();
        if (!camera.children.includes(listener)) camera.add(listener);

        const audioLoader = new THREE.AudioLoader();

        swooshSound = new THREE.Audio(listener);
        audioLoader.load(
            "backsound/swoosh-sound-effect-for-fight-scenes-or-transitions-2-149890.mp3",
            buffer => {
                swooshSound.setBuffer(buffer);
                swooshSound.setVolume(0.5);
            }
        );

        surpriseSound = new THREE.Audio(listener);
        audioLoader.load(
            "backsound/surprise-sound-effect-99300.mp3",
            buffer => {
                surpriseSound.setBuffer(buffer);
                surpriseSound.setVolume(0.6);
            }
        );

        // Load Audio Scene 14 Baru
        scene14Audio = new THREE.Audio(listener);
        audioLoader.load(
            "backsound/scene14Audio.mp3",
            buffer => {
                scene14Audio.setBuffer(buffer);
                scene14Audio.setVolume(0.7);
            }
        );
    }

    if (userPlayerReference?.mesh) userPlayerReference.mesh.visible = false;

    for (let i = 0; i < scene14MovementData.length; i++) {
        const data = scene14MovementData[i];
        const player = await createPlayerFunc(scene, data.start, data.color || "#ff0000", camera);

        if (data.startYaw !== undefined) {
            player.mesh.rotation.y = data.startYaw;
        }

        player.mesh.scale.set(BASE_SCALE, BASE_SCALE, BASE_SCALE);

        player.targetPath = data.path.map(item => {
            if (item.pos) return { ...item, pos: item.pos.clone() };
            return item.clone();
        });

        player.yawEnd = data.yawEnd;
        player.isWaiting = false;
        player.waitTimer = 0;
        player.waitDuration = 0;
        
        // Inisialisasi status timer audio scene14 pada player
        player.pendingSceneAudio = false;
        player.sceneAudioTimer = 0;

        scene14PlayerObjects.push(player);
    }

    scene14Active = true;
}

export function updateScene14(delta) {
    if (!scene14Active) return false;

    scene14PlayerObjects.forEach(player => {
        const oldPos = player.mesh.position.clone();
        updateCharacterMovement(player, delta);

        if (player.update) {
            player.update(delta, {
                position: player.mesh.position,
                oldPosition: oldPos,
                isMoving: player.isMoving
            });
        }
    });

    return true;
}

export function clearScene14() {
    if (!scene14Active) return;

    if (swooshSound?.isPlaying) swooshSound.stop();
    if (surpriseSound?.isPlaying) surpriseSound.stop();
    if (scene14Audio?.isPlaying) scene14Audio.stop(); // Hentikan audio baru saat cleanup

    scene14PlayerObjects.forEach(player => {
        if (player.mixer) player.mixer.stopAllAction();
        if (sceneReference) sceneReference.remove(player.mesh);
    });

    scene14PlayerObjects = [];
    scene14Active = false;

    if (userPlayerReference?.mesh) userPlayerReference.mesh.visible = true;
}
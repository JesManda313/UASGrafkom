import * as THREE from "three";

const ROTATION_SPEED = 2.5;
const lightGreen = "#00ff3c";

let singleCharacter = null;
let sceneRef = null;
let sound = null; // Variable global untuk menyimpan objek suara

// target kemiringan (derajat)
const TARGET_TILT_Z = THREE.MathUtils.degToRad(-25);
let isActive = false;

export async function initializeScene12(scene, createPlayerFunc, camera) {
    if (singleCharacter) return;

    sceneRef = scene;

    const startPosition = new THREE.Vector3(0.66, 0.025, -2.65);
    const player = await createPlayerFunc(scene, startPosition, lightGreen, camera);

    // Menghadap Z positif
    player.mesh.rotation.y = 0;
    // Mulai dari tidak miring
    player.mesh.rotation.z = 0;
    // Simpan target rotasi
    player.targetTiltZ = TARGET_TILT_Z;

    singleCharacter = player;
    isActive = true;

    // --- LOGIKA PLAY SOUND SAAT DIMULAI ---
    if (camera) {
        // Mencari AudioListener yang sudah ada di kamera
        const listener = camera.children.find(c => c.type === 'AudioListener');
        
        if (listener) {
            sound = new THREE.Audio(listener);
            const audioLoader = new THREE.AudioLoader();
            
            // Load dan Play sound segera setelah scene diinisialisasi
            audioLoader.load('backsound/ngintip.mp3', function (buffer) {
                // Cek isActive agar jika scene cepat ditutup, suara tidak mendadak nyala
                if (isActive && sound) {
                    sound.setBuffer(buffer);
                    sound.setLoop(false); // Sekali putar
                    sound.setVolume(0.5);
                    sound.play(); // Play otomatis saat scene dimulai
                }
            });
        }
    }
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

    // Hentikan suara jika adegan dihapus/selesai
    if (sound && sound.isPlaying) {
        sound.stop();
    }
    sound = null;

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
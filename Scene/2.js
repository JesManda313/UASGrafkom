import * as THREE from "three";

const PLAYER_RADIUS = 0.03;
const TARGET_YAW = 150.7 * Math.PI / 180;
const YAWEND = 135.7 * Math.PI / 180;
const CHARACTER_SPEED = 0.1; 
const SMOOTH_FACTOR = 0.05; 

const scene2MovementData = [
    { 
        color: "#ff0000", 
        start: new THREE.Vector3(6.14, PLAYER_RADIUS - 0.025, -3.77), 
        path: [ 
            new THREE.Vector3(6.33, PLAYER_RADIUS - 0.025, -3.83),
            new THREE.Vector3(6.45, PLAYER_RADIUS - 0.025, -4.28), 
        ],
        yawEnd: 154.6 * Math.PI / 180 
    },
    { 
        color: "#0000ff", 
        start: new THREE.Vector3(6.22, PLAYER_RADIUS - 0.025, -3.66), 
        path: [ 
            new THREE.Vector3(6.22, PLAYER_RADIUS - 0.025, -3.66),
            new THREE.Vector3(6.40, PLAYER_RADIUS - 0.025, -3.58),
            new THREE.Vector3(6.70, PLAYER_RADIUS - 0.025, -3.61),
            new THREE.Vector3(6.72, PLAYER_RADIUS - 0.025, -3.92),
            new THREE.Vector3(6.95, PLAYER_RADIUS - 0.025, -3.92) 
        ],
        yawEnd: 155.4 * Math.PI / 180
    },
    { 
        color: "#ea00ff", 
        start: new THREE.Vector3(6.14, PLAYER_RADIUS - 0.025, -3.77), 
        path: [ 
            { pos: new THREE.Vector3(6.14, PLAYER_RADIUS - 0.025, -3.77), wait: 5.0 },
            new THREE.Vector3(6.44, PLAYER_RADIUS - 0.025, -3.57), 
            new THREE.Vector3(6.64, PLAYER_RADIUS - 0.025, -3.18) 
        ],
        yawEnd: 33.8 * Math.PI / 180
    },
    { 
        color: "#00fbff", 
        start: new THREE.Vector3(6.05, PLAYER_RADIUS - 0.025, -3.77), 
        path: [ 
            { 
                pos: new THREE.Vector3(6.14, PLAYER_RADIUS - 0.025, -3.77), 
                wait: 8.0,
                yaw: 0 * Math.PI / 180 
            }, 
            
            new THREE.Vector3(6.33, PLAYER_RADIUS - 0.025, -3.83), 
            
            { 
                pos: new THREE.Vector3(6.36, PLAYER_RADIUS - 0.025, -3.87), 
                wait: 4.0, 
                yaw: TARGET_YAW 
            },
            
            new THREE.Vector3(6.38, PLAYER_RADIUS - 0.025, -3.65), 
            new THREE.Vector3(6.50, PLAYER_RADIUS - 0.025, -3.59) 
        ],
        yawEnd: YAWEND 
    }
];

let scene2Active = false;
let scene2PlayerObjects = [];
let sceneReference = null; 
let userPlayerReference = null; 

// --- FUNGSI UTAMA PERGERAKAN  ---

function updateCharacterMovement(player, delta){
    
    if(player.isWaiting){
        
        //Set isMoving = false (untuk animasi Idle/Diam)
        player.isMoving = false; 
        
        //Implementasi Yaw Smoothing (Lerp)
        if (player.targetYaw !== null) {
            let currentYaw = player.mesh.rotation.y;
            let targetYaw = player.targetYaw;
            
            let deltaYaw = targetYaw - currentYaw;
            
            if (deltaYaw > Math.PI) deltaYaw -= 2 * Math.PI;
            if (deltaYaw < -Math.PI) deltaYaw += 2 * Math.PI;

            currentYaw += deltaYaw * SMOOTH_FACTOR * 10; 
            
            player.mesh.rotation.y = currentYaw;
        }

        player.waitTimer += delta;
        if(player.waitTimer >= player.waitDuration){
            player.isWaiting = false;
            player.waitTimer = 0;
            player.currentGoal = null; 
            player.targetYaw = null; 
            player.initialYaw = null; // Reset
        }
        return false;
    }

    if(!player.currentGoal && player.targetPath.length > 0){
        let nextGoal = player.targetPath.shift();

        if(nextGoal.pos && nextGoal.wait !== undefined){
            player.currentGoal = nextGoal.pos;
            player.waitDuration = nextGoal.wait;
            player.isWaiting = true;
            player.targetYaw = nextGoal.yaw !== undefined ? nextGoal.yaw : null; 
            
            // TAMBAHAN: Simpan rotasi saat ini sebelum berputar
            if (player.targetYaw !== null) {
                player.initialYaw = player.mesh.rotation.y;
            } else {
                player.initialYaw = null;
            }
        } else if(nextGoal instanceof THREE.Vector3){
            player.currentGoal = nextGoal;
        } else {
             player.currentGoal = new THREE.Vector3(nextGoal.x, nextGoal.y, nextGoal.z);
        }
    }

    if(player.currentGoal){
        const oldPos = player.mesh.position.clone();
        const dir = player.currentGoal.clone().sub(oldPos);
        dir.y = 0; 
        
        const distance = dir.length();

        if(distance > CHARACTER_SPEED * delta){
            dir.normalize();
            const newPos = oldPos.clone().addScaledVector(dir, CHARACTER_SPEED * delta);

            const yaw = Math.atan2(dir.x, dir.z);
            player.mesh.rotation.y = yaw;

            player.mesh.position.copy(newPos);
            player.isMoving = true;
            return true;
        } else {
            player.mesh.position.copy(player.currentGoal);
            player.currentGoal = null;
            player.isMoving = false;
            
            if(player.isWaiting){
                 return false;
            } else if (player.targetPath.length === 0){
                player.mesh.rotation.y = player.yawEnd; // Hadapkan ke arah akhir
                return false;
            }
            return true;
        }
    }
    
    player.isMoving = false;
    return false;
}

// --- FUNGSI YANG DIEKSPOR (Dipanggil di main.html) ---

export async function initializeScene2(scene, createPlayerFunc, playerObj){
    if(scene2Active) return;
    if(!playerObj) return;

    sceneReference = scene;
    userPlayerReference = playerObj;

    userPlayerReference.mesh.visible = false;

    for(let i = 0; i < scene2MovementData.length; i++){
        const data = scene2MovementData[i];
        
        const player = await createPlayerFunc(scene, data.start, data.color);
        
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
        player.initialYaw = null;

        player.mesh.visible = true;
        scene2PlayerObjects.push(player);
    }
    scene2Active = true;
}

export function updateScene2(delta){
    if(!scene2Active) return false;

    scene2PlayerObjects.forEach(player => {
        const oldPos = player.mesh.position.clone();
        const moved = updateCharacterMovement(player, delta);
        
        // player.update dipanggil jika ada pergerakan posisi (moved=true) atau sedang menunggu (isWaiting=true)
        if(moved || player.isWaiting){
             player.update(delta, {
                 position: player.mesh.position,
                 oldPosition: oldPos,
                 isMoving: player.isMoving // Kini bernilai FALSE saat menunggu, memicu Idle
             });
        }
    });
    
    if(document.getElementById("pos")) document.getElementById("pos").innerText = "Scene 2 Aktif (AI)";
    if(document.getElementById("dir")) document.getElementById("dir").innerText = "4 Karakter Bergerak";

    return true;
}

export function clearScene2(){
    if(!scene2Active) return;

    scene2PlayerObjects.forEach(player => {
        if(player.mixer) player.mixer.stopAllAction();
        if(sceneReference) sceneReference.remove(player.mesh);
    });

    scene2PlayerObjects = [];
    scene2Active = false;
    if(userPlayerReference) userPlayerReference.mesh.visible = true;
}
import * as THREE from "three";

let isActive = false;
let scene11Player = null;
let sceneReference = null;
let userPlayerReference = null;
let sceneCamera = null;
let sceneTimer = 0;

const GREEN_COLOR = "#00ff3c";
const PLAYER_START_POS = new THREE.Vector3(0.83, 0.005, -3.24);
const PLAYER_TARGET_POS = new THREE.Vector3(0.77, 0.005, -2.61);

// Camera Animation Config & Initial State
const CAM_START_X = 0.85;
const CAM_START_Y = 0.1;
const CAM_START_Z = -3.00;
const CAM_PEAK_X = 0.86; 

// Camera Targets for Walk Phase
const CAM_END_X = 0.82;
const CAM_END_Z = -2.99; // User edited to -2.97

const CAM_YAW = 170 * (Math.PI / 180);
const CAM_PITCH = -12 * (Math.PI / 180);

// Timing
const WALK_START_TIME = 2.0;
const CAM_MOVE_START_TIME = 2.3; // Delayed start
const CAM_MOVE_DURATION = 0.5;  // Fast transition

let initialRotationY = 0;

export async function initializeScene11(scene, createPlayerFunc, playerObj, camera) {
    if (!playerObj) return;
    isActive = true;
    sceneTimer = 0;
    sceneReference = scene;
    userPlayerReference = playerObj;
    sceneCamera = camera;

    // Hide user player
    if (userPlayerReference && userPlayerReference.mesh) {
        userPlayerReference.mesh.visible = false;
    }

    try {
        const player = await createPlayerFunc(scene, PLAYER_START_POS, GREEN_COLOR);
        
        if (camera) {
            // Set Camera Initial Pose
            camera.position.set(CAM_START_X, CAM_START_Y, CAM_START_Z);
            
            const dir = new THREE.Vector3(
                Math.sin(CAM_YAW) * Math.cos(CAM_PITCH),
                Math.sin(CAM_PITCH),
                Math.cos(CAM_YAW) * Math.cos(CAM_PITCH)
            );
            camera.lookAt(
                camera.position.x + dir.x,
                camera.position.y + dir.y,
                camera.position.z + dir.z
            );

            // Face the camera (Character)
            player.mesh.lookAt(camera.position.x, player.mesh.position.y, camera.position.z);
            initialRotationY = player.mesh.rotation.y;

        } else {
            player.mesh.rotation.y = Math.PI; 
            initialRotationY = Math.PI;
        }
        
        player.isMoving = false;
        
        scene11Player = player;
    } catch (e) {
        console.error("Error initializing Scene 11:", e);
    }
}

export function updateScene11(delta) {
    if (!isActive) return;

    sceneTimer += delta;

    if (userPlayerReference && userPlayerReference.mesh) {
        userPlayerReference.mesh.visible = false;
    }
    
    // Ensure Y is constant (only X/Z animate)
    if(sceneCamera) {
        sceneCamera.position.y = CAM_START_Y;
    }

    if (scene11Player && scene11Player.mesh) {
        let isMoving = false;
        
        // TIMELINE

        // Phase 1: 0s - 1s (Idle)
        if (sceneTimer < 1.0) {
            if (sceneCamera) {
                sceneCamera.position.x = CAM_START_X;
                sceneCamera.position.z = CAM_START_Z;
            }
            scene11Player.mesh.rotation.y = initialRotationY;
        }
        // Phase 2: 1s - 2s (Look Left/Right + Camera Move)
        else if (sceneTimer < 2.0) {
            const t = (sceneTimer - 1.0) / 1.0; 
            
            // Sync Pulse: 0 -> 1 -> 0
            const pulse = Math.sin(t * Math.PI); 

            if (sceneCamera) {
                sceneCamera.position.x = CAM_START_X + pulse * (CAM_PEAK_X - CAM_START_X);
                sceneCamera.position.z = CAM_START_Z;
            }

            // Character Rotate
            // Double sway for "Kiri Kanan" but aligned with Camera
            const rotOffset = Math.sin(t * Math.PI * 2) * 0.3; 
            scene11Player.mesh.rotation.y = initialRotationY + rotOffset;
        }
        // Phase 3: 2s - 5s (Move to Target)
        else if (sceneTimer < 5.0) {
            
            // Character Move (3s duration)
            const tMove = (sceneTimer - WALK_START_TIME) / 3.0; // 0 to 1
            const newPos = new THREE.Vector3().lerpVectors(PLAYER_START_POS, PLAYER_TARGET_POS, tMove);
            scene11Player.mesh.position.copy(newPos);
            
            // Face target direction
            const dir = new THREE.Vector3().subVectors(PLAYER_TARGET_POS, PLAYER_START_POS).normalize();
            if(dir.lengthSq() > 0.001) {
                const targetRot = Math.atan2(dir.x, dir.z);
                 scene11Player.mesh.rotation.y = targetRot;
            }

            // Camera Move (Delayed 2.9s)
            if (sceneCamera) {
                if (sceneTimer >= CAM_MOVE_START_TIME) {
                    let tCam = (sceneTimer - CAM_MOVE_START_TIME) / CAM_MOVE_DURATION;
                    if(tCam > 1.0) tCam = 1.0;
                    
                    sceneCamera.position.x = CAM_START_X + (CAM_END_X - CAM_START_X) * tCam;
                    sceneCamera.position.z = CAM_START_Z + (CAM_END_Z - CAM_START_Z) * tCam;
                } else {
                    // Holding Start Pos until trigger
                    sceneCamera.position.x = CAM_START_X;
                    sceneCamera.position.z = CAM_START_Z;
                }
            }

            isMoving = true;
        }
        // Phase 4: > 5s (Stop)
        else {
            if (sceneCamera) {
                sceneCamera.position.x = CAM_END_X;
                sceneCamera.position.z = CAM_END_Z;
            }
            scene11Player.mesh.position.copy(PLAYER_TARGET_POS);
            isMoving = false;
        }

        if (scene11Player.update) {
            scene11Player.update(delta, {
                position: scene11Player.mesh.position,
                oldPosition: scene11Player.mesh.position, 
                isMoving: isMoving
            });
        }
    }
}

export function clearScene11() {
    isActive = false;

    if (scene11Player) {
        if (scene11Player.mixer) scene11Player.mixer.stopAllAction();
        if (sceneReference && scene11Player.mesh) sceneReference.remove(scene11Player.mesh);
        scene11Player = null;
    }

    if (userPlayerReference && userPlayerReference.mesh) {
        userPlayerReference.mesh.visible = true;
    }
}

export function isScene11Active() {
    return isActive;
}

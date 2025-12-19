import * as THREE from "three";
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.167/examples/jsm/loaders/GLTFLoader.js";

export async function createPlayer(scene, startPos, color = "#ff0000", camera = null) {
    return new Promise((resolve, reject) => {
        const loader = new GLTFLoader();

        loader.load(
            "assets/astronaut3.glb",
            gltf => {
                const model = gltf.scene;
                model.scale.set(0.019, 0.019, 0.019);
                model.position.copy(startPos);

                const initialColor = new THREE.Color(color);

                // restore: apply new material to cube meshes
                model.traverse(obj => {
                    if (obj.isMesh && obj.material) {
                        const name = obj.name.toLowerCase();

                        obj.castShadow = true;
                        obj.receiveShadow = true;

                        if (name.includes("cube")) {
                            obj.material = new THREE.MeshStandardMaterial({
                                color: initialColor,
                                roughness: 0.7,
                                metalness: 0.5,
                                emissive: 0x000000,
                                emissiveIntensity: 0,
                                emissiveMap: null
                            });
                            obj.material.map = null;
                            obj.material.needsUpdate = true;
                        }
                    }
                });

                scene.add(model);

                const mixer = new THREE.AnimationMixer(model);

                const walkAction = gltf.animations.length > 0
                    ? mixer.clipAction(gltf.animations[0])
                    : null;

                let isWalking = false;

                // AUDIO: Walking Sound
                let walkSound = null;
                if (camera) {
                    const listener = camera.children.find(c => c.type === 'AudioListener');
                    if (listener) {
                        walkSound = new THREE.PositionalAudio(listener);
                        const audioLoader = new THREE.AudioLoader();
                        audioLoader.load('backsound/the-among-us-walking-sound-effect.mp3', function (buffer) {
                            walkSound.setBuffer(buffer);
                            walkSound.setLoop(true);
                            walkSound.setRefDistance(1); // Jarak suara mulai mengecil
                            walkSound.setVolume(2.0); // Naikkan volume agar terdengar jelas

                            // Jika saat file selesai dimuat ternyata karakter SEDANG berjalan, langsung play
                            if (isWalking && !walkSound.isPlaying) {
                                walkSound.play();
                            }
                        });
                        model.add(walkSound); // Tempelkan suara ke karakter agar 3D
                    }
                }

                function setWalking(flag) {
                    if (!walkAction) return;
                    if (flag === isWalking) return;
                    isWalking = flag;

                    if (isWalking) {
                        walkAction.reset().fadeIn(0.2).play();

                        // Play Sound
                        if (walkSound && !walkSound.isPlaying && walkSound.buffer) {
                            walkSound.play();
                        }
                    } else {
                        walkAction.fadeOut(0.2);

                        // Stop Sound
                        if (walkSound && walkSound.isPlaying) {
                            walkSound.stop();
                        }
                    }
                }

                // restore: setColor for cube meshes
                function setColor(val) {
                    const c = new THREE.Color(val);
                    model.traverse(obj => {
                        if (obj.isMesh && obj.material) {
                            const name = obj.name.toLowerCase();
                            if (name.includes("cube")) {
                                obj.material.emissive.copy(c);
                                obj.material.color.copy(c);
                            }
                        }
                    });
                }

                function update(delta, movement) {
                    mixer.update(delta);

                    model.position.copy(movement.position);

                    if (movement.isMoving) {
                        const moveDir = movement.position.clone().sub(movement.oldPosition);
                        moveDir.y = 0;
                        if (moveDir.lengthSq() > 1e-5) {
                            const yaw = Math.atan2(moveDir.x, moveDir.z);
                            model.rotation.y = yaw;
                        }
                    }

                    setWalking(movement.isMoving);
                }

                resolve({
                    mesh: model,
                    mixer,
                    update,
                    setColor
                });
            },
            undefined,
            err => reject(err)
        );
    });
}

import * as THREE from "three";
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.167/examples/jsm/loaders/GLTFLoader.js";

export async function createPlayer(
    scene,
    startPos = new THREE.Vector3(0, 0, 0),
    color = "#ff0000"
) {
    return new Promise((resolve, reject) => {
        const loader = new GLTFLoader();

        loader.load(
            "assets/astronaut.glb",
            (gltf) => {
                const model = gltf.scene;
                model.scale.set(0.019, 0.019, 0.019);
                model.position.copy(startPos);

                const initialColor = new THREE.Color(color);

                model.traverse((obj) => {
                    if (obj.isMesh && obj.material) {
                        const name = obj.name.toLowerCase();

                        if (name.includes("chest") || name.includes("spine")) {
                            
                            // Gunakan material baru untuk menimpa tekstur asli
                            obj.material = new THREE.MeshStandardMaterial({
                                color: 0x000000, // Warna dasar (albedo) disetel gelap
                                roughness: 0.6,
                                metalness: 0.2,
                                
                                // 💡 Kunci: Mengatur Emissive untuk memberikan warna cahaya solid
                                emissive: initialColor, 
                                emissiveIntensity: 1, 
                                emissiveMap: null       // Menghapus peta tekstur emisif
                            });
                            obj.material.map = null; // Menghapus tekstur warna dasar (jika ada)
                            obj.material.needsUpdate = true;
                        
                        }
                    }
                });

                scene.add(model);

                const mixer = new THREE.AnimationMixer(model);
                let idleAction = null;
                let walkAction = null;

                if (gltf.animations && gltf.animations.length > 0) {
                    idleAction = mixer.clipAction(gltf.animations[0]);
                    idleAction.play();

                    if (gltf.animations.length > 1) {
                        walkAction = mixer.clipAction(gltf.animations[1]);
                    }
                }

                let isWalking = false;
                function setWalking(flag) {
                    if (!walkAction || !idleAction) return;
                    if (flag === isWalking) return;
                    isWalking = flag;

                    if (isWalking) {
                        idleAction.fadeOut(0.3);
                        walkAction.reset().fadeIn(0.3).play();
                    } else {
                        walkAction.fadeOut(0.3);
                        idleAction.reset().fadeIn(0.3).play();
                    }
                }

                function setColor(val) {
                    const c = new THREE.Color(val);
                    model.traverse((obj) => {
                        if (obj.isMesh && obj.material) {
                             const name = obj.name.toLowerCase();
                             
                             if (name.includes("chest") || name.includes("spine")) {
                                 // Perbarui Emissive dan Base Color pada material yang sudah diganti
                                 obj.material.emissive.copy(c);
                                 obj.material.color.copy(c); 
                             }
                        }
                    });
                }

                resolve({
                    mesh: model,
                    mixer,
                    setWalking,
                    setColor: setColor
                });
            },
            undefined,
            (err) => reject(err)
        );
    });
}
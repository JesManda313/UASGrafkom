import * as THREE from "three";
import { GLTFLoader } from "https://cdn.jsdelivr.net/npm/three@0.167/examples/jsm/loaders/GLTFLoader.js";

export async function loadMap(wallIDs){
    return new Promise((resolve, reject)=>{
        const loader = new GLTFLoader();

        loader.load("assets/skeld.glb", gltf=>{
            const map = gltf.scene;
            const staticCollidableObjects = [];

            map.traverse(obj=>{
                if(!obj.isMesh) return;

                if(obj.name === "Object_6" || obj.name === "Object_87"){
                    obj.visible = false;
                    return;
                }

                if(obj.name === "Object_107"){
                    const texLoader = new THREE.TextureLoader();
                    const envTex = texLoader.load("assets/space.hdr");
                    envTex.mapping = THREE.EquirectangularReflectionMapping;
                    obj.material = new THREE.MeshPhysicalMaterial({
                        color: 0x88ccee, transparent:true, opacity:0.45,
                        roughness:0.05, metalness:0.1,
                        reflectivity:0.9, clearcoat:1.0, clearcoatRoughness:0.05,
                        envMap: envTex
                    });
                }

                const m = obj.name.match(/\d+/);
                if(!m) return;

                const id = parseInt(m[0]);
                if(!wallIDs.includes(id)) return;

                obj.geometry.computeBoundsTree();
                staticCollidableObjects.push(obj);
            });        
            resolve({ map, staticCollidableObjects });
        }, undefined, err=>reject(err));
    });
}

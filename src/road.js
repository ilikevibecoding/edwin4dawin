import * as THREE from 'three';
import { add, box, group } from './geo.js';
import { PALETTE } from './palette.js';
import { dirtAlbedo, dirtNormal, dirtRough, grassAlbedo } from './textures.js';

function heightAt(x, z) {
  const roll = Math.sin(z * 0.08) * 0.12 + Math.sin(x * 0.15 + z * 0.05) * 0.08;
  const road = Math.exp(-Math.pow(x / 3.4, 2));
  return roll * (1 - road * 0.85);
}

export function createRoad(env) {
  const g = group('ground');

  const dirtMap = dirtAlbedo();
  dirtMap.repeat.set(8, 24);
  const dirtN = dirtNormal();
  dirtN.repeat.set(8, 24);
  const dirtR = dirtRough();
  dirtR.repeat.set(8, 24);
  const grassMap = grassAlbedo();
  grassMap.repeat.set(18, 18);

  const dirtMat = new THREE.MeshStandardMaterial({
    color: PALETTE.dirt,
    map: dirtMap,
    normalMap: dirtN,
    roughnessMap: dirtR,
    roughness: 0.92,
    metalness: 0.0,
    envMap: env,
    envMapIntensity: 0.22,
  });
  const grassMat = new THREE.MeshStandardMaterial({
    color: PALETTE.grass,
    map: grassMap,
    roughness: 0.95,
    metalness: 0.0,
    envMap: env,
    envMapIntensity: 0.18,
  });

  const segsX = 80;
  const segsZ = 140;
  const width = 48;
  const length = 90;
  const geo = new THREE.PlaneGeometry(width, length, segsX, segsZ);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    pos.setY(i, heightAt(x, z));
  }
  geo.computeVertexNormals();

  // Vertex colors: dirt on the road, grass off it
  const colors = new Float32Array(pos.count * 3);
  const cDirt = new THREE.Color(PALETTE.dirtDry);
  const cGrass = new THREE.Color(PALETTE.grass);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const road = Math.exp(-Math.pow(x / 3.2, 2));
    c.copy(cGrass).lerp(cDirt, THREE.MathUtils.smoothstep(road, 0.15, 0.7));
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  dirtMat.vertexColors = true;

  const ground = new THREE.Mesh(geo, dirtMat);
  ground.receiveShadow = true;
  ground.castShadow = false;
  g.add(ground);

  // Center grass strip
  const strip = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 70, 1, 20), grassMat);
  strip.rotation.x = -Math.PI / 2;
  strip.position.y = 0.02;
  strip.receiveShadow = true;
  g.add(strip);

  // Rocks along the verge
  const rockMat = new THREE.MeshStandardMaterial({
    color: PALETTE.rock,
    roughness: 0.88,
    metalness: 0.08,
    envMap: env,
    envMapIntensity: 0.3,
  });
  for (let i = 0; i < 40; i++) {
    const side = i % 2 === 0 ? 1 : -1;
    const z = -35 + (i * 1.8 + (i % 5) * 0.4);
    const x = side * (3.6 + (i % 7) * 0.35);
    const s = 0.18 + (i % 5) * 0.07;
    const rock = box(s, s * 0.7, s * 1.1, rockMat, x, heightAt(x, z) + s * 0.25, z);
    rock.rotation.y = i * 0.7;
    g.add(rock);
  }

  // Puddles
  const puddleMat = new THREE.MeshPhysicalMaterial({
    color: PALETTE.dirtWet,
    roughness: 0.12,
    metalness: 0.15,
    envMap: env,
    envMapIntensity: 0.9,
  });
  for (const [x, z, w, d] of [
    [1.1, 4.2, 0.9, 1.4],
    [-1.3, -6.5, 0.7, 1.1],
    [0.9, -14, 1.1, 1.8],
  ]) {
    const p = new THREE.Mesh(new THREE.CircleGeometry(w * 0.5, 20), puddleMat);
    p.rotation.x = -Math.PI / 2;
    p.position.set(x, heightAt(x, z) + 0.025, z);
    p.scale.z = d / w;
    p.receiveShadow = true;
    g.add(p);
  }

  const colliders = [];

  return {
    mesh: g,
    heightAt,
    colliders,
  };
}

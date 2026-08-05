import * as THREE from 'three';

export interface FaceParams {
  /** 0 = softer/rounder, 1 = squarer and heavier browed. */
  masculinity: number;
  skullWidth: number;
  jawWidth: number;
  jawSquare: number;
  chinLength: number;
  cheekbone: number;
  cheekHollow: number;
  noseLength: number;
  noseWidth: number;
  noseBridge: number;
  lipFullness: number;
  mouthWidth: number;
  eyeSpacing: number;
  eyeSize: number;
  eyeDepth: number;
  browHeight: number;
  browThickness: number;
  browAngle: number;
  foreheadSlope: number;
  age: number;
  eyeColor: THREE.ColorRepresentation;
  /** Androids get a slightly idealised, glossier shell. */
  android: boolean;
}

export const DEFAULT_FACE: FaceParams = {
  masculinity: 0.5,
  skullWidth: 1,
  jawWidth: 1,
  jawSquare: 0.5,
  chinLength: 1,
  cheekbone: 1,
  cheekHollow: 0.6,
  noseLength: 1,
  noseWidth: 1,
  noseBridge: 1,
  lipFullness: 1,
  mouthWidth: 1,
  eyeSpacing: 1,
  eyeSize: 1,
  eyeDepth: 1,
  browHeight: 1,
  browThickness: 1,
  browAngle: 0,
  foreheadSlope: 0.5,
  age: 0.35,
  eyeColor: 0x5b7f8f,
  android: true,
};

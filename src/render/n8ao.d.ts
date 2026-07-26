declare module 'n8ao' {
  import type * as THREE from 'three';
  import type { Pass } from 'postprocessing';

  export interface N8AOConfiguration {
    aoRadius: number;
    distanceFalloff: number;
    intensity: number;
    aoSamples: number;
    denoiseSamples: number;
    denoiseRadius: number;
    denoiseIterations?: number;
    screenSpaceRadius: boolean;
    halfRes: boolean;
    depthAwareUpsampling: boolean;
    renderMode: number;
    color: THREE.Color;
    gammaCorrection: boolean;
    gammaOverride?: number;
    gammaOffset?: number;
    biasOffset?: number;
    biasMultiplier?: number;
    accumulate?: boolean;
    transparencyAware?: boolean;
  }

  export class N8AOPostPass extends Pass {
    constructor(
      scene: THREE.Scene,
      camera: THREE.Camera,
      width?: number,
      height?: number
    );
    configuration: N8AOConfiguration;
    setSize(width: number, height: number): void;
    setDisplayMode(mode: 'Combined' | 'AO' | 'No AO' | 'Split' | 'Split AO'): void;
    setQualityMode(mode: 'Performance' | 'Low' | 'Medium' | 'High' | 'Ultra'): void;
    enableDebugMode(): void;
    disableDebugMode(): void;
  }

  export class N8AOPass extends Pass {
    constructor(scene: THREE.Scene, camera: THREE.Camera, width?: number, height?: number);
    configuration: N8AOConfiguration;
    setQualityMode(mode: string): void;
  }
}

// Tiny side-channel between the shooters (viewmodel / character rig) and the VFX system.
// Both call sites fetch the muzzle position immediately before spawning fire VFX, so the
// weapon family can ride along without changing any cross-domain method signatures.
let family = 'rifle';

export function setFireFamily(f) { family = f || 'rifle'; }
export function getFireFamily() { return family; }

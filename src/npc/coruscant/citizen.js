// A live Coruscant citizen: the lightweight runtime record behind one crowd instance. Rendering is delegated to the
// instanced CrowdRenderer (crowd.js), so this holds only simulation state: where the person is, what they are
// doing, the trip they are on and the dialog voice. Town NPCs (npc/npc.js) keep their own class; the two never mix.
import { AABB } from '../../player.js';
import { Voice } from '../dialog/dialog.js';

export const WALK_SPEED = 2.5;

let nextId = 1;

export class Citizen {
  constructor(person) {
    this.id = nextId++;
    this.person = person;
    this.name = person.name;
    this.archetype = person.archetype;
    this.droid = person.droid;
    this.female = person.female;
    this.scale = person.scale || 1;
    this.city = true;                 // tells the wrapped NPCManager hooks this is one of ours
    this.voice = new Voice(person.key, person.archetype);
    this.pos = { x: 0, y: 0, z: 0 };
    this.prev = { x: 0, y: 0, z: 0 };
    this.yaw = 0; this.targetYaw = 0;
    this.headYaw = 0; this.headPitch = 0;
    this.lookAt = null;
    // where / what
    this.lot = null;                  // lot id while inside a building, else null
    this.level = 'ground';            // street level while outside: ground | deck | port
    this.act = null; this.actLot = null; this.spot = null;
    this.state = 'idle';              // idle | walk | lift | at | wait
    this.timer = 0;
    this.mode = 0; this.phase = Math.random() * 6.28; this.animSpeed = 0; this.amp = 1;
    this.sitting = false; this.lying = false; this.hidden = false;
    this.speed = WALK_SPEED * (0.9 + (person.key % 100) / 500);
    // trip
    this.legs = null; this.legIdx = 0;
    this.path = null; this.pathIdx = 0; this.waitingPath = false; this.pathFails = 0; this.legFails = 0;
    this.errand = null;               // job side trips (tray runs, crate carries)
    this.wanderT = 0;
    // rendering / talk
    this.slot = null; this.skin = 0; this.blink = person.droid ? 0 : 0.5 + (person.key % 1000) / 1000;
    this.sky = 1; this.blk = 0; this.lightTimer = person.key % 12;
    this.talkCooldown = 0; this.chatterT = 5 + (person.key % 17); this.bubbleUntil = 0;
    this.stuckT = 0; this.lastProgress = null; this.dead = false;
    this.spawnedAt = 0;
  }

  get box() { const r = 0.3 * this.scale, h = (this.droid && this.archetype !== 'protocol droid' ? 1.2 : 1.8) * this.scale; return new AABB(this.pos.x - r, this.pos.y, this.pos.z - r, this.pos.x + r, this.pos.y + h, this.pos.z + r); }
  get job() { return this.person.job; }
  setPos(x, y, z) { this.pos.x = x; this.pos.y = y; this.pos.z = z; this.prev.x = x; this.prev.y = y; this.prev.z = z; }
  face(x, z) { this.targetYaw = Math.atan2(x - this.pos.x, z - this.pos.z); }
}

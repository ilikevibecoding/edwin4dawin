// Multiplayer client. (Foundation stub: the full WebSocket client replaces this file.)
// Interface contract used by game.js and DisasterManager:
//   const net = new NetClient(game, url);  net.connect();  net.connected (bool)
//   net.tick()            - called every game tick (20/s): send player state, process queued messages
//   net.update(dt, alpha) - called every frame: interpolate/render remote players
//   net.sendBlock(x,y,z,id)   - relay a local block edit
//   net.sendCommand(cmd)      - send a disaster command; the server echoes it (with startTick/seed) and the client
//                               then calls game.disasters.apply(cmd, true) at the right tick
//   net.stats -> {bytesIn, bytesOut, msgsIn, msgsOut, players, ping}
//   game.permissions.setOnline(true, isAdmin) once the server answers the hello.
export class NetClient {
  constructor(game, url) { this.game = game; this.url = url; this.connected = false; this.stats = { bytesIn: 0, bytesOut: 0, msgsIn: 0, msgsOut: 0, players: 0, ping: 0 }; }
  connect() { /* stub: offline */ }
  tick() {}
  update() {}
  sendBlock() {}
  sendCommand(cmd) { this.game.disasters.apply(cmd, false); }
  dispose() {}
}

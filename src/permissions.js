// Permission system. Single player: the local player owns the world and is an administrator unless
// `?admin=0`. Multiplayer: the server grants admin only to clients that present the admin token
// (`?admin=<token>`); everyone else is a normal player and cannot open or use disaster controls.
export class Permissions {
  constructor() {
    const params = new URLSearchParams(location.search);
    this.adminParam = params.get('admin');
    this.online = false;
    this.serverAdmin = false;
    this.listeners = new Set();
  }
  get adminToken() { return this.adminParam && this.adminParam !== '0' && this.adminParam !== '1' ? this.adminParam : null; }

  isAdmin() {
    if (this.online) return this.serverAdmin;
    return this.adminParam !== '0';
  }

  // Called by the network client when connected / when the server answers.
  setOnline(online, serverAdmin = false) {
    this.online = online;
    this.serverAdmin = serverAdmin;
    for (const fn of this.listeners) fn(this.isAdmin());
  }
  onChange(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
}

# Known Issues — Northstar Rescue

Append-only during development; issues get struck through with a fix reference when resolved.

| # | Severity | Area | Description | Status |
|---|---|---|---|---|
| NS-1 | high | nav | Navmesh floors disconnected | ~~fixed~~ (strata sampling k=9, slab band stair cutouts, clearance 0.24) |
| NS-2 | medium | renderer | Resize only via window event | ~~fixed~~ (ResizeObserver) |
| NS-3 | medium | perf | Quality tiers don't reduce draw calls | **accepted limitation** — tiers scale pixel ratio, shadow size, fill lights, particles, anisotropy (the GPU-bound costs). Scene sits at ~570 draws / ~300k tris which is within a mid-CPU budget; geometry LOD/instancing deemed out of scope. |
| NS-4 | low | game | Fullscreen promise rejection leak | ~~fixed~~ (.catch) |
| NS-5 | low | qa | selectSlot return shape | ~~fixed~~ ({requested, active}) |
| NS-6 | low | player | god/noclip survive reset | ~~fixed~~ (reset in spawn) |
| NS-7 | high | ai/perf | Repath backoff bypass (76 req/s/enemy) | ~~fixed~~ (backoff gates both arms + per-step A* budget); firefight step cost 25–47 ms → 0.58–1.04 ms |
| NS-8 | medium | ai/perf | Cross-floor A* ~9 ms/query | ~~mitigated~~ (stair-portal heuristic ≈2× faster + per-step budget caps worst case); residual single-query cost accepted |
| NS-9 | medium | ai/perf | Unreachable-target A* exhausts graph | ~~fixed~~ (O(1) region-label pre-check at bake) |
| NS-10 | medium | qa | 9 checkpoints resolved onto furniture | ~~fixed~~ (teleport snaps to nearest main-region nav node) |
| NS-11 | medium | lighting | Security office 29.5% clipped white | ~~fixed~~ (dedicated 'security' light zone; verified re-shoot) |
| NS-12 | low | ui | Completed objective rows 3:1 contrast | ~~fixed~~ (ink-dim token, ≥4.5:1) |
| L-1 | info | perf | Headless SwiftShader cannot produce representative fps numbers (≈1 s per frame present); renderer's own draw is 2.5–15 ms at native 1080p. A real-GPU run remains the only way to a true frame rate. | accepted (documented in docs/perf-baseline.md) |
| L-2 | info | audio | Reverb is an approximation (room-scaled tails + slap-back in large rooms), not convolution | accepted by design |
| L-3 | info | map | Door leaves approximate collision as AABB while swinging (fully open/closed states exact) | accepted by design |
| L-4 | info | art | `paintedClean` texture set shows hammered mottle under grazing exterior sun; exterior canopy uses flat paint instead (visual-bible note) | accepted |

# Terminal q3 Newton m=0: hub-distance-three double brooms, all targets

Date: 2026-08-31

For a sorted hub-distance-three double broom `T_(a,b,3)`, with `a>=b>=1`,
the isolated-marked-root terminal-q3 Newton `m=0` payment is nonnegative at
every supported target `j>=3`.

The proof is the following exhaustive integer partition:

```text
j=3                         arbitrary-forest boundary theorem;
b=1, j>=4                  high-target tail theorem;
b>=2, 4<=j<=b+2            middle triangle theorem;
b>=2, j>=b+3               high-target tail theorem.
```

For `b>=2`, exactly one of `j<=b+2` and `j>=b+3` holds, so no integer target
is omitted.  For `b=1`, the tail starts at `j=4`.  Each component certificate
is pinned by source and report hash and was replayed twice byte-identically.

This closes one complete connected remainder family.  It does not close
arbitrary diameter-four or larger trees, disconnected remainders,
nonisolated marked roots, the complete terminal payment, or Erdős Problem
#993.

Replay:

```powershell
python .\assemble_terminal_q3_m0_marked_isolate_hub_distance3_double_broom_all_j_root.py
```

Required marker:

```text
PASS_EXACT_ALL_TARGET_TERMINAL_Q3_M0_MARKED_ISOLATE_HUB_DISTANCE3_DOUBLE_BROOM_ASSEMBLY_ROOT
```

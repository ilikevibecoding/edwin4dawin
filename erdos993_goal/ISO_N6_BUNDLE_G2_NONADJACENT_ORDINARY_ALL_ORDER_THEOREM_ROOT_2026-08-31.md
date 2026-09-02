# Rank-six nonadjacent ordinary-parent G2: all-order theorem

Date: 2026-08-31

Status: **proved for every ambient order and every ordinary-parent adjacency
mask in the rank-six nonadjacent G2 bundle mode.**

The exact order partition is:

```text
N=0                                  vacuous ordinary-parent mode,
1<=N<=18                            finite literal/corner-paid theorem,
N>=19 and min(mB,mC)<=6             exact 112-shard small-order theorem,
N>=19 and min(mB,mC)>=7             exact 56-shard ratio-floor matrix.
```

The last line is complete because the pinned algebraic chart cover exhausts
both nonadjacent common-neighbor geometries, the matrix contains every
`B2/C2/D2` corner, the four-corner bridge validates the remaining row
endpoint choices, and the structural domination theorem transfers the root
lower to all four parent-adjacency masks.  An independent chart audit checks
the same partition and transfer.  A forced replay regenerated all 56 matrix
shards byte-for-byte with zero negative lower or sign controls.

Replay:

```powershell
python .\assemble_iso_n6_bundle_g2_nonadjacent_ordinary_all_order_root.py
```

Required marker:

```text
PASS_EXACT_ISO_N6_BUNDLE_G2_NONADJACENT_ORDINARY_ALL_ORDER_ASSEMBLY_ROOT
```

Frozen assembly source/report SHA-256:

```text
2282CEC31E26ABEB2597AE49EAF80D08A68A6AEB6D94D6C1FFAF27372894F54F
39CFB23031356C91FBC2C5126C15D6D27B26677BD03DA97A76D5BFA22DDA46F4
```

This closes only the nonadjacent ordinary-parent rank-six G2 mode.  The
endpoint-parent G2 mode, remaining rank-six G1 modes, rank-seven propagation,
Newton `m=0`, final proof assembly, and Erdős Problem #993 remain separate.

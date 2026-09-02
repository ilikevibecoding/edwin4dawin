# Delta2 surplus-six joint-floor obstruction

Date: 2026-08-25

Status: **exact method obstruction, not a tree counterexample**.

The current `Delta2`, `k=1`, lower-cross normalized tensor remains negative
inside the enlarged coefficient box even after imposing all of the following
proved information simultaneously:

- the quantitative all-tree rank-four `U` floor;
- the rank-five order-only `V` floor;
- the all-order rank-five component-surplus floor
  `V>=8e/[5(n-2)(n-3)]`;
- exact degree surplus `e=6`;
- the exact `c3` motif identity;
- the exact `c4` identity at the valid lower-`tau` endpoint.

Exact rational negative witnesses occur at

`n=28,31,40,80,200,1000`.

The source and report hashes are

```text
verify_rank8_delta2_e6_joint_floors_relaxed_obstruction_root.py
4F7D5D51D4C2356E762FF40809D25D261F08C2F3D53D7C7CF9A974A24AA48C38

rank8_delta2_e6_joint_floors_relaxed_obstruction_exact_20260825.json
51E6402DC64B3B985404CF53BB9C4E4022635D26697F186F620C3CD863CE4E06
```

Therefore the separate global floors cannot prove this tensor.  A valid next
step must retain exact suppressed-skeleton/root coupling, or establish a
stronger joint realizability inequality coupling `c4,c5,c6,c7` to the rooted
deletion data.  The companion structural partition
`RANK8_DELTA03_E6_SKELETON_ROOT_PARTITION_2026-08-25.md` provides the exact
10-skeleton, 101-root-orbit lane for the first option.

None of the relaxed witnesses is asserted to be the coefficient data of a
tree.  They do not disprove connected `Q8`, rank-eight PGC, or Problem 993.

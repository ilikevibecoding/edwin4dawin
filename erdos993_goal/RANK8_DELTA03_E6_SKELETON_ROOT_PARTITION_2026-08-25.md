# Rank-eight Delta0--3 degree-surplus-six structural partition

Date: 2026-08-25

Status: **exact structural partition, independently audited**.  This note
classifies the next connected-`Q8` lane.  It does not prove any remaining
Delta coefficient positive.

For a tree, write `b_d` for the number of vertices of degree `d` and

`e=sum_v C(deg(v)-1,2)`.

At `e=6`, no vertex can have degree at least six and the branch inventory
must solve

`b_3+3b_4+6b_5=6`.

The four solutions and numbers of nonisomorphic suppressed skeletons are

```text
(b3,b4,b5)=(0,0,1): 1
(b3,b4,b5)=(0,2,0): 1
(b3,b4,b5)=(3,1,0): 4
(b3,b4,b5)=(6,0,0): 4
```

Thus there are exactly 10 suppressed skeletons.  Taking automorphism orbits
of every possible root location gives

```text
branch vertices:          29
leaf vertices:            25
spine-interior locations: 22
pendant-interior locations:25
total:                   101
```

The producer generates every unlabeled branch tree and target-degree
assignment, rejects infeasible assignments, adds the forced pendant leaves,
deduplicates isomorphic full skeletons, and computes all vertex/edge
automorphism orbits.

The independent auditor takes a different route: it enumerates every
unlabeled tree at the only possible full suppressed orders `6,8,11,14`
(3,423 trees total), filters for surplus six with no degree-two vertices,
and matches the ten survivors one-to-one against the producer.  It then
recomputes every root orbit directly.

Artifacts:

```text
classify_rank8_delta03_e6_skeleton_root_partition_root.py
2D09166564BD9D9286781CB17E6F7387D1AF3F57BB03A761ED2548B9EE76077A

rank8_delta03_e6_skeleton_root_partition_exact_20260825.json
B8D2D160F679361AED1D337B9E814DA6B985ACCD19434DF629887DE0E7AE5307

audit_rank8_delta03_e6_skeleton_root_partition_root.py
1A2BE02D0C2AD9AD45543BFAC2E7025D95AF198B82492272F8542C2FEDAAA939

rank8_delta03_e6_skeleton_root_partition_independent_audit_20260825.json
247DF3AC57F265839055CCF258BCC1E946A0470BAE83F2B79E61F1D8BD17E65F
```

## Next exact obligation

For each of the 101 root-location orbits, parameterize the positive segment
lengths, prove the Delta0--3 terminal values nonnegative from order 28 onward,
and independently replay the literal rooted tree coefficients.  Orders at
most 27 are already covered by the all-root finite census.

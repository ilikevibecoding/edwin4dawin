# Forest terminal `m=1`, target `j=3`: missing `h4` path floor

Date: 2026-08-29

Status: **PASS independent exact all-order auxiliary lemma.** This note proves
only the zero-root-neighbor rank-four contribution used by the forest
`m=1,j=3` reduction. It does not prove the terminal payment, `m=0`, or Erdos
Problem 993.

## Statement

Let `H` be a forest on `S` vertices and let `i_k(H)` count its independent
`k`-sets. Define

```text
P_k(S)=C(S-k+1,k)  when S>=2k-1, and P_k(S)=0 otherwise.
```

Then

```text
i_4(H) >= P_4(S) = C(S-3,4).                       (1)
```

The convention in (1) makes its right side zero for `S<7`. Equality holds
for the path on `S` vertices, so the floor is sharp.

## All-order proof

If `H` has no edges, then `i_4(H)=C(S,4)>=P_4(S)`.

Otherwise choose a degree-one vertex `v`, with unique neighbor `u`. Split the
independent four-sets according to whether they contain `v`:

```text
i_4(H)=i_4(H-v)+i_3(H-N[v]).                        (2)
```

Both graphs on the right are forests, of orders `S-1` and `S-2`. Strong
induction, followed by Pascal's identity, gives

```text
i_4(H)
 >= P_4(S-1)+P_3(S-2)
  = C(S-4,4)+C(S-4,3)
  = C(S-3,4)
  = P_4(S).                                         (3)
```

The small orders are covered by the zero convention. The same decomposition
on a path is an equality at every induction step, proving sharpness.

## Exact terminal-row placement

For a marked vertex `w` in a forest `G`, put

```text
F=G-w,  H=G-N_G[w],  U=N_G(w).
```

Partition the independent four-sets of `F` by the number of chosen vertices
in `U`. The class choosing zero vertices of `U` is exactly the independent
four-sets of `H`, hence contributes `i_4(H)`. Therefore every valid lower
bound for the one-, two-, three-, and four-root-neighbor classes may be
strengthened by the independent additive term

```text
+P_4(S)=+C(S-3,4),  S=|H|.                          (4)
```

This is the term omitted by the obsolete simple tangent floor. No assertion
about the sign of the complete terminal row follows from (4) alone.

## Fail-closed replay

The verifier checks the symbolic Pascal identity, path equality through order
17, every forest in the NetworkX graph atlas through order 7, the exact
root-class partition for every marked atlas forest, and all 986
nonisomorphic-tree floor cells through order 12.

Pins before this note was added:

```text
prove_terminal_q3_m1_forest_j3_h4_path_floor_independent_agent.py
  64C79C9D8E68A8FE51A0A3B91862DC317B3EA167F74DDD0B2E624297BE65A69F
terminal_q3_m1_forest_j3_h4_path_floor_independent_20260829.json
  DF1D57C1D5F27CC2DFA174A72BB5392BEA6B0577AEC26B8F26B0AE56E88700E6
FOREST_M1_J3_ROOT_NEIGHBOR_CLASS_CAPS_ROOT_2026-08-29.md
  1E3937FB48898C5AF101B788E9613CFDD4944616D97B0115231DC931159A22E0
```

# Rank-seven rooted-`C7` theorem for `B2=6` through order 27

Date: 2026-08-20

Status: **PROVED EXACTLY FOR EVERY ROOT OF EVERY `B2=6` TREE OF ORDERS
25 THROUGH 27.** The subdivision step was checked only at source orders 25
and 26. No claim is made at order 28 or above.

## Theorem

Let `T` be a tree with

```text
B2(T)=sum_v binom(deg(v)-1,2)=6
```

and `25<=|T|<=27`. For every root `p`,

```text
C7(T,p)=i5(T)(i6(T)^2-i5(T)i7(T))
         -2i6(T)(i6(T)i5(T-p)-i5(T)i6(T-p)) > 0.
```

## Literal one-edge subdivision identity

Let `e=uv`, let `T^e` be obtained by replacing `uv` by `u-x-v`, and write
`I(G;t)` for the independence polynomial. Directly separating independent
sets according to whether they use the inserted vertex gives

```text
I(T^e;t) = I(T;t) + (t+t^2) I(T-{u,v};t).
```

Thus, if `j_k=i_k(T-{u,v})`,

```text
i_k(T^e)-i_k(T) = j_(k-1)+j_(k-2).
```

For an old root `p` not incident with `e`, the same identity in `T-p` gives

```text
i_k(T^e-p)-i_k(T-p)
  = i_(k-1)(T-{p,u,v}) + i_(k-2)(T-{p,u,v}).
```

If `p` is `u` or `v`, the inserted vertex is a new leaf after deleting `p`,
so the second term is absent:

```text
i_k(T^e-p)-i_k(T-p) = i_(k-1)(T-{u,v}).
```

Finally, for the inserted root `x`,

```text
T^e-x = T-e,
I(T-e;t) = I(T;t) + t^2 I(T-{u,v};t).
```

Substituting these literal coefficient changes into the displayed definition
of `C7` is exactly the old-root increment and inserted-root endpoint tested by
the verifier. The implementation also reconstructs each subdivided tree and
computes both sides independently by exact integer tree DP.

## Complete suppressed-skeleton classification

Every branch vertex of degree `d>=3` contributes `binom(d-1,2)` to `B2`.
The only decompositions of 6 into such triangular contributions are

```text
1+1+1+1+1+1,  3+1+1+1,  3+3,  6.
```

Therefore the branch-degree multisets are

```text
(3,3,3,3,3,3),  (4,3,3,3),  (4,4),  (5).
```

The internal branch core is a tree, with its remaining branch capacities
filled by leaves. Up to capacity-preserving isomorphism this gives exactly

| branch degrees | branch-core types | suppressed skeletons |
|---|---:|---:|
| `3^6` | four order-six trees of maximum degree at most three | 4 |
| `4,3,3,3` | `P4` with degree four at an endpoint/inner vertex; `K1,3` with degree four at its center/leaf | 4 |
| `4,4` | one | 1 |
| `5` | one | 1 |
| **total** |  | **10** |

Every `B2=6` tree is a positive integer edge-length assignment on exactly one
of these ten skeletons. The verifier quotients leaf permutations and every
capacity-preserving branch-core automorphism.

## Exact finite subdivision audit

For every canonical positive edge-length assignment at source orders 25 and
26, the verifier checks all roots of the source tree, subdivides every
skeleton edge, compares `C7` at every old root, and checks the inserted root
separately.

| source order | canonical trees | base-root checks | old-root/edge comparisons | base `C7<=0` | increment `<=0` | inserted-root `C7<=0` | minimum base `C7` | minimum increment | minimum inserted-root `C7` |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 25 | 1,188,672 | 29,716,800 | 353,815,250 | 0 | 0 | 0 | 5,242,520,020,048 | 7,890,568,643,463 | 15,533,360,315,852 |
| 26 | 2,122,926 | 55,196,076 | 665,385,552 | 0 | 0 | 0 | 13,193,284,240,736 | 18,345,070,738,799 | 36,937,550,107,104 |
| **total** | **3,311,598** | **84,912,876** | **1,019,200,802** | **0** | **0** | **0** |  |  |  |

There are no zero increments: every old-root increment is strictly positive.

## Finite induction

The source-order-25 rows themselves prove the all-root base. Every target
order-26 or order-27 positive length assignment has an edge of length at
least two because all ten suppressed skeletons have at most 14 vertices.
Contract a degree-two subdivision vertex on such an edge. This gives a source
assignment of order 25 or 26 on the same skeleton.

If the requested root survives the contraction, its `C7` increases strictly
when the subdivision is restored. If the requested root is the last inserted
vertex, use the separately positive inserted-root check. Hence the base and
the two checked source-order steps prove the theorem through target order 27.

Source order 27 was deliberately not run, so this package supplies no target
order-28 result.

## Independent audit and replay

The independent audit:

1. regenerates the four possible branch-degree partitions;
2. enumerates capacity-colored branch cores and recovers exactly `4+4+1+1`
   isomorphism types;
3. applies Burnside's lemma to the full suppressed-skeleton automorphism group
   and independently reproduces every one of the 20 family/order canonical
   tree counts;
4. verifies root and edge comparison multiplicities, all exact failure gates,
   every artifact hash, and the finite scope statement.

A fresh compiler build executed the entire order-25/order-26 workload twice.
The two logs are byte-identical.

Run:

```powershell
python .\replay_rank7_rooted_c7_b2_6_subdivision.py
python .\audit_rank7_rooted_c7_b2_6_subdivision.py
```

Expected markers:

```text
PASS_FRESH_DOUBLE_REPLAY_EXACT_RANK7_ROOTED_C7_B2_6_ORDERS_25_THROUGH_27
PASS_INDEPENDENT_STRUCTURAL_BURNSIDE_AUDIT_RANK7_ROOTED_C7_B2_6
```

## SHA-256

```text
B87F26531F189239233D6E5FD77F069FF6EA24818B34A7E052062043B9C9222C  probe_rank7_rooted_c7_b2_6_subdivision.rs
D613E5746ECE47E7F299BF3C44C008E09E61916C0FDDEC83067B057CA7F0522A  probe_rank7_rooted_c7_b2_6_subdivision_fresh.exe
7B028DA9E2CA42A3E7EF33BA6618EDFEB7287F48BE47CC3031D7D89B69355E37  replay_rank7_rooted_c7_b2_6_subdivision.py
675E632DCBCE0754241800DD3A7D31DBCA11367579C8832E51F4E038D4DE17A1  rank7_rooted_c7_b2_6_subdivision_primary_20260820.log
675E632DCBCE0754241800DD3A7D31DBCA11367579C8832E51F4E038D4DE17A1  rank7_rooted_c7_b2_6_subdivision_fresh_replay_20260820.log
833E8B6949F485BDA04723E886839E7782709BF2A28D6FC0E661CEC53D2117C7  rank7_rooted_c7_b2_6_subdivision_exact_20260820.json
729E4399A7788B325560D8B38FDECB0BB37ACE70C3AADEE036DBDFFA5FE20A88  audit_rank7_rooted_c7_b2_6_subdivision.py
27F4BBF292B3D5EB56683DFD973A5E377CC8E60C113194A9EB3EF53BF54919FB  rank7_rooted_c7_b2_6_subdivision_independent_audit_exact_20260820.json
```

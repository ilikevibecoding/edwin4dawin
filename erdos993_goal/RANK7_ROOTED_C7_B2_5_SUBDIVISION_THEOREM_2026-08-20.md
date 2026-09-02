# Rank-seven rooted-`C7` theorem for `B2=5` through order 26

Date: 2026-08-20

Status: **PROVED EXACTLY FOR EVERY ROOT OF EVERY `B2=5` TREE OF ORDERS
23 THROUGH 26.** The subdivision induction is certified only through source
order 25, so no claim is made at order 27 or above.

## Theorem

Let `T` be a tree with

```text
B2(T)=sum_v binom(deg(v)-1,2)=5
```

and `23<=|T|<=26`. For every root `p`,

```text
C7(T,p)=i5(T)(i6(T)^2-i5(T)i7(T))
         -2i6(T)(i6(T)i5(T-p)-i5(T)i6(T-p)) > 0.
```

## Exhaustive structural induction

There are exactly four suppressed `B2=5` skeletons:

1. degree four between two degree-three branches;
2. degree four at one end of the three-branch path;
3. five degree-three branches with branch tree `P5`;
4. five degree-three branches with branch tree `T`.

Every tree in the class assigns a positive integer length to each skeleton
edge. Subdividing an edge increases one length by one and preserves the
suppressed skeleton and `B2`.

For every canonical positive length assignment at source orders 23, 24, and
25, the exact verifier subdivides every edge. It compares rooted `C7` before
and after at every pre-existing vertex and checks the newly inserted vertex
separately. The complete results are

| source order | edge/root comparisons | negative increments | minimum increment | minimum new-root `C7` |
|---:|---:|---:|---:|---:|
| 23 | 37,366,674 | 0 | 1,264,054,265,342 | 2,446,262,694,112 |
| 24 | 66,978,624 | 0 | 3,254,096,753,910 | 6,417,075,527,830 |
| 25 | 116,869,350 | 0 | 7,939,936,351,517 | 15,965,275,483,104 |
| **total** | **221,214,648** | **0** |  |  |

Thus every subdivision at these source orders strictly increases `C7` at an
old root and has positive `C7` at the new root.

The all-root order-23 theorem supplies the base. Any positive length
assignment at target order 24, 25, or 26 has an edge of length at least two;
contracting a subdivision vertex reduces its order while keeping the same
skeleton. Reverse the contractions. If the requested root persists, apply
the strict increment at every step. If it is the vertex created at the last
step, apply the separately checked new-root value. This proves the theorem.

## Fresh replay

A fresh compilation repeats all 221,214,648 comparisons. Its three output
rows match the primary rows byte-for-byte. The assembler also verifies the
independent order-23 base and the four-skeleton classification.

Run

```powershell
python .\replay_rank7_rooted_c7_b2_5_subdivision.py
```

Expected marker:

```text
PASS_FRESH_REPLAY_EXACT_RANK7_ROOTED_C7_B2_5_ORDERS_23_THROUGH_26
```

The exact report is
`rank7_rooted_c7_b2_5_subdivision_exact_20260820.json`. The report warning is
part of the certificate: source order 26 has not been checked, so this route
does not yet close target order 27.

SHA-256:

```text
probe_rank7_rooted_c7_b2_5_cubic_subdivision.rs
D04036CFDBBC38AF3F7EA18460BD824819D4068D05069CBDBB1030EC7C39E458

replay_rank7_rooted_c7_b2_5_subdivision.py
54506FB01ABE165EA901A8C2CDB28CA55178E8AA50F8598A76A87E71A1928079

rank7_rooted_c7_b2_5_subdivision_fresh_replay_20260820.log
A536F6E4E079F6C2E191937327401F9154B2EFB4A1E4FFBA45B53CB57B82757F

rank7_rooted_c7_b2_5_subdivision_exact_20260820.json
0E5B200E6FFC1AFF7F26BFD71153C981E2FC868D897746C93CFB189D4ACE4F0F
```

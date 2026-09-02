# Rank eight: exact Delta0--3 `e=6` quintic-star leaf values

Date: 2026-08-25

Status: **exact PASS for the unique leaf-root orbit of the five-arm `e=6`
star at every order `n>=28`, with a fail-closed independent literal
adjacency-list and endpoint-deletion DP audit.**

## Exact theorem

Let `T` be any subdivision of the five-arm star, with all five arm lengths
positive, and let `q` be any one of its five endpoint leaves. If `|T|=n>=28`,
then

```text
Delta0(T,q), Delta1(T,q), Delta2(T,q), Delta3(T,q)
```

are all strictly positive. This is exactly the unique leaf-root orbit of
`e6_skeleton_01` in the independently audited surplus-six structural
partition.

## Exact gap-free routing

The arm ending at `q` is distinguished. It and each of the four companion
arms is uniquely short (fixed length `1,...,6`) or long (length `7+X`,
`X>=0`). The companions remain unordered. The exact cover has:

| Cell family | Cells |
|---|---:|
| distinguished arm long | 256 |
| distinguished arm short, at least one companion long | 504 |
| all five arms fixed short | 14 |
| **Total** | **774** |

For a short/long pattern with baseline order `b`, put
`D=max(0,28-b)`. If there are `m` long offsets, their sum is at least `D`.
Therefore one is at least `ceil(D/m)`, since
`m(ceil(D/m)-1)<D`. When the distinguished arm is long, the large offset is
either on that arm or on the single symmetric companion-arm orbit. These two
shifted suborthants may overlap, but their union is exact and has no gap. The
audit independently re-enumerates all 774 cells and all 46 such two-branch
unions.

## Exact coefficient certificate

For every cell the producer constructs `c3,...,c8,h6,h7`, substitutes them
into the canonical rank-eight residual, and expands in nonnegative grouped
offsets. Every stored power term is strictly positive.

| Rank | Cells | Power terms | Negative | Zero | Minimum |
|---|---:|---:|---:|---:|---:|
| Delta0 | 774 | 111,888 | 0 | 0 | 1/2633637888000 |
| Delta1 | 774 | 111,888 | 0 | 0 | 1/2304433152000 |
| Delta2 | 774 | 103,838 | 0 | 0 | 1/121927680000 |
| Delta3 | 774 | 96,149 | 0 | 0 | 41/365783040000 |
| **Total** | **3,096 rank-cells** | **423,763** | **0** | **0** | |

The positive constant term in each shifted orthant gives strict positivity,
including its coordinate boundary.

## Independent literal-DP replay

The audit imports no producer construction. It proves 17 zero-polynomial
identities in three free nonnegative variables `A,B,D`, covering excluded
grades `0,...,8` and center-included reduced grades `0,...,7`. Thus the
polynomial for two long companion arms depends only on their offset sum for
every split and every nonnegative distinguished shift; no finite-shift
extrapolation is used.

For each of the 774 cells the audit then:

1. creates literal five-arm adjacency lists;
2. records the endpoint of the distinguished arm as `q`;
3. runs recursive include/exclude tree DP on `T` and on the forest `T-q`;
4. reconstructs all eight source-coordinate polynomials from the full
   Cartesian `0,...,8` value tensor by exact mixed forward differences;
5. checks every mixed `{9,10}` holdout point outside that tensor; and
6. independently accumulates the canonical residual and replays the stored
   ordered term digest.

Exact audit totals are:

- 23,774 interpolation-grid points and 1,892 holdout points;
- 37,192 literal split-variant rooted profiles;
- 74,384 literal forest-DP runs;
- 190,192 mixed-Newton entries;
- all 3,096 ordered rank-cell digests and all 423,763 power terms replayed;
- zero profile, holdout, digest, or sign mismatch.

The fail-closed gate also caught and forced correction of a preliminary
bookkeeping predicate that had counted long-distinguished/fixed-companion
cells as all-short. Only the corrected audit hashes below are evidence.

## Boundary

This theorem seals only the unique leaf-root orbit of `e6_skeleton_01` for
orders `n>=28` and ranks Delta0 through Delta3. It does not import the already
separate center theorem, does not cover the pendant-interior root orbit, and
does not cover any root orbit of the other nine surplus-six skeletons. It
proves no leaf-extension increment, complete `e=6` layer, or solution of
Erdos Problem 993.

## Immutable evidence hashes

```text
prove_rank8_delta03_e6_quintic_star_leaf_n28_plus_agent_20260825.py
C657006F7F9D23A0BDBB82B50E228A43E7A8B01479D43DA98BC2DBC6E30E1A58

rank8_delta03_e6_quintic_star_leaf_n28_plus_exact_agent_20260825.json
90FF1062BED69ADC418FD6331368B10C6CBFF202C57E35505B19263F0ED3B83D

audit_rank8_delta03_e6_quintic_star_leaf_n28_plus_agent_20260825.py
C113B2B55D23EAE611E03DAA39576B7882F25AAA3A8AAF85C7B5919EFBDF22CE

rank8_delta03_e6_quintic_star_leaf_n28_plus_independent_audit_agent_20260825.json
96011BED975A54B35190E231AC7F6253C68642A007FC620C68C6EB84FF720DDF

assemble_rank8_delta03_e6_quintic_star_leaf_n28_plus_gate_agent_20260825.py
63E5BE23B5C01FC9E770025F498A4EDE914E0AD7EB748C2EBA2B72D6E86CE3A3

rank8_delta03_e6_quintic_star_leaf_n28_plus_gate_exact_agent_20260825.json
AFAF698B9F1C19FCB67DEDBBC6DC16D75C7149266040FD6E4071EED00856477E

rank8_delta03_e6_skeleton_root_partition_exact_20260825.json
B8D2D160F679361AED1D337B9E814DA6B985ACCD19434DF629887DE0E7AE5307

rank8_delta03_e6_skeleton_root_partition_independent_audit_20260825.json
247DF3AC57F265839055CCF258BCC1E946A0470BAE83F2B79E61F1D8BD17E65F

verify_rank8_q8_terminal_reduction.py
389216D19951A28784C46E57393F1F9CD5BBE41625DCD317C664F701EC2EC4B7
```

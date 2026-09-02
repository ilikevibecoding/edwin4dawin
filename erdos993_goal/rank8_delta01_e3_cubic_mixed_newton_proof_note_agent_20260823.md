# Rank-eight cubic e=3 mixed-boundary Newton closure

Status: proof template with exact finite obligations still pending. This note does **not** close the mixed sector until every work unit and its independent audit pass.

## 1. Scope

The target is the pair of strict inequalities `Delta0>0` and `Delta1>0` for rooted cubic `e=3` subdivision cores of order `n>=27` whose boundary-length quotient pattern has at least one short and at least one long coordinate.

The all-short sector is already a separate exact endpoint. The all-long sector is already reduced to seven stable cells. Nothing in this note asserts the remaining connected-Q8 cases, forest cases, or Erdos Problem 993.

## 2. Exact ray partition

The sealed boundary-universe audit partitions the mixed quotient universe into seven disjoint root-location orbits:

| root orbit | quotient rays |
|---|---:|
| outer branch | 592,271 |
| middle branch | 296,693 |
| outer leaf | 1,184,543 |
| middle leaf | 329,795 |
| outer pendant internal | 10,365,407 |
| middle pendant internal | 2,893,391 |
| spine internal | 5,236,991 |
| total | 20,899,091 |

Each quotient key selects one baseline and one nonempty long-coordinate mask. The sealed canonicalization assigns every mixed integer subdivision pattern to exactly one such key and one integer ray offset `S>=0`. Thus exhaustive certification of the 20,899,091 rays has neither gaps nor duplicate proof obligations.

This partition claim is inherited only from the hash-pinned universe audit. A scanner must not reconstruct or silently alter the quotient convention.

## 3. Degree bound

Along one fixed quotient ray, every relevant exact branch-state component is a polynomial in the integer offset `S`. The exact formula audit gives the component degree bounds

```
deg(c7) <= 7
deg(h6) <= 6
deg(p7) <= 7
deg(p8) <= 8
deg(p9) <= 8.
```

Consequently the exact `Q` expression has degree at most 16. Substitution in the two rank-eight residual identities gives termwise degree maxima 29 for `Delta0`, 29 for `Delta1`, and 28 for the remaining lower-degree block. Therefore

```
deg_S Delta0 <= 29,
deg_S Delta1 <= 29.
```

These are symbolic degree bounds, not empirical interpolation assumptions.

## 4. Newton certificate

Let `P(S)` denote either exact residual polynomial on a fixed quotient ray. Because `deg(P)<=29`, the integer Newton identity is exact:

```
P(S) = sum_{k=0}^{29} d_k * binom(S,k),
d_k = forward_difference^k P(0).
```

The 30 exact values `P(0),...,P(29)` determine every `d_k`. For every integer `S>=0`, all `binom(S,k)` are nonnegative. Hence the fail-closed sign test

```
d_0 > 0,
d_1 > 0,
d_k >= 0 for 2 <= k <= 29
```

implies both

```
P(S) > 0
```

and, using

```
P(S+1)-P(S) = sum_{k=1}^{29} d_k * binom(S,k-1),
```

the stronger strict extension inequality `P(S+1)>P(S)` for every integer `S>=0`.

The same test is required independently for `Delta0` and `Delta1` on every ray.

## 5. Exact arithmetic and exhaustive obligations

The fast implementation uses checked signed `i128` arithmetic. An overflow, malformed key, count mismatch, source-hash mismatch, or any failed coefficient sign is a hard failure. It may not be downgraded to an unverified cell or skipped from the denominator.

For each of the seven root orbits, closure requires:

1. the enumerated ray count to equal the sealed expected count;
2. all 30 exact values for each residual to be generated per ray;
3. all 30 forward differences to satisfy the sign gate;
4. all four global minima (`Delta0 d_0`, `Delta1 d_0`, `Delta0 d_1`, `Delta1 d_1`) to be strictly positive where required and accompanied by exact witnesses;
5. an independent audit to replay those witnesses plus spread samples through a literal rooted-tree dynamic program;
6. audit agreement at `S=0,...,29`, coefficient-by-coefficient forward-difference agreement, and a direct unseen-point check at `S=30`.

Only after all seven exhaustive reports and all seven independent audits pass may the mixed-boundary theorem be assembled with the all-short and seven-cell all-long endpoints.

## 6. Current evidence boundary

The first 1,000 `outer_branch` rays were compared between the checked Rust engine and the Python exact implementation. The implementations agreed on all four minima and the higher-coefficient zero count. This is useful equivalence evidence but has no exhaustive closure value by itself.

The pending exact denominator is 20,899,091 mixed quotient rays.

# Independent realizability audit of the rank-7, one-group obstruction

Date: 2026-08-28

Status: **exact realizable counterexample to the proposed group-payment
inequality, including after aggregation over all nondistinguished base sets**.

This conclusion concerns only the auxiliary payment

```text
2 Z + 7 E >= 5 a6
```

for the rank-7, `c=1` edge cell. It does not contradict the final edge-local
inequality or the averaged token-sliding candidate.

## 1. Literal minimum-order tree

Use the ten vertices

```text
u,v,w,r1,r2,t,s1,s2,s3,s4
```

and the nine edges

```text
uv, vw, wr1, wr2, r1t, ts1, ts2, ts3, ts4.
```

This is a tree. Orient the edge as `u -> v`. Then

```text
deg(u)=1, deg(v)=2,
p=deg(u)-1=0, q=deg(v)-1=1,
c=p+q=1, split=0.
```

Deleting `u,v` leaves the sole boundary vertex `w`. Deleting `w` as well
gives `H` with distinguished-root group

```text
D={r1,r2}
```

and nondistinguished vertices

```text
N={t,s1,s2,s3,s4}.
```

The independent base

```text
B={s1,s2,s3,s4}
```

is compatible with both `r1,r2`, so this is exactly the task-supplied cell

```text
R=7, c=1, split=0, s=4, x=[2].
```

There is therefore no missing tree-compatibility condition that excludes the
cell.

## 2. Exact fixed-cell payment

Over this base, selecting zero, one, or two compatible roots gives

```text
selected roots   multiplicity   H-size   a6   Z   E   2Z+7E
0                1              4        0    0   0   0
1                2              5        0    0   0   0
2                1              6        1    2   0   4
```

Thus the denominator is one and the payment ratio is

```text
(2Z+7E)/a6=4<5.
```

## 3. Aggregating every base set does not repair it

The forest `H` is the star on center `t` and leaves
`r1,s1,s2,s3,s4`, together with isolated `r2`. Hence

```text
I(H;x)=((1+x)^5+x)(1+x)
      =1+7x+16x^2+20x^3+15x^4+6x^5+x^6.
```

The unique independent six-set is

```text
{r1,r2,s1,s2,s3,s4}.
```

It selects both roots, so

```text
a6=1, Z=2.
```

For `c=1`, the rank-six part of `E` counts an unhit group, but the unique
six-set hits the group. The only possible lower-rank contribution would be
an independent five-set of the nondistinguished forest `H-D`; none exists,
because `H-D` is the star with center `t` and leaves `s1,...,s4`. Thus

```text
E=0,
2Z+7E=4<5a6=5.
```

Equivalently, all 17 independent bases of `H-D` were enumerated. Sixteen are
subsets of `{s1,...,s4}` and one is `{t}`. Only the four-leaf base contributes
to `a6` or the payment; therefore no cross-base reserve is present.

## 4. Minimum order

Any realization needs four selected nondistinguished vertices and two
selected compatible roots, hence six selected vertices of `H`. If `H` had
only these six vertices, it would be edgeless because they form an independent
set. But a nondistinguished vertex cannot be adjacent directly to the boundary
vertex—such a neighbor is, by definition, distinguished. The four
nondistinguished vertices therefore could not be connected to the boundary in
the original tree. At least one additional unselected connector is necessary:

```text
|H| >= 7,  |T|=|H|+3 >= 10.
```

The displayed tree attains order ten. As a bounded independent check, every
nonisomorphic tree through order ten was enumerated: none of the 94 trees of
orders two through nine realizes the cell; two of the 106 order-ten trees do.

## 5. Final edge-local scope check

Let `J=H-D`. Direct enumeration gives

```text
I(J;x)=1+5x+6x^2+4x^3+x^4,
I(T;x)=1+10x+36x^2+63x^3+65x^4+41x^5+14x^6+2x^7.
```

Thus `i7(T)=2`. For this edge, `|H|=7`, and the actual rank-seven edge-local
margin is

```text
7|H|i7(T) - (n-2)(n-3)a6
=7*7*2 - 8*7*1
=42>0.
```

So the witness kills the proposed auxiliary group-payment lemma, both
pointwise and after base aggregation, but it does not kill the ultimate
edge-local inequality.

## 6. Provenance note

The named producer and report paths were regenerated while this audit was in
progress. The earlier snapshot hashes observed before regeneration were

```text
producer F5383141AB1BF7C6BD600775522D06C548FA17438B91E3C989E33874EF6F6372
report   03F38E70ECEF9E951BB916F1A2A031EC3BB20A19BA1712703DF0AD05F218D0A5
```

The independent auditor reconstructs the assigned cell from first principles
and records the current replacement hashes separately; it does not import or
execute either producer version.

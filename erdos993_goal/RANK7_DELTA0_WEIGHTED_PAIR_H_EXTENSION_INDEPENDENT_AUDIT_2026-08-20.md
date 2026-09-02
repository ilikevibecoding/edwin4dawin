# Independent audit: weighted pair lift plus the `H`-extension coupling

Date: 2026-08-20

Status: **PASS after adding the separate `H`-active face.**  The new `H=A-q`
extension inequality is combinatorially valid, its algebraic translation and
sign are exact, the three-regime/three-face union has no gap, and fresh
sequential exact replays of all six named hard lower-`q` cells pass.

This supersedes the earlier conclusion that the weighted pair lift alone left
two relaxed-cone obstructions.  Those two points are valid obstructions to the
older enclosure, but both violate the newly retained `H`-extension inequality.
Their nonempty `H`-equality boundaries motivated the required third face,
which is now implemented separately and audited below.

## 1. Independent derivation of the missing coupling

Let

```text
H=A-q,       J=A-N[q].
```

Then `H` has `n-1` vertices.  Splitting independent sets of `A` according to
whether they contain `q` gives

```text
h5=i5(H)=c5-i4(J)=c5-a,
h6=i6(H)=c6-i5(J)=c6-b.
```

Double count pairs `(I5,I6)` with `I5 subset I6`, where both are independent
sets of `H`.  Every independent six-set contains six independent five-sets,
whereas an independent five-set in an `(n-1)`-vertex graph has at most

```text
(n-1)-5=n-6
```

one-vertex extensions.  Therefore

```text
6h6 <= (n-6)h5.                                            (1)
```

No connectedness or forest structure is needed for (1).

Since `z=c5/c6>0`,

```text
h6=c6-b=(c5-bz)/z.
```

Multiplying (1) by the positive number `z` gives exactly

```text
(n-6)(c5-a)z - 6(c5-bz) >= 0.                             (2)
```

This is precisely the source constraint `h_extension`.  Its direction is
correct: the extension upper bound is right side minus left side in (1),
multiplied by positive `z`.

On the active face, solving equality in (2) for `bz=b*z` gives

```text
bz = c5 - ((n-6)/6)(c5-a)z.                              (3)
```

The separate H-face prover uses exactly (3), and then
`d=1-bz/c5`, which is the correct substitution for
`d=1-bz/c5=1-b/c6`.  Because `z>0`, every lower or upper bound on `b` can be
multiplied by `z` without reversing its direction.  The source constraints
therefore translate exactly as follows:

```text
b>=ratio       -> bz-ratio*z>=0,
b>=lifted      -> bz-lifted*z>=0,
b>=0           -> bz>=0,
b<=C(m,5)      -> C(m,5)z-bz>=0,
b<=c5-a        -> (c5-a)z-bz>=0,
b<=((m-4)/5)a  -> ((m-4)/5)az-bz>=0,
b<=c6/2        -> c5-2bz>=0,
c6<=C(n,6)     -> C(n,6)z-c5>=0.
```

All eight directions and algebraic equivalences passed independent symbolic
checks.

## 2. The two earlier relaxed points are excluded

The exact residual (2) at the earlier order-27 point

```text
(n,m,a,b,c5,z)=(27,24,6820,17668,33649,2/7)
```

is

```text
-10632 < 0.
```

At the earlier order-28 point

```text
(n,m,a,b,c5,z)=(28,25,8245,22937,42504,3/11)
```

it is

```text
-131304/11 < 0.
```

Thus neither point lies in the repaired relaxation.  They remain useful exact
controls showing why (2) is material, but neither is a tree counterexample.
The corresponding H-active values are nonempty: `b_H=23870` at order 27 has
containment, extension, and half-retention margins `2959,3410,20009`; and
`b_H=90695/3` at order 28 has margins `12082/3,13192/3,26014`.  This confirms
that a separate H-equality face is necessary rather than vacuous.

## 3. Weighted global floor in the source

Put

```text
r=B4/C(m-2,2).
```

For the actual integer edge count `e`, the bad-four union bound gives
`e>=ceil(r)>=r`.  Summing the sharp local weighted inequality gives

```text
D >= alpha*C(e,2) + gamma*A,
alpha=(m-4)/2,
gamma=(m-4)(m-9)/12,
A=sum_v C(deg(v),2).
```

The source names these coefficients `alpha` and `beta`; its `beta` is the
adjacent-pair correction `gamma`, not the full direct adjacent coefficient.
For every `m>=18`, both are positive.

The three source regimes use the following valid continuous floors:

```text
regime 0: 0<=r<=1
          C(e,2)>=0, A>=0;

regime 1: 1<=r<=m/2
          C(e,2)>=r(r-1)/2, A>=0;

regime 2: r>=m/2
          C(e,2)>=r(r-1)/2, A>=2e-m>=2r-m.
```

The quadratic pair floor is valid because `u(u-1)/2` is increasing for
`u>=1`.  Adding `defect_floor/3` to the generic bad-set lower bound is also
the correct conversion from a lower bound on

```text
D=(m-4)B4-3B5
```

to a lower bound on `b=i5(J)`.

## 4. Exact three-face no-gap decomposition

The regime intervals are

```text
[0,1], [1,m/2], [m/2,infinity).
```

They cover every possible `r>=0`; the shared boundaries are deliberately
included in both neighboring cells.  Because `m>=18`, their ordering is
unambiguous.  The nonnegativity of `r` itself follows from
`B4=C(m,4)-a>=0` on the coefficient box.

With (2), the feasible lower endpoint is

```text
b=max(ratio_lower,lifted_badset,b_H),
b_H=c5/z-((n-6)/6)(c5-a).
```

The three source faces are exact:

```text
ratio face:  b=ratio_lower,
             ratio_lower-lifted_badset>=0,
             ratio_lower-b_H>=0 through retained (2);

lifted face: b=lifted_badset,
             lifted_badset-ratio_lower>=0,
             lifted_badset-b_H>=0 through retained (2);

H face:      b=b_H,
             b_H-ratio_lower>=0,
             b_H-lifted_badset>=0.
```

The H-face prover expresses the last two inequalities after multiplication by
positive `z`, exactly as audited above.  The three faces cover the maximum
with no gap and overlap safely at every equality.

The full index set for orders 27 through 38 has

```text
sum_(n=27)^38 (n-19) = 162
```

`(n,m)` pairs and

```text
162 * 3 regimes * 3 faces * 2 q endpoints = 2916
```

cells: 1,944 ratio/lifted cells plus 972 H-active cells.  This is a no-gap
decomposition statement, not a claim in this audit that either checkpointed
full batch has already finished.

## 5. Fresh exact replay of the six hard cells

The audited prover has SHA-256

```text
prove_rank7_delta0_joint_lower_b_weighted_pair_faces_finite.py
E0017425A2DAC860C735210CDD4AFDC212D919C8FCBFB7F0E5834305B4C8BF6D

prove_rank7_delta0_joint_lower_b_h_extension_face_finite.py
3888A69298EA2F2FD487443D15559388F883505A28CC6AB191835ED1E4034B62
```

Fresh sequential replays, with no parallel workers, gave the following
results (depth 52 for ratio/lifted and depth 80 for H-extension):

| `n` | `m` | regime | face | `q` | nodes | passed | discarded | result |
|---:|---:|---:|---|---:|---:|---:|---:|---|
| 27 | 24 | 2 | ratio | 0 | 63 | 21 | 11 | PASS |
| 27 | 24 | 2 | lifted | 0 | 65 | 21 | 12 | PASS |
| 28 | 25 | 2 | ratio | 0 | 31 | 11 | 5 | PASS |
| 28 | 25 | 2 | lifted | 0 | 57 | 20 | 9 | PASS |
| 27 | 24 | 2 | H-extension | 0 | 1097 | 244 | 305 | PASS |
| 28 | 25 | 2 | H-extension | 0 | 1165 | 249 | 334 | PASS |

Every replay returned code zero, empty stderr, `worst=None`, and valid full
binary subdivision accounting.

## 6. Scope

This audit establishes:

- the combinatorial and algebraic validity of the `H`-extension constraint;
- the correctness and no-gap nature of the three-regime/three-face reduction;
- exact success of all six named regime-2, lower-`q` hard cells.

It does not independently certify every cell in the separate 1,944- and
972-job batches; those remain governed by their own final reports and immutable
prover hashes.

## Audit artifacts

```text
audit_rank7_delta0_weighted_pair_h_extension_independent.py
0CBE377BA557F39B00FB8A87593BB6E62CC663F7B67A9864CD0BB1AFF781D6E0

rank7_delta0_weighted_pair_h_extension_independent_audit_exact_20260820.json
2DD90561193DE99A4D0916D5F62A53F10A7F4ABFB2C2F1E6C84218E83FA9892F
```

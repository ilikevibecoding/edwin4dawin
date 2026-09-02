# Endpoint Jacobi rays close through forest layer eight

## 1. Forest-cone setup

Retain the aligned endpoint notation

```text
C=P_(N-1), D=P_(N-2),
V=P_N-P_(N-1)=vS, W=P_(N-1)-P_(N-2)=vT,

E=J_s(C,C)+uJ_s(D,D),
F=J_s(C,V)+uJ_s(D,W),
G=J_s(V,V)+uJ_s(W,W).
```

The actual selector range, unlike the deliberately larger exploratory
audits, has

```text
N=2s+5+q,                    q>=0.                  (1)
```

The endpoint square is negative-rooted once both pencils

```text
E+cF,       F+cG,            c>=0                  (2)
```

are negative-rooted.

## 2. Exact low-layer theorem

For every integer `2<=s<=9`, every real `q,c,u>=0`, and `N` given by
(1), both polynomials in (2) have only nonpositive real roots (with their
common forced zero roots retained).

For `s=2,3` their nonzero cores have degree at most one.  For `4<=s<=8`,
direct symbolic elimination gives the following numbers of strictly
positive coefficients in the discriminants, viewed as polynomials in
`(c,q,u)`:

```text
 s       Disc(E+cF)       Disc(F+cG)
 4             54                 45
 5             72                 63
 6            425                375
 7            525                470
 8           1666               1519
```

There are 5,214 positive discriminant coefficients in total and no zero or
negative coefficient.  The same replay expands `E,F,G` themselves in
`(t,q,u)` and verifies that every displayed coefficient is strictly
positive.

Layer `s=9` is the first grouped-positive case.  The discriminant of
`E+cF` still has 1,960 strictly positive coefficients.  The discriminant of
`F+cG` has 1,813 terms, of which exactly 144 are negative; every negative
term belongs to the single `c^5` block.  Write that block as

```text
c^5{P(q,u)-N(q,u)},       P,N coefficientwise positive,
```

and write the adjacent `c^4,c^6` blocks as `c^4D4,c^6D6`.  Both `D4,D6`
have 259 positive terms.  Exact expansion gives

```text
4D4D6-N^2
```

with 949 strictly positive coefficients.  Therefore

```text
c^4D4+c^6D6 >= 2c^5 sqrt(D4D6) > c^5N,
```

so the whole discriminant is strictly positive for `c,q,u>0`.  This is a
uniform AM--GM repair on the unbounded forest half-line, not a fixed-grid
check.

Here is the homotopy argument, which is part of the proof rather than a
finite root test.  The pair `C,D` is an adjacent nested path-Jacobi chain,
so Section 75 proves that

```text
E=J_s(C,C)+uJ_s(D,D)
```

is negative-rooted.  Therefore the positive discriminant of `E+cF`, its
fixed positive leading coefficient, and continuity in `c>0` prevent any
real-root collision or degree loss; every member stays real-rooted.

Similarly

```text
G=t{J_(s-2)(S,S)+uJ_(s-2)(T,T)}.
```

The pair `S,T` is another adjacent nested positive Jacobi chain, so Section
75 proves that `G` is negative-rooted.  Starting at the scaled limit
`c^(-1)(F+cG)->G` as `c->infinity`, the strictly positive discriminant of
`F+cG` prevents a collision at every finite `c>0`.  Thus `F+cG` is
real-rooted.  The verified positive coefficients put every nonzero root of
both pencils on the negative axis.  The boundary values `c=0`, `q=0`, or
`u=0` follow by coefficientwise limits and closure of real-rootedness.

This proves the entire endpoint square, not merely selected parameter
values, for the eight forest layers `2<=s<=9`.

## 3. Coarse root-coherence grid and its exact refutation

Put

```text
K_c=E+2cF+c^2G,       H_c=F+cG=(1/2)partial_c K_c. (3)
```

A separate certified-ball audit covers

```text
2<=s<=30,
N=2s+5+e, e in {0,1,5,20,100},
u in {10^-6,10^-3,1,10^3,10^6},
c in {0,10^-3,10^-1,1,10,10^3}.
```

On this coarse grid, in 4,350 cells and 33,750 simple roots, interval
evaluation of

```text
-H_c(lambda)/partial_t K_c(lambda)                 (4)
```

has one common sign at all ordered roots `lambda` of each sampled `K_c`.
There are 1,450 all-positive and 2,900 all-negative grid cells.

This pattern **does not extend between the sampled `c` values**.  Exact
certified interval evaluation gives the following forest-boundary
counterexamples:

```text
(N,s,u,c)=(13,4,1,6/5):       signs (-1,+1),
(N,s,u,c)=(17,6,1,119/100):   signs (-1,-1,+1),
(N,s,u,c)=(21,8,1,6/5):       signs (-1,-1,+1,+1).
```

Thus `K_c` and `partial_cK_c` are not in one proper-position orientation,
even under the sharp forest reserve.  The fixed-sign Wronskian/root-motion
route is rigorously refuted.  This does not affect the theorem in Section 2:
`H_c=F+cG` remains negative-rooted even when different roots of `K_c` move
in opposite directions.

For comparison, the unrestricted assertion also fails at

```text
(N,s,u,c)=(5,4,10^-6,1),
```

where certified interval evaluations give velocity signs `(-1,+1)`.  This
cell is outside (1), since `5<13`.

The surviving all-order analytic target is only negative-rootedness of
`H_c`, equivalently compatibility of the two full/principal-minor spectral
directional derivatives.  A uniform grouped-positive discriminant or
subdiscriminant recurrence remains viable; a Wronskian proof does not.

## 4. Replays

The all-excess theorem is replayed by
`prove_endpoint_rays_forest_low_layers.py`, which writes
`endpoint_rays_forest_low_layers_exact_20260813.json` and reports
`PASS_EXACT_ENDPOINT_RAYS_FOREST_LAYERS_2_THROUGH_8`.

The layer-nine AM--GM repair is replayed independently by
`prove_endpoint_rays_forest_layer9_amgm.py`, which writes
`endpoint_rays_forest_layer9_amgm_exact_20260813.json` and reports
`PASS_EXACT_ENDPOINT_RAYS_FOREST_LAYER9_AMGM_REPAIR`.

The certified finite grid audit and its exact counterexamples are
`audit_endpoint_kc_forest_root_coherence_exact.py`, which writes
`endpoint_kc_forest_root_coherence_exact_20260813.json` and reports
`PASS_CERTIFIED_ENDPOINT_KC_FOREST_ROOT_COHERENCE_AUDIT`.  Its grid counts
are finite observations and its displayed counterexamples rigorously refute
global coherence; the theorem of Section 2 remains exact for its stated
unbounded parameter range.

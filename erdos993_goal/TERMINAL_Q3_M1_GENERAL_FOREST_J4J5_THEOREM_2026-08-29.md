# Terminal `q3` Newton `m=1` for forest bases, `j=4,5`

Date: 2026-08-29

Status: **proved for every supported `j=4,5` no-isolate disconnected-forest
base, conditional on the smaller-forest input `q_j(F)<=q_2(F)`.**

## Statement

Let `G` be a disconnected finite forest with no isolated component, mark a
nonisolated vertex `w`, and put

```text
F=G-w,  H=G-N_G[w].
```

For `j=4` or `5`, assume `i_j(F)>0` and the strong-induction input

```text
q_j(F)<=q_2(F).                                    (1)
```

Then the degree-one Newton coefficient `D_1(G,w,j)` of the canonical
terminal-`q3` payment is nonnegative.

The all-forest `q3<=q2` theorem and the forest-anchor theorem are already
proved unconditional inputs.  Equation (1) is the only conditional input in
this result.

## Exact reduction

Write

```text
|G|=N+1, h=c(G)-1, m=N-h, d=deg_G(w), r=N-j,
R=sum_(u~w)(deg_G(u)-1),
W=sum_v C(deg_G(v),2),
y=i_j(H)/i_j(F).
```

The low block is kept fixed at rank two:

```text
a=i2(F), z2=s3(F), h2=i2(H), c0=a+z2+h2.
```

The pinned exact reduction retains the positive forest-anchor reserve `Gap`.
It discards the all-forest FQ32 margin `M` only after the coefficient of `M`
is proved nonnegative.  The adverse one-edge row is bounded using (1) in the
correct direction.  Its cleared numerator is quadratic in `W` and affine in
`y` after the `W^2` term is removed.

For `N>=13`, the common exact cone proves:

```text
the W^2 coefficient >=0 at y=0 and y=1,
the M coefficient >=0 for y>=0,
both B=0 values >=0,
all square-dropped y=0 W/R boundaries >=0,
```

where `B=N-2h-1`.  The exact box is

```text
N=13+S,
h=1+(10+S)u/2,
d=1+(10+S)(1-u)v.
```

It covers the full relaxed component domain.  The common module has 392
Bernstein coefficients and 4,276 power coefficients in `S`; all are
nonnegative, 28 are zero, and the minimum positive coefficient is `1/2`.

## Positive-`y` endpoint, high root degree

On `y>0`, support gives `N-d>=j`.  If `d>j`, the exact relative-shadow cap is

```text
y <= (N-d-j+1)/(N-d-j+1+j(d-j)).                  (2)
```

After the common `W^2` term is removed, both rigorous `W` boundaries and
both `R` endpoints are certified at (2).  The supported high-degree module
checks 20 endpoint families, 526 numerator Bernstein coefficients, and 7,134
power coefficients.  Every numerator and every cleared denominator is
strictly positive; the minimum numerator coefficient is `1/4`.

## Positive-`y` endpoint, low root degree

Suppose `1<=d<=j`.  Divide

```text
R=d*q+s,  q>=0, 0<=s<d,
L=N-2h-d-R>=0,
S_H=N-d,
K=S_H-q=2h+(d-1)q+s+L.                            (3)
```

The all-`R` balanced-neighbor lemma gives

```text
y <= C(S_H,j) /
 [C(S_H,j)+(d-s)C(K-j+2,j-1)+sC(K-j+1,j-1)].      (4)
```

Because `K` is an integer, exactly one of the following holds:

```text
K<=2j-3  (inactive),
K>=2j-2  (active).                                 (5)
```

There is no gap between the two sectors.

The inactive sector is supplied by two independently replayed certificates:

- for `d=1`, 468 all-order shifted coefficients, all strictly positive;
- for `2<=d<=j`, exact enumeration leaves no `j=4` cells and five `j=5`
  cells, whose ten `W` endpoint values are positive.

On the active sector the path-floor binomials in (4) are polynomial and
nonnegative.  Exact parameterizations preserve the shared quantity
`A=(d-1)q+L` instead of optimizing `q` and `L` independently.  The frozen
target modules give:

```text
j=4:  60 families,   897 Bernstein coefficients,
      54,996 monomial coefficients, minimum positive 1/12;
j=5: 120 families, 1,968 Bernstein coefficients,
      108,063 monomial coefficients, minimum positive 1/40.
```

All 163,059 active monomial coefficients are strictly positive.  Since the
square-dropped lower is affine in `y`, the common `y=0` theorem and the
positive cap endpoint prove every intermediate `0<=y<=y_cap`.  Since it is
affine in `W`, its two valid `W` boundaries prove the entire `W` interval.
The common nonnegative `W^2` coefficient then restores the discarded square.

## Order and isolate coverage

The direct-canonical finite theorem covers every forest base through
`|G|=13`, equivalently `N<=12`: 272,761 supported cells over all targets,
all positive and none zero.  The symbolic modules begin at `N=13`, so there
is no order gap.

The statement above is formulated for no-isolate bases.  The exact permanent
isolate identity

```text
D'_1=D_1+D_2
```

together with the proved all-forest `D_2>=0` theorem preserves the result
when permanent isolated components are adjoined.

## Exact coverage partition

Every required cell lies in exactly the following exhaustive hierarchy:

```text
N<=12                                      finite canonical theorem
N>=13, B=0                                common B=0 cone
N>=13, B>0, y=0                           common y=0 cone
N>=13, B>0, y>0, d>j                      relative-shadow cap
N>=13, B>0, y>0, d<=j, K<=2j-3            inactive balanced cap
N>=13, B>0, y>0, d<=j, K>=2j-2            active balanced cap
```

The assembler replays (3), the adjacent integer thresholds in (5), every
dependency hash, every expected status marker, and all reported family
counts.

## Frozen replay

```powershell
python .\assemble_terminal_q3_m1_general_forest_j4j5_agent.py
```

It must print

```text
PASS_EXACT_GENERAL_NO_ISOLATE_FOREST_M1_J4J5_CONDITIONAL_Q_ENVELOPE
```

Top-level pins:

```text
assemble_terminal_q3_m1_general_forest_j4j5_agent.py
  1D78D769C35A3F56EF7069B22529440B1ED1C66FD83AC9A902EAEA8B422E3712
terminal_q3_m1_general_forest_j4j5_assembly_exact_agent_20260829.json
  D9F52886B826E327DCCC4CE3FA0173CA8C054E02354303B6A97B75D3B7EB3558
```

The assembly report pins every producer, report, cap lemma, finite theorem,
isolate shift, all-forest `m=2` theorem, and the exact edge-survival payment
reduction.

## Global-bridge warning and remaining scope

This theorem uses the Boolean smaller-forest envelope (1), but that does not
license throwing away quantitative `q3-q_r` slack in the remaining global
bridge.  The pinned edge-survival payment identity has the exact rearrangement

```text
P_q/S^2 = q+x(x-y)+t(1-t)-3*x*q_(q+2).
```

Replacing `q_(q+2)` by `q3` gives a much weaker lower bound and fails badly
on Galvin families.  A valid later DFP/global bridge must retain the exact
restoration

```text
3*x*(q3-q_(q+2)).                                  (6)
```

A current Galvin computation finds that (6) pays roughly 74%--90% of the
adverse bound.  That percentage is diagnostic evidence only, not a theorem.

This result closes only forest-base terminal Newton `m=1` at `j=4,5`, under
(1).  Target `j=3`, forest `m=0`, the pointed/global boundary bridge, the
complete terminal payment, unimodality, and Erdos Problem 993 remain open.

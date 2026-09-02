# Rank-eight low/low factored-payment gluing route

## What the new certificate fixes

The former full-early payment and the suffix-only payment could not simply be
identified.  In the last strong block they used different valid source pairs,
and some old nonzero-early blocks had a source on the early-zero face.  That
made the formal subtraction of the common face unsafe.

The factored certificate

```text
rank8_low_low_full_early_core_factored_amgm_exact_20260822.json
```

removes both defects.  For every negative monomial, its low source, negative
monomial, and high source have the same exponent vector

```text
e=(deg(a0),deg(a2),deg(b0),deg(b2)).
```

The zero group `e=(0,0,0,0)` is forced to use the exact sealed suffix-only
allocations.  In particular it deliberately uses the suffix certificate's
alternate final strong source pair.  The certificate contains respectively
`54,84,159` blocks in curvature-far, strong-middle, and strong-far, partitioned
into `18,18,38` early-support groups.  All positive sources are disjoint.

## A genuinely common AM-GM payment

Index the new allocations by their negative monomials.  Their order is exactly
the old full-early order, so the existing directional masks transfer without
ambiguity.  In a selected left block replace

```text
ta -> TA = ta+a3+a4+a5+a6+a7,
```

and analogously replace `tb` by `TB=tb+b3+...+b7` in a selected right block.
Use the same choice in both sources and the negative monomial of that block.

Every block remains a valid midpoint AM-GM inequality.  Indeed, its common
early factor is `a0^e0 a2^e2 b0^f0 b2^f2`, the three remaining monomials still
satisfy `low*high=negative^2`, and the audited capacities satisfy
`demand^2 <= 4*low_capacity*high_capacity`.

Specialization is now literal rather than heuristic.  If all four early
variables vanish, every block with `e!=0` vanishes in its entirety, while the
zero group is byte-for-byte the sealed suffix payment (with the factor two in
strong-middle).  Thus there is no subtraction of a shared origin and no
two-source-pair ambiguity.

## Exact support

Gap 3 occurs in four cumulative ratios.  A quadratic auxiliary therefore has
degree at most eight in either side's gap-3 slack, and the extra left capacity
ratio raises only the strong left bound.  Hence the complete common outer grid
is

```text
0 <= deg(a3) <= 9,    0 <= deg(b3) <= 8.
```

The transferred factored masks select 0/51, 75/0, and 76/68 blocks in the
three paid rows.  Among selected factored blocks the terminal exponent is at
most six on either side.  Early degree plus selected terminal degree is at
most seven on the left and six on the right.  The payment therefore stays
strictly inside the raw support.

The smallest direct exact experiment retains every other variable and checks
the 90 `(a3,b3)` coefficient polynomials.  Once the `a3=b3=0` plane has been
recertified under this *factored* payment, only 89 new outer cells remain.  In
each nonorigin cell the early-zero coefficient sector is already the sealed
suffix theorem; an implementation may project it out and check only positive
early support.

## Compatibility with the suffix-4/5 redistribution

Put

```text
U=a4+a5,  a4=(1-x)U,  a5=xU,
W=b4+b5,  b4=(1-y)W,  b5=yW.
```

The common payment depends on `a4,a5` only through `TA=ta+a3+U+a6+a7`, and
similarly on the right.  It is independent of `x,y`.  The raw auxiliary is
bidegree at most `(2,2)`, so the residual is also bidegree at most `(2,2)` and
every tensor Bernstein coefficient subtracts exactly four times the same
payment.

If direct coefficient positivity in separate `a4,a5,b4,b5` fails, the robust
fallback is therefore nine tensor positions for each of the 89 nonorigin
suffix-3 cells: 801 retained-`U,W` polynomial checks.  If `U,W` must also be
split, axis degeneracy leaves 1,480 nonduplicate total/position cells per
suffix-3 cell:

```text
13*12*9 + 13*3 + 12*3 + 1 = 1480,
89*1480 = 131720.
```

The old suffix-4/5 theorem cannot silently seed the origin for this new
payment: its residual used different source allocations.  The factored-payment
origin plane must first be recomputed or related to the old certificate by an
independent exact residual audit.

## Smaller staged implementation: 558 plus 521 cells

There is a computationally smaller way to use the factored payment without
recertifying the entire suffix-4/5 origin plane under that payment.

First set `a2=b2=0`.  Split only the four outer exponents
`(a3,b3,a0,b0)`, retaining `a4,...,a7,b4,...,b7` exactly.  The common support
is

```text
0<=a0<=2,  a0+a3<=9,
0<=b0<=2,  b0+b3<=8.
```

There are `27*24=648` cells.  The 90 cells with `a0=b0=0` are literally the
sealed suffix certificate, so the factored residual needs 558 new cells.  This
is the precise universe used by the current factored gap-zero verifier.

After that face is sealed, put

```text
P=a2+a3,  a2=(1-z)P,  a3=zP,
Q=b2+b3,  b2=(1-w)Q,  b3=wQ.
```

Ratios 0, 1, and 2 see the fixed total, while ratio 3 alone sees `zP` or
`wQ`.  Every factor row is affine in its side's coordinate; the capacity ratio
is independent of the coordinate.  Hence every *raw* auxiliary has bidegree at
most `(2,2)` in `(z,w)`.  The `(0,0)` Bernstein corner is the already sealed
full-early/suffix-4/5 theorem.  The `(2,2)` corner is the new factored
gap-zero/suffix-3 face.  No common payment is needed in this second bridge:
the two endpoints are theorems about the raw auxiliary, and the remaining
seven Bernstein coefficients are checked directly.

The total supports are `0<=deg(P)<=9` and `0<=deg(Q)<=8`.  For `P,Q>0`, all
seven positions other than `(0,0),(2,2)` are new.  On either total axis the
other redistribution coordinate disappears, leaving only its univariate
middle coefficient.  The exact nonduplicate count is therefore

```text
9*8*7 + 9 + 8 = 521.
```

Thus the smallest currently explicit split-cell route is 558 factored
gap-zero cells followed by 521 raw quadratic-redistribution cells, or 1,079
new cells in total.  A direct 89-cell retained-variable experiment is smaller
as a formal grid but much denser computationally.  If any second-stage raw
coefficient is negative only because `a4,a5` are separated, the suffix-4/5
`(x,y)` Bernstein transform can be nested around that failing cell.

## Audited evidence and remaining obligation

`audit_rank8_low_low_factored_payment_gluing_support_agent.py` independently
checks all 297 midpoint inequalities, common early factors, source
disjointness, exact zero-group specialization, mask transfer, support bounds,
and the finite cell counts.  Its report is

```text
rank8_low_low_factored_payment_gluing_support_agent_20260822.json
```

This establishes a rigorous finite route, not the missing residual theorem.
Completion still requires the factored-payment origin face and all selected
nonorigin residual cells to pass exact coefficient checks.

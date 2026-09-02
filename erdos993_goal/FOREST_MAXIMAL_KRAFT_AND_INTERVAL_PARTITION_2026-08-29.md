# Forest maximal-set Kraft bound and Boolean-interval partition

Date: 2026-08-29

Status: **exact all-order structural theorem.**  It strengthens the separate
coefficient bounds `m_s(F)<=2^s`, but does not by itself prove ISO,
unimodality, or Erdős Problem 993.

## Theorem

Let `m_s(F)` be the number of maximal independent `s`-sets of a finite
forest `F`.  Then

```text
sum_s m_s(F)/2^s <= 1.                              (1)
```

In addition, the independent sets of `F` have a recursive partition into
Boolean intervals, one interval per maximal independent set.  Consequently
there are integers `a(M),b(M)>=0`, indexed by maximal independent sets `M`,
such that

```text
a(M)+b(M)=|M|,
I(F;x)=sum_M x^a(M)(1+x)^b(M).                      (2)
```

## Leaf proof

If `z` is isolated, every maximal independent set contains `z`, and

```text
M_F(y)=y M_(F-z)(y),
K(F)=K(F-z)/2,
```

where `M_F(y)=sum_s m_s(F)y^s` and `K(F)=M_F(1/2)`.

Otherwise choose a leaf `ell` with support `q`.  Every maximal independent
set contains exactly one of `ell,q`.  Removing the selected vertex gives the
disjoint recurrence

```text
M_F(y)=y M_(F-{ell,q})(y)+y M_(F-N[q])(y).          (3)
```

Hence

```text
K(F)={K(F-{ell,q})+K(F-N[q])}/2.                    (4)
```

The empty forest has `K=1`.  Equations (4) and the isolated-vertex step prove
`K(F)<=1` by induction, which is (1).  Unlike the separate estimates
`m_s<=2^s`, (1) forces all maximal-set sizes to share one unit of capacity.

For the interval partition, split every independent set according to whether
it contains `q`.  If it omits `q`, the leaf `ell` is free and the remainder is
an independent set of `F-{ell,q}`.  If it contains `q`, delete `q` and use an
independent set of `F-N[q]`.  Thus

```text
I(F;x)=(1+x)I(F-{ell,q};x)+x I(F-N[q];x).           (5)
```

Multiplying the inductive intervals by `(1+x)` or `x` respectively gives
disjoint intervals whose tops are exactly the two classes of maximal
independent sets in (3).  An isolate multiplies every interval by `(1+x)`.
This proves (2).

## Exact scope boundary

The pair of abstract conditions (1)--(2), after discarding the recursive
minor relation in (5), is not enough to force unimodality.  For example the
formal interval mixture

```text
(1+x)^4 + x + x^3(1+x) + 6x^4
 = 1+5x+6x^2+5x^3+8x^4
```

uses exactly one unit of Kraft capacity but has a valley at rank three.  This
formal mixture has not been realized by a forest.  It shows that any use of
(1)--(2) must retain the paired forest-minor recursion (5), rather than only
the aggregate capacity.

## Replay and pins

Run

```powershell
python .\verify_forest_maximal_kraft_interval_root.py
```

The verifier reconstructs the interval partition and literal maximal sets on
all `80` atlas forests including the empty forest.  It ends with

```text
PASS_EXACT_FOREST_MAXIMAL_KRAFT_AND_BOOLEAN_INTERVAL_PARTITION
```

SHA-256 pins:

```text
verify_forest_maximal_kraft_interval_root.py
706C49044686FE1ACA217319FCE51E1C17D6E7C7604F034237DE57F0045E96F5

forest_maximal_kraft_interval_exact_root_20260829.json
921FE68E7A5084B52F79EC85BF348B3E6E9E57ED61281E904221AFD2511E7F15
```

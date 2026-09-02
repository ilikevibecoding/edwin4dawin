# Cutoff-aware compact split for the ordinary Four-Minor Leaf Lemma

Date: 2026-08-29

Status: **exact identity plus finite exact evidence; not an all-order proof.**

## Exact identity

Let an ordinary unmarked leaf be removed from a marked forest.  In the usual
leaf notation write

```text
A=C+xH,                    Full=A+xC,
```

and let `N` be the nested four-minor kernel.  Let `B_N` denote the
polarization of `N`, and let

```text
R(T)=z^2 E_T(w)W_T(z)+w^2 E_T(z)W_T(w)
     +zw[U_T(w)V_T(z)+U_T(z)V_T(w)].
```

Exact symbolic expansion gives

```text
N(Full)-N(A)-zwN(C)
 = (z+w)N(C)+2zw B_N(H,C)
   -(z-w)^2 [R(C+H)-R(H)]/2.                     (1)
```

Thus the doubled diagonal coefficient required by the ordinary leaf
recurrence is `A_r+B_r`, where

```text
A_r = doubled diagonal of (z+w)N(C)+2zw B_N(H,C),
B_r = doubled diagonal of -(z-w)^2[R(C+H)-R(H)]/2.
```

This is the smallest split that survived the exact prefix census.

## Exact strict-prefix census

`probe_iso_compact_ordinary_component_signs_root.py` checked every ordinary
leaf/marked-pair cell generated from 249 forests through the configured
order, restricted to

```text
2 <= r < ceil((2 alpha-1)/3).
```

Across 49,776 cells:

```text
A_r:       0 negative, 0 zero, minimum 12,
B_r:       0 negative, 0 zero, minimum 6,
A_r+B_r:   0 negative, 0 zero, minimum 18.
```

These are exact integer calculations, but the census is finite.

## Splits that are already refuted

The nested polarization `2zw B_N(H,C)` cannot be paid separately.  In the
same strict-prefix census it has 1,215 negative cells and minimum `-976`.
Even nested polarization plus the `R` term has 27 negative cells and minimum
`-246`.  The adjacent `(z+w)N(C)` contribution is essential.

Global central Schur positivity of `R` is also false.  The exact twelve-
vertex witness in
`ISO_R_CENTRAL_UNIMODALITY_ROUTE_COUNTEREXAMPLE_ROOT_2026-08-29.md` has

```text
C_8=R_(7,7)-R_(6,8)=-3,
M_8+C_8=2033.
```

That negative cell lies above the conjecture's prefix cutoff, so it refutes
only the untruncated componentwise route.  It does not refute the coupled
leaf payment or the cutoff-aware route in (1).

The broader polarization census likewise has 4,841 negatives among 373,769
coefficients, but zero negatives in the 6,058 correctly aligned strict-
prefix coefficients.  Therefore any valid proof must retain both the cutoff
and the coupled split.

## Remaining theorem slot

It would suffice to prove, for every forest-realizable ordinary leaf state
and every strict-prefix rank,

```text
A_r >= 0,                 B_r >= 0.                 (2)
```

Equation (1) would then prove the ordinary mode of the Four-Minor Leaf
Lemma.  The isolate and marked-support collision modes must still be supplied
at the same supported ranks.  Neither (2) nor the other two modes is claimed
here.


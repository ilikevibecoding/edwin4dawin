# Audit of the same-half-plane polar-derivative step

Date: 2026-08-13

Status: the inference used in Sections 59.4, 61, and 104 of the master
route is not a valid consequence of Laguerre's theorem.  The standard
theorem requires the polar point to lie outside the circular region that
contains the polynomial zeros.  Merely placing the polar point in the same
half-plane as those zeros gives no conclusion.

For a degree-`n` polynomial `f`, write

```text
D_alpha f(z)=n f(z)+(alpha-z)f'(z).
```

Laguerre's theorem says that if a circular region `C` contains all zeros of
`f`, then a zero `Z` of `D_alpha f` and the polar point `alpha` cannot both
lie outside `C`.  Therefore all zeros of `D_alpha f` remain in `C` when
`alpha` is outside `C`; the theorem does not assert this when `alpha` is
inside `C`.

This distinction applies directly to the rotating half-plane

```text
C_psi={d: Im(exp(-i psi)d)>0}.
```

For `0<psi<pi/2` and a positive outlier `t`, the point `alpha=-t` satisfies

```text
Im(exp(-i psi)(-t))=t sin(psi)>0,
```

so it lies inside `C_psi`, not outside it.  Thus the sentences in Sections
59.4 and 104 that invoke Laguerre preservation from this sign have the
domain reversed.  The same issue invalidates the claimed automatic second
polar step following the one-polar strip lemma in Section 106.3.

An exact counterexample inside the special Meixner family shows that this is
not only a generic logical gap.  It is recorded separately in
`ONE_POLAR_STRIP_LAGUERRE_DOMAIN_AUDIT_AND_SECOND_POLAR_COUNTEREXAMPLE_2026-08-13.md`
and its replay.
There the first polar polynomial has all roots in `C_psi`, while the second
equal polar derivative has a root outside it, despite the stated forest
reserve and radius hypotheses.

Consequences for the active proof route:

1. the base half-angle theorem for `M_n` in Sections 59.1--59.3 is not
   refuted by this audit;
2. the repeated-Meixner fixed-disk theorem of Sections 55--57 is also
   independent and remains valid at its stated scope;
3. the arbitrary-outlier sector claims in Sections 59.4, 61, and 104 must
   be reopened or replaced by a special structured argument;
4. proving the universal one-polar strip lemma alone would not make the
   second polar derivative automatic.

This note is a dependency correction, not a counterexample to a forest and
not a disproof of the desired fixed-circle theorem.

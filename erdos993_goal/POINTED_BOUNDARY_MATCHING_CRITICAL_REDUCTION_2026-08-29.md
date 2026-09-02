# Pointed boundary via a matching-critical two-step row

Date: 2026-08-29

Status: **exact conditional reduction.**  The two unpointed coefficient
inequalities displayed below remain to be proved.

Let `A` be a forest, let `p` be a vertex, and suppose

```text
alpha(A-p)=alpha(A)=beta.
```

For `beta` congruent to `0` or `2` modulo `3`, put

```text
r=ceil((2 beta-1)/3).
```

The pointed boundary obligation in the weak-prefix induction is

```text
i_(r-2)(A-N[p]) <= r i_r(A).                       (1)
```

## Matching-critical deletion

Forests are bipartite, so `alpha(F)+nu(F)=|F|`.  The displayed equality of
independence numbers therefore gives

```text
nu(A-p)=nu(A)-1.
```

Thus every maximum matching of `A` saturates `p`.  Fix one and write `pq`
for its edge at `p`.  If

```text
D=A-{p,q},
```

then the matching with `pq` removed is maximum in `D`, and

```text
alpha(D)=beta-1.                                    (2)
```

Moreover `A-N[p]` is an induced subforest of `D`, while `D` is an induced
subforest of `A`.  Coefficientwise containment gives

```text
i_(r-2)(A-N[p]) <= i_(r-2)(D),
i_r(D) <= i_r(A).                                   (3)
```

Consequently (1) follows from the single unpointed two-step inequality

```text
i_(r-2)(D) <= r i_r(D).                             (4)
```

## The two exact residue targets

Write `a=alpha(D)` and `L(a)=ceil((2a-1)/3)`.  The two cases are exactly

```text
a=2 mod 3:  i_(L(a)-1)(D) <= (L(a)+1)i_(L(a)+1)(D),
a=1 mod 3:  i_(L(a)-2)(D) <= L(a)i_L(a)(D).         (5)
```

Thus the pointed vertex and its neighborhood disappear entirely.  Proving
the two all-forest row inequalities in (5) closes the pointed boundary,
which in turn closes the weak-prefix ratio by the separate leaf-boundary
reduction.

## Constant-nine subtarget for every large boundary

Both rows in (5) have

```text
r=ceil(2a/3).
```

For `r>=9`, it is enough to prove the fixed two-step inequality

```text
E_r(F):=9i_r(F)-i_(r-2)(F) >= 0,                  (6)
```

because

```text
r i_r-i_(r-2)=(r-9)i_r+E_r.
```

This fixed target has an exact leaf recurrence.  If `ell` is a leaf of `T`,
`A=T-ell`, and `C=T-{ell,p}`, then `I(T)=I(A)+xI(C)` gives

```text
E_r(T)=E_r(A)+E_(r-1)(C).                          (7)
```

Consequently an induction for (6) through `r<=ceil(2alpha/3)` has only one
boundary.  Write `alpha(A)=alpha(C)=beta`, put
`k=ceil(2beta/3)`, and let `H=A-N[p]`.  When the cutoff jumps (exactly
`beta=0,1 mod 3`), the remaining identity is

```text
E_(k+1)(T)=E_(k+1)(C)+E_k(C)+E_k(H).               (8)
```

Equations (6)--(8) are a secondary reduction, not a proof that their final
right-hand side is nonnegative.  The cases `r<9` also remain separate.

This note does not prove (5), the weak-prefix ratio, ISO, unimodality, or
Erdos Problem 993.

## Replay

Run

```powershell
python .\verify_pointed_boundary_matching_critical_reduction_root.py
```

The verifier checks the matching-number identities, coefficient containments,
cutoff arithmetic, and literal pointed instances in every atlas forest.  Its
required marker is

```text
PASS_EXACT_POINTED_BOUNDARY_MATCHING_CRITICAL_REDUCTION
```

The replay checks 6,666 cutoff cases, all 79 nonempty atlas forests, and 213
matching-critical pointed instances.  The bounded two-step premise has zero
failures there; this last fact is finite evidence only.

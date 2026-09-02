# Affine bridge: the coarse negative-window chamber does not imply the split budget

This note gives an exact full-colour-fibre counterexample to a tempting
all-order strengthening of Section 108.2.  It does **not** refute the split
bound on the genuine reflection windows.  Rather, it proves that the coarse
constraints retained in the required-window census are insufficient: an
all-order proof must use the exact Euler-sign source of the window.

## 1. The proposed chamber-only implication

For a full fibre let

\[
 C_h={P_h^3P_{h+2}\over P_{h-1}P_{h+1}^3},
 \qquad P_j={F_j\over S_j},
\]

with `F_j` and `S_j` as in Section 108.2.  The desired bound is

\[
 C_h\ge 1-{1\over hE^2}.                         \tag{1}
\]

Every audited required window obeys the coarse chamber

\[
 s:=n-2h-2\ge12,\qquad q_*:=\alpha-n-2h\ge1,
 \qquad 0\le T:=E-\alpha\le2h+11s.               \tag{2}
\]

The implication `(2) => (1)` is false, even for a literal source monomial
and outer exponents from the bottom path family.

## 2. Exact bottom/odd counterexample

Take the bottom/odd family and

\[
 (m,x,n,h,p,q)=(3,62,55,4,5,4).
\]

The specialized coefficient of `z^5w^4` in the actual reserve core is
`12`.  The outer and merged parameters are

\[
 (a,b,D,E,\alpha,T)=(64,7,62,135,108,27).
\]

Moreover

\[
 s=45,\qquad q_*=45,
 \qquad 27\le 2\cdot4+11\cdot45,
\]

so every inequality in (2) holds with room to spare.  Direct exact
coefficient extraction gives

\[
 C_4=
 {5187842305389976764782999444874782080839320505431404872781964821
  \over
  5187967344106868360981720411423979790026120335010678978565312500}.
\]

But the proposed lower bound is `72899/72900`, and

\[
 4\cdot135^2(1-C_4)=
 {3376045356073097365466096828338148043595398640400856150387333
  \over
  1921469386706247541104340893119992514824489012966918140209375}
 =1.7570123049\ldots>1.                         \tag{3}
\]

Thus (1) fails exactly.

## 3. Why this is not a required-window counterexample

At the same bottom/odd path point and order, reconstruct the Euler layers

\[
 e_j=[z^Dw^D](z+w)^j\{XQ+(2D-E)XR\}.
\]

Their negative indices are exactly

\[
 \{j:e_j<0\}=\{0,1,2,3\}.
\]

Hence the last negative layer is `t_-=3`.  The reflection construction uses

\[
 h=t_- -\ell-1,
 \qquad 1\le\ell<t_--1,
\]

so the only required value here is `h=1`.  The failure (3) is at `h=4` and
is therefore outside the exact reflection source.

This separates the missing invariant cleanly:

\[
 \boxed{h\le t_- -2\quad\hbox{with }t_-=
 \max\{j:e_j<0\}.}                                \tag{4}
\]

The numerical chamber (2) does not encode (4), and cannot replace it.
Consequently a proof by coefficient positivity over only `(s,q_*,T)` is
impossible.  A valid all-order split proof must retain the Euler-sign
relation (or derive a stronger algebraic consequence of it).  The exact
required-window inequality remains open.

## 4. Replay

Run:

```text
python verify_affine_bridge_split_chamber_counterexample.py
```

The replay reconstructs the actual core weight, all four fibre and merged
layers, the rational failure, and the Euler sign word.  This is an exact
counterexample to the chamber-only implication, not a finite-scan claim.

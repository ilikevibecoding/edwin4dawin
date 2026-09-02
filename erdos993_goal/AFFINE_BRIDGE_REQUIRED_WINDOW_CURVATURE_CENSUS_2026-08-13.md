# Affine bridge: corrected required-window atom and fibre census

This note corrects the scope of the previously quoted `82` unsafe
Laguerre--Jensen atoms.  It is an exact finite census and a sharper analytic
target, not an all-order proof of the affine bridge.

## 1. The required windows are substantially farther left

The offset-two reflection certificate only uses the four-layer windows

\[
 h-1,h,h+1,h+2,\qquad h=t-\ell-1,\quad 1\leq\ell<t-1,
\]

where `t` is the last negative Euler layer.  Across the 20 hard records this
gives exactly `953` windows.  In all of them

\[
 12\le s:=n-2h-2\le47.                              \tag{1}
\]

For every active two-colour atom, write

\[
 \gamma=\alpha+\beta=n+2h+q,
 \qquad T=A+B-\alpha-\beta .                        \tag{2}
\]

The same exact census gives `q>=1` and

\[
 T\le2h+11s.                                        \tag{3}
\]

Thus the actual reflection chamber has much more left-half room than the
generic diagnostic at `s=0`.

## 2. Exact atom and full-colour-fibre result

For one atom put

\[
 a_j={n\choose j}\sum_u{j\choose u}
 {A\choose\alpha-u}{B\choose\beta-j+u}.
\]

The adjacent-curvature quotient is

\[
 Q_h={K_h\over K_{h+1}}
 ={a_h^3a_{h+2}\over a_{h-1}a_{h+1}^3}.            \tag{4}
\]

The replay reconstructs every active atom in every required window from the
four exact source cores.  All `4,062,983` incidences satisfy `Q_h>=1`.

It then sums, for each fixed source monomial `(p,q)`, all branches with their
actual binomial weights `binom(b,v)`.  All `97,608` resulting full
`v`-fibres also satisfy (4).  The least fibre quotients in the four
package/parity families are retained exactly in the JSON report; their
decimal values are approximately

\[
 1.12041639,quad1.06325289,quad1.00738496,quad1.00619414.
\]

This shows that the two-colour split has no local failure in the reflection
scope and that summing a complete colour fibre preserves the inequality on
the audited records.

## 3. Why the old `82` failures do not contradict this census

The old diagnostic is the group/even point

\[
 (c,m,x,n,h)=(30,3,0,32,15).
\]

The exact reconstruction again finds `528` active atoms and `82` unsafe
ones.  But the order `n=32` has **no negative Euler layers at all**.  Hence
`h=15` is not one of the 953 left windows used by reflection.  The diagnostic
remains a valid counterexample to an unrestricted atomwise theorem; it is
not an obstruction in the required chamber (1)--(3).

## 4. Splitting can reduce, but not exhaust, the merged slack

A stronger shortcut is false.  Merging the colours of an atom gives

\[
 m_j={n\choose j}2^j{A+B\choose\alpha+\beta-j}.
\]

At the genuine required bottom/odd atom

\[
 (n,h,A,B,\alpha,\beta)=(42,1,53,54,41,41),
\]

the split and merged rows both satisfy (4), but

\[
 {Q_h(a)\over Q_h(m)}
 ={58117856319\over58140880000}<1.                 \tag{5}
\]

Therefore the all-order split lemma must bound the negative hypergeometric
third-difference correction by the positive merged-atom reserve.  It cannot
claim that splitting monotonically increases curvature slack.

## 5. Remaining all-order statement

The corrected local target is now precise: prove (4) for all two-colour
atoms satisfying the path chamber (1)--(3) and the four source support
conditions, preferably first after the full binomial `v`-sum.  After that,
the 744 no-birth windows still require the exact mixture covariance budget;
positive summation is not automatic.

Run:

```text
python verify_affine_bridge_required_window_curvature.py
```

The JSON output explicitly labels this as finite evidence and records exact
integer numerators and denominators for every reported extremum.

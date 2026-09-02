# Affine bridge: Euler-coupled direct joint curvature

This note replaces the separate full-fibre split and covariance estimates by
one direct inequality for the complete weighted reserve row.  It identifies a
quantitative Euler-coupled candidate that has no failure on the exact required
windows, and it gives a theorem-level abstract counterexample proving that the
Euler sign alone cannot imply even the weaker direct inequality.

The direct reduction is all-order algebra.  The path-source inequalities are
still supported only by an exact finite census.

## 1. Bypass both split loss and covariance

Put

\[
 a_j={n\choose j}\rho_j,
 \qquad
 K_j={a_j^2\over a_{j-1}a_{j+1}}.
\]

The reflected reserve comparison uses four consecutive layers and is exactly

\[
 \boxed{
 Q_h:={K_h\over K_{h+1}}
 ={a_h^3a_{h+2}\over a_{h-1}a_{h+1}^3}\ge1.}       \tag{1}
\]

Equation (1) is already the quotient of the **complete** positive reserve
mixture.  If one first decomposes the row into complete colour fibres, it is
the `Q_mix` of the fibre covariance lemma.  Consequently proving (1) directly
needs neither

\[
 C_h\ge1-{1\over hE^2}
\]

for every fibre nor a separate upper bound on the positive covariance created
when the fibres are mixed.  Those were sufficient devices for (1), not parts
of the statement that the reflection argument actually needs.

## 2. The actual Euler invariant selects the window

Write

\[
 e_j=q_j+j\rho_j,
 \qquad g_j={e_j\over\rho_j}.
\]

If `t` is the last negative Euler layer, the outward reflection comparisons
use

\[
 h=t-\ell-1,\qquad1\le\ell<t-1.
\]

Thus every required left window satisfies

\[
 \boxed{e_{h+2}<0.}                                \tag{2}
\]

Conversely, on the exact records the negative layers form an initial interval,
so the positive four-layer windows satisfying (2) are precisely the required
ones.

This explains the coarse-chamber no-go exactly.  Its literal bottom/odd split
failure has `h=4` but terminal negative layer `t=3`; it would require
`e_6<0`, and hence is outside (2).

There is a clean direct stratification of all positive four-layer windows in
the 20 hard records:

* `953` have `e_(h+2)<0`; none fails (1), and the least quotient is
  `1.0062325511287966...`;
* `17,017` have `e_(h+2)>=0`; `9,077` fail (1), and the least quotient is
  `0.7500225468900741...`.

Thus (2) separates the safe and unsafe regimes perfectly in this exact finite
census.  It is not merely a restatement of the earlier numerical chamber.

## 3. A stronger source-coupled candidate

The exact data support the quantitative strengthening

\[
 \boxed{
 Q_h\ge1-{g_{h+2}\over hn}
 =1+{-e_{h+2}\over hn\rho_{h+2}}.}                \tag{3}
\]

It is stronger than (1) on the Euler-negative range.  The minimum exact ratio
of the two positive increments,

\[
 {hn(Q_h-1)\over-g_{h+2}},                         \tag{4}
\]

is `1.0863701676386883...`; all `953` instances pass.

Let `\bar e_j={n\choose j}e_j`.  Clearing only positive denominators rewrites
(3) as the five-factor source inequality

\[
\begin{split}
 \Gamma_h={}&hn\,a_{h+2}
   \{a_h^3a_{h+2}-a_{h-1}a_{h+1}^3\}\\
 &+\bar e_{h+2}a_{h-1}a_{h+1}^3\ge0.             \tag{5}
\end{split}
\]

Formula (5) is the sharpest concrete next target exposed by this audit.  It
keeps the actual relation

\[
 e_{h+2}=[z^Dw^D](z+w)^{h+2}X\{Q+(h+2)R\}
\]

inside the same inequality as the reserve curvature.  A proof can therefore
symmetrize (5) directly over the exact `Q,R` path sources, instead of proving
a hypergeometric split third-difference and a degree covariance envelope in
isolation.

The sign (2) by itself gives only an **upper** bound

\[
 \rho_{h+2}<-q_{h+2}/(h+2),
\]

whereas (1) requires a lower bound on the fourth reserve layer relative to its
three predecessors.  This direction mismatch is why retaining the precise
`Q,R` source coupling in (5) is essential.

## 4. Euler sign alone is provably insufficient

There is an exact abstract counterexample even after retaining the other
elementary structural properties.  Let `n=18`, `h=5`, `t=7`, and let `rho_j`
be the coefficient row of

\[
 \prod_{r\in\{1,1,3,3,5,10,20,20,
             \underbrace{1/1000,\ldots,1/1000}_{10}\}}(1+ry).
\]

This is a strictly positive PF-infinity row of degree 18.  Set

\[
 g_j=-1\quad(j\le7),\qquad g_j=1\quad(j\ge8),
 \qquad e_j=g_j\rho_j,
 \qquad q_j=e_j-j\rho_j.
\]

Then:

* the Euler-negative indices are exactly `0,...,7`;
* `e_(h+2)=e_7<0`;
* the actual endpoint slack holds with equality, `n=2t+4`;
* `g=e/rho` is nondecreasing, so the determinant orientation holds;
* `g` is discretely convex throughout the negative interior.

Nevertheless the direct quotient is exactly

\[
 Q_5=
 {95984734087075414611388806380266166250795001030518005281519649789726567850946074573843456
 \over
 102641065644841727641101825055098163484046583542939901062241398083645445378910259320101875}
 =0.9351494305330137\ldots<1.                       \tag{6}
\]

Therefore Euler negativity, endpoint slack, PF-infinity of the reserve,
single crossing/determinant orientation, and negative-side convexity do not
imply (1) abstractly.  Any all-order proof of (1) or (3) must use the literal
path source relation between `Q` and `R`.

## 5. Exact status and replay

Run:

```text
python verify_affine_bridge_euler_coupled_joint_curvature.py
```

The direct identity (1), the reduction to the Euler-selected condition (2),
the cleared equivalence (5), and the abstract no-go (6) are exact.  The facts
that all `953` required windows satisfy (1) and the stronger candidate (3) are
exact finite evidence, not an all-order theorem.  No genuine required-window
counterexample was found.

This note does **not** close the affine bridge.  It replaces three separate
path-source obligations—fibre split, degree covariance, and their final
budget—by the single source-coupled all-order target (5), and proves that
discarding the `Q,R` coupling cannot succeed.

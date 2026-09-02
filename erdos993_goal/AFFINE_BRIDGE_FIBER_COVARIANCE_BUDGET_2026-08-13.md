# Affine bridge: full-colour-fibre covariance budget

This note gives an all-order mixture lemma tailored to the corrected
full-`v`-fibre decomposition and an exact finite audit of its hypotheses on
all 953 required windows.

## 1. A sharp sufficient mixture lemma

Let `a_j(theta)>0` be positive component rows with fixed positive weights.
Normalize the component law at layer `h-1` and put

\[
 x={a_h\over a_{h-1}},\qquad
 y={a_{h+1}\over a_h},\qquad
 z={a_{h+2}\over a_{h+1}}.
\]

The exact mixture quotient is

\[
 Q_{\rm mix}={K_h\over K_{h+1}}
 ={(\mathbb Ex)^3\mathbb E(xyz)\over(\mathbb E(xy))^3}.       \tag{1}
\]

For one component define

\[
 Q_\theta={xz\over y^2}.
\]

If `Q_theta>=lambda` for every component, then

\[
 xyz=Q_\theta y^3\ge\lambda y^3.
\]

Jensen's inequality for the cube now gives the all-order bound

\[
 \boxed{
 Q_{\rm mix}\ge
 \lambda\left({\mathbb Ex\,\mathbb Ey\over\mathbb E(xy)}\right)^3.} \tag{2}
\]

Consequently the positive covariance is completely paid whenever

\[
 \lambda\ge
 \left({\mathbb E(xy)\over\mathbb Ex\,\mathbb Ey}\right)^3.          \tag{3}
\]

This is sharper and simpler than expanding the cubic covariance budget:
the weakest component reserve pays exactly the cube of the multiplicative
covariance inflation.

## 2. Why complete colour fibres are the useful components

For each source monomial `(p,q)`, sum all `T`-branches `v` with their exact
weights `binom(b,v)`.  The corrected required-window census proves, on the
hard records, that every one of the `97,608` such fibres has `Q_theta>=1`.
Using fibres rather than individual colour branches also reduces the
covariance inflation, while retaining only 66 group or at most 192 bottom
source terms before zero specialization and symmetry.

## 3. Complete fibres absorb every support birth

At individual-branch resolution, 209 of the 953 required windows contain a
branch born after layer `h-1`.  However, births are internal to their complete
binomial colour fibre: another branch of the same fixed source monomial is
already active.  The exact replay finds

\[
 \boxed{0\text{ complete-}v\text{-fibre births in all 953 windows}.} \tag{4}
\]

Thus all four aggregate fibre layers are positive.  The ordinary mixture law
of Section 1 applies to every required window; the explicit inflow terms are
not discarded but absorbed inside the fibre quotient `Q_theta`.

## 4. Exact all-window audit

The independent replay reconstructs all fibres and evaluates (3) using
exact rational arithmetic.  All 953 required windows have strictly positive
`Cov(x,y)`, so the easy opposite-covariance shortcut never applies.
Nevertheless all 953 satisfy (3).  The smallest exact quotient of the two
sides is approximately

\[
 1.0039956063,
\]

at the bottom/odd point

\[
 (m,x,n,h)=(30,60,50,11).
\]

There the weakest fibre quotient is about `1.0061941426`, while the
multiplicative covariance inflation is about `1.0007293968`; its cube still
fits below the fibre reserve.

Thus the no-birth problem has been separated into two path-specific
all-order inequalities with matching scale:

1. a lower bound for every complete fibre quotient `lambda`;
2. an upper bound for `E(xy)/(E x E y)` strong enough for (3).

The algebraic implication from these two bounds to the full mixture is now
proved by (2), with no lost constants.

## 5. Replay

Run:

```text
python verify_affine_bridge_fiber_covariance_budget.py
```

The all-order content is the mixture lemma (2).  The path-family hypotheses
remain finite exact evidence until their parameter-uniform bounds are proved.

# Affine bridge shifted-predecessor and planar-layer reduction

The affine bridge is not yet proved for every order.  This note records one
new all-parameter base theorem, a broad exact counterexample search, and the
smallest planar-network statement presently surviving every test.  It also
gives exact counterexamples to four tempting stronger cones.

## 1. Spatial recurrence and the two predecessors

Use the reciprocal notation of the single-Newton-sequence reduction:

\[
 \mathcal F_r(i,j)=[z^iw^j]A^aS^bW^r(B^\vee+rP^\vee),
 \qquad
 \mathcal R_r(i,j)=[z^iw^j]A^aS^bW^rP^\vee.
\]

Here `P` is coefficientwise positive.  At the fixed reciprocal target `N`,

\[
 \mathcal F_{r+1}(N,N)
 =2\mathcal F_r(N-1,N)+\mathcal F_r(N-1,N-1)
  +\mathcal R_{r+1}(N,N).                         \tag{1}
\]

Put

\[
 U_r=\mathcal F_r(N-1,N),\qquad
 Z_r=\mathcal F_r(N-1,N-1).                       \tag{2}
\]

Thus `U_r,Z_r>=0` is a sufficient strengthening of the exact boundary
triple.  It is not known uniformly.

In original coordinates let `L=m+5`.  Reciprocity identifies (2) with

\[
 U_r=[z^{L+r+1}w^{L+r}]A^aT^bV^r(B+rP),           \tag{3}
\]

\[
 Z_r=[z^{L+r+1}w^{L+r+1}]A^aT^bV^r(B+rP).         \tag{4}
\]

## 2. All-parameter theorem at order zero

The companion theorem
`AFFINE_BRIDGE_R0_SHIFTED_PREDECESSOR_THEOREM_2026-08-10.md` proves

\[
 U_0>0,\qquad Z_0>0                                \tag{5}
\]

in both packages, both parities, and on the full domains.  The proof expands
the fixed targets `(L+1,L)` and `(L+1,L+1)`, puts `k=m+delta` in the `T^b`
sum, divides by the appropriate positive central binomial, and shifts
`c=C+1,m=M+3`.  All eight resulting rational functions have positive
denominators and coefficientwise strictly positive numerators.  The exact
record stores the degrees, term counts, smallest coefficients, gcds, and
canonical hashes.

Consequently the complete boundary triple at `r=0` is positive.  This also
reproves the order-one affine coefficient from (1).

## 3. Exact finite counterexample search

`probe_affine_bridge_shifted_predecessors.py` evaluates (3)--(4) by exact
integer polynomial convolution.  It covers:

* both parities;
* 340 point/parity cases;
* 5,180 exact recurrence checks;
* the group lattice `1<=c<=4, 3<=m<=8`,
  `x in {0,1,2,4,2m}`, through `r=12`;
* the bottom lattice `3<=m<=10` with the same `x` set, through `r=12`;
* five hard points in each package, in both parities, through `r=50`.

There is no negative `U_r` or `Z_r`, and no negative boundary triple, in
this audit.  This is finite evidence, not a proof.

The signed base without its reserve does fail.  In the even group case

\[
 (c,m,x,r)=(1,3,4,7),
\]

the base-only diagonal predecessor is

\[
 Z_7^{\rm base}=-7,741,670,279,776,
\]

while its reserve unit is `177,406,601,640,576` and hence

\[
 Z_7=1,234,104,541,204,256>0.                      \tag{6}
\]

The audit contains 139 point/parity cases with a negative base-only
predecessor.  Any proof must retain the `rP` reserve.

## 4. Exact planar-path layer decomposition

Put `s=z+w` and homogenize only the outer copies of `V=1+s`:

\[
 V^r=(1+s)^r=\sum_{j=0}^r {r\choose j}s^{r-j}.      \tag{7}
\]

Let

\[
 H_r=A^aT^b(B+rP).
\]

Define the unweighted layers

\[
 \begin{aligned}
 U_{r,j}
 &=\sum_{k=0}^{r-j}{r-j\choose k}
 H_r(L+j+1+k,L+r-k),\\
 Z_{r,j}
 &=\sum_{k=0}^{r-j}{r-j\choose k}
 H_r(L+j+1+k,L+r+1-k).
 \end{aligned}                                      \tag{8}
\]

Equivalently,

\[
 U_{r,j}=[z^{L+r+1}w^{L+r}]s^{r-j}H_r,
 \qquad
 Z_{r,j}=[z^{L+r+1}w^{L+r+1}]s^{r-j}H_r.            \tag{9}
\]

The binomial coefficient in (8) counts the planar paths using `z` and `w`
steps after the `j` constant steps have been selected.  Equations (7)--(9)
give the exact assembly

\[
 \boxed{
 U_r=\sum_{j=0}^r{r\choose j}U_{r,j},\qquad
 Z_r=\sum_{j=0}^r{r\choose j}Z_{r,j}.}              \tag{10}
\]

No approximation or limiting argument occurs here.

## 5. The surviving all-order layer lemma

The sharpest structured sufficient statement currently surviving is:

> **Affine boundary-layer lemma.**  In both packages and parities, for all
> allowed parameters, all `r>=0`, and all `0<=j<=r`,
> \[
> U_{r,j}\ge0,\qquad Z_{r,j}\ge0.                  \tag{11}
> \]

By (10), (11) gives `U_r,Z_r>=0`; by (1), it proves every affine bridge
coefficient.  In the variables `n=r-j`, the same lemma is the completely
explicit two-parameter binomial-row inequality

\[
 \sum_{k=0}^{n}{n\choose k}
 [z^{L+j+1+k}w^{L+j+n+\eta-k}]
 A^aT^b\{B+(j+n)P\}\ge0,                            \tag{12}
\]

for `n,j>=0` and `eta=0,1`.  Formula (12) is the exact remaining
planar-network/injection target.

The finite replay checks (11) on 16 hard point/parity cases through order 50:
42,432 exact individual layer checks, with zero negative layers.  Every
weighted prefix and suffix was also nonnegative.  Again, that is evidence,
not an all-order proof.

This layer state does not close by a two-state Pascal recurrence.  Increasing
`r` shifts the target and exposes a more skew coefficient in addition to the
old adjacent and diagonal ones.  Therefore a proof of (11) must use a direct
row injection, a larger total-positive state, or a kernel-specific
summation-by-parts identity; (5) alone cannot be iterated.

## 6. A cleaner full homogenization is false

There is a tempting reaggregation.  Write

\[
 B=VQ+P,qquad P=sR.
\]

Then

\[
 V^r(B+rP)=V^{r+1}Q+(r+1)V^rP.                     \tag{13}
\]

Replacing `V` by `t+s`, the coefficient of `t^j` in (13) is

\[
 {r+1\choose j}s^{r+1-j}\{Q+(r+1-j)R\}.            \tag{14}
\]

Although (14) depends on the single homogeneous order `r+1-j`, its
coefficientwise layer-positivity claim is false.  At the smallest even group
point `(c,m,x)=(1,3,0)`, the terminal `h=0` layer is already negative at
`r=3`:

\[
 U:\ -13,328,286,qquad Z:\ -63,393,108.            \tag{15}
\]

On the 16-case hard replay, 12 cases have a negative layer.  Even the
corrected proposal “all reserve-bearing layers are positive and `h=1` pays
the `h=0` debt” fails in eight cases.  Thus (14) is an exact useful identity,
but not the desired proof cone.  The successful finite pattern is the outer
layering (7)--(12), which keeps the inner `VQ+P` package intact.

## 7. Further exact obstructions

The smallest even group affine kernel has maximum `z` degree 24 and top row

\[
 [z^{24}]B=0,qquad [z^{24}w]B=-2.
\]

The top-`z` term of `A^uT^v` is
`z^(u+2v)(1+w)^u`.  Hence, for every `u,v>=0`,

\[
 \boxed{[z^{24+u+2v}w]A^uT^vB=-2.}                 \tag{16}
\]

So no fixed positive `A,T` smoothing can make the whole source
coefficientwise nonnegative.

After the actual minimal outer factor `A^2T^2`, the shift box from the base
target `(8,8)` already contains the six negative axial entries

\[
 (0,8),(8,0):-12,301,144,
\]

\[
 (0,9),(9,0):-30,645,796,
\]

\[
 (0,10),(10,0):-764,681.                            \tag{17}
\]

Target truncation and path weights are therefore essential.

Finally, the elementary symmetric basis `s=z+w,q=zw` is not a positive
source cone.  The total-degree-17 row of the same `A^2T^2B` has coefficients

\[
 (0,4870,-40854,127274,-178855,108868,-21040,0,0)   \tag{18}
\]

in the basis `s^(17-2q)q^q`.  Its adjacent-central binomial weights are

\[
 (24310,6435,1716,462,126,35,10,3,1),              \tag{19}
\]

and the weighted sum is nevertheless the positive value `1,097,824`.
Thus an injection must exploit cancellation inside the target functional;
ordinary coefficientwise positivity in the symmetric generators is false.

## 8. Replays and exact remaining gap

Run:

```text
python prove_affine_bridge_r0_shifted_predecessors.py
python probe_affine_bridge_shifted_predecessors.py
python probe_affine_bridge_boundary_layer_cone.py
python probe_affine_bridge_reaggregated_boundary_layers.py
python verify_affine_bridge_boundary_cone_obstructions.py
```

The records are:

* `affine_bridge_r0_shifted_predecessors_exact_20260810.json`;
* `affine_bridge_shifted_predecessor_probe_20260810.json`;
* `affine_bridge_boundary_layer_cone_probe_20260810.json`;
* `affine_bridge_reaggregated_boundary_layer_probe_20260810.json`;
* `affine_bridge_boundary_cone_obstructions_exact_20260810.json`.

The exact minimal condition remains the boundary triple (1).  The smallest
currently viable structured lemma is (11), equivalently (12).  No finite
counterexample to it is known, but no all-order proof is claimed here.

# Affine bridge: reflection-pair reduction

This note sharpens the Euler-layer weighted-prefix target to a local,
disjoint pairing statement.  It is a rigorous reduction plus exact finite
evidence, not yet an all-parameter proof of the pairing inequality.

## 1. Euler layers

For either package and parity, put `s=z+w`, `V=1+s`, `X=A^aT^b`, and

\[
 q_h=[z^Dw^D]s^hXQ,\qquad
 \rho_h=[z^Dw^D]s^hXR,\qquad e_h=q_h+h\rho_h,
\]

where `D=m+k+5` and `n=k+1`.  The exact Euler-transfer identity is

\[
 F_k=\sum_{h=0}^n {n\choose h}e_h.                 \tag{1}
\]

## 2. A sufficient reflection certificate

Assume that the negative entries of `e` are the initial interval
`0,1,...,t`.  Reflect this interval two sites beyond its right endpoint:

\[
 \iota_t(h)=2t+2-h\qquad(0\le h\le t).             \tag{2}
\]

Suppose also that

\[
 2t+2\le n                                             \tag{3}
\]

and, for every `0<=h<=t`,

\[
 {n\choose h}e_h+{n\choose {2t+2-h}}e_{2t+2-h}
 \ge0.                                                \tag{4}
\]

Then `F_k>=0`.  Indeed, the images in (2) are distinct and belong to the
positive tail `t+2,...,2t+2`; summing (4) pays every negative term in (1).
The unused index `t+1`, all indices above `2t+2`, and any zero layers are
nonnegative.  Thus the whole sum (1) is nonnegative.

The offset two is sharp for this finite route.  Offset one,
`2t+1-h`, fails on 63 of 1,867 exact hard-data pairs.  Offset two has no
failure in the audits below.

## 3. Exact audits

The independent replay `verify_affine_bridge_reflection_pairs.py` reads the
20 hard point/parity records stored in
`affine_bridge_euler_transfer_blocks_probe_20260812.json`, through `k=50`.
there are 1,867 negative layers.  Every sequence has negative-to-positive
single crossing, every reflection image satisfies (3), and every exact
integer inequality (4) passes.  The smallest observed payment-to-debt ratio
in an individual pair is approximately `3.4372542013`.

The broader exact lattice replay
`probe_affine_bridge_weighted_ratio_lattice.py` covers 208 point/parity
records and all orders `0<=k<=20`:

* group: `1<=c<=3`, `3<=m<=8`, `x in {0,1,2,2m}`;
* bottom: `3<=m<=10`, `x in {0,1,2,2m}`;
* both parities.

It checks 1,660 exact reflection pairs and finds no failure.  It also
checks 213 exact outward-ratio comparisons and their factor split, and
rechecks single crossing, raw Newton log concavity, the oriented `e/rho`
determinant, and `F_k>=2R_k^*`.

For `g_h=e_h/rho_h` and `\bar\rho_h={n\choose h}\rho_h`, the outward
payment-ratio step factors exactly as

\[
 {\bar\rho_{j+1}\bar\rho_h\over
   \bar\rho_j\bar\rho_{h-1}}
 {g_{j+1}\over g_j}{-g_h\over-g_{h-1}},             \tag{5}
\]

where `h=t-ell`, `j=t+2+ell`, and `1<=ell<t`.  All 1,225 hard-record
steps and all 213 lattice steps satisfy the sharper sufficient split

\[
 {\bar\rho_{j+1}\bar\rho_h\over
   \bar\rho_j\bar\rho_{h-1}}\ge2,
 \qquad
 {g_{j+1}\over g_j}{-g_h\over-g_{h-1}}\ge {1\over2}. \tag{6}
\]

Thus the complete reflection lemma reduces further to the first two pair
payments plus the two local ratio bounds in (6).  This is the exact
two-step Turan/reserve target suggested by the offset-two phenomenon.

More explicitly, define the payment/debt ratios

\[
 P_\ell=
 {{n\choose t+2+\ell}e_{t+2+\ell}\over
  -{n\choose t-\ell}e_{t-\ell}}
 \qquad(0\le\ell\le t).                              \tag{7}
\]

It is enough to prove `P_0>=1`, `P_1>=1` (when `t>=1`), and
`P_(ell+1)>=P_ell` for `1<=ell<t`.  Cross multiplication makes the last
condition the exact two-sided Turan inequality

\[
 {n\choose j+1}{n\choose h}e_{j+1}(-e_h)
 \ge
 {n\choose j}{n\choose h-1}e_j(-e_{h-1}),           \tag{8}
\]

with `h=t-ell` and `j=t+2+ell`.  Formula (5) is precisely the factorization
of the ratio of the two sides of (8).

The determinant condition

\[
 e_{h+1}\rho_h-e_h\rho_{h+1}\ge0                   \tag{9}
\]

whenever the adjacent entries are not both positive already implies the
single-crossing assertion (where the reserve is positive): `e/rho` cannot
cross from positive back to negative.  Thus the remaining path-specific
work can target (9), the two base payments, and (8), rather than treating
single crossing as an unrelated global conjecture.  Raw Newton log
concavity plus (9) alone is not sufficient abstractly; for example
`rho_h=1`, `e=(-100,-1,1,1,1)` has both properties but fails the offset-two
pair at `n=4,t=1,h=0`.  A genuine two-sided estimate such as (8) is needed.

The second factor in (6) has a sharper local explanation.  Exact data have

\[
 g_{h+1}-2g_h+g_{h-1}\ge0\qquad(1\le h<t).          \tag{10}
\]

Because all three entries in (10) are negative, it follows that
`-g_h>=(-g_(h-1))/2`.  On the positive reflected side, (9) gives
`g_(j+1)/g_j>=1`.  Their product is the `1/2` bound in (6).  The replay
checks 1,225 exact negative-side convexity inequalities.  Since
`g_h=q_h/rho_h+h`, the linear term cancels in (10); this is exactly a
TP3-type convexity assertion for the coefficient ratio `q_h/rho_h`.

Equivalently, put

\[
 \Delta_{h-1}=e_h\rho_{h-1}-e_{h-1}\rho_h
 =\rho_{h-1}\rho_h(g_h-g_{h-1}).                    \tag{10a}
\]

On the exact range needed by an outward reflected pair, namely
`1<=h<t`, monotonicity of `g` and (10) give the sharp local sandwich

\[
 0\le\Delta_{h-1}<{-e_{h-1}\rho_h\over2}.           \tag{10b}
\]

Indeed, `g_(h+1)<0` and (10) imply
`2g_h<=g_(h-1)+g_(h+1)<g_(h-1)`, which is exactly the strict upper
bound after multiplication by `rho_(h-1)rho_h`.  The independent replay
checks 1,225 instances of (10b).  The endpoint extension `h=t` is false:
it fails in 297 of the 300 hard sequences having `t>=1`.  Thus (10b) must
never be stated through the final negative layer; fortunately no outward
ratio uses that endpoint.

There is an exact factored three-copy form of this TP3 assertion.  Put

\[
 H_i=s_i^2(s_j+s_k)-2s_i(s_j^2+s_k^2)+s_js_k(s_j+s_k),
 \qquad\{i,j,k\}=\{1,2,3\}.
\]

Then `H_1+H_2+H_3=0` and

\[
 H_i-H_j=3(s_i-s_j)(s_is_j-s_k^2).                 \tag{K1}
\]

Symmetrizing which copy carries `Q` shows that the numerator of (10) is
`1/6` of the three-copy diagonal extraction of

\[
 \sum_{i<j}(Q_iR_j-Q_jR_i)R_k
 (s_i-s_j)(s_is_j-s_k^2)\prod_{\ell=1}^3s_\ell^{h-1}. \tag{K2}
\]

Thus negative-side convexity is reduced exactly to a pairwise TP2
determinant against a factored Vandermonde-Schur kernel.

The same convexity also pays the `g` part of the two central pairs.  If the
forward differences of `g` are nonnegative and nondecreasing through the
crossing, then

\[
 g_{t+2}\ge-g_t,\qquad g_{t+3}\ge-g_{t-1}.        \tag{K3}
\]

Consequently `P_0,P_1>=1` reduce on the reserve side to

\[
 \bar\rho_{t+2}\ge\bar\rho_t,qquad
 \bar\rho_{t+3}\ge\bar\rho_{t-1}.                 \tag{K4}
\]

Both factors in both central pairs pass every hard replay separately.  The
weighted reserve is increasing at `t-1,t,t+1`; it need not remain increasing
from `t+2` to `t+3`, so the second inequality in (K4) is genuinely a
four-step comparison.

The exact bottom counterexample ray `(m,x)=(120,240)` was independently
replayed through `k=100` in both parities after adding the same in-loop
pair assertions.  All 1,705 reflection pairs pass (859 even, 846 odd).
Thus the offset-two route survives precisely the large regime that refutes
termwise planar-layer positivity.

The data satisfy the stronger endpoint slack

\[
 n\ge2t+4.                                           \tag{K5}
\]

It holds in all 1,011 negative sequences of the 208-record lattice (minimum
slack `n-2t-2=2`), in every hard record, and on the large ray (minimum slack
41).  Under initial single crossing, (K5) is equivalent to the single
midpoint-layer assertion

\[
 e_{\lfloor n/2\rfloor-1}\ge0.                     \tag{K6}
\]

Indeed (K6) gives `t<=floor(n/2)-2`, which is (K5) after parity rounding.
This strengthening is path-specific, not a formal consequence of the
reflection conditions.  For instance at `n=8`, `rho_h=1` and
`e=(-8,-4,-2,-1,100,100,100,100,100)` have single crossing, negative-side
convexity, determinant orientation, and positive offset-two reflected
pairs, but `t=3` and only `n=2t+2`.

There is also a spatial interpretation of (K6).  The layer
`e_h(D)=[z^Dw^D]s^hX(Q+hR)` is the zero-constant terminal homogeneous layer
of bridge order `h-1`, evaluated northeast of that smaller bridge's central
target by `k-h+1`.  At `h=floor((k+1)/2)-1`, this shift is exactly `h+2`
or `h+3`, according to parity.  Thus (K5) reduces to one explicit shifted
terminal-layer theorem rather than a global estimate for the unknown `t`.

## 4. Positive hypergeometric form of the reserve

Write `R=sum_(p,q) r_(p,q) z^p w^q`, where `r_(p,q)>=0`.  Expanding
`T^b` by choosing `v` copies of `z(1+z)` and expanding `s^h` gives

\[
\begin{aligned}
 \rho_h={}&\sum_{p,q}r_{pq}\sum_{v=0}^b\sum_{u=0}^h
 {b\choose v}{h\choose u}\\
 &\quad {a+v\choose D-p-v-u}
 {a+b-v\choose D-q-b+v-h+u}.                       \tag{11}
\end{aligned}
\]

After multiplying by `{n\choose h}`, use
`{n\choose h}{h\choose u}=n!/(u!(h-u)!(n-h)!)`.
Thus each `(p,q,v)` atom of
`bar(rho)_h={n\choose h}rho_h` is the `y^h z^alpha w^beta`
coefficient of

\[
 (1+yz+yw)^n(1+z)^{a+v}(1+w)^{a+b-v},             \tag{12}
\]

up to the positive factor `r_(p,q){b\choose v}`, with
`alpha=D-p-v` and `beta=D-q-b+v`.  This is the exact active-weight/Hahn
representation for attacking the reserve factor in (6).

For `R_h=bar(rho)_h/bar(rho)_(h-1)`, the reserve factor at reflected
indices is

\[
 S_\ell=R_{t+3+\ell}R_{t-\ell}
 \quad(1\le\ell<t).                                \tag{13}
\]

All 272 hard sequences with `t>=2` have `S_ell` nondecreasing.  Hence the
observed reserve bound reduces to the central inequality `S_1>=2` and the
paired curvature inequalities

\[
 {R_{t-\ell-1}\over R_{t-\ell}}
 \ge
 {R_{t+3+\ell}\over R_{t+4+\ell}}.                \tag{14}
\]

Here (14) is needed for `1<=ell<t-1`.  This chains
`S_1<=S_2<=...<=S_(t-1)`; the final individual outward factor is
`S_(t-1)`, so no undefined `R_0` or `K_0` is introduced.  The hard replay
contains 953 such genuine curvature comparisons.  Its larger count 1,225
for reserve factors includes the 272 initial `S_1` checks as well.

Ordinary one-sided log concavity of `bar(rho)` does not imply (14).  Its
Newton quotients are U-shaped on every hard sequence, and their minimum can
lie slightly inside or beyond the reflected interval.  Formula (12), not
bare log concavity, must supply the two-sided comparison.

There is an exact universal/path-specific split in (14).  Put

\[
 r_h={\rho_h\over\rho_{h-1}},\quad
 \kappa_h={r_h\over r_{h+1}},\quad
 B_h={(h+1)(n-h+1)\over h(n-h)}.
\]

Then `K_h=B_h kappa_h`.  For `i=t-ell-1`, `j=t+ell+3`, direct
factorization gives

\[
 B_i-B_j=
 {-2(\ell+2)(n+1)(-n+2t+2)\over
 (t-\ell-1)(t+\ell+3)(t-\ell-n-1)(t+\ell-n+3)}\ge0. \tag{14a}
\]

Thus the pure binomial curvature always points in the required direction.
The exact remaining raw-reserve lemma is the quantitative bound

\[
 {\kappa_i\over\kappa_j}\ge {B_j\over B_i}.         \tag{14b}
\]

One cannot strengthen (14b) to `kappa_i>=kappa_j`: 449 of the 953 hard
reflected comparisons have the opposite strict raw ordering.  The smallest
raw quotient is about `0.991967976`; at the tightest complete comparison the
binomial reserve is `40/39`, the raw quotient is about `0.999357058`, and
their product is about `1.024981598`.

The coefficient ratios also have a conditional-lowering form.  If
`H=XR=sum c_(ij)z^i w^j`, then

\[
 {\rho_h\over\rho_{h-1}}=
 {\sum_{u=0}^{h-1}{h-1\choose u}
 (c_{D-u-1,D-h+1+u}+c_{D-u,D-h+u})
 \over
 \sum_{u=0}^{h-1}{h-1\choose u}c_{D-u,D-h+1+u}}.  \tag{14c}
\]

Hence `r_h` is the boundary expectation of the local lowering score
`(c_(i-1,j)+c_(i,j-1))/c_(ij)`.  For one active branch of
`A^aT^b`, this score is a sum of the explicit two-color hypergeometric
terms

\[
 {k_z\over a+v-k_z+1}+{k_w\over a+b-v-k_w+1},     \tag{14d}
\]

with nonnegative boundary inflow from adjacent source atoms.  Equations
(14b)--(14d) isolate the remaining MLR theorem: the boundary tilt from `i`
to `j` may reduce raw curvature, but by no more than the explicit reciprocal
binomial reserve `B_j/B_i`.

Even PF-infinity of the weighted reserve is insufficient.  The exact
negative-rooted polynomial

\[
 \prod_{r\in\{1,1,3,3,5,10,20,20\}}(1+ry)
\]

has coefficient row
`(1,63,1512,17634,108429,361695,641450,552000,180000)`.
At `n=8,t=3,ell=1` its quotient curvatures satisfy

\[
 K_1={21\over8}<{33856\over12829}=K_7,              \tag{15}
\]

the reverse of (14).  Scaling every displayed root parameter by `1/10`
leaves (15) unchanged and gives the central factor
`S_1=13248/64145<2`.  One may independently prescribe
`g=(-8,-4,-2,-1,1,2,3,4,5)`, which has the required initial negative block
and satisfies the local sandwich.  Hence PF-infinity, single crossing, and
the `g` sandwich still do not imply either reserve lemma.  An all-order
reserve proof must retain the path-specific coefficient normalization in
(11)--(12).

Run:

```text
python probe_affine_bridge_weighted_ratio_lattice.py
```

SHA-256:

```text
probe_affine_bridge_weighted_ratio_lattice.py
C3CB34B573CA4CB93125C5C846454DE7148F250778AB18C09A0D2339B06EB156

affine_bridge_weighted_ratio_lattice_exact_20260812.json
D321E4E3CDBED20E431DCDEF854400B9A6EFB06BDDAAA85BD51272DA93D1FC4A

verify_affine_bridge_reflection_pairs.py
15A9523C8C9AF9FA6111EAA4521B47904A76CAC1A68732B3A4B58259B3785670

affine_bridge_reflection_pairs_exact_20260812.json
C471CD45F630737E5AF29BF7D26A58D177CD05D687200640D91520E54FCF60C0

verify_affine_bridge_g_curvature_kernel.py
9FC50D926038D3D44A2AC0D3BE84B394D7328BBB6651DAF3655A6B95BFEB4236

affine_bridge_g_curvature_kernel_exact_20260812.json
410508A42D385666C3F5F8B2C1193E348318BF8DFC97303F8937A241B8929335

probe_affine_bridge_euler_transfer_large_ray.py
E94D8B2EF62CE43767246EFF7EDD6165A83497ACDA2514E05E5DA87C569F8CDA

affine_bridge_euler_transfer_large_ray_exact_20260812.json
EC832E37C45B90ABA98E1C70D0BF8133B91D4FB0A14DDECFCF7B7701146D424C

verify_affine_bridge_local_sandwich_reserve_curvature.py
B2238E49E2A84AF78231E7D5AE23BA489987D9F633C3B85743C225B6904178FF

affine_bridge_local_sandwich_reserve_curvature_exact_20260812.json
554F37B4CE23083010EEB9CBD5705C2C00C54E98B62625F622BBD79B6D5D86C2

probe_affine_bridge_local_reflection_lattice.py
88BD8494EB413298A74C7F59F96368AFDB3D99C9CF0D96F663A19E0BF134E8B9

affine_bridge_local_reflection_lattice_exact_20260812.json
265793F77FE0AC23571A7D6E48F8619C5F4B9114E6B57F23939B2C0B50017C2C
```

## 5. Laguerre--Jensen form of the reserve

The path-specific normalization in (11)--(14d) admits a sharper exact
form.  Define

\[
 \mathcal C_D(y)=[z^Dw^D]XR\exp(y(z+w)).
\]

Then `[y^h] C_D=rho_h/h!`, and therefore the weighted reserve polynomial
`sum_h binom(n,h)rho_h y^h` is precisely the degree-`n` Jensen polynomial
of `C_D`.  After expanding the `T` branches, `C_D` is the explicit positive
sum

\[
 \sum_{p,q}r_{pq}\sum_{v=0}^b{b\choose v}
 L_{D-p-v}^{(a-D+p+2v)}(-y)
 L_{D-q-b+v}^{(a+2b-D+q-2v)}(-y).                 \tag{16}
\]

After extracting the common `A^2T^5` from the reserve source, its minimum
total degree is `8` in the group package and `9` in the bottom package.
The minimum layers are respectively

\[
 4z^2w^2(z^2+w^2)(z^2+zw+w^2),
 \quad
 4z^2w^2(z+w)(z^2+w^2)(z^2+zw+w^2).
\]

Together with `D=m+n+4`, this proves the exact all-order degree identity

\[
 \deg\mathcal C_D=2n-\epsilon-1                   \tag{17}
\]

in all four families.  Thus the required reserve curvatures lie in the
first half of a degree `2n-1` or `2n-2` Laguerre object; this is the missing
structural distinction from the generic PF-infinity obstruction (15).

The hard records satisfy the stronger exact finite statement

\[
 K_i\ge K_j\qquad(j-i\ge2,\ i+j\le n-2)           \tag{18}
\]

in all `125,579` available comparisons.  Under the endpoint slack (K5),
every reflected comparison (14) is an instance of (18).  For a single
two-colour Laguerre product in (16), the finite pattern
`alpha+beta>=2n-2 => (18)` passes `69,440` exact cells in the bounded window
tested, but it is false all-order.  The exact high-degree atom
`(n,A,B,alpha,beta)=(32,489,0,62,0)` has

\[
 K_{15}={1020672\over882895}
 <{1507713\over1304192}=K_{16}.
\]

Thus positive summation cannot be justified atomwise.  There is instead an
exact mixture criterion.  When no atom enters or leaves these four layers,
use the atom law proportional to its layer `h-1` mass and put
`x=a_h/a_(h-1)`, `y=a_(h+1)/a_h`, and `z=a_(h+2)/a_(h+1)`.  Then

\[
 K_h\ge K_{h+1}
 \quad\Longleftrightarrow\quad
 (\mathbb Ex)^3\mathbb E(xyz)\ge(\mathbb E(xy))^3. \tag{19}
\]

Writing `M=E x`, `C=Cov(x,y)`, and `d=xz-y^2`, (19) is exactly

\[
 M^3\{\mathbb E(yd)+\mathbb E(y^3)-(\mathbb Ey)^3\}
 \ge (M\mathbb Ey+C)^3-(M\mathbb Ey)^3.           \tag{20}
\]

For atoms born after layer `h-1`, let `b_1,b_2,b_3` be their aggregate
contributions at the next three layers, normalized by the active
layer-`h-1` mass.  The exact general form is

\[
 (M+b_1)^3\{\mathbb E(xyz)+b_3\}
 \ge\{\mathbb E(xy)+b_2\}^3.                     \tag{21}
\]

Among the 953 required reflected left windows, 209 contain births and none
contains a death, so (19)--(20) cover 744 windows directly and (21) covers
the remaining 209 with an explicit boundary-inflow budget.

The degree condition cannot simply be deleted either:
`(n,A,B,alpha,beta)=(12,5,20,1,11)` has
`K_4=529/312 < 6272/3699=K_6`.

One atomwise regime does admit an all-order proof.  In the one-colour case,
write `n=2h+2+s`, `alpha=2n-2+r`, and `A=alpha+t`.  Then
`0<=t<=2h+29s` implies `K_h>=K_(h+1)`: after clearing the positive
denominator, the difference numerator is `C0+C2*t*(t+2h+2)`, and its
values at both endpoints `t=0,2h+29s` are coefficientwise positive in
`h,s,r`.  This locates
the atom counterexample above beyond the moderate-capacity window
(`t=427>30`) but does not cover the full two-colour path mixture.

The complete derivation, the exact MLR kernel for the colour allocation,
and the independent replay are in
`AFFINE_BRIDGE_LAGUERRE_JENSEN_REDUCTION_2026-08-12.md` and
`verify_affine_bridge_laguerre_jensen_reduction.py`.  The remaining reserve
lemma is now the all-order proof of (18) for the exact positive mixture
(16), using the MLR lowering score to prove the reserve-versus-covariance
budget (20).  At one genuine path point the exact decomposition contains 82
atomwise adjacent-curvature failures and positive covariance, but the cubic
Jensen reserve still exceeds the covariance penalty, so (20) captures a
real cancellation that atomwise closure misses.

## 6. What remains

The affine bridge is reduced to proving, uniformly in the four
package/parity families:

1. the determinant orientation (9), hence single crossing;
2. its endpoint bound `2t+2<=n`;
3. the two central payments `P_0,P_1>=1`;
4. the outward two-sided Turan inequality (8), or the sufficient factor
   bounds (6).

This is strictly more explicit than the earlier growing-prefix statement:
it specifies exactly which positive layer pays each negative layer and uses
no overlapping payments.  The same reflection statement with
`e_h-2rho_h` is false in five small-boundary cases, so the strengthening
`F_k>=2R_k^*` should not be substituted into this pairing proof.

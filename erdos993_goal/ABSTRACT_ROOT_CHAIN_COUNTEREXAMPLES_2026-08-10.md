# The current abstract hypotheses do not force the three-level root chain

This note independently audits whether the conclusions already proved for
the unsigned selector polynomials force (62.4).  They do not.  There are two
separate logical gaps: adjacent orientation and the codimension-two
cross-gap.

All polynomials below have positive coefficients and simple negative roots.
For a quadratic pair, overlap of their two open root intervals is equivalent
to a strict common interlacer.  The displayed pencil discriminants have
strictly positive coefficients, so every nonnegative pencil is strictly
real-rooted.

## 1. All current abstract hypotheses can hold while adjacent orientation fails

Let

```text
A(t)=1267/2592 (1+t/2)(1+t/13),
B(t)=           (1+t/3)(1+t/4),
C(t)=           (1+t)(1+t/5).                       (1)
```

Their root sets, in increasing order, are

```text
A: -13,-2,       B: -4,-3,       C: -5,-1.          (2)
```

The `A,B` root intervals overlap strictly, as do the `B,C` intervals.  More
explicitly, the discriminants of `A+lambda B` and `B+lambda C` are

```text
(31539456 lambda^2+412697376 lambda+194239969)/4541681664,
(2304 lambda^2+960 lambda+25)/3600.                 (3)
```

Thus both adjacent positive pencils are strict for every `lambda>=0`.

The complete coefficient-ratio pattern corresponding to (67.5) also holds:

```text
h=0:  35/72 <= 1267/2592 <= 1,
h=1:   5/12 <=  905/1872 <= 35/72,
h=2:             1267/5616 <= 5/12.                 (4)
```

In addition, `B^2-AC` is stronger than positive on the positive axis: all
five of its coefficients are strictly positive,

```text
1325/2592, 33481/112320, 17513/336960,
2051/112320, 1073/336960.                            (5)
```

Nevertheless the roots in (2) do not have componentwise order, much less
the chain (62.4).  Therefore negative-rootedness, adjacent common
interlacers/positive compatibility, (67.5), and even coefficientwise strict
Turan positivity do not select the adjacent orientation.

## 2. Even adjacent componentwise order does not force the cross-gap

Let instead

```text
A(t)=249/400 (1+t/4)(1+t/6),
B(t)=          (1+t/2)(1+t/5),
C(t)=          (1+t)(1+t/3).                        (6)
```

The roots are

```text
A: -6,-4,       B: -5,-2,       C: -3,-1.           (7)
```

Thus `a_i<b_i<c_i` for both `i=1,2`.  But the required cross-gap fails:

```text
c_1=-3 > -4=a_2.                                    (8)
```

Again the adjacent pencils are strict.  Their discriminants are

```text
(230400 lambda^2+26560 lambda+6889)/2560000,
(400 lambda^2+120 lambda+81)/900.                   (9)
```

The ratio pattern is

```text
h=0: 21/40 <= 249/400 <= 1,
h=1:  3/10 <=  83/224 <= 21/40,
h=2:            83/320 <= 3/10,                     (10)
```

and the Turan coefficients are again all strictly positive:

```text
151/400, 497/1600, 1063/9600, 91/4800, 13/9600.    (11)
```

Consequently even adding componentwise adjacent motion to all current
abstract hypotheses does not imply the codimension-two cross-gap.

## 3. What the path structure must still prove

Write the coefficient-of-powers formula (74.1) as

```text
G_(R,s)(t)=[z^s] B_t(z) A_t(z)^R,
A_t(z)=(1+z+tz^2)/(1-tz^2)^2,
B_t(z)=1/(1-tz^2).                                  (12)
```

Obreschkoff's theorem shows exactly what is missing from positive
compatibility.  Adjacent strict alternation is equivalent to real-rootedness
of the missing signed pencils

```text
S^(2)_(R,c)(t)
 =G_(R,s)(t)-cG_(R-2,s)(t)
 =[z^s]B_t A_t^(R-2)(A_t^2-c),       c>0.           (13)
```

The already-proved positive pencils cover the opposite sign.  If (13) is
real-rooted for every `c>0`, the strict root-sum inequality from Section 75
selects the observed orientation: the roots of `G_R` lie to the left of the
corresponding roots of `G_(R-2)`.

Likewise, the codimension-two cross-gap is exactly the missing signed-pencil
half of

```text
S^(4)_(R,c)(t)
 =G_(R,s)(t)-cG_(R-4,s)(t)
 =[z^s]B_t A_t^(R-4)(A_t^4-c),       c>0.           (14)
```

Together with the root-sum orientation, all-order real-rootedness of (14)
would give

```text
a_i<c_i<a_(i+1),                                    (15)
```

which is precisely the two-step cross-gap.  Formulas (13)--(14) are a
path-specific signed coefficient-of-powers target; the counterexamples above
show that no argument using only the abstract data can replace them.

There is a parallel hyperbolic-matrix target behind (14).  In the notation
of Section 79,

```text
B_(n,s)(x)=E det(I_s-(x/4)X C_(M-1)X^T),
C_m=tridiag(1,2,1),       n=2M-1.                   (16)
```

The shift `R -> R-4` corresponds to the codimension-two principal
compression `C_(M-3) subset C_(M-1)`.  Ordinary Cauchy interlacing only gives
two-interlacing before the Gaussian expected-characteristic-polynomial
transform.  The exact path-specific matrix lemma needed is that, in the
forest reserve, this transform upgrades the compression to ordinary strict
proper position, not merely positive compatibility.  Equivalently, all
signed block pencils

```text
B_(n,s)-cB_(n-4,s),       c>0,                      (17)
```

must be real-rooted.  Finite multiplicative convolution then preserves the
proper-position orientation.  This is the precise strengthening of the
positive-compatibility block lemma (79.5) that the abstract counterexamples
force.

There is also a direct Jensen/differential-operator form of this matrix
target, independent of the `_2F_2` representation.  Define

```text
q_n(v)=sum_i binom(n-i,i)v^i,
J_s[p](x)=sum_i s!/(s-i)! [v^i]p(v) x^i.            (18)
```

Then the block polynomial is exactly

```text
B_(n,s)(x)=J_s[q_n](-x/4).                          (19)
```

Endpoint deletion `q_k-q_(k-1)=v q_(k-2)` gives

```text
q_n-q_(n-4)=v L_n,
L_n=q_(n-2)+q_(n-3)+q_(n-4)+q_(n-5),               (20)
```

and therefore

```text
B_(n,s)-B_(n-4,s)
 =-(s x/4) J_(s-1)[L_n](-x/4).                     (21)
```

Every `q_k` is negative-rooted, so the Hermite--Poulain theorem independently
recovers real-rootedness of the first Jensen polynomial in (19).  Indeed,
apart from reciprocal reversal,

```text
J_s[p](x)=y^(-s)p(partial_y)y^s,       y=1/x.       (22)
```

Thus the block signed-pencil problem has been reduced without
hypergeometric functions to one explicit path/Jensen separator lemma (which
includes real-rootedness of its left member):

```text
J_(s-1)[L_n](-x/4) strictly interlaces
J_s[q_n](-x/4),                 n>=4s+9.            (23)
```

Equation (21) then fixes the signs of `B_(n-4,s)` at consecutive roots of
`B_(n,s)`, proving the oriented block alternation and hence all signed
pencils (17).  Ordinary Cauchy interlacing before applying `J_s` is only
two-step; (23) isolates exactly the reserve-dependent smoothing upgrade
that still requires proof.

## 4. Exact replay

`audit_abstract_root_chain_implication.py` verifies every coefficient,
ratio, discriminant, Turan coefficient, and root-order assertion above over
the rationals.  It writes
`abstract_root_chain_counterexamples_exact_20260810.json` and reports

```text
PASS_EXACT_ABSTRACT_ROOT_CHAIN_COUNTEREXAMPLES.
```

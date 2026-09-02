# A two-step factorial-ratio drop for every forest

Date: 2026-07-27

Status: **proved theorem**.

## Theorem

For every forest \(F\), with \(i_j=i_j(F)\),

\[
\boxed{
2i_2i_3-i_1i_3-4i_1i_4\ge0.
}
\tag{1}
\]

If

\[
\lambda_j=(j+1)\frac{i_{j+1}}{i_j},
\]

then, whenever the displayed ratios are defined, (1) is exactly

\[
\boxed{\lambda_1-\lambda_3\ge1.}
\tag{2}
\]

Thus the two consecutive factorial-ratio drops from ranks \(1\) to
\(3\) have total size at least one.  This is quantitatively stronger
than combining the elementary rank-two log-concavity statement with
only the sign of the rank-three three-halves reserve.  Stars show that
the bound is asymptotically sharp.

## Companion rank-two bound

Every forest also satisfies the sharpened rank-two factorial-ratio
drop

\[
\boxed{\lambda_1-\lambda_2\ge\frac2n.}
\tag{3}
\]

Indeed, with \(p_j=i_j(F)\), put

\[
N=2p_2^2-3np_3-2p_2.
\]

Using \(p_2=\binom n2-e\),
\(p_3=\binom n3-e(n-2)+S\), and
\(S\le\binom e2\), exact simplification gives

\[
N\ge
\frac{(n-1-e)(3en-4e+n^2-2n)}2\ge0.
\tag{4}
\]

Dividing \(2p_2^2-3np_3\ge2p_2\) by \(np_2\) proves (3)
whenever the ratios are defined.  After the \(2^j\) scaling used in
the rank-four convolution argument, this says
\(\delta_1\ge4/n>0\).

## Inclusion-exclusion reduction

Let \(n=|V(F)|\), \(e=|E(F)|\), and

\[
S=\sum_v\binom{d(v)}2.
\]

Let \(R\) count connected three-edge subsets.  Then

\[
\begin{aligned}
i_2&=\binom n2-e,\\
i_3&=\binom n3-e(n-2)+S,\\
i_4&=\binom n4-e\binom{n-2}2+S(n-4)+\binom e2-R.
\end{aligned}
\tag{5}
\]

For the left side \(D\) of (1),

\[
\frac{\partial D}{\partial R}=4n\ge0.
\]

The line-graph wedge argument gives the exact structural lower bound

\[
R\ge\frac{2S^2/e-S}{3}
\tag{6}
\]

for every nonempty forest.

## Large-order certificate

For \(n\ge16\), put

\[
u=\frac1n,\qquad
e=1+(n-2)s,\qquad
S=\binom e2z,
\qquad 0\le s,z\le1.
\]

Substitute (6), multiply the resulting lower bound by \(u^5\), and set
\(u=v/16\).  The result is a polynomial of degrees

\[
(5,3,2)
\]

on \([0,1]^3\).  All 72 exact tensor-Bernstein coefficients are
nonnegative.  Thirteen are zero, and the smallest positive coefficient
is

\[
\frac1{7680}.
\]

No subdivision is needed.

## Finite certificate

The verifier independently generates all 28,043 distinct nonempty
forest independence polynomials through order 15.  None violates (1).
The smallest positive normalized slack is attained by the 15-vertex
star:

\[
I(K_{1,14};x)
=(1,15,91,364,1001,2002,3003,3432,\ldots,14,1),
\]

for which

\[
\frac{D}{i_1i_3}=\frac2{15}.
\]

Together with the large-order Bernstein certificate, this proves
(1) for every forest.

## Verification

Run

```powershell
python .\verify_two_step_factorial_drop_forest_certificate.py
```

The script reconstructs the inclusion-exclusion identity, the
line-graph reduction, all exact Bernstein coefficients, and the finite
forest-polynomial enumeration.

## Role in the main proof program

After scaling factorial coefficients by \(2^j\), (2) says that the two
successive scaled drops satisfy

\[
\delta_1+\delta_2\ge2.
\]

This is the missing compensation relation in attempts to lift the
rank-four three-halves reserve through disjoint-union convolution:
large stars can make \(\delta_1\) arbitrarily small, but they must pay
for it with a larger next drop.  A forest-product proof must retain
this coupled inequality rather than impose the false standalone
rank-two half-drop condition.

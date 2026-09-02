# Terminal payment: Galvin boundary and revised factor-three target

Date: 2026-07-26

## 1. Setup

Let \(R\) be a forest rooted at \(q\), put

\[
B_j=i_j(R),\qquad C_j=i_j(R-q),
\]

and attach the path \(q-p-\ell\).  At local rank \(r\), define

\[
\Delta=B_rC_r-B_{r+1}C_{r-1},
\]

\[
\Lambda
=2B_r^2+B_rC_{r-1}+2(r+1)\Delta,
\]

\[
M=
B_{r-1}\bigl((r+1)(B_{r+1}+C_r)+B_r\bigr)
-rB_r(B_r+C_{r-1}),
\]

and

\[
\mathcal D=
B_{r-1}(B_r+C_{r-1}+B_{r-1})\Lambda.
\]

The exact terminal local payment is

\[
\Pi=\mathcal D-M^2.
\]

Thus the needed statement is \(M^2\leq\mathcal D\).

## 2. The factor-four strengthening is false

The previously conjectured strengthening

\[
4M^2\leq\mathcal D
\tag{F4}
\]

fails in the required prefix.

Use Galvin's tree \(T_{m,t}\), rooted at its outer vertex, with

\[
E=(1+2x)^t,\qquad
A=E+x(1+x)^t,
\]

\[
I(R;x)=A^m+xE^m,\qquad I(R-q;x)=A^m.
\]

For

\[
t=11,\qquad m=23,\qquad r=183,
\]

the terminal tree has independence number \(277\), and the cascade rank
is

\[
k=r+1=184<
\left\lfloor\frac{2\cdot277+1}{3}\right\rfloor=185.
\]

Exact integer arithmetic gives

\[
\frac{M^2}{\mathcal D}
=0.250662967440967\ldots>\frac14.
\]

This is an exact counterexample to (F4), not to the true local payment:

\[
\frac{\Pi}{\mathcal D}
=0.749337032559032\ldots>0.
\]

At the same witness, both the ordinary and the three-quarters pendant
cascades remain strictly positive.  The exact replay is
`verify_terminal_quarter_payment_galvin_failure.py`.

A broader exact grid with \(2\leq t\leq20\), \(1\leq m\leq40\), and
four natural root types reaches

\[
\frac{M^2}{\mathcal D}
=0.265917256218273\ldots
\]

at \(t=12,m=39,r=337\), still below \(1/3\).

## 3. The factor-three strengthening is also false

The next natural strengthening was

\[
3M^2\leq\mathcal D.
\tag{F3}
\]

It, too, fails in the required prefix.  The smaller exact witness is

\[
t=13,\qquad m=186,\qquad r=1735.
\]

Here \(|R|=5023\), the terminal tree has independence number \(2605\),
and

\[
k=1736<
\left\lfloor\frac{2\cdot2605+1}{3}\right\rfloor=1737.
\]

Exact arithmetic gives

\[
\frac{M^2}{\mathcal D}
=0.333388270634976\ldots>\frac13,
\]

while

\[
\frac{\Pi}{\mathcal D}
=0.666611729365023\ldots>0.
\]

Thus (F3) is false, but the true payment and both cascade inequalities
remain positive.  The same exact replay script checks both the
factor-four and factor-three witnesses.

## 4. Normalization and the rejected tangent split

Normalize as in the cascade note:

\[
m_0=\frac{B_{r-1}}{B_r},\quad
c=\frac{C_{r-1}}{B_r},\quad
\delta=\frac{\Delta}{B_r^2},
\]

\[
g=
\frac{rB_r^2+B_{r-1}B_r-(r+1)B_{r-1}B_{r+1}}
{B_r^2},
\]

\[
A_0=2+c+(r+1)\delta,\quad
x_0=\frac{(1+c)g}{m_0A_0},
\]

\[
s_0=
\frac{m_0A_0^2}
{(1+c+m_0)(2+c+2(r+1)\delta)}.
\]

Then

\[
\frac{M^2}{\mathcal D}=s_0(1-x_0)^2.
\tag{1}
\]

A proposed piecewise package,

\[
\frac13\leq x_0\leq\frac32,
\]

\[
x_0\leq1\Longrightarrow s_0\leq4x_0-1,
\]

\[
x_0\geq1\Longrightarrow x_0(3s_0+20)\leq36,
\]

would imply (F3), by the exact identities

\[
\frac14-(4x_0-1)(1-x_0)^2
=\frac{(2x_0-1)^2(5-4x_0)}4
\]

and

\[
\frac13-
\left(\frac{12}{x_0}-\frac{20}{3}\right)(x_0-1)^2
=
\frac{(2x_0-3)^2(5x_0-4)}{3x_0}.
\]

The Galvin factor-three witness necessarily refutes at least one member
of this sufficient package.  The implication remains a valid algebraic
identity, but the package is not a theorem and must not be used.

## 5. The unstrengthened local payment is false

Pushing the same exact Galvin boundary farther also refutes the
unstrengthened separated payment

\[
M^2\leq\mathcal D
\tag{LP}
\]

at a required prefix rank.  Take

\[
t=22,\qquad m=9200,\qquad r=141065.
\]

Then \(|R|=414001\), the terminal tree has independence number
\(211601\), and

\[
k=141066<
\left\lfloor\frac{2\cdot211601+1}{3}\right\rfloor
=141067.
\]

The exact ratio is

\[
\frac{M^2}{\mathcal D}
=1.081711978147566\ldots>1.
\]

Hence the isolated local payment is negative by about \(8.17\%\) of
its proposed denominator.

This does **not** refute the pendant cascade.  The same-rank GSB term in
the exact identity compensates, giving

\[
\frac{H_r(I(R))}{H_{r+1}(I(Q))}
=0.393601443918456\ldots<\frac34<1.
\]

Thus both ordinary and three-quarters PGC remain strictly positive at
the witness.  The exact replay
`verify_terminal_local_payment_galvin_failure.py` uses the
degree-\(23\) base polynomial and the recurrence

\[
n[x^n]A^m
=
\sum_{j\geq1}((m+1)j-n)a_j[x^{n-j}]A^m,
\]

so it retains only \(23\) consecutive coefficients even though the
reported coefficients have \(96{,}383\) decimal digits.

## 6. Consequence for the proof strategy

Neither the factor-four, factor-three, nor unstrengthened separated
payment may be used globally.  Their proofs at local ranks \(r=1,2\)
remain correct.

The full combined identity and the three-quarters cascade survive every
current test, including this adversarial witness.  The next proof target
must therefore preserve cancellation between the negative payment and
the positive same-rank GSB term rather than proving those summands
separately.

## 7. A normalized-curvature split is also false

Writing

\[
\tau_k(P)=
\frac{kG_k(P)}{p_{k-1}p_k},
\]

the tempting normalized cascade

\[
\tau_k(I(G))\geq\tau_{k-1}(I(F))
\tag{SCC}
\]

survives all small, PatternBoost, and earlier Galvin tests at
\(k\geq3\), but it too eventually fails in the outer-rooted Galvin
family.  The rigorous finite witness is

\[
t=27,\qquad m=47725,\qquad r=890865,
\]

where a 320-bit Arb certificate gives

\[
\frac{\tau_{r+1}(I(Q))}{\tau_r(I(R))}
=0.9999999500195473225001\ldots<1.
\]

The omitted positive tail in the rare-branch expansion is bounded by
\(2.91\times10^{-96}\), so this is a proof, not floating
reconnaissance.  The verifier is
`verify_scaled_curvature_galvin_failure_arb.py`.

Again the actual target is not threatened:

\[
\frac{H_r(I(R))}{H_{r+1}(I(Q))}
=0.3992656634047382673915\ldots<\frac34.
\]

The surviving normalized route must therefore retain the coefficient
factor.  The current candidate is the threshold package recorded in
`SCALED_CURVATURE_CASCADE_REDUCTION_2026-07-27.md`: a global fractional
lower bound on \(\tau_k/\tau_{k-1}\), plus full SCC only when the
leaf-present class has sufficiently high occupancy.

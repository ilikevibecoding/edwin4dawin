# Counterexample to Terminal Downward Sign Preservation

## Status

This note gives a rigorous finite tree counterexample to the proposed
terminal implication

\[
i_r(F)<i_{r-1}(F)
\quad\Longrightarrow\quad
i_{r+1}(T)<i_r(T),
\qquad I(T)=I(F)+xI(F-q).
\tag{DP}
\]

It does **not** give a counterexample to unimodality or to Erdős
Problem 993.  The corresponding outer tree has positive C12 margin
and an ordinary local peak.

## Construction

Put

\[
m=60,\qquad
t=\left\lfloor\frac{37}{20}2^{60}\right\rfloor
=2\,132\,904\,783\,522\,666\,905,
\]

\[
N=mt
=127\,974\,287\,011\,360\,014\,300.
\]

Let

\[
A=(1+x)^m+x,\qquad
E=A^t,\qquad
L=(1+x)^N,
\]

\[
P=E+xL,\qquad
C=(1+x)^2P,\qquad
D=E.
\]

These are independence polynomials from the finite two-level
star-fork rooted tree: the inner root has \(t\) child star centers,
each with \(m\) leaves, and the outer root has two direct leaves.
Define

\[
F=C+xD,\qquad T=F+xC.
\tag{1}
\]

Thus \(T\) is obtained from \(F\) by adjoining a new vertex adjacent
to the distinguished root.  The corresponding pendant outer tree has

\[
I(G)=T+xF.
\tag{2}
\]

The order of the rooted tree underlying \(F\) is

\[
130\,107\,191\,794\,882\,681\,209.
\]

## Certified failure

At

\[
r=63\,987\,143\,505\,680\,007\,104,
\qquad k=r+1,
\]

exact rational interval arithmetic certifies

\[
r-r\frac{F_r}{F_{r-1}}
=0.087401662294291098\ldots>0,
\tag{3}
\]

so \(F_r<F_{r-1}\), but

\[
k-k\frac{T_{r+1}}{T_r}
=-0.005668191734878836\ldots<0,
\tag{4}
\]

so \(T_{r+1}>T_r\).  Equations (3)--(4) are precisely the strict
failure of (DP).

At the same rank, the former one-step condition \(U\) and cross-ratio
condition \(C\) both fail by

\[
-0.093069854029169935\ldots.
\]

Nevertheless,

\[
2\tau_k(G)-\tau_r(F)
=127\,974\,287\,011\,360\,010\,000\ldots>0,
\]

and both the all-branch GBCL margin and the sharper negative-cross
NCL margin are strictly positive.

## Verification method

The exact coefficient identity

\[
[x^s]E
=
\sum_j
\binom tj
\binom{m(t-j)}{s-j}
\tag{5}
\]

is normalized by \(\binom Ns\).  The verifier sums terms
\(j=0,\ldots,80\) as exact rational numbers and bounds the remaining
positive tail by an exact geometric majorant.  Every reported sign is
separated from zero by far more than the certified interval width.

The independently replayable entry point is
`verify_star_fork_downward_counterexample_interval.py`; its certificate
is `star_fork_downward_counterexample_m60_20260729.json`.

An exhaustive search through every rooted tree of order at most 16
and 100,000 adversarial PatternBoost forest-factor samples had no
failure.  The finite counterexample therefore also demonstrates why
small-order evidence was misleading.

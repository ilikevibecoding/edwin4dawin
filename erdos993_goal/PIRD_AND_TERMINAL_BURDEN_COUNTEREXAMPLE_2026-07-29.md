# Rigorous Finite Counterexample to PIRD and Terminal-Isolate Burden

## Status and scope

Ordinary prefix isolated-root ratio dominance (PIRD) and the
forest-specific terminal-isolate burden inequality (TI) are false.
The counterexample below is a finite rooted tree and is certified by
exact rational intervals.

This does **not** refute unimodality of the independence sequence of
the tree or forest, and it does not solve Erdős Problem 993.  The
corresponding full C12 curvature margin remains strictly positive;
the counterexample instead proves that the PIRD and TI shortcuts
discard indispensable compensation.

## 1. The star-fork family

Let \(q\) have two leaf neighbours and one inward neighbour \(r\).
Give \(r\) exactly \(t\) child centres, each having \(m\) leaf
children.  Put

\[
 m=23,\qquad
 t=\left\lfloor\frac75\,2^{23}\right\rfloor=11744051,
\qquad
 N=mt=270113173.
\]

The rooted tree \(R\) has

\[
 |R|=2+2+t(m+1)=281857228
\]

vertices.  Adjoining one isolated vertex gives a forest of order
\(281857229\).

As in the smaller exact counterexample, define

\[
\begin{aligned}
A&=(1+x)^m+x,\\
E&=A^t,\\
L&=(1+x)^N,\\
P&=E+xL,\\
C&=(1+x)^2P,\\
D&=E,\\
H&=C+(1+x)D,\\
B&=(1+x)(C+xD).
\end{aligned}
\tag{1}
\]

Here \(C=I(R-q;x)\), \(D=I(R-N[q];x)\), and
\(B=I(R\sqcup K_1;x)\).

## 2. Why the enormous coefficients are still exactly tractable

For every rank \(s\),

\[
 E_s=
 \sum_{j=0}^{\min\{t,s,\lfloor(N-s)/(m-1)\rfloor\}}
 \binom tj\binom{m(t-j)}{s-j}.
\tag{2}
\]

Divide (2) by \(\binom Ns\).  The \(j=0\) summand becomes \(1\), and
the consecutive normalized summands have the exact rational ratio

\[
 q_j=
 \frac{(t-j)(s-j)
 \,(N-s-(m-1)j)^{\underline{m-1}}}
 {(j+1)(m(t-j))^{\underline m}}.
\tag{3}
\]

At the relevant central ranks, the terms behave like
\((7/5)^j/j!\).  It is therefore unnecessary to materialize
coefficients having roughly \(81\) million decimal digits.

`verify_star_fork_pird_counterexample_interval.py` sums the terms
through \(j=80\) as exact rational numbers.  For all later terms it
proves a uniform ratio bound below

\[
0.034142.
\]

Thus the omitted positive tail is bounded by a geometric series.
The relative width of every resulting coefficient interval is less
than

\[
3.006\times10^{-110}.
\]

All subsequent additions, multiplications, divisions, and
subtractions are performed with rational interval endpoints.

## 3. Certified PIRD failure

Take

\[
k=135056574.
\]

The certificate proves

\[
B_{k+1}-B_k>0.
\]

After division by the common positive normalization
\(\binom Nk\), its interval is

\[
9.97184268\times10^{-7}<B_{k+1}-B_k
<9.97184269\times10^{-7}.
\]

Hence the rank is operative.

The ordinary PIRD minor is

\[
\Delta_k=C_kH_k-C_{k+1}H_{k-1}.
\]

The rigorous normalized interval is

\[
-2.7327108210\times10^{-7}
<
\Delta_k
<
-2.7327108209\times10^{-7}.
\]

In ratio form,

\[
\boxed{
-0.064424<v-w<-0.064423,
}
\qquad
v=(k+1)\frac{H_k}{H_{k-1}},
\quad
w=(k+1)\frac{C_{k+1}}{C_k}.
\]

Thus \(B\) is rising while ordinary PIRD fails strictly.

## 4. Certified terminal-isolate burden failure

Put \(r=k+1\), \(b_j=B_j\), and \(c_j=C_j\).  The TI cleared margin is

\[
\begin{aligned}
X_r={}&
b_rb_{r-1}+r b_r c_{r-1}-b_{r-1}^2\\
&-(r+1)b_{r-1}c_r+b_{r-1}c_{r-1}.
\end{aligned}
\tag{4}
\]

The same rational interval certificate gives

\[
\boxed{X_r<0}
\]

with normalized value

\[
X_r=-36.9070284163\ldots.
\]

This is a counterexample to TI having exactly the sparse,
acyclic, recursively multiplicative structure that all of the
earlier nonforest controls lacked.

## 5. The associated outer tree is not a counterexample to
unimodality

Add a new vertex \(p\) adjacent to \(q\) and to the isolated vertex
\(z\).  The result is a tree \(T\), and

\[
I(T;x)=B(x)+xC(x).
\tag{5}
\]

The certificate checks its consecutive differences around the
critical rank.  They are positive through rank \(k+2\) and negative
at the next comparison, giving an ordinary local peak, not a valley.

It also checks the full half-curvature cascade quantity

\[
2\tau_{k+1}(I(T))-\tau_k(I(R))
\]

and obtains the strictly positive normalized value

\[
270112502.6700797\ldots.
\]

Therefore the full C12 mechanism retains a very large reserve even
though the local TI burden is negative.

## 6. Consequences

The following universal targets are now rigorously refuted:

1. M1 and M2 as a route to half-payment;
2. QPIRD;
3. universal half-payment with constant \(1/2\);
4. ordinary PIRD;
5. terminal-isolate burden TI, even in the canonical one-deep tree
   family.

The exact bivariate identities, compensation identities, terminal
normal form, order-sensitive tail theorem, fixed-rank proofs, and
full C12 conditional solution theorem remain valid.

The proof program must retain the compensation terms present in full
C12.  No proof may replace them by PIRD or by a sign assertion for
the terminal-isolate burden alone.

## 7. The terminal drift and cross-ratio shortcuts also fail

The same rational-series interval method applies at

\[
m=53,\qquad
t=\left\lfloor\frac75\,2^{53}\right\rfloor
=12610078956637388.
\]

At

\[
r=334167092350890752,\qquad k=r+1,
\]

use the terminal notation

\[
u=r\frac{i_r(F)}{i_{r-1}(F)},\qquad
v=k\frac{i_{r+1}(T)}{i_r(T)}.
\]

The finite certificate proves

\[
u-r=3.6942495470\ldots>0,
\qquad
v-k=3.7053200217\ldots>0,
\]

so both lower sequences are still rising.  Nevertheless,

\[
\boxed{
u+1-v=-0.01107047466\ldots<0,
}
\]

refuting the one-step drift condition (U), and

\[
\boxed{
\frac{k}{r}u-v=-0.01107047466\ldots<0,
}
\]

refuting the original cross-ratio condition (C).

At the same rank, the compensated-linear (CL) margin is positive by
more than \(2.23\times10^{35}\), and the full C12 margin is positive
by more than \(6.68\times10^{17}\).  Thus the reversal is real and
operative, but curvature compensation completely overwhelms it.

`verify_star_fork_u_cross_counterexample_interval.py` reproduces the
certificate and writes
`star_fork_u_cross_counterexample_m53_20260729.json`.

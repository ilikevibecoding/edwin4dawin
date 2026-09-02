# Exact Counterexample to QPIRD and Half-Payment

## Status and scope

The quantitative one-unit PIRD reserve (QPIRD) and the one-half
compensation inequality (HP/TS) are false, even for the canonical
one-deep rooted-tree family and at an operative rising rank.

This is **not** a counterexample to ordinary PIRD, to unimodality of
the displayed tree or forest, or to Erdős Problem 993.  At the
counterexample rank, the ordinary PIRD minor is strictly positive.

## 1. The finite rooted tree

Let \(q\) be the distinguished root.  Give \(q\) two leaf neighbours
and one inward neighbour \(r\).  Give \(r\)

\[
  t=1075
\]

child centres, each having

\[
  m=10
\]

leaf children.  The resulting tree \(R\) has

\[
  |R|=2+2+t(m+1)=11829
\]

vertices.  For the marked-pair QPIRD formulation, adjoin one isolated
vertex \(z\); the forest \(F=R\sqcup\{z\}\) has order \(11830\).

Put

\[
 A=(1+x)^m+x,\qquad
 E=A^t,\qquad
 L=(1+x)^{mt}.
\]

Rooted recursion at \(r\), followed by deletion at \(q\), gives

\[
 P=E+xL,\qquad
 C=(1+x)^2P,\qquad
 D=E.
\]

As in the QPIRD setup, define

\[
 H=C+(1+x)D,\qquad
 B=(1+x)(C+xD).
\]

All of these are independence polynomials of the stated rooted-tree
states; there are no formal or non-graph polynomial factors.

## 2. Exact coefficient engine

The only large power needed is \(E=A^t\).  Its coefficients have the
finite exact sum

\[
 \boxed{
 E_s=
 \sum_{j=0}^{\min\{t,s,\lfloor(mt-s)/(m-1)\rfloor\}}
 \binom tj\binom{m(t-j)}{s-j}.
 }
\tag{1}
\]

Indeed, \(j\) chooses the \(x\)-term from \(j\) of the \(t\) factors
\((1+x)^m+x\), and the remaining factors contribute
\((1+x)^{m(t-j)}\).

`verify_qpird_star_fork_counterexample.py` evaluates (1) in two
independent ways:

1. direct summation of the displayed binomial products;
2. an exact consecutive-summand recurrence.

The two engines agree at every coefficient used below.

## 3. The operative failure

Take

\[
 k=5372.
\]

The exact calculation gives

\[
 B_{k+1}-B_k>0,
\]

so this is an operative rising rank.  With

\[
 u=k\frac{C_k}{C_{k-1}},\qquad
 w=(k+1)\frac{C_{k+1}}{C_k},\qquad
 v=(k+1)\frac{H_k}{H_{k-1}},
\]

the exact signs and decimal values are

\[
\begin{array}{c|c|c}
\text{quantity}&\text{exact sign}&\text{decimal value}\\ \hline
v-u&+&0.005343388252969829\\
v-w&+&0.9926966173051001\\
v-w-1&-&-0.0073033826948999\\
2v-1-u-w&-&-0.0019599944419297975.
\end{array}
\]

Consequently:

- ordinary PIRD, \(v\ge w\), is strict here;
- M1, \(v\ge u\), is also strict;
- QPIRD/M2, \(v\ge w+1\), fails;
- half-payment/TS, \(2v\ge1+u+w\), fails.

Equivalently, if

\[
 \Delta_k=C_kH_k-C_{k+1}H_{k-1},
\]

then

\[
 \Delta_k>0
\]

but

\[
 (k+1)\Delta_k-C_kH_{k-1}<0.
\]

The verifier checks these as signs of integers having between \(3233\)
and \(9703\) decimal digits.  The report
`qpird_star_fork_counterexample_certificate_20260729.json` records
their signs, digit lengths, and SHA-256 hashes of their decimal
representations.

## 4. Exact compensation interpretation

For

\[
\begin{aligned}
\mathcal G_k(C)
&=kC_k^2+C_{k-1}C_k-(k+1)C_{k-1}C_{k+1},\\
\mathcal S_k(C,D)
&=(k+1)C_{k-1}(C_k+D_k+D_{k-1})\\
&\quad-(kC_k+C_{k-1})
 (C_{k-1}+D_{k-1}+D_{k-2}),
\end{aligned}
\]

the counterexample has

\[
 \mathcal G_k(C)>0,\qquad \mathcal S_k(C,D)<0.
\]

Its exact payment ratio is

\[
 \eta_k=
\frac{-C_k\mathcal S_k}
{(C_{k-1}+D_{k-1}+D_{k-2})\mathcal G_k(C)}
=0.500493116777953\ldots.
\]

Thus HP fails for the sharp reason: it permits only half of the GSB
reserve to be spent, while this tree needs just over half.  The exact
PIRD identity permits all of the reserve, and approximately
\(49.95\%\) remains after payment.

## 5. The larger transition

The same exact binomial-sum engine tracks the family when \(m\) and
\(t\) grow with \(t\) near \(1.4\,2^m\).  Representative operative
PIRD margins \(v-w\) are

\[
\begin{array}{c|c|c|c}
m&t&k&v-w\\ \hline
10&1433&7161&0.9575895424\ldots\\
11&2867&15764&0.8820970261\ldots\\
12&5734&34399&0.8049981937\ldots\\
13&11469&74543&0.7269395245\ldots\\
14&22938&160560&0.6483309744\ldots.
\end{array}
\]

Hence the failure is not a one-rank accident.  Fixed-reserve
strengthenings become progressively worse, while ordinary PIRD
remains positive throughout this directly summed range.

Ordinary PIRD eventually fails as well.  A rigorous rational-interval
certificate at \(m=23\) is given in
`PIRD_AND_TERMINAL_BURDEN_COUNTEREXAMPLE_2026-07-29.md`.

## 6. Consequences for the proof program

The following proposed endpoints must no longer be used:

1. QPIRD / \(v\ge w+1\);
2. the split M1+M2 proof of half-payment;
3. HP / \(2v\ge1+u+w\) with the universal constant \(1/2\).

The exact compensation identity and the bivariate intersection
decomposition remain valid, but neither fixed half-payment nor full
ordinary PIRD has a universal sign.  The proof program must return to
the fully compensated C12 expression; the \(m=23\) certificate shows
that its discarded terms are essential.

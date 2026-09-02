# Exact rank-3 three-halves leaf certificate

Date: 2026-07-27

Status: **proved low-rank theorem**.  This note proves the rank-3
three-halves reserve and its global leaf monotonicity for every tree.  It
is one rank of the proposed induction, not a proof of Erdős Problem 993.

## 1. Statement

For \(P(x)=\sum_jp_jx^j\), define

\[
Q_3(P)=6p_3^2-p_2p_3-8p_2p_4.
\]

Then:

1. \(Q_3(I(T))\ge0\) for every tree \(T\);
2. if \(T^+\) is obtained from \(T\) by adding one leaf at any vertex,
   then

   \[
   Q_3(I(T^+))-Q_3(I(T))\ge0.
   \]

Whenever \(p_2p_3>0\), the first statement is exactly

\[
\sigma_3(I(T))
=\frac{3p_3^2+p_2p_3-4p_2p_4}{p_2p_3}
\ge\frac32.
\]

Thus both conjectural leaf obligations (Q-LM) and (Q-BR) in
`PREFIX_THREE_HALVES_LEAF_REDUCTION_2026-07-27.md` are unconditional at
rank \(3\).

## 2. Tree statistics

Let \(T\) have \(n\) vertices and \(e=n-1\) edges.  Put

\[
S=\sum_{v\in V(T)}\binom{d(v)}2
\]

and let \(R\) be the number of connected three-edge subsets of \(T\).
Inclusion-exclusion gives

\[
\begin{aligned}
i_2&=\binom n2-e,\\
i_3&=\binom n3-e(n-2)+S,\\
i_4&=\binom n4-e\binom{n-2}{2}
     +S(n-4)+\binom e2-R.
\end{aligned}
\tag{1}
\]

Substitution into \(Q_3\) gives

\[
\begin{aligned}
12Q_3={}&
48Rn^2-144Rn+96R+72S^2\\
&-24Sn^3+114Sn^2-174Sn+84S\\
&+5n^5-48n^4+173n^3-294n^2+236n-72.
\end{aligned}
\tag{2}
\]

## 3. Global reserve

The line graph \(L(T)\) has \(e\) vertices and \(S\) edges.  Counting
length-two paths in \(L(T)\) and applying Cauchy--Schwarz gives

\[
R\ge\frac{2S^2/e-S}{3}.
\tag{3}
\]

The coefficient of \(R\) in (2) is positive.  Substitute (3), write
\(n=e+1\), and multiply by \(12\).  The resulting lower bound is

\[
\begin{aligned}
&32S^2e+40S^2-24Se^3+26Se^2-2Se\\
&\qquad+5e^5-23e^4+31e^3-13e^2.
\end{aligned}
\tag{4}
\]

It is a convex quadratic in \(S\), with real vertex

\[
S_*=\frac{e(e-1)(12e-1)}{8(4e+5)}
\]

and unconstrained minimum

\[
\frac{e^2(e-1)^2(16e^2-192e-521)}
     {8(4e+5)}.
\tag{5}
\]

Expression (5) is \(12\) times the lower bound for \(Q_3\).
For \(e=u+15\), its only sign-bearing factor is

\[
16e^2-192e-521
=16u^2+288u+199>0.
\]

Hence \(Q_3\ge0\) whenever \(e\ge15\).  Exact enumeration of all
unlabeled trees with \(e\le14\) gives the following minimum values of
\(Q_3\), by order \(n=1,\ldots,15\):

\[
(0,0,0,0,0,20,84,264,650,1410,2736,4936,8340,13440,20740).
\]

This proves the global reserve.

## 4. Exact leaf increment

Attach a new leaf at a vertex \(p\) of degree \(d\).  Define

\[
Z=\binom d2+\sum_{u\sim p}(d(u)-1).
\]

Then

\[
S^+=S+d,\qquad R^+=R+Z.
\tag{6}
\]

Direct substitution into (2) gives

\[
\begin{aligned}
12\Delta Q_3={}&
96Re+144Sd-72Se^2+12Se\\
&+48Ze^2+48Ze+72d^2\\
&-24de^3-30de^2-6de\\
&+25e^4-42e^3+5e^2.
\end{aligned}
\tag{7}
\]

Both \(R\) and \(Z\) have positive coefficients.  Use (3).  In the line
graph, the \(d\) edges incident with \(p\) form a clique.  If

\[
A=\binom d2,\qquad
B=\binom{e-d}{2},\qquad
S_0=A+B+1,
\]

then, for \(d<e\),

\[
Z\ge
\begin{cases}
A+1,&S\le S_0,\\
S-B,&S\ge S_0.
\end{cases}
\tag{8}
\]

After substituting (3), the common expression before the choice in (8)
is

\[
\begin{aligned}
12\Delta Q_3\ge{}&
64S^2+144Sd-72Se^2-20Se\\
&+48Ze^2+48Ze+72d^2\\
&-24de^3-30de^2-6de\\
&+25e^4-42e^3+5e^2.
\end{aligned}
\tag{9}
\]

In the first region of (8), the derivative with respect to \(S\), at
\(S_0\), is

\[
\frac{
32d^2-32de+36d-2e^2-21e+32
}{3}.
\tag{10}
\]

This is nonpositive for \(1\le d\le e-1\): it is convex in \(d\), and
its endpoint values are

\[
-\frac{2e^2+53e-100}{3},\qquad
-\frac{2e^2+17e-28}{3}.
\]

Since (9) is convex in \(S\), the first-region minimum is therefore at
\(S=S_0\).

In the second region, the derivative at \(S_0\) is

\[
\frac{
32d^2-32de+36d+10e^2-9e+32
}{3}.
\tag{11}
\]

Its unconstrained minimum in \(d\) is

\[
\frac{16e^2+72e+175}{24}>0.
\]

Thus the second-region minimum is also at \(S=S_0\).

At the common boundary, put

\[
d=1+(e-2)t,\qquad0\le t\le1.
\]

The lower bound is a quartic in \(t\).  Its five Bernstein coefficients
are

\[
\begin{aligned}
b_0&=\frac{(e-2)(5e^3-54e^2+145e-308)}{12},\\
b_1&=\frac{e(e-2)(2e^2+23e-221)}{24},\\
b_2&=\frac{(e-2)(31e^3-143e^2-2e-92)}{36},\\
b_3&=\frac{e(e-2)(2e^2-7e-107)}{24},\\
b_4&=\frac{(e-2)(5e^3-12e^2-29e-20)}{12}.
\end{aligned}
\tag{12}
\]

For \(e=u+10\), the five bracketed factors become

\[
\begin{gathered}
5u^3+96u^2+565u+742,\\
2u^2+63u+209,\\
31u^3+787u^2+6438u+16588,\\
2u^2+33u+23,\\
5u^3+138u^2+1231u+3490.
\end{gathered}
\]

Every coefficient is positive.  Hence \(\Delta Q_3\ge0\) for
\(e\ge10\) and \(d<e\).

If \(d=e\), the old tree is a star and direct substitution gives

\[
\Delta Q_3=\frac{e^2(e-1)(5e-1)}{12}\ge0.
\tag{13}
\]

Finally, exact enumeration of every tree and every attachment vertex for
old orders \(n=1,\ldots,10\) gives minimum increments

\[
(0,0,0,0,8,35,102,240,490,903).
\]

This proves global rank-3 leaf monotonicity.

## 5. Independent replay

`verify_rank3_three_halves_leaf_certificate.py` reconstructs (1)--(13)
symbolically over the rationals, verifies every Bernstein coefficient,
and performs both finite exact enumerations using an independent rooted
tree dynamic program.  It prints `PASS`.


# Star-Forest Marginal-Square Theorem

## Theorem

Let

\[
S_a(x)=(1+x)^a+x,\qquad
K(x)=\prod_{i=1}^s S_{a_i}(x),\qquad
M=\sum_{i=1}^s a_i,
\]

where every \(a_i\) is a positive integer.  Fix \(1\le k\le M\), put
\(K_k=[x^k]K(x)\), and define

\[
h_i=[x^{k-1}]\prod_{j\ne i}S_{a_j}(x),
\qquad
p_i=\frac{2h_i}{K_k}.
\]

Then

\[
\boxed{\displaystyle
\sum_{i=1}^s p_i^2\le \frac{k^2}{M}.}
\tag{MS}
\]

This proves the marginal-square lemma used in the
star-root Jensen reduction at every rank and for every collection of
star branches.

## 1. A universal two-block coefficient inequality

For positive integers \(a,b\), write

\[
U(x)=S_a(x),\qquad V(x)=S_b(x),
\]

and define

\[
\begin{aligned}
P(x)&=S_b(x)\bigl(1+a(1+x)^{a-1}\bigr),\\
Q(x)&=S_a(x)\bigl(1+b(1+x)^{b-1}\bigr).
\end{aligned}
\]

Let \(u_n,v_n,P_n,Q_n\) denote their respective coefficients, with
every coefficient outside the natural support interpreted as zero.
We first prove

\[
\boxed{\displaystyle
P_pQ_q+P_qQ_p
\ge
4a\,u_pu_q+4b\,v_pv_q
}
\tag{L}
\]

for all nonnegative integers \(p,q\).

Put

\[
c_n=\binom{a+b-1}{n}.
\]

Vandermonde's identity and
\(a\binom{a-1}{n-1}=n\binom an\) give the exact formulas

\[
\begin{aligned}
P_n&=v_n+a c_n+n\binom an,\\
Q_n&=u_n+b c_n+n\binom bn.
\end{aligned}
\tag{1}
\]

For \(n\ge2\), the exceptional \(x\)-term in \(S_a,S_b\) is absent,
so \(u_n=\binom an\) and \(v_n=\binom bn\).  Moreover,

\[
c_n\ge u_n+v_n.
\tag{2}
\]

Indeed, take sets \(A,B\) of sizes \(a,b\) meeting in one point.
The \(n\)-subsets contained in \(A\) and those contained in \(B\)
are disjoint when \(n\ge2\), and both classes are contained in their
\((a+b-1)\)-element union.

It follows from (1)--(2) that, for \(n\ge2\),

\[
\begin{aligned}
P_n&\ge(a+n)u_n+(a+1)v_n,\\
Q_n&\ge(b+1)u_n+(b+n)v_n.
\end{aligned}
\tag{3}
\]

If \(p,q\ge2\), substitute (3) in the left side of (L).  The
coefficient of \(u_pu_q\) in the resulting lower bound is

\[
(b+1)(2a+p+q)\ge4a,
\]

and the coefficient of \(v_pv_q\) is

\[
(a+1)(2b+p+q)\ge4b.
\]

All mixed terms are nonnegative, proving (L) in this case.

It remains to handle indices zero and one.  Directly,

\[
\begin{aligned}
P_0&=a+1,& Q_0&=b+1,\\
P_1&=b+1+a(a+b),&
Q_1&=a+1+b(a+b),\\
u_0&=v_0=1,&u_1&=a+1,\quad v_1=b+1.
\end{aligned}
\tag{4}
\]

For \(p=0,\ q\ge2\), (3)--(4) make the coefficients of \(u_q\)
and \(v_q\) in the left side of (L), respectively,

\[
(b+1)(2a+q+1)\ge4a,
\qquad
(a+1)(2b+q+1)\ge4b.
\]

For \(p=1,\ q\ge2\), the corresponding coefficients are

\[
P_1(b+1)+Q_1(a+q)
\quad\hbox{and}\quad
P_1(b+q)+Q_1(a+1).
\]

The first is at least \(4a(a+1)\): indeed,

\[
\begin{aligned}
P_1(b+1)&\ge2a(a+1)+4,\\
Q_1(a+q)&\ge2(a+1)(a+2)>2a(a+1).
\end{aligned}
\]

The second estimate follows by interchanging \(a\) and \(b\).

Finally let \(A=a-1\) and \(B=b-1\).  For the three remaining
unordered index pairs, direct expansion of the left side of (L)
minus its right side gives

\[
\begin{array}{c|l}
(p,q)&\text{difference}\\ \hline
(0,0)&2AB,\\[2mm]
(0,1)&2A^2B+2AB^2+10AB+2A+2B,\\[2mm]
(1,1)&
2A^3B+4A^2B^2+16A^2B+
2AB^3+16AB^2+42AB+8A+8B.
\end{array}
\tag{5}
\]

Every term in (5) is nonnegative.  Symmetry in \(p,q\) now proves
(L) in all cases.

## 2. From the local inequality to a pairwise incidence inequality

Fix two distinct blocks \(i,j\), put \(a=a_i,\ b=a_j\), and let

\[
H(x)=\prod_{\ell\ne i,j}S_{a_\ell}(x),\qquad r=k-1.
\]

For block \(i\), \(h_i=[x^r]H S_b\).  If \(\ell_i\) is the number
of rank-\(k\) independent sets containing one fixed leaf of block
\(i\), then

\[
\ell_i=[x^r]H S_b(1+x)^{a-1}.
\]

Consequently the total number of vertex incidences in block \(i\) is

\[
w_i=h_i+a\ell_i=[x^r]H P.
\tag{6}
\]

Similarly,

\[
h_j=[x^r]H S_a,\qquad w_j=[x^r]H Q.
\tag{7}
\]

All coefficients of \(H\) are nonnegative.  Expand the product
\([x^r]HP\,[x^r]HQ\), grouping the summands with coefficient indices
\((p,q)\) and \((q,p)\).  Inequality (L) applies to every off-diagonal
pair; half of (L) applies on the diagonal.  Therefore

\[
\boxed{\displaystyle
w_iw_j\ge2\bigl(a_i h_j^2+a_j h_i^2\bigr).
}
\tag{8}
\]

This implication is valid for every polynomial \(H\) with
nonnegative coefficients, not only for products of star factors.

## 3. Summing the block inequalities

Replacing the centre of block \(i\) by any fixed leaf injects the
independent \(k\)-sets counted by \(h_i\) into those counted by
\(\ell_i\).  Hence \(\ell_i\ge h_i\), and

\[
w_i^2=(h_i+a_i\ell_i)^2
\ge(a_i+1)^2h_i^2
\ge4a_i h_i^2.
\tag{9}
\]

Every rank-\(k\) independent set contributes exactly \(k\) vertex
incidences, so

\[
\sum_iw_i=kK_k.
\tag{10}
\]

Sum (9) over the diagonal terms and twice (8) over all unordered
pairs:

\[
\begin{aligned}
(kK_k)^2
&=\left(\sum_iw_i\right)^2\\
&=\sum_iw_i^2+2\sum_{i<j}w_iw_j\\
&\ge
4\sum_i a_i h_i^2+
4\sum_{i<j}(a_i h_j^2+a_j h_i^2)\\
&=4M\sum_i h_i^2.
\end{aligned}
\tag{11}
\]

Since \(p_i=2h_i/K_k\), division of (11) by \(M K_k^2\) yields

\[
\sum_i p_i^2
=\frac{4\sum_i h_i^2}{K_k^2}
\le\frac{k^2}{M}.
\]

This is (MS).

## 4. Consequence for the star-root obstruction

The exact compatible-pair identity and Jensen's inequality from the
star-root reduction now give unconditionally

\[
G_{k,k}
\ge
K_k^2\left(\frac34\right)^{k^2/M}.
\tag{12}
\]

The coarse consequence obtained by replacing
\(\sum_i p_i^2\) with \(k^2/M\) would be the rational debt inequality

\[
K_k^2\,3^{\lceil k^2/M\rceil}
\ge
4^{\lceil k^2/M\rceil}(k+1)D_k
\]

whenever \(D_k>0\).  That coarse sufficient condition is false at
larger parameters.  The exact Jensen bound (12) remains valid, and
the corrected adaptive debt condition retaining
\(\lceil\sum_i p_i^2\rceil\) is given in
`STAR_ROOT_ADAPTIVE_JENSEN_DEBT_2026-07-29.md`.

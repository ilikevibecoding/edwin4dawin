# A parity-ratio reduction for Erdős Problem 993

Date: 2026-07-24  
Status: **universal (TS) falsified; prefix (TS) remains a live reduction**

Let

\[
 A(x)=\sum_{k=0}^{d}a_kx^k,\qquad a_k>0,
\]

and call the following condition the **two-step ratio condition** (TS):

\[
 a_{k-1}a_{k+2}\leq a_ka_{k+1}
 \quad(1\leq k\leq d-2).                    \tag{TS}
\]

Equivalently, with \(r_k=a_k/a_{k-1}\),

\[
 r_{k+2}\leq r_k.
\]

Thus the even-indexed and odd-indexed subsequences of adjacent ratios are
separately decreasing.  This is weaker than log-concavity and is satisfied
by both order-26 trees whose independence polynomials are not log-concave.

## 1. Parity formulation

Write

\[
 A(x)=P(y)+xQ(y),\qquad y=x^2,
\]

where \(P_j=a_{2j}\) and \(Q_j=a_{2j+1}\).  For positive sequences define
\(U\preceq V\) by

\[
 \rho_V(j+1)\leq \rho_U(j)\leq \rho_V(j),
 \qquad
 \rho_U(j)=\frac{U_j}{U_{j-1}}.              \tag{1}
\]

Then (TS) is exactly

\[
 Q\preceq P.                                 \tag{2}
\]

Indeed,

\[
\rho_P(j)=r_{2j-1}r_{2j},\qquad
\rho_Q(j)=r_{2j}r_{2j+1},
\]

and \(r_{k+2}\leq r_k\) gives
\(\rho_P(j+1)\leq\rho_Q(j)\leq\rho_P(j)\).  It also makes both
\(\rho_P\) and \(\rho_Q\) nonincreasing, so the two parity sequences are
log-concave, as required in the standard definition.

This is the ratio-dominance relation of Gross--Mansour--Tucker--Wang,
*Log-Concavity of Combinations of Sequences and Applications to Genus
Distributions*, arXiv:1407.6325.

## 2. A proved closure lemma

**Lemma 1 (multiplicative closure).** If two positive-coefficient
polynomials satisfy (TS), then their product satisfies (TS).

**Proof.**  Write

\[
 A=P+xQ,\qquad B=R+xS
\]

in the parity variable \(y=x^2\).  The assumptions are
\(Q\preceq P\) and \(S\preceq R\).  The even and odd parts of \(AB\) are

\[
 C=PR+yQS,\qquad D=PS+QR.                    \tag{3}
\]

Set

\[
 L=QS,\quad M_1=PS,\quad M_2=QR,\quad U=PR.
\]

Ratio-dominance is preserved by convolution with a common log-concave
sequence (Gross et al., Corollary 2.16).  Consequently

\[
 L\preceq M_1\preceq U,\qquad
 L\preceq M_2\preceq U.                      \tag{4}
\]

Let \(L^+=yL\).  Relation \(L\preceq M_i\) and the offset equivalence
\(A\preceq B\Longleftrightarrow B\preceq A^+\) (Gross et al.,
Proposition 2.19) give

\[
 M_1\preceq L^+,\qquad M_2\preceq L^+.       \tag{5}
\]

Thus each of \(M_1,M_2\) is ratio-dominated by each of \(U,L^+\).
The ratio-dominance sum theorem (Gross et al., Theorem 2.11) now gives

\[
 D=M_1+M_2\preceq U+L^+=C.
\]

By (2), \(AB\) satisfies (TS).  The cited results are stated for
nonnegative finite-support sequences without internal zeros and therefore
also cover unequal parity supports and their leading offset zero.
\(\square\)

**Corollary 2.** To prove (TS) for every forest, it is enough to prove it
for every tree.  Indeed, the independence polynomial of a disjoint union
is the product of the independence polynomials of its components.

This is stronger than the usual observation about unimodality: convolution
does not preserve unimodality in general, whereas Lemma 1 shows that it
does preserve this proposed certificate.

## 3. Why prefix (TS) would nearly settle the conjecture

Put

\[
 L(T)=\left\lceil\frac{2\alpha(T)-1}{3}\right\rceil .
\]

The proved decreasing-tail theorem says that \(i_k(T)>i_{k+1}(T)\) for
every \(k\geq L(T)\).  Consequently, universal (TS) is unnecessary.  It is
enough to prove

\[
 a_{k-1}a_{k+2}\leq a_ka_{k+1}
 \qquad(1\leq k\leq L(T)-2).                \tag{prefix-TS}
\]

Suppose \(m\) is the first descent, so

\[
 r_m<1,\qquad r_1,\ldots,r_{m-1}\geq1.
\]

Condition (prefix-TS) propagates \(r_{m+2},r_{m+4},\ldots<1\) until the
proved decreasing tail begins.  It only leaves open the immediately adjacent
ratio \(r_{m+1}\).  Hence:

**Lemma 3.** If every tree satisfies (prefix-TS), and no tree has an immediate
rebound \(r_m<1<r_{m+1}\) after its first descent, then every tree and
forest has a unimodal independent-set sequence.

The weaker prefix inequality

\[
 (k+2)i_ki_{k+2}
 \leq (k+1)i_{k+1}^2+i_ki_{k+1}              \tag{GSB}
\]

already rules out that immediate rebound at \(k=m-1\): after division by
\(i_mi_{m-1}\), it gives

\[
 (m+1)r_{m+1}\leq mr_m+1<m+1.
\]

Thus (prefix-TS), together with (GSB) only at the first-descent rank, would
prove the AEMS conjecture.

## 3a. Exact counterexample to universal (TS)

Universal (TS) is false even for trees.  Let \(T(m,t)\) be a root joined to
\(m\) copies of \(S(2^t)\), where each gadget center has \(t\) paths of
length two.  Direct deletion at the root gives

\[
 I(T(m,t);x)
 =\big((1+2x)^t+x(1+x)^t\big)^m+x(1+2x)^{mt}.       \tag{6}
\]

For \(m=4,t=5\), this is a 45-vertex tree with \(\alpha=24\).  Its last
coefficients include

\[
 a_{21}=1{,}291{,}508,\quad a_{22}=8{,}574,\quad
 a_{23}=148,\quad a_{24}=1,
\]

and therefore

\[
 a_{21}a_{24}=1{,}291{,}508
 >1{,}268{,}952=a_{22}a_{23}.
\]

Thus (TS) fails at \(k=22\), by the exact ratio

\[
 \frac{a_{21}a_{24}}{a_{22}a_{23}}
 =1.017775298041218\ldots .
\]

This is not a unimodality counterexample: the polynomial is unimodal, and
the failure lies well inside the already decreasing tail, since \(L=16\).
An independent replay using both (6) and generic tree dynamic programming
is in `verify_galvin_ts_failure.py`.  A scan of the 196 parameter pairs
\(1\leq m,t\leq14\), \(n\leq500\), finds 97 universal (TS) failures but zero
prefix-(TS) failures.  Within that scan, \(T(4,5)\) is the smallest universal
failure.

## 4. Rooted local lemma

For a rooted tree \(T\) with root \(v\), put

\[
 E=I(T-v),\qquad J=I(T-N[v]),\qquad I=E+xJ.
\]

The following algebraic lemma isolates the remaining rooted obstruction.

**Lemma 4 (rooted update).**  Fix \(k\), and suppose:

\[
\begin{aligned}
e_{k-1}e_{k+2}&\leq e_ke_{k+1},\\
j_{k-2}j_{k+1}&\leq j_{k-1}j_k,\\
j_{k+1}e_{k-1}&\leq j_ke_k,                  \tag{EJ}\\
e_{k+1}i_{k-1}&\leq e_ki_k,                  \tag{IE}_k\\
e_{k+2}i_k&\leq e_{k+1}i_{k+1}.              \tag{IE}_{k+1}
\end{aligned}
\]

Then

\[
i_{k-1}i_{k+2}\leq i_ki_{k+1}.               \tag{7}
\]

**Proof.**  Normalize the local ratios as

\[
\begin{array}{lll}
a=e_k/e_{k-1},&b=e_{k+1}/e_k,&c=e_{k+2}/e_{k+1},\\
u=j_{k-1}/j_{k-2},&v=j_k/j_{k-1},&w=j_{k+1}/j_k,
\end{array}
\]

and let \(t=j_{k-2}/e_{k-1}\).  Define

\[
R_0=\frac{a+tu}{1+t}=\frac{i_k}{i_{k-1}},
\qquad
R_1=\frac{ab+tuv}{a+tu}=\frac{i_{k+1}}{i_k}.
\]

The hypotheses give

\[
c\leq a,\quad w\leq u,\quad w\leq a,\quad
b\leq R_0,\quad c\leq R_1.                  \tag{8}
\]

Also

\[
\frac{i_{k+2}}{i_{k+1}}
=\frac{abc+tuvw}{ab+tuv}.                    \tag{9}
\]

Since \(R_0\) lies between \(a\) and \(u\), (8) gives \(w\leq R_0\).
If \(c\leq R_0\), (9) is already at most \(R_0\).  Assume \(c>R_0\).
The inequality \(c\leq R_1\) implies

\[
tuv\geq c(a+tu)-ab.
\]

It is therefore enough to check

\[
[c(a+tu)-ab](R_0-w)\geq ab(c-R_0).
\]

Using \(b\leq R_0\), this follows from

\[
c(1+t)(R_0-w)-a(c-w)
=w(a-c)+ct(u-w)\geq0.
\]

Hence \(i_{k+2}/i_{k+1}\leq i_k/i_{k-1}\), which is (7).
\(\square\)

At ranks in the required prefix, a simultaneous proof of the rooted
inequalities (IE) and (EJ), together with the two local (TS) hypotheses,
would establish the desired update.  Exact stress tests have found no
failure of (IE) or (EJ), but their preservation under a multi-child product
is not proved.
It is not a purely formal sequence fact: artificial positive sequences
can satisfy all child-level tests while their product fails (EJ).
The missing proof must therefore use a genuinely graphical or acyclic
property.

## 5. Checks and negative controls

- Both known order-26 log-concavity counterexamples satisfy (TS).
- Exact random testing of 5,000 rootings of 2,500 trees, with orders up to
  500, found no (IE) or (EJ) failure.
- A separate exact test of 3,000 random trees/rootings found no (TS)
  failure.
- An evolutionary search over irregular depth-two spine trees reached an
  exact worst ratio

  \[
  \frac{a_{k-1}a_{k+2}}{a_ka_{k+1}}
  =0.9925649751403997
  \]

  at order 1,586, but found no violation.
- (TS) is not a generic graph inequality.  The Bhattacharyya--Kahn
  bipartite construction with

  \[
  i_t=(2^t-1)\binom{95}{t}+\binom{151}{t}
  \]

  violates (TS) at \(k=68\).  This is a useful negative control showing
  that acyclicity, not merely bipartiteness or flag-complex structure, is
  essential.

## 6. Exact remaining obligation

The current proof target is now:

> Prove prefix-(TS) for every tree, together with the first-descent instance
> of (GSB), or replace these with an equivalent no-rebound invariant.

Lemma 4 remains a valid local algebraic tool, but the 45-vertex witness shows
that a universal induction proving (TS) at every rank cannot succeed.
Any use of (IE)/(EJ) must respect the prefix cutoff or provide slack that
hands the remaining ranks to the decreasing-tail theorem.

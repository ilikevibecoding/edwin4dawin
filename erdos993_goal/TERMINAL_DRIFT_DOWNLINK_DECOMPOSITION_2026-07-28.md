# Down-link decomposition of the terminal drift components

Date: 2026-07-28

Status: the decompositions and the rank-two formulas below are proved.
The global component-(B) inequality is now refuted by the rigorous
finite \(m=60\) star-fork certificate, with normalized raw margin
\(-1.6383093053882958\ldots\).  Component (A) and the displayed
variance/covariance identities retain their stated status.  See
`TERMINAL_UPPER_UNIT_ABSORPTION_2026-07-29.md`; that combined
upper-unit inequality is itself refuted at \(m=100\).  This is not a
solution of Erdős Problem 993.

## 1. Setup

Let \(F\) be a forest rooted at \(q\), let

\[
B=I(F;x)=\sum_jb_jx^j,\qquad
C=I(F-q;x)=\sum_jc_jx^j,
\]

and fix \(r\ge2\).  Put

\[
u=r\frac{b_r}{b_{r-1}},\qquad
q_F=1+u-(r+1)\frac{b_{r+1}}{b_r}.
\]

The two sufficient components of terminal drift are

\[
q_F\ge\frac{c_r}{b_r}
\tag{A}
\]

and

\[
r\frac{c_r}{c_{r-1}}\le u+1.
\tag{B}
\]

Choose a uniform independent \((r-1)\)-set \(S\).  Let \(e=e(S)\)
and \(q_{\rm res}=q_{\rm res}(S)\) be the vertex and edge counts in
the residual forest \(F-N[S]\).  Let \(Y\) indicate \(q\in S\), and
let \(L\) indicate that \(q\) is addable when it is absent.

Delete a uniformly random member of \(S\), leaving an independent
\((r-2)\)-set \(K\).  Conditional on \(K\), the deleted vertex is
uniform among the residual vertices of \(F-N[K]\).  Write

\[
A_K=\mathbb E(e\mid K),\qquad
p_K=\mathbb E(Y\mid K).
\]

The law of \(K\) is the natural size-biased down-link law.

## 2. Component (B): rank two plus one covariance

Normalize (B) by the positive probability that a rank-\((r-1)\) set
avoids the root:

\[
\begin{aligned}
M_B(r)
&=(1-\rho_{r-1})
\left(u+1-r\frac{c_r}{c_{r-1}}\right)\\
&=1-\mathbb EY+\operatorname{Cov}(Y,e)
  +\mathbb E((1-Y)L).
\end{aligned}
\tag{1}
\]

On the fiber over \(K\), define

\[
M_B(2,K)
=1-p_K+\operatorname{Cov}(Y,e\mid K)
 +\mathbb E((1-Y)L\mid K).
\]

The law of total covariance gives the exact identity

\[
\boxed{
M_B(r)=\mathbb E M_B(2,K)
       +\operatorname{Cov}(A_K,p_K).
}
\tag{2}
\]

The local rank-two term is explicit.  Put

\[
R_K=F-N[K],\quad
N=|R_K|,\quad M=|E(R_K)|,
\]

and, when the root is present in \(R_K\), let \(D\) be its residual
degree.

* If \(q\in K\), then \(M_B(2,K)=0\).
* If \(q\notin R_K\), then \(M_B(2,K)=1\).
* If \(q\in R_K\), then
  \[
  \boxed{
  M_B(2,K)
  =\frac{2\{N(N-1)+M-ND\}}{N^2}.
  }
  \tag{3}
  \]

Because \(D\le M\le N-1\) in a forest, (3) is nonnegative and in
fact

\[
M_B(2,K)\ge\frac{2(N-1)}{N^2}.
\tag{4}
\]

Thus the only obstruction to proving (B) by rank-two averaging is the
between-fiber covariance in (2).

That covariance is sometimes negative.  Through order 13, 24,147 of
85,052 rooted-rank checks in the branch \(u\ge r\) have negative
covariance, while every full component-(B) margin is nonnegative.

A natural Cauchy--Schwarz sufficient condition,

\[
\{\mathbb E M_B(2,K)\}^2
\ge
\operatorname{Var}(A_K)\operatorname{Var}(p_K),
\tag{5}
\]

holds in every rooted tree through order 13, but is false even in the
required prefix.  Exact residual-state dynamic programming found two
60-vertex witnesses at rank \(19\).  In one,

\[
u=\frac{39460502982931}{1850641900093},
\]

and the ratio of the right side of (5) to the left side is about
\(1.0323\).  Nevertheless,

\[
\mathbb E M_B(2,K)\approx1.0284,\qquad
\operatorname{Cov}(A_K,p_K)\approx-0.0619,
\]

so the true normalized component margin is still approximately
\(0.9665\).  The exact witnesses are stored in
`residual_dp_component_b_n60_operativesign_20260728.json`.

The sharper surviving target is

\[
\boxed{
\mathbb E M_B(2,K)
+2\operatorname{Cov}(A_K,p_K)\ge0
\qquad (u\ge r).
}
\tag{HB}
\]

It leaves half the averaged local reserve after paying a negative
covariance.  There is no failure of (HB) in:

* all 85,052 rooted-rank checks with \(u\ge r\) through tree order 13;
* 2,010 exact rank checks on 60 additional rooted 60-vertex trees,
  including adversarial component-(A) and component-(B) champions.

The second audit uses a three-state tree dynamic program that counts
all residual summaries without enumerating independent sets.  Its
verifier is `audit_residual_dp_component_b_cauchy.py`.  These checks
are evidence, not a proof.

## 3. Component (A): rank two minus one variance

Double counting extensions that produce a rank-\(r\) set avoiding
the root gives

\[
u\frac{c_r}{b_r}
=\mathbb E\{(1-Y)(e-L)\}.
\]

The elementary two-extension identity gives

\[
u q_F=2u+2\mathbb E q_{\rm res}
      -\operatorname{Var}(e).
\]

Consequently the normalized component-(A) margin is

\[
\begin{aligned}
M_A(r)
&=u\left(q_F-\frac{c_r}{b_r}\right)\\
&=u+\mathbb E(Ye)+\mathbb E((1-Y)L)
  +2\mathbb E q_{\rm res}-\operatorname{Var}(e).
\end{aligned}
\tag{6}
\]

Apply the law of total variance over the same down-link fibers.  All
within-fiber terms form the local rank-two component-(A) margin, and
the between-fiber term is exactly \(\operatorname{Var}(A_K)\).  Hence

\[
\boxed{
M_A(r)=\mathbb E M_A(2,K)-\operatorname{Var}(A_K).
}
\tag{7}
\]

Thus (A) has the complementary proof target

\[
\boxed{
\operatorname{Var}(A_K)
\le \mathbb E M_A(2,K).
}
\tag{HA}
\]

Equations (2) and (7) expose a common structure: terminal drift reduces
to rank-two residual forest inequalities plus one martingale
variance/covariance correction.  The executable
`verify_downlink_terminal_drift_components.py` verifies both
decompositions symbolically.

## 4. Adversarial and family checks

Two independent evolutionary searches tested 218,064 rooted
60-vertex trees for each component in the exact required prefix.
Neither found a failure.  Their best margins were approximately

\[
0.906811\quad\text{for (A)},\qquad
0.774521\quad\text{for (B)}.
\]

An exact scan of 8,088,149 required-prefix ranks in the rooted-broom
family

\[
q\text{ with }s\text{ leaf neighbors and one path branch}
\]

also found no failure.  The smallest component-(B) margin was

\[
\frac{15835019}{21221312}
=0.7461847316\ldots
\]

at \(s=4\), path order \(16\), and \(r=6\).  Component (A) was at
least \(1\) throughout that family.  The audit is
`scan_rooted_broom_drift_components.py`.

These tests substantially narrow the remaining terminal-drift proof:
the obstruction is not rank two itself, and it is not a generic
coefficient-ratio phenomenon.  It is the control of the between-fiber
martingale terms (HA) and (HB) by acyclicity.

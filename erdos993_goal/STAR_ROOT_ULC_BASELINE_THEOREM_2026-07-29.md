# ULC Baseline Theorem for the Star-Root Minor

## Status

This note proves that normalized log-concavity of the comparison
polynomial \(K\) is by itself sufficient for the complete star-root
PIRD inequality.  Consequently, every product of positive linear
factors satisfies the desired inequality at every rank.

The actual star-forest polynomial is not always normalized
log-concave.  The theorem therefore isolates its only remaining
obstruction: a rebound in one consecutive normalized coefficient
ratio.

## 1. General coefficient setup

Let

\[
L(x)=(1+x)^M
\]

and let

\[
K(x)=\sum_{j=0}^M K_jx^j
\]

have nonnegative coefficients and \(K_0=1\).  Put

\[
B(x)=(1+x)\bigl(K(x)+xL(x)\bigr).
\]

For \(1\le k<M\), define

\[
\Delta_k=B_{k+1}K_k-B_kK_{k+1}.
\tag{1}
\]

As in the weighted-subset note, let

\[
q_j=\frac{K_j}{\binom Mj},
\qquad
u=q_{k-1},\quad v=q_k,\quad z=q_{k+1},
\]

\[
p=\frac vu,\qquad R=\frac zv,
\]

and

\[
A=\frac{k}{M-k+1},
\quad
\lambda=\frac{k(M-k)}{(k+1)(M-k+1)},
\quad
\theta=\frac{k(M-k)}{(k+1)(M-k+2)}.
\tag{2}
\]

The exact normalized identity is

\[
\frac{\Delta_k}{vL_k^2}
=v\left(1-\lambda\frac Rp\right)
+(1+A)(1-R\theta).
\tag{3}
\]

## 2. Normalized log-concavity

Assume that

\[
q_j^2\ge q_{j-1}q_{j+1}
\qquad(1\le j<M).
\tag{ULC}
\]

Then the consecutive ratios \(q_{j+1}/q_j\) are nonincreasing.
In particular,

\[
p\ge R.
\tag{4}
\]

Since \(q_0=1\), every preceding ratio is at least \(R\), so

\[
v=q_k
=\prod_{j=0}^{k-1}\frac{q_{j+1}}{q_j}
\ge R^k.
\tag{5}
\]

Also,

\[
1-\lambda
=\frac{M+1}{(k+1)(M-k+1)}
=\frac{1+A}{k+1}.
\tag{6}
\]

## 3. The scalar certificate

From (3)--(4),

\[
\frac{\Delta_k}{vL_k^2}
\ge
v(1-\lambda)+(1+A)(1-R\theta).
\tag{7}
\]

If \(R\theta\le1\), both terms on the right are nonnegative and the
first is positive.

Suppose now that \(R\theta>1\).  Then \(R>1\).  Equations (5)--(7)
give

\[
\begin{aligned}
\frac{\Delta_k}{vL_k^2}
&\ge
(1+A)
\left(
\frac{R^k}{k+1}-R\theta+1
\right)
\\
&>
\frac{1+A}{k+1}
\left(R^k-kR+k+1\right),
\end{aligned}
\tag{8}
\]

because

\[
\theta
=\frac{k}{k+1}\frac{M-k}{M-k+2}
<\frac{k}{k+1}.
\]

For \(R\ge1\), the function

\[
f_k(R)=R^k-kR+k+1
\]

is increasing, since

\[
f_k'(R)=k(R^{k-1}-1)\ge0,
\]

and

\[
f_k(1)=2.
\]

Therefore (8) is strictly positive.

We have proved:

> **ULC baseline theorem.** If \(K_0=1\) and the sequence
> \[
> \left(\frac{K_j}{\binom Mj}\right)_{j=0}^M
> \]
> is log-concave, then
> \[
> B_{k+1}K_k-B_kK_{k+1}>0
> \]
> for every \(0\le k\le M\) in the nontrivial support.

The boundary \(k=0\) follows directly, and at \(k=M\) the
\(K_{M+1}\) term vanishes.

## 4. Linear-factor corollary

Let

\[
K(x)=\prod_{i=1}^M(1+w_ix),
\qquad w_i>0.
\tag{9}
\]

Then \(K_j=e_j(w_1,\dots,w_M)\).  Newton's inequalities say exactly
that

\[
\frac{e_j(w)}{\binom Mj}
\]

is log-concave.  The ULC baseline theorem therefore gives:

> **Linear-factor corollary.** For arbitrary positive
> \(w_1,\dots,w_M\), the polynomial (9) satisfies every star-root
> PIRD minor.

In particular, replacing the star-forest polynomial by its
centre-relaxed part

\[
U(x)=\prod_i(1+x)^{a_i}
\]

is trivial, and the more informative mixed linearization

\[
U(x)=(1+2x)^s(1+x)^a
\]

for the family \((1^s,a)\) is also completely covered.

## 5. Exact defect identity for actual star branches

For the true polynomial

\[
K(x)=\prod_i\bigl((1+x)^{a_i}+x\bigr),
\]

normalized log-concavity can fail.  Write (3) instead as

\[
\begin{aligned}
\frac{\Delta_k}{vL_k^2}
&=
\underbrace{
v(1-\lambda)+(1+A)(1-R\theta)
}_{\text{ULC baseline}}
\\
&\qquad
-\underbrace{
v\lambda\left(\frac Rp-1\right)
}_{\text{ratio-rebound debt}}.
\end{aligned}
\tag{10}
\]

The debt is positive only when \(R>p\).  Thus every deviation from
the theorem is captured by one scalar quantity.

The root-Maclaurin inequality

\[
q_k\ge R^k
\tag{11}
\]

is a theorem, not an additional conjecture.  Fisher and Ryan proved
that if \(c_j(G)\) is the number of \(j\)-cliques of a graph with
clique number \(\omega\), then

\[
\left(\frac{c_1(G)}{\binom\omega1}\right)
\ge
\left(\frac{c_2(G)}{\binom\omega2}\right)^{1/2}
\ge\cdots\ge
\left(\frac{c_\omega(G)}{\binom\omega\omega}\right)^{1/\omega}.
\tag{FR}
\]

Apply this theorem to the complement of the star forest.  Its
\(j\)-cliques are the independent \(j\)-sets counted by \(K_j\), and
its clique number is the independence number \(M\).  Therefore

\[
q_k^{1/k}\ge q_{k+1}^{1/(k+1)}.
\]

Since \(q_{k+1}=Rq_k\), this rearranges exactly to (11).

Primary source:

D. C. Fisher and J. Ryan, *Bounds on the number of complete
subgraphs*, Discrete Mathematics 103 (1992), 313--320,
doi:10.1016/0012-365X(92)90323-8.

Consequently, the sole sufficient payment inequality in rebound cases
is

\[
\boxed{
(1+A)
\left(
\frac{R^k}{k+1}-R\theta+1
\right)
\ge
v\lambda\left(\frac Rp-1\right).
}
\tag{12}
\]

`probe_star_root_ulc_defect_payment.py` checked (11)--(12) on every
needed prefix rank through rooted-tree order \(50\):

- branch multisets: \(173{,}525\);
- prefix ranks \(r=k+1\ge6\): \(2{,}371{,}672\);
- genuine ratio rebounds \(R>p\): \(169{,}721\);
- Fisher--Ryan/root-Maclaurin consistency failures: \(0\);
- payment failures: \(0\).

The smallest payment ratio in (12) was approximately

\[
52.82287.
\]

Report:

`star_root_ulc_defect_payment_r6_n50_20260729.json`.

The Fisher--Ryan theorem proves (11) universally.  The finite evidence
is needed only for (12).  It shows that after removing the ULC
baseline, the remaining star-centre defect is more than fifty times
smaller than the available certified lower reserve in the tested
range.

## 6. Next proof obligation

Prove the ratio-rebound payment (12).  Its quantities have exact
interpretations under the weighted-subset measure

\[
\mathbb P_j(S)\propto2^{m(S)}
\]

from the preceding note.  The Fisher--Ryan theorem has removed the
root-Maclaurin obligation, leaving a quantitative one-step evolution
statement for that measure.

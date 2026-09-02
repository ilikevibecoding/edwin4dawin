# QPIRD as Marked-Hit Growth and an Extension Covariance

## Status

This note gives two exact probabilistic forms of quantitative PIRD.
They turn the coefficient inequality into a rank-to-rank growth law
for hitting a marked root--isolate pair, and then into one covariance
bound for the residual extension count.

All equivalences below are proved.  The final forest covariance
inequality is false: the exact rooted-tree construction in
`QPIRD_AND_HALF_PAYMENT_COUNTEREXAMPLE_2026-07-29.md` violates it at
an operative rank.  The corresponding ordinary PIRD/covariance
inequality remains positive there.

## 1. The marked graph

Let \(R\) be rooted at \(q\), add an isolated vertex \(z\), and put

\[
F=R\sqcup\{z\},\qquad W=\{q,z\}.
\]

Write

\[
b_k=i_k(F),\qquad
c_k=i_k(F-W).
\]

This is exactly the QPIRD setup:

\[
B(x)=I(F;x),\qquad C(x)=I(F-W;x).
\]

For a uniform \(S\in\mathcal I_k(F)\), define

\[
X(S)=1_{\{S\cap W\ne\varnothing\}},
\qquad
\theta_k=\mathbb E_kX
=1-\frac{c_k}{b_k}.
\tag{1}
\]

Let

\[
\mu_k=(k+1)\frac{b_{k+1}}{b_k}
\tag{2}
\]

be the mean number of one-vertex extensions of a uniform independent
\(k\)-set in \(F\).  Also put

\[
\omega_k=(k+1)\frac{c_{k+1}}{c_k},
\tag{2a}
\]

the corresponding extension mean in the avoiding forest \(F-W\).

Dividing QPIRD by \(b_kc_k\) gives its shortest equivalent form:

\[
\boxed{
\mu_k-\omega_k\ge\theta_k.
}
\tag{EM}
\]

Thus adjoining the marked root--isolate pair must raise the extension
mean by at least the probability that the current set uses that pair.

## 2. Exact logistic-growth form

The PIRD minor is

\[
\begin{aligned}
\Delta_k
&=b_{k+1}c_k-b_kc_{k+1}\\
&=b_kb_{k+1}(\theta_{k+1}-\theta_k).
\end{aligned}
\tag{3}
\]

Also,

\[
c_k(b_k-c_k)
=b_k^2\theta_k(1-\theta_k).
\tag{4}
\]

Consequently the one-unit reserve

\[
(k+1)\Delta_k\ge c_k(b_k-c_k)
\]

is exactly

\[
\boxed{
\mu_k(\theta_{k+1}-\theta_k)
\ge
\theta_k(1-\theta_k).
}
\tag{MHG}
\]

Thus QPIRD says that, on the increasing branch, the marked-hit
probability grows by at least its Bernoulli variance divided by the
mean number of available extensions.

## 3. Extension-edge double count

For \(S\in\mathcal I_k(F)\), let

\[
e(S)=
\#\{v\notin S:S\cup\{v\}\in\mathcal I_{k+1}(F)\}
\tag{5}
\]

and, when \(X(S)=0\), let

\[
a_W(S)=
\#\{v\in W:S\cup\{v\}\in\mathcal I_{k+1}(F)\}.
\tag{6}
\]

Every rank-\((k+1)\) independent set has exactly \(k+1\)
predecessors.  Counting extension edges whose upper set hits \(W\)
therefore gives

\[
\mu_k\theta_{k+1}
=
\mathbb E_k\!\left[
X e+(1-X)a_W
\right].
\tag{7}
\]

Since \(\mu_k=\mathbb E_ke\), subtracting
\(\mu_k\theta_k\) yields

\[
\boxed{
\mu_k(\theta_{k+1}-\theta_k)
=
\operatorname{Cov}_k(e,X)
+\mathbb E_k\{(1-X)a_W\}.
}
\tag{8}
\]

Combining (MHG) and (8), QPIRD is equivalent to

\[
\boxed{
\operatorname{Cov}_k(e,X)
+\mathbb E_k\{(1-X)a_W\}
\ge
\operatorname{Var}_k(X).
}
\tag{COV}
\]

This identity makes the obstruction transparent.  Sets already
hitting \(W\) may have fewer available extensions, producing a
negative covariance.  The extensions into the marked set must pay
that deficit together with one Bernoulli-variance unit.

## 4. The isolated vertex removes one full unit

When \(X=0\), the isolated vertex \(z\) is always addable.  The root
\(q\) is additionally addable precisely when
\(S\cap N_R(q)=\varnothing\).  Put

\[
\gamma_k
=
\Pr_k\bigl(
X=0\ \hbox{and}\ q\hbox{ is addable}
\bigr).
\tag{9}
\]

Then

\[
\mathbb E_k\{(1-X)a_W\}
=(1-\theta_k)+\gamma_k.
\tag{10}
\]

Since

\[
(1-\theta_k)-\theta_k(1-\theta_k)
=(1-\theta_k)^2,
\]

the exact remaining forest inequality is

\[
\boxed{
\operatorname{Cov}_k(e,X)
+\gamma_k
+(1-\theta_k)^2
\ge0.
}
\tag{FCOV}
\]

The square comes entirely from the guaranteed isolated-vertex
extension.  The \(\gamma_k\) term is the additional root-availability
reserve.

There is a useful conditional simplification.  Let \(m_0\) be the
mean of \(e(S)\) conditioned on \(X=0\).  An avoiding set has

- \(\omega_k\) mean extensions inside \(F-W\);
- the isolated vertex \(z\) as one guaranteed extension; and
- the root \(q\) as an extension with conditional probability
  \(\gamma_k/(1-\theta_k)\).

Hence

\[
m_0
=
\omega_k+1+
\frac{\gamma_k}{1-\theta_k}.
\tag{11}
\]

Moreover,

\[
\operatorname{Cov}(e,X)
=(1-\theta_k)(\mu_k-m_0).
\tag{12}
\]

Substitution of (11)--(12) into (FCOV) cancels the root-availability
term and recovers exactly

\[
\mu_k-\omega_k-\theta_k\ge0.
\]

Thus the covariance and extension-mean forms are identities of the
same target, not separate sufficient estimates.

## 5. Switching interpretation

The right proof object is the bipartite graph of one-vertex extension
edges between \(\mathcal I_k(F)\) and
\(\mathcal I_{k+1}(F)\).

- The upper endpoint is uniform because every upper set has exactly
  \(k+1\) predecessors.
- The lower endpoint is biased by \(e(S)\).
- The term \(\operatorname{Cov}(e,X)\) measures the difference
  between that extension-biased lower law and the uniform lower law.
- The marked edges from an avoiding set are counted by
  \((1-X)a_W\).

A proof of (FCOV) may therefore switch complete connected components
of the symmetric difference between a hit set and an avoiding set.
The complete-orbit qualification is essential: previous Bencs
componentwise extractions have explicit forest counterexamples.

The operative condition \(b_{k+1}\ge b_k\) is
\(\mu_k\ge k+1\).  It must be retained in any switching or covariance
argument; unrestricted QPIRD is not asserted.

## 6. Independent verification

The symbolic portion of
`verify_rooted_forest_two_ratio_dominance.py` checks the equivalence
between QPIRD and \(v-w-1\ge0\).

`verify_qpird_marked_hit_covariance.py` independently enumerates the
extension-edge layers of every rooted tree through order \(10\).  It
checks (3)--(12) exactly on \(12{,}432\) rooted rank layers and checks
QPIRD on \(6{,}660\) operative layers, with no failure.  Its report is
`qpird_marked_hit_covariance_n10_20260729.json`.

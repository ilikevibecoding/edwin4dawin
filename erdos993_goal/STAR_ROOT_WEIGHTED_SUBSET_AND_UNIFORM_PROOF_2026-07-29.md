# Star-Root Weighted-Subset Formula and Uniform-Branch Theorem

## Status

This note proves three exact facts for the star-root base of prefix
isolated-root ratio dominance:

1. a weighted-subset representation of the star-forest coefficients;
2. a universal factor-two bound between consecutive normalized
   coefficients;
3. the complete PIRD inequality, at every rank, when all star branches
   have one leaf.

It also rewrites the remaining general inequality as one explicit
reserve comparison.  The general star-root case is not proved here.

## 1. Setup

Let the branches at the distinguished root have leaf counts
\(a_1,\dots,a_s\ge1\).  Put

\[
M=\sum_{i=1}^s a_i,\qquad
S_a(x)=(1+x)^a+x,
\]

\[
K(x)=\prod_{i=1}^s S_{a_i}(x),\qquad
L(x)=(1+x)^M,
\]

and

\[
B(x)=(1+x)\bigl(K(x)+xL(x)\bigr).
\]

The star-root PIRD minor is

\[
\Delta_k=B_{k+1}K_k-B_kK_{k+1}.
\tag{1}
\]

Direct expansion gives

\[
\Delta_k
=K_k^2-K_{k-1}K_{k+1}
+K_k(L_k+L_{k-1})
-K_{k+1}(L_{k-1}+L_{k-2}),
\tag{2}
\]

where coefficients with negative indices are zero.

## 2. A weighted-subset model for \(K_j\)

Partition a set of \(M\) leaves into labelled blocks
\(V_1,\dots,V_s\), where \(|V_i|=a_i\), and choose one canonical leaf
\(c_i\in V_i\) in every block.  For a leaf subset \(S\), define

\[
m(S)=
\#\{i:S\cap V_i=\{c_i\}\}.
\tag{3}
\]

Then

\[
\boxed{
K_j=\sum_{\substack{S\subseteq[M]\\|S|=j}}2^{m(S)}.
}
\tag{4}
\]

To prove (4), take an independent \(j\)-set in the disjoint union of
the \(s\) stars.  Replace every selected star centre by its canonical
leaf.  This produces a \(j\)-subset \(S\) of the leaves.

For a fixed \(S\), every block whose intersection is exactly its
canonical singleton has two preimages: the canonical leaf or the star
centre.  Every other block has one preimage.  Hence the fibre over
\(S\) has size \(2^{m(S)}\), proving (4).

Since \(L_j=\binom Mj\), define

\[
q_j=\frac{K_j}{L_j}.
\tag{5}
\]

Equation (4) says equivalently that

\[
\boxed{
q_j=\mathbb E_j[2^{m(S)}],
}
\tag{6}
\]

where \(S\) is a uniformly random \(j\)-subset of the \(M\) leaves.

## 3. A universal factor-two theorem

Couple a uniform \(j\)-subset \(S\) to a uniform
\((j+1)\)-subset by choosing a uniformly random leaf
\(e\notin S\) and setting \(T=S\cup\{e\}\).  The resulting \(T\) is
uniform because every \((j+1)\)-set has exactly \(j+1\) preimages.

The weight multiplier is pointwise one of

\[
\frac{2^{m(T)}}{2^{m(S)}}\in\left\{\frac12,1,2\right\}.
\tag{7}
\]

Indeed, the multiplier is \(2\) when \(e\) is the canonical leaf of
an empty block, \(1/2\) when \(S\) contains only the canonical leaf of
that block and \(e\) is another leaf of it, and \(1\) otherwise.

Taking expectations in (7) gives:

> **Factor-two theorem.** For every star-branch list and every
> \(0\le j<M\),
> \[
> \boxed{
> \frac12q_j\le q_{j+1}\le2q_j.
> }
> \tag{8}
> \]

Both constants are intrinsic to the local coupling.  The upper
constant is attained by the all-one branch family, where \(q_j=2^j\).

## 4. Exact normalized form of the remaining inequality

Fix \(1\le k<M\), and write

\[
u=q_{k-1},\qquad v=q_k,\qquad z=q_{k+1},
\]

\[
A=\frac{k}{M-k+1},\quad
D=\frac{M-k}{k+1},\quad
C=\frac{k-1}{M-k+2},
\]

\[
\lambda=AD,\qquad
\theta=\frac{k(M-k)}{(k+1)(M-k+2)}.
\tag{9}
\]

Substitution of \(K_j=q_jL_j\) into (2) gives

\[
\boxed{
\frac{\Delta_k}{L_k^2}
=v^2-uz\lambda
+v(1+A)\left(1-\frac zv\theta\right).
}
\tag{10}
\]

If

\[
p=\frac vu,\qquad R=\frac zv,
\]

then (10) is

\[
\boxed{
\frac{\Delta_k}{vL_k^2}
=v\left(1-\lambda\frac Rp\right)
+(1+A)(1-R\theta).
}
\tag{11}
\]

The only hard regime is \(R\theta>1\), when the second term is
negative.  In that regime the exact required comparison is

\[
\boxed{
v\left(1-\lambda\frac Rp\right)
\ge(1+A)(R\theta-1).
}
\tag{12}
\]

After clearing the normalization, (12) is simply

\[
\boxed{
K_k^2-K_{k-1}K_{k+1}
\ge
K_{k+1}(L_{k-1}+L_{k-2})
-K_k(L_k+L_{k-1}).
}
\tag{13}
\]

Thus the remaining problem asks whether the ordinary
log-concavity gap of \(K\) always pays the adverse linear term.

## 5. Complete proof for uniform one-leaf branches

Suppose

\[
a_1=\cdots=a_s=1.
\]

Then \(M=s\) and

\[
K(x)=(1+2x)^s,\qquad L(x)=(1+x)^s.
\tag{14}
\]

For \(1\le k\le s-1\),

\[
K_k=2^k\binom sk.
\]

The normalized log-concavity gap is

\[
\frac{K_k^2-K_{k-1}K_{k+1}}{K_k^2}
=
\frac{s+1}{(k+1)(s-k+1)}.
\tag{15}
\]

The normalized linear term in (2) is

\[
\begin{aligned}
&\frac{
K_k(L_k+L_{k-1})
-K_{k+1}(L_{k-1}+L_{k-2})
}{K_k^2}
\\
&\qquad=
2^{-k}\frac{s+1}{s-k+1}
\left(
1-\frac{2k(s-k)}{(k+1)(s-k+2)}
\right).
\end{aligned}
\tag{16}
\]

Combining (15)--(16) yields

\[
\frac{\Delta_k}{K_k^2}
=
\frac{s+1}{(k+1)(s-k+1)}Q_{s,k},
\tag{17}
\]

where

\[
Q_{s,k}
=1+2^{-k}
\left(
(k+1)-\frac{2k(s-k)}{s-k+2}
\right).
\tag{18}
\]

Because

\[
\frac{s-k}{s-k+2}<1,
\]

we have

\[
Q_{s,k}
>
1-\frac{k-1}{2^k}
>0.
\tag{19}
\]

At \(k=0\), direct substitution gives \(\Delta_0=2\).  At \(k=s\),
\(K_{s+1}=0\), so \(\Delta_s=B_{s+1}K_s>0\); beyond the support the
minor is zero.  Therefore:

> **Uniform-branch theorem.** If every star branch has exactly one
> leaf, then
> \[
> B_{k+1}K_k-B_kK_{k+1}\ge0
> \]
> at every rank \(k\ge0\), with strict inequality throughout the
> nontrivial support.

This is an infinite exact subfamily of the star-root base, not a
finite computation.

## 6. Exact reserve scan

`scan_star_root_reserve_ratio.py` measures, whenever the linear term
in (2) is negative, the exact safety factor

\[
\mathcal R_k=
\frac{K_k^2-K_{k-1}K_{k+1}}
{K_{k+1}(L_{k-1}+L_{k-2})-K_k(L_k+L_{k-1})}.
\tag{20}
\]

Through rooted-tree order \(50\), the scan covered:

- \(173{,}525\) branch multisets;
- \(5{,}283{,}529\) rank checks at the needed ranks \(r=k+1\ge6\);
- \(119{,}142\) cases with a negative linear term;
- \(108{,}278\) such cases lying on the coefficient prefix;
- no PIRD failure.

The smallest prefix reserve factor was

\[
\mathcal R_5
=
\frac{37{,}768{,}904{,}238}{4{,}406{,}666{,}957}
\approx8.570855,
\tag{21}
\]

for the branch list consisting of eighteen \(1\)'s and one \(12\).
The resulting PIRD margin was

\[
\Delta_5=400{,}346{,}847{,}372>0.
\]

Report:

`star_root_reserve_ratio_r6_n50_20260729.json`.

These finite checks are evidence, not a proof.  Their main analytic
value is that they identify the mixed family

\[
(1,\dots,1,a)
\]

as the present extremal candidate at the first required rank.

## 7. Asymptotic reserve for one large branch

The finite extremal candidate has the form \((1^s,a)\), for which

\[
K(x)=(1+2x)^s\bigl((1+x)^a+x\bigr).
\tag{22}
\]

Fix \(k\), and let

\[
s=\alpha n+O(1),\qquad
a=\beta n+O(1),
\qquad \alpha,\beta>0.
\]

For every fixed \(j\),

\[
K_j=
\frac{(2\alpha+\beta)^j}{j!}n^j+O(n^{j-1}),
\qquad
L_j=
\frac{(\alpha+\beta)^j}{j!}n^j+O(n^{j-1}).
\tag{23}
\]

The additional summand \(x(1+2x)^s\) in (22) has degree only
\(j-1\) in the scale parameter at coefficient \(j\), so it does not
alter the leading term in (23).

Put

\[
c=\frac{2\alpha+\beta}{\alpha+\beta}\in(1,2).
\tag{24}
\]

Equation (23) gives

\[
K_k^2-K_{k-1}K_{k+1}
=
\frac{K_k^2}{k+1}+O(n^{2k-1}),
\tag{25}
\]

and

\[
\begin{aligned}
&K_{k+1}(L_{k-1}+L_{k-2})
-K_k(L_k+L_{k-1})
\\
&\qquad=
K_kL_k
\left(\frac{kc}{k+1}-1\right)
+O(n^{2k-1}).
\end{aligned}
\tag{26}
\]

Thus, when the linear term is asymptotically adverse, namely
\(c>(k+1)/k\), its reserve ratio has the exact limit

\[
\boxed{
\lim_{n\to\infty}\mathcal R_k
=
\frac{c^k}{kc-(k+1)}.
}
\tag{27}
\]

For \(k\ge3\), the right side is minimized over the adverse interval
at

\[
c_*=\frac{k+1}{k-1},
\]

with minimum

\[
\boxed{
\left(\frac{k+1}{k-1}\right)^{k-1}.
}
\tag{28}
\]

At the first required index \(k=5\), this limiting floor is

\[
\left(\frac64\right)^4=\frac{81}{16}=5.0625.
\tag{29}
\]

The exact scan `scan_star_root_one_large_family.py` checked
\(998{,}994\) pairs \(1\le s\le1000\), \(2\le a\le1000\) at
\(k=5\), with no failure.  Its minimum occurred at
\((s,a)=(1000,998)\) and was

\[
\mathcal R_5\approx5.097035,
\]

consistent with convergence to (29).

Report:

`star_root_one_large_s1000_a1000_k5_20260729.json`.

Consequently, the apparent deterioration from \(8.57\) at order
\(50\) is understood: it approaches a positive floor above \(5\),
not the failure threshold \(1\), in the candidate extremal scaling
regime.

## 8. Next proof target

The next useful finite theorem would prove (13) for every mixed family
\((1^s,a)\), then show that adding further nontrivial blocks cannot
lower the reserve below that family.  A direct monotonicity under
splitting a block is false, so such a comparison must retain more
information than the branch partition alone.

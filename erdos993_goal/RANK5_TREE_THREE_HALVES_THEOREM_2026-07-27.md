# Rank-5 three-halves theorem for trees

Date: 2026-07-27

Status: **proved theorem, internally and exactly verified**.  This is a
fixed-rank advance toward Erdős Problem 993, not a resolution of the
full all-rank conjecture.

## Theorem

For every tree \(T\) of order at least \(10\), writing
\(i_j=i_j(T)\),

\[
\boxed{
Q_5(I(T))
=10i_5^2-i_4i_5-12i_4i_6
\ge0.
}
\tag{1}
\]

In particular,

\[
5i_5^2\ge6i_4i_6,
\]

so the factorially normalized independence sequence is log-concave at
rank \(5\).

## 1. Exact leaf identity

Let \(B\) be a tree, root it at \(p\), and obtain \(G\) by adjoining a
new leaf at \(p\).  Put

\[
a=i_4(B),\quad b=i_5(B),\quad
d=i_3(B-p),\quad e=i_4(B-p),\quad f=i_5(B-p).
\]

Then

\[
Q_5(G)-Q_5(B)
=\frac daQ_5(B)+\frac{\mathcal M(B,p)}{5ad},
\tag{2}
\]

where

\[
\begin{aligned}
\mathcal M(B,p)={}&
6a(a+d)(8e^2-de-10df)\\
&+ade(a+d+2e)+2a^2e^2
-50(bd-ae)^2.
\end{aligned}
\tag{3}
\]

Thus leaf induction reduces to proving
\(\mathcal M(B,p)\ge0\) at a suitable terminal root.

## 2. Terminal structure

Choose an endpoint \(\ell\) of a diameter of \(G\), let \(p\) be its
neighbor, and put \(B=G-\ell\).  In \(B\), the vertex \(p\) has at most
one nonleaf neighbor: two such neighbors would extend to a path longer
than the chosen diameter.

If \(p\) has no nonleaf neighbor, then \(B\) is a star centered at
\(p\).  With \(s\) leaves, direct factorization gives

\[
\mathcal M(B,p)=
\frac{
5s^4(s-3)^2(s-2)^4(s-1)^4(s+1)
}{82944}\ge0.
\tag{4}
\]

Otherwise, let \(q\) be the unique nonleaf neighbor of \(p\).  The
remaining neighbors of \(p\) are \(s\) sibling leaves.  If \(C\) is the
component of \(B-p\) containing \(q\), then

\[
B-p=sK_1\sqcup C,\qquad
B-N[p]=C-q.
\tag{5}
\]

## 3. The no-sibling payment

Suppose first that \(s=0\) and \(|C|\ge13\).  Write

\[
d=i_3(C),\ e=i_4(C),\ f=i_5(C),\qquad
h=i_3(C-q),\ k=i_4(C-q).
\]

Normalize

\[
X=\frac de,\quad
D=1-\frac{df}{e^2},\quad
r=\frac hd,\quad q_0=\frac ke.
\]

The previously proved structural theorems give

\[
0\le X\le1,\qquad
\frac{2+X}{10}\le D\le1,
\tag{6}
\]

\[
\frac12\le r,q_0\le1,\qquad
q_0\ge r-\frac D2.
\tag{7}
\]

Here:

- \(X\le1\) is the forest coefficient theorem \(i_4\ge i_3\) for
  order at least \(12\);
- the lower bound on \(D\) is exactly the proved rank-4 reserve;
- \(r,q_0\ge1/2\) follow from the low-rank forest bounds and deletion;
- the last inequality is the rooted cross-drop theorem.

The normalized algebra lemma proves that (6)--(7) imply

\[
\mathcal M(B,p)=5e^4\Phi(X,D,r,q_0)\ge0.
\tag{8}
\]

All eight endpoint polynomials in that lemma have nonnegative exact
tensor-Bernstein coefficients.

## 4. Sibling leaves

For \(D_s=(1+x)^sI(C;x)\), let \(M_s\) denote (3) after substituting

\[
B-p=sK_1\sqcup C,\qquad B-N[p]=C-q.
\]

The isolate-payment theorem proves

\[
M_s\ge M_0\qquad(|C|\ge13,\ s\ge0).
\tag{9}
\]

Its proof checks every forward difference

\[
\Delta^jM_0\ge0\qquad(1\le j\le15)
\]

using 2,380,894 exact rational Bernstein coefficients.
Combining (8) and (9) gives \(\mathcal M(B,p)\ge0\) for every
large core and any number of sibling leaves.

For rooted cores of orders \(1\) through \(12\), exhaustive exact
enumeration checks \(M_1\ge0\) and all fifteen forward differences.
There are 11,006 rooted cores and no failure.  Therefore

\[
M_s\ge0\qquad(1\le|C|\le12,\ s\ge1).
\tag{10}
\]

The remaining core of order zero is the star case (4).

## 5. Finite base and induction

Every unlabeled tree of orders \(10\) through \(14\) was checked
exactly:

\[
\begin{array}{c|rrrrr}
n&10&11&12&13&14\\ \hline
\#\text{trees}&106&235&551&1301&3159\\
\min Q_5&12&1440&10355&43690&144609.
\end{array}
\tag{11}
\]

Now let \(|G|\ge15\), choose the diameter endpoint \(\ell\) as above,
and put \(B=G-\ell\).  By induction \(Q_5(B)\ge0\).

The terminal classification gives \(\mathcal M(B,p)\ge0\):

- a star is handled by (4);
- a core of order at least \(13\) is handled by (8)--(9);
- a core of order at most \(12\) with \(s\ge1\) is handled by (10);
- if \(s=0\) and \(|C|\le12\), then
  \(|G|=|C|+2\le14\), already covered by (11).

Equation (2) therefore gives

\[
Q_5(G)\ge Q_5(B)\ge0.
\]

This completes the induction and proves (1).

## Exact verification

The proof is split into small, independently replayable certificates:

```powershell
python .\verify_rank5_leaf_induction_reduction.py --identity-only
python .\verify_rank5_normalized_algebra_lemma.py
python .\verify_forest_rank34_monotonicity.py
python .\verify_rank5_cross_drop_certificate.py
python .\verify_rank2_factorial_curvature_forests.py
python .\verify_rank5_isolate_payment_low_differences.py
python .\verify_rank5_isolate_payment_curvature_cone.py
python .\verify_rank5_small_core_isolate_payments.py
python .\verify_rank5_tree_q5_finite_base.py
python .\verify_rank5_terminal_payment_assembly.py
```

The finite rooted cross-drop audit can be regenerated with

```powershell
python .\scan_rank5_cross_drop_finite.py `
  --min-order 13 --max-order 19 `
  --out rank5_cross_drop_finite_n19_20260727.json
```

# Binomially Normalized Central Convolution

## Status

This note proves the convolution theorem needed to combine the
homogeneous bivariate slices in the one-deep-branch PIRD problem.  It
replaces ultra-log-concavity by the strictly weaker property that
binomially normalized coefficients increase toward the centre.

The convolution theorem is complete.  The remaining graph-theoretic
obligation is to prove the corresponding prefix property for the one
arbitrary rooted inward factor.

## 1. Central-binomial unimodality

Let \(a=(a_0,\ldots,a_m)\) be a nonnegative symmetric sequence.  Say
that \(a\) is **binomially central** of order \(m\) if

\[
\frac{a_i}{\binom mi}
\le
\frac{a_{i+1}}{\binom m{i+1}}
\qquad(0\le i<m/2).
\tag{BC}
\]

This is weaker than ultra-log-concavity.  In coefficient-cleared form,

\[
(m-i)a_i\le(i+1)a_{i+1}.
\tag{1}
\]

For \(0\le s\le\lfloor m/2\rfloor\), define the central binomial band

\[
\mathcal B_{m,s}(i)
=
\binom mi\,1_{\{s\le i\le m-s\}}.
\tag{2}
\]

Every binomially central sequence has the unique conic decomposition

\[
a_i
=
\sum_{s=0}^{\lfloor m/2\rfloor}
\delta_s\mathcal B_{m,s}(i),
\qquad
\delta_s=
\frac{a_s}{\binom ms}
-
\frac{a_{s-1}}{\binom m{s-1}}
\ge0,
\tag{3}
\]

where the term with \(s-1=-1\) is zero.

## 2. Convolution theorem

> **Theorem.**  If \(a\) and \(b\) are binomially central symmetric
> sequences of orders \(m\) and \(n\), then their convolution
> \[
> h_k=\sum_i a_i b_{k-i}
> \]
> is binomially central of order \(N=m+n\).

By (3) and bilinearity, it is enough to prove the theorem when

\[
a=\mathcal B_{m,s},\qquad b=\mathcal B_{n,t}.
\tag{4}
\]

Let \(X,Y\) be disjoint sets of sizes \(m,n\), and choose a uniform
\(k\)-subset \(S\subseteq X\sqcup Y\).  Then

\[
\frac{h_k}{\binom Nk}
=
\Pr\left(
\begin{array}{c}
s\le|S\cap X|\le m-s,\\
t\le|S\cap Y|\le n-t
\end{array}
\right)
=:p_k.
\tag{5}
\]

It remains to prove \(p_{k+1}\ge p_k\) for \(k<N/2\).

Orient every edge of the Boolean lattice from a \(k\)-set to a
\((k+1)\)-set.  Let \(I\) be the number of edges entering the event
in (5), and \(O\) the number leaving it.  Since

\[
(N-k)\binom Nk=(k+1)\binom N{k+1},
\]

double counting the layer edges gives

\[
(N-k)\binom Nk\,(p_{k+1}-p_k)=I-O.
\tag{6}
\]

Consider the boundary in the \(X\)-coordinate.  An entering edge has
\(|S\cap X|=s-1\), whereas a leaving edge has
\(|S\cap X|=m-s\).  Consequently their numbers are

\[
\begin{aligned}
I_X
&=
s\binom ms
\binom n{k-s+1},\\
O_X
&=
s\binom ms
\binom n{k-m+s},
\end{aligned}
\tag{7}
\]

whenever the displayed \(Y\)-coordinate lies in \([t,n-t]\); otherwise
the corresponding term is zero.

If \(O_X\ne0\), put

\[
y_-=k-m+s,\qquad y_+=k-s+1.
\]

Then \(y_+>y_-\), while

\[
y_++y_-=2k-m+1\le n
\tag{8}
\]

because \(2k\le N-1\).  Moreover \(y_+\le n-t\).  Indeed, if
\(y_+\ge n-t+1\), then

\[
k\ge n+s-t.
\tag{9}
\]

The feasibility of the leaving edge also gives

\[
k\ge m-s+t.
\tag{10}
\]

Equations (9)--(10), together with \(2k\le m+n-1\), would imply both

\[
m-2s+2t\ge n+1
\quad\hbox{and}\quad
m-2s+2t\le n-1,
\]

a contradiction.  Thus the entering term in (7) is feasible.
Because two binomial coefficients increase as their indices move
toward the centre, (8) gives

\[
\binom n{y_+}\ge\binom n{y_-},
\]

and hence \(I_X\ge O_X\).

The identical argument with \(X,Y\) interchanged proves
\(I_Y\ge O_Y\).  Therefore \(I\ge O\), and (6) gives
\(p_{k+1}\ge p_k\).  This proves the theorem.

## 3. The rooted-tree local factor

Let \(T\) be rooted at \(q\), and put

\[
E=I(T-q;x),\qquad J=I(T-N[q];x),\qquad P=E+xJ.
\]

The bivariate factor produced by allowing the root in at most one of
two independent sets is

\[
\boxed{
F_{T,q}(x,y)
=
E(x)E(y)+xJ(x)E(y)+yE(x)J(y).
}
\tag{11}
\]

Equivalently, \(F_{T,q}\) is the bivariate independence polynomial of
two copies of \(T\) joined by an edge between their roots, where \(x\)
and \(y\) record the sizes in the two copies.

For fixed total degree \(d\), write

\[
f_i^{(d)}=[x^iy^{d-i}]F_{T,q}.
\]

The exact local statement suggested by the one-deep reduction is

\[
\boxed{
(d-i)f_i^{(d)}
\le
(i+1)f_{i+1}^{(d)}
\qquad
\left(0\le i<\frac d2\right).
}
\tag{RBC}
\]

In coefficients,

\[
f_i^{(d)}
=
P_iE_{d-i}+E_iP_{d-i}-E_iE_{d-i}.
\tag{12}
\]

Every star factor already satisfies (RBC), because its homogeneous
slices were proved symmetric ULC in
`STAR_ROOT_DIAGONAL_RESERVE_REDUCTION_2026-07-29.md`.
The convolution theorem now shows that whenever the inward factor
(11) satisfies (RBC) on a chosen homogeneous slice, convolution with
any number of star-factor slices preserves (RBC) on the combined
slice.

At even total degree \(2k\), (RBC) gives the quantitative central
reserve

\[
f_{k-1}^{(2k)}
\le
\frac{k}{k+1}f_k^{(2k)}.
\tag{13}
\]

There is an exact GSB-cascade form of this central comparison.  Put

\[
Q=xJ=P-E
\]

and, for a polynomial \(W=\sum w_jx^j\), write

\[
\mathcal G_k(W)
=kw_k^2+w_{k-1}w_k-(k+1)w_{k-1}w_{k+1}.
\]

Direct polarization gives

\[
\boxed{
k f_k^{(2k)}-(k+1)f_{k-1}^{(2k)}
=
\mathcal G_k(P)-\mathcal G_k(Q)
-E_kP_{k-1}-E_{k-1}Q_k.
}
\tag{14}
\]

Thus prefix (RBC) is a concrete rank-shifting reserve cascade: the
GSB reserve of the rooted tree must dominate the shifted reserve of
its root-present phase together with two explicit positive boundary
payments.  Identity (14) explains both why forest structure is
essential and why ordinary nonnegative GSB alone does not settle the
local factor.

Thus the former product-closure question is no longer an
ultra-log-concavity problem.  It reduces to the binomially normalized
one-step comparisons (RBC) for the single arbitrary inward factor,
plus control of degree allocations whose inward midpoint lies outside
its inductive prefix.

## 4. Exact evidence and scope

The verifier
`verify_binomial_central_convolution.py` checks the boundary-flow
identity, exhausts all pairs of central binomial bands through the
requested orders, and tests random conic combinations.

For the rooted factor (11), an exact deterministic sample of 20,000
roots from the 60-vertex PatternBoost corpus checked more than
\(8.3\) million comparisons with

\[
d\le2\left(
\left\lfloor\frac{2\alpha(T)+1}{3}\right\rfloor-1
\right)
\]

and found no failure of (RBC).  The all-degree statement is false:
tail failures occur in the same corpus.  Therefore the prefix
restriction is substantive and matches the main proof program.

The next proof obligation is a symmetric-difference switching proof
of prefix (RBC) for the double-root bridge tree represented by (11),
with the exact order-sensitive room condition used to control the
tail degree allocations.

## 5. Endpoint-rooted paths satisfy RBC at every rank

There is already a nontrivial infinite class for which the local
obligation is completely proved.  Let \(T=P_n\) and root it at an
endpoint.  If \(Q=xJ\) counts the independent sets containing the
root, then

\[
P_r=\binom{n-r+1}{r},
\qquad
Q_r=\binom{n-r}{r-1}.
\tag{15}
\]

Hence the root-occupation fraction and extension mean are

\[
\rho_r=\frac{Q_r}{P_r}=\frac r{n-r+1},
\qquad
\mu_r=(r+1)\frac{P_{r+1}}{P_r}
=\frac{(n-2r+1)(n-2r)}{n-r+1}.
\tag{16}
\]

Put \(j=d-i>i\).  Since

\[
f_i^{(d)}=P_iP_j-Q_iQ_j
=P_iP_j(1-\rho_i\rho_j),
\]

the RBC inequality is equivalent, whenever \(i,j\) both lie in the
support of \(P\), to

\[
\mu_i(1-\rho_{i+1}\rho_{j-1})
\ge
\mu_{j-1}(1-\rho_i\rho_j).
\tag{17}
\]

Direct substitution of (16) factors the left side minus the right
side as

\[
\frac{
(n+1)(i-j+1)(i+j-n-1)\,\Xi
}{
(i-n)(i-n-1)(j-n-2)(j-n-1)
},
\tag{18}
\]

where

\[
\Xi=
4ij-4i(n+1)-4jn+3n^2+5n.
\tag{19}
\]

The denominator in (18) is positive.  The next two factors in the
numerator are nonpositive because \(i<j\) and
\(i+j\le2\lceil n/2\rceil\le n+1\).
Finally, \(\Xi\) decreases separately with \(i\) and \(j\) on the
support.  Its minimum therefore occurs at the two largest distinct
indices.  If \(n=2m\), that minimum is

\[
\Xi(m-1,m)=2(5m+2)>0,
\]

and if \(n=2m+1\), it is

\[
\Xi(m,m+1)=2(3m+2)>0.
\]

Thus (18) is nonnegative and (RBC) holds for every endpoint-rooted
path, at every degree, not merely in the prefix.

The zero-support boundary causes no exception.  The support of \(P_n\)
is the initial interval
\([0,\lceil n/2\rceil]\).  If \(j\) lies above that interval and
\(j-1\) also lies above it, both sides of (RBC) vanish.  If \(j\) is
the first index above the interval, the left side vanishes and the
right side is nonnegative.  The remaining indices are exactly the
positive-support case treated by (17)--(19).

`verify_path_rooted_bridge_binomial_central.py` checks the symbolic
factorization and replays all index pairs through path order \(500\).
It performs \(5{,}271{,}000\) exact comparisons and finds no failure.
The machine-readable report is
`path_rooted_bridge_binomial_central_20260729.json`.

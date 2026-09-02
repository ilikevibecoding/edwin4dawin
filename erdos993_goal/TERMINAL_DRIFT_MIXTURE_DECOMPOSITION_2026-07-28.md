# Terminal drift as a two-component mixture

Date: 2026-07-28

Status: the decomposition below is proved.  Component (B) is now
refuted by the rigorous finite \(m=60\) star-fork certificate;
component (A) retains its conjectural status.  The later combined
upper-unit cross inequality is also refuted, at \(m=100\); see
`TERMINAL_UPPER_UNIT_ABSORPTION_2026-07-29.md`.  This is not a
solution of Erdős Problem 993.

## 1. Exact decomposition

Let

\[
B=I(F;x)=\sum_jb_jx^j,\qquad
C=I(F-W;x)=\sum_jc_jx^j,
\]

and add a new vertex \(p\) whose neighborhood in \(F\) is \(W\).
Then

\[
A=I(T;x)=B+xC,\qquad a_j=b_j+c_{j-1}.
\]

Fix \(r\ge1\), put \(k=r+1\), and define

\[
u=r\frac{b_r}{b_{r-1}},\qquad
w=(r+1)\frac{b_{r+1}}{b_r},\qquad
v=(r+1)\frac{a_{r+1}}{a_r},
\]

\[
q_F=1+u-w,\qquad
\delta_r=\frac{c_r}{b_r}.
\]

The rank-\(r\) independent sets of \(T\) split into two classes.

* If \(p\) is absent, the set is a rank-\(r\) set of \(F\).  Its
  mean number of extensions in \(T\) is
  \[
  w+\delta_r,
  \]
  because \(p\) is additionally available exactly when the set
  avoids \(W\).

* If \(p\) is present, deleting it leaves a rank-\((r-1)\) set of
  \(F-W\).  Its mean number of extensions is
  \[
  u_C=r\frac{c_r}{c_{r-1}}.
  \]

Since the two class sizes are \(b_r\) and \(c_{r-1}\),

\[
\boxed{
v=
\frac{b_r}{a_r}(w+\delta_r)
+\frac{c_{r-1}}{a_r}u_C.
}
\tag{1}
\]

Subtracting from \(u+1\) gives the exact drift decomposition

\[
\boxed{
u+1-v
=
\frac{b_r}{a_r}(q_F-\delta_r)
+\frac{c_{r-1}}{a_r}(u+1-u_C).
}
\tag{2}
\]

Thus terminal drift follows from the two component inequalities

\[
\boxed{
q_F\ge\frac{c_r}{b_r}
}
\tag{A}
\]

and

\[
\boxed{
r\frac{c_r}{c_{r-1}}\le u+1.
}
\tag{B}
\]

Their coefficient forms are respectively

\[
\boxed{
r b_r^2+b_{r-1}b_r
-(r+1)b_{r-1}b_{r+1}
-b_{r-1}c_r\ge0
}
\tag{3}
\]

and

\[
\boxed{
(rb_r+b_{r-1})c_{r-1}
-r b_{r-1}c_r\ge0.
}
\tag{4}
\]

The executable `verify_terminal_drift_mixture_decomposition.py`
checks (1)--(4) symbolically.

## 2. Interpretation

Inequality (A) says that the one-step extension curvature of \(F\)
pays for the probability that a uniform rank-\(r\) independent set
avoids the attachment neighborhood.  In moment form it is

\[
\operatorname{Var}(e)
\le
\left(2-\frac{c_r}{b_r}\right)\mathbb Ee
+2\mathbb E q_{\rm res}.
\]

It interpolates between prefix ordered log-concavity and the weaker
prefix GSB variance inequality.  The factor \(c_r/b_r\) retains the
rooted information that is lost in an unpointed variance bound.

Inequality (B) says that deleting the attachment neighborhood's new
vertex cannot raise the rank-\((r-1)\) extension mean by more than
one.  Formula (2) allows the two components to compensate each other,
so (A)--(B) are sufficient rather than necessary.

This comparison is not a generic downset inequality.  Let \(D\) be
the independence complex of the complete split graph whose independent
part \(X\) and clique part \(U\) both have six vertices, with all
\(X\)--\(U\) edges present.  Put \(J=D|U\) and \(B=D+xJ\).  At
\(r=3\),

\[
(d_0,d_1,d_2,d_3)=(1,12,15,20),\qquad
(j_0,j_1,j_2,j_3)=(1,6,0,0),
\]

so

\[
1+3\frac{B_3}{B_2}-3\frac{D_3}{D_2}
=1+\frac{60}{21}-4=-\frac17.
\]

The cleared coefficient margin is \(-45\).  The executable
`verify_present_component_dense_split_failure.py` verifies this
exactly.  Thus a proof of (B), like a proof of (A), must use forest
structure.

The degree-two terminal case has \(W=\{q\}\) and
\(C=I(F-q)\).  Additional terminal leaf-neighbors simply enlarge
\(W\), so the same decomposition applies without changing its form.

## 3. Exact evidence and negative control

There is no failure of either component inequality in:

* all 112,971 rooted-rank checks with \(u\ge r\) from every
  unlabeled tree through order 13, at all ranks;
* all 65,020 rooted checks at \(r\ge6\) through order 16, including
  17,923 checks satisfying the exact order-sensitive room condition;
* 298,872 checks from 2,000 random forests of orders at most 200;
* 314,852 checks from 2,000 random trees of orders at most 250;
* 86,856 required-prefix checks over all 6,204 terminal supports in
  the first 500 PatternBoost records.

In the order-16 census, the minimum of (A) at \(r\ge6\) is
approximately \(0.84954\), and the minimum of (B) is approximately
\(0.76791\).  On the 500-record PatternBoost sample, the corresponding
minima are approximately \(1.82127\) and \(0.90408\).

The forest hypothesis is essential.  For \(F=K_{2,10}\), root a
vertex in the two-vertex part and take \(r=2\).  Then

\[
q_F-\frac{c_r}{b_r}=-\frac{19}{138}<0,
\]

while (B) remains positive.  The weighted sum (2) is

\[
u+1-v=-\frac1{57},
\]

recovering the exact known failure of terminal drift outside the
forest class.

## 4. Proof target

The immediate target is to prove (A) and (B) for forests in the
branch \(u\ge r\), or only under the exact room condition

\[
(\alpha(F)-r)(|F|-r)>(r+1)(r+2).
\]

Inequality (A) is the sharper structural obligation in the known
\(K_{2,10}\) obstruction, but the dense split example above shows
that neither component is generic.  Both proofs must use global
acyclicity, not only coefficient-shape or generic downset properties.
Inequality (B) is still a vertex-deletion comparison and may admit a
direct forest-specific size-biased extension coupling.

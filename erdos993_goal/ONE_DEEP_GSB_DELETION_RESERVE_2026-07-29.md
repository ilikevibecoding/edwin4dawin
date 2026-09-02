# GSB--Deletion Reserve for the One-Deep-Branch Case

## Status

This note gives an exact decomposition of the remaining one-deep-branch
PIRD minor.  It isolates the only term that the arbitrary inward branch
can make negative and shows exactly how the inductive GSB reserve of the
smaller root-deleted forest compensates it.

The identity is proved.  The half-payment inequality stated in
Section 4 is false.  An exact star-fork rooted tree needs payment
\(\eta=0.5004931167\ldots>1/2\) at an operative rank; see
`QPIRD_AND_HALF_PAYMENT_COUNTEREXAMPLE_2026-07-29.md`.  Ordinary
PIRD still holds strictly in that example, so the exact full-payment
identity remains the relevant weaker target.

## 1. General rooted pair

Let

\[
C(x)=\sum_jc_jx^j,\qquad D(x)=\sum_jd_jx^j
\]

be nonnegative polynomials and put

\[
B(x)=(1+x)\{C(x)+xD(x)\}.
\tag{1}
\]

For \(k\ge1\), the PIRD minor is

\[
\begin{aligned}
\Delta_k
&=B_{k+1}C_k-B_kC_{k+1}\\
&=c_k^2-c_{k-1}c_{k+1}
+c_k(d_k+d_{k-1})
-c_{k+1}(d_{k-1}+d_{k-2}).
\end{aligned}
\tag{2}
\]

Define the GSB reserve of \(C\),

\[
\mathcal G_k(C)
=
kc_k^2+c_{k-1}c_k-(k+1)c_{k-1}c_{k+1},
\tag{3}
\]

and the weighted-deletion drift

\[
\begin{aligned}
\mathcal S_k(C,D)
={}&(k+1)c_{k-1}(c_k+d_k+d_{k-1})\\
&-(kc_k+c_{k-1})(c_{k-1}+d_{k-1}+d_{k-2}).
\end{aligned}
\tag{4}
\]

## 2. Exact compensation identity

Direct substitution of

\[
c_{k+1}
=
\frac{c_k(kc_k+c_{k-1})-\mathcal G_k(C)}
{(k+1)c_{k-1}}
\]

into (2) gives

\[
\boxed{\displaystyle
(k+1)c_{k-1}\Delta_k
=
c_k\mathcal S_k(C,D)
+(c_{k-1}+d_{k-1}+d_{k-2})\mathcal G_k(C).
}
\tag{5}
\]

This is an identity, not an estimate.

Consequently, if the smaller forest represented by \(C\) already has
nonnegative GSB reserve, the exceptional inward branch only has to
control the negative part of \(\mathcal S_k\).  Discarding the GSB term
and asking for \(\mathcal S_k\ge0\) is unnecessarily strong.

## 3. Application to the deepest-support factorization

In the notation of
`DEEPEST_SUPPORT_ONE_DEEP_BRANCH_REDUCTION_2026-07-29.md`,

\[
C=PK,\qquad D=EL,
\tag{6}
\]

where

\[
P=I(\text{inward branch}),\qquad
E=I(\text{inward branch}-t),
\]

and

\[
K=\prod_i\bigl((1+x)^{a_i}+x\bigr),\qquad
L=(1+x)^{\sum_i a_i}.
\]

Thus \(C\) is itself the independence polynomial of a proper
root-deleted forest.  In a strong-induction proof of prefix GSB,
\(\mathcal G_k(C)\ge0\) is exactly the reserve already supplied by the
inductive hypothesis whenever the cutoff arithmetic places \(k\) in
the smaller forest's required range.

The pure star-root theorem is the case \(P=E=1\).  It proves the full
right side of (5), not merely the stronger condition
\(\mathcal S_k\ge0\).

If there are no side stars, \(K=L=1\), (4) becomes the explicit
one-inward comparison

\[
\begin{aligned}
\mathcal S_k(P,E)
={}&(k+1)P_{k-1}(P_k+E_k+E_{k-1})\\
&-(kP_k+P_{k-1})(P_{k-1}+E_{k-1}+E_{k-2}).
\end{aligned}
\tag{7}
\]

This is a forest-specific inequality.  It is false for general graphs:
for the complete multipartite graph with parts \(6,1,1,1\), rooted in
the six-vertex part, at \(k=3\),

\[
\begin{aligned}
P&=(1,9,15,20,15,6,1),\\
E&=(1,8,10,10,5,1),
\end{aligned}
\]

and

\[
\mathcal S_3(P,E)=-75.
\]

The full compensated expression (5) remains positive there.  This
example shows why retaining \(\mathcal G_k(C)\) is necessary even
before imposing forest structure.

Half-payment itself also needs forest structure; it is not a formal
consequence of GSB and PIRD.  Let \(C\) be the independence polynomial
of the complete multipartite graph with parts \(5,1,1,1,1\), and let
\(D=1\), corresponding to adding a universal root.  Then

\[
C=(1,9,10,10,5,1).
\]

At \(k=2\), the terminal sequence has \(B_2=B_3=20\), and exact
calculation gives

\[
\mathcal S_2=-20,\qquad
\mathcal G_2(C)=20,\qquad
\Delta_2=0.
\]

Thus PIRD holds with equality and GSB is positive, but the half-payment
margin is

\[
2C_2\mathcal S_2+(C_1+D_0)\mathcal G_2(C)
=-200.
\]

Any proof of (HP) must therefore use the recursive acyclic form of
\((C,D)\), not only the two scalar hypotheses already visible in
(5).  The verifier below checks this sharper negative control too.

## 4. The sharpened remaining target

Exact data support the stronger half-payment inequality

\[
\boxed{\displaystyle
2c_k\mathcal S_k(C,D)
+(c_{k-1}+d_{k-1}+d_{k-2})\mathcal G_k(C)
\ge0
}
\tag{HP}
\]

for the one-deep factorization (6) in the operative prefix.

When \(\mathcal S_k<0\), (HP) says that at most half of the available
GSB reserve is needed to pay the weighted-deletion deficit.  Since
(HP) is stronger than (5), it proves PIRD immediately.

It is useful to normalize the payment.  When
\(\mathcal G_k(C)>0\) and \(\mathcal S_k<0\), put

\[
\eta_k=
\frac{-c_k\mathcal S_k}
{(c_{k-1}+d_{k-1}+d_{k-2})\mathcal G_k(C)}.
\tag{8}
\]

Then (5) needs only \(\eta_k\le1\), while (HP) asserts
\(\eta_k\le1/2\).

There is a simpler equivalent form.  Put

\[
H(x)=C(x)+(1+x)D(x),
\tag{9}
\]

and define the two consecutive extension means of \(C\) by

\[
u=k\frac{c_k}{c_{k-1}},\qquad
w=(k+1)\frac{c_{k+1}}{c_k}.
\tag{10}
\]

Substituting (3)--(4) into (HP) and cancelling the positive factor
\(c_k\) gives

\[
\boxed{\displaystyle
2(k+1)\frac{H_k}{H_{k-1}}
\ge
1+u+w.
}
\tag{TS}
\]

Thus the half-payment statement is exactly a two-step extension-mean
comparison: the weighted deletion system \(H=C+(1+x)D\) must retain
at least the midpoint of the two consecutive extension means of
\(C\), with the additional unit shown in (TS).

This form removes all quadratic coefficient clutter from the remaining
lemma.  It also exposes the role of the prefix.  Since

\[
B_{k+1}=c_{k+1}+H_k,\qquad B_k=c_k+H_{k-1},
\]

the operative condition \(B_{k+1}\ge B_k\) is exactly

\[
H_k-H_{k-1}\ge c_k-c_{k+1}.
\tag{11}
\]

The pair (TS), (11) is the cleanest current formulation of the
one-deep obstacle.

In a deterministic sample of 50,000 PatternBoost inward trees, each
combined with zero through six random side stars of at most thirty
leaves, there were

- \(1,737,332\) operative prefix ranks at \(k\ge6\);
- \(10,067\) ranks with \(\mathcal S_k<0\);
- no negative GSB reserves;
- no negative PIRD minors;
- maximum observed payment ratio
  \[
  \eta_k=0.1799033484\ldots.
  \]

Thus the exact GSB reserve is not a cosmetic correction: the linear
drift term genuinely becomes negative, but it consumed less than
eighteen percent of the available reserve in this adversarial sample.

The random corpus substantially understates the hardest known payment.
For the recursively homogeneous Galvin inward family

\[
\begin{aligned}
e&=(1+2x)^t,\qquad A=e+x(1+x)^t,\\
E&=A^m,\qquad P=E+xe^m,
\end{aligned}
\]

with two direct side leaves, so that \(C=(1+x)^2P\) and \(D=E\),
bounded-memory exact integer scans give

\[
\begin{array}{c|c|c|c}
t&m&k&\max\eta_k\\ \hline
9&30&181&0.2390083284\ldots\\
15&324&3240&0.2987700151\ldots\\
15&438&4380&0.3138670939\ldots\\
16&820&8746&0.3321485835\ldots\\
17&1200&13599&0.3447351797\ldots
\end{array}
\]

Every listed point has positive half-payment margin and positive PIRD
minor.  The \(t=17\) value is also an exact counterexample to the
tempting stronger one-third-payment claim

\[
3c_k\mathcal S_k+
(c_{k-1}+d_{k-1}+d_{k-2})\mathcal G_k(C)\ge0.
\]

Thus \(1/3\) is not the right constant, while the required \(1/2\)
bound retains visible room on the strongest exact family currently
known.  For \((t,m)=(15,438)\), varying the number \(q\) of direct
side leaves from zero through eight gives its maximum at \(q=2\);
the payment then decreases rapidly for \(q\ge3\).

The standalone exact scanners are

- `scan_one_deep_galvin_payment_exact.py`, which streams the
  coefficients of \(A^m\) with a bounded-memory integer recurrence;
- `scan_recursive_homogeneous_one_deep_payment.py`, which independently
  constructs the same family by rooted-tree polynomial recursion and
  also tests additional phase-stacking levels.

The two implementations agree exactly at \((t,m)=(9,30)\).  The
depth-four grid
\([1,t,m,n]\), \(2\le t\le6\), \(2\le m\le12\), \(2\le n\le8\)
had no half-payment failure; its largest payment was
\(0.2276967055\ldots\), below the depth-three Galvin frontier.

The standalone verifier
`verify_one_deep_gsb_deletion_decomposition.py` checks (5)
symbolically, verifies the general-graph negative control exactly, and
replays a deterministic finite one-deep sample.

## 5. What remains

The former opaque cross term between the inward pair \((P,E)\) and the
star block \((K,L)\) has now been reduced to (HP), equivalently (TS).
A proof can target
one of two statements:

1. prove (HP) directly by a conditional-variance decomposition of the
   root-deleted forest \(C\); or
2. prove the weaker exact requirement
   \[
   c_k\mathcal S_k+
   (c_{k-1}+d_{k-1}+d_{k-2})\mathcal G_k(C)\ge0.
   \]

The first route is preferable because it retains half of the inductive
GSB reserve for the final terminal cascade.

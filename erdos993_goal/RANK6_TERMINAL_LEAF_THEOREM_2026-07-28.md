# Rank-6 strong inequality at a diameter endpoint

Date: 2026-07-28

Status: **proved theorem, internally and exactly verified**.  This is
the terminal rooted input toward the rank-6 leaf induction.  It is not
by itself the rank-6 coefficient theorem or a resolution of Erdős
Problem 993.

## Theorem

Let \(T\) be a tree of order at least \(18\).  If \(p\) is an endpoint
of a diameter, put

\[
d=i_4(T),\quad e=i_5(T),\qquad
h=i_4(T-p),\quad k=i_5(T-p).
\]

Then

\[
\boxed{
S_6(T,p):=d(2e+d)-24(eh-dk)>0.
}
\tag{1}
\]

Consequently, the rank-6 rooted-cross reserve at this root is
nonnegative:

\[
d(e^2-di_6(T))-2e(eh-dk)\ge0.
\tag{2}
\]

Indeed, the proved rank-5 tree theorem gives

\[
e^2-di_6(T)\ge \frac{e(2e+d)}{12},
\]

and (1) then gives (2) after multiplication by \(d\).

## 1. Terminal decomposition

Let \(q\) be the neighbor of \(p\).  Since \(p\) is a diameter
endpoint, \(q\) has at most one nonleaf neighbor.  Delete \(p,q\).
The remaining forest has the form

\[
B=sK_1\sqcup A,
\]

where \(s\ge0\) counts the other leaf neighbors of \(q\), and \(A\) is
a tree.  If \(r\) is the unique neighbor of \(q\) in \(A\), put
\(C=A-r\).  (The star case, with no \(A\), is immediate directly.)

Write

\[
x=i_3(B),\quad y=i_4(B),\quad z=i_5(B),\qquad
u=i_3(C),\quad v=i_4(C).
\]

Two applications of the vertex-deletion recurrence give

\[
h=y+u,\quad k=z+v,\quad d=h+x,\quad e=k+y.
\]

Substitution into (1) gives the exact reduced margin

\[
\begin{aligned}
S_s={}&x^2+(y+u)^2+2x(2y+u)\\
&+(26x+2(y+u))(z+v)-22y(y+u).
\end{aligned}
\tag{3}
\]

`verify_rank6_terminal_leaf_assembly.py` checks this identity
symbolically.

## 2. The no-sibling base

For \(s=0\), normalize the coefficients of \(A\) by

\[
X=\frac{x}{y},\qquad
D=1-\frac{xz}{y^2},\qquad
\rho=\frac ux,\qquad \sigma=\frac vy.
\]

The existing deletion-retention and rank-5 rooted-cross theorems give

\[
\frac12\le\rho,\sigma\le1,\qquad
\sigma\ge\rho-\frac D2.
\tag{4}
\]

The new sharp coefficient theorem gives, for every tree \(A\) of
order at least \(16\),

\[
3575\,i_3(A)i_5(A)-2016\,i_4(A)^2\ge0,
\]

or equivalently

\[
D\le\frac{1559}{3575}.
\tag{5}
\]

Equality in (5) is unique to \(P_{16}\).

After division by \(y^2\), (3) is exactly the rational expression
\(\Phi(X,D,\rho,\sigma)\) in
`verify_rank6_terminal_base_cone.py`.  That verifier proves

\[
\Phi>0
\]

throughout (4)--(5), using four exact \(X\)-cells, one negative
discriminant, and positive rational Bernstein coefficients.

## 3. Arbitrarily many sibling leaves

Let

\[
D_s=(1+x)^sI(A;x).
\]

Substituting \(i_3(D_s),i_4(D_s),i_5(D_s)\) into (3) makes \(S_s\) a
polynomial of degree at most ten in \(s\).

For every core order at least \(20\),
`verify_rank6_terminal_isolate_monotonicity.py` proves

\[
\Delta^jS_0\ge0\qquad(1\le j\le10).
\tag{6}
\]

The first five differences are certified by 23,475 exact
tensor-Bernstein coefficients.  Differences six through ten are
coefficientwise nonnegative before any relaxation.  Hence

\[
S_s\ge S_0>0\qquad(s\ge0).
\]

The proof uses the exact path/star bounds for \(i_3\), the rank-3
reserve, the two-extension inequality, (4), and the sharp ceiling
(5).  No floating-point inequality is used.

## 4. Every smaller core and the threshold 18

`verify_rank6_terminal_small_core_isolates.py` enumerates every
distinct truncated rooted-tree polynomial state through core order
\(19\).  The numbers of states at orders \(1,\ldots,19\) are

\[
\begin{gathered}
1,1,2,4,9,20,48,114,283,699,1756,4379,10853,\\
26615,64046,150850,346187,773337,1678367.
\end{gathered}
\]

For a core of order \(m\), it starts at

\[
s_0=\max(0,16-m),
\]

which is exactly the first sibling count for which
\(m+s+2\ge18\).  It checks \(S_{s_0}>0\) and all ten Newton forward
differences there.  Therefore it certifies every integer
\(s\ge s_0\), not merely a bounded sample.

The star case is a direct binomial specialization.  These cases,
together with the large-core certificate, exhaust every diameter
endpoint of every tree of order at least \(18\), proving (1).

## Exact replay

```powershell
python .\verify_rank6_terminal_leaf_assembly.py
python .\verify_rank6_terminal_base_cone.py
python .\verify_tree_rank345_defect_ceiling.py
python .\verify_rank6_terminal_isolate_monotonicity.py
python .\verify_rank6_terminal_small_core_isolates.py
```

The last two commands are the expensive exact computations.  Their
certified totals are 23,475 Bernstein coefficients and 3,057,571
distinct rooted polynomial states, respectively.

## Precise remaining gap

Rank-6 leaf induction needs the rooted-cross reserve for the inward
core at the second vertex of the chosen diameter path.  That root need
not itself be a leaf: several other depth-two diameter branches can
meet there.  The theorem above establishes the reserve at the chosen
diameter endpoint, but it does not automatically transfer it to that
second-layer root.

The next step is therefore a closure theorem for attaching the
remaining depth-one and depth-two branches at a distinguished root.
Keeping this distinction explicit prevents an invalid claim that the
rank-6 coefficient theorem has already been proved.

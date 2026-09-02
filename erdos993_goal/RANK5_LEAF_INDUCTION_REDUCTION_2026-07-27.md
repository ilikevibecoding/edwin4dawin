# Rank-five leaf-induction reduction

Date: 2026-07-27

Status: **exact reduction with exhaustive evidence; one rooted
rank-four inequality remains conjectural**.

## Exact identity

Let \(B\) be a tree, mark \(p\in V(B)\), put \(D=B-p\), and let \(G\)
be obtained from \(B\) by adjoining a new leaf at \(p\).  Write

\[
a=i_4(B),\quad b=i_5(B),\quad c=i_6(B),
\qquad
d=i_3(D),\quad e=i_4(D),\quad f=i_5(D).
\]

Define

\[
Q_5(P)=10p_5^2-p_4p_5-12p_4p_6
\]

and

\[
Q_4(D)=8e^2-de-10df.
\]

Finally, define the rooted rank-four payment

\[
\begin{aligned}
\mathcal M(B,p)={}&
6a(a+d)Q_4(D)\\
&+ade(a+d+2e)+2a^2e^2
-50(bd-ae)^2.
\end{aligned}
\tag{1}
\]

Direct expansion gives the exact identity

\[
\boxed{
Q_5(I(G))-Q_5(I(B))
=\frac da Q_5(I(B))
+\frac{\mathcal M(B,p)}{5ad}.
}
\tag{2}
\]

Thus the following rooted statement would prove rank-five leaf
monotonicity:

\[
\tag{R5-Pay}
\boxed{\mathcal M(B,p)\ge0}
\]

for every tree \(B\) of order at least \(10\) and every vertex \(p\).

For the induction below, this universal form is stronger than needed.
Choose the deleted leaf as an endpoint of a longest path.  Its support
\(p\) has at most one nonleaf neighbor after the deletion.  It is
therefore enough to prove (R5-Pay) for these **terminal broom
vertices**.  If \(p\) has \(s\) leaf neighbors and one possible inward
neighbor \(q\), then

\[
I(B-p)=(1+x)^s I(C),\qquad
I(B-N[p])=I(C-q),
\tag{3}
\]

where \(C\) is the inward component.  This is a much more rigid target
than an arbitrary marked vertex.

## Consequence

All trees of order \(10\) have \(Q_5\ge0\).  Assuming terminal-broom
(R5-Pay), induct on the order.  Delete an endpoint leaf of a longest
path in \(G\), calling the remaining tree \(B\) and its attachment
vertex \(p\).  Then \(p\) has the terminal-broom form above.  The
induction hypothesis and (2) give

\[
Q_5(I(G))\ge Q_5(I(B))\ge0.
\]

Hence (R5-Pay) would prove

\[
Q_5(I(T))\ge0
\]

for every tree of order at least \(10\), substantially stronger than
the rank-five prefix statement needed for Erdős Problem 993.

The payment has a useful interpretation.  Its only negative term is
the square

\[
50(bd-ae)^2,
\]

which measures the change in the rank-\(4\)-to-\(5\) coefficient
ratio after deleting \(p\).  It must be paid by the already understood
rank-four reserve of \(D\) and two explicit positive size terms.

## Exact finite evidence

`verify_rank5_leaf_induction_reduction.py` verifies (2) symbolically
and checks every vertex of every unlabeled tree through order \(17\).
For orders \(10,\ldots,17\), the minimum values of \(\mathcal M\) are

\[
\begin{array}{c|rrrrrrrr}
|B|&10&11&12&13&14&15&16&17\\ \hline
\min\mathcal M&
6630400&
144818450&
1486036600&
10735454100&
60041672950&
280061275500&
1085100687000&
3643641110080.
\end{array}
\]

The corresponding minimum leaf increments
\(Q_5(I(G))-Q_5(I(B))\) are

\[
1114,\ 7599,\ 30286,\ 94983,\ 244492,\ 554988,\ 1154302,\ 2209040.
\]

The scan contains \(81{,}042\) trees of orders \(10\) through \(17\)
and \(1{,}323{,}324\) marked vertices.  Every tested payment and
every tested rank-five leaf increment is strictly positive.

These computations do not prove (R5-Pay) beyond the tested orders.
They isolate a lower-rank rooted inequality whose proof would close
the rank-five tree case by induction.

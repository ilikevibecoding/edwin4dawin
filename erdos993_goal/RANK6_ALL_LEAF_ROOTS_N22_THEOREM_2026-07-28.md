# Rank-6 reserve at every leaf of order 22

Date: 2026-07-28

Status: **proved theorem**, with a finite exact core certificate.

## Theorem

Every 22-vertex tree \(T\), rooted at any leaf \(p\), satisfies
\(S_6(T,p)>0\).

## Coarse integral certificate

For a leaf support \(q\), the distinguished edge \(pq\) consumes one
degree slot at \(q\). The parent-slot edge bound therefore uses core
degree capacity \(x_q\) at the support and \(x_v+1\) elsewhere. This
is sharper than the order-23 capacity bound.

All 490 support-excess-one partitions are certified directly; their
minimum lower margin is

\[
21\,310\,704.
\]

Of the 1597 remaining support/partition pairs, 1458 are certified by
the same exact normalized polynomial. Their minimum positive lower
margin is \(45\,726\).

Exactly 139 partitions remain inconclusive. This does not mean that
their trees fail—it means only that independent upper and lower motif
bounds are too loosely coupled at this order.

## Exact weighted-core certificate

For each inconclusive partition, discard the leaves and retain the
positive-excess core. It is a tree of order between 6 and 15. The
verifier generates every unlabeled core shape:

\[
\begin{array}{c|rrrrrrrrrr}
|C|&6&7&8&9&10&11&12&13&14&15\\ \hline
\#C&6&11&23&47&106&235&551&1301&3159&7741.
\end{array}
\]

For every shape it assigns the complete weight multiset in every
degree-compatible way, distinguishes every possible support vertex,
and reconstructs the exact rank-four and rank-five coefficients of
both \(T\) and \(T-p\) from the edge, wedge, connected-three-edge,
disconnected-three-edge, and connected-four-edge motif identities.

This exhausts

\[
1\,698\,339
\]

weighted rooted core states. Their exact minimum is

\[
\boxed{21\,307\,524>0.}
\]

At the minimizing state,

\[
(i_4(T),i_5(T))=(4086,9788),\qquad
(i_4(T-p),i_5(T-p))=(3190,6873).
\]

Thus every previously inconclusive realization is positive, proving
the theorem.

## Replay

```powershell
python .\verify_rank6_all_leaf_roots_n22.py
```

The replay is exact and uses no floating-point comparison. It checks
1.7 million small weighted-core states and therefore takes about a
minute on the development machine.

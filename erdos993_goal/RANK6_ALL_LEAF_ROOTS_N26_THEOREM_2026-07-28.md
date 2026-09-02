# Rank-6 strong inequality at every leaf from order 26

Date: 2026-07-28

Status: **proved theorem**. Unlike the earlier terminal theorem, the
root need not be an endpoint of a diameter.

## Theorem

Let \(T\) be a tree of order \(n\ge26\), and let \(p\) be any leaf.
Put

\[
d=i_4(T),\qquad e=i_5(T),\qquad
h=i_4(T-p),\qquad k=i_5(T-p).
\]

Then

\[
\boxed{
S_6(T,p):=d(2e+d)-24(eh-dk)>0.
}
\tag{1}
\]

Consequently,

\[
\boxed{
C_6(T,p):=
d(e^2-di_6(T))-2e(eh-dk)>0.
}
\tag{2}
\]

The implication follows from the proved rank-5 tree theorem exactly
as in the diameter-endpoint and spider theorems.

## Structural split

Let \(q\) be the support of \(p\).

- If \(T\) has no branch vertex, it is a path and \(p\) is a diameter
  endpoint.
- If \(T\) has exactly one branch vertex, it is a spider.
- Otherwise \(T\) has at least two branch vertices.

Paths are covered by the diameter-endpoint theorem, and all spiders
of order at least \(18\) are covered by the spider theorem.

For a non-spider there are two cases.

1. If \(d(q)=2\), both required branch vertices lie farther from
   \(p\).
2. If \(d(q)\ge3\), the support itself is a branch vertex and at least
   one further branch vertex remains.

## Exact grouped-moment certificates

The verifier uses the exact motif expansion of \(S_6(T,p)\) in
normalized excess-degree moments. The underlying substitutions retain:

- the root, neighbor, and far excess-degree masses;
- the relevant second and third moments;
- the bipartite edge-correlation bound;
- an exact upper bound for lost connected four-edge subtrees;
- a lower bound for surviving connected four-edge stars.

All transformations are symbolic rational identities before the
Bernstein sign checks.

### Degree-two support

Put \(u=1/n\). The support has one unit of normalized excess, and the
far excess mass is \(1-3u\). Since at least two farther branch
vertices exist, the normalized far second moment is at most

\[
\frac{(1-4u)^2+u^2}{(1-3u)^2}.
\]

After setting \(u=v/26\), the cleared numerator has bidegree
\((11,4)\). All \(60\) exact Bernstein coefficients are positive;
the smallest is

\[
\frac{8\,079\,248\,870\,575}{3}.
\]

The cleared denominator is

\[
1\,954\,621\,324\,431\,360\,(3v-26)^2>0
\qquad(0\le v\le1).
\]

### Branch support

Reserve two excess units at \(q\) and one at a farther branch vertex,
then distribute every remaining unit between the support and far
groups. The resulting numerator has tridegree \((9,6,2)\).

Its full-box Bernstein array has one negative coefficient, so the
verifier bisects the box exactly. Three patches suffice. Their exact
minimum Bernstein coefficients are

\[
\frac{4\,665\,618\,583\,705}{25\,019\,152\,952\,721\,408},
\]

\[
\frac{14\,277}{21\,208\,998\,746},
\qquad
\frac{14\,680\,451}{21\,718\,014\,715\,904}.
\]

All are strictly positive, proving (1) on the complete continuous
relaxation.

## Replay

```powershell
python .\verify_rank6_all_leaf_roots_n26.py
```

The prerequisite path/diameter and spider certificates are replayed
separately by:

```powershell
python .\verify_rank6_terminal_leaf_assembly.py
python .\verify_rank6_spider_bernstein_cells.py
```

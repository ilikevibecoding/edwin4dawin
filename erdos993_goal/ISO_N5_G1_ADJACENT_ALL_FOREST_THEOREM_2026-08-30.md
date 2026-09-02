# Adjacent-mark rank-five residual theorem

## Theorem

In the adjacent-mark canonical occupation of the rank-five bundle, let

\[
S(A,B,C)=M_5+3C_5
\]

be the exact residual attached to a finite forest \(A\), where \(B\) and
\(C\) are the two componentwise root-neighbour deletion subforests. Then

\[
S(A,B,C)\ge 0.
\]

This theorem closes the adjacent placement only. It is not a proof of the
connected- or disconnected-nonadjacent placements, all \(g_1\), \(g_2\),
all \(N_5\), or Erdős Problem #993.

## Proof

Write \(n=|V(A)|\). For \(0\le n\le12\), exact enumeration covers every
unlabeled forest and every componentwise assignment of a component to the
unattached, \(B\)-deleted, or \(C\)-deleted mode, with every possible root
in an attached component. The enumeration contains 2,949 forests and
3,804,017 deletion states. Its ordered exact stream has SHA-256

`D2283A56A4D561FAB762303579DC55705162CA86D9A84BE74B4481E573BA3C5E`

and contains no negative value of \(S\).

Assume now that \(n\ge13\). If both deletion deficits vanish, the exact
zero-deletion theorem gives \(S(A,A,A)\ge0\). If exactly one deficit is
positive, the exact one-sided theorem gives \(S(A,B,A)\ge0\), with the
other orientation obtained by exchanging the two deletion families.

It remains to treat two positive deficits. Put \(X=A-B\), \(Y=A-C\), let
\(p,q\ge1\) be the sizes of their selected deletion sets, and let
\(e=n-c(A)\). Since the two selected sets lie in disjoint component
families,

\[
p+q\le c(A).
\]

The exact deficit identity is

\[
S(A,B,C)=S(A,A,A)-T(A,X)-T(A,Y)+K(X,Y).
\]

The independent endpoint reduction proves the following monotone
substitutions for \(n\ge13\):

* the expression decreases with the rank-three deficits, so the generalized
  forest-path upper bounds may be used;
* it increases with the rank-four and rank-five deficits, so the branch-free
  adaptive bounds
  \[
  x_k\ge \frac{a_k}{\binom nk}\left(a_k-\binom{n-p}{k}\right),
  \qquad k=4,5,
  \]
  and their \(Y\)-counterparts may be used;
* writing
  \[
  x_2=Q(p)-e_X,\qquad y_2=Q(q)-e_Y,
  \]
  gives \(e_X,e_Y\ge0\) and \(e_X+e_Y\le e\). On the budget hypotenuse
  the resulting lower form has second derivative \(-12\), so its minimum is
  attained at one of
  \[
  (e_X,e_Y)=(0,0),(e,0),(0,e).
  \]

For the independence polynomial of \(A\), use the factorial ratios

\[
q_j=2^j j!a_j,\qquad \rho_j=q_{j+1}/q_j,\qquad
\delta_j=\rho_j-\rho_{j+1}.
\]

The rank-five forest three-halves theorem supplies

\[
\delta_1\ge0,\qquad \delta_2\ge1,\qquad
\delta_1+\delta_2\ge2,\qquad \delta_3\ge1,\qquad \delta_4\ge1.
\]

Splitting at \(\delta_1=1\) gives the exhaustive high and low ratio
sectors. The component constraints form the simplex

\[
(p-1)+(q-1)+e+\text{slack}=n-2.
\]

After a positive denominator clearing, direct homogeneous completion on
this geometry simplex, the appropriate ratio simplex, and the low-sector
interval produces the following exact nonzero coefficient streams:

| sector | endpoint | coefficients | minimum | negative |
|---|---:|---:|---:|---:|
| high | \((0,0)\) | 1,011,780 | \(2/15\) | 0 |
| high | \((e,0)\) | 1,011,780 | \(2/15\) | 0 |
| low | \((0,0)\) | 1,218,360 | \(2/15\) | 0 |
| low | \((e,0)\) | 1,218,360 | \(2/15\) | 0 |

The endpoint \((0,e)\) is the exact image of \((e,0)\) under
\(p\leftrightarrow q\). Thus the adaptive lower form is nonnegative at all
three vertices in both exhaustive ratio sectors. The original \(S\) is at
least this lower form, hence \(S(A,B,C)\ge0\). Together with the finite,
zero-deficit, and one-sided cases, this proves the theorem. \(\square\)

## Replayable certificates

Two fail-closed assemblers independently reproduce the same theorem:

* `assemble_iso_n5_g1_adjacent_all_forest_root.py`, SHA-256
  `82CAC2BCCF6D33CF6B4B17FC2521AFC6D74FD4025B9C1F5DC4A555F842D72A6A`,
  marker `PASS_EXACT_ISO_N5_G1_ADJACENT_ALL_FOREST_ROOT`;
* `assemble_iso_n5_g1_adjacent_s_all_forest_g1_bernstein.py`, SHA-256
  `28043D9499E47236CC675A618A1DACCB4EA0CD5D61C941F143C1524E0443FFC8`,
  marker `PASS_EXACT_ISO_N5_G1_ADJACENT_S_ALL_FOREST_G1_BERNSTEIN`.

Their on-disk reports have SHA-256 values

* `3AD4CDDCF61B0B14A5C9A1AE41102844D33D06CD51466CBE52B3A87C8BA02FE3`,
* `0EFFE99BDF45189EB6A76B879355905D3036DA9C02EE2624E19B7CA4DC9D6E7B`.

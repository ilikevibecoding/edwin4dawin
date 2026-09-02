# Path-plus-isolates terminal theorem at ranks 4--9

Date: 2026-07-30

## Theorem

Let

\[
B=P_{L+1}\sqcup tK_1,\qquad L\ge1,\quad t\ge0,
\]

and protect the two endpoints \(v,s\) of the path.  Let
\(\mathcal T_q(B;v,s)\) be the doubled recursive phase gap from
(12vi) of `SHARP_MIXED_LAMBDA_BRIDGE_CANDIDATE_2026-07-29.md`.
Then

\[
\boxed{\mathcal T_q(B;v,s)\ge0}
\]

for every \(q\in\{4,5,6,7,8,9\}\), every path length \(L\ge1\), and
every number \(t\ge0\) of isolated components.

This is an infinite theorem in both \(L\) and \(t\) at each of the
five ranks, not a bounded graph census.

## Exact binomial certificate

At fixed \(q\), the gap is a polynomial of degree \(2q-2\) in \(t\).
Write it in the integer-valued binomial basis:

\[
\mathcal T_q(P_{L+1}\sqcup tK_1;v,s)
=\sum_{j=0}^{2q-2}c_{q,j}(L)\binom tj.
\tag{1}
\]

On the stable path range

\[
L\ge 2q-4,
\]

the verifier derives every \(c_{q,j}(L)\) symbolically from the exact
path independence and residual-moment formulas.  Put

\[
L=2q-4+x,\qquad x\ge0.
\]

For every \(q=4,\ldots,9\), every coefficient of every polynomial
\(c_{q,j}(2q-4+x)\) in the ordinary monomial basis is nonnegative.
In fact, every stored stable coefficient is strictly positive.
Equation (1) is therefore nonnegative for all \(t,x\ge0\).

For the finite boundary \(1\le L<2q-4\), the script constructs the
actual path and interpolates the exact graph moment-DP values in the
same binomial basis.  Every resulting coefficient is nonnegative.
Using the actual graph at the boundary is important at \(L=1\):
the two endpoints are adjacent, and two nominal consecutive-path
minors coalesce after both endpoints are deleted.

The isolate-binomial degrees and boundary ranges are:

| rank \(q\) | degree in \(\binom tj\) | stable threshold | finite boundary |
|---:|---:|---:|---:|
| 4 | 6 | \(L\ge4\) | \(1\le L\le3\) |
| 5 | 8 | \(L\ge6\) | \(1\le L\le5\) |
| 6 | 10 | \(L\ge8\) | \(1\le L\le7\) |
| 7 | 12 | \(L\ge10\) | \(1\le L\le9\) |
| 8 | 14 | \(L\ge12\) | \(1\le L\le11\) |
| 9 | 16 | \(L\ge14\) | \(1\le L\le13\) |

## Independent replay

`verify_path_isolate_terminal_fixed_ranks.py` loads the stored
binomial formulas and compares them with the exact graph moment-DP
definition.  It checks:

- all six certified ranks;
- every path length through three beyond its stable threshold;
- every isolate count \(0\le t\le6\);
- 504 exact graph/rank instances;
- zero discrepancies.

The durable files are:

- `prove_path_isolate_terminal_fixed_ranks.py`;
- `path_isolate_terminal_fixed_rank_theorem_20260730.json`;
- `verify_path_isolate_terminal_fixed_ranks.py`;
- `path_isolate_terminal_fixed_rank_replay_20260730.json`.

## Consequence for protected pruning

The protected-leaf induction can leave isolated external components
in place.  After all nontrivial external components and all extra
leaves of the protected component are pruned, its terminal object is
exactly a protected path plus isolates.  Therefore P4, the isolated
vertex recurrence, is unnecessary at ranks \(4,\ldots,9\): P1--P3
and this theorem suffice at those ranks.

An all-rank version of (1), or a proof of P4, is still required to
close the complete \(q\ge4\) induction.

## Uniform progress in rank

The first seven isolate layers are now uniform in \(q\) on the stable
path range.  The coefficient \(c_{q,0}\) is the all-rank bare-path
theorem.  In addition,

\[
\boxed{
c_{q,1}(L)\ge0,\qquad c_{q,2}(L)\ge0,\qquad
c_{q,3}(L)\ge0,\qquad c_{q,4}(L)\ge0,\qquad
c_{q,5}(L)\ge0,\qquad c_{q,6}(L)\ge0
}
\]

for every \(q\ge4\) and \(L\ge2q-4\).

After

\[
L=2q-4+x,\qquad q=4+r,
\]

the exact formulas have the common positive factorial factor

\[
\frac{
2(q+x-4)!(q+x-2)!
}{
q!(q-2)!(x+2j)!(x+2j+2)!
}
\]

at isolate layer \(j=1,2,3,4\).  The remaining polynomials in \(r,x\)
have, respectively:

- 73 nonzero monomials, all with positive coefficients;
- 128 nonzero monomials, all with positive coefficients;
- 198 nonzero monomials, all with positive coefficients;
- 283 nonzero monomials, all with positive coefficients.

The smallest coefficient in all four certificates is \(4\).  Every
specialization at \(q=4,\ldots,9\) replays the independent fixed-rank
formula exactly.

The first two symbolic proofs are in
`prove_path_isolate_first_two_layers_all_ranks.py`, with durable
output `path_isolate_first_two_layers_all_ranks_20260730.json`.  The
third is in `probe_path_isolate_third_layer_all_ranks.py`, with
durable output
`path_isolate_third_layer_all_ranks_20260730.json`.  Layer four is
derived directly in the binomial basis by
`derive_path_isolate_layer_direct.py`, with durable output
`path_isolate_layer_4_direct_20260730.json`; its specializations at
all six fixed ranks are independently replayed by
`verify_path_isolate_layer4_specializations.py`.
The layer-five statement follows from the positive transition
\(c_{q,5}-c_{q-1,4}\) and the already proved layer four, with the
rank-four fixed certificate as the base.  The positive transition
\(c_{q,6}-c_{q-1,5}\) then proves layer six from layer five and the
same rank-four base.  Thus the remaining
all-rank terminal obligation begins at
\(c_{q,7}\), together with the short-path range
\(L<2q-4\).

The direct binomial engine uses the exact nonnegative product rule

\[
\binom ta\binom tb
=\sum_{j=\max(a,b)}^{a+b}
\frac{j!}{(a+b-j)!(j-a)!(j-b)!}\binom tj.
\]

This exposes every isolate coefficient as a subset-union
polarization of the phase quadratic.  Individual polarizations can
be negative, so positivity is genuinely a grouped phenomenon.
Nevertheless the stable isolated-vertex differences

\[
c_{q,j+1}(L)-c_{q-1,j}(L)
\]

have coefficientwise-positive certificates for
\(j=0,1,2,3,4,5\).  After
the same shifts their positive remainders have respectively 70, 125,
195, 280, 380, and 495 monomials, every coefficient positive and the
smallest again equal to \(4\).  The term counts follow
\[
\frac{15j^2+95j+140}{2}
\]
for all six proved transitions.  The certificates are produced by
`prove_path_isolate_stable_p4_layer.py`.  Thirty independent
fixed-formula specializations, all six transitions at
\(q=5,\ldots,9\), are replayed by
`verify_path_isolate_stable_p4_specializations.py`.  This recurrence,
rather than independent expansion of every \(c_{q,j}\), is the
current route to the uniform terminal theorem.

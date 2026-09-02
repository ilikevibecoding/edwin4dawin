# Stable path P4: the bottom-intersection base theorem

Let \(Q_q^L(a,b)\) be the complete distinguished-isolate kernel
defined in `derive_path_isolate_p4_symbolic_kernel.py`, and set

\[
H_q^L(j,h)=\binom jh
\sum_{u=0}^{j-h}\binom{j-h}{u}
Q_q^L(h+u,j-u).
\]

This note proves the \(h=0\) group at its first supported rank.  Write
\(j=2m+\epsilon\), where \(\epsilon\in\{0,1\}\), take \(m\ge3\), and
put

\[
q=m+2,\qquad L=2q-4+x=2m+x,\qquad x\ge0.
\]

Then \(H_q^L(j,0)>0\).  More precisely,

\[
\frac{H_{m+2}^{\,2m+x}(2m,0)}{\binom{2m}{m}}
=
\frac{4(12m^3+4m^2x-6m^2+6mx+33m+2x+9)}
{(m+1)(m+2)}
\]

and

\[
\frac{H_{m+2}^{\,2m+x}(2m+1,0)}
{\binom{2m+1}{m}}
=\frac{8(m+1)}{m+2}.
\]

For the even formula, substituting \(m=3+k\) changes the polynomial
inside the factor \(4\) to

\[
12k^3+4k^2x+102k^2+30kx+321k+56x+378,
\]

whose coefficients are all strictly positive.

## Why the symbolic sum is finite

Every coordinate in the left slot of the ordered P4 polarization has
residual path rank at most \(q-a+1\); every coordinate in the right
slot has residual path rank at most \(q-b+2\).  Selected-state terms
lower these bounds by one.  At \(q=m+2\), the even substitution
\((a,b)=(m+v,m-v)\) therefore leaves only
\(-4\le v\le3\).  The odd substitution
\((a,b)=(m+v,m+1-v)\) leaves only \(-3\le v\le3\).
All omitted summands vanish by support.  The same support audit shows
that the whole group is zero below \(q=m+2\).

The proof script sums these eight or seven surviving terms using the
closed path formulas and simplifies them exactly:
`prove_path_isolate_p4_bottom_edge_minimal_rank.py`.  Its certificate
is `path_isolate_p4_bottom_edge_minimal_rank_20260730.json`.

An independent integer replay constructs the terminal states directly
from path counts.  It checks \(3\le m\le20\), \(0\le x\le20\), every
off-window zero, and every lower-rank zero:
`verify_path_isolate_p4_bottom_edge_minimal_rank.py`.

This theorem supplies the base case needed by the candidate
rank-lift inequality

\[
H_q^{\,L}(j,0)\ge H_{q-1}^{\,L-2}(j,0).
\]

That lift is still a separate unproved statement; this note does not
claim it.

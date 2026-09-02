# Stable path P4: the first two bottom-edge rank lifts

Write

\[
j=2m+\epsilon,\quad
q=m+s+2,\quad
L=2q-4+x,
\]

where \(m\ge3\), \(\epsilon\in\{0,1\}\), and \(x\ge0\).  For each
\(s=0,1,2\), the bottom fixed-intersection group

\[
H_q^L(j,0)
\]

is strictly positive.  Moreover, after dividing by the common
positive central binomial coefficient,

\[
H_{m+3}^{\,2m+2+x}(j,0)
\ge H_{m+2}^{\,2m+x}(j,0)
\]

and

\[
H_{m+4}^{\,2m+4+x}(j,0)
\ge H_{m+3}^{\,2m+2+x}(j,0).
\]

Thus the candidate stable rank lift is proved for its first two
steps, for every input layer and every stable excess.

On this same three-rank strip, the normalized two-layer lift is also
proved:

\[
\frac{H_{m+s+3}^{\,2m+2s+2+x}(2m+2+\epsilon,0)}
{\binom{2m+2+\epsilon}{m+1}}
\ge
\frac{H_{m+s+2}^{\,2m+2s+x}(2m+\epsilon,0)}
{\binom{2m+\epsilon}{m}}
\qquad(s=0,1,2).
\]

The six exact difference certificates are produced by
`prove_path_isolate_p4_bottom_first_layer_lifts.py`.

## Certificate

At fixed \(s\), path-rank support leaves \(2s+8\) terms for even
\(j\) and \(2s+7\) terms for odd \(j\).  The proof script evaluates
those finite sums exactly.  After \(m=3+k\), all six group
numerators and all four consecutive-difference numerators have only
nonnegative coefficients in \(k,x\), with positive denominators:

`prove_path_isolate_p4_bottom_edge_first_rank_lifts.py`.

The exact degrees, term counts, smallest coefficients, and SHA-256
hashes are in
`path_isolate_p4_bottom_edge_first_rank_lifts_20260730.json`.

The independent finite replay of the unrestricted rank-lift
inequality is
`stress_path_isolate_p4_bottom_rank_lift.py`.  The theorem here is
uniform only for \(s=0,1,2\); the lift for arbitrary \(s\) remains
open.

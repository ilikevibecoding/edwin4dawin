# Stable path P4: the \(j=7\) bottom-pair base

For every \(q\ge5\) and \(L\ge2q-4\),

\[
H_q^L(7,0)+H_q^L(7,1)>0.
\]

This is the odd finite base required by the bottom-pair layer
reduction.  The corresponding \(H(7,0)\)-only ordinary monomial
certificate is signed, so pairing with \(H(7,1)\) is essential at
the certificate level.

Set

\[
q=5+r,\qquad L=2q-4+x.
\]

After division by the positive factor

\[
\frac{
2(q+x-4)!(q+x-2)!
}{
q!(q-2)!(x+16)!(x+18)!
},
\]

the bottom pair factors as

\[
16(r+1)(r+2)(r+3)
\prod_{i=11}^{16}(x+i)
\prod_{i=4}^{6}(r+x+i)
\,P(r,x),
\]

where \(P\) is a polynomial of degree \((19,21)\).  Equivalently,
the complete normalized numerator has degree \((25,30)\).
Its exact ordinary monomial expansion contains 668 nonzero terms,
no negative coefficient, and smallest coefficient \(1792\).
Every displayed prefactor is positive for \(r,x\ge0\), proving the
claim.

The replayable certificate is
`path_isolate_p4_bottom_pair_fixed_layer_j7_20260730.json`, generated
by `prove_path_isolate_p4_bottom_pair_fixed_layer.py --layer 7`.

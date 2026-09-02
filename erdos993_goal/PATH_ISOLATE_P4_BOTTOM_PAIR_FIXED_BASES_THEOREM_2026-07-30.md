# Stable path P4: fixed bottom-pair bases \(j=6,7\)

For every \(q\ge5\) and \(L\ge2q-4\),

\[
H_q^L(j,0)+H_q^L(j,1)>0
\qquad(j=6,7).
\]

These are exactly the two bases needed by the candidate bottom-pair
two-layer lift.

With \(q=5+r\) and \(L=2q-4+x\), division by the standard positive
stable-P4 factorial factor gives the following exact ordinary
monomial certificates:

| \(j\) | numerator degree in \((r,x)\) | nonzero monomials | negative | smallest |
|---:|---:|---:|---:|---:|
| 6 | \((23,27)\) | 550 | 0 | 768 |
| 7 | \((25,30)\) | 668 | 0 | 1,792 |

All remaining displayed factors in both remainders are products of
positive linear factors in \(r,x\).  Hence both bottom pairs are
strictly positive throughout the stated domain.

The replayable certificates are
`path_isolate_p4_bottom_pair_fixed_layer_j6_20260730.json` and
`path_isolate_p4_bottom_pair_fixed_layer_j7_20260730.json`, generated
by `prove_path_isolate_p4_bottom_pair_fixed_layer.py`.

The \(j=7,h=0\)-only ordinary monomial certificate is signed.
Therefore the successful \(j=7\) paired certificate is not cosmetic:
it records a real cancellation supplied by \(H(7,1)\).

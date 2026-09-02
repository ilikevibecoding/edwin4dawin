# Counterexample to the proposed general two-layer group lift

The proposed sufficient lemma

\[
G(c,m+1,s,x,\varepsilon)\geq G(c,m,s,x,\varepsilon)
\]

is false, although the individual group values in the example below
remain positive.

An exact counterexample is

\[
(c,m,s,x,\varepsilon)=(0,8,6,45,0).
\]

Direct integer evaluation gives

\[
G(0,8,6,45,0)=1\,615\,133\,332\,049\,538\,994\,398,
\]

\[
G(0,9,6,45,0)=1\,244\,910\,012\,270\,670\,899\,802,
\]

and hence

\[
G(0,9,6,45,0)-G(0,8,6,45,0)
=-370\,223\,319\,778\,868\,094\,596<0.
\]

The difference stays negative for \(45\leq x\leq55\) at these
fixed values and becomes positive again at \(x=56\).  Thus the
failure is not a coordinate-basis artifact.

The exact support-distance-\(6\) interpolation and cone audit record
this obstruction in
`path_isolate_p4_boundary_s6_newton_interpolation_20260730.json` and
`path_isolate_p4_boundary_s6_cone_certificate_20260730.json`.
The quotient-order-\(7\) certificate also fails, as it must, in
`path_isolate_p4_general_layer_lift_order7_sparse_20260730.json`.

Consequences:

1. The boundary theorem remains proved only for
   \(s=-1,0,1,2,3,4,5\).
2. The finite-base propagation through monotonicity in \(m\) cannot
   prove all fixed-intersection groups.
3. This is **not** a counterexample to the P4 inequality or to the
   Alavi--Malde--Schwenk--Erdős conjecture: both displayed group
   values are positive.  The next proof target is direct positivity
   of \(G\), allowing nonmonotonicity in \(m\), or a weaker
   cancellation across fixed-intersection groups.

# Utilization curvature: universal triple-copy kernel

Date: 2026-08-02

Let

\[
f_j=-\Phi_j(L),\qquad s_j=\Phi_j(S),\qquad
g_j=(n-j)s_j=nR_j,qquad d=n-j.
\]

The desired strict convexity is equivalent to positivity of

\[
\mathcal C_j=
 f_{j+1}g_jg_{j-1}-2f_jg_{j+1}g_{j-1}
 +f_{j-1}g_{j+1}g_j.                                \tag{1}
\]

Use three independent copies of the common coefficient extraction and
write

\[
x_i=\frac{w_i}{1+z_i}.
\]

After removing the common positive binomial factor
`C(n,j-1)C(n,j)C(n,j+1)`, symmetrizing the two reserve copies, and
clearing the common Laurent monomial, twice (1) is the cyclic extraction
of the averaged tensor

\[
\frac13\sum_{\{i,j,k\}=\{1,2,3\}}
 (-L_i)S_jS_k\,B_i,                                  \tag{2}
\]

where

\[
B_i={}
d(d+1)x_i^2(x_j+x_k)
-2(d^2-1)x_i(x_j^2+x_k^2)
+d(d-1)x_jx_k(x_j+x_k).                              \tag{3}
\]

Equivalently, without Laurent variables, factor from each copy
`w_i^(j-1)(1+z_i)^(d-1)`.  Formula (3) then becomes the degree-six
polynomial

\[
\begin{aligned}
\widetilde B_i={}&d(d+1)w_i^2\bar z_j\bar z_k
 (w_j\bar z_k+\bar z_jw_k)\\
&-2(d^2-1)w_i\bar z_i
 (w_j^2\bar z_k^2+\bar z_j^2w_k^2)\\
&+d(d-1)\bar z_i^2w_jw_k
 (w_j\bar z_k+\bar z_jw_k),
\end{aligned}                                        \tag{4}
\]

with `bar z_i=1+z_i`.

Equivalently, omitting the factor `1/3` in (2) gives six times (1).

The key cancellation is

\[
B_1+B_2+B_3=
2\sum_{i\ne j}x_i^2x_j>0.                            \tag{5}
\]

Every coefficient of `d^2` and `d` cancels in (5).  Thus if the signed
numerator source were equal to the reserve source, (2) would have a
strictly positive, order-independent baseline curvature.  In the actual
problem, write `-L=S+E`; the remaining proof burden is exactly the
cyclic error extraction

\[
\frac13\sum_i E_iS_jS_kB_i.                          \tag{6}
\]

This is sharper than the raw 3-by-3 determinant: it isolates a canonical
positive part and leaves a bounded-degree universal insertion acting on
the fixed source mismatch.  The symbolic certificate is
`path_isolate_p4_affine_parameter_monotonicity_utilization_curvature_triple_kernel_20260802.json`.

Raw coefficientwise positivity of (2) is false.  Exact targeted
coefficient evaluation finds negative coefficients in both hard families
at every separately sampled value
`d=2,3,5,10,24,25,26,30,100`, usually among the first six supported
targets.  At `d=2` the first values are `-163305409406860` in the group
case and `-147142819440762932` in the bottom case.  Hence neither
curvature boundary has a raw termwise proof: the outer `A^aT^b`
smoothing and its variation-diminishing action are essential throughout.
The source tensor cannot be certified before extraction.  See
`path_isolate_p4_affine_parameter_monotonicity_triple_curvature_source_coefficients_20260802.json`.

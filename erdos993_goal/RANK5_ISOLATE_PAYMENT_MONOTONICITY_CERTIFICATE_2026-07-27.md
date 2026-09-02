# Rank-5 isolate-payment monotonicity

Date: 2026-07-27

Status: **proved theorem**.

## Theorem

Let \(C\) be a forest of order at least \(13\), let \(H\) be a related
root-deleted forest, and put

\[
D_s=(1+x)^sI(C;x).
\]

Write

\[
d_s=i_3(D_s),\quad e_s=i_4(D_s),\quad f_s=i_5(D_s),
\qquad h=i_3(H),\quad k=i_4(H),
\]

and

\[
a_s=e_s+h,\qquad b_s=f_s+k.
\]

Define the rank-5 rooted payment

\[
\begin{aligned}
M_s={}&6a_s(a_s+d_s)
       (8e_s^2-d_se_s-10d_sf_s)\\
&+a_sd_se_s(a_s+d_s+2e_s)
  +2a_s^2e_s^2
  -50(b_sd_s-a_se_s)^2.
\end{aligned}
\tag{1}
\]

Under the exact normalized hypotheses of the terminal single-stem
lemma,

\[
\boxed{M_s\ge M_0\qquad(s=0,1,2,\ldots).}
\tag{2}
\]

In particular, once the no-sibling payment \(M_0\) is nonnegative,
adjoining any number of sibling leaves preserves nonnegativity.

## Finite-difference reduction

If \(c_j=i_j(C)\), then

\[
i_j(D_s)=\sum_{\ell=0}^j\binom{s}{\ell}c_{j-\ell}.
\]

Hence \(M_s\) is a polynomial in \(s\) of degree at most \(15\).
Newton interpolation gives

\[
M_s=\sum_{j=0}^{15}\binom{s}{j}\Delta^jM_0.
\tag{3}
\]

It is therefore enough to prove

\[
\Delta^jM_0\ge0\qquad(1\le j\le15).
\tag{4}
\]

## Normalized coefficient cone

Normalize \(c_3=1\) and put

\[
X=\frac{c_3}{c_4},\qquad
w=\frac{c_2}{c_3},\qquad
y=\frac{c_1}{c_2}.
\]

The proved rank-3 reserve and rank-2 factorial curvature give

\[
0\le w\le\frac{6X}{X+8},
\qquad
0\le y\le\frac{2w}{3}.
\tag{5}
\]

Because \(c_1=Nc_0\) and \(N\ge13\),

\[
c_0\le\frac{wy}{13}.
\tag{6}
\]

The elementary bound \(i_2(C)\le\binom N2\) also gives

\[
c_0\le\frac{wy^2}{y+2}.
\tag{7}
\]

The two endpoints (6)--(7) exchange dominance exactly at \(y=1/6\).
The region in (5) is therefore covered by four rational unit boxes:

1. \(X\le8/23\), where \(w\le1/4\) and (7) is sharper;
2. \(X\ge8/23,\ w\le1/4\), again using (7);
3. \(X\ge8/23,\ w\ge1/4,\ y\le1/6\), using (7);
4. \(X\ge8/23,\ w\ge1/4,\ y\ge1/6\), using (6).

These are the four maps reconstructed exactly by
`coefficient_regions` in the verifier.

## Rooted endpoint cone

Put

\[
D=1-\frac{c_3c_5}{c_4^2},\qquad
r=\frac{h}{c_3},\qquad q=\frac{k}{c_4}.
\]

The single-stem structural inputs give

\[
\frac{2+X}{10}\le D\le1,\qquad
\frac12\le r,q\le1,\qquad
q\ge r-\frac D2.
\tag{8}
\]

For every \(j\), direct differentiation gives

\[
\frac{\partial^2}{\partial k^2}\Delta^jM_0
=-100\,\Delta^j(d_s^2)\big|_{s=0}\le0.
\]

Thus each forward difference is concave in \(q\).  Its minimum occurs
on one of the two \(q\)-endpoints.  Splitting where
\(\max(1/2,r-D/2)\) changes branch produces four exact unit boxes:

- `q_upper`;
- `q_half_low_r`;
- `q_half_high_r`;
- `q_cross`.

## Exact Bernstein certificate

The low differences \(\Delta^1,\ldots,\Delta^4\) already hold on a
larger cone using only the rank-3 reserve, the two-step factorial drop,
and the elementary rank-1 reserve.  Their exact certificate checks
298,314 leaf-patch coefficients; only two patches require subdivision,
both to depth \(2\).

For \(\Delta^5,\ldots,\Delta^{15}\), crossing the four coefficient
boxes with the four rooted endpoint boxes gives sixteen polynomial
boxes per difference.  After clearing explicitly positive
denominators, every tensor-Bernstein coefficient is nonnegative without
subdivision:

\[
\begin{array}{c|r}
\text{rooted endpoint family}&
\text{coefficients for }\Delta^5,\ldots,\Delta^{15}\\ \hline
q_{\rm upper}&448{,}090\\
q_{\rm half,low}&544{,}830\\
q_{\rm half,high}&544{,}830\\
q_{\rm cross}&544{,}830
\end{array}
\]

Together, the two verifiers check

\[
\boxed{2{,}380{,}894}
\]

exact rational Bernstein coefficients.

Equation (3) now proves (2).

## Verification

Run

```powershell
python .\verify_rank2_factorial_curvature_forests.py
python .\verify_rank5_isolate_payment_low_differences.py
python .\verify_rank5_isolate_payment_curvature_cone.py
```

The last command checks all four rooted endpoint regions and all four
coefficient regions for \(\Delta^5,\ldots,\Delta^{15}\); the preceding
companion checks the four low differences on a broader cone.

# Double-broom diagonal gap: exact Newton total `i+j=7`

Date: 2026-08-29

Status: **exact all-path-order, all-rank fixed-total theorem.**  Combined with
the frozen `h<=6` results, this proves the connected double-broom terminal
Newton collar `i+j<=7`.

For each unordered pair `(0,7)`, `(1,6)`, `(2,5)`, `(3,4)`, the universal
four-carrier decomposition

\[
G_{i,j}=\mathcal O_{M_A,R_A}(H_A)+\mathcal O_{M_B,R_B}(H_B)
+\mathcal O_{M_C,R_C}(H_C)+\mathcal O^{CD}_{F,Q}(D)
\]

is verified identically.  Here

\[
\mathcal O_{M,R}(H)=M[pH-\delta\partial_pH]-\delta RH,
\qquad
\mathcal O^{CD}_{F,Q}(H)=\delta FH+2\delta^2Q\partial_pH.
\]

All four carriers are `s=z+w,p=zw`-positive by path-root factorization,
positive partial fractions for the consecutive cross product, and the exact
consecutive CD recurrence.  On `H=s^a p^b`, both parities `a=2m+epsilon` and
all weighted layers reduce to `348` exact rational certificates.  Every
numerator and denominator has nonnegative coefficients in `m,b`, and every
denominator has positive constant term.  Thus every diagonal is
nonnegative for every carrier exponent, path order, and rank.

The replay also exhausts the fixed `n=2,3` terminal bases (`92` cells) and
the fixed `n=4,5` path-Pascal gaps (`100` cells) on their full support.

Run

```powershell
python .\prove_iso_double_broom_diagonal_gap_fixed_total_agent.py --total 7
```

Marker and hashes:

```text
PASS_EXACT_ALL_PATH_ORDER_DOUBLE_BROOM_DIAGONAL_GAP_NEWTON_TOTAL_H_7

source SHA256:
FA84F3309552009ABB02B3AD3FCF6E5F0A5F484CC694D7BD412B8BF5117E6ED6

report SHA256:
527C67BE1F4DAA6DD9B39272F0EC44330603CC777ABE50B7A0977291C9FEB353

value-stream SHA256:
DA929E61158DA8C40918DADB75502972E7D43B8E18B7572C22BDEB820D12DA4F
```

The exact fixed-total source is reusable, but this report proves only
`i+j=7`; it does not promote untested totals.  The uniform all-`i,j` proof
and arbitrary-forest ISO remain open.

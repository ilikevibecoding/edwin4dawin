# Double-broom diagonal gap: exact Newton collar `i+j<=5`

Date: 2026-08-29

Status: **exact all-path-order, all-rank theorem for the finite leaf-Newton
collar `i+j<=5`.**  Newton indices `i+j>=6` remain a separate obligation, so
this is not the full double-broom theorem, arbitrary-forest ISO, or a solution
of Erdős Problem 993.

Put

\[
s=z+w,\qquad p=zw,\qquad \delta=\frac{(z-w)^2}{2}.
\]

For a symmetric polynomial `H=H(s,p)`, define

\[
\mathcal O_{M,R}(H)=M\bigl(pH-\delta\partial_pH\bigr)-\delta RH,
\tag{1}
\]

and

\[
\mathcal O^{CD}_{F,Q}(H)=\delta FH+2\delta^2Q\partial_pH.
\tag{2}
\]

The identity behind (1) is

\[
\frac{z-w}{2}(\partial_z-\partial_w)H=-\delta\partial_pH.
\]

## Exact four-carrier decomposition

For path order `n>=6`, set

\[
A=P_{n-6},\qquad B=P_{n-5}
\]

and use the consecutive path recurrence to write

\[
T=B+xA,\qquad S=(1+x)B+xA,\qquad R=(1+x)T+xB.
\]

Thus the three terminal path triples are `(R,S,T)`, `(S,T,B)`, and
`(T,B,A)`.  For every fixed leaf-Newton pair `(i,j)`, direct polarization of
the compact nested operator gives the corrected path-Pascal gap

\[
G_{i,j}=N_{i,j}(F_n)-N_{i,j}(F_{n-1})-pN_{i,j}(F_{n-2}).
\]

The replay extracts exact symmetric multipliers and proves the identity

\[
G_{i,j}=
\mathcal O_{M_A,R_A}(H_A)+
\mathcal O_{M_B,R_B}(H_B)+
\mathcal O_{M_C,R_C}(H_C)+
\mathcal O^{CD}_{F,Q}(D),
\tag{3}
\]

where

\[
\begin{aligned}
H_A&=A(z)A(w),\\
H_B&=B(z)B(w),\\
H_C&=A(z)B(w)+B(z)A(w),\\
D&=\frac{B(z)A(w)-A(z)B(w)}{z-w}.
\end{aligned}
\]

The factor `2` in the second term of (2) is essential.  If
`B(z)A(w)-A(z)B(w)=(z-w)D`, then

\[
(\partial_z-\partial_w)((z-w)D)=2D+(z-w)(\partial_z-\partial_w)D,
\]

and `(partial_z-partial_w)D=-(z-w)partial_pD`, which yields (2) exactly.

## Why all four carriers are `s,p`-positive

The path factorization

\[
P_m(x)=\prod_t(1+\lambda_tx),\qquad \lambda_t>0,
\]

gives

\[
P_m(z)P_m(w)=\prod_t(1+\lambda_ts+\lambda_t^2p),
\]

so `H_A` and `H_B` have nonnegative `s,p` coefficients.

Consecutive path roots strictly interlace.  Hence the Stieltjes partial
fraction expansion has

\[
\frac{P_{m-1}(x)}{P_m(x)}
=c+\sum_t\frac{\rho_t}{1+\lambda_tx},
\qquad c\ge0,\quad \rho_t>0.
\]

After symmetrizing and multiplying by `P_m(z)P_m(w)`, each summand is

\[
\rho_t(2+\lambda_ts)
\prod_{q\ne t}(1+\lambda_qs+\lambda_q^2p),
\]

and the constant part is `2c P_m(z)P_m(w)`.  Therefore `H_C` is also
`s,p`-positive.

Finally, the exact consecutive-path Christoffel--Darboux recurrence

\[
D_m=P_{m-2}(z)P_{m-2}(w)+pD_{m-2},\qquad D_1=D_2=1,
\]

proves `s,p`-positivity of `D` by induction.

## Universal diagonal certificates

It remains only to test (1)--(2) on a carrier monomial

\[
H=s^ap^b,\qquad a=2m+\epsilon,\quad \epsilon\in\{0,1\}.
\]

The three central identities are

\[
\begin{aligned}
[z^mw^m]s^{2m}&=\binom{2m}{m},\\
-\,[z^{m+1}w^{m+1}]\delta s^{2m}
&=\frac{1}{m+1}\binom{2m}{m},\\
[z^{m+2}w^{m+2}]\delta^2s^{2m}
&=\frac{3}{(m+1)(m+2)}\binom{2m}{m}.
\end{aligned}
\tag{4}
\]

For each unordered pair `(i,j)` with `i+j<=5`, each of the four operators,
both parities, and every weighted output layer, the JSON records the exact
coefficient after division by `C(2m,m)`.  Every recorded rational function
has a numerator and denominator with nonnegative coefficients in `m,b`, and
the denominator has positive constant term.  Equation (4) therefore proves
every carrier-monomial contribution nonnegative for all `m,b>=0`.  Since all
four carriers are `s,p`-positive, (3) proves every diagonal of `G_(i,j)` is
nonnegative for `n>=6`.

The fixed polynomials at `n=2,3` have nonnegative terminal diagonals on their
entire support, and the fixed `n=4,5` gaps do as well.  These are exhaustive
finite bases, not extrapolated evidence.  The recurrence then proves every
path order and rank in the collar.

## Replay and immutable hashes

Run

```powershell
python .\prove_iso_double_broom_diagonal_gap_agent.py
```

It ends with marker

```text
PASS_EXACT_ALL_PATH_ORDER_DOUBLE_BROOM_DIAGONAL_GAP_NEWTON_COLLAR_H_LE_5
```

The replay certifies `692` universal operator layers, `2,075` carrier
`s,p` cells, `184` complete base-terminal cells, and `208` complete base-gap
cells.

```text
source SHA256:
AFA479389839C253A3181989F8E036D88378516FBE06CCBA8753B66A3130ECCB

report SHA256:
C8EC4B72B7017F25B8353C3642E1148DAAA918C99CCFCA79C1ECD889DD99C514

value-stream SHA256:
4A451F36B6EFBBAD3E5EBD2B34952141A0911519450314CF73DA860BC122CD23
```

The exact remaining double-broom obligation begins at `i+j=6`.

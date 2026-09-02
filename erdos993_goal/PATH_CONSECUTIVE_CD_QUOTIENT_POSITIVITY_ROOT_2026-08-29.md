# Consecutive-path Christoffel--Darboux quotient

Date: 2026-08-29

Status: **exact all-order auxiliary lemma.** This supplies the positive path
determinant requested by the double-broom ISO reduction. The final
double-broom substitution and arbitrary-forest recurrence remain separate.

Let `P_n(x)=I(P_n;x)`, so

```text
P_n(x)=P_(n-1)(x)+xP_(n-2)(x),  P_0=1, P_1=1+x.
```

For `n>=1`, define

```text
D_n(z,w)=
 [P_n(z)P_(n-1)(w)-P_n(w)P_(n-1)(z)]/(z-w).
```

Then `D_1=D_2=1`, and two substitutions of the path recurrence give

```text
D_n(z,w)=P_(n-2)(z)P_(n-2)(w)+zw D_(n-2)(z,w).    (1)
```

Both summands on the right of (1) have nonnegative integer coefficients.
Strong induction therefore proves that `D_n` is coefficientwise nonnegative
for every `n>=1`.

Run

```powershell
python .\prove_path_consecutive_cd_quotient_root.py
```

to replay exact divisibility, recurrence, and coefficient positivity through
path order 40. It ends with

```text
PASS_EXACT_ALL_ORDER_PATH_CONSECUTIVE_CD_QUOTIENT_POSITIVITY
```

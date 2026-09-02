# Terminal q3 m=0 Euler row identity

Date: 2026-08-29

Let `F=sum f_k x^k`, `H=sum h_k x^k`, `theta=x d/dx`, and put

```text
P=p0, A=A0, D=3P(P+a),
L=A+P(c0+R0), Q=P(P+a)z3.
```

After dividing the retained-`h_(j-1)` certificate by the positive factor
`a`, define

```text
M=f3*A*theta(F+xF+xH+x^2H)
 +f3*P(c0+R0)*theta(xF)
 -f3*D*x(F+H)
 -Q*x*theta(F).                                     (1)
```

The coefficient rule `[x^n]theta(G)=n[x^n]G` gives, for every `j>=1`,

```text
[x^(j+1)]M
=f3(j+1)A(f_(j+1)+h_(j-1))
 +{f3[(j+1)L-D]-jQ}f_j
 +f3[(j+1)A-D]h_j
=C_repaired(j)/a.                                  (2)
```

This packages all ranks into one exact row-correlated polynomial.  It is a
coefficient-extraction identity only: no coefficientwise sign of `M`, no
terminal Newton `m=0` theorem, and no claim about Erdos Problem 993 follows
without a separate cone proof.

Provenance correction: an exploratory message written before this artifact
omitted the `xF` summand inside the first theta.  That formula was retracted.
Only equations (1)-(2), with `theta(F+xF+xH+x^2H)`, are valid and frozen.

Replay:

```powershell
python .\prove_terminal_q3_m0_euler_row_identity_adversary.py
```

Required marker:

```text
PASS_EXACT_TERMINAL_Q3_M0_EULER_ROW_IDENTITY
```

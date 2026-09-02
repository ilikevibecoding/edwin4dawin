# Terminal q3 Newton m=0: retained h_(j-1) decomposition

Date: 2026-08-29

## Exact repair

At Newton degree zero, with `P=p0`, `A=Pc-aR`, and

```text
U=f_(j+1)+h_j+f_j+h_(j-1),
e=z_j+h_j+f_j,
```

the normalized terminal coefficient is exactly

```text
delta0=(j+1)a A U
      +aP((j+1)f_j(c+R)-3(P+a)e).                 (1)
```

If `C_repaired` is the denominator-cleared expression obtained by replacing
`q_j=z_j/(j f_j)` with `q3=z3/(3f3)` while retaining every term of `U`, then

```text
f3 delta0
=C_repaired+aP(P+a)(j z3 f_j-3f3 z_j)
=C_repaired+3jaP(P+a)f_j f3(q3-q_j).              (2)
```

The last term is nonnegative under the legitimate smaller-forest induction
`q_j<=q3`.  Therefore `C_repaired>=0` is sufficient.  The earlier certificate
dropped the positive `(j+1)aA h_(j-1)` contribution and is strictly weaker.

## Exact N=31 obstruction and repair

For the order-32 tree whose marked leaf is attached to the centre of a
four-arm spider with subdivision lengths `(26,0,0,0)`, at `j=10`:

```text
old cleared certificate = -25,884,328,496,159,880,
actual terminal delta0  = 109,392,881,205,454,920,
h_9                     = 893,741,
q3-q10                  = 181037953/464493855.
```

The exact retained containment reserve is

```text
(j+1)aA h_9 = 10,552,645,408,278,600,
```

which already repairs the old deficit before using any positive `q3-q10`
reserve.  Thus this cell is a fail-closed obstruction only to the dropped-row
certificate, not to the repaired q3 certificate or to the theorem.

## Replay

```powershell
python .\prove_terminal_q3_m0_retained_hprev_decomposition_adversary.py
```

Required marker:

```text
PASS_EXACT_TERMINAL_M0_RETAINED_HPREV_DECOMPOSITION
```

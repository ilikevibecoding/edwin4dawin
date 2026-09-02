# Rank-eight low/high `b5` terminal-compression reduction

Date: 2026-08-20

Status: **exact cubic reduction, certified cubic factor, and exact value
counterexample to monotone `b5` compression.**

Assume `b6=b7=0`.  Compare the actual partner with gap `b5=z` and terminal
`tb=t` against the row with `b5=0` and terminal `t+z`.  Their coefficients
through `q6` agree.  Put

```text
A = q6*(2*t+3*h+8*a1),
D = q8+t*q6*(2*t+3*h)+9*a1*q6*(2*t+3*h)+36*a2*q6,
E = q6*(3*t+3*h+9*a1).
```

The shifted convolution coefficients are exactly

```text
c7' = c7 + z*q6,
c8' = c8 + z*A + z^2*q6,
c9' = c9 + z*D + z^2*E + z^3*q6.
```

The cleared payment kernel changes by

```text
K' = K - 168*z*q5*q6.
```

Direct expansion therefore gives the no-remainder identity

```text
P_actual-P_shifted = z*E1 + z^2*E2 + z^3*E3,

E1 = c7*D+q6*c9-2*c8*A
     +h*(c7*A+q6*c8)-168*h*a1*a2*q5*q6,

E2 = c7*E+q6*D-A^2-2*c8*q6+h*q6*(c7+A),

E3 = q6*(c7-q7-7*a1*q6).
```

The nominal `z^4` coefficient cancels exactly.  Moreover,

```text
E3 = q6*sum_(i=2)^7 C(7,i)*a_i*q_(7-i) >= 0.
```

The exact replay materialized 5,095,973 coefficients of `E3`; all were
nonnegative and the minimum was 1.  The formula itself is the structural
proof, while the coefficient pass is a replay check.

```text
source 4C4CF4BC145D2560012A0FC068E575186CC2E822C13BE3B8E0A1C9162EB8D9E3
E3 report 23F700444A3C4A74ADB98D4569002D348AAED44F144E6F66E55680AEC50230D4
```

The proposed compression inequality is false.  At `h=1`, take

```text
A = [109,7,6,5,4,3,2,1,0],
B_actual  = [10010,10008,10007,10006,10005,10004,10002,10001,10000],
B_shifted = [10010,10008,10007,10006,10005,10004,10003,10002,10001].
```

These are valid high-cone rows: the actual partner has `b5=1,tb=10000`,
while the shifted partner has `b5=0,tb=10001`.  Exact evaluation gives

```text
P_actual-P_shifted
= -45481248895130810307473597225616841362484310330866944000 < 0.
```

Both endpoint values of `P` are strictly positive, so this is an obstruction
to the compression method only, not to the base-payment inequality.  The
direct `b5` coefficient slices remain necessary.

```text
counterexample source E9BEAF3F8BFE55ED369DE2B2E869DE30EC0B59695D32EE3EF856E26C09261167
counterexample report 5E5294A41D729D44669D9D1FAE0C1BFB61CD618E024364F509ECD8601CCAC470
```

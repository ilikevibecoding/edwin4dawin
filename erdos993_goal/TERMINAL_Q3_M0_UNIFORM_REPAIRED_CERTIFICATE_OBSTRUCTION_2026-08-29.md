# Obstruction to uniform nonnegativity of C_repaired

Date: 2026-08-29

The proposed all-order intermediate target `C_repaired>=0` is false.  The
smallest exact cell found in the expanded adversarial search has

```text
N=315, j=24, d=1, R=9, T=305, Y=8, tau=140,
subdivisions=(298,1,1,1,1,1,1,1,0).
```

An integer tree DP retaining selected/unselected root state and exactly zero
or one induced edge gives

```text
C_repaired = -33565433458469202790678446502750008540058753155545704711200,
q-gap reserve = 3568182661913991871752078485435497009549254582565755921993600,
f3*delta0 = 3534617228455522668961400038932747001009195829410210217282400,
delta0 = 698283720869530012849298210882936997321381180808139100.
```

The exact identity residual is zero.  Thus this is a counterexample only to
the uniform sign of the sufficient intermediate certificate.  It is **not**
a counterexample to terminal Newton `m=0`, the terminal-payment theorem, or
Erdos Problem 993: the quantitative `q3-q_j` reserve is positive and repairs
the deficit by a wide exact margin.

The same sign pattern is replayed at the K-concentrated and balanced arm
allocations stored in the report.  Any valid all-order proof must retain a
quantitative portion of `q3-q_j` (or an equivalent direct pendant/variance
reserve); merely using its nonnegativity and then demanding
`C_repaired>=0` cannot close.

Replay:

```powershell
python .\disprove_terminal_q3_m0_uniform_repaired_certificate_adversary.py
```

Required marker:

```text
PASS_EXACT_LITERAL_OBSTRUCTION_TO_UNIFORM_C_REPAIRED_NONNEGATIVITY
```

# Final `a2/a3` redistribution verifier plan

## Exact reduction

Set

```text
P=a2+a3,  a2=(1-z)P,  a3=zP,
Q=b2+b3,  b2=(1-w)Q,  b3=wQ.
```

Ratios 0, 1, and 2 see the corresponding fixed total.  Ratio 3 is the only
cumulative ratio that depends on `z` or `w`.  Every factor row is consequently
affine in its own coordinate, and the left capacity ratio is coordinate
independent.  All four raw auxiliaries have tensor degree at most `(2,2)`.

The integer rows

```text
(2,0,0), (2,1,0), (2,2,2)
```

produce twice the univariate degree-two Bernstein coefficients.  Their tensor
product therefore produces four times each bivariate coefficient.  Corner
`(0,0)` is the sealed full-early/suffix-4/5 face; corner `(2,2)` is the pending
`a2=b2=0` factored gap-zero/suffix-3 face.

The symbolic identity/support audit independently verifies the ratio identity,
endpoint substitutions, degree bound, full Bernstein reconstruction, supports
`0<=deg(P)<=9`, `0<=deg(Q)<=8`, and the exact cell universe.

## Compression

A naive split runs 521 separate position expansions:

```text
9*8*7 + 9 + 8 = 521.
```

The agent probe instead builds the power coefficients through coordinate degree
`(2,2)` once for each nonorigin `(P,Q)` exponent pair, then forms all needed
tensor positions in memory.  Hence only

```text
10*9 - 1 = 89
```

FLINT expansion units are needed.  Positive/positive totals return seven
positions together; either axis returns its single univariate middle position.

## Runnable package

```text
probe_rank8_low_low_a23_redistribution_bernstein_cell_agent.py
audit_rank8_low_low_a23_redistribution_identity_support_agent.py
rank8_low_low_a23_redistribution_identity_support_agent_20260822.json
verify_rank8_low_low_a23_redistribution_cells_agent.py
rank8_low_low_a23_redistribution_cells_agent_checkpoint_20260822.json
assemble_rank8_low_low_a23_redistribution_theorem_agent.py
audit_rank8_low_low_a23_probe_replay_agent.py
rank8_low_low_a23_probe_replay_agent_20260822.json
audit_rank8_low_low_a23_checkpoint_agent.py
rank8_low_low_a23_checkpoint_agent_audit_20260822.json
```

Resume or bound the exact run with

```text
python verify_rank8_low_low_a23_redistribution_cells_agent.py
python verify_rank8_low_low_a23_redistribution_cells_agent.py --max-new-expansions 1
```

Every completed expansion is atomically checkpointed.  A negative coefficient
is written to a separate first-failure report before the runner stops.  The
final assembler is fail-closed: it refuses to produce a theorem until both the
558-cell factored gap-zero endpoint report and the complete 521-position
interior report exist and pass their full universe checks.

## Current evidence and scope

The structural audit passes.  The first five high-degree expansion units
`(9,8),(9,0),(0,8),(8,8),(9,7)` pass all 23 requested positions.  The
`(8,8)` and `(9,7)` units include nonzero exact coefficients; the other extreme
positions vanish as predicted by support.  The dense `(1,1)` stress unit is
running separately.

The independent replay also passes.  It compares the actual compressed row
builder with a separately written literal cumulative-ratio/factor/convolution
engine at both corners and a rational interior point: 126 exact equalities over
two inner assignments and all three endpoint multipliers.  It then compares
all nine tensor positions on two independent coefficient matrices with the
general power-to-Bernstein formula, giving 18 further exact equalities.  A
separate checkpoint auditor reconstructs position keys and aggregates without
importing the runner's validation functions.

This package is a rigorous verifier/certificate plan plus partial exact
evidence.  It is not a completed low/low theorem until the endpoint scanner and
all 89 expansion units finish successfully.

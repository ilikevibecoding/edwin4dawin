# Exact rank-seven low/low convolution-cone theorem

## Theorem

For the rank-seven three-halves reduction, the complete low/low convolution
margin is nonnegative on its full nonnegative gap cone.

This is an exact integer-polynomial theorem.  No floating-point or sampled
coefficient evidence is used.

## Enlarged exceptional face

The old hard face is not the complete negative-support locus.  Exact probes
found additional raw negative coefficients involving `a0` and `b3`--`b6`.
The smallest face used in the completed proof is

    a=a2=b2=0.

It retains `a0,b3,b4,b5,b6` as well as the old hard-face variables.  Its
15,205,643 nonzero coefficients include 790 raw negative coefficients.

The original hard-face certificate handles 594 of them through 230 exact
quotient AM-GM blocks.  A new exact midpoint certificate handles all remaining
196 through 196 AM-GM blocks.  Both positive endpoints in the new `a0=0`
blocks contain an off-hard-face variable, so the two allocations use disjoint
positive sources.  The `a0>0` blocks are automatically disjoint from the old
hard face.  Thus the entire enlarged face is nonnegative.

## Outside-face scan

The margin is homogeneous of total degree 14.  Setting the retained variable
`b=1` is injective on monomials because the omitted exponent is recovered as
14 minus the retained total degree.  The exact verifier slices on
`(a,a0,a2,b2)` and scans all 3,060 total-degree exponent slices in the following
disjoint ranges:

- 1
- 2--20
- 21--29
- 30--47
- 48--64
- 65--256
- 257--1,530
- 1,531--3,060

The merge replay verifies the exact slice-key order, contiguous coverage with
no gap or overlap, per-range coefficient counts and extrema, and agreement of
every exceptional slice's statistics with the standalone face certificate.

The full cone has 118,516,125 nonzero coefficients.  Exactly 103,310,482 lie
outside the enlarged face.  Every one is nonnegative, with minimum 1.  The
remaining 15,205,643 coefficients exactly match the certified enlarged face.
Combining the disjoint outside and face results proves the full cone.

## Memory bound

Each slice is formed, scanned, checkpointed, and released.  The full polynomial
is never materialized.  The maximum recorded private-memory peak among the
final replays was 4.985 GiB, below the required 12 GiB cap; the standalone
enlarged-face proof peaked at 4.893 GiB.

## Replay

Run:

```powershell
python verify_rank7_low_low_enlarged_face.py
python merge_rank7_low_low_sliced_ranges.py
```

The merge consumes the eight exact range reports named in its source and must
print `PASS_EXACT_MEMORY_BOUNDED_RANK7_LOW_LOW_FULL_CONVOLUTION_CONE`.

## SHA-256

- enlarged-face verifier: `C57340F040E0079C7601D001D56568B66B9043B1C1ABBF77B9086FD3AEB6B7B8`
- enlarged-face report: `CA4D962B6FBD31E0CEF3D1D5E0D27547F1C81C34CC3798D2C76826EFABC6F594`
- sliced verifier: `17D6B13EAD97F8EAAD1A339172D45DDC4D78491BA3DE1162D889E14135500026`
- merge replay: `DB429C13AD9E75FC8D7221795699CAB229D84C10B34FD61AD98A6AB5AF057F8F`
- merged exact report: `8A396F7872ABCA4A556BC0231355CB648C5D2D75DC38F5DAEAEB11FE9491EB2A`

The merged report embeds the SHA-256 hash of every disjoint input report.

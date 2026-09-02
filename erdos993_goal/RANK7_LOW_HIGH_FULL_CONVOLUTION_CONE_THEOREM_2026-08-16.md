# Exact rank-seven low/high convolution-cone theorem

## Theorem

For the rank-seven three-halves reduction, the complete low/high convolution
margin is nonnegative on its full nonnegative gap cone.

This is an exact finite polynomial statement, proved over the integers.  It is
not an extrapolation from samples or floating-point evidence.

## Proof decomposition

The margin is homogeneous of total degree 14.  Dehomogenising at the retained
variable `b=1` is injective on monomials, because the omitted `b` exponent is
recovered as 14 minus the total retained exponent.  The exact verifier slices
on `(a,a0,a2,b1)` and scans all 3,060 exponent slices in five disjoint ranges:

- 1--43
- 44--64
- 65--256
- 257--1,530
- 1,531--3,060

The merge replay checks that these ranges are contiguous, nonoverlapping, and
equal the total-degree ordering of all four-variable exponent vectors of
degree at most 14.  It also independently recomputes per-range term counts,
negative counts, extrema, and the coefficientwise slice-key sequence.

The full margin has 113,543,730 nonzero coefficients.  Exactly 113,339,212
coefficients lie outside the enlarged `b1` face; all are nonnegative, with
minimum 1.  The remaining 204,518 coefficients are precisely the independently
reconstructed enlarged face

    a=a0=a2=b2=b3=b4=b5=b6=0.

That face has 774 negative raw coefficients.  Its exact factorization and
316-block AM-GM allocation pay every negative term, with minimum quadratic
slack 2,560 and smallest remaining positive source coefficient 121,476.
Therefore the face is nonnegative.  Combining the two disjoint parts proves
the complete low/high convolution margin nonnegative.

## Memory bound

No full polynomial is materialized.  Each slice is formed, scanned, persisted,
and released.  The largest private-memory peak recorded by the final disjoint
replays was 0.478 GiB, below the required 12 GiB cap.  Earlier construction
measurements of the densest slice peaked below 4.8 GiB as well.

## Replay

Run:

```powershell
python verify_rank7_low_high_b1_face.py
python merge_rank7_low_high_sliced_ranges.py
```

The merge consumes the five range reports named in its source and must print
`PASS_EXACT_MEMORY_BOUNDED_RANK7_LOW_HIGH_FULL_CONVOLUTION_CONE`.

## SHA-256

- sliced verifier: `9AFEF18A131C6E19BE29398566931D320D89E2E4207637C4C42F5D04777CAD3F`
- enlarged-face certificate: `EC0E30F884A8351DAA578C1EA5B8982932E89C6E958B8C04FCF9FBA7734A83F5`
- merge replay: `200B5EEADF11AF971D55C930C3E174BD345D5C4728C3BE36DDB2F12B2DABB525`
- merged exact report: `8E7363ACA615C60065B3E1C2F1A6DEC38110CF9D58CA59CB5BB7553D89DF970D`

The merged report embeds the SHA-256 hash of every disjoint input report.

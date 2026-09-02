"""Compute exact global gcds of the two repeated-root orientation pairs."""

from __future__ import annotations

import json

from certify_pf_length3_repeated_positive_root_orientation import remove_positive_content
from verify_pf_length3_repeated_resultant_reduction import build


def metadata(poly):
    return {"degrees": list(poly.degrees()), "terms": len(poly.terms())}


def main():
    source = build("odd", return_polynomials=True, include_alternate=True)
    m0 = remove_positive_content(source["orientation0"])[0]
    m1 = remove_positive_content(source["orientation1"])[0]
    n0 = remove_positive_content(source["alternate_orientation0"])[0]
    n1 = remove_positive_content(source["alternate_orientation1"])[0]
    records = {}
    for name, left, right in (("M", m0, m1), ("N", n0, n1)):
        common = left.gcd(right)
        records[name] = {
            "left": metadata(left),
            "right": metadata(right),
            "gcd": metadata(common),
            "left_quotient": metadata(left.exquo(common)),
            "right_quotient": metadata(right.exquo(common)),
        }
    print(json.dumps(records, indent=2))


if __name__ == "__main__":
    main()

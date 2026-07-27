"""Dependency-free SVG rendering of unit-distance graphs and of the 7-colouring."""

from __future__ import annotations

import math
from typing import Sequence

from .graphs import UnitDistanceGraph
from .upper_bound import NUM_COLORS, PlaneColoring

PALETTE = (
    "#e6194b",
    "#3cb44b",
    "#4363d8",
    "#f58231",
    "#911eb4",
    "#42d4f4",
    "#bfef45",
)


def graph_to_svg(
    graph: UnitDistanceGraph,
    path: str,
    size: int = 1000,
    margin: int = 24,
    colors: Sequence[int] | None = None,
) -> str:
    coords = [p.as_floats() for p in graph.points]
    xs = [c[0] for c in coords]
    ys = [c[1] for c in coords]
    span = max(max(xs) - min(xs), max(ys) - min(ys)) or 1.0
    scale = (size - 2 * margin) / span
    cx = (max(xs) + min(xs)) / 2
    cy = (max(ys) + min(ys)) / 2

    def project(pt: tuple[float, float]) -> tuple[float, float]:
        return (size / 2 + (pt[0] - cx) * scale, size / 2 - (pt[1] - cy) * scale)

    stroke = max(0.25, 90.0 / max(graph.size, 1))
    radius = max(0.8, 300.0 / max(graph.order, 1))

    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" '
        f'viewBox="0 0 {size} {size}">',
        f'<rect width="{size}" height="{size}" fill="#0d1117"/>',
        f'<g stroke="#8b949e" stroke-width="{stroke:.3f}" stroke-opacity="0.65">',
    ]
    for u, v in graph.edges:
        x1, y1 = project(coords[u])
        x2, y2 = project(coords[v])
        parts.append(f'<line x1="{x1:.2f}" y1="{y1:.2f}" x2="{x2:.2f}" y2="{y2:.2f}"/>')
    parts.append("</g><g>")
    for i, pt in enumerate(coords):
        x, y = project(pt)
        fill = PALETTE[colors[i] % len(PALETTE)] if colors else "#f0f6fc"
        parts.append(f'<circle cx="{x:.2f}" cy="{y:.2f}" r="{radius:.2f}" fill="{fill}"/>')
    parts.append("</g></svg>")

    svg = "\n".join(parts)
    with open(path, "w", encoding="utf-8") as handle:
        handle.write(svg)
    return path


def coloring_to_svg(path: str, size: int = 800, extent: float = 6.0, circumradius: float = 0.45) -> str:
    """Draw the Isbell 7-colouring as hexagonal tiles, with a unit segment for scale."""
    coloring = PlaneColoring(circumradius)
    scale = size / (2 * extent)

    def project(x: float, y: float) -> tuple[float, float]:
        return (size / 2 + x * scale, size / 2 - y * scale)

    reach = int(extent / coloring.s) + 2
    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" '
        f'viewBox="0 0 {size} {size}">',
        f'<rect width="{size}" height="{size}" fill="#0d1117"/>',
    ]
    from .upper_bound import lattice_color

    for a in range(-2 * reach, 2 * reach + 1):
        for b in range(-reach, reach + 1):
            cx, cy = coloring.center(a, b)
            if abs(cx) > extent + 1 or abs(cy) > extent + 1:
                continue
            corners = []
            for k in range(6):
                angle = math.pi / 6 + k * math.pi / 3
                corners.append(project(cx + circumradius * math.cos(angle), cy + circumradius * math.sin(angle)))
            points = " ".join(f"{x:.2f},{y:.2f}" for x, y in corners)
            fill = PALETTE[lattice_color(a, b) % NUM_COLORS]
            parts.append(f'<polygon points="{points}" fill="{fill}" fill-opacity="0.85" stroke="#0d1117" stroke-width="0.6"/>')

    x1, y1 = project(-extent + 0.6, -extent + 0.6)
    x2, y2 = project(-extent + 1.6, -extent + 0.6)
    parts.append(f'<line x1="{x1:.2f}" y1="{y1:.2f}" x2="{x2:.2f}" y2="{y2:.2f}" stroke="#ffffff" stroke-width="3"/>')
    parts.append(
        f'<text x="{(x1 + x2) / 2:.2f}" y="{y1 - 8:.2f}" fill="#ffffff" font-family="monospace" '
        f'font-size="16" text-anchor="middle">distance 1</text>'
    )
    parts.append("</svg>")

    svg = "\n".join(parts)
    with open(path, "w", encoding="utf-8") as handle:
        handle.write(svg)
    return path

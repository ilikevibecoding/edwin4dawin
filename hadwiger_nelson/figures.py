"""Matplotlib renderings of the three certificates."""

from __future__ import annotations

import math
import os
from typing import List, Sequence, Tuple

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Polygon

PALETTE = ["#e63946", "#457b9d", "#2a9d8f", "#f4a261", "#9b5de5", "#264653", "#ffd166"]


def _to_xy(points) -> List[Tuple[float, float]]:
    return [(float(p[0]), float(p[1])) for p in points]


def draw_spindle(points, edges: Sequence[Tuple[int, int]], coloring: Sequence[int],
                 path: str) -> None:
    xy = _to_xy(points)
    fig, ax = plt.subplots(figsize=(5.2, 5.2))
    for i, j in edges:
        ax.plot([xy[i][0], xy[j][0]], [xy[i][1], xy[j][1]],
                color="#555555", lw=1.6, zorder=1)
    for v, (x, y) in enumerate(xy):
        ax.scatter([x], [y], s=420, color=PALETTE[coloring[v]],
                   edgecolors="black", linewidths=1.2, zorder=2)
        ax.annotate(str(v), (x, y), ha="center", va="center",
                    fontsize=11, fontweight="bold", color="white", zorder=3)
    ax.set_title("Moser spindle (1961): 7 points, 11 unit edges,\n"
                 "no proper 3-coloring exists  \u21d2  \u03c7(\u211d\u00b2) \u2265 4")
    ax.set_aspect("equal")
    ax.axis("off")
    fig.tight_layout()
    fig.savefig(path, dpi=180)
    plt.close(fig)


def draw_five_chromatic(points, edges: Sequence[Tuple[int, int]],
                        coloring: Sequence[int], name: str, path: str) -> None:
    xy = _to_xy(points)
    fig, ax = plt.subplots(figsize=(9, 9))
    for i, j in edges:
        ax.plot([xy[i][0], xy[j][0]], [xy[i][1], xy[j][1]],
                color="#bbbbbb", lw=0.35, zorder=1)
    xs = [p[0] for p in xy]
    ys = [p[1] for p in xy]
    ax.scatter(xs, ys, s=26, c=[PALETTE[c] for c in coloring],
               edgecolors="black", linewidths=0.3, zorder=2)
    ax.set_title(f"G{name}: {len(xy)} points, {len(edges)} unit edges \u2014 "
                 f"5-colorable but (SAT-certified) not 4-colorable  \u21d2  \u03c7(\u211d\u00b2) \u2265 5")
    ax.set_aspect("equal")
    ax.axis("off")
    fig.tight_layout()
    fig.savefig(path, dpi=180)
    plt.close(fig)


def draw_hex_coloring(path: str, s: float = 0.45, radius: int = 5) -> None:
    """A patch of the 7-colored hexagonal tiling, with a unit segment overlaid."""
    ax_, ay_ = math.sqrt(3) * s, 0.0
    bx_, by_ = math.sqrt(3) * s / 2, 1.5 * s
    fig, ax = plt.subplots(figsize=(8, 7))
    for m in range(-radius - 2, radius + 3):
        for n in range(-radius - 2, radius + 3):
            cx, cy = m * ax_ + n * bx_, m * ay_ + n * by_
            if abs(cx) > radius or abs(cy) > radius * 0.9:
                continue
            color = PALETTE[(m + 3 * n) % 7]
            verts = [(cx + s * math.cos(math.pi / 6 + k * math.pi / 3),
                      cy + s * math.sin(math.pi / 6 + k * math.pi / 3)) for k in range(6)]
            ax.add_patch(Polygon(verts, closed=True, facecolor=color,
                                 edgecolor="white", linewidth=0.8))
            ax.annotate(str((m + 3 * n) % 7), (cx, cy), ha="center", va="center",
                        fontsize=7, color="white")
    ax.plot([-0.5, 0.5], [0.05, 0.05], color="black", lw=2.5)
    ax.annotate("length 1", (0, 0.13), ha="center", fontsize=10)
    ax.set_xlim(-radius + 1, radius - 1)
    ax.set_ylim(-radius * 0.75, radius * 0.75)
    ax.set_title("Hexagonal 7-coloring (hexagon diameter 9/10):\n"
                 "no two points at distance 1 share a color  \u21d2  \u03c7(\u211d\u00b2) \u2264 7")
    ax.set_aspect("equal")
    ax.axis("off")
    fig.tight_layout()
    fig.savefig(path, dpi=180)
    plt.close(fig)


def render_all(spindle: dict, five: dict, out_dir: str) -> List[str]:
    os.makedirs(out_dir, exist_ok=True)
    paths = []
    p = os.path.join(out_dir, "moser_spindle.png")
    draw_spindle(spindle["points"], spindle["edge_list"], spindle["coloring4"], p)
    paths.append(p)
    p = os.path.join(out_dir, f"g{five['name']}_5coloring.png")
    draw_five_chromatic(five["points"], five["edge_list"], five["coloring5"],
                        five["name"], p)
    paths.append(p)
    p = os.path.join(out_dir, "hex_7_coloring.png")
    draw_hex_coloring(p)
    paths.append(p)
    return paths

from __future__ import annotations

import itertools

import pytest

from borderless_pipeline.network import (
    EDGE_WEIGHTS,
    build_graph,
    detect_communities,
    label_communities,
    mutual_graph,
    node_metrics,
)


def clique(members: list[str], category: str = "visa_free") -> list[tuple[str, str, str]]:
    return [(a, b, category) for a, b in itertools.permutations(members, 2)]


@pytest.fixture
def two_blocs() -> list[tuple[str, str, str]]:
    """Two mutually visa-free blocs that need visas for each other."""
    west = ["AAA", "AAB", "AAC", "AAD", "AAE", "AAF"]
    east = ["BBA", "BBB", "BBC", "BBD", "BBE", "BBF"]
    edges = clique(west) + clique(east)
    edges += [(a, b, "visa_required") for a in west for b in east]
    edges += [(b, a, "e_visa") for a in west for b in east]
    edges += [(c, c, "home") for c in west + east]
    return edges


def test_build_graph_weights_and_skips():
    graph = build_graph([("A", "B", "visa_free"), ("B", "A", "no_admission"), ("A", "A", "home"), ("B", "C", "eta")])
    assert graph["A"]["B"]["weight"] == 1.0
    assert not graph.has_edge("B", "A")  # no admission: no edge
    assert not graph.has_edge("A", "A")
    assert graph["B"]["C"]["weight"] == EDGE_WEIGHTS["eta"]
    assert set(graph.nodes) == {"A", "B", "C"}


def test_weights_are_ordered_by_ease():
    order = ["visa_free", "visa_on_arrival", "eta", "e_visa", "visa_required", "no_admission"]
    weights = [EDGE_WEIGHTS[c] for c in order]
    assert weights == sorted(weights, reverse=True)


def test_node_metrics_normalise_degree():
    edges = [("A", "B", "visa_free"), ("A", "C", "visa_on_arrival"), ("B", "A", "visa_required"), ("C", "A", "visa_free")]
    metrics = {m.iso3: m for m in node_metrics(build_graph(edges))}
    assert metrics["A"].passport_power == pytest.approx(100 * (1.0 + 0.9) / 2)
    assert metrics["A"].openness == pytest.approx(100 * (0.1 + 1.0) / 2)
    assert metrics["A"].free_out == 2 and metrics["A"].free_in == 1
    assert sum(m.pagerank for m in metrics.values()) == pytest.approx(1.0)


def test_mutual_graph_keeps_weaker_direction():
    mutual = mutual_graph(build_graph([("A", "B", "visa_free"), ("B", "A", "e_visa"), ("A", "C", "visa_free")]))
    assert mutual["A"]["B"]["weight"] == EDGE_WEIGHTS["e_visa"]
    assert not mutual.has_edge("A", "C")  # one-way access is not a mutual tie


def test_detect_communities_finds_blocs_reproducibly(two_blocs):
    graph = build_graph(two_blocs)
    membership = detect_communities(graph)
    assert membership == detect_communities(build_graph(list(reversed(two_blocs))))
    west = {membership[c] for c in ["AAA", "AAB", "AAC", "AAD", "AAE", "AAF"]}
    east = {membership[c] for c in ["BBA", "BBB", "BBC", "BBD", "BBE", "BBF"]}
    assert len(west) == 1 and len(east) == 1 and west != east


def test_label_communities_names_blocs_and_regions(two_blocs):
    membership = detect_communities(build_graph(two_blocs))
    blocs = {"WEST": ("Western bloc", {"AAA", "AAB", "AAC", "AAD"})}
    subregions = {c: "East region" for c in ["BBA", "BBB", "BBC", "BBD", "BBE", "BBF"]}
    labels = label_communities(membership, blocs, subregions)
    by_label = {l["label"]: l for l in labels.values()}
    assert "WEST" in by_label
    assert by_label["WEST"]["blocs"][0] == {"code": "WEST", "name": "Western bloc", "share_of_bloc": 1.0}
    assert by_label["WEST"]["label_parts"] == {"kind": "blocs", "blocs": ["WEST"], "partners": False}
    assert by_label["East region"]["label_parts"] == {"kind": "region", "subregion": "East region"}

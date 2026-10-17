"""Network analysis of visa access with networkx.

The access data is a directed graph: an edge passport -> destination weighted
by how easy entry is. Metrics per country and snapshot:

* passport_power  weighted out-degree, as % of the maximum possible
* openness        weighted in-degree, as % of the maximum possible
* pagerank        PageRank on the access graph: a destination ranks high when
                  it is reachable from passports that are themselves easy to
                  reach, i.e. how central a country is in the travel network

Communities (latest snapshot only) come from Louvain on an undirected graph
where each pair's weight is the weaker of its two directions, so only
mutually open relationships pull countries together. One Louvain pass only
separates a large visa-free "club" from the rest, so the split is applied
recursively: a community is split again while the split has a modularity of
at least MIN_SPLIT_MODULARITY inside it. Near-cliques such as Schengen stay
whole because any split of them scores close to zero.
"""

from __future__ import annotations

import logging
from collections import Counter, defaultdict
from dataclasses import dataclass

import networkx as nx

from .config import Settings
from .load import connect

log = logging.getLogger(__name__)

EDGE_WEIGHTS: dict[str, float] = {
    "visa_free": 1.0,
    "visa_on_arrival": 0.9,
    "eta": 0.7,
    "e_visa": 0.4,
    "visa_required": 0.1,
    "no_admission": 0.0,  # no edge
}
LOUVAIN_SEED = 42
LOUVAIN_RESOLUTION = 1.0
MIN_SPLIT_MODULARITY = 0.05
MIN_SPLIT_SIZE = 12
MAX_SPLIT_DEPTH = 3
# Bloc labels need at least this share of the bloc inside the community, and
# the bloc must make up at least this share of the community.
BLOC_RECALL, BLOC_PRECISION = 0.6, 0.25


@dataclass(frozen=True)
class NodeMetrics:
    iso3: str
    passport_power: float
    openness: float
    pagerank: float
    free_out: int
    free_in: int


def build_graph(edges: list[tuple[str, str, str]]) -> nx.DiGraph:
    """edges: (passport, destination, category). Home rows and zero weights are skipped."""
    graph = nx.DiGraph()
    for passport, destination, category in edges:
        graph.add_node(passport)
        graph.add_node(destination)
        weight = EDGE_WEIGHTS.get(category, 0.0)
        if passport != destination and weight > 0:
            graph.add_edge(passport, destination, weight=weight, category=category)
    return graph


def node_metrics(graph: nx.DiGraph) -> list[NodeMetrics]:
    n_others = max(graph.number_of_nodes() - 1, 1)
    out_w = dict(graph.out_degree(weight="weight"))
    in_w = dict(graph.in_degree(weight="weight"))
    pagerank = nx.pagerank(graph, alpha=0.85, weight="weight")
    free = {"visa_free", "visa_on_arrival"}
    free_out: Counter[str] = Counter()
    free_in: Counter[str] = Counter()
    for u, v, cat in graph.edges(data="category"):
        if cat in free:
            free_out[u] += 1
            free_in[v] += 1
    return [
        NodeMetrics(
            iso3=node,
            passport_power=round(100 * out_w[node] / n_others, 2),
            openness=round(100 * in_w[node] / n_others, 2),
            pagerank=pagerank[node],
            free_out=free_out[node],
            free_in=free_in[node],
        )
        for node in sorted(graph.nodes)
    ]


def mutual_graph(graph: nx.DiGraph) -> nx.Graph:
    # Sorted insertion keeps Louvain deterministic for a given seed.
    undirected = nx.Graph()
    undirected.add_nodes_from(sorted(graph.nodes))
    for u, v, w in sorted(graph.edges(data="weight")):
        if u < v and graph.has_edge(v, u):
            undirected.add_edge(u, v, weight=min(w, graph[v][u]["weight"]))
    return undirected


def _split(graph: nx.Graph, nodes: set[int], depth: int) -> list[set[int]]:
    if len(nodes) < MIN_SPLIT_SIZE or depth >= MAX_SPLIT_DEPTH:
        return [nodes]
    subgraph = graph.subgraph(sorted(nodes))
    parts = nx.community.louvain_communities(
        subgraph, weight="weight", resolution=LOUVAIN_RESOLUTION, seed=LOUVAIN_SEED
    )
    if len(parts) < 2 or nx.community.modularity(subgraph, parts, weight="weight") < MIN_SPLIT_MODULARITY:
        return [nodes]
    return [community for part in parts for community in _split(graph, set(part), depth + 1)]


def detect_communities(graph: nx.DiGraph) -> dict[str, int]:
    """Recursive Louvain on the mutual graph. Community ids are ordered by size (0 = largest).

    Louvain iterates over sets internally; string hashes change between Python
    processes, so nodes are relabelled to integers to make results reproducible.
    """
    mutual = mutual_graph(graph)
    names = sorted(mutual.nodes)
    relabelled = nx.relabel_nodes(mutual, {name: i for i, name in enumerate(names)})
    communities = [{names[i] for i in c} for c in _split(relabelled, set(relabelled.nodes), depth=0)]
    ordered = sorted(communities, key=lambda c: (-len(c), min(c)))
    return {node: idx for idx, members in enumerate(ordered) for node in members}


def modularity(graph: nx.DiGraph, membership: dict[str, int]) -> float:
    groups: dict[int, set[str]] = defaultdict(set)
    for node, cid in membership.items():
        groups[cid].add(node)
    return nx.community.modularity(mutual_graph(graph), list(groups.values()), weight="weight")


def label_communities(
    membership: dict[str, int],
    blocs: dict[str, tuple[str, set[str]]],
    subregions: dict[str, str],
) -> dict[int, dict]:
    """Name each community after the reference blocs it contains, else its main subregion."""
    members: dict[int, set[str]] = defaultdict(set)
    for iso3, cid in membership.items():
        members[cid].add(iso3)

    labels: dict[int, dict] = {}
    for cid, nodes in sorted(members.items()):
        contained, defining = [], []
        for code, (name, bloc_members) in blocs.items():
            inside = len(nodes & bloc_members)
            if not bloc_members or not inside:
                continue
            recall, precision = inside / len(bloc_members), inside / len(nodes)
            if recall >= BLOC_RECALL:
                contained.append({"code": code, "name": name, "share_of_bloc": round(recall, 2)})
                if precision >= BLOC_PRECISION:
                    defining.append((precision, code, inside))
        defining.sort(reverse=True)
        region_counts = Counter(subregions.get(n) or "Unknown" for n in nodes)
        top_region, top_count = region_counts.most_common(1)[0]
        # The label is also exported as parts so the front-end can phrase it in any language.
        if defining:
            label_blocs = [code for _, code, _ in defining[:2]]
            covered = len(nodes & set().union(*(blocs[code][1] for code in label_blocs)))
            parts = {"kind": "blocs", "blocs": label_blocs, "partners": covered / len(nodes) < 0.5}
            label = " + ".join(label_blocs) + (" and partners" if parts["partners"] else "")
        elif top_count / len(nodes) >= 0.5:
            parts = {"kind": "region", "subregion": top_region}
            label = top_region
        else:
            parts = {"kind": "mixed", "subregion": top_region}
            label = f"Mixed, mostly {top_region}"
        labels[cid] = {
            "community_id": cid,
            "label": label,
            "label_parts": parts,
            "size": len(nodes),
            "blocs": sorted(contained, key=lambda b: -b["share_of_bloc"]),
            "top_subregion": top_region,
        }
    return labels


def run_network(settings: Settings) -> dict[str, int]:
    con = connect(settings)
    try:
        snapshots = [r[0] for r in con.execute("select snapshot_date from marts.dim_snapshot order by 1").fetchall()]
        latest = snapshots[-1]
        metric_rows: list[tuple] = []
        for snap in snapshots:
            edges = con.execute(
                "select passport_iso3, destination_iso3, category from marts.visa_access "
                "where snapshot_date = ? order by passport_iso3, destination_iso3",
                [snap],
            ).fetchall()
            for m in node_metrics(build_graph(edges)):
                metric_rows.append((snap, m.iso3, m.passport_power, m.openness, m.pagerank, m.free_out, m.free_in))

        latest_edges = con.execute(
            "select passport_iso3, destination_iso3, category from marts.visa_access "
                "where snapshot_date = ? order by passport_iso3, destination_iso3",
            [latest],
        ).fetchall()
        membership = detect_communities(build_graph(latest_edges))
        bloc_rows = con.execute("select bloc_code, bloc_name, iso3 from seeds.regional_blocs").fetchall()
        blocs: dict[str, tuple[str, set[str]]] = {}
        for code, name, iso3 in bloc_rows:
            blocs.setdefault(code, (name, set()))[1].add(iso3)
        subregions = dict(con.execute("select iso3, subregion from marts.dim_country").fetchall())
        labels = label_communities(membership, blocs, subregions)

        con.execute("create schema if not exists analytics")
        con.execute("begin transaction")
        con.execute(
            "create or replace table analytics.network_metrics ("
            "snapshot_date date, iso3 varchar, passport_power double, openness double, "
            "pagerank double, free_out integer, free_in integer)"
        )
        con.executemany("insert into analytics.network_metrics values (?, ?, ?, ?, ?, ?, ?)", metric_rows)
        con.execute(
            "create or replace table analytics.network_communities ("
            "snapshot_date date, iso3 varchar, community_id integer, community_label varchar, community_size integer)"
        )
        con.executemany(
            "insert into analytics.network_communities values (?, ?, ?, ?, ?)",
            [(latest, iso3, cid, labels[cid]["label"], labels[cid]["size"]) for iso3, cid in sorted(membership.items())],
        )
        con.execute(
            "create or replace table analytics.network_community_labels ("
            "snapshot_date date, community_id integer, label varchar, size integer, top_subregion varchar, "
            "blocs json, label_parts json)"
        )
        import json

        con.executemany(
            "insert into analytics.network_community_labels values (?, ?, ?, ?, ?, ?, ?)",
            [
                (latest, l["community_id"], l["label"], l["size"], l["top_subregion"], json.dumps(l["blocs"]), json.dumps(l["label_parts"]))
                for l in labels.values()
            ],
        )
        con.execute("commit")
    finally:
        con.close()
    log.info("network: %s metric rows over %s snapshots, %s communities", len(metric_rows), len(snapshots), len(labels))
    for l in labels.values():
        log.info("  community %s (%s countries): %s", l["community_id"], l["size"], l["label"])
    return {"metric_rows": len(metric_rows), "communities": len(labels)}

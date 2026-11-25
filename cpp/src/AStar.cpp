#include "Graph.hpp"
#include "Haversine.hpp"

#include <algorithm>
#include <chrono>
#include <cmath>
#include <limits>
#include <queue>
#include <unordered_set>

namespace flight {

namespace {
struct AStarItem {
    std::string node;
    double f;
    double h;
    double g;
    bool operator>(const AStarItem& other) const {
        if (std::abs(f - other.f) > 1e-9) {
            return f > other.f;
        }
        return h > other.h;
    }
};

double computeHeuristic(const Airport* node, const Airport* goal, ObjectiveMode mode) {
    if (!node || !goal || node->id == goal->id) return 0.0;
    if (mode == ObjectiveMode::Stops) return 1.0;
    return haversineDistanceKm(node->lat, node->lon, goal->lat, goal->lon);
}
} // namespace

SearchResult runAStar(
    const AirportGraph& graph,
    const std::string& sourceId,
    const std::string& targetId,
    ObjectiveMode mode
) {
    const auto start = std::chrono::steady_clock::now();
    SearchResult result;
    result.algorithm = "astar";

    const Airport* src = graph.getAirport(sourceId);
    const Airport* dst = graph.getAirport(targetId);
    if (!src || !dst) {
        result.error = !src ? "Unknown source airport" : "Unknown target airport";
        return result;
    }
    if (!src->enabled || !dst->enabled) {
        result.error = "Source or destination airport is disabled";
        return result;
    }
    if (sourceId == targetId) {
        result.found = true;
        result.path = {sourceId};
        result.visitedOrder = {sourceId};
        result.visitedCount = 1;
        const auto end = std::chrono::steady_clock::now();
        result.executionTimeMs = std::chrono::duration<double, std::milli>(end - start).count();
        return result;
    }

    const double kInf = std::numeric_limits<double>::infinity();
    std::unordered_map<std::string, double> gScore;
    std::unordered_map<std::string, std::string> prev;
    std::unordered_map<std::string, double> prevDistKm;
    std::unordered_set<std::string> closed;

    for (const auto& id : graph.getAllAirportIds()) {
        gScore[id] = kInf;
    }
    gScore[sourceId] = 0.0;

    std::priority_queue<AStarItem, std::vector<AStarItem>, std::greater<AStarItem>> pq;
    const double hStart = computeHeuristic(src, dst, mode);
    pq.push({sourceId, hStart, hStart, 0.0});

    while (!pq.empty()) {
        const AStarItem top = pq.top();
        pq.pop();

        if (closed.count(top.node) > 0) continue;
        if (top.g > gScore[top.node]) continue;

        closed.insert(top.node);
        result.visitedOrder.push_back(top.node);

        if (top.node == targetId) break;

        for (const auto& edge : graph.getNeighbors(top.node)) {
            if (closed.count(edge.to) > 0) continue;
            const double weight = graph.getEdgeWeight(edge, mode);
            if (weight < 0.0) {
                result.error = "Negative edge weight encountered";
                return result;
            }
            const double tentativeG = top.g + weight;
            if (tentativeG < gScore[edge.to]) {
                gScore[edge.to] = tentativeG;
                prev[edge.to] = top.node;
                prevDistKm[edge.to] = edge.distanceKm;
                const double hNext = computeHeuristic(graph.getAirport(edge.to), dst, mode);
                pq.push({edge.to, tentativeG + hNext, hNext, tentativeG});
                result.relaxations++;
            }
        }
    }

    const auto end = std::chrono::steady_clock::now();
    result.executionTimeMs = std::chrono::duration<double, std::milli>(end - start).count();
    result.visitedCount = result.visitedOrder.size();

    if (closed.count(targetId) == 0 || !std::isfinite(gScore[targetId])) {
        result.error = "No reachable route found";
        return result;
    }

    result.found = true;
    result.totalCost = gScore[targetId];

    std::string cursor = targetId;
    while (!cursor.empty()) {
        result.path.push_back(cursor);
        auto kmIt = prevDistKm.find(cursor);
        if (kmIt != prevDistKm.end()) {
            result.totalDistanceKm += kmIt->second;
        }
        auto prevIt = prev.find(cursor);
        cursor = prevIt != prev.end() ? prevIt->second : "";
    }
    std::reverse(result.path.begin(), result.path.end());

    return result;
}

} // namespace flight

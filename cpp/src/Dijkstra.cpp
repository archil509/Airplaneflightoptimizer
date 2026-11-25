#include "Graph.hpp"

#include <algorithm>
#include <chrono>
#include <limits>
#include <queue>
#include <unordered_set>

namespace flight {

namespace {
struct QueueItem {
    std::string node;
    double priority;
    bool operator>(const QueueItem& other) const {
        return priority > other.priority;
    }
};
} // namespace

SearchResult runDijkstra(
    const AirportGraph& graph,
    const std::string& sourceId,
    const std::string& targetId,
    ObjectiveMode mode
) {
    const auto start = std::chrono::steady_clock::now();
    SearchResult result;
    result.algorithm = "dijkstra";

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
    std::unordered_map<std::string, double> dist;
    std::unordered_map<std::string, std::string> prev;
    std::unordered_map<std::string, double> prevDistKm;
    std::unordered_set<std::string> finalized;

    for (const auto& id : graph.getAllAirportIds()) {
        dist[id] = kInf;
    }
    dist[sourceId] = 0.0;

    std::priority_queue<QueueItem, std::vector<QueueItem>, std::greater<QueueItem>> pq;
    pq.push({sourceId, 0.0});

    while (!pq.empty()) {
        const QueueItem top = pq.top();
        pq.pop();

        if (finalized.count(top.node) > 0) continue;
        if (top.priority > dist[top.node]) continue;

        finalized.insert(top.node);
        result.visitedOrder.push_back(top.node);

        if (top.node == targetId) break;

        for (const auto& edge : graph.getNeighbors(top.node)) {
            if (finalized.count(edge.to) > 0) continue;
            const double weight = graph.getEdgeWeight(edge, mode);
            if (weight < 0.0) {
                result.error = "Negative edge weight encountered";
                return result;
            }
            const double candidate = top.priority + weight;
            if (candidate < dist[edge.to]) {
                dist[edge.to] = candidate;
                prev[edge.to] = top.node;
                prevDistKm[edge.to] = edge.distanceKm;
                pq.push({edge.to, candidate});
                result.relaxations++;
            }
        }
    }

    const auto end = std::chrono::steady_clock::now();
    result.executionTimeMs = std::chrono::duration<double, std::milli>(end - start).count();
    result.visitedCount = result.visitedOrder.size();

    if (finalized.count(targetId) == 0 || !std::isfinite(dist[targetId])) {
        result.error = "No reachable route found";
        return result;
    }

    result.found = true;
    result.totalCost = dist[targetId];

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

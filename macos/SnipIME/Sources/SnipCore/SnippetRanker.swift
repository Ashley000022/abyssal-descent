import Foundation

public struct RankedSnippet: Equatable, Sendable {
  public let snippet: Snippet
  public let score: Double
}

public enum SnippetRanker {
  public static func rank(
    _ snippets: [Snippet],
    query: String,
    now: Date = Date(),
    limit: Int = 8
  ) -> [Snippet] {
    ranked(snippets, query: query, now: now)
      .prefix(max(0, limit))
      .map(\.snippet)
  }

  public static func ranked(
    _ snippets: [Snippet],
    query: String,
    now: Date = Date()
  ) -> [RankedSnippet] {
    let normalizedQuery = normalize(query)

    return snippets.compactMap { snippet in
      let shortcut = normalize(snippet.shortcut)
      let title = normalize(snippet.title)
      let content = normalize(snippet.content)
      let matchScore = scoreMatch(
        query: normalizedQuery,
        shortcut: shortcut,
        title: title,
        content: content
      )

      guard normalizedQuery.isEmpty || matchScore > 0 else { return nil }

      let frequencyScore = min(180.0, Double(snippet.usageCount) * 12.0)
      let recencyScore: Double
      if let lastUsedAt = snippet.lastUsedAt {
        let days = max(0, now.timeIntervalSince(lastUsedAt) / 86_400)
        recencyScore = max(0, 72 - (days * 4))
      } else {
        recencyScore = 0
      }

      return RankedSnippet(
        snippet: snippet,
        score: matchScore + frequencyScore + recencyScore
      )
    }
    .sorted {
      if $0.score != $1.score { return $0.score > $1.score }
      if $0.snippet.usageCount != $1.snippet.usageCount {
        return $0.snippet.usageCount > $1.snippet.usageCount
      }
      return $0.snippet.title.localizedStandardCompare($1.snippet.title) == .orderedAscending
    }
  }

  private static func scoreMatch(
    query: String,
    shortcut: String,
    title: String,
    content: String
  ) -> Double {
    guard !query.isEmpty else { return 100 }
    // Exact match remains ahead even when a prefix candidate has the
    // maximum frequency (180) and recency (72) bonuses.
    if shortcut == query { return 1_500 }
    if shortcut.hasPrefix(query) {
      return max(761, 960 - Double(shortcut.count - query.count))
    }
    if shortcut.contains(query) { return 760 }
    if title.hasPrefix(query) { return 620 }
    if title.contains(query) { return 520 }
    if content.contains(query) { return 320 }

    let queryParts = query.split(separator: " ").map(String.init)
    if queryParts.count > 1,
      queryParts.allSatisfy({ part in
        shortcut.contains(part) || title.contains(part) || content.contains(part)
      })
    {
      return 420
    }
    return 0
  }

  private static func normalize(_ value: String) -> String {
    value.folding(
      options: [.caseInsensitive, .diacriticInsensitive, .widthInsensitive],
      locale: .current
    ).lowercased().trimmingCharacters(in: .whitespacesAndNewlines)
  }
}

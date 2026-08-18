import XCTest

@testable import SnipCore

final class SnippetRankerTests: XCTestCase {
  func testExactShortcutBeatsPrefixAndContentMatch() {
    let now = Date(timeIntervalSince1970: 2_000_000)
    let snippets = [
      Snippet(
        title: "Signature extended",
        shortcut: "signature",
        content: "Long signature",
        usageCount: 100,
        lastUsedAt: now
      ),
      Snippet(title: "Exact", shortcut: "sig", content: "Ash"),
      Snippet(title: "Body match", shortcut: "other", content: "contains sig here"),
    ]

    let ranked = SnippetRanker.rank(snippets, query: "SIG", now: now)

    XCTAssertEqual(ranked.map(\.shortcut), ["sig", "signature", "other"])
  }

  func testFrequencyAndRecencyRankEmptyQuery() {
    let now = Date(timeIntervalSince1970: 2_000_000)
    let frequent = Snippet(title: "Frequent", shortcut: "f", content: "F", usageCount: 8)
    let recent = Snippet(
      title: "Recent", shortcut: "r", content: "R", usageCount: 2, lastUsedAt: now)
    let unused = Snippet(title: "Unused", shortcut: "u", content: "U")

    let ranked = SnippetRanker.rank([unused, recent, frequent], query: "", now: now)

    XCTAssertEqual(ranked.map(\.shortcut), ["f", "r", "u"])
  }

  func testJapaneseTitleQuery() {
    let snippets = [
      Snippet(title: "日程調整", shortcut: "meeting", content: "日時を送ってください"),
      Snippet(title: "メール署名", shortcut: "sig", content: "Ash"),
    ]

    XCTAssertEqual(SnippetRanker.rank(snippets, query: "日程").first?.shortcut, "meeting")
  }

  func testWidthInsensitiveQuery() {
    let snippet = Snippet(title: "ＡＢＣテンプレート", shortcut: "full", content: "Body")
    XCTAssertEqual(SnippetRanker.rank([snippet], query: "abc").first?.id, snippet.id)
  }

  func testVeryLongPrefixStillMatches() {
    let snippet = Snippet(
      title: "Long", shortcut: "a" + String(repeating: "b", count: 1_200), content: "Body")
    XCTAssertEqual(SnippetRanker.rank([snippet], query: "a").first?.id, snippet.id)
  }

  func testLimitIsApplied() {
    let snippets = (0..<12).map {
      Snippet(title: "Item \($0)", shortcut: "i\($0)", content: "Content")
    }
    XCTAssertEqual(SnippetRanker.rank(snippets, query: "", limit: 5).count, 5)
  }
}

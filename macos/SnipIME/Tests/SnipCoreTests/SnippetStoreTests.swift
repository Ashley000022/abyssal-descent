import XCTest
@testable import SnipCore

final class SnippetStoreTests: XCTestCase {
    private var directory: URL!
    private var store: SnippetStore!

    override func setUpWithError() throws {
        directory = FileManager.default.temporaryDirectory
            .appendingPathComponent("SnipIME-tests-\(UUID().uuidString)", isDirectory: true)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        store = SnippetStore(fileURL: directory.appendingPathComponent("snippets.json"))
    }

    override func tearDownWithError() throws {
        if FileManager.default.fileExists(atPath: directory.path) {
            try FileManager.default.removeItem(at: directory)
        }
    }

    func testFirstLoadSeedsDefaults() throws {
        let snippets = try store.load()
        XCTAssertFalse(snippets.isEmpty)
        XCTAssertTrue(FileManager.default.fileExists(atPath: store.fileURL.path))
    }

    func testRoundTripUnicodeAndNewlines() throws {
        let snippet = Snippet(title: "日本語", shortcut: ";JP", content: "一行目\n二行目")
        try store.save([snippet])

        let loaded = try store.load()
        XCTAssertEqual(loaded.count, 1)
        XCTAssertEqual(loaded[0].title, "日本語")
        XCTAssertEqual(loaded[0].shortcut, "jp")
        XCTAssertEqual(loaded[0].content, "一行目\n二行目")
    }

    func testUpsertAndDelete() throws {
        var snippet = Snippet(title: "One", shortcut: "one", content: "1")
        _ = try store.upsert(snippet)
        snippet.title = "Updated"
        _ = try store.upsert(snippet)
        XCTAssertEqual(try store.load().first(where: { $0.id == snippet.id })?.title, "Updated")

        _ = try store.delete(id: snippet.id)
        XCTAssertNil(try store.load().first(where: { $0.id == snippet.id }))
    }

    func testRecordUseUpdatesCountAndDate() throws {
        let usedAt = Date(timeIntervalSince1970: 1_900_000)
        let snippet = Snippet(title: "Use", shortcut: "use", content: "Body")
        try store.save([snippet])

        let updated = try store.recordUse(id: snippet.id, at: usedAt)
        XCTAssertEqual(updated.usageCount, 1)
        XCTAssertEqual(updated.lastUsedAt, usedAt)
        XCTAssertEqual(try store.load().first?.usageCount, 1)
    }
}

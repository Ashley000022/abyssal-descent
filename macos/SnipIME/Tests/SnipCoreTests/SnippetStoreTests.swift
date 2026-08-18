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

  func testEditableUpdatePreservesLatestUsageMetadata() throws {
    let snippet = Snippet(title: "Original", shortcut: "same", content: "Body")
    try store.save([snippet])
    let secondStore = SnippetStore(fileURL: store.fileURL)

    _ = try secondStore.recordUse(id: snippet.id)
    let edited = try store.updateEditableFields(
      id: snippet.id,
      title: "Edited",
      shortcut: "same",
      content: "Updated body"
    )

    XCTAssertEqual(edited.title, "Edited")
    XCTAssertEqual(edited.usageCount, 1)
    XCTAssertNotNil(edited.lastUsedAt)
  }

  func testDuplicateShortcutIsRejected() throws {
    let first = Snippet(title: "First", shortcut: "dup", content: "One")
    let second = Snippet(title: "Second", shortcut: ";DUP", content: "Two")

    XCTAssertThrowsError(try store.save([first, second])) { error in
      guard case SnippetStoreError.duplicateShortcut("dup") = error else {
        return XCTFail("Unexpected error: \(error)")
      }
    }
  }

  func testStoreUsesOwnerOnlyPermissions() throws {
    _ = try store.load()
    let fileAttributes = try FileManager.default.attributesOfItem(atPath: store.fileURL.path)
    let directoryAttributes = try FileManager.default.attributesOfItem(
      atPath: store.fileURL.deletingLastPathComponent().path
    )

    XCTAssertEqual(fileAttributes[.posixPermissions] as? NSNumber, NSNumber(value: 0o600))
    XCTAssertEqual(directoryAttributes[.posixPermissions] as? NSNumber, NSNumber(value: 0o700))
  }
}

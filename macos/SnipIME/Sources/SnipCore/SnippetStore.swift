import Foundation

#if canImport(Darwin)
  import Darwin
#else
  import Glibc
#endif

public enum SnippetStoreError: LocalizedError {
  case missingSnippet(UUID)
  case duplicateShortcut(String)
  case invalidShortcut
  case emptyContent
  case unsafeSymbolicLink(String)
  case lockFailed(Int32)

  public var errorDescription: String? {
    switch self {
    case .missingSnippet(let id):
      return "Snippet not found: \(id.uuidString)"
    case .duplicateShortcut(let shortcut):
      return "Duplicate shortcut: ;\(shortcut)"
    case .invalidShortcut:
      return "Shortcut cannot be empty."
    case .emptyContent:
      return "Snippet content cannot be empty."
    case .unsafeSymbolicLink(let path):
      return "Refusing to use a symbolic link for snippet storage: \(path)"
    case .lockFailed(let code):
      return "Could not lock snippet storage (errno \(code))."
    }
  }
}

public final class SnippetStore: @unchecked Sendable {
  public static let environmentKey = "SNIPIME_STORE_PATH"

  public let fileURL: URL
  private static let processLock = NSLock()

  public init(fileURL: URL? = nil) {
    self.fileURL = fileURL ?? Self.defaultStoreURL()
  }

  public static func defaultStoreURL(
    environment: [String: String] = ProcessInfo.processInfo.environment,
    fileManager: FileManager = .default
  ) -> URL {
    if let override = environment[environmentKey], !override.isEmpty {
      return URL(fileURLWithPath: override).standardizedFileURL
    }

    let base =
      fileManager.urls(for: .applicationSupportDirectory, in: .userDomainMask).first
      ?? fileManager.homeDirectoryForCurrentUser.appendingPathComponent(
        "Library/Application Support", isDirectory: true)
    return
      base
      .appendingPathComponent("SnipIME", isDirectory: true)
      .appendingPathComponent("snippets.json", isDirectory: false)
  }

  public func load() throws -> [Snippet] {
    try withExclusiveLock { try loadUnlocked() }
  }

  public func save(_ snippets: [Snippet]) throws {
    try withExclusiveLock {
      try saveUnlocked(try validateAndNormalize(snippets))
    }
  }

  @discardableResult
  public func upsert(_ snippet: Snippet) throws -> [Snippet] {
    try withExclusiveLock {
      var snippets = try loadUnlocked()
      var value = snippet
      value.shortcut = Snippet.normalizeShortcut(value.shortcut)
      try validateEditableFields(shortcut: value.shortcut, content: value.content)
      try ensureUniqueShortcut(value.shortcut, excluding: value.id, in: snippets)
      value.updatedAt = Date()

      if let index = snippets.firstIndex(where: { $0.id == value.id }) {
        snippets[index] = value
      } else {
        snippets.append(value)
      }
      try saveUnlocked(snippets)
      return snippets
    }
  }

  @discardableResult
  public func updateEditableFields(
    id: UUID,
    title: String,
    shortcut: String,
    content: String,
    at date: Date = Date()
  ) throws -> Snippet {
    try withExclusiveLock {
      var snippets = try loadUnlocked()
      guard let index = snippets.firstIndex(where: { $0.id == id }) else {
        throw SnippetStoreError.missingSnippet(id)
      }

      let normalizedShortcut = Snippet.normalizeShortcut(shortcut)
      try validateEditableFields(shortcut: normalizedShortcut, content: content)
      try ensureUniqueShortcut(normalizedShortcut, excluding: id, in: snippets)

      // Preserve usage metadata from the latest on-disk record.
      snippets[index].title = title.trimmingCharacters(in: .whitespacesAndNewlines)
      snippets[index].shortcut = normalizedShortcut
      snippets[index].content = content
      snippets[index].updatedAt = date
      let updated = snippets[index]
      try saveUnlocked(snippets)
      return updated
    }
  }

  @discardableResult
  public func delete(id: UUID) throws -> [Snippet] {
    try withExclusiveLock {
      var snippets = try loadUnlocked()
      snippets.removeAll { $0.id == id }
      try saveUnlocked(snippets)
      return snippets
    }
  }

  @discardableResult
  public func recordUse(id: UUID, at date: Date = Date()) throws -> Snippet {
    try withExclusiveLock {
      var snippets = try loadUnlocked()
      guard let index = snippets.firstIndex(where: { $0.id == id }) else {
        throw SnippetStoreError.missingSnippet(id)
      }
      snippets[index].recordUsage(at: date)
      let updated = snippets[index]
      try saveUnlocked(snippets)
      return updated
    }
  }

  private func withExclusiveLock<T>(_ operation: () throws -> T) throws -> T {
    Self.processLock.lock()
    defer { Self.processLock.unlock() }

    try ensureStorageDirectory()
    let lockURL = fileURL.deletingLastPathComponent().appendingPathComponent("snippets.lock")
    try rejectSymbolicLink(at: lockURL)

    let descriptor = lockURL.path.withCString {
      open($0, O_CREAT | O_RDWR | O_CLOEXEC | O_NOFOLLOW, mode_t(0o600))
    }
    guard descriptor >= 0 else { throw SnippetStoreError.lockFailed(errno) }
    guard flock(descriptor, LOCK_EX) == 0 else {
      let code = errno
      _ = close(descriptor)
      throw SnippetStoreError.lockFailed(code)
    }
    defer {
      _ = flock(descriptor, LOCK_UN)
      _ = close(descriptor)
    }

    return try operation()
  }

  private func loadUnlocked() throws -> [Snippet] {
    guard FileManager.default.fileExists(atPath: fileURL.path) else {
      let defaults = Self.defaultSnippets()
      try saveUnlocked(defaults)
      return defaults
    }

    try rejectSymbolicLink(at: fileURL)
    let data = try Data(contentsOf: fileURL)
    let decoder = JSONDecoder()
    decoder.dateDecodingStrategy = .iso8601
    return try validateAndNormalize(decoder.decode([Snippet].self, from: data))
  }

  private func saveUnlocked(_ snippets: [Snippet]) throws {
    try ensureStorageDirectory()
    try rejectSymbolicLink(at: fileURL)

    let encoder = JSONEncoder()
    encoder.dateEncodingStrategy = .iso8601
    encoder.outputFormatting = [.prettyPrinted, .sortedKeys, .withoutEscapingSlashes]
    let data = try encoder.encode(snippets)
    try data.write(to: fileURL, options: .atomic)
    try FileManager.default.setAttributes([.posixPermissions: 0o600], ofItemAtPath: fileURL.path)
  }

  private func ensureStorageDirectory() throws {
    let directory = fileURL.deletingLastPathComponent()
    if FileManager.default.fileExists(atPath: directory.path) {
      try rejectSymbolicLink(at: directory)
    } else {
      try FileManager.default.createDirectory(
        at: directory,
        withIntermediateDirectories: true,
        attributes: [.posixPermissions: 0o700]
      )
    }
    try FileManager.default.setAttributes([.posixPermissions: 0o700], ofItemAtPath: directory.path)
  }

  private func rejectSymbolicLink(at url: URL) throws {
    guard FileManager.default.fileExists(atPath: url.path) else { return }
    let values = try url.resourceValues(forKeys: [.isSymbolicLinkKey])
    if values.isSymbolicLink == true {
      throw SnippetStoreError.unsafeSymbolicLink(url.path)
    }
  }

  private func validateAndNormalize(_ values: [Snippet]) throws -> [Snippet] {
    var seen = Set<String>()
    return try values.map { snippet in
      var value = snippet
      value.shortcut = Snippet.normalizeShortcut(value.shortcut)
      try validateEditableFields(shortcut: value.shortcut, content: value.content)
      guard seen.insert(value.shortcut).inserted else {
        throw SnippetStoreError.duplicateShortcut(value.shortcut)
      }
      return value
    }
  }

  private func validateEditableFields(shortcut: String, content: String) throws {
    guard !shortcut.isEmpty else { throw SnippetStoreError.invalidShortcut }
    guard shortcut.count <= 80 else { throw SnippetStoreError.invalidShortcut }
    guard !content.isEmpty else { throw SnippetStoreError.emptyContent }
  }

  private func ensureUniqueShortcut(_ shortcut: String, excluding id: UUID, in snippets: [Snippet])
    throws
  {
    guard !snippets.contains(where: { $0.id != id && $0.shortcut == shortcut }) else {
      throw SnippetStoreError.duplicateShortcut(shortcut)
    }
  }

  public static func defaultSnippets(now: Date = Date()) -> [Snippet] {
    [
      Snippet(
        title: "お礼",
        shortcut: "thanks",
        content: "ありがとうございます。引き続きよろしくお願いいたします。",
        createdAt: now,
        updatedAt: now
      ),
      Snippet(
        title: "日程調整",
        shortcut: "meeting",
        content: "ご都合のよい日時をいくつかお送りいただけますでしょうか。",
        createdAt: now,
        updatedAt: now
      ),
      Snippet(
        title: "メール署名",
        shortcut: "sig",
        content: "Best,\nAsh",
        createdAt: now,
        updatedAt: now
      ),
    ]
  }
}

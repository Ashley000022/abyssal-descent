import Foundation

public enum SnippetStoreError: LocalizedError {
    case missingSnippet(UUID)

    public var errorDescription: String? {
        switch self {
        case .missingSnippet(let id):
            return "Snippet not found: \(id.uuidString)"
        }
    }
}

public final class SnippetStore: @unchecked Sendable {
    public static let environmentKey = "SNIPIME_STORE_PATH"

    public let fileURL: URL
    private let lock = NSLock()

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

        let base = fileManager.urls(for: .applicationSupportDirectory, in: .userDomainMask).first
            ?? fileManager.homeDirectoryForCurrentUser.appendingPathComponent("Library/Application Support", isDirectory: true)
        return base
            .appendingPathComponent("SnipIME", isDirectory: true)
            .appendingPathComponent("snippets.json", isDirectory: false)
    }

    public func load() throws -> [Snippet] {
        lock.lock()
        defer { lock.unlock() }
        return try loadUnlocked()
    }

    public func save(_ snippets: [Snippet]) throws {
        lock.lock()
        defer { lock.unlock() }
        try saveUnlocked(snippets)
    }

    @discardableResult
    public func upsert(_ snippet: Snippet) throws -> [Snippet] {
        lock.lock()
        defer { lock.unlock() }

        var snippets = try loadUnlocked()
        var value = snippet
        value.shortcut = Snippet.normalizeShortcut(value.shortcut)
        value.updatedAt = Date()

        if let index = snippets.firstIndex(where: { $0.id == value.id }) {
            snippets[index] = value
        } else {
            snippets.append(value)
        }
        try saveUnlocked(snippets)
        return snippets
    }

    @discardableResult
    public func delete(id: UUID) throws -> [Snippet] {
        lock.lock()
        defer { lock.unlock() }

        var snippets = try loadUnlocked()
        snippets.removeAll { $0.id == id }
        try saveUnlocked(snippets)
        return snippets
    }

    @discardableResult
    public func recordUse(id: UUID, at date: Date = Date()) throws -> Snippet {
        lock.lock()
        defer { lock.unlock() }

        var snippets = try loadUnlocked()
        guard let index = snippets.firstIndex(where: { $0.id == id }) else {
            throw SnippetStoreError.missingSnippet(id)
        }
        snippets[index].recordUsage(at: date)
        let updated = snippets[index]
        try saveUnlocked(snippets)
        return updated
    }

    private func loadUnlocked() throws -> [Snippet] {
        guard FileManager.default.fileExists(atPath: fileURL.path) else {
            let defaults = Self.defaultSnippets()
            try saveUnlocked(defaults)
            return defaults
        }

        let data = try Data(contentsOf: fileURL)
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return try decoder.decode([Snippet].self, from: data)
    }

    private func saveUnlocked(_ snippets: [Snippet]) throws {
        let directory = fileURL.deletingLastPathComponent()
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)

        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys, .withoutEscapingSlashes]
        let data = try encoder.encode(snippets)
        try data.write(to: fileURL, options: .atomic)
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

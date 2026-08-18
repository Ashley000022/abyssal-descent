import Foundation

public struct Snippet: Codable, Identifiable, Hashable, Sendable {
    public var id: UUID
    public var title: String
    public var shortcut: String
    public var content: String
    public var usageCount: Int
    public var lastUsedAt: Date?
    public var createdAt: Date
    public var updatedAt: Date

    public init(
        id: UUID = UUID(),
        title: String,
        shortcut: String,
        content: String,
        usageCount: Int = 0,
        lastUsedAt: Date? = nil,
        createdAt: Date = Date(),
        updatedAt: Date = Date()
    ) {
        self.id = id
        self.title = title.trimmingCharacters(in: .whitespacesAndNewlines)
        self.shortcut = Snippet.normalizeShortcut(shortcut)
        self.content = content
        self.usageCount = usageCount
        self.lastUsedAt = lastUsedAt
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }

    public var displayShortcut: String { ";\(shortcut)" }

    public mutating func recordUsage(at date: Date = Date()) {
        usageCount += 1
        lastUsedAt = date
        updatedAt = date
    }

    public static func normalizeShortcut(_ value: String) -> String {
        var normalized = value.trimmingCharacters(in: .whitespacesAndNewlines)
        while normalized.hasPrefix(";") {
            normalized.removeFirst()
        }
        return normalized.folding(
            options: [.caseInsensitive, .diacriticInsensitive, .widthInsensitive],
            locale: .current
        ).lowercased()
    }
}

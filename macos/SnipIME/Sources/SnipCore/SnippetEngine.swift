import Foundation

public enum SnippetCommand: Sendable {
    case deleteBackward
    case cancel
    case confirm
    case next
    case previous
}

public enum SnippetEngineAction: Equatable, Sendable {
    case passThrough(String)
    case composition(display: String, candidates: [Snippet], selection: Int)
    case commit(text: String, snippetID: UUID?)
    case cancel(literal: String)
    case ignored
}

public final class SnippetEngine: @unchecked Sendable {
    public private(set) var isComposing = false
    public private(set) var query = ""
    public private(set) var candidates: [Snippet] = []
    public private(set) var selection = 0

    private var snippets: [Snippet]
    private let trigger: Character
    private let resultLimit: Int

    public init(snippets: [Snippet], trigger: Character = ";", resultLimit: Int = 8) {
        self.snippets = snippets
        self.trigger = trigger
        self.resultLimit = resultLimit
    }

    public func replaceSnippets(_ snippets: [Snippet]) {
        self.snippets = snippets
        if isComposing { refreshCandidates() }
    }

    public func input(_ text: String) -> SnippetEngineAction {
        guard !text.isEmpty else { return .ignored }

        if !isComposing {
            if text == String(trigger) {
                isComposing = true
                query = ""
                selection = 0
                refreshCandidates()
                return compositionAction()
            }
            return .passThrough(text)
        }

        if text == " " {
            if !candidates.isEmpty { return confirmSelection() }
            let literal = String(trigger) + query + text
            reset()
            return .cancel(literal: literal)
        }

        query.append(contentsOf: text)
        selection = 0
        refreshCandidates()
        return compositionAction()
    }

    public func command(_ command: SnippetCommand) -> SnippetEngineAction {
        guard isComposing else { return .ignored }

        switch command {
        case .deleteBackward:
            guard !query.isEmpty else {
                reset()
                return .cancel(literal: "")
            }
            query.removeLast()
            selection = 0
            refreshCandidates()
            return compositionAction()

        case .cancel:
            let literal = String(trigger) + query
            reset()
            return .cancel(literal: literal)

        case .confirm:
            return confirmSelection()

        case .next:
            guard !candidates.isEmpty else { return .ignored }
            selection = (selection + 1) % candidates.count
            return compositionAction()

        case .previous:
            guard !candidates.isEmpty else { return .ignored }
            selection = (selection - 1 + candidates.count) % candidates.count
            return compositionAction()
        }
    }

    public func selectCandidate(id: UUID) -> SnippetEngineAction {
        guard isComposing, let snippet = candidates.first(where: { $0.id == id }) else {
            return .ignored
        }
        reset()
        return .commit(text: snippet.content, snippetID: snippet.id)
    }

    public func commitLiteral() -> SnippetEngineAction {
        guard isComposing else { return .ignored }
        let literal = String(trigger) + query
        reset()
        return .cancel(literal: literal)
    }

    private func confirmSelection() -> SnippetEngineAction {
        guard candidates.indices.contains(selection) else {
            let literal = String(trigger) + query
            reset()
            return .cancel(literal: literal)
        }
        let snippet = candidates[selection]
        reset()
        return .commit(text: snippet.content, snippetID: snippet.id)
    }

    private func refreshCandidates() {
        candidates = SnippetRanker.rank(snippets, query: query, limit: resultLimit)
        if candidates.isEmpty {
            selection = 0
        } else {
            selection = min(selection, candidates.count - 1)
        }
    }

    private func compositionAction() -> SnippetEngineAction {
        .composition(
            display: String(trigger) + query,
            candidates: candidates,
            selection: selection
        )
    }

    private func reset() {
        isComposing = false
        query = ""
        candidates = []
        selection = 0
    }
}

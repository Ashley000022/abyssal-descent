import XCTest
@testable import SnipCore

final class SnippetEngineTests: XCTestCase {
    private let signature = Snippet(
        id: UUID(uuidString: "11111111-1111-1111-1111-111111111111")!,
        title: "Signature",
        shortcut: "sig",
        content: "Best,\nAsh"
    )
    private let scheduling = Snippet(
        id: UUID(uuidString: "22222222-2222-2222-2222-222222222222")!,
        title: "Schedule",
        shortcut: "schedule",
        content: "Please share a few times."
    )

    func testNormalTextPassesThrough() {
        let engine = SnippetEngine(snippets: [signature])
        XCTAssertEqual(engine.input("a"), .passThrough("a"))
        XCTAssertFalse(engine.isComposing)
    }

    func testTriggerStartsCompositionAndFiltersCandidates() {
        let engine = SnippetEngine(snippets: [signature, scheduling])

        guard case .composition(let initial, let all, _) = engine.input(";") else {
            return XCTFail("Expected composition")
        }
        XCTAssertEqual(initial, ";")
        XCTAssertEqual(all.count, 2)

        _ = engine.input("s")
        _ = engine.input("i")
        guard case .composition(let display, let candidates, _) = engine.input("g") else {
            return XCTFail("Expected composition")
        }
        XCTAssertEqual(display, ";sig")
        XCTAssertEqual(candidates.map(\.id), [signature.id])
    }

    func testConfirmCommitsSelectedSnippet() {
        let engine = SnippetEngine(snippets: [signature])
        _ = engine.input(";")
        _ = engine.input("sig")

        XCTAssertEqual(
            engine.command(.confirm),
            .commit(text: signature.content, snippetID: signature.id)
        )
        XCTAssertFalse(engine.isComposing)
    }

    func testSpaceConfirmsCurrentCandidate() {
        let engine = SnippetEngine(snippets: [signature])
        _ = engine.input(";")
        _ = engine.input("sig")
        XCTAssertEqual(
            engine.input(" "),
            .commit(text: signature.content, snippetID: signature.id)
        )
    }

    func testBackspaceEditsThenDismissesTrigger() {
        let engine = SnippetEngine(snippets: [signature])
        _ = engine.input(";")
        _ = engine.input("s")

        guard case .composition(let display, _, _) = engine.command(.deleteBackward) else {
            return XCTFail("Expected composition")
        }
        XCTAssertEqual(display, ";")
        XCTAssertEqual(engine.command(.deleteBackward), .cancel(literal: ""))
        XCTAssertFalse(engine.isComposing)
    }

    func testEscapeCommitsLiteralText() {
        let engine = SnippetEngine(snippets: [signature])
        _ = engine.input(";")
        _ = engine.input("unknown")

        XCTAssertEqual(engine.command(.cancel), .cancel(literal: ";unknown"))
    }

    func testNavigationWraps() {
        let engine = SnippetEngine(snippets: [signature, scheduling])
        _ = engine.input(";")

        guard case .composition(_, _, let next) = engine.command(.next) else {
            return XCTFail("Expected composition")
        }
        XCTAssertEqual(next, 1)

        guard case .composition(_, _, let wrapped) = engine.command(.next) else {
            return XCTFail("Expected composition")
        }
        XCTAssertEqual(wrapped, 0)
    }
}

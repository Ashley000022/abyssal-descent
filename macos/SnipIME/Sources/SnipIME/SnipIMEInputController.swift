import AppKit
import InputMethodKit
import SnipCore

@objc(SnipIMEInputController)
final class SnipIMEInputController: IMKInputController {
    private let store = SnippetStore()
    private lazy var engine = SnippetEngine(snippets: (try? store.load()) ?? [])
    private var activeClient: (any IMKTextInput)?

    override func inputText(_ string: String!, client sender: Any!) -> Bool {
        guard let string, let client = sender as? IMKTextInput else { return false }
        activeClient = client
        reloadSnippets()
        return render(engine.input(string), client: client)
    }

    override func didCommand(by aSelector: Selector!, client sender: Any!) -> Bool {
        guard engine.isComposing, let client = sender as? IMKTextInput else { return false }
        activeClient = client

        let action: SnippetEngineAction
        switch NSStringFromSelector(aSelector) {
        case "deleteBackward:":
            action = engine.command(.deleteBackward)
        case "cancelOperation:":
            action = engine.command(.cancel)
        case "insertNewline:", "insertLineBreak:", "insertTab:":
            action = engine.command(.confirm)
        case "moveDown:", "moveRight:":
            action = engine.command(.next)
        case "moveUp:", "moveLeft:":
            action = engine.command(.previous)
        default:
            return false
        }
        return render(action, client: client)
    }

    override func candidates(_ sender: Any!) -> [Any]! {
        engine.candidates.map { NSAttributedString(string: candidateLabel(for: $0)) }
    }

    override func candidateSelected(_ candidateString: NSAttributedString!) {
        guard
            let candidateString,
            let client = activeClient,
            let snippet = engine.candidates.first(where: {
                candidateLabel(for: $0) == candidateString.string
            })
        else { return }

        _ = render(engine.selectCandidate(id: snippet.id), client: client)
    }

    override func candidateSelectionChanged(_ candidateString: NSAttributedString!) {
        guard
            let candidateString,
            let index = engine.candidates.firstIndex(where: {
                candidateLabel(for: $0) == candidateString.string
            })
        else { return }

        while engine.selection != index {
            let distanceForward = (index - engine.selection + engine.candidates.count) % engine.candidates.count
            let distanceBackward = (engine.selection - index + engine.candidates.count) % engine.candidates.count
            _ = engine.command(distanceForward <= distanceBackward ? .next : .previous)
        }
    }

    override func commitComposition(_ sender: Any!) {
        guard let client = sender as? IMKTextInput else { return }
        _ = render(engine.commitLiteral(), client: client)
    }

    override func composedString(_ sender: Any!) -> Any! {
        guard engine.isComposing else { return nil }
        return NSAttributedString(string: ";\(engine.query)")
    }

    override func originalString(_ sender: Any!) -> NSAttributedString! {
        guard engine.isComposing else { return nil }
        return NSAttributedString(string: ";\(engine.query)")
    }

    override func hidePalettes() {
        SnipIMEAppDelegate.candidateWindow?.hide()
        super.hidePalettes()
    }

    override func inputControllerWillClose() {
        SnipIMEAppDelegate.candidateWindow?.hide()
        activeClient = nil
        super.inputControllerWillClose()
    }

    override func menu() -> NSMenu! {
        let menu = NSMenu(title: "SnipIME")
        let openItem = NSMenuItem(
            title: "スニペットを管理…",
            action: #selector(openManager),
            keyEquivalent: ","
        )
        openItem.target = self
        menu.addItem(openItem)
        return menu
    }

    @objc private func openManager() {
        let standardPath = URL(fileURLWithPath: "/Applications/SnipIME Manager.app")
        let userPath = FileManager.default.homeDirectoryForCurrentUser
            .appendingPathComponent("Applications/SnipIME Manager.app")
        let bundledPath = Bundle.main.bundleURL
            .appendingPathComponent("Contents/Library/LoginItems/SnipIME Manager.app")
        let target: URL
        if FileManager.default.fileExists(atPath: standardPath.path) {
            target = standardPath
        } else if FileManager.default.fileExists(atPath: userPath.path) {
            target = userPath
        } else {
            target = bundledPath
        }

        let configuration = NSWorkspace.OpenConfiguration()
        configuration.activates = true
        NSWorkspace.shared.openApplication(at: target, configuration: configuration) { _, error in
            if let error { NSLog("SnipIME: failed to open manager: \(error)") }
        }
    }

    @discardableResult
    private func render(_ action: SnippetEngineAction, client: IMKTextInput) -> Bool {
        let notFound = NSRange(location: NSNotFound, length: NSNotFound)

        switch action {
        case .passThrough(let text):
            client.insertText(text, replacementRange: notFound)
            return true

        case .composition(let display, let candidates, let selection):
            client.setMarkedText(
                display,
                selectionRange: NSRange(location: (display as NSString).length, length: 0),
                replacementRange: notFound
            )

            guard !candidates.isEmpty else {
                SnipIMEAppDelegate.candidateWindow?.hide()
                return true
            }

            SnipIMEAppDelegate.candidateWindow?.update()
            SnipIMEAppDelegate.candidateWindow?.selectCandidate(selection)
            SnipIMEAppDelegate.candidateWindow?.show()
            return true

        case .commit(let text, let snippetID):
            SnipIMEAppDelegate.candidateWindow?.hide()
            client.insertText(text, replacementRange: notFound)
            if let snippetID {
                do {
                    _ = try store.recordUse(id: snippetID)
                } catch {
                    NSLog("SnipIME: failed to record usage: \(error)")
                }
            }
            return true

        case .cancel(let literal):
            SnipIMEAppDelegate.candidateWindow?.hide()
            client.insertText(literal, replacementRange: notFound)
            return true

        case .ignored:
            return false
        }
    }

    private func reloadSnippets() {
        do {
            engine.replaceSnippets(try store.load())
        } catch {
            NSLog("SnipIME: failed to load snippets: \(error)")
        }
    }

    private func candidateLabel(for snippet: Snippet) -> String {
        let oneLine = snippet.content
            .replacingOccurrences(of: "\n", with: " ↵ ")
            .replacingOccurrences(of: "\t", with: " ")
        let preview = oneLine.count > 64 ? String(oneLine.prefix(64)) + "…" : oneLine
        return "\(snippet.displayShortcut)  ·  \(snippet.title)  —  \(preview)"
    }
}

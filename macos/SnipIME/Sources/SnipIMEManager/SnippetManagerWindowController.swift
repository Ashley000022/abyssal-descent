import AppKit
import SnipCore

final class SnippetManagerWindowController: NSWindowController, NSTableViewDataSource, NSTableViewDelegate, NSSearchFieldDelegate {
    private let store: SnippetStore
    private var snippets: [Snippet] = []
    private var filteredSnippets: [Snippet] = []
    private var selectedID: UUID?

    private let searchField = NSSearchField()
    private let tableView = NSTableView()
    private let titleField = NSTextField()
    private let shortcutField = NSTextField()
    private let contentView = NSTextView()
    private let usageLabel = NSTextField(labelWithString: "")
    private let statusLabel = NSTextField(labelWithString: "")
    private let saveButton = NSButton(title: "保存", target: nil, action: nil)
    private let deleteButton = NSButton(title: "削除", target: nil, action: nil)

    init(store: SnippetStore) {
        self.store = store

        let window = NSWindow(
            contentRect: NSRect(x: 0, y: 0, width: 940, height: 620),
            styleMask: [.titled, .closable, .miniaturizable, .resizable],
            backing: .buffered,
            defer: false
        )
        window.title = "SnipIME"
        window.subtitle = "スニペット管理"
        window.minSize = NSSize(width: 780, height: 500)
        window.center()
        window.titlebarAppearsTransparent = true
        window.backgroundColor = NSColor.windowBackgroundColor

        super.init(window: window)
        buildInterface()
        reload(selecting: nil)
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    func numberOfRows(in tableView: NSTableView) -> Int {
        filteredSnippets.count
    }

    func tableView(_ tableView: NSTableView, viewFor tableColumn: NSTableColumn?, row: Int) -> NSView? {
        let identifier = NSUserInterfaceItemIdentifier("SnippetCell")
        let cell = tableView.makeView(withIdentifier: identifier, owner: self) as? NSTableCellView ?? makeCell(identifier: identifier)
        let snippet = filteredSnippets[row]
        cell.textField?.stringValue = snippet.title.isEmpty ? "名称未設定" : snippet.title
        cell.toolTip = "\(snippet.displayShortcut)\n\(snippet.content)"
        return cell
    }

    func tableViewSelectionDidChange(_ notification: Notification) {
        guard tableView.selectedRow >= 0, filteredSnippets.indices.contains(tableView.selectedRow) else {
            selectedID = nil
            updateEditor(nil)
            return
        }
        let snippet = filteredSnippets[tableView.selectedRow]
        selectedID = snippet.id
        updateEditor(snippet)
    }

    func controlTextDidChange(_ obj: Notification) {
        applyFilter(selecting: selectedID)
    }

    @objc private func addSnippet() {
        let snippet = Snippet(title: "新しいスニペット", shortcut: "new", content: "")
        do {
            _ = try store.upsert(snippet)
            searchField.stringValue = ""
            reload(selecting: snippet.id)
            titleField.becomeFirstResponder()
            titleField.currentEditor()?.selectAll(nil)
            showStatus("追加しました", isError: false)
        } catch {
            showStatus(error.localizedDescription, isError: true)
        }
    }

    @objc private func saveSnippet() {
        guard let selectedID, let existing = snippets.first(where: { $0.id == selectedID }) else { return }
        let shortcut = Snippet.normalizeShortcut(shortcutField.stringValue)
        guard !shortcut.isEmpty else {
            showStatus("ショートコードを入力してください", isError: true)
            NSSound.beep()
            return
        }
        guard !contentView.string.isEmpty else {
            showStatus("展開するテキストを入力してください", isError: true)
            NSSound.beep()
            return
        }
        if snippets.contains(where: { $0.id != selectedID && $0.shortcut == shortcut }) {
            showStatus("同じショートコードがすでにあります", isError: true)
            NSSound.beep()
            return
        }

        var updated = existing
        updated.title = titleField.stringValue.trimmingCharacters(in: .whitespacesAndNewlines)
        updated.shortcut = shortcut
        updated.content = contentView.string

        do {
            _ = try store.upsert(updated)
            reload(selecting: updated.id)
            showStatus("保存しました", isError: false)
        } catch {
            showStatus(error.localizedDescription, isError: true)
        }
    }

    @objc private func deleteSnippet() {
        guard let selectedID else { return }
        let alert = NSAlert()
        alert.messageText = "このスニペットを削除しますか？"
        alert.informativeText = "この操作は取り消せません。"
        alert.alertStyle = .warning
        alert.addButton(withTitle: "削除")
        alert.addButton(withTitle: "キャンセル")
        guard alert.runModal() == .alertFirstButtonReturn else { return }

        do {
            _ = try store.delete(id: selectedID)
            reload(selecting: nil)
            showStatus("削除しました", isError: false)
        } catch {
            showStatus(error.localizedDescription, isError: true)
        }
    }

    @objc private func openKeyboardSettings() {
        guard let url = URL(string: "x-apple.systempreferences:com.apple.Keyboard-Settings.extension") else { return }
        NSWorkspace.shared.open(url)
    }

    private func buildInterface() {
        guard let content = window?.contentView else { return }

        let sidebar = NSView()
        let detail = NSView()
        let divider = NSBox()
        [sidebar, detail, divider].forEach {
            $0.translatesAutoresizingMaskIntoConstraints = false
            content.addSubview($0)
        }
        divider.boxType = .separator

        NSLayoutConstraint.activate([
            sidebar.leadingAnchor.constraint(equalTo: content.leadingAnchor),
            sidebar.topAnchor.constraint(equalTo: content.topAnchor),
            sidebar.bottomAnchor.constraint(equalTo: content.bottomAnchor),
            sidebar.widthAnchor.constraint(equalToConstant: 280),
            divider.leadingAnchor.constraint(equalTo: sidebar.trailingAnchor),
            divider.topAnchor.constraint(equalTo: content.topAnchor),
            divider.bottomAnchor.constraint(equalTo: content.bottomAnchor),
            divider.widthAnchor.constraint(equalToConstant: 1),
            detail.leadingAnchor.constraint(equalTo: divider.trailingAnchor),
            detail.trailingAnchor.constraint(equalTo: content.trailingAnchor),
            detail.topAnchor.constraint(equalTo: content.topAnchor),
            detail.bottomAnchor.constraint(equalTo: content.bottomAnchor),
        ])

        buildSidebar(in: sidebar)
        buildDetail(in: detail)
    }

    private func buildSidebar(in container: NSView) {
        searchField.placeholderString = "検索"
        searchField.delegate = self
        searchField.translatesAutoresizingMaskIntoConstraints = false

        let column = NSTableColumn(identifier: NSUserInterfaceItemIdentifier("Snippet"))
        column.title = "スニペット"
        tableView.addTableColumn(column)
        tableView.headerView = nil
        tableView.rowHeight = 38
        tableView.intercellSpacing = NSSize(width: 0, height: 2)
        tableView.selectionHighlightStyle = .regular
        tableView.delegate = self
        tableView.dataSource = self

        let scroll = NSScrollView()
        scroll.documentView = tableView
        scroll.hasVerticalScroller = true
        scroll.drawsBackground = false
        scroll.translatesAutoresizingMaskIntoConstraints = false

        let addButton = NSButton(title: "＋", target: self, action: #selector(addSnippet))
        addButton.bezelStyle = .inline
        addButton.font = .systemFont(ofSize: 18, weight: .medium)
        addButton.toolTip = "スニペットを追加"
        addButton.translatesAutoresizingMaskIntoConstraints = false

        container.addSubview(searchField)
        container.addSubview(scroll)
        container.addSubview(addButton)

        NSLayoutConstraint.activate([
            searchField.leadingAnchor.constraint(equalTo: container.leadingAnchor, constant: 16),
            searchField.trailingAnchor.constraint(equalTo: container.trailingAnchor, constant: -16),
            searchField.topAnchor.constraint(equalTo: container.topAnchor, constant: 18),
            scroll.leadingAnchor.constraint(equalTo: container.leadingAnchor, constant: 8),
            scroll.trailingAnchor.constraint(equalTo: container.trailingAnchor, constant: -8),
            scroll.topAnchor.constraint(equalTo: searchField.bottomAnchor, constant: 12),
            scroll.bottomAnchor.constraint(equalTo: addButton.topAnchor, constant: -8),
            addButton.leadingAnchor.constraint(equalTo: container.leadingAnchor, constant: 16),
            addButton.bottomAnchor.constraint(equalTo: container.bottomAnchor, constant: -12),
            addButton.widthAnchor.constraint(equalToConstant: 32),
        ])
    }

    private func buildDetail(in container: NSView) {
        let heading = NSTextField(labelWithString: "スニペット")
        heading.font = .systemFont(ofSize: 24, weight: .semibold)
        heading.textColor = .labelColor

        let helper = NSTextField(wrappingLabelWithString: "SnipIMEを選択中に ; とショートコードを入力すると候補が表示されます。")
        helper.textColor = .secondaryLabelColor
        helper.font = .systemFont(ofSize: 13)

        titleField.placeholderString = "例：メール署名"
        shortcutField.placeholderString = "例：sig"

        contentView.font = .systemFont(ofSize: 14)
        contentView.textContainerInset = NSSize(width: 10, height: 10)
        contentView.isRichText = false
        contentView.isAutomaticQuoteSubstitutionEnabled = false
        contentView.isAutomaticDashSubstitutionEnabled = false

        let contentScroll = NSScrollView()
        contentScroll.documentView = contentView
        contentScroll.hasVerticalScroller = true
        contentScroll.borderType = .bezelBorder
        contentScroll.translatesAutoresizingMaskIntoConstraints = false

        saveButton.target = self
        saveButton.action = #selector(saveSnippet)
        saveButton.bezelStyle = .rounded
        saveButton.keyEquivalent = "\r"
        saveButton.controlSize = .large

        deleteButton.target = self
        deleteButton.action = #selector(deleteSnippet)
        deleteButton.bezelStyle = .rounded
        deleteButton.contentTintColor = .systemRed

        let settingsButton = NSButton(title: "キーボード設定を開く", target: self, action: #selector(openKeyboardSettings))
        settingsButton.bezelStyle = .link
        settingsButton.contentTintColor = .controlAccentColor

        usageLabel.textColor = .tertiaryLabelColor
        usageLabel.font = .monospacedSystemFont(ofSize: 11, weight: .regular)
        statusLabel.font = .systemFont(ofSize: 12, weight: .medium)

        let stack = NSStackView(views: [
            heading,
            helper,
            makeLabel("名前"),
            titleField,
            makeLabel("ショートコード  —  先頭の ; は不要です"),
            shortcutField,
            makeLabel("展開するテキスト"),
            contentScroll,
            usageLabel,
        ])
        stack.orientation = .vertical
        stack.alignment = .leading
        stack.spacing = 10
        stack.translatesAutoresizingMaskIntoConstraints = false
        stack.setCustomSpacing(4, after: heading)
        stack.setCustomSpacing(22, after: helper)
        stack.setCustomSpacing(4, after: makePlaceholderReference())

        [helper, titleField, shortcutField, contentScroll, usageLabel].forEach {
            $0.widthAnchor.constraint(equalTo: stack.widthAnchor).isActive = true
        }
        contentScroll.heightAnchor.constraint(greaterThanOrEqualToConstant: 200).isActive = true

        let buttons = NSStackView(views: [saveButton, deleteButton, settingsButton, statusLabel])
        buttons.orientation = .horizontal
        buttons.alignment = .centerY
        buttons.spacing = 12
        buttons.translatesAutoresizingMaskIntoConstraints = false

        container.addSubview(stack)
        container.addSubview(buttons)

        NSLayoutConstraint.activate([
            stack.leadingAnchor.constraint(equalTo: container.leadingAnchor, constant: 42),
            stack.trailingAnchor.constraint(equalTo: container.trailingAnchor, constant: -42),
            stack.topAnchor.constraint(equalTo: container.topAnchor, constant: 42),
            buttons.leadingAnchor.constraint(equalTo: stack.leadingAnchor),
            buttons.trailingAnchor.constraint(lessThanOrEqualTo: stack.trailingAnchor),
            buttons.topAnchor.constraint(equalTo: stack.bottomAnchor, constant: 18),
            buttons.bottomAnchor.constraint(lessThanOrEqualTo: container.bottomAnchor, constant: -30),
        ])
    }

    private func makeCell(identifier: NSUserInterfaceItemIdentifier) -> NSTableCellView {
        let cell = NSTableCellView()
        cell.identifier = identifier
        let text = NSTextField(labelWithString: "")
        text.font = .systemFont(ofSize: 13, weight: .medium)
        text.lineBreakMode = .byTruncatingTail
        text.translatesAutoresizingMaskIntoConstraints = false
        cell.textField = text
        cell.addSubview(text)
        NSLayoutConstraint.activate([
            text.leadingAnchor.constraint(equalTo: cell.leadingAnchor, constant: 10),
            text.trailingAnchor.constraint(equalTo: cell.trailingAnchor, constant: -10),
            text.centerYAnchor.constraint(equalTo: cell.centerYAnchor),
        ])
        return cell
    }

    private func makeLabel(_ text: String) -> NSTextField {
        let label = NSTextField(labelWithString: text)
        label.font = .systemFont(ofSize: 12, weight: .semibold)
        label.textColor = .secondaryLabelColor
        return label
    }

    private func makePlaceholderReference() -> NSTextField {
        NSTextField(labelWithString: "")
    }

    private func reload(selecting id: UUID?) {
        do {
            snippets = try store.load().sorted {
                $0.title.localizedStandardCompare($1.title) == .orderedAscending
            }
            applyFilter(selecting: id)
        } catch {
            snippets = []
            filteredSnippets = []
            tableView.reloadData()
            updateEditor(nil)
            showStatus(error.localizedDescription, isError: true)
        }
    }

    private func applyFilter(selecting id: UUID?) {
        let query = searchField.stringValue.trimmingCharacters(in: .whitespacesAndNewlines)
        if query.isEmpty {
            filteredSnippets = snippets
        } else {
            filteredSnippets = SnippetRanker.rank(snippets, query: query, limit: snippets.count)
        }
        tableView.reloadData()

        let desired = id.flatMap { wanted in filteredSnippets.firstIndex(where: { $0.id == wanted }) }
            ?? (filteredSnippets.isEmpty ? nil : 0)
        if let desired {
            tableView.selectRowIndexes(IndexSet(integer: desired), byExtendingSelection: false)
            tableView.scrollRowToVisible(desired)
        } else {
            tableView.deselectAll(nil)
            selectedID = nil
            updateEditor(nil)
        }
    }

    private func updateEditor(_ snippet: Snippet?) {
        let enabled = snippet != nil
        [titleField, shortcutField, saveButton, deleteButton].forEach { $0.isEnabled = enabled }
        contentView.isEditable = enabled

        guard let snippet else {
            titleField.stringValue = ""
            shortcutField.stringValue = ""
            contentView.string = ""
            usageLabel.stringValue = "スニペットを選択するか、＋で追加してください"
            return
        }

        titleField.stringValue = snippet.title
        shortcutField.stringValue = snippet.shortcut
        contentView.string = snippet.content
        let lastUsed = snippet.lastUsedAt.map { DateFormatter.localizedString(from: $0, dateStyle: .medium, timeStyle: .short) } ?? "未使用"
        usageLabel.stringValue = "使用回数  \(snippet.usageCount)    最終利用  \(lastUsed)"
    }

    private func showStatus(_ message: String, isError: Bool) {
        statusLabel.textColor = isError ? .systemRed : .systemGreen
        statusLabel.stringValue = message
    }
}

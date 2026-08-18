import AppKit
import SnipCore

@main
struct SnipIMEManagerMain {
  static func main() {
    let application = NSApplication.shared
    let delegate = SnipIMEManagerAppDelegate()
    application.delegate = delegate
    application.setActivationPolicy(.regular)
    application.run()
    withExtendedLifetime(delegate) {}
  }
}

final class SnipIMEManagerAppDelegate: NSObject, NSApplicationDelegate {
  private var windowController: SnippetManagerWindowController?

  func applicationDidFinishLaunching(_ notification: Notification) {
    configureMainMenu()
    let controller = SnippetManagerWindowController(store: SnippetStore())
    windowController = controller
    controller.showWindow(nil)
    NSApplication.shared.activate(ignoringOtherApps: true)
  }

  func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
    true
  }

  func applicationShouldTerminate(_ sender: NSApplication) -> NSApplication.TerminateReply {
    windowController?.canCloseDocument() == false ? .terminateCancel : .terminateNow
  }

  private func configureMainMenu() {
    let mainMenu = NSMenu()
    let appItem = NSMenuItem()
    mainMenu.addItem(appItem)

    let appMenu = NSMenu()
    appMenu.addItem(
      withTitle: "SnipIME Managerについて",
      action: #selector(NSApplication.orderFrontStandardAboutPanel(_:)), keyEquivalent: "")
    appMenu.addItem(NSMenuItem.separator())
    appMenu.addItem(
      withTitle: "SnipIME Managerを終了", action: #selector(NSApplication.terminate(_:)),
      keyEquivalent: "q")
    appItem.submenu = appMenu

    let fileItem = NSMenuItem(title: "ファイル", action: nil, keyEquivalent: "")
    mainMenu.addItem(fileItem)
    let fileMenu = NSMenu(title: "ファイル")
    let saveItem = NSMenuItem(
      title: "保存", action: #selector(saveCurrentSnippet), keyEquivalent: "s")
    saveItem.target = self
    fileMenu.addItem(saveItem)
    fileItem.submenu = fileMenu

    let editItem = NSMenuItem(title: "編集", action: nil, keyEquivalent: "")
    mainMenu.addItem(editItem)
    let editMenu = NSMenu(title: "編集")
    editMenu.addItem(withTitle: "取り消す", action: Selector(("undo:")), keyEquivalent: "z")
    editMenu.addItem(withTitle: "やり直す", action: Selector(("redo:")), keyEquivalent: "Z")
    editMenu.addItem(NSMenuItem.separator())
    editMenu.addItem(withTitle: "カット", action: #selector(NSText.cut(_:)), keyEquivalent: "x")
    editMenu.addItem(withTitle: "コピー", action: #selector(NSText.copy(_:)), keyEquivalent: "c")
    editMenu.addItem(withTitle: "ペースト", action: #selector(NSText.paste(_:)), keyEquivalent: "v")
    editMenu.addItem(
      withTitle: "すべてを選択", action: #selector(NSText.selectAll(_:)), keyEquivalent: "a")
    editItem.submenu = editMenu
    NSApplication.shared.mainMenu = mainMenu
  }

  @objc private func saveCurrentSnippet() {
    _ = windowController?.saveDocument()
  }
}

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

    private func configureMainMenu() {
        let mainMenu = NSMenu()
        let appItem = NSMenuItem()
        mainMenu.addItem(appItem)

        let appMenu = NSMenu()
        appMenu.addItem(withTitle: "SnipIME Managerについて", action: #selector(NSApplication.orderFrontStandardAboutPanel(_:)), keyEquivalent: "")
        appMenu.addItem(NSMenuItem.separator())
        appMenu.addItem(withTitle: "SnipIME Managerを終了", action: #selector(NSApplication.terminate(_:)), keyEquivalent: "q")
        appItem.submenu = appMenu
        NSApplication.shared.mainMenu = mainMenu
    }
}

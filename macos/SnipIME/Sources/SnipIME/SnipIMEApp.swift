import AppKit
import InputMethodKit

@main
struct SnipIMEMain {
  static func main() {
    let application = NSApplication.shared
    let delegate = SnipIMEAppDelegate()
    application.delegate = delegate
    application.setActivationPolicy(.prohibited)
    application.run()
    withExtendedLifetime(delegate) {}
  }
}

final class SnipIMEAppDelegate: NSObject, NSApplicationDelegate {
  static var server: IMKServer?
  static var candidateWindow: IMKCandidates?

  func applicationDidFinishLaunching(_ notification: Notification) {
    guard
      let connectionName = Bundle.main.object(forInfoDictionaryKey: "InputMethodConnectionName")
        as? String,
      let bundleIdentifier = Bundle.main.bundleIdentifier,
      let server = IMKServer(name: connectionName, bundleIdentifier: bundleIdentifier)
    else {
      NSLog("SnipIME: failed to initialize IMKServer")
      NSApplication.shared.terminate(nil)
      return
    }

    Self.server = server
    let candidates = IMKCandidates(
      server: server,
      panelType: kIMKSingleColumnScrollingCandidatePanel,
      styleType: kIMKMain
    )
    candidates?.setDismissesAutomatically(false)
    Self.candidateWindow = candidates
    NSLog("SnipIME: server ready")
  }

  func applicationWillTerminate(_ notification: Notification) {
    Self.candidateWindow?.hide()
    Self.candidateWindow = nil
    Self.server = nil
  }
}

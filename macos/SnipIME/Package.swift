// swift-tools-version: 5.10
import PackageDescription

var products: [Product] = [
  .library(name: "SnipCore", targets: ["SnipCore"])
]

var targets: [Target] = [
  .target(name: "SnipCore"),
  .testTarget(name: "SnipCoreTests", dependencies: ["SnipCore"]),
]

#if os(macOS)
  products += [
    .executable(name: "SnipIME", targets: ["SnipIME"]),
    .executable(name: "SnipIMEManager", targets: ["SnipIMEManager"]),
  ]

  targets += [
    .executableTarget(
      name: "SnipIME",
      dependencies: ["SnipCore"],
      linkerSettings: [
        .linkedFramework("AppKit"),
        .linkedFramework("InputMethodKit"),
      ]
    ),
    .executableTarget(
      name: "SnipIMEManager",
      dependencies: ["SnipCore"],
      linkerSettings: [.linkedFramework("AppKit")]
    ),
  ]
#endif

let package = Package(
  name: "SnipIME",
  platforms: [.macOS(.v13)],
  products: products,
  targets: targets
)

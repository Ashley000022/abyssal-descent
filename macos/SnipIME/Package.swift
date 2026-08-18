// swift-tools-version: 5.10
import PackageDescription

let package = Package(
    name: "SnipIME",
    platforms: [.macOS(.v13)],
    products: [
        .library(name: "SnipCore", targets: ["SnipCore"]),
        .executable(name: "SnipIME", targets: ["SnipIME"]),
        .executable(name: "SnipIMEManager", targets: ["SnipIMEManager"]),
    ],
    targets: [
        .target(name: "SnipCore"),
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
        .testTarget(name: "SnipCoreTests", dependencies: ["SnipCore"]),
    ]
)

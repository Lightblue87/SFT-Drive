// swift-tools-version:6.1
import PackageDescription

let package = Package(
    name: "SFTDriveAdmin",
    platforms: [.macOS(.v15)],
    products: [.executable(name: "SFTDriveAdmin", targets: ["SFTDriveAdmin"])],
    dependencies: [.package(url: "https://github.com/supabase/supabase-swift.git", exact: "2.55.2")],
    targets: [
        .executableTarget(name: "SFTDriveAdmin", dependencies: [.product(name: "Supabase", package: "supabase-swift")], path: "SFTDriveAdmin"),
        .testTarget(name: "SFTDriveAdminTests", dependencies: ["SFTDriveAdmin"], path: "SFTDriveAdminTests")
    ],
    swiftLanguageModes: [.v5]
)

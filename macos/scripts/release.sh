#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
# No Developer-ID account, notarization, or external publication.
xcodebuild -project SFTDriveAdmin.xcodeproj -scheme SFTDriveAdmin -configuration Release -destination 'generic/platform=macOS' -derivedDataPath build/Release ARCHS='arm64 x86_64' ONLY_ACTIVE_ARCH=NO CODE_SIGNING_ALLOWED=NO build
app="build/Release/Build/Products/Release/SFTDriveAdmin.app"
# Ad-hoc signature satisfies executable integrity on Apple Silicon; no paid identity.
codesign --force --deep --sign - "$app"
codesign --verify --deep --strict "$app"
mkdir -p build/distribution
ditto -c -k --sequesterRsrc --keepParent "$app" build/distribution/SFTDriveAdmin-0.1.0.zip
shasum -a 256 build/distribution/SFTDriveAdmin-0.1.0.zip > build/distribution/SHA256.txt
printf '%s\n' 'macOS 15 oder neuer. Universal: Apple Silicon und Intel.' > build/distribution/Version.txt

#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
swift test
xcodebuild -project SFTDriveAdmin.xcodeproj -scheme SFTDriveAdmin -configuration Debug -destination "platform=macOS,arch=$(uname -m)" -derivedDataPath build/DerivedData ARCHS="$(uname -m)" ONLY_ACTIVE_ARCH=YES CODE_SIGNING_ALLOWED=NO build

#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
version="0.1.0"
# No Developer-ID account, notarization, or external publication.
xcodebuild -project SFTDriveAdmin.xcodeproj -scheme SFTDriveAdmin -configuration Release -destination 'generic/platform=macOS' -derivedDataPath build/Release ARCHS='arm64 x86_64' ONLY_ACTIVE_ARCH=NO CODE_SIGNING_ALLOWED=NO build
app="build/Release/Build/Products/Release/SFTDriveAdmin.app"
# Ad-hoc signature satisfies executable integrity on Apple Silicon; no paid identity.
codesign --force --deep --sign - "$app"
codesign --verify --deep --strict "$app"
mkdir -p build/distribution
ditto -c -k --sequesterRsrc --keepParent "$app" "build/distribution/SFTDriveAdmin-${version}.zip"

# DMG als zweite, für manuelle Übergabe gewohntere Verteilungsform (ZIP bleibt
# ebenfalls bestehen). Staging-Ordner mit App + Applications-Verknüpfung,
# daraus ein komprimiertes, schreibgeschütztes Image bauen (§40.9: weiterhin
# keine Developer-ID-Signierung, keine Notarisierung).
dmg_staging="build/dmg-staging"
rm -rf "$dmg_staging"
mkdir -p "$dmg_staging"
cp -R "$app" "$dmg_staging/"
ln -s /Applications "$dmg_staging/Applications"
dmg_path="build/distribution/SFTDriveAdmin-${version}.dmg"
rm -f "$dmg_path"
hdiutil create -volname "SFT Drive Admin" -srcfolder "$dmg_staging" -ov -format UDZO "$dmg_path"
rm -rf "$dmg_staging"

shasum -a 256 "build/distribution/SFTDriveAdmin-${version}.zip" "$dmg_path" > build/distribution/SHA256.txt
printf '%s\n' 'macOS 15 oder neuer. Universal: Apple Silicon und Intel.' > build/distribution/Version.txt

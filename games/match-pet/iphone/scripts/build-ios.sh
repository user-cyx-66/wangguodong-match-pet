#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
python3 scripts/create-project.py
mkdir -p .build out
xcodebuild -project Wangguodong.xcodeproj -scheme Wangguodong -configuration Release -sdk iphoneos -destination 'generic/platform=iOS' -derivedDataPath .build/device CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO build > .build/device-build.log 2>&1 || { tail -120 .build/device-build.log; exit 1; }
mkdir -p .build/package/Payload
ditto .build/device/Build/Products/Release-iphoneos/Wangguodong.app .build/package/Payload/Wangguodong.app
ditto -c -k --sequesterRsrc --keepParent .build/package/Payload out/Wangguodong-iPhone-3.2.0-personal-sign.ipa
python3 scripts/verify-ipa.py out/Wangguodong-iPhone-3.2.0-personal-sign.ipa
cp INSTALL-WINDOWS.md out/INSTALL-WINDOWS.md
shasum -a 256 out/*.ipa > out/SHA256SUMS.txt

#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
xcodebuild -project Wangguodong.xcodeproj -scheme Wangguodong -configuration Release -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' -derivedDataPath .build/simulator CODE_SIGNING_ALLOWED=NO build > .build/simulator-build.log 2>&1 || { tail -100 .build/simulator-build.log; exit 1; }
DEVICE=$(xcrun simctl list devices available --json | python3 -c 'import json,sys; d=json.load(sys.stdin); groups=[v for k,v in d["devices"].items() if "iOS" in k]; phones=[x for g in groups[::-1] for x in g if x["name"].startswith("iPhone") and x.get("isAvailable")]; assert phones,"No available iPhone simulator"; print(phones[0]["udid"])')
xcrun simctl boot "$DEVICE" || true
xcrun simctl bootstatus "$DEVICE" -b
xcrun simctl install "$DEVICE" .build/simulator/Build/Products/Release-iphonesimulator/Wangguodong.app
SIMCTL_CHILD_MATCHPET_SMOKE=1 xcrun simctl launch "$DEVICE" com.cyx.wangguodong.matchpet
CONTAINER=$(xcrun simctl get_app_container "$DEVICE" com.cyx.wangguodong.matchpet data)
for attempt in {1..25}; do
  if [ -f "$CONTAINER/Documents/native-smoke.json" ]; then break; fi
  sleep 2
done
cp "$CONTAINER/Documents/native-smoke.json" out/native-smoke.json
python3 -c 'import json; d=json.load(open("out/native-smoke.json")); assert d["boardCount"]==64,d; assert d["saved"] is True,d; assert d["native"] is True,d; print("PASS: native iPhone simulator loaded 64 tiles, the local bridge, and persistent save")'
xcrun simctl io "$DEVICE" screenshot out/iPhone-preview.png
xcrun simctl terminate "$DEVICE" com.cyx.wangguodong.matchpet
xcrun simctl shutdown "$DEVICE"

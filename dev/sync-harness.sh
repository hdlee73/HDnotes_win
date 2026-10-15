#!/bin/sh
# Integration run of dev/sync-test.mjs against the real Android DeviceSync server class.
#   usage: sh dev/sync-harness.sh ../HDnotes      (path of the Android app checkout)
set -e
ANDROID=${1:-../HDnotes}
T=$(mktemp -d); mkdir -p "$T/classes" "$T/lib/폴더" "$T/assets"
javac -d "$T/classes" "$ANDROID/app/src/main/java/com/hdlee/pdfnote/DeviceSync.java" dev/DeviceSyncHarness.java
printf '%%PDF-phone-A' > "$T/lib/a.pdf"; printf '%%PDF-phone-B' > "$T/lib/폴더/b c.pdf"; printf 'x' > "$T/lib/open.pdf"
printf 'PNGDATA-phone' > "$T/assets/11111111-1111-1111-1111-111111111111.png"
printf '{"format":"PDF Note annotations v2","elements":[{"page":0,"kind":"image","asset":"11111111-1111-1111-1111-111111111111.png","text":""}],"bookmarks":[2]}' > "$T/assets/note-a.pdf.json"
LC_ALL=C.UTF-8 java -Dsun.jnu.encoding=UTF-8 -Dfile.encoding=UTF-8 -cp "$T/classes" com.hdlee.pdfnote.DeviceSyncHarness "$T/lib" "$T/assets" > "$T/out" &
PID=$!; trap 'kill $PID 2>/dev/null; rm -rf "$T"' EXIT
for i in 1 2 3 4 5 6 7 8 9 10; do [ -s "$T/out" ] && break; sleep 0.5; done
read PORT CODE < "$T/out"
SYNC_PORT=$PORT SYNC_CODE=$CODE SYNC_LIB="$T/lib" SYNC_ASSETS="$T/assets" node dev/sync-test.mjs

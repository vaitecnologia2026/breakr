#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

# Wrapper de cap sync. Hoje só há Android, mas o wrapper existe para manter
# consistência com o playbook e para re-injetar deps do Firebase iOS caso o
# projeto ganhe plataforma iOS no futuro (cap sync sobrescreve Package.swift).
npx cap sync "$@"

PACKAGE_SWIFT="ios/App/CapApp-SPM/Package.swift"
if [ -f "$PACKAGE_SWIFT" ] && ! grep -q "firebase-ios-sdk" "$PACKAGE_SWIFT"; then
  echo "[cap-sync] re-injecting firebase-ios-sdk into $PACKAGE_SWIFT"
  # Path-agnostic: casa a linha do CapacitorStatusBar independente da profundidade
  # relativa do node_modules (monorepo usa ../../../../../node_modules).
  /usr/bin/sed -i '' \
    -E 's|(\.package\(name: "CapacitorStatusBar", path: "[^"]*node_modules/@capacitor/status-bar"\))|\1,\
        .package(url: "https://github.com/firebase/firebase-ios-sdk.git", from: "11.0.0")|' \
    "$PACKAGE_SWIFT"
  /usr/bin/sed -i '' \
    -E 's|(\.product\(name: "CapacitorStatusBar", package: "CapacitorStatusBar"\))|\1,\
                .product(name: "FirebaseMessaging", package: "firebase-ios-sdk")|' \
    "$PACKAGE_SWIFT"
fi

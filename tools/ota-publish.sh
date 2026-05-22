#!/usr/bin/env bash
# OTA publish helper.
# Updates client/lib/otaBuildInfo.ts with the publish message BEFORE export,
# so the message embedded in the bundle matches the EAS publish message.
#
# Usage:
#   tools/ota-publish.sh "fix(foo): bar"

set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 \"<commit-style message>\"" >&2
  exit 1
fi

MSG="$1"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OTA_FILE="$ROOT/client/lib/otaBuildInfo.ts"

# Write the message into the build-info file using a safe heredoc so quotes
# inside MSG don't break the JS string. We use a JSON.stringify-equivalent
# by base64 encoding through node to escape the string properly.
ESCAPED=$(node -e 'process.stdout.write(JSON.stringify(process.argv[1]))' "$MSG")

cat > "$OTA_FILE" <<EOF
export const OTA_MESSAGE: string | undefined =
  ${ESCAPED};
EOF

echo "[ota-publish] wrote message into $OTA_FILE:"
echo "  ${ESCAPED}"

cd "$ROOT"
rm -rf dist
echo "[ota-publish] exporting bundles..."
EAS_NO_VCS=1 EAS_SKIP_AUTO_FINGERPRINT=1 CI=1 \
  npx expo export --platform all --output-dir dist

echo "[ota-publish] publishing to EAS..."
EAS_NO_VCS=1 EAS_SKIP_AUTO_FINGERPRINT=1 CI=1 \
  npx eas update \
    --branch production \
    --skip-bundler \
    --input-dir dist \
    --message "$MSG" \
    --non-interactive

#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
INPUT="$SCRIPT_DIR/hdwallet.md"
OUTPUT="$SCRIPT_DIR/hdwallet.docx"

# Install dependencies if needed
if [ ! -d "$PROJECT_DIR/node_modules" ]; then
    echo "Installing dependencies..."
    (cd "$PROJECT_DIR" && npm install)
fi

# Remove any previous output
rm -f "$OUTPUT"

# Run the conversion
echo "Running: node src/index.js test/hdwallet.md test/hdwallet.docx"
node "$PROJECT_DIR/src/index.js" "$INPUT" "$OUTPUT"

# Verify the output file was created
if [ -f "$OUTPUT" ]; then
    SIZE=$(wc -c < "$OUTPUT")
    echo "OK: $OUTPUT created ($SIZE bytes)"
else
    echo "FAIL: $OUTPUT was not created"
    exit 1
fi

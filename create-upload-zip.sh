#!/bin/bash

# Script to create a ZIP file for Hostinger upload
# Excludes node_modules, .env, .git, and other unnecessary files

ZIP_NAME="leadsextension-upload.zip"
PROJECT_DIR=$(pwd)

echo "Creating upload package for Hostinger..."
echo "Excluding: node_modules, .env, .git, logs, backups"

# Create ZIP excluding unnecessary files
zip -r "$ZIP_NAME" . \
    -x "node_modules/*" \
    -x ".env" \
    -x ".git/*" \
    -x "*.log" \
    -x "*.log.*" \
    -x "backup-*.tar.gz" \
    -x ".DS_Store" \
    -x "Thumbs.db" \
    -x ".vscode/*" \
    -x ".idea/*" \
    -x "*.swp" \
    -x "*.swo" \
    -x "dist/*" \
    -x "build/*" \
    -x "tmp/*" \
    -x "temp/*" \
    -x "$ZIP_NAME"

if [ -f "$ZIP_NAME" ]; then
    SIZE=$(du -h "$ZIP_NAME" | cut -f1)
    echo ""
    echo "✅ Success! Created: $ZIP_NAME"
    echo "📦 Size: $SIZE"
    echo ""
    echo "📤 Ready to upload to Hostinger!"
    echo "   Location: $PROJECT_DIR/$ZIP_NAME"
else
    echo "❌ Error creating ZIP file"
    exit 1
fi


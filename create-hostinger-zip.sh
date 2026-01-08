#!/bin/bash

# Script to create a ZIP file for Hostinger upload
# CRITICAL: Files must be at ROOT level, not in a subfolder

ZIP_NAME="leadsextension-upload.zip"
TEMP_DIR=$(mktemp -d)
PROJECT_DIR=$(pwd)

echo "Creating Hostinger-compatible ZIP file..."
echo "Files will be at ROOT level (not in subfolder)"

# Copy all necessary files to temp directory (at root level)
cd "$PROJECT_DIR"

# Copy files directly to temp directory root
cp server.js "$TEMP_DIR/"
cp package.json "$TEMP_DIR/"
cp package-lock.json "$TEMP_DIR/" 2>/dev/null || echo "package-lock.json not found, will be generated"
cp .gitignore "$TEMP_DIR/" 2>/dev/null
cp Procfile "$TEMP_DIR/" 2>/dev/null

# Copy directories
cp -r public "$TEMP_DIR/" 2>/dev/null
cp -r scripts "$TEMP_DIR/" 2>/dev/null || true

# Remove old ZIP if exists
rm -f "$ZIP_NAME"

# Create ZIP from temp directory (files at root)
cd "$TEMP_DIR"
zip -r "$PROJECT_DIR/$ZIP_NAME" . -x "*.DS_Store" "*.log"

# Cleanup
cd "$PROJECT_DIR"
rm -rf "$TEMP_DIR"

if [ -f "$ZIP_NAME" ]; then
    SIZE=$(du -h "$ZIP_NAME" | cut -f1)
    echo ""
    echo "✅ Success! Created: $ZIP_NAME"
    echo "📦 Size: $SIZE"
    echo ""
    echo "📋 ZIP Structure (files at root):"
    unzip -l "$ZIP_NAME" | head -15
    echo ""
    echo "📤 Ready to upload to Hostinger!"
    echo "   Location: $PROJECT_DIR/$ZIP_NAME"
else
    echo "❌ Error creating ZIP file"
    exit 1
fi


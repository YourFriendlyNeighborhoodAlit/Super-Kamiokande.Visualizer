#!/usr/bin/env bash
# Exit immediately if a command exits with a non-zero status.
set -e

# Install tesseract-ocr
apt-get update
apt-get install -y tesseract-ocr

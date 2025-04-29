#!/bin/bash
# @profullstack/transcoder - CLI Examples
# This script demonstrates common use cases for the transcoder CLI

# Set the path to the transcoder CLI
TRANSCODER="./bin/transcoder.js"

# Create output directories if they don't exist
mkdir -p ./test-videos/output/examples/single
mkdir -p ./test-videos/output/examples/batch
mkdir -p ./test-videos/output/examples/thumbnails
mkdir -p ./test-videos/output/examples/audio
mkdir -p ./test-videos/output/examples/image

echo "===== Transcoder CLI Examples ====="
echo ""

# Example 1: Basic transcoding
echo "Example 1: Basic transcoding"
echo "Command: $TRANSCODER ./test-videos/input/test-video.mov ./test-videos/output/examples/single/basic.mp4"
$TRANSCODER ./test-videos/input/test-video.mov ./test-videos/output/examples/single/basic.mp4
echo ""

# Example 2: Using a preset
echo "Example 2: Using a preset (YouTube HD)"
echo "Command: $TRANSCODER ./test-videos/input/test-video.mov ./test-videos/output/examples/single/youtube-hd.mp4 --preset youtube-hd"
$TRANSCODER ./test-videos/input/test-video.mov ./test-videos/output/examples/single/youtube-hd.mp4 --preset youtube-hd
echo ""

# Example 3: Custom resolution and bitrate
echo "Example 3: Custom resolution and bitrate"
echo "Command: $TRANSCODER ./test-videos/input/test-video.mov ./test-videos/output/examples/single/custom.mp4 --width 1280 --height 720 --bitrate 2M"
$TRANSCODER ./test-videos/input/test-video.mov ./test-videos/output/examples/single/custom.mp4 --width 1280 --height 720 --bitrate 2M
echo ""

# Example 4: Generate thumbnails during transcoding
echo "Example 4: Generate thumbnails during transcoding"
echo "Command: $TRANSCODER ./test-videos/input/test-video.mov ./test-videos/output/examples/single/with-thumbnails.mp4 --thumbnails 3"
$TRANSCODER ./test-videos/input/test-video.mov ./test-videos/output/examples/single/with-thumbnails.mp4 --thumbnails 3
echo ""

# Example 5: Generate thumbnails only (no transcoding)
echo "Example 5: Generate thumbnails only (no transcoding)"
echo "Command: $TRANSCODER --thumbnails-only ./test-videos/input/test-video.mov --count 5 --thumbnail-output ./test-videos/output/examples/thumbnails/thumb-%d.jpg"
$TRANSCODER --thumbnails-only ./test-videos/input/test-video.mov --count 5 --thumbnail-output ./test-videos/output/examples/thumbnails/thumb-%d.jpg
echo ""

# Example 6: Add a watermark
echo "Example 6: Add a watermark"
echo "Command: $TRANSCODER ./test-videos/input/test-video.mov ./test-videos/output/examples/single/watermarked.mp4 --watermark-text \"© Example 2025\" --watermark-position bottomRight"
$TRANSCODER ./test-videos/input/test-video.mov ./test-videos/output/examples/single/watermarked.mp4 --watermark-text "© Example 2025" --watermark-position bottomRight
echo ""

# Example 7: Trim a video
echo "Example 7: Trim a video"
echo "Command: $TRANSCODER ./test-videos/input/test-video.mov ./test-videos/output/examples/single/trimmed.mp4 --trim --start 0 --end 1"
$TRANSCODER ./test-videos/input/test-video.mov ./test-videos/output/examples/single/trimmed.mp4 --trim --start 0 --end 1
echo ""

# Example 8: Audio transcoding - MP3 to AAC
echo "Example 8: Audio transcoding - MP3 to AAC"
echo "Command: $TRANSCODER ./test-videos/input/test-audio.mp3 ./test-videos/output/examples/audio/test-audio.aac --preset audio-high"
$TRANSCODER ./test-videos/input/test-audio.mp3 ./test-videos/output/examples/audio/test-audio.aac --preset audio-high
echo ""

# Example 9: Audio transcoding - Extract audio from video
echo "Example 9: Audio transcoding - Extract audio from video"
echo "Command: $TRANSCODER ./test-videos/input/test-video.mov ./test-videos/output/examples/audio/extracted-audio.mp3 --preset mp3-high"
$TRANSCODER ./test-videos/input/test-video.mov ./test-videos/output/examples/audio/extracted-audio.mp3 --preset mp3-high
echo ""

# Example 10: Image transcoding - JPEG to WebP
echo "Example 10: Image transcoding - JPEG to WebP"
echo "Command: $TRANSCODER ./test-images/input/test-image.png ./test-videos/output/examples/image/test-image.webp --preset webp-high"
$TRANSCODER ./test-images/input/test-image.png ./test-videos/output/examples/image/test-image.webp --preset webp-high
echo ""

# Example 11: Image transcoding - Square padding
echo "Example 11: Image transcoding - Square padding"
echo "Command: $TRANSCODER ./test-images/input/test-image-landscape.png ./test-videos/output/examples/image/test-image-square.png --preset square"
$TRANSCODER ./test-images/input/test-image-landscape.png ./test-videos/output/examples/image/test-image-square.png --preset square
echo ""

# Example 12: Batch process all videos in a directory
echo "Example 12: Batch process all videos in a directory"
echo "Command: $TRANSCODER --path ./test-videos/input --preset web --output-dir ./test-videos/output/examples/batch"
$TRANSCODER --path ./test-videos/input --preset web --output-dir ./test-videos/output/examples/batch
echo ""

# Example 13: Batch process with recursive directory scanning
echo "Example 13: Batch process with recursive directory scanning"
echo "Command: $TRANSCODER --path ./test-videos/input --recursive --preset mobile --output-dir ./test-videos/output/examples/batch/recursive"
$TRANSCODER --path ./test-videos/input --recursive --preset mobile --output-dir ./test-videos/output/examples/batch/recursive
echo ""

# Example 14: Batch process with output filename customization
echo "Example 14: Batch process with output filename customization"
echo "Command: $TRANSCODER --path ./test-videos/input --preset web --output-dir ./test-videos/output/examples/batch/custom --output-prefix \"processed-\" --output-suffix \"-web\""
$TRANSCODER --path ./test-videos/input --preset web --output-dir ./test-videos/output/examples/batch/custom --output-prefix "processed-" --output-suffix "-web"
echo ""

# Example 15: Batch process with concurrent processing
echo "Example 15: Batch process with concurrent processing"
echo "Command: $TRANSCODER --path ./test-videos/input --preset web --output-dir ./test-videos/output/examples/batch/concurrent --concurrency 2"
$TRANSCODER --path ./test-videos/input --preset web --output-dir ./test-videos/output/examples/batch/concurrent --concurrency 2
echo ""

# Example 16: Batch process specific media types
echo "Example 16: Batch process specific media types"
echo "Command: $TRANSCODER --path ./test-videos/input --media-types video --preset web --output-dir ./test-videos/output/examples/batch/video-only"
$TRANSCODER --path ./test-videos/input --media-types video --preset web --output-dir ./test-videos/output/examples/batch/video-only
echo ""

# Example 17: Batch process audio files
echo "Example 17: Batch process audio files"
echo "Command: $TRANSCODER --path ./test-videos/input --media-types audio --preset mp3-high --output-dir ./test-videos/output/examples/batch/audio-only"
$TRANSCODER --path ./test-videos/input --media-types audio --preset mp3-high --output-dir ./test-videos/output/examples/batch/audio-only
echo ""

# Example 18: Batch process image files
echo "Example 18: Batch process image files"
echo "Command: $TRANSCODER --path ./test-images/input --media-types image --preset webp-medium --output-dir ./test-videos/output/examples/batch/image-only"
$TRANSCODER --path ./test-images/input --media-types image --preset webp-medium --output-dir ./test-videos/output/examples/batch/image-only
echo ""

echo "===== All examples completed ====="
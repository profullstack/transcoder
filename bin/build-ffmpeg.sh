#!/bin/bash

# Script to build FFmpeg from source with custom flags
# Supports: macOS, Linux (Ubuntu/Debian, Arch)

# Text formatting
BOLD="\033[1m"
RED="\033[31m"
GREEN="\033[32m"
YELLOW="\033[33m"
BLUE="\033[34m"
RESET="\033[0m"

# Default settings
BUILD_DIR="$(pwd)/ffmpeg_build"
PREFIX="$BUILD_DIR/ffmpeg_install"
FORCE_REBUILD=false
FFMPEG_REPO="https://github.com/FFmpeg/FFmpeg.git"
FFMPEG_BRANCH="master"

# Function to print messages
print_message() {
  echo -e "${BOLD}${2}${1}${RESET}"
}

# Function to print usage information
print_usage() {
  print_message "Usage: $0 [OPTIONS]" "${BLUE}"
  print_message "Options:" "${BLUE}"
  print_message "  --force    Force rebuild even if FFmpeg is already installed" "${BLUE}"
  print_message "  --help     Display this help message" "${BLUE}"
}

# Function to check if a command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Function to check if FFmpeg is already installed
check_ffmpeg() {
  if command_exists ffmpeg && command_exists ffprobe; then
    FFMPEG_VERSION=$(ffmpeg -version | head -n 1)
    FFPROBE_VERSION=$(ffprobe -version | head -n 1)
    print_message "FFmpeg is already installed: ${FFMPEG_VERSION}" "${GREEN}"
    print_message "FFprobe is already installed: ${FFPROBE_VERSION}" "${GREEN}"
    
    # Test if ffprobe works properly
    ffprobe -version > /dev/null 2>&1
    if [ $? -eq 0 ]; then
      print_message "FFprobe is working correctly!" "${GREEN}"
      return 0
    else
      print_message "FFprobe is installed but may have missing dependencies." "${YELLOW}"
      return 1
    fi
  else
    print_message "FFmpeg and/or FFprobe are not installed." "${YELLOW}"
    return 1
  fi
}

# Function to install build dependencies on Ubuntu/Debian
install_build_deps_debian() {
  print_message "Installing build dependencies..." "${BLUE}"
  sudo apt-get update
  sudo apt-get -y install \
    autoconf \
    automake \
    build-essential \
    cmake \
    git-core \
    libass-dev \
    libfreetype6-dev \
    libgnutls28-dev \
    libmp3lame-dev \
    libsdl2-dev \
    libtool \
    libva-dev \
    libvdpau-dev \
    libvorbis-dev \
    libxcb1-dev \
    libxcb-shm0-dev \
    libxcb-xfixes0-dev \
    meson \
    ninja-build \
    pkg-config \
    texinfo \
    wget \
    yasm \
    zlib1g-dev \
    nasm \
    libx264-dev \
    libx265-dev \
    libnuma-dev \
    libvpx-dev \
    libfdk-aac-dev \
    libopus-dev \
    librubberband-dev \
    libsoxr-dev \
    libfontconfig1-dev \
    libfreetype6-dev \
    libfribidi-dev \
    libharfbuzz-dev
  
  if [ $? -ne 0 ]; then
    print_message "Failed to install build dependencies." "${RED}"
    exit 1
  fi
}

# Function to install build dependencies on Arch Linux
install_build_deps_arch() {
  print_message "Installing build dependencies..." "${BLUE}"
  sudo pacman -Sy --needed \
    base-devel \
    git \
    nasm \
    yasm \
    cmake \
    meson \
    ninja \
    sdl2 \
    x264 \
    x265 \
    libvpx \
    libass \
    freetype2 \
    harfbuzz \
    opus \
    lame \
    rubberband \
    fontconfig \
    fribidi
  
  # Try to install optional dependencies
  sudo pacman -Sy --needed libsoxr || print_message "libsoxr not found, continuing without it" "${YELLOW}"
  sudo pacman -Sy --needed fdk-aac || print_message "fdk-aac not found, continuing without it" "${YELLOW}"
  
  if [ $? -ne 0 ]; then
    print_message "Some dependencies might be missing, but continuing with build." "${YELLOW}"
    print_message "Non-critical features might be disabled." "${YELLOW}"
  fi
}

# Function to install build dependencies on macOS
install_build_deps_macos() {
  print_message "Installing build dependencies..." "${BLUE}"
  if ! command_exists brew; then
    print_message "Homebrew is not installed. Please install Homebrew first:" "${YELLOW}"
    print_message "  /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\"" "${YELLOW}"
    print_message "Then run this script again." "${YELLOW}"
    exit 1
  fi
  
  brew update
  brew install \
    automake \
    cmake \
    git \
    nasm \
    pkg-config \
    x264 \
    x265 \
    libvpx \
    libass \
    freetype \
    harfbuzz \
    opus \
    lame \
    fdk-aac \
    sdl2 \
    rubberband \
    libsoxr \
    fontconfig \
    fribidi
  
  if [ $? -ne 0 ]; then
    print_message "Some dependencies might be missing, but continuing with build." "${YELLOW}"
    print_message "Non-critical features might be disabled." "${YELLOW}"
  fi
}

# Function to build FFmpeg from source
build_ffmpeg() {
  print_message "Building FFmpeg from source..." "${BLUE}"
  
  # Create build directory
  mkdir -p "$BUILD_DIR"
  cd "$BUILD_DIR" || exit 1
  
  # Clone FFmpeg repository
  if [ ! -d "FFmpeg" ] || [ "$FORCE_REBUILD" = true ]; then
    if [ -d "FFmpeg" ] && [ "$FORCE_REBUILD" = true ]; then
      print_message "Removing existing FFmpeg directory for fresh clone..." "${BLUE}"
      rm -rf "FFmpeg"
    fi
    
    print_message "Cloning FFmpeg repository from GitHub ($FFMPEG_BRANCH branch)..." "${BLUE}"
    git clone --depth 1 --branch "$FFMPEG_BRANCH" "$FFMPEG_REPO" FFmpeg
  else
    # Update existing repository
    cd "FFmpeg" || exit 1
    print_message "Updating FFmpeg repository..." "${BLUE}"
    git pull
    cd ..
  fi
  
  # Configure and build FFmpeg
  cd "FFmpeg" || exit 1
  
  print_message "Configuring FFmpeg..." "${BLUE}"
  
  # Check for available libraries
  HAVE_SOXR=false
  HAVE_FDK_AAC=false
  HAVE_VAAPI=false
  HAVE_VDPAU=false
  
  pkg-config --exists libsoxr 2>/dev/null && HAVE_SOXR=true
  pkg-config --exists fdk-aac 2>/dev/null && HAVE_FDK_AAC=true
  
  # Check available configure options
  ./configure --help > configure_help.txt
  grep -q -- "--enable-vaapi" configure_help.txt && HAVE_VAAPI=true
  grep -q -- "--enable-vdpau" configure_help.txt && HAVE_VDPAU=true
  
  # Common configure options
  CONFIGURE_OPTIONS=(
    --prefix="$PREFIX"
    --enable-gpl
    --enable-nonfree
    --enable-libass
    --enable-libfreetype
    --enable-libharfbuzz
    --enable-libmp3lame
    --enable-libopus
    --enable-libvorbis
    --enable-libvpx
    --enable-libx264
    --enable-libx265
    --enable-librubberband
    --enable-shared
    --enable-pthreads
  )
  
  # Add optional libraries if available
  if [ "$HAVE_SOXR" = true ]; then
    print_message "libsoxr found, enabling support" "${GREEN}"
    CONFIGURE_OPTIONS+=(--enable-libsoxr)
  else
    print_message "libsoxr not found, building without it" "${YELLOW}"
  fi
  
  if [ "$HAVE_FDK_AAC" = true ]; then
    print_message "fdk-aac found, enabling support" "${GREEN}"
    CONFIGURE_OPTIONS+=(--enable-libfdk-aac)
  else
    print_message "fdk-aac not found, building without it" "${YELLOW}"
  fi
  
  # OS-specific configure options
  case "$(uname -s)" in
    Darwin*)
      # macOS-specific options
      CONFIGURE_OPTIONS+=(
        --enable-videotoolbox
      )
      ;;
    Linux*)
      # Linux-specific options
      if [ "$HAVE_VAAPI" = true ] && pkg-config --exists libva 2>/dev/null; then
        print_message "VAAPI found, enabling support" "${GREEN}"
        CONFIGURE_OPTIONS+=(--enable-vaapi)
      fi
      
      if [ "$HAVE_VDPAU" = true ] && pkg-config --exists vdpau 2>/dev/null; then
        print_message "VDPAU found, enabling support" "${GREEN}"
        CONFIGURE_OPTIONS+=(--enable-vdpau)
      fi
      ;;
  esac
  
  # Run configure
  ./configure "${CONFIGURE_OPTIONS[@]}"
  
  if [ $? -ne 0 ]; then
    print_message "Failed to configure FFmpeg." "${RED}"
    exit 1
  fi
  
  # Build FFmpeg
  print_message "Building FFmpeg (this may take a while)..." "${BLUE}"
  make -j "$(nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo 2)"
  
  if [ $? -ne 0 ]; then
    print_message "Failed to build FFmpeg." "${RED}"
    exit 1
  fi
  
  # Install FFmpeg
  print_message "Installing FFmpeg..." "${BLUE}"
  make install
  
  if [ $? -ne 0 ]; then
    print_message "Failed to install FFmpeg." "${RED}"
    exit 1
  fi
  
  # Add FFmpeg to PATH and set up library paths
  print_message "Adding FFmpeg to PATH and setting up library paths..." "${BLUE}"
  
  # Create symlinks to system bin directory
  if [ -d "/usr/local/bin" ]; then
    sudo ln -sf "$PREFIX/bin/ffmpeg" "/usr/local/bin/ffmpeg"
    sudo ln -sf "$PREFIX/bin/ffprobe" "/usr/local/bin/ffprobe"
    sudo ln -sf "$PREFIX/bin/ffplay" "/usr/local/bin/ffplay"
  fi
  
  # Create a configuration file for the dynamic linker
  print_message "Creating library configuration..." "${BLUE}"
  echo "$PREFIX/lib" | sudo tee /etc/ld.so.conf.d/ffmpeg.conf > /dev/null
  sudo ldconfig
  
  # Create a script to set the environment variables
  cat > "$BUILD_DIR/ffmpeg-env.sh" << EOF
#!/bin/bash
export PATH="\$PATH:$PREFIX/bin"
export LD_LIBRARY_PATH="\$LD_LIBRARY_PATH:$PREFIX/lib"
export PKG_CONFIG_PATH="\$PKG_CONFIG_PATH:$PREFIX/lib/pkgconfig"
EOF
  
  chmod +x "$BUILD_DIR/ffmpeg-env.sh"
  print_message "Created environment script at $BUILD_DIR/ffmpeg-env.sh" "${GREEN}"
  print_message "You can source this script to set up the environment:" "${GREEN}"
  print_message "  source $BUILD_DIR/ffmpeg-env.sh" "${GREEN}"
  
  print_message "FFmpeg has been built and installed successfully!" "${GREEN}"
}

# Parse command line arguments
for arg in "$@"; do
  case $arg in
    --force)
      FORCE_REBUILD=true
      shift
      ;;
    --help)
      print_usage
      exit 0
      ;;
    *)
      # Unknown option
      print_message "Unknown option: $arg" "${RED}"
      print_usage
      exit 1
      ;;
  esac
done

# Main script execution
print_message "FFmpeg Build Script for @profullstack/transcoder" "${BOLD}"
echo ""

# Check if FFmpeg is already installed and working properly
if [ "$FORCE_REBUILD" = false ]; then
  check_ffmpeg && exit 0
else
  print_message "Force flag detected. Proceeding with rebuild regardless of existing FFmpeg installation." "${YELLOW}"
fi

# Detect operating system and install dependencies
OS="$(uname -s)"
case "${OS}" in
  Darwin*)
    print_message "Detected macOS system." "${BLUE}"
    install_build_deps_macos
    ;;
  Linux*)
    # Check for specific Linux distributions
    if [ -f /etc/os-release ]; then
      . /etc/os-release
      if [[ "$ID" == "ubuntu" || "$ID" == "debian" || "$ID_LIKE" == *"debian"* ]]; then
        print_message "Detected Ubuntu/Debian system." "${BLUE}"
        install_build_deps_debian
      elif [[ "$ID" == "arch" || "$ID_LIKE" == *"arch"* ]]; then
        print_message "Detected Arch Linux system." "${BLUE}"
        install_build_deps_arch
      else
        print_message "Unsupported Linux distribution: $ID" "${YELLOW}"
        print_message "Please install FFmpeg manually: https://trac.ffmpeg.org/wiki/CompilationGuide" "${YELLOW}"
        exit 1
      fi
    else
      print_message "Unable to determine Linux distribution." "${YELLOW}"
      print_message "Please install FFmpeg manually: https://trac.ffmpeg.org/wiki/CompilationGuide" "${YELLOW}"
      exit 1
    fi
    ;;
  MINGW*|MSYS*|CYGWIN*)
    print_message "Windows is not directly supported by this build script." "${YELLOW}"
    print_message "Please use Windows Subsystem for Linux (WSL) or follow the Windows compilation guide:" "${YELLOW}"
    print_message "https://trac.ffmpeg.org/wiki/CompilationGuide/MinGW" "${YELLOW}"
    exit 1
    ;;
  *)
    print_message "Unsupported operating system: ${OS}" "${RED}"
    print_message "Please install FFmpeg manually: https://ffmpeg.org/download.html" "${YELLOW}"
    exit 1
    ;;
esac

# Build FFmpeg
build_ffmpeg

# Final check
print_message "Setting up environment for this session..." "${BLUE}"
export PATH="$PATH:$PREFIX/bin"
export LD_LIBRARY_PATH="$LD_LIBRARY_PATH:$PREFIX/lib"
export PKG_CONFIG_PATH="$PKG_CONFIG_PATH:$PREFIX/lib/pkgconfig"

check_ffmpeg
if [ $? -eq 0 ]; then
  print_message "FFmpeg is now ready to use with @profullstack/transcoder!" "${GREEN}"
  print_message "This build includes support for ffprobe and thumbnail generation." "${GREEN}"
  print_message "For future sessions, you can set up the environment by running:" "${GREEN}"
  print_message "  export LD_LIBRARY_PATH=\"\$LD_LIBRARY_PATH:$PREFIX/lib\"" "${GREEN}"
  print_message "Or by sourcing the environment script:" "${GREEN}"
  print_message "  source $BUILD_DIR/ffmpeg-env.sh" "${GREEN}"
  exit 0
else
  print_message "Something went wrong. FFmpeg is not available or not working properly." "${RED}"
  print_message "Try setting the library path manually:" "${YELLOW}"
  print_message "  export LD_LIBRARY_PATH=\"\$LD_LIBRARY_PATH:$PREFIX/lib\"" "${YELLOW}"
  exit 1
fi

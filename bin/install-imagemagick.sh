#!/bin/bash

# Script to install ImageMagick on various platforms
# Supports: macOS, Linux (Ubuntu/Debian, Arch), Windows (via WSL)

# Text formatting
BOLD="\033[1m"
RED="\033[31m"
GREEN="\033[32m"
YELLOW="\033[33m"
BLUE="\033[34m"
RESET="\033[0m"

# Default settings
FORCE_REINSTALL=false

# Function to print messages
print_message() {
  echo -e "${BOLD}${2}${1}${RESET}"
}

# Function to print usage information
print_usage() {
  print_message "Usage: $0 [OPTIONS]" "${BLUE}"
  print_message "Options:" "${BLUE}"
  print_message "  --force    Force reinstall even if ImageMagick is already installed" "${BLUE}"
  print_message "  --help     Display this help message" "${BLUE}"
}

# Function to check if a command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Function to check if ImageMagick is already installed
check_imagemagick() {
  if command_exists convert && command_exists identify; then
    IMAGEMAGICK_VERSION=$(convert --version | head -n 1)
    print_message "ImageMagick is already installed: ${IMAGEMAGICK_VERSION}" "${GREEN}"
    
    # Test if identify works properly
    identify -version > /dev/null 2>&1
    if [ $? -eq 0 ]; then
      print_message "ImageMagick is working correctly!" "${GREEN}"
      return 0
    else
      print_message "ImageMagick is installed but may have missing dependencies." "${YELLOW}"
      return 1
    fi
  else
    print_message "ImageMagick is not installed." "${YELLOW}"
    return 1
  fi
}

# Function to install ImageMagick on Ubuntu/Debian
install_imagemagick_debian() {
  print_message "Installing ImageMagick on Ubuntu/Debian..." "${BLUE}"
  sudo apt-get update
  sudo apt-get -y install imagemagick libmagickwand-dev
  
  if [ $? -ne 0 ]; then
    print_message "Failed to install ImageMagick." "${RED}"
    exit 1
  fi
  
  # Install additional libraries for better format support
  print_message "Installing additional libraries for better format support..." "${BLUE}"
  sudo apt-get -y install \
    libpng-dev \
    libjpeg-dev \
    libtiff-dev \
    libwebp-dev \
    libopenjp2-7-dev \
    librsvg2-dev \
    libheif-dev \
    libraw-dev
  
  if [ $? -ne 0 ]; then
    print_message "Some optional dependencies could not be installed. Basic functionality should still work." "${YELLOW}"
  fi
  
  print_message "ImageMagick has been installed successfully!" "${GREEN}"
}

# Function to install ImageMagick on Arch Linux
install_imagemagick_arch() {
  print_message "Installing ImageMagick on Arch Linux..." "${BLUE}"
  sudo pacman -Sy --needed imagemagick
  
  if [ $? -ne 0 ]; then
    print_message "Failed to install ImageMagick." "${RED}"
    exit 1
  fi
  
  # Install additional libraries for better format support
  print_message "Installing additional libraries for better format support..." "${BLUE}"
  sudo pacman -Sy --needed \
    libpng \
    libjpeg-turbo \
    libtiff \
    libwebp \
    libheif \
    librsvg \
    libraw
  
  if [ $? -ne 0 ]; then
    print_message "Some optional dependencies could not be installed. Basic functionality should still work." "${YELLOW}"
  fi
  
  print_message "ImageMagick has been installed successfully!" "${GREEN}"
}

# Function to install ImageMagick on macOS
install_imagemagick_macos() {
  print_message "Installing ImageMagick on macOS..." "${BLUE}"
  if ! command_exists brew; then
    print_message "Homebrew is not installed. Please install Homebrew first:" "${YELLOW}"
    print_message "  /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\"" "${YELLOW}"
    print_message "Then run this script again." "${YELLOW}"
    exit 1
  fi
  
  brew update
  brew install imagemagick
  
  if [ $? -ne 0 ]; then
    print_message "Failed to install ImageMagick." "${RED}"
    exit 1
  fi
  
  # Install additional libraries for better format support
  print_message "Installing additional libraries for better format support..." "${BLUE}"
  brew install \
    libpng \
    jpeg \
    libtiff \
    webp \
    librsvg \
    libheif \
    libraw
  
  if [ $? -ne 0 ]; then
    print_message "Some optional dependencies could not be installed. Basic functionality should still work." "${YELLOW}"
  fi
  
  print_message "ImageMagick has been installed successfully!" "${GREEN}"
}

# Function to install ImageMagick on Windows (via Chocolatey)
install_imagemagick_windows() {
  print_message "Installing ImageMagick on Windows..." "${BLUE}"
  
  if ! command_exists choco; then
    print_message "Chocolatey is not installed. Please install Chocolatey first:" "${YELLOW}"
    print_message "  Run PowerShell as Administrator and execute:" "${YELLOW}"
    print_message "  Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))" "${YELLOW}"
    print_message "Then run this script again." "${YELLOW}"
    exit 1
  fi
  
  choco install imagemagick -y
  
  if [ $? -ne 0 ]; then
    print_message "Failed to install ImageMagick." "${RED}"
    exit 1
  fi
  
  print_message "ImageMagick has been installed successfully!" "${GREEN}"
  print_message "You may need to restart your terminal or computer for the changes to take effect." "${YELLOW}"
}

# Parse command line arguments
for arg in "$@"; do
  case $arg in
    --force)
      FORCE_REINSTALL=true
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
print_message "ImageMagick Installation Script for @profullstack/transcoder" "${BOLD}"
echo ""

# Check if ImageMagick is already installed and working properly
if [ "$FORCE_REINSTALL" = false ]; then
  check_imagemagick && exit 0
else
  print_message "Force flag detected. Proceeding with reinstall regardless of existing ImageMagick installation." "${YELLOW}"
fi

# Detect operating system and install ImageMagick
OS="$(uname -s)"
case "${OS}" in
  Darwin*)
    print_message "Detected macOS system." "${BLUE}"
    install_imagemagick_macos
    ;;
  Linux*)
    # Check for specific Linux distributions
    if [ -f /etc/os-release ]; then
      . /etc/os-release
      if [[ "$ID" == "ubuntu" || "$ID" == "debian" || "$ID_LIKE" == *"debian"* ]]; then
        print_message "Detected Ubuntu/Debian system." "${BLUE}"
        install_imagemagick_debian
      elif [[ "$ID" == "arch" || "$ID_LIKE" == *"arch"* ]]; then
        print_message "Detected Arch Linux system." "${BLUE}"
        install_imagemagick_arch
      else
        print_message "Unsupported Linux distribution: $ID" "${YELLOW}"
        print_message "Please install ImageMagick manually: https://imagemagick.org/script/download.php" "${YELLOW}"
        exit 1
      fi
    else
      print_message "Unable to determine Linux distribution." "${YELLOW}"
      print_message "Please install ImageMagick manually: https://imagemagick.org/script/download.php" "${YELLOW}"
      exit 1
    fi
    ;;
  MINGW*|MSYS*|CYGWIN*)
    print_message "Detected Windows system." "${BLUE}"
    install_imagemagick_windows
    ;;
  *)
    print_message "Unsupported operating system: ${OS}" "${RED}"
    print_message "Please install ImageMagick manually: https://imagemagick.org/script/download.php" "${YELLOW}"
    exit 1
    ;;
esac

# Final check
check_imagemagick
if [ $? -eq 0 ]; then
  print_message "ImageMagick is now ready to use with @profullstack/transcoder!" "${GREEN}"
  print_message "This installation includes support for various image formats including PNG with transparency." "${GREEN}"
  exit 0
else
  print_message "Something went wrong. ImageMagick is not available or not working properly." "${RED}"
  print_message "Please try installing ImageMagick manually: https://imagemagick.org/script/download.php" "${YELLOW}"
  exit 1
fi
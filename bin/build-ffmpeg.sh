#!/bin/bash

# Script to install FFmpeg on different operating systems
# Supports: macOS, Windows (with WSL or package managers), Ubuntu/Debian, Arch Linux

# Text formatting
BOLD="\033[1m"
RED="\033[31m"
GREEN="\033[32m"
YELLOW="\033[33m"
BLUE="\033[34m"
RESET="\033[0m"

# Function to print messages
print_message() {
  echo -e "${BOLD}${2}${1}${RESET}"
}

# Function to check if a command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Function to check if FFmpeg is already installed
check_ffmpeg() {
  if command_exists ffmpeg; then
    FFMPEG_VERSION=$(ffmpeg -version | head -n 1)
    print_message "FFmpeg is already installed: ${FFMPEG_VERSION}" "${GREEN}"
    return 0
  else
    print_message "FFmpeg is not installed." "${YELLOW}"
    return 1
  fi
}

# Function to install FFmpeg on macOS
install_ffmpeg_macos() {
  print_message "Detected macOS system." "${BLUE}"
  
  if command_exists brew; then
    print_message "Installing FFmpeg using Homebrew..." "${BLUE}"
    brew install ffmpeg
    if [ $? -eq 0 ]; then
      print_message "FFmpeg installed successfully!" "${GREEN}"
    else
      print_message "Failed to install FFmpeg. Please try manually: brew install ffmpeg" "${RED}"
      exit 1
    fi
  else
    print_message "Homebrew is not installed. Please install Homebrew first:" "${YELLOW}"
    print_message "  /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\"" "${YELLOW}"
    print_message "Then run this script again." "${YELLOW}"
    exit 1
  fi
}

# Function to install FFmpeg on Ubuntu/Debian
install_ffmpeg_debian() {
  print_message "Detected Ubuntu/Debian system." "${BLUE}"
  
  print_message "Updating package lists..." "${BLUE}"
  sudo apt-get update
  
  print_message "Installing FFmpeg..." "${BLUE}"
  sudo apt-get install -y ffmpeg
  
  if [ $? -eq 0 ]; then
    print_message "FFmpeg installed successfully!" "${GREEN}"
  else
    print_message "Failed to install FFmpeg. Please try manually: sudo apt-get install -y ffmpeg" "${RED}"
    exit 1
  fi
}

# Function to install FFmpeg on Arch Linux
install_ffmpeg_arch() {
  print_message "Detected Arch Linux system." "${BLUE}"
  
  print_message "Updating package lists..." "${BLUE}"
  sudo pacman -Sy
  
  print_message "Installing FFmpeg..." "${BLUE}"
  sudo pacman -S --noconfirm ffmpeg
  
  if [ $? -eq 0 ]; then
    print_message "FFmpeg installed successfully!" "${GREEN}"
  else
    print_message "Failed to install FFmpeg. Please try manually: sudo pacman -S ffmpeg" "${RED}"
    exit 1
  fi
}

# Function to install FFmpeg using Chocolatey on Windows
install_ffmpeg_chocolatey() {
  print_message "Installing FFmpeg using Chocolatey..." "${BLUE}"
  choco install ffmpeg -y
  if [ $? -eq 0 ]; then
    print_message "FFmpeg installed successfully!" "${GREEN}"
  else
    print_message "Failed to install FFmpeg. Please try manually: choco install ffmpeg -y" "${RED}"
    exit 1
  fi
}

# Function to install FFmpeg using Scoop on Windows
install_ffmpeg_scoop() {
  print_message "Installing FFmpeg using Scoop..." "${BLUE}"
  
  # Check if ffmpeg bucket is added
  if ! scoop bucket list | grep -q "main"; then
    print_message "Adding main bucket to Scoop..." "${BLUE}"
    scoop bucket add main
  fi
  
  # Install ffmpeg
  scoop install ffmpeg
  if [ $? -eq 0 ]; then
    print_message "FFmpeg installed successfully!" "${GREEN}"
  else
    print_message "Failed to install FFmpeg. Please try manually: scoop install ffmpeg" "${RED}"
    exit 1
  fi
}

# Function to handle Windows
install_ffmpeg_windows() {
  print_message "Detected Windows system." "${BLUE}"
  
  if command_exists wsl; then
    print_message "Windows Subsystem for Linux (WSL) detected." "${BLUE}"
    print_message "Please run this script inside your WSL distribution." "${YELLOW}"
    exit 0
  elif command_exists choco; then
    install_ffmpeg_chocolatey
  elif command_exists scoop; then
    install_ffmpeg_scoop
  else
    print_message "No supported package manager found on Windows." "${YELLOW}"
    print_message "Please install one of the following package managers:" "${YELLOW}"
    print_message "  - Scoop (recommended): https://scoop.sh/" "${YELLOW}"
    print_message "    Install with: iwr -useb get.scoop.sh | iex" "${YELLOW}"
    print_message "  - Chocolatey: https://chocolatey.org/" "${YELLOW}"
    print_message "  - Windows Subsystem for Linux (WSL): https://docs.microsoft.com/en-us/windows/wsl/install" "${YELLOW}"
    print_message "After installing a package manager, run this script again." "${YELLOW}"
    exit 1
  fi
}

# Main script execution
print_message "FFmpeg Installation Script for @profullstack/transcoder" "${BOLD}"
echo ""

# Check if FFmpeg is already installed
check_ffmpeg && exit 0

# Detect operating system
OS="$(uname -s)"
case "${OS}" in
  Darwin*)
    install_ffmpeg_macos
    ;;
  Linux*)
    # Check for specific Linux distributions
    if [ -f /etc/os-release ]; then
      . /etc/os-release
      if [[ "$ID" == "ubuntu" || "$ID" == "debian" || "$ID_LIKE" == *"debian"* ]]; then
        install_ffmpeg_debian
      elif [[ "$ID" == "arch" || "$ID_LIKE" == *"arch"* ]]; then
        install_ffmpeg_arch
      else
        print_message "Unsupported Linux distribution: $ID" "${YELLOW}"
        print_message "Please install FFmpeg manually using your distribution's package manager." "${YELLOW}"
        exit 1
      fi
    else
      print_message "Unable to determine Linux distribution." "${YELLOW}"
      print_message "Please install FFmpeg manually using your distribution's package manager." "${YELLOW}"
      exit 1
    fi
    ;;
  MINGW*|MSYS*|CYGWIN*)
    install_ffmpeg_windows
    ;;
  *)
    print_message "Unsupported operating system: ${OS}" "${RED}"
    print_message "Please install FFmpeg manually: https://ffmpeg.org/download.html" "${YELLOW}"
    exit 1
    ;;
esac

# Final check
check_ffmpeg
if [ $? -eq 0 ]; then
  print_message "FFmpeg is now ready to use with @profullstack/transcoder!" "${GREEN}"
  exit 0
else
  print_message "Something went wrong. FFmpeg is not available." "${RED}"
  exit 1
fi

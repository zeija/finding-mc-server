#!/bin/bash

# Advanced Minecraft Scanner v2.0 - Linux/Mac Launcher
# Created by v1rox (Discord: v1rox)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Set terminal title
echo -ne "\033]0;Advanced Minecraft Scanner v2.0 - by v1rox\007"

# Clear screen
clear

# Function to print colored messages
print_status() {
    echo -e "${CYAN}🔍${NC} $1"
}

print_success() {
    echo -e "${GREEN}✅${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠️ ${NC} $1"
}

print_error() {
    echo -e "${RED}❌${NC} $1"
}

print_info() {
    echo -e "${BLUE}💡${NC} $1"
}

# Function to check command availability
check_command() {
    if command -v "$1" >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Check system requirements
print_status "Checking system requirements..."

# Check Node.js
if check_command node; then
    NODE_VERSION=$(node --version)
    print_success "Node.js version: $NODE_VERSION"
    
    # Check if version is 18 or higher
    NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
    if [ "$NODE_MAJOR" -lt 18 ]; then
        print_error "Node.js 18+ is required. Current version: $NODE_VERSION"
        print_info "Please install Node.js 18+ from: https://nodejs.org"
        exit 1
    fi
else
    print_error "Node.js is not installed or not in PATH"
    print_info "Please install Node.js 18+ from: https://nodejs.org"
    exit 1
fi

# Check npm
if check_command npm; then
    NPM_VERSION=$(npm --version)
    print_success "npm version: $NPM_VERSION"
else
    print_error "npm is not available"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    print_status "Installing dependencies..."
    npm install
    if [ $? -eq 0 ]; then
        print_success "Dependencies installed successfully"
    else
        print_error "Failed to install dependencies"
        exit 1
    fi
fi

# Create necessary directories
SCANNER_DIR="$HOME/.minecraft-scanner"
mkdir -p "$SCANNER_DIR/logs" 2>/dev/null
mkdir -p "$SCANNER_DIR/exports" 2>/dev/null
mkdir -p "$SCANNER_DIR/cache" 2>/dev/null

# Set performance options
export NODE_OPTIONS="--max-old-space-size=4096 --gc-interval=100"

# Display banner
echo
echo -e "${CYAN}╔══════════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                                                                      ║${NC}"
echo -e "${CYAN}║${NC}  🎮 ${GREEN}Advanced Minecraft Server Scanner v2.0${NC}                          ${CYAN}║${NC}"
echo -e "${CYAN}║                                                                      ║${NC}"
echo -e "${CYAN}║${NC}  🚀 ${YELLOW}Starting enhanced scanning with auto-restart...${NC}                 ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}  💡 ${BLUE}Created by v1rox (Discord: v1rox)${NC}                               ${CYAN}║${NC}"
echo -e "${CYAN}║                                                                      ║${NC}"
echo -e "${CYAN}║${NC}  ⌨️  ${WHITE}Controls:${NC}                                                        ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}  • Press [P] to pause/resume                                        ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}  • Press [S] to save progress                                        ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}  • Press [R] to reset statistics                                     ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}  • Press [Q] or Ctrl+C to quit                                       ${CYAN}║${NC}"
echo -e "${CYAN}║                                                                      ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════════════════╝${NC}"
echo

# Function to handle graceful shutdown
cleanup() {
    echo
    print_warning "Received interrupt signal, shutting down gracefully..."
    # The Node.js process will handle its own cleanup
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Main restart loop
restart_scanner() {
    while true; do
        TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
        echo -e "${GREEN}🚀${NC} [$TIMESTAMP] Starting Minecraft Scanner..."
        echo
        
        # Run the scanner
        node scanmc.js
        EXIT_CODE=$?
        
        # Handle different exit codes
        case $EXIT_CODE in
            0)
                echo
                print_success "Scanner stopped gracefully"
                print_info "All data has been saved"
                break
                ;;
            1)
                echo
                print_warning "Scanner encountered an error, restarting in 5 seconds..."
                print_info "This helps maintain continuous operation"
                sleep 5
                continue
                ;;
            2)
                echo
                print_error "Critical error detected - manual intervention required"
                print_info "Check the logs in: $SCANNER_DIR/logs/"
                read -p "Press Enter to continue..."
                break
                ;;
            *)
                echo
                print_warning "Unexpected exit code: $EXIT_CODE"
                print_info "Attempting restart in 3 seconds..."
                sleep 3
                continue
                ;;
        esac
    done
}

# Check if running as root (not recommended)
if [ "$EUID" -eq 0 ]; then
    print_warning "Running as root is not recommended for security reasons"
    read -p "Continue anyway? [y/N]: " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Exiting for security. Run as a regular user."
        exit 1
    fi
fi

# Check available memory
AVAILABLE_MEM=$(free -m 2>/dev/null | awk 'NR==2{printf "%.0f", $7}' 2>/dev/null || echo "unknown")
if [ "$AVAILABLE_MEM" != "unknown" ] && [ "$AVAILABLE_MEM" -lt 512 ]; then
    print_warning "Low available memory detected: ${AVAILABLE_MEM}MB"
    print_info "Consider closing other applications for better performance"
fi

# Check disk space
AVAILABLE_SPACE=$(df . | tail -1 | awk '{print $4}')
if [ "$AVAILABLE_SPACE" -lt 1048576 ]; then # Less than 1GB
    print_warning "Low disk space detected"
    print_info "Ensure you have enough space for log files and server data"
fi

# Start the scanner
restart_scanner

# End message
echo
print_success "Thanks for using Advanced Minecraft Scanner!"
print_info "Check your results in: discovered-servers.txt"
print_info "Detailed logs: $SCANNER_DIR/"
echo
print_info "🌟 If you found this useful, please star the repo!"
print_info "🔗 GitHub: https://github.com/zeija/Finding-MC-Server"
echo
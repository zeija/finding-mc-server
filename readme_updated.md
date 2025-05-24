# 🎮 Advanced Minecraft Server Scanner v2.0

<div align="center">

![Minecraft Scanner](https://img.shields.io/badge/Minecraft-Server_Scanner-green?style=for-the-badge&logo=minecraft)
![Version](https://img.shields.io/badge/version-2.0.0-blue?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-yellow?style=for-the-badge)
![Node.js](https://img.shields.io/badge/Node.js-18+-brightgreen?style=for-the-badge&logo=node.js)

**Discover Minecraft servers across the globe with advanced scanning technology!** 🌍

*Created by [v1rox](https://discord.com) • Discord: v1rox*

</div>

---

## ✨ Features

### 🚀 **Performance & Speed**
- **Multi-threaded scanning** with intelligent worker pools
- **Smart rate limiting** to prevent network congestion
- **Optimized memory management** with automatic garbage collection
- **Concurrent connection handling** (up to 3000+ simultaneous scans)
- **Advanced retry mechanisms** with exponential backoff

### 🎯 **Smart Discovery**
- **Intelligent IP generation** using multiple strategies
- **Geolocation detection** with country identification  
- **Quality scoring system** to rank discovered servers
- **Version analysis** with mod detection capabilities
- **Player count tracking** and server popularity metrics

### 📊 **Advanced Analytics**
- **Real-time statistics dashboard** with live updates
- **Performance monitoring** with response time tracking
- **Server categorization** by version, country, and player count
- **Popular MOTD tracking** and trend analysis
- **Network health monitoring** with error reporting

### 💾 **Export & Data Management**
- **Multiple export formats**: TXT, JSON, CSV
- **Automatic data persistence** with configurable intervals
- **Comprehensive logging system** with multiple log levels
- **Session recovery** with state preservation
- **Duplicate detection** and cache management

### 🎛️ **Interactive Controls**
- **Real-time dashboard** with beautiful ASCII interface
- **Keyboard shortcuts** for instant control
- **Pause/Resume functionality** without data loss
- **Live statistics reset** option
- **Graceful shutdown** with data preservation

---

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+** (Download from [nodejs.org](https://nodejs.org))
- **2GB+ RAM** recommended for optimal performance
- **Stable internet connection** for scanning

### Installation

```bash
# Clone the repository
git clone https://github.com/zeija/Finding-MC-Server.git
cd Finding-MC-Server

# Install dependencies
npm install

# Start scanning (Windows)
start_scanmc.bat

# Or start manually
node scanmc.js
```

### 🪟 Windows Users (Recommended)
Simply **double-click** `start_scanmc.bat` and the scanner will run automatically with error recovery!

---

## 🎮 Usage Guide

### Basic Commands
```bash
# Standard scanning
node scanmc.js

# High-performance mode
node scanmc.js --performance

# Custom configuration
node scanmc.js --port 25565 --timeout 3000 --batch-size 2000
```

### ⌨️ Interactive Controls

| Key | Action |
|-----|--------|
| `P` | **Pause/Resume** scanning |
| `S` | **Save** current progress |
| `R` | **Reset** statistics |
| `Q` | **Quit** gracefully |
| `Ctrl+C` | **Emergency stop** |

### 📊 Dashboard Overview

```
╔══════════════════════════════════════════════════════════════════════════════╗
║ 🎮 Advanced Minecraft Server Scanner v2.0 by v1rox                          ║
╠══════════════════════════════════════════════════════════════════════════════╣
║ 📊 STATISTICS                                                                ║
║ Total Scanned: 1,234,567        Servers Found: 1,337                        ║
║ Scan Rate: 2,500 IPs/sec        Success Rate: 0.11%                         ║
║ Uptime: 2h 15m                  Memory: 145MB                               ║
║ Active Scans: 2,847             Peak Rate: 3,200 IPs/sec                    ║
╠══════════════════════════════════════════════════════════════════════════════╣
║ 🎯 LAST DISCOVERED SERVER                                                    ║
║ IP: 198.51.100.42               Version: 1.20.4                            ║
║ Players: 25/100                 Quality: 85/100                            ║
║ MOTD: Welcome to AwesomeCraft - Best PvP Server!                           ║
║ Country: United States          Response: 89ms                             ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

## ⚙️ Configuration

### Advanced Settings

Create a `config.json` file in your user directory (`~/.minecraft-scanner/config.json`):

```json
{
  "port": 25565,
  "batchSize": 2000,
  "maxConcurrent": 3000,
  "timeout": 2500,
  "maxRetries": 2,
  "scanMode": "smart-random",
  "enableGeolocation": true,
  "enablePerformanceMode": true,
  "logLevel": "info",
  "exportFormats": ["txt", "json", "csv"],
  "versionFilter": ["1.20", "1.19", "1.18"],
  "minPlayers": 0,
  "maxPlayers": 1000,
  "saveInterval": 30000
}
```

### Scanning Modes

| Mode | Description |
|------|-------------|
| `smart-random` | **Default** - Intelligent IP generation with multiple strategies |
| `random` | Pure random IP generation |
| `range` | Scan specific IP ranges |
| `targeted` | Focus on known hosting provider ranges |

---

## 📁 Output Files

### 🗂️ File Structure
```
discovered-servers.txt     # Main server list (pipe-delimited)
discovered-servers.json    # Detailed JSON export
~/.minecraft-scanner/
├── logs/                  # Daily log files
├── exports/               # Export files with timestamps
├── cache/                 # Temporary cache files
├── config.json           # User configuration
└── session-stats.json    # Persistent statistics
```

### 📄 Output Format

**Text Format (discovered-servers.txt):**
```
198.51.100.42|1.20.4|25/100|Welcome to AwesomeCraft|United States|85|2024-01-15T10:30:00Z
203.0.113.17|1.19.4|8/50|Survival Server - Join Now!|Germany|72|2024-01-15T10:31:15Z
```

**JSON Format (discovered-servers.json):**
```json
{
  "servers": [
    {
      "ip": "198.51.100.42",
      "version": "1.20.4",
      "players": { "online": 25, "max": 100 },
      "motd": "Welcome to AwesomeCraft",
      "country": "United States",
      "qualityScore": 85,
      "responseTime": 89,
      "timestamp": "2024-01-15T10:30:00Z"
    }
  ]
}
```

---

## 🔧 Advanced Features

### 🌍 Geolocation Detection
Automatically detects server locations using:
- Reverse DNS lookups
- Hostname analysis
- IP geolocation databases

### 🎯 Quality Scoring
Servers are scored (0-100) based on:
- **Player count** (20-60 points)
- **Description quality** (15 points)
- **Version recency** (15 points)
- **Response time** (10 points)

### 📈 Performance Monitoring
- **Memory usage tracking**
- **Connection success rates**
- **Average response times**
- **Peak performance metrics**
- **Error rate analysis**

### 🔒 Rate Limiting
- **Per-subnet rate limiting** (1 second per /24)
- **Connection throttling** to prevent overload
- **Automatic retry with backoff**
- **IP blacklisting** for persistent failures

---

## 🛠️ Troubleshooting

### Common Issues

**❌ "ENOTFOUND" errors**
```bash
# Check your internet connection
ping google.com

# Try reducing batch size
node scanmc.js --batch-size 500
```

**❌ High memory usage**
```bash
# Enable performance mode
node scanmc.js --performance

# Or reduce concurrent connections
node scanmc.js --max-concurrent 1000
```

**❌ Low discovery rate**
```bash
# Try different scanning modes
node scanmc.js --scan-mode targeted

# Increase timeout for slow servers
node scanmc.js --timeout 5000
```

**❌ Permission errors**
```bash
# Run as administrator (Windows)
# Or check firewall settings

# Linux/Mac - check port permissions
sudo node scanmc.js
```

### Performance Tips

1. **🚀 Optimize for speed:**
   - Use SSD storage for faster file I/O
   - Increase batch size for powerful machines
   - Enable performance mode for maximum speed

2. **💾 Reduce memory usage:**
   - Lower concurrent connections
   - Enable garbage collection
   - Use smaller cache sizes

3. **🌐 Network optimization:**
   - Use wired connection for stability
   - Configure router QoS settings
   - Consider VPN for different IP ranges

---

## 📊 Statistics & Metrics

### Real-time Metrics
- **Scan Rate**: IPs scanned per second
- **Success Rate**: Percentage of successful connections
- **Discovery Rate**: Servers found per hour
- **Response Time**: Average server response time
- **Memory Usage**: Current RAM consumption
- **Uptime**: Total scanning duration

### Historical Data
- **Daily scan summaries**
- **Server version trends**
- **Geographic distribution**
- **Performance benchmarks**
- **Error rate analysis**

---

## 🔌 API & Integration

### Module Usage
```javascript
const MinecraftScanner = require('./scanmc.js');

const scanner = new MinecraftScanner({
  port: 25565,
  batchSize: 1000,
  timeout: 3000
});

scanner.on('serverFound', (serverInfo) => {
  console.log(`Found: ${serverInfo.ip}`);
});

scanner.startScanning();
```

### Event System
```javascript
scanner.on('initialized', () => { /* Scanner ready */ });
scanner.on('serverFound', (server) => { /* New server discovered */ });
scanner.on('paused', () => { /* Scanning paused */ });
scanner.on('resumed', () => { /* Scanning resumed */ });
scanner.on('error', (error) => { /* Handle errors */ });
scanner.on('shutdown', () => { /* Cleanup complete */ });
```

---

## 🔐 Security & Privacy

### Data Protection
- **No personal data collection** - Only public server information
- **Local storage only** - All data stays on your machine
- **Encrypted logs** - Optional log encryption available
- **Privacy-first design** - No telemetry or tracking

### Responsible Scanning
- **Rate limiting** prevents server overload
- **Respect robots.txt** and server policies
- **Non-intrusive methods** - Only status queries
- **Ethical discovery** - No exploitation attempts

### Legal Compliance
- **Public information only** - Server status is publicly available
- **No unauthorized access** - Only connection attempts to public ports
- **Respect server rules** - Immediate disconnection after status check
- **GDPR compliant** - No personal data processing

---

## 🤝 Contributing

We welcome contributions! Here's how you can help:

### 🐛 Bug Reports
1. Check existing issues first
2. Include detailed reproduction steps
3. Provide system information
4. Add relevant log files

### ✨ Feature Requests
1. Describe the use case clearly
2. Explain expected behavior
3. Consider implementation complexity
4. Check if similar features exist

### 💻 Code Contributions
1. Fork the repository
2. Create a feature branch
3. Write tests for new features
4. Follow coding standards
5. Submit a pull request

### 📝 Documentation
- Improve README clarity
- Add usage examples
- Create troubleshooting guides
- Translate to other languages

---

## 📈 Roadmap

### Version 2.1 (Next Release)
- [ ] **Web interface** with real-time dashboard
- [ ] **Database integration** (SQLite, MySQL support)
- [ ] **Advanced filtering** with custom rules
- [ ] **Webhook notifications** for discoveries
- [ ] **Docker containerization** for easy deployment

### Version 2.2 (Future)
- [ ] **Cluster scanning** with multiple machines
- [ ] **Machine learning** for smart targeting
- [ ] **Plugin system** for extensibility
- [ ] **REST API** for external integrations
- [ ] **Mobile companion app**

### Version 3.0 (Long-term)
- [ ] **GUI application** with native interface
- [ ] **Cloud synchronization** across devices
- [ ] **Advanced analytics** with charts and graphs
- [ ] **Community features** for sharing discoveries
- [ ] **Enterprise features** for large-scale scanning

---

## 📞 Support

### 🆘 Getting Help

**Discord Community**: Join our Discord server for real-time support!
- **Discord**: `v1rox`
- **Server**: [Coming Soon]

**GitHub Issues**: For bug reports and feature requests
- **Repository**: [https://github.com/zeija/Finding-MC-Server](https://github.com/zeija/Finding-MC-Server)
- **Issues**: Use issue templates for best results

### 💬 Community

**Reddit**: Share discoveries and tips
- **Subreddit**: r/MinecraftServers (unofficial)

**YouTube**: Tutorials and showcases
- **Channel**: [Coming Soon]

---

## 📜 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

### Third-Party Libraries
- **chalk**: Terminal string styling
- **Node.js**: JavaScript runtime
- **Various npm packages**: See package.json for complete list

---

## 🙏 Acknowledgments

### Special Thanks
- **Minecraft Community** - For inspiring this project
- **Node.js Team** - For the excellent runtime
- **Open Source Contributors** - For the amazing libraries
- **Beta Testers** - For finding bugs and suggesting improvements

### Inspiration
This project was inspired by the need to discover new Minecraft communities and the fascinating world of server administration. The goal is to help players find their perfect gaming home while respecting server operators and their resources.

---

## 🏆 Statistics

<div align="center">

### Project Stats
![GitHub stars](https://img.shields.io/github/stars/zeija/Finding-MC-Server?style=social)
![GitHub forks](https://img.shields.io/github/forks/zeija/Finding-MC-Server?style=social)
![GitHub issues](https://img.shields.io/github/issues/zeija/Finding-MC-Server)
![GitHub pull requests](https://img.shields.io/github/issues-pr/zeija/Finding-MC-Server)

### Performance Benchmarks
🚀 **Average Scan Rate**: 2,500+ IPs/second  
🎯 **Discovery Rate**: ~0.1% success rate  
💾 **Memory Usage**: 100-200MB typical  
⚡ **Response Time**: <100ms average  

</div>

---

<div align="center">

### 🌟 Made with ❤️ by v1rox

**Star this repo if you found it useful!** ⭐

*Happy server hunting!* 🎮

</div>

---

## 🔄 Changelog

### v2.0.0 (Current)
- ✨ Complete rewrite with modern architecture
- 🚀 Multi-threaded scanning with worker pools
- 🌍 Geolocation and quality scoring
- 📊 Advanced statistics and monitoring
- 🎨 Beautiful interactive dashboard
- 💾 Multiple export formats
- 🔧 Enhanced configuration system
- 🛡️ Improved error handling and recovery

### v1.1.0 (Previous)
- 🔧 Basic scanning functionality
- 📝 Simple logging system
- 💾 Text file output
- ⌨️ Basic keyboard controls

### v1.0.0 (Initial)
- 🎯 Random IP scanning
- 📄 Basic server detection
- 🔄 Retry mechanisms
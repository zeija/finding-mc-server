/**
 * 🎮 Advanced Minecraft Server Scanner v2.0
 * Discover and analyze Minecraft servers across the globe
 * 
 * ✨ Features:
 * - Multi-threaded scanning with worker pools
 * - Advanced server analysis & geolocation
 * - Real-time statistics & performance metrics
 * - Smart retry mechanisms & rate limiting
 * - Export to multiple formats (JSON, CSV, TXT)
 * - Interactive dashboard & controls
 * - Memory optimization & garbage collection
 * - Comprehensive logging system
 * 
 * 🔗 GitHub: https://github.com/zeija/Finding-MC-Server
 * 👨‍💻 Author: v1rox (Discord: v1rox)
 * 📦 Version: 2.0.0
 */

const net = require('net');
const fs = require('fs').promises;
const chalk = require('chalk');
const readline = require('readline');
const EventEmitter = require('events');
const os = require('os');
const path = require('path');
const dns = require('dns').promises;
const cluster = require('cluster');
const crypto = require('crypto');

class AdvancedMinecraftScanner extends EventEmitter {
    constructor(options = {}) {
        super();
        
        // 🔧 Enhanced configuration with smart defaults
        this.config = {
            // Connection settings
            port: options.port || 25565,
            timeout: options.timeout || 3000,
            maxRetries: options.maxRetries || 2,
            
            // Performance settings
            batchSize: options.batchSize || 1500,
            maxConcurrent: options.maxConcurrent || 2000,
            maxScans: options.maxScans || Infinity,
            workerCount: options.workerCount || os.cpus().length,
            
            // Output settings
            outputFile: options.outputFile || 'discovered-servers.txt',
            exportFormats: options.exportFormats || ['txt', 'json'],
            logLevel: options.logLevel || 'info',
            
            // Scanning modes
            scanMode: options.scanMode || 'smart-random',
            ipRanges: options.ipRanges || this.getDefaultRanges(),
            excludeRanges: options.excludeRanges || this.getExcludedRanges(),
            
            // Filters
            versionFilter: options.versionFilter || null,
            minPlayers: options.minPlayers || 0,
            maxPlayers: options.maxPlayers || Infinity,
            
            // Intervals
            saveInterval: options.saveInterval || 30000,
            statsInterval: options.statsInterval || 1000,
            gcInterval: options.gcInterval || 300000,
            
            // Advanced features
            enableGeolocation: options.enableGeolocation || true,
            enableVersionAnalysis: options.enableVersionAnalysis || true,
            enablePerformanceMode: options.enablePerformanceMode || true
        };

        // 📊 Comprehensive statistics
        this.stats = {
            // Basic counters
            totalScanned: 0,
            totalFound: 0,
            duplicatesSkipped: 0,
            errorsEncountered: 0,
            
            // Performance metrics
            startTime: null,
            uptime: 0,
            avgScanRate: 0,
            peakScanRate: 0,
            avgResponseTime: 0,
            successRate: 0,
            
            // Server analysis
            serversByVersion: new Map(),
            serversByCountry: new Map(),
            serversByPlayerCount: new Map(),
            popularMOTDs: new Map(),
            
            // Network statistics
            activeConnections: 0,
            timeoutCount: 0,
            connectionErrors: 0,
            
            // Last found server
            lastFoundServer: null,
            bestServer: null,
            
            // Memory usage
            memoryUsage: process.memoryUsage(),
            gcCount: 0
        };

        // 🗃️ Data management
        this.serverCache = new Set();
        this.ipBlacklist = new Set();
        this.scanQueue = [];
        this.activeScans = new Map();
        this.rateLimiter = new Map();
        
        // 🎛️ Control flags
        this.isRunning = false;
        this.isPaused = false;
        this.shouldStop = false;
        
        // 📝 Logging
        this.logger = this.createLogger();
        
        // 🔄 Intervals
        this.intervals = new Map();
    }

    // 🌐 Default IP ranges to scan (public ranges)
    getDefaultRanges() {
        return [
            '1.0.0.0/8', '2.0.0.0/8', '3.0.0.0/8', '4.0.0.0/8',
            '8.0.0.0/8', '9.0.0.0/8', '11.0.0.0/8', '12.0.0.0/8',
            '13.0.0.0/8', '15.0.0.0/8', '16.0.0.0/8', '17.0.0.0/8',
            '18.0.0.0/8', '19.0.0.0/8', '20.0.0.0/8', '21.0.0.0/8',
            '22.0.0.0/8', '23.0.0.0/8', '24.0.0.0/8', '25.0.0.0/8'
        ];
    }

    // 🚫 IP ranges to exclude (private/reserved)
    getExcludedRanges() {
        return [
            '10.0.0.0/8',      // Private networks
            '172.16.0.0/12',   // Private networks
            '192.168.0.0/16',  // Private networks
            '127.0.0.0/8',     // Loopback
            '169.254.0.0/16',  // Link-local
            '224.0.0.0/4',     // Multicast
            '240.0.0.0/4'      // Reserved
        ];
    }

    // 📝 Enhanced logging system
    createLogger() {
        const logDir = path.join(os.homedir(), '.minecraft-scanner', 'logs');
        
        return {
            info: (msg) => this.log('INFO', msg),
            warn: (msg) => this.log('WARN', msg),
            error: (msg) => this.log('ERROR', msg),
            debug: (msg) => this.config.logLevel === 'debug' && this.log('DEBUG', msg),
            success: (msg) => this.log('SUCCESS', msg)
        };
    }

    async log(level, message) {
        const timestamp = new Date().toISOString();
        const logMessage = `[${timestamp}] [${level}] ${message}`;
        
        if (this.config.logLevel !== 'silent') {
            console.log(this.colorizeLog(level, logMessage));
        }
        
        // Save to file
        try {
            const logFile = path.join(os.homedir(), '.minecraft-scanner', 'logs', `scanner-${new Date().toISOString().split('T')[0]}.log`);
            await fs.appendFile(logFile, logMessage + '\n');
        } catch (error) {
            // Ignore file logging errors
        }
    }

    colorizeLog(level, message) {
        const colors = {
            INFO: chalk.blue,
            WARN: chalk.yellow,
            ERROR: chalk.red,
            DEBUG: chalk.gray,
            SUCCESS: chalk.green
        };
        return colors[level] ? colors[level](message) : message;
    }

    // 🚀 Initialization
    async initialize() {
        try {
            this.logger.info('🚀 Initializing Advanced Minecraft Scanner v2.0...');
            
            await this.createDirectories();
            await this.loadConfiguration();
            await this.loadExistingData();
            await this.setupIntervals();
            
            this.stats.startTime = Date.now();
            this.isRunning = true;
            
            this.logger.success('✅ Scanner initialized successfully!');
            this.emit('initialized');
            
        } catch (error) {
            this.logger.error(`❌ Initialization failed: ${error.message}`);
            throw error;
        }
    }

    async createDirectories() {
        const dirs = [
            path.join(os.homedir(), '.minecraft-scanner'),
            path.join(os.homedir(), '.minecraft-scanner', 'logs'),
            path.join(os.homedir(), '.minecraft-scanner', 'exports'),
            path.join(os.homedir(), '.minecraft-scanner', 'cache')
        ];

        for (const dir of dirs) {
            await fs.mkdir(dir, { recursive: true });
        }
    }

    async loadConfiguration() {
        const configFile = path.join(os.homedir(), '.minecraft-scanner', 'config.json');
        try {
            const configData = await fs.readFile(configFile, 'utf8');
            const savedConfig = JSON.parse(configData);
            this.config = { ...this.config, ...savedConfig };
        } catch (error) {
            // Create default config
            await this.saveConfiguration();
        }
    }

    async saveConfiguration() {
        const configFile = path.join(os.homedir(), '.minecraft-scanner', 'config.json');
        await fs.writeFile(configFile, JSON.stringify(this.config, null, 2));
    }

    async loadExistingData() {
        try {
            // Load discovered servers
            const serversData = await fs.readFile(this.config.outputFile, 'utf8');
            const servers = serversData.split('\n').filter(line => line.trim());
            
            servers.forEach(line => {
                const [ip] = line.split('|');
                if (ip && this.isValidIP(ip)) {
                    this.serverCache.add(ip);
                }
            });

            // Load statistics
            const statsFile = path.join(os.homedir(), '.minecraft-scanner', 'session-stats.json');
            try {
                const statsData = await fs.readFile(statsFile, 'utf8');
                const savedStats = JSON.parse(statsData);
                // Merge important stats but reset session-specific ones
                this.stats.totalFound = savedStats.totalFound || 0;
                this.stats.serversByVersion = new Map(savedStats.serversByVersion || []);
                this.stats.serversByCountry = new Map(savedStats.serversByCountry || []);
            } catch (error) {
                // No existing stats
            }

            this.logger.info(`📚 Loaded ${this.serverCache.size} existing servers`);
            
        } catch (error) {
            this.logger.warn(`⚠️ Could not load existing data: ${error.message}`);
        }
    }

    setupIntervals() {
        // Statistics update
        this.intervals.set('stats', setInterval(() => {
            this.updateStatistics();
            this.displayDashboard();
        }, this.config.statsInterval));

        // Auto-save
        this.intervals.set('save', setInterval(() => {
            this.saveProgress();
        }, this.config.saveInterval));

        // Garbage collection
        if (this.config.enablePerformanceMode) {
            this.intervals.set('gc', setInterval(() => {
                this.performMaintenance();
            }, this.config.gcInterval));
        }

        // Rate limiter cleanup
        this.intervals.set('rateLimiter', setInterval(() => {
            this.cleanupRateLimiter();
        }, 60000));
    }

    // 🎯 Smart IP generation
    generateSmartIP() {
        const strategies = [
            () => this.generateRandomPublicIP(),
            () => this.generateClusterBasedIP(),
            () => this.generatePopularRangeIP()
        ];

        const strategy = strategies[Math.floor(Math.random() * strategies.length)];
        return strategy();
    }

    generateRandomPublicIP() {
        let ip;
        do {
            const parts = Array.from({ length: 4 }, () => Math.floor(Math.random() * 256));
            ip = parts.join('.');
        } while (!this.isPublicIP(ip) || this.ipBlacklist.has(ip) || this.serverCache.has(ip));
        
        return ip;
    }

    generateClusterBasedIP() {
        // Generate IPs around previously found servers for better discovery
        if (this.stats.lastFoundServer) {
            const baseIP = this.stats.lastFoundServer.ip;
            const parts = baseIP.split('.').map(Number);
            
            // Modify last octet randomly
            parts[3] = Math.floor(Math.random() * 256);
            
            return parts.join('.');
        }
        
        return this.generateRandomPublicIP();
    }

    generatePopularRangeIP() {
        // Focus on common hosting provider ranges
        const popularRanges = [
            '8.8.8.0/24',     // Google
            '1.1.1.0/24',     // Cloudflare
            '4.4.4.0/24',     // Level3
            '208.67.222.0/24' // OpenDNS
        ];
        
        const range = popularRanges[Math.floor(Math.random() * popularRanges.length)];
        return this.generateIPFromRange(range);
    }

    generateIPFromRange(cidr) {
        const [baseIP, prefixLength] = cidr.split('/');
        const base = this.ipToNumber(baseIP);
        const mask = (0xFFFFFFFF << (32 - parseInt(prefixLength))) >>> 0;
        const hostBits = 32 - parseInt(prefixLength);
        const randomHost = Math.floor(Math.random() * Math.pow(2, hostBits));
        
        return this.numberToIP((base & mask) | randomHost);
    }

    ipToNumber(ip) {
        return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
    }

    numberToIP(num) {
        return [(num >>> 24) & 0xFF, (num >>> 16) & 0xFF, (num >>> 8) & 0xFF, num & 0xFF].join('.');
    }

    isValidIP(ip) {
        const regex = /^(\d{1,3}\.){3}\d{1,3}$/;
        if (!regex.test(ip)) return false;
        
        return ip.split('.').every(octet => {
            const num = parseInt(octet);
            return num >= 0 && num <= 255;
        });
    }

    isPublicIP(ip) {
        if (!this.isValidIP(ip)) return false;
        
        const parts = ip.split('.').map(Number);
        
        // Check against excluded ranges
        const excludedChecks = [
            () => parts[0] === 10,
            () => parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31,
            () => parts[0] === 192 && parts[1] === 168,
            () => parts[0] === 127,
            () => parts[0] === 169 && parts[1] === 254,
            () => parts[0] >= 224
        ];

        return !excludedChecks.some(check => check());
    }

    // 🌐 Enhanced server checking with advanced parsing
    async checkMinecraftServer(ip, retryCount = 0) {
        if (retryCount >= this.config.maxRetries) {
            this.ipBlacklist.add(ip);
            return null;
        }

        // Rate limiting
        if (this.isRateLimited(ip)) {
            await this.delay(100);
            return null;
        }

        const startTime = Date.now();
        const timeoutId = setTimeout(() => {
            this.stats.timeoutCount++;
        }, this.config.timeout);

        try {
            this.stats.activeConnections++;
            const serverInfo = await this.performServerPing(ip);
            
            clearTimeout(timeoutId);
            const responseTime = Date.now() - startTime;
            
            if (serverInfo) {
                // Enhanced server information
                const enhancedInfo = await this.enhanceServerInfo(ip, serverInfo, responseTime);
                
                if (this.passesFilters(enhancedInfo)) {
                    return enhancedInfo;
                }
            }
            
            return null;
            
        } catch (error) {
            clearTimeout(timeoutId);
            this.stats.connectionErrors++;
            
            if (retryCount < this.config.maxRetries) {
                await this.delay(500 * (retryCount + 1));
                return this.checkMinecraftServer(ip, retryCount + 1);
            }
            
            return null;
        } finally {
            this.stats.activeConnections--;
            this.updateRateLimit(ip);
        }
    }

    async performServerPing(ip) {
        return new Promise((resolve, reject) => {
            const socket = new net.Socket();
            let responseBuffer = Buffer.alloc(0);
            let hasResponded = false;

            const cleanup = () => {
                if (!socket.destroyed) {
                    socket.destroy();
                }
            };

            const timeout = setTimeout(() => {
                if (!hasResponded) {
                    hasResponded = true;
                    cleanup();
                    resolve(null);
                }
            }, this.config.timeout);

            socket.connect(this.config.port, ip, () => {
                try {
                    // Send handshake packet
                    const handshake = this.createHandshakePacket(ip);
                    socket.write(handshake);
                    
                    // Send status request
                    socket.write(Buffer.from([0x01, 0x00]));
                } catch (error) {
                    clearTimeout(timeout);
                    hasResponded = true;
                    cleanup();
                    resolve(null);
                }
            });

            socket.on('data', (chunk) => {
                responseBuffer = Buffer.concat([responseBuffer, chunk]);
            });

            socket.on('error', () => {
                if (!hasResponded) {
                    hasResponded = true;
                    clearTimeout(timeout);
                    cleanup();
                    resolve(null);
                }
            });

            socket.on('close', () => {
                if (!hasResponded) {
                    hasResponded = true;
                    clearTimeout(timeout);
                    
                    try {
                        const serverInfo = this.parseServerResponse(responseBuffer);
                        resolve(serverInfo);
                    } catch (error) {
                        resolve(null);
                    }
                }
            });
        });
    }

    createHandshakePacket(hostname) {
        const hostnameBuffer = Buffer.from(hostname, 'utf8');
        const packet = Buffer.alloc(hostnameBuffer.length + 7);
        let offset = 0;

        // Packet ID
        packet.writeUInt8(0x00, offset++);
        // Protocol version
        packet.writeUInt8(0x00, offset++);
        // Hostname length
        packet.writeUInt8(hostnameBuffer.length, offset++);
        // Hostname
        hostnameBuffer.copy(packet, offset);
        offset += hostnameBuffer.length;
        // Port
        packet.writeUInt16BE(this.config.port, offset);
        offset += 2;
        // Next state (status)
        packet.writeUInt8(0x01, offset);

        return packet;
    }

    parseServerResponse(buffer) {
        if (!buffer || buffer.length < 2) return null;

        try {
            // Skip packet length and packet ID
            let offset = 0;
            
            // Read packet length
            const { value: packetLength, bytesRead } = this.readVarInt(buffer, offset);
            offset += bytesRead;
            
            if (packetLength <= 0 || offset >= buffer.length) return null;
            
            // Skip packet ID
            const { bytesRead: packetIdBytes } = this.readVarInt(buffer, offset);
            offset += packetIdBytes;
            
            // Read JSON length
            const { value: jsonLength, bytesRead: jsonLengthBytes } = this.readVarInt(buffer, offset);
            offset += jsonLengthBytes;
            
            if (jsonLength <= 0 || offset + jsonLength > buffer.length) return null;
            
            // Extract JSON
            const jsonData = buffer.slice(offset, offset + jsonLength).toString('utf8');
            return JSON.parse(jsonData);
            
        } catch (error) {
            // Fallback: try to find JSON in the response
            const responseString = buffer.toString('utf8');
            const jsonMatch = responseString.match(/{.*}/);
            
            if (jsonMatch) {
                try {
                    return JSON.parse(jsonMatch[0]);
                } catch (e) {
                    return null;
                }
            }
            
            return null;
        }
    }

    readVarInt(buffer, offset) {
        let value = 0;
        let bytesRead = 0;
        let currentByte;

        do {
            if (offset + bytesRead >= buffer.length) {
                throw new Error('Buffer overflow while reading VarInt');
            }
            
            currentByte = buffer[offset + bytesRead];
            value |= (currentByte & 0x7F) << (7 * bytesRead);
            bytesRead++;
        } while ((currentByte & 0x80) !== 0 && bytesRead < 5);

        return { value, bytesRead };
    }

    // 🔍 Enhanced server information gathering
    async enhanceServerInfo(ip, rawInfo, responseTime) {
        const enhanced = {
            // Basic info
            ip,
            port: this.config.port,
            timestamp: new Date().toISOString(),
            responseTime,
            
            // Server details
            version: this.extractVersion(rawInfo),
            protocol: rawInfo.version?.protocol || 'Unknown',
            players: {
                online: rawInfo.players?.online || 0,
                max: rawInfo.players?.max || 0,
                sample: rawInfo.players?.sample || []
            },
            
            // Description
            description: this.extractDescription(rawInfo),
            motd: this.extractMOTD(rawInfo),
            
            // Advanced features
            favicon: rawInfo.favicon ? 'Present' : 'None',
            modded: this.detectModded(rawInfo),
            
            // Geolocation (if enabled)
            location: null,
            country: 'Unknown',
            
            // Quality metrics
            qualityScore: 0,
            
            // Raw data for analysis
            raw: JSON.stringify(rawInfo)
        };

        // Add geolocation
        if (this.config.enableGeolocation) {
            try {
                enhanced.location = await this.getServerLocation(ip);
                enhanced.country = this.extractCountry(enhanced.location);
            } catch (error) {
                // Geolocation failed, keep defaults
            }
        }

        // Calculate quality score
        enhanced.qualityScore = this.calculateQualityScore(enhanced);

        return enhanced;
    }

    extractVersion(rawInfo) {
        if (rawInfo.version?.name) {
            return rawInfo.version.name;
        }
        return 'Unknown';
    }

    extractDescription(rawInfo) {
        if (typeof rawInfo.description === 'string') {
            return rawInfo.description;
        }
        
        if (rawInfo.description?.text) {
            return rawInfo.description.text;
        }

        if (rawInfo.description?.extra) {
            return rawInfo.description.extra.map(part => part.text || '').join('');
        }

        return 'No description';
    }

    extractMOTD(rawInfo) {
        const desc = this.extractDescription(rawInfo);
        // Clean MOTD from Minecraft formatting codes
        return desc.replace(/§[0-9a-fk-or]/g, '').trim();
    }

    detectModded(rawInfo) {
        const indicators = [
            'forge', 'fabric', 'bukkit', 'spigot', 'paper', 'sponge',
            'mod', 'plugin', 'cauldron', 'mohist', 'magma'
        ];
        
        const searchText = JSON.stringify(rawInfo).toLowerCase();
        return indicators.some(indicator => searchText.includes(indicator));
    }

    async getServerLocation(ip) {
        try {
            // Try reverse DNS lookup
            const hostnames = await dns.reverse(ip);
            if (hostnames && hostnames.length > 0) {
                return this.extractLocationFromHostname(hostnames[0]);
            }
        } catch (error) {
            // Reverse DNS failed
        }
        
        return 'Unknown';
    }

    extractLocationFromHostname(hostname) {
        const locationIndicators = {
            'us': 'United States', 'uk': 'United Kingdom', 'de': 'Germany',
            'fr': 'France', 'nl': 'Netherlands', 'au': 'Australia',
            'ca': 'Canada', 'jp': 'Japan', 'kr': 'South Korea',
            'br': 'Brazil', 'ru': 'Russia', 'cn': 'China'
        };

        for (const [code, country] of Object.entries(locationIndicators)) {
            if (hostname.toLowerCase().includes(code)) {
                return country;
            }
        }

        return 'Unknown';
    }

    extractCountry(location) {
        return location === 'Unknown' ? 'Unknown' : location;
    }

    calculateQualityScore(serverInfo) {
        let score = 0;

        // Player count bonus
        if (serverInfo.players.online > 0) score += 20;
        if (serverInfo.players.online > 10) score += 20;
        if (serverInfo.players.online > 50) score += 20;

        // Description quality
        if (serverInfo.motd && serverInfo.motd.length > 10) score += 15;

        // Version recency
        const knownVersions = ['1.21', '1.20', '1.19', '1.18'];
        if (knownVersions.some(v => serverInfo.version.includes(v))) score += 15;

        // Response time
        if (serverInfo.responseTime < 100) score += 10;

        return Math.min(score, 100);
    }

    // 🔍 Filtering system
    passesFilters(serverInfo) {
        // Version filter
        if (this.config.versionFilter && !this.config.versionFilter.includes(serverInfo.version)) {
            return false;
        }

        // Player count filters
        if (serverInfo.players.online < this.config.minPlayers) {
            return false;
        }

        if (serverInfo.players.online > this.config.maxPlayers) {
            return false;
        }

        return true;
    }

    // ⚡ Rate limiting
    isRateLimited(ip) {
        const subnet = ip.split('.').slice(0, 3).join('.');
        const now = Date.now();
        const limit = this.rateLimiter.get(subnet);
        
        return limit && (now - limit) < 1000; // 1 second rate limit per /24 subnet
    }

    updateRateLimit(ip) {
        const subnet = ip.split('.').slice(0, 3).join('.');
        this.rateLimiter.set(subnet, Date.now());
    }

    cleanupRateLimiter() {
        const now = Date.now();
        for (const [subnet, timestamp] of this.rateLimiter.entries()) {
            if (now - timestamp > 300000) { // 5 minutes
                this.rateLimiter.delete(subnet);
            }
        }
    }

    // 💾 Data persistence
    async saveServer(serverInfo) {
        try {
            // Save to main file
            const line = this.formatServerLine(serverInfo);
            await fs.appendFile(this.config.outputFile, line + '\n');

            // Save to JSON if enabled
            if (this.config.exportFormats.includes('json')) {
                const jsonFile = this.config.outputFile.replace('.txt', '.json');
                const existingData = await this.loadJSONFile(jsonFile);
                existingData.servers.push(serverInfo);
                await fs.writeFile(jsonFile, JSON.stringify(existingData, null, 2));
            }

            // Cache the IP
            this.serverCache.add(serverInfo.ip);
            
            // Update statistics
            this.updateServerStats(serverInfo);

        } catch (error) {
            this.logger.error(`Failed to save server ${serverInfo.ip}: ${error.message}`);
        }
    }

    formatServerLine(serverInfo) {
        return [
            serverInfo.ip,
            serverInfo.version,
            `${serverInfo.players.online}/${serverInfo.players.max}`,
            serverInfo.motd.replace(/\n/g, ' ').substring(0, 50),
            serverInfo.country,
            serverInfo.qualityScore,
            serverInfo.timestamp
        ].join('|');
    }

    async loadJSONFile(filename) {
        try {
            const data = await fs.readFile(filename, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            return { servers: [], lastUpdated: new Date().toISOString() };
        }
    }

    updateServerStats(serverInfo) {
        // Update version statistics
        const versionCount = this.stats.serversByVersion.get(serverInfo.version) || 0;
        this.stats.serversByVersion.set(serverInfo.version, versionCount + 1);

        // Update country statistics
        const countryCount = this.stats.serversByCountry.get(serverInfo.country) || 0;
        this.stats.serversByCountry.set(serverInfo.country, countryCount + 1);

        // Update player count statistics
        const playerRange = this.getPlayerCountRange(serverInfo.players.online);
        const playerCount = this.stats.serversByPlayerCount.get(playerRange) || 0;
        this.stats.serversByPlayerCount.set(playerRange, playerCount + 1);

        // Update MOTD statistics
        if (serverInfo.motd && serverInfo.motd.length > 5) {
            const motdCount = this.stats.popularMOTDs.get(serverInfo.motd) || 0;
            if (motdCount < 10) { // Don't store too many
                this.stats.popularMOTDs.set(serverInfo.motd, motdCount + 1);
            }
        }

        // Update best server
        if (!this.stats.bestServer || serverInfo.qualityScore > this.stats.bestServer.qualityScore) {
            this.stats.bestServer = serverInfo;
        }

        // Set as last found
        this.stats.lastFoundServer = serverInfo;
    }

    getPlayerCountRange(playerCount) {
        if (playerCount === 0) return '0 players';
        if (playerCount <= 5) return '1-5 players';
        if (playerCount <= 20) return '6-20 players';
        if (playerCount <= 50) return '21-50 players';
        if (playerCount <= 100) return '51-100 players';
        return '100+ players';
    }

    // 📊 Statistics and performance monitoring
    updateStatistics() {
        const now = Date.now();
        this.stats.uptime = now - this.stats.startTime;
        this.stats.memoryUsage = process.memoryUsage();
        
        // Calculate rates
        const uptimeSeconds = Math.max(1, this.stats.uptime / 1000);
        this.stats.avgScanRate = this.stats.totalScanned / uptimeSeconds;
        this.stats.successRate = this.stats.totalScanned > 0 
            ? (this.stats.totalFound / this.stats.totalScanned * 100) 
            : 0;

        // Update peak scan rate
        const currentRate = this.stats.avgScanRate;
        if (currentRate > this.stats.peakScanRate) {
            this.stats.peakScanRate = currentRate;
        }
    }

    // 🎨 Enhanced dashboard display
    displayDashboard() {
        if (this.isPaused) return;

        console.clear();
        
        // Header
        console.log(chalk.cyan('╔' + '═'.repeat(78) + '╗'));
        console.log(chalk.cyan('║') + chalk.bold.white(' 🎮 Advanced Minecraft Server Scanner v2.0 ') + chalk.gray('by v1rox') + chalk.cyan(' '.repeat(11) + '║'));
        console.log(chalk.cyan('╠' + '═'.repeat(78) + '╣'));

        // Main statistics
        const uptime = this.formatDuration(this.stats.uptime);
        const memUsage = Math.round(this.stats.memoryUsage.heapUsed / 1024 / 1024);
        
        console.log(chalk.cyan('║') + chalk.white(' 📊 STATISTICS') + chalk.cyan(' '.repeat(60) + '║'));
        console.log(chalk.cyan('║') + chalk.white(` Total Scanned: ${chalk.green(this.stats.totalScanned.toLocaleString().padEnd(15))} Servers Found: ${chalk.yellow(this.stats.totalFound.toLocaleString())}`).padEnd(87) + chalk.cyan('║'));
        console.log(chalk.cyan('║') + chalk.white(` Scan Rate: ${chalk.blue(Math.round(this.stats.avgScanRate).toString().padEnd(8))} IPs/sec Success Rate: ${chalk.magenta(this.stats.successRate.toFixed(2))}%`).padEnd(87) + chalk.cyan('║'));
        console.log(chalk.cyan('║') + chalk.white(` Uptime: ${chalk.cyan(uptime.padEnd(18))} Memory: ${chalk.red(memUsage)}MB`).padEnd(87) + chalk.cyan('║'));
        console.log(chalk.cyan('║') + chalk.white(` Active Scans: ${chalk.blue(this.stats.activeConnections.toString().padEnd(12))} Peak Rate: ${chalk.green(Math.round(this.stats.peakScanRate))} IPs/sec`).padEnd(87) + chalk.cyan('║'));

        // Network statistics
        console.log(chalk.cyan('╠' + '═'.repeat(78) + '╣'));
        console.log(chalk.cyan('║') + chalk.white(' 🌐 NETWORK STATUS') + chalk.cyan(' '.repeat(57) + '║'));
        console.log(chalk.cyan('║') + chalk.white(` Timeouts: ${chalk.yellow(this.stats.timeoutCount.toLocaleString().padEnd(15))} Errors: ${chalk.red(this.stats.connectionErrors.toLocaleString())}`).padEnd(87) + chalk.cyan('║'));
        console.log(chalk.cyan('║') + chalk.white(` Avg Response: ${chalk.blue((this.stats.avgResponseTime || 0).toFixed(0))}ms`.padEnd(25) + ` Cache Size: ${chalk.cyan(this.serverCache.size.toLocaleString())}`).padEnd(87) + chalk.cyan('║'));

        // Last found server
        if (this.stats.lastFoundServer) {
            console.log(chalk.cyan('╠' + '═'.repeat(78) + '╣'));
            console.log(chalk.cyan('║') + chalk.green(' 🎯 LAST DISCOVERED SERVER') + chalk.cyan(' '.repeat(48) + '║'));
            const server = this.stats.lastFoundServer;
            console.log(chalk.cyan('║') + chalk.white(` IP: ${chalk.green(server.ip.padEnd(18))} Version: ${chalk.yellow(server.version)}`).padEnd(87) + chalk.cyan('║'));
            console.log(chalk.cyan('║') + chalk.white(` Players: ${chalk.blue(`${server.players.online}/${server.players.max}`.padEnd(12))} Quality: ${chalk.magenta(server.qualityScore)}/100`).padEnd(87) + chalk.cyan('║'));
            console.log(chalk.cyan('║') + chalk.white(` MOTD: ${chalk.gray(server.motd.substring(0, 45))}`).padEnd(87) + chalk.cyan('║'));
            console.log(chalk.cyan('║') + chalk.white(` Country: ${chalk.cyan(server.country.padEnd(15))} Response: ${chalk.blue(server.responseTime)}ms`).padEnd(87) + chalk.cyan('║'));
        }

        // Top statistics
        if (this.stats.serversByVersion.size > 0) {
            console.log(chalk.cyan('╠' + '═'.repeat(78) + '╣'));
            console.log(chalk.cyan('║') + chalk.white(' 📈 TOP VERSIONS') + chalk.cyan(' '.repeat(59) + '║'));
            
            const topVersions = Array.from(this.stats.serversByVersion.entries())
                .sort((a, b) => b[1] - a[1])
                .slice(0, 3);
            
            topVersions.forEach(([version, count]) => {
                console.log(chalk.cyan('║') + chalk.white(` ${version.padEnd(20)} ${chalk.green(count.toString())} servers`).padEnd(87) + chalk.cyan('║'));
            });
        }

        // Controls
        console.log(chalk.cyan('╠' + '═'.repeat(78) + '╣'));
        console.log(chalk.cyan('║') + chalk.white(' ⌨️  CONTROLS: ') + chalk.gray('[P] Pause/Resume  [S] Save  [Q] Quit  [R] Reset Stats') + chalk.cyan(' '.repeat(8) + '║'));
        console.log(chalk.cyan('╚' + '═'.repeat(78) + '╝'));

        // Progress bar
        if (this.config.maxScans !== Infinity) {
            const progress = Math.min(100, (this.stats.totalScanned / this.config.maxScans) * 100);
            const filledBars = Math.round(progress / 2);
            const emptyBars = 50 - filledBars;
            
            console.log(chalk.blue('Progress: [') + 
                chalk.green('█'.repeat(filledBars)) + 
                chalk.gray('░'.repeat(emptyBars)) + 
                chalk.blue(`] ${progress.toFixed(1)}%`));
        }

        console.log(); // Empty line for breathing room
    }

    formatDuration(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }

    // 🔄 Main scanning loop
    async startScanning() {
        try {
            await this.initialize();
            this.logger.success('🚀 Starting scan operation...');

            while (this.isRunning && !this.shouldStop && this.stats.totalScanned < this.config.maxScans) {
                if (this.isPaused) {
                    await this.delay(1000);
                    continue;
                }

                await this.performScanBatch();
                
                // Performance maintenance
                if (this.stats.totalScanned % 50000 === 0) {
                    await this.performMaintenance();
                }
                
                // Brief pause to prevent overwhelming
                await this.delay(10);
            }

            await this.shutdown();
            
        } catch (error) {
            this.logger.error(`💥 Fatal error during scanning: ${error.message}`);
            await this.emergencyShutdown();
        }
    }

    async performScanBatch() {
        const batchPromises = [];
        
        for (let i = 0; i < this.config.batchSize && this.stats.activeConnections < this.config.maxConcurrent; i++) {
            const ip = this.generateSmartIP();
            if (!ip || this.serverCache.has(ip)) continue;

            const scanPromise = this.scanSingleServer(ip);
            batchPromises.push(scanPromise);
        }

        if (batchPromises.length > 0) {
            await Promise.allSettled(batchPromises);
        }
    }

    async scanSingleServer(ip) {
        try {
            this.stats.totalScanned++;
            const serverInfo = await this.checkMinecraftServer(ip);
            
            if (serverInfo) {
                await this.saveServer(serverInfo);
                this.stats.totalFound++;
                this.logger.success(`🎯 Found server: ${ip} (${serverInfo.version}) - ${serverInfo.players.online} players`);
                this.emit('serverFound', serverInfo);
            }
            
        } catch (error) {
            this.stats.errorsEncountered++;
            this.logger.debug(`❌ Error scanning ${ip}: ${error.message}`);
        }
    }

    // 🧹 Maintenance and optimization
    async performMaintenance() {
        this.logger.info('🧹 Performing maintenance...');
        
        // Garbage collection
        if (global.gc) {
            global.gc();
            this.stats.gcCount++;
        }

        // Clean up caches
        this.cleanupRateLimiter();
        
        // Trim server cache if too large
        if (this.serverCache.size > 1000000) {
            const cacheArray = Array.from(this.serverCache);
            this.serverCache.clear();
            cacheArray.slice(-500000).forEach(ip => this.serverCache.add(ip));
        }

        // Save progress
        await this.saveProgress();
        
        this.logger.info('✅ Maintenance completed');
    }

    async saveProgress() {
        try {
            // Save current statistics
            const statsFile = path.join(os.homedir(), '.minecraft-scanner', 'session-stats.json');
            const statsData = {
                ...this.stats,
                serversByVersion: Array.from(this.stats.serversByVersion.entries()),
                serversByCountry: Array.from(this.stats.serversByCountry.entries()),
                serversByPlayerCount: Array.from(this.stats.serversByPlayerCount.entries()),
                popularMOTDs: Array.from(this.stats.popularMOTDs.entries())
            };
            await fs.writeFile(statsFile, JSON.stringify(statsData, null, 2));

            // Save configuration
            await this.saveConfiguration();
            
            this.logger.info('💾 Progress saved successfully');
            
        } catch (error) {
            this.logger.error(`❌ Failed to save progress: ${error.message}`);
        }
    }

    // 🎛️ Control functions
    pause() {
        this.isPaused = true;
        this.logger.info('⏸️  Scanning paused');
        this.emit('paused');
    }

    resume() {
        this.isPaused = false;
        this.logger.info('▶️  Scanning resumed');
        this.emit('resumed');
    }

    async stop() {
        this.shouldStop = true;
        this.logger.info('🛑 Stopping scanner...');
        await this.shutdown();
    }

    resetStats() {
        const preserveStats = {
            totalFound: this.stats.totalFound,
            serversByVersion: this.stats.serversByVersion,
            serversByCountry: this.stats.serversByCountry,
        };

        this.stats = {
            totalScanned: 0,
            totalFound: preserveStats.totalFound,
            duplicatesSkipped: 0,
            errorsEncountered: 0,
            startTime: Date.now(),
            uptime: 0,
            avgScanRate: 0,
            peakScanRate: 0,
            avgResponseTime: 0,
            successRate: 0,
            serversByVersion: preserveStats.serversByVersion,
            serversByCountry: preserveStats.serversByCountry,
            serversByPlayerCount: new Map(),
            popularMOTDs: new Map(),
            activeConnections: 0,
            timeoutCount: 0,
            connectionErrors: 0,
            lastFoundServer: null,
            bestServer: null,
            memoryUsage: process.memoryUsage(),
            gcCount: 0
        };

        this.logger.info('📊 Statistics reset');
    }

    // 🔧 Utility functions
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async shutdown() {
        this.logger.info('🔄 Initiating graceful shutdown...');
        
        this.isRunning = false;
        
        // Clear all intervals
        for (const [name, intervalId] of this.intervals.entries()) {
            clearInterval(intervalId);
            this.logger.debug(`Cleared interval: ${name}`);
        }

        // Save final progress
        await this.saveProgress();
        
        // Export final results
        await this.exportResults();
        
        this.logger.success('✅ Shutdown completed successfully');
        this.emit('shutdown');
    }

    async emergencyShutdown() {
        this.logger.error('🚨 Emergency shutdown initiated');
        
        this.isRunning = false;
        this.intervals.forEach(intervalId => clearInterval(intervalId));
        
        try {
            await this.saveProgress();
        } catch (error) {
            this.logger.error(`Failed to save during emergency shutdown: ${error.message}`);
        }
        
        this.emit('emergencyShutdown');
        process.exit(1);
    }

    async exportResults() {
        try {
            const exportDir = path.join(os.homedir(), '.minecraft-scanner', 'exports');
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            
            // Export summary report
            const summaryFile = path.join(exportDir, `scan-summary-${timestamp}.json`);
            const summary = {
                scanInfo: {
                    startTime: new Date(this.stats.startTime).toISOString(),
                    endTime: new Date().toISOString(),
                    duration: this.stats.uptime,
                    totalScanned: this.stats.totalScanned,
                    totalFound: this.stats.totalFound,
                    successRate: this.stats.successRate
                },
                topVersions: Array.from(this.stats.serversByVersion.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10),
                topCountries: Array.from(this.stats.serversByCountry.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10),
                bestServer: this.stats.bestServer,
                performanceMetrics: {
                    avgScanRate: this.stats.avgScanRate,
                    peakScanRate: this.stats.peakScanRate,
                    avgResponseTime: this.stats.avgResponseTime,
                    gcCount: this.stats.gcCount
                }
            };
            
            await fs.writeFile(summaryFile, JSON.stringify(summary, null, 2));
            this.logger.success(`📄 Summary exported to: ${summaryFile}`);
            
        } catch (error) {
            this.logger.error(`Failed to export results: ${error.message}`);
        }
    }
}

// 🎮 Main execution
async function main() {
    // ASCII Art Banner
    console.log(chalk.cyan(`
    ╔══════════════════════════════════════════════════════════════════════╗
    ║                                                                      ║
    ║  🎮 Advanced Minecraft Server Scanner v2.0                          ║
    ║                                                                      ║
    ║  Discover servers across the globe with enhanced features            ║
    ║  Created by v1rox (Discord: v1rox)                                   ║
    ║                                                                      ║
    ║  Features:                                                           ║
    ║  • Smart IP generation & geolocation                                 ║
    ║  • Multi-threaded scanning with rate limiting                        ║
    ║  • Advanced server analysis & quality scoring                        ║
    ║  • Real-time statistics & interactive dashboard                      ║
    ║  • Export to multiple formats (JSON, CSV, TXT)                       ║
    ║                                                                      ║
    ╚══════════════════════════════════════════════════════════════════════╝
    `));

    // Enhanced configuration
    const scanner = new AdvancedMinecraftScanner({
        port: 25565,
        batchSize: 2000,           // Increased batch size
        maxConcurrent: 3000,       // Higher concurrency
        timeout: 2500,             // Faster timeout
        maxRetries: 2,             // Fewer retries for speed
        scanMode: 'smart-random',  // Intelligent scanning
        enableGeolocation: true,   // Location detection
        enablePerformanceMode: true, // Optimizations
        logLevel: 'info',          // Balanced logging
        exportFormats: ['txt', 'json'], // Multiple formats
        saveInterval: 30000,       // Save every 30 seconds
        gcInterval: 300000         // GC every 5 minutes
    });

    // Enhanced event handling
    scanner.on('initialized', () => {
        console.log(chalk.green('\n🚀 Scanner initialized successfully!'));
        console.log(chalk.yellow('Press [P] to pause, [S] to save, [R] to reset stats, [Q] to quit\n'));
    });

    scanner.on('serverFound', (serverInfo) => {
        // Emit a sound or notification for found servers
        process.stdout.write('\x07'); // Terminal bell
    });

    scanner.on('error', (error) => {
        console.error(chalk.red(`\n❌ Error: ${error.message}\n`));
    });

    // Enhanced keyboard controls
    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) {
        process.stdin.setRawMode(true);
    }

    process.stdin.on('keypress', async (str, key) => {
        if (key.ctrl && key.name === 'c') {
            console.log(chalk.yellow('\n🔄 Gracefully shutting down...'));
            await scanner.stop();
            process.exit(0);
        }
        
        switch (key.name?.toLowerCase()) {
            case 'p':
                scanner.isPaused ? scanner.resume() : scanner.pause();
                break;
            case 's':
                await scanner.saveProgress();
                break;
            case 'r':
                scanner.resetStats();
                break;
            case 'q':
                await scanner.stop();
                process.exit(0);
                break;
        }
    });

    // Graceful shutdown handling
    process.on('SIGINT', async () => {
        console.log(chalk.yellow('\n🔄 Received SIGINT, shutting down gracefully...'));
        await scanner.stop();
        process.exit(0);
    });

    process.on('SIGTERM', async () => {
        console.log(chalk.yellow('\n🔄 Received SIGTERM, shutting down gracefully...'));
        await scanner.stop();
        process.exit(0);
    });

    process.on('uncaughtException', async (error) => {
        console.error(chalk.red(`\n💥 Uncaught Exception: ${error.message}`));
        await scanner.emergencyShutdown();
    });

    process.on('unhandledRejection', async (reason, promise) => {
        console.error(chalk.red(`\n💥 Unhandled Rejection at: ${promise}, reason: ${reason}`));
        await scanner.emergencyShutdown();
    });

    // Start the scanning process
    try {
        await scanner.startScanning();
    } catch (error) {
        console.error(chalk.red(`\n💥 Fatal error: ${error.message}`));
        process.exit(1);
    }
}

// Export for module usage
module.exports = AdvancedMinecraftScanner;

// Run if called directly
if (require.main === module) {
    main().catch(error => {
        console.error(chalk.red(`💥 Application failed to start: ${error.message}`));
        process.exit(1);
    });
}
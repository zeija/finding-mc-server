/**
 * Enhanced Minecraft Server Scanner
 * A powerful tool to discover and analyze Minecraft servers
 * 
 * Features:
 * - Multiple scanning modes (random, range, list)
 * - Server analysis and statistics
 * - Version filtering
 * - Location detection
 * - Auto-retry mechanism
 * - Performance optimizations
 * - Detailed logging
 * 
 * @author [https://github.com/zeija]
 * @version 1.1.0
 */

const net = require('net');
const fs = require('fs').promises;
const chalk = require('chalk');
const readline = require('readline');
const EventEmitter = require('events');
const os = require('os');
const path = require('path');
const dns = require('dns').promises;

class MinecraftScanner extends EventEmitter {
    constructor(options = {}) {
        super();
        this.config = {
            port: options.port || 25565,
            batchSize: options.batchSize || 1000,
            maxScans: options.maxScans || 1000000,
            timeout: options.timeout || 5000,
            outputFile: options.outputFile || 'minecraft-servers.txt',
            logInterval: options.logInterval || 1000,
            scanMode: options.scanMode || 'random',
            ipRange: options.ipRange || null,
            ipList: options.ipList || null,
            saveInterval: options.saveInterval || 60000,
            maxRetries: options.maxRetries || 3,
            countryFilter: options.countryFilter || null,
            versionFilter: options.versionFilter || null
        };

        this.stats = {
            totalScanned: 0,
            totalFound: 0,
            startTime: null,
            lastSave: Date.now(),
            successfulConnections: 0,
            failedConnections: 0,
            lastFoundServer: null,
            serversByVersion: new Map(),
            serversByCountry: new Map(),
            averageResponseTime: 0
        };

        this.serverCache = new Set();
        this.activeScans = 0;
        this.paused = false;
    }

    async initialize() {
        try {
            await this.createOutputFile();
            await this.createDataDirectory();
            this.stats.startTime = Date.now();
            await this.loadExistingServers();
            this.setupAutoSave();
            this.emit('initialized');
        } catch (error) {
            console.error('Initialization failed:', error);
            this.emit('error', error);
        }
    }

    async createOutputFile() {
        try {
            await fs.access(this.config.outputFile).catch(async () => {
                await fs.writeFile(this.config.outputFile, '', 'utf8');
            });
        } catch (error) {
            throw new Error(`Failed to create output file: ${error.message}`);
        }
    }

    async createDataDirectory() {
        const dataDir = path.join(os.homedir(), '.minecraft-scanner');
        try {
            await fs.mkdir(dataDir, { recursive: true });
            this.dataDir = dataDir;
        } catch (error) {
            throw new Error(`Failed to create data directory: ${error.message}`);
        }
    }

    async loadExistingServers() {
        try {
            const data = await fs.readFile(this.config.outputFile, 'utf8');
            const servers = data.split('\n').filter(line => line.trim());
            servers.forEach(server => {
                const [ip] = server.split('|');
                if (ip) this.serverCache.add(ip.trim());
            });
            this.emit('serversLoaded', this.serverCache.size);
        } catch (error) {
            if (error.code !== 'ENOENT') {
                throw new Error(`Failed to load existing servers: ${error.message}`);
            }
        }
    }

    setupAutoSave() {
        setInterval(() => {
            this.saveStats();
        }, this.config.saveInterval);
    }

    async saveStats() {
        const statsFile = path.join(this.dataDir, 'scanner-stats.json');
        try {
            await fs.writeFile(statsFile, JSON.stringify(this.stats, null, 2));
        } catch (error) {
            this.emit('error', 'Failed to save stats:', error);
        }
    }

    async getServerLocation(ip) {
        try {
            const [hostname] = await dns.reverse(ip);
            return hostname;
        } catch {
            return 'Unknown';
        }
    }

    async isValidVersion(version) {
        if (!this.config.versionFilter) return true;
        return this.config.versionFilter.includes(version);
    }

    generateRandomIP() {
        const ipParts = Array.from({ length: 4 }, () => Math.floor(Math.random() * 256));
        return ipParts.join('.');
    }

    generateIPsForRange() {
        if (!this.config.ipRange) return null;
        const [start, end] = this.config.ipRange.split('-');
        // IP range generation logic here
    }

    pause() {
        this.paused = true;
        this.emit('scanPaused');
    }

    resume() {
        this.paused = false;
        this.emit('scanResumed');
    }

    createHandshake(ip) {
        const hostname = Buffer.from(ip, 'utf8');
        const packet = Buffer.alloc(hostname.length + 7);
        let offset = 0;

        packet.writeUInt8(0x00, offset++);
        packet.writeUInt8(0x00, offset++);
        packet.writeUInt8(hostname.length, offset++);
        hostname.copy(packet, offset);
        offset += hostname.length;
        packet.writeUInt16BE(this.config.port, offset);
        offset += 2;
        packet.writeUInt8(0x01, offset);

        return packet;
    }

    async checkServer(ip, retryCount = 0) {
        if (retryCount >= this.config.maxRetries) return null;

        const startTime = Date.now();
        return new Promise((resolve) => {
            const socket = new net.Socket();
            let responseData = Buffer.alloc(0);

            socket.setTimeout(this.config.timeout);

            socket.connect(this.config.port, ip, () => {
                socket.write(this.createHandshake(ip));
                socket.write(Buffer.from([0x01, 0x00]));
                this.stats.successfulConnections++;
            });

            socket.on('data', (chunk) => {
                responseData = Buffer.concat([responseData, chunk]);
            });

            socket.on('timeout', () => {
                socket.destroy();
                if (retryCount < this.config.maxRetries) {
                    resolve(this.checkServer(ip, retryCount + 1));
                } else {
                    resolve(null);
                }
            });

            socket.on('error', () => {
                this.stats.failedConnections++;
                socket.destroy();
                resolve(null);
            });

            socket.on('end', () => {
                const responseTime = Date.now() - startTime;
                this.updateAverageResponseTime(responseTime);
                
                try {
                    const serverInfo = this.parseServerResponse(responseData);
                    if (serverInfo) {
                        this.updateVersionStats(serverInfo.version?.name);
                    }
                    resolve(serverInfo);
                } catch {
                    resolve(null);
                }
            });
        });
    }

    parseServerResponse(data) {
        if (!data || data.length < 2) return null;

        try {
            const responseString = data.toString('utf8');
            const jsonMatch = responseString.match(/{.*}/);
            if (!jsonMatch) return null;

            return JSON.parse(jsonMatch[0]);
        } catch {
            return null;
        }
    }

    updateAverageResponseTime(newTime) {
        const alpha = 0.1;
        this.stats.averageResponseTime = (1 - alpha) * this.stats.averageResponseTime + alpha * newTime;
    }

    updateVersionStats(version) {
        if (!version) return;
        const count = this.stats.serversByVersion.get(version) || 0;
        this.stats.serversByVersion.set(version, count + 1);
    }

    async scanBatch() {
        if (this.paused) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            return;
        }

        const promises = Array.from({ length: this.config.batchSize }, async () => {
            let ip;
            switch (this.config.scanMode) {
                case 'range':
                    ip = this.generateIPsForRange();
                    break;
                case 'list':
                    ip = this.config.ipList.shift();
                    break;
                default:
                    ip = this.generateRandomIP();
            }

            if (!ip || this.serverCache.has(ip)) return;

            try {
                this.activeScans++;
                const serverInfo = await this.checkServer(ip);
                if (serverInfo) {
                    const location = await this.getServerLocation(ip);
                    const formattedInfo = this.formatServerInfo(ip, serverInfo, location);
                    
                    if (await this.isValidVersion(formattedInfo.version)) {
                        await this.saveServer(formattedInfo);
                        this.stats.totalFound++;
                        this.stats.lastFoundServer = formattedInfo;
                        this.emit('serverFound', formattedInfo);
                    }
                }
            } catch (error) {
                this.emit('scanError', ip, error);
            } finally {
                this.activeScans--;
                this.stats.totalScanned++;
            }
        });

        await Promise.all(promises);
        this.updateStats();
    }

    formatServerInfo(ip, serverInfo, location) {
        return {
            ip,
            version: serverInfo.version?.name || 'Unknown',
            players: serverInfo.players?.online || 0,
            maxPlayers: serverInfo.players?.max || 0,
            description: serverInfo.description?.text || 'No description',
            location,
            timestamp: new Date().toISOString(),
            raw: JSON.stringify(serverInfo)
        };
    }

    async saveServer(serverInfo) {
        const formattedInfo = `${serverInfo.ip}|${serverInfo.version}|${serverInfo.players}/${serverInfo.maxPlayers}|${serverInfo.timestamp}\n`;
        await fs.appendFile(this.config.outputFile, formattedInfo, 'utf8');
        this.serverCache.add(serverInfo.ip);
    }

    updateStats() {
        // DÜZELTME: this.startTime yerine this.stats.startTime kullanılıyor
        const elapsed = Math.max(1, (Date.now() - this.stats.startTime) / 1000);
        const scansPerSecond = this.stats.totalScanned / elapsed;
        const successRate = this.stats.totalScanned > 0 
            ? (this.stats.totalFound / this.stats.totalScanned * 100) 
            : 0;

        console.clear();
        console.log(chalk.blue('='.repeat(50)));
        console.log(chalk.yellow('Minecraft Server Scanner Status - Discord:v1rox'));
        console.log(chalk.blue('='.repeat(50)));
        console.log(chalk.white(`Total Scanned: ${chalk.cyan(this.stats.totalScanned.toLocaleString())}`));
        console.log(chalk.white(`Servers Found: ${chalk.green(this.stats.totalFound.toLocaleString())}`));
        console.log(chalk.white(`Scan Rate: ${chalk.cyan(Math.round(scansPerSecond))} IPs/sec`));
        console.log(chalk.white(`Success Rate: ${chalk.yellow(successRate.toFixed(2))}%`));
        console.log(chalk.white(`Elapsed Time: ${chalk.magenta(Math.round(elapsed))} seconds`));
        console.log(chalk.white(`Active Scans: ${chalk.cyan(this.activeScans)}`));
        console.log(chalk.white(`Avg Response Time: ${chalk.cyan(Math.round(this.stats.averageResponseTime))}ms`));
        
        if (this.stats.lastFoundServer) {
            console.log(chalk.green('\nLast Found Server:'));
            console.log(chalk.white(`IP: ${this.stats.lastFoundServer.ip}`));
            console.log(chalk.white(`Version: ${this.stats.lastFoundServer.version}`));
            console.log(chalk.white(`Players: ${this.stats.lastFoundServer.players}/${this.stats.lastFoundServer.maxPlayers}`));
            console.log(chalk.white(`Location: ${this.stats.lastFoundServer.location}`));
        }

        console.log(chalk.blue('='.repeat(50)));
    }

    async start() {
        try {
            await this.initialize();
            this.emit('scanStart');
            
            while (this.stats.totalScanned < this.config.maxScans) {
                try {
                    await this.scanBatch();
                    
                    if (this.stats.totalScanned % 100000 === 0) {
                        await this.saveStats();
                        global.gc && global.gc();
                        await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                } catch (error) {
                    this.emit('error', error);
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }
            }

            await this.saveStats();
            this.emit('scanComplete');
        } catch (error) {
            console.error('Fatal error:', error);
            this.emit('error', error);
        }
    }
}

// Keypress handling
readline.emitKeypressEvents(process.stdin);
if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
}

// Initialize scanner
const scanner = new MinecraftScanner({
    port: 25565,
    batchSize: 1000,
    maxScans: 1000000,
    timeout: 5000,
    outputFile: 'minecraft-servers.txt',
    logInterval: 1000,
    scanMode: 'random',
    maxRetries: 3,
    saveInterval: 60000
});

// Event listeners
scanner.on('initialized', () => {
    console.log(chalk.green('Scanner initialized successfully'));
});

scanner.on('serverFound', (serverInfo) => {
    console.log(chalk.green(`Server found: ${serverInfo.ip} (${serverInfo.version})`));
});

scanner.on('error', (error) => {
    console.error(chalk.red(`Error: ${error.message}`));
});

scanner.on('scanComplete', () => {
    console.log(chalk.yellow('Scan completed!'));
});

scanner.on('scanPaused', () => {
    console.log(chalk.yellow('Scan paused'));
});

scanner.on('scanResumed', () => {
    console.log(chalk.green('Scan resumed'));
});

// Keyboard controls
process.stdin.on('keypress', (str, key) => {
    if (key.ctrl && key.name === 'c') {
        console.log(chalk.yellow('\nGracefully shutting down...'));
        process.exit(0);
    } else if (key.name === 'p') {
        if (scanner.paused) {
            scanner.resume();
        } else {
            scanner.pause();
        }
    }
});

// Start scanning
scanner.start().catch(error => {
    console.error(chalk.red('Fatal error:', error.message));
    process.exit(1);
});

module.exports = MinecraftScanner;

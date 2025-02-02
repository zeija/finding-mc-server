const net = require('net'); 
const fs = require('fs'); 
const chalk = require('chalk'); 
const readline = require('readline'); 

const minecraftPort = 25565;


const outputFile = 'working-server.txt';


function generateRandomIP() {
    const octet1 = Math.floor(Math.random() * 256);
    const octet2 = Math.floor(Math.random() * 256);
    const octet3 = Math.floor(Math.random() * 256);
    const octet4 = Math.floor(Math.random() * 256);
    return `${octet1}.${octet2}.${octet3}.${octet4}`;
}


function checkMinecraftServer(ip, port = minecraftPort) {
    return new Promise((resolve) => {
        const socket = net.createConnection({ host: ip, port }, () => {
            
            const handshake = createHandshake(ip, port);
            socket.write(handshake);

            
            const statusRequest = Buffer.from([0x01, 0x00]);
            socket.write(statusRequest);

            
            socket.once('data', (data) => {
                socket.destroy(); 

                try {
                    
                    const response = parseServerResponse(data);
                    resolve(response); 
                } catch (error) {
                    resolve(null); 
                }
            });
        });

        socket.on('error', () => {
            resolve(null); 
        });

        socket.setTimeout(10000, () => {  
            socket.destroy(); 
            resolve(null); 
        });
    });
}


function createHandshake(ip, port) {
    const hostname = Buffer.from(ip, 'utf8'); 
    const hostnameLength = Buffer.from([hostname.length]);
    const protocolVersion = Buffer.from([0x00]); 
    const portBuffer = Buffer.from([port >> 8, port & 0xff]); 
    const nextState = Buffer.from([0x01]); 

    
    return Buffer.concat([
        Buffer.from([0x00]), 
        protocolVersion,
        hostnameLength,
        hostname,
        portBuffer,
        nextState,
    ]);
}


function parseServerResponse(data) {
    const responseString = data.toString('utf8'); 
    const jsonStartIndex = responseString.indexOf('{'); 
    const jsonEndIndex = responseString.lastIndexOf('}'); 

    if (jsonStartIndex === -1 || jsonEndIndex === -1) {
        throw new Error('Invalid server response');
    }

    const jsonString = responseString.substring(jsonStartIndex, jsonEndIndex + 1); 
    const response = JSON.parse(jsonString); 

    return {
        version: response.version?.name || 'unknown', 
        players: response.players?.online || 0, 
        maxPlayers: response.players?.max || 0, 
    };
}


function updateLog(totalScanned, totalFound) {
    readline.cursorTo(process.stdout, 0); 
    process.stdout.write(`İp Scanned: ${totalScanned} | Server Found: ${chalk.green(totalFound)}`);
}


const foundServers = [];
function saveServersToFile() {
    if (foundServers.length > 0) {
        fs.appendFileSync(outputFile, foundServers.join('\n') + '\n', 'utf8');
        foundServers.length = 0; 
    }
}


async function verifyServer(ip, port = minecraftPort) {
    try {
        const serverInfo = await checkMinecraftServer(ip, port);
        if (serverInfo) {
            
            const isWhitelisted = serverInfo.players === 0 && serverInfo.maxPlayers > 0; 
            const whitelistStatus = isWhitelisted ? 'Whitelist: On' : 'Whitelist: Off';

			console.log(chalk.green(`Doğrulandı: ${ip}:${port} | Versiyon: ${serverInfo.version} | Oyuncular: ${serverInfo.players}/${serverInfo.maxPlayers} | ${whitelistStatus}`));
            foundServers.push(`IP: ${ip}:${port} | Version: ${serverInfo.version} | Players: ${serverInfo.players}/${serverInfo.maxPlayers} | ${whitelistStatus}`); 
            if (foundServers.length >= 100) { // 
                saveServersToFile();
            }
            return true;
        }
    } catch (error) {
        console.log(chalk.red(`Validation Error: ${ip}:${port} - ${error.message}`)); 
    }
    return false;
}


async function scanRandomIPs() {
    const batchSize = 1000; 
    let totalScanned = 0; 
    let totalFound = 0; 
    while (true) { 
        const ips = []; 
        const promises = []; 

        
        for (let i = 0; i < batchSize; i++) {
            const randomIP = generateRandomIP(); 
            ips.push(randomIP); 
            promises.push(checkMinecraftServer(randomIP)); 
        }

        try {
           
            const results = await Promise.all(promises);
            for (let i = 0; i < results.length; i++) {
                if (results[i]) {
                    const randomIP = ips[i]; 
                    const isVerified = await verifyServer(randomIP); 
                    if (isVerified) {
                        totalFound++;
                    }
                }
            }
        } catch (error) {
            console.log(chalk.red(`Scan Error: ${error.message}`));
        }

        totalScanned += batchSize;
        updateLog(totalScanned, totalFound); 

        
        if (totalScanned % 100000 === 0) {
            if (global.gc) {
                global.gc(); 
            }
            await new Promise((resolve) => setTimeout(resolve, 1000)); // 
        }
    }
}


async function startScanning() {
    while (true) {
        try {
            await scanRandomIPs();
        } catch (error) {
            console.log(chalk.red(`Script Crash: ${error.message}`));
            console.log(chalk.yellow('Script is restarting...'));
        }
    }
}


startScanning().catch((error) => {
    console.log(chalk.red(`Script Initialization Errorı: ${error.message}`));
});
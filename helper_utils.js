// SPDX-License-Identifier: AGPL-3.0-only

/**
 * @license
 * SKALE IMA JS
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

/**
 * @file helper_utils.js
 * @copyright SKALE Labs 2019-Present
 */

const fs = require( "fs" );
const path = require( "path" );
const os = require( "os" );
const w3mod = require( "web3" );

function normalizePath( strPath ) {
    strPath = strPath.replace( /^~/, os.homedir() );
    strPath = path.normalize( strPath );
    strPath = path.resolve( strPath );
    return strPath;
}

function getRandomFileName() {
    const timestamp = new Date().toISOString().replace( /[-:.]/g,"" );
    const random = ( "" + Math.random() ).substring( 2, 8 );
    const random_number = timestamp + random;
    return random_number;
}

function fileExists( strPath ) {
    try {
        if( fs.existsSync( strPath ) ) {
            const stats = fs.statSync( strPath );
            if( stats.isFile() )
                return true;
        }
    } catch ( err ) {}
    return false;
}

function fileLoad( strPath, strDefault ) {
    strDefault = strDefault || "";
    if( !fileExists( strPath ) )
        return strDefault;
    try {
        const s = fs.readFileSync( strPath );
        return s;
    } catch ( err ) {}
    return strDefault;
}

function fileSave( strPath, s ) {
    try {
        fs.writeFileSync( strPath, s );
        return true;
    } catch ( err ) {}
    return false;
}

function jsonFileLoad( strPath, joDefault ) {
    joDefault = joDefault || {};
    if( !fileExists( strPath ) )
        return joDefault;
    try {
        const s = fs.readFileSync( strPath );
        const jo = JSON.parse( s );
        return jo;
    } catch ( err ) {
    }
    return joDefault;
}

function jsonFileSave( strPath, jo ) {
    try {
        const s = JSON.stringify( jo, null, 4 );
        fs.writeFileSync( strPath, s );
        return true;
    } catch ( err ) {
    }
    return false;
}

function safeURL( arg ) {
    try {
        const sc = arg[0];
        if( sc == "\"" || sc == "'" ) {
            const cnt = arg.length;
            if( arg[cnt - 1] == sc ) {
                const ss = arg.substring( 1, cnt - 1 );
                const objURL = safeURL( ss );
                if( objURL != null && objURL != undefined )
                    objURL.strStrippedStringComma = sc;

                return objURL;
            }
            return null;
        }
        const objURL = new URL( arg );
        if( !objURL.hostname )
            return null;

        if( objURL.hostname.length == 0 )
            return null;

        objURL.strStrippedStringComma = null;
        return objURL;
    } catch ( err ) {
        return null;
    }
}

function getWeb3FromURL( strURL ) {
    let w3 = null;
    try {
        const u = safeURL( strURL );
        const strProtocol = u.protocol.trim().toLowerCase().replace( ":", "" ).replace( "/", "" );
        if( strProtocol == "ws" || strProtocol == "wss" ) {
            const w3ws = new w3mod.providers.WebsocketProvider( strURL, {
                // see: https://github.com/ChainSafe/web3.js/tree/1.x/packages/web3-providers-ws#usage
                clientConfig: {
                    // // if requests are large:
                    // maxReceivedFrameSize: 100000000,   // bytes - default: 1MiB
                    // maxReceivedMessageSize: 100000000, // bytes - default: 8MiB
                    // keep a connection alive
                    keepalive: true,
                    keepaliveInterval: 200000 // ms
                },
                reconnect: { // enable auto reconnection
                    auto: true,
                    delay: 5000, // ms
                    maxAttempts: 10000000, // 10 million times
                    onTimeout: false
                }
            } );
            w3 = new w3mod( w3ws );
        } else {
            const w3http = new w3mod.providers.HttpProvider( strURL );
            w3 = new w3mod( w3http );
        }
    } catch ( err ) {
        w3 = null;
    }
    return w3;
}

module.exports = {
    normalizePath: normalizePath,
    getRandomFileName: getRandomFileName,
    fileExists: fileExists,
    fileLoad: fileLoad,
    fileSave: fileSave,
    jsonFileLoad: jsonFileLoad,
    jsonFileSave: jsonFileSave,
    safeURL: safeURL,
    getWeb3FromURL: getWeb3FromURL
};

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
 * @file truffle-config.js
 * @copyright SKALE Labs 2019-Present
 */

// more information about configuration can be found at: truffleframework.com/docs/advanced/configuration

const hdwalletProvider = require( "@truffle/hdwallet-provider" );

// const infuraKey = "fj4jll3k.....";
// const fs = require('fs');
// const mnemonic = fs.readFileSync( ".secret" ).toString().trim();

const privateKeyMN = process.env.PRIVATE_KEY_FOR_ETHEREUM || "23ABDBD3C61B5330AF61EBE8BEF582F4E5CC08E554053A718BDCE7813B9DC1FC"; // address 0x7aa5E36AA15E93D10F4F26357C30F052DacDde5F
const urlMN = process.env.URL_W3_ETHEREUM || "http://127.0.0.1:8545";

const privateKeySC = process.env.PRIVATE_KEY_FOR_SCHAIN || "80ebc2e00b8f13c5e2622b5694ab63ee80f7c5399554d2a12feeb0212eb8c69e"; // address 0x66c5a87f4a49DD75e970055A265E8dd5C3F8f852
const urlSC_00 = process.env.URL_W3_NODE_00 || process.env.URL_W3_SCHAIN || "http://127.0.0.1:15000";
const urlSC_01 = process.env.URL_W3_NODE_01 || "http://127.0.0.1:15100";

module.exports = {
    networks: {
        // advanced: {
        //     port: 8777,             // custom port
        //     network_id: 1342,       // custom network
        //     gas: 8500000,           // gas sent with each transaction(default is ~6700000)
        //     gasPrice: 20000000000,  // 20gWei(default: 100gWei)
        //     from: <address>,        // account to send txs from (default: accounts[0])
        //     websockets: true        // enable EventEmitter interface for web3 (default: false)
        // },
        // ropsten: {
        //     provider: () => new hdwalletProvider( mnemonic, `https://ropsten.infura.io/v3/YOUR-PROJECT-ID` ),
        //     network_id: 3,          // Ropsten ID
        //     gas: 5500000,           // Ropsten has a lower block limit than mainnet
        //     confirmations: 2,       // # of confirmations to wait between deployments(default is "0")
        //     timeoutBlocks: 200,     // # of blocks before a deployment times out(minimum/default is "50")
        //     skipDryRun: true        // skip dry run before migrations?(default is "false" for public nets)
        // },
        // test: {
        //     provider: () => { return new hdwalletProvider( "0x0000000000000000000000000000000000000000000000000000000000000000", "http://127.0.0.1:8545" ); },
        //     network_id: "*"         // any network (default is "none")
        // },
        mn: {
            provider: () => { return new hdwalletProvider( privateKeyMN, urlMN ); },
            network_id: "*",
            networkCheckTimeout: 10000
        },
        sc00: {
            provider: () => { return new hdwalletProvider( privateKeySC, urlSC_00 ); },
            network_id: "*",
            networkCheckTimeout: 10000
        },
        sc01: {
            provider: () => { return new hdwalletProvider( privateKeySC, urlSC_01 ); },
            network_id: "*",
            networkCheckTimeout: 10000
        }
    },
    mocha: { // set default mocha options here, use special reporters etc.
        // timeout: 100000
    },
    compilers: { // configure compiler(s)
        solc: {
            version: "0.5.0", // fetch exact version from solc-bin (default is truffle's version)
            docker: true,     // use "0.5.1" you've installed locally with docker (default is "false")
            settings: {       // see the solidity docs for advice about optimization and evmVersion
                optimizer: {
                    enabled: false,
                    runs: 200
                },
                evmVersion: "byzantium"
            }
        }
    }
};

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
 * @file ima.js
 * @copyright SKALE Labs 2019-Present
 */

const rq = ( typeof require != "undefined" ) ? require : null;
// let w3mod = rq ? rq( "web3" ) : null;
const ethereumjs_tx = rq ? rq( "ethereumjs-tx" ) : ethereumjs.Tx;
const ethereumjs_wallet = rq ? rq( "ethereumjs-wallet" ).default : ethereumjs.Wallet;
const ethereumjs_util = rq ? rq( "ethereumjs-util" ) : ethereumjs.Util;
const ws = rq ? rq( "ws" ) : null;
const request = rq ? rq( "request" ) : null;

function toURL( s ) {
    try {
        if( s == null || s == undefined )
            return null;
        if( typeof s !== "string" )
            return null;
        s = s.trim();
        if( s.length <= 0 )
            return null;
        const sc = s[0];
        if( sc == "\"" || sc == "'" ) {
            const cnt = s.length;
            if( s[cnt - 1] == sc ) {
                const ss = s.substring( 1, cnt - 1 );
                const u = toURL( ss );
                if( u != null && u != undefined )
                    u.strStrippedStringComma = sc;
                return u;
            }
            return null;
        }
        const u = new URL( s );
        if( !u.hostname )
            return null;
        if( u.hostname.length == 0 )
            return null;
        u.strStrippedStringComma = null;
        return u;
    } catch ( err ) {
        return null;
    }
}

function validateURL( s ) {
    const u = toURL( s );
    if( u == null )
        return false;
    return true;
}

function is_http_url( strURL ) {
    try {
        if( !validateURL( strURL ) )
            return false;
        const u = new URL( strURL );
        if( u.protocol == "http:" || u.protocol == "https:" )
            return true;
    } catch ( err ) {
    }
    return false;
}

function is_ws_url( strURL ) {
    try {
        if( !validateURL( strURL ) )
            return false;
        const u = new URL( strURL );
        if( u.protocol == "ws:" || u.protocol == "wss:" )
            return true;
    } catch ( err ) {
    }
    return false;
}

async function do_connect( joCall, opts, fn ) {
    try {
        fn = fn || function() {};
        if( !validateURL( joCall.url ) )
            throw new Error( "JSON RPC CALLER cannot connect web socket to invalid URL: " + joCall.url );
        if( is_ws_url( joCall.url ) ) {
            joCall.wsConn = new ws( joCall.url );
            joCall.wsConn.on( "open", function() {
                fn( joCall, null );
            } );
            joCall.wsConn.on( "close", function() {
                joCall.wsConn = 0;
            } );
            joCall.wsConn.on( "error", function( err ) {
                console.log( "" + joCall.url + " WS error: " + err.toString() );
            } );
            joCall.wsConn.on( "fail", function( err ) {
                console.log( "" + joCall.url + " WS fail: " + err.toString() );
            } );
            joCall.wsConn.on( "message", function incoming( data ) {
                const joOut = JSON.parse( data );
                if( joOut.id in joCall.mapPendingByCallID ) {
                    const entry = joCall.mapPendingByCallID[joOut.id];
                    delete joCall.mapPendingByCallID[joOut.id];
                    clearTimeout( entry.out );
                    entry.fn( entry.joIn, joOut, null );
                }
            } );
            return;
        }
        fn( joCall, null );
    } catch ( err ) {
        joCall.wsConn = null;
        fn( joCall, err );
    }
}

async function do_connect_if_needed( joCall, opts, fn ) {
    try {
        fn = fn || function() {};
        if( !validateURL( joCall.url ) )
            throw new Error( "JSON RPC CALLER cannot connect web socket to invalid URL: " + joCall.url );
        if( is_ws_url( joCall.url ) && ( !joCall.wsConn ) ) {
            joCall.reconnect( fn );
            return;
        }
        fn( joCall, null );
    } catch ( err ) {
        fn( joCall, err );
    }
}

async function do_call( joCall, joIn, fn ) {
    joIn = enrich_top_level_json_fields( joIn );
    fn = fn || function() {};
    if( joCall.wsConn ) {
        const entry = {
            joIn: joIn,
            fn: fn,
            out: null
        };
        joCall.mapPendingByCallID[joIn.id] = entry;
        entry.out = setTimeout( function() {
            delete joCall.mapPendingByCallID[joIn.id];
        }, 20 * 1000 );
        joCall.wsConn.send( JSON.stringify( joIn ) );
    } else {
        if( !validateURL( joCall.url ) )
            throw new Error( "JSON RPC CALLER cannot do query post to invalid URL: " + joCall.url );
        const agentOptions = {
            "ca": ( joCall.joRpcOptions && joCall.joRpcOptions.ca && typeof joCall.joRpcOptions.ca == "string" ) ? joCall.joRpcOptions.ca : null,
            "cert": ( joCall.joRpcOptions && joCall.joRpcOptions.cert && typeof joCall.joRpcOptions.cert == "string" ) ? joCall.joRpcOptions.cert : null,
            "key": ( joCall.joRpcOptions && joCall.joRpcOptions.key && typeof joCall.joRpcOptions.key == "string" ) ? joCall.joRpcOptions.key : null
        };
        const strBody = JSON.stringify( joIn );
        request.post( {
            "uri": joCall.url,
            "content-type": "application/json",
            "headers": {
                "content-type": "application/json"
            },
            "body": strBody,
            "agentOptions": agentOptions
        },
        function( err, response, body ) {
            if( response && response.statusCode && response.statusCode != 200 )
                console.log( "WARNING: REST call status code is " + response.statusCode );
            if( err ) {
                console.log( "" + joCall.url + " REST error: " + err.toString() );
                fn( joIn, null, err );
                return;
            }
            const joOut = JSON.parse( body );
            fn( joIn, joOut, null );
        } );
    }
}

async function rpc_call_create( strURL, opts, fn ) {
    if( !validateURL( strURL ) )
        throw new Error( "JSON RPC CALLER cannot create a call object invalid URL: " + strURL );
    fn = fn || function() {};
    if( !( strURL && strURL.length > 0 ) )
        throw new Error( "rpc_call_create() was invoked with bad parameters: " + JSON.stringify( arguments ) );
    const joCall = {
        "url": "" + strURL,
        "joRpcOptions": opts ? opts : null,
        "mapPendingByCallID": { },
        "wsConn": null,
        "reconnect": function( fnAfter ) {
            do_connect( joCall, fnAfter );
        },
        "reconnect_if_needed": function( fnAfter ) {
            do_connect_if_needed( joCall, opts, fnAfter );
        },
        "call": async function( joIn, fnAfter ) {
            const self = this;
            self.reconnect_if_needed( function( joCall, err ) {
                if( err ) {
                    fnAfter( joIn, null, err );
                    return;
                }
                do_call( joCall, joIn, fnAfter );
            } );
        }
    };
    do_connect( joCall, opts, fn );
}

function generate_random_integer_in_range( min, max ) {
    min = Math.ceil( min );
    max = Math.floor( max );
    return parseInt( Math.floor( Math.random() * ( max - min + 1 ) ) + min );
}

function generate_random_rpc_call_id() {
    return generate_random_integer_in_range( 1, Number.MAX_SAFE_INTEGER );
}

function enrich_top_level_json_fields( jo ) {
    if( ( !( "jsonrpc" in jo ) ) || ( typeof jo.jsonrpc !== "string" ) || jo.jsonrpc.length == 0 )
        jo.jsonrpc = "2.0";
    if( ( !( "id" in jo ) ) || ( typeof jo.id !== "number" ) || jo.id <= 0 )
        jo.id = generate_random_rpc_call_id();
    return jo;
}

const sleep = ( milliseconds ) => { return new Promise( resolve => setTimeout( resolve, milliseconds ) ); };

const g_nSleepBeforeFetchOutgoingMessageEvent = 5000;
const g_nSleepBetweenTransactionsOnSChainMilliseconds = 5000;
const g_bWaitForNextBlockOnSChain = true;
class ima_TransactionCustomizer {
    constructor( gasPriceMultiplier, gasMultiplier ) {
        this.gasPriceMultiplier = gasPriceMultiplier ? ( 0.0 + gasPriceMultiplier ) : null; // null means use current gasPrice or recommendedGasPrice
        this.gasMultiplier = gasMultiplier ? ( 0.0 + gasMultiplier ) : 1.25;
    }
    async computeGasPrice( w3, maxGasPrice ) {
        const gasPrice = parseInt( await w3.eth.getGasPrice() );
        if( gasPrice == 0 || gasPrice == null || gasPrice == undefined || gasPrice <= 1000000000 )
            return 1000000000;
        else if(
            this.gasPriceMultiplier != null &&
            this.gasPriceMultiplier != undefined &&
            this.gasPriceMultiplier >= 0 &&
            maxGasPrice != null &&
            maxGasPrice != undefined
        ) {
            if( gasPrice * this.gasPriceMultiplier > maxGasPrice )
                return parseInt( maxGasPrice );
            else
                return gasPrice * this.gasPriceMultiplier;
        } else
            return gasPrice;
    }
    async computeGas( methodWithArguments, w3, recommendedGas, gasPrice, addressFrom ) {
        let estimatedGas = 0;
        try {
            await methodWithArguments.estimateGas( {
                from: addressFrom,
                gasPrice: gasPrice
            }, function( err, estimatedGasValue ) {
                if( err ) {
                    estimatedGas = 0;
                    return;
                }
                estimatedGas = estimatedGasValue;
            } );
        } catch ( err ) {
            estimatedGas = 0;
        }
        estimatedGas *= this.gasMultiplier;
        estimatedGas = parseInt( "" + estimatedGas ); // avoid using floating point
        if( estimatedGas == 0 )
            estimatedGas = recommendedGas;
        return estimatedGas;
    }
};

const g_transactionCustomizerMN = new ima_TransactionCustomizer( 1.25, 1.25 );
const g_transactionCustomizerSC = new ima_TransactionCustomizer( null, 1.25 );

class ima_chain {
    constructor( w3, joABI, chainName, chainID ) {
        this.w3 = w3;
        this.joABI = joABI;
        this.chainName = chainName;
        this.chainID = chainID;
        this.mapTokenAliases = {};
        if( this.isMainNet() ) {
            this.jo_deposit_box_eth = new this.w3.eth.Contract( this.joABI.deposit_box_eth_abi, this.joABI.deposit_box_eth_address ); // only main net
            this.jo_deposit_box_erc20 = new this.w3.eth.Contract( this.joABI.deposit_box_erc20_abi, this.joABI.deposit_box_erc20_address ); // only main net
            this.jo_deposit_box_erc721 = new this.w3.eth.Contract( this.joABI.deposit_box_erc721_abi, this.joABI.deposit_box_erc721_address ); // only main net
            this.jo_message_proxy_main_net = new this.w3.eth.Contract( this.joABI.message_proxy_mainnet_abi, this.joABI.message_proxy_mainnet_address );
            this.jo_community_pool = new this.w3.eth.Contract( this.joABI.community_pool_abi, this.joABI.community_pool_address ); // only main net
        } else {
            this.jo_message_proxy_s_chain = new this.w3.eth.Contract( this.joABI.message_proxy_chain_abi, this.joABI.message_proxy_chain_address );
            this.jo_token_manager_eth = new this.w3.eth.Contract( this.joABI.token_manager_eth_abi, this.joABI.token_manager_eth_address );
            this.jo_token_manager_erc20 = new this.w3.eth.Contract( this.joABI.token_manager_erc20_abi, this.joABI.token_manager_erc20_address );
            this.jo_token_manager_erc721 = new this.w3.eth.Contract( this.joABI.token_manager_erc721_abi, this.joABI.token_manager_erc721_address );
            // this.eth_erc721 = new this.w3.eth.Contract( this.joABI.eth_erc721_abi, this.joABI.eth_erc721_address ); // only s-chain
            this.eth_erc20 = new this.w3.eth.Contract( this.joABI.eth_erc20_abi, this.joABI.eth_erc20_address ); // only s-chain
            this.jo_community_locker = new this.w3.eth.Contract( this.joABI.community_locker_abi, this.joABI.community_locker_address ); // only s-chain
        }
    }
    isMainNet() {
        if( this.chainName === "Mainnet" )
            return true;
        return false;
    }
    extractTokenInfo( tokenInfoOrAddress ) {
        if( typeof tokenInfoOrAddress == "object" ) {
            if( "abi" in tokenInfoOrAddress && typeof tokenInfoOrAddress.abi == "object" &&
                "address" in tokenInfoOrAddress && typeof tokenInfoOrAddress.address == "string" &&
                tokenInfoOrAddress.address.length > 0
            )
                return tokenInfoOrAddress;
            throw new Error( "Bad source tokenInfo object to extract valid tokenInfo object" );
        }
        if( typeof tokenInfoOrAddress == "string" ) {
            const joTokenInfo = this.resolveTokenAlias( tokenInfoOrAddress );
            if( joTokenInfo == null )
                throw new Error( "Bad or unregistered source token alias" );
            return joTokenInfo;
        }
        throw new Error( "Bad source tokenInfoOrAddress object of incorrect type" );
    }
    resolveTokenAlias( strAlias ) {
        if( strAlias in this.mapTokenAliases )
            return this.mapTokenAliases[strAlias];
        return null;
    }
    defineTokenAlias( joABI, tokenAddress, strAlias ) {
        const joTokenInfo = { abi: joABI, address: tokenAddress };
        this.mapTokenAliases[strAlias] = joTokenInfo;
        return joTokenInfo;
    }
    undefineTokenAlias( strAlias ) {
        if( strAlias in this.mapTokenAliases ) {
            delete this.mapTokenAliases[strAlias];
            return true;
        }
        return false;
    }
    isTokenAlias( strAlias ) {
        if( strAlias in this.mapTokenAliases )
            return true;
        return false;
    }
    getTokenAliases() {
        return Object.keys( this.mapTokenAliases );
    }
};

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

function ensure_starts_with_0x( s, isAutoCheckLength ) {
    if( s == null || s == undefined || typeof s !== "string" )
        return s;
    if( s.length < 2 )
        return "0x" + s;
    if( s[0] == "0" && s[1] == "x" )
        return s;
    if( isAutoCheckLength && ( s.length % 2 ) != 0 )
        s = "0" + s;
    return "0x" + s;
}

function remove_starting_0x( s ) {
    if( s == null || s == undefined || typeof s !== "string" )
        return s;
    if( s.length < 2 )
        return s;
    if( s[0] == "0" && s[1] == "x" )
        return s.substr( 2 );
    return s;
}

function private_key_2_public_key( w3, keyPrivate ) {
    // w3 = w3 || w3mod;
    if( keyPrivate == null || keyPrivate == undefined )
        return "";
    // get a wallet instance from a private key
    const privateKeyBuffer = ethereumjs_util.toBuffer( ensure_starts_with_0x( keyPrivate ) );
    const wallet = ethereumjs_wallet.fromPrivateKey( privateKeyBuffer );
    // get a public key
    const keyPublic = wallet.getPublicKeyString();
    return remove_starting_0x( keyPublic );
}

function public_key_2_account_address( w3, keyPublic ) {
    // w3 = w3 || w3mod;
    if( keyPublic == null || keyPublic == undefined )
        return "";
    const hash = w3.utils.sha3( ensure_starts_with_0x( keyPublic ) );
    const strAddress = ensure_starts_with_0x( hash.substr( hash.length - 40 ) );
    return strAddress;
}

function private_key_2_account_address( w3, keyPrivate ) {
    const keyPublic = private_key_2_public_key( w3, keyPrivate );
    const strAddress = public_key_2_account_address( w3, keyPublic );
    return strAddress;
}

function fn_address_impl_( w3 ) {
    if( this.address_ == undefined || this.address_ == null )
        this.address_ = "" + private_key_2_account_address( w3, this.privateKey );
    return this.address_;
}

function get_account_wallet_address( w3, joAccount ) {
    if( ! ( "address" in joAccount ) )
        joAccount.address = fn_address_impl_;
    return joAccount.address( w3 );
}

function w3provider_2_url( provider ) {
    if( ! provider )
        return null;
    if( "host" in provider ) {
        const u = provider.host.toString();
        if( u && safeURL( u ) )
            return u;
    }
    if( "url" in provider ) {
        const u = provider.url.toString();
        if( u && safeURL( u ) )
            return u;
    }
    return null;
}

function w3_2_url( w3 ) {
    if( ! w3 )
        return null;
    if( !( "currentProvider" in w3 ) )
        return null;
    return w3provider_2_url( w3.currentProvider );
}

function parseIntSafer( s ) {
    if( typeof s != "string" )
        return parseInt( s );
    s = s.trim();
    if( s.length > 2 && s[0] == "0" && ( s[1] == "x" || s[1] == "X" ) )
        return parseInt( s, 10 );
    return parseInt( s, 16 );
}

async function wait_for_next_block_to_appear( w3 ) {
    const nBlockNumber = await get_web3_blockNumber( 10, w3 );
    // console.log( "Waiting for next block to appear..." );
    // console.log( "    ...have block " + parseIntSafer( nBlockNumber ) );
    for( ; true; ) {
        await sleep( 1000 );
        const nBlockNumber2 = await get_web3_blockNumber( 10, w3 );
        // console.log( "    ...have block " + parseIntSafer( nBlockNumber2 ) );
        if( nBlockNumber2 > nBlockNumber )
            break;
    }
}

async function get_web3_blockNumber( attempts, w3 ) {
    const allAttempts = parseInt( attempts ) < 1 ? 1 : parseInt( attempts );
    let nLatestBlockNumber = "";
    try {
        nLatestBlockNumber = await w3.eth.getBlockNumber();
    } catch ( e ) {}
    let attemptIndex = 2;
    while( nLatestBlockNumber === "" && attemptIndex <= allAttempts ) {
        // console.log( "Repeat getBlockNumber, attempt" + attemptIndex + ", previous result is: " + nLatestBlockNumber );
        await sleep( 10000 );
        try {
            nLatestBlockNumber = await w3.eth.getBlockNumber();
        } catch ( e ) {}
        attemptIndex++;
    }
    if( attemptIndex + 1 > allAttempts && nLatestBlockNumber === "" )
        throw new Error( "Could not not get blockNumber" );
    return nLatestBlockNumber;
}

async function get_web3_pastEvents( attempts, joContract, strEventName, nBlockFrom, nBlockTo, joFilter ) {
    const allAttempts = parseInt( attempts ) < 1 ? 1 : parseInt( attempts );

    let joAllEventsInBlock = "";
    try {
        joAllEventsInBlock = await joContract.getPastEvents( "" + strEventName, {
            filter: joFilter,
            fromBlock: nBlockFrom,
            toBlock: nBlockTo
        } );
    } catch ( e ) {}
    let attemptIndex = 2;
    while( joAllEventsInBlock === "" && attemptIndex <= allAttempts ) {
        // console.log( "Repeat getPastEvents/" + strEventName + ", attempt " + attemptIndex + ", previous result is: "  + joAllEventsInBlock );
        await sleep( 1000 );
        try {
            joAllEventsInBlock = await joContract.getPastEvents( "" + strEventName, {
                filter: joFilter,
                fromBlock: nBlockFrom,
                toBlock: nBlockTo
            } );
        } catch ( e ) {}
        attemptIndex++;
    }
    if( attemptIndex + 1 === allAttempts && joAllEventsInBlock === "" )
        throw new Error( "Could not not get Event" + strEventName );
    return joAllEventsInBlock;
}

async function get_web3_transactionCount( attempts, w3, address, param ) {
    const allAttempts = parseInt( attempts ) < 1 ? 1 : parseInt( attempts );
    let txc = "";
    try {
        txc = await w3.eth.getTransactionCount( address, param );
    } catch ( e ) {}
    let attemptIndex = 2;
    while( txc === "" && attemptIndex <= allAttempts ) {
        // console.log( "Repeat getTransactionCount, attempt " + attemptIndex + ", previous result is: " + txc );
        await sleep( 10000 );
        try {
            txc = await w3.eth.getBlockNumber();
        } catch ( e ) {}
        attemptIndex++;
    }
    if( attemptIndex + 1 > allAttempts && txc === "" )
        throw new Error( "Could not not get Transaction Count" );
    return txc;
}

async function get_web3_transactionReceipt( attempts, w3, txHash ) {
    const allAttempts = parseInt( attempts ) < 1 ? 1 : parseInt( attempts );
    let txReceipt = "";
    try {
        txReceipt = await w3.eth.getTransactionReceipt( txHash );
    } catch ( e ) {}
    let attemptIndex = 2;
    while( txReceipt === "" && attemptIndex <= allAttempts ) {
        // console.log( "Repeat getTransactionReceipt, attempt " + attemptIndex + ", previous result is: " + JSON.stringify( txReceipt ) );
        await sleep( 10000 );
        try {
            txReceipt = await w3.eth.getTransactionReceipt( txHash );
        } catch ( e ) {}
        attemptIndex++;
    }
    if( attemptIndex + 1 > allAttempts && txReceipt === "" )
        throw new Error( "Could not not get Transaction Count" );
    return txReceipt;
}

async function ima_disableAutomaticDeployERC20( sc, joAccountSrc, strSChainName ) {
    const contractTokenManagerErc20SC = new sc.w3.eth.Contract( sc.joABI.token_manager_erc20_abi, sc.joABI.token_manager_erc20_address );
    const methodWithArguments = contractTokenManagerErc20SC.methods.disableAutomaticDeploy(
        strSChainName // call params
    );
    const dataTx = methodWithArguments.encodeABI(); // the encoded ABI of the method
    const gasPrice = 10000000000;
    const strAddressFrom = get_account_wallet_address( sc.w3, joAccountSrc );
    const tcnt = await get_web3_transactionCount( 10, sc.w3, strAddressFrom, null ); // await sc.w3.eth.getTransactionCount( strAddressFrom, null );
    const rawTx = {
        chainId: sc.chainID,
        nonce: tcnt,
        gasPrice: gasPrice,
        gasLimit: 3000000,
        to: contractTokenManagerErc20SC.options.address,
        data: dataTx
    };
    const tx = compose_tx_instance( rawTx );
    const joSR = await safe_sign_transaction_with_account( sc.w3, tx, rawTx, joAccountSrc );
    let joReceipt = null;
    if( joSR.joACI.isAutoSend )
        joReceipt = await get_web3_transactionReceipt( 10, sc.w3, joSR.txHashSent ); // await sc.w3.eth.getTransactionReceipt( joSR.txHashSent );
    else {
        const serializedTx = tx.serialize();
        joReceipt = await safe_send_signed_transaction( sc.w3, serializedTx );
    }
    return joReceipt;
}

async function ima_disableAutomaticDeployERC721( sc, joAccountSrc, strSChainName ) {
    const contractTokenManagerErc721SC = new sc.w3.eth.Contract( sc.joABI.token_manager_erc721_abi, sc.joABI.token_manager_erc721_address );
    const methodWithArguments = contractTokenManagerErc721SC.methods.disableAutomaticDeploy(
        strSChainName // call params
    );
    const dataTx = methodWithArguments.encodeABI(); // the encoded ABI of the method
    const gasPrice = 10000000000;
    const strAddressFrom = get_account_wallet_address( sc.w3, joAccountSrc );
    const tcnt = await get_web3_transactionCount( 10, sc.w3, strAddressFrom, null ); // await sc.w3.eth.getTransactionCount( strAddressFrom, null );
    const rawTx = {
        chainId: sc.chainID,
        nonce: tcnt,
        gasPrice: gasPrice,
        gasLimit: 3000000,
        to: contractTokenManagerErc721SC.options.address,
        data: dataTx
    };
    const tx = compose_tx_instance( rawTx );
    const joSR = await safe_sign_transaction_with_account( sc.w3, tx, rawTx, joAccountSrc );
    let joReceipt = null;
    if( joSR.joACI.isAutoSend )
        joReceipt = await get_web3_transactionReceipt( 10, sc.w3, joSR.txHashSent ); // joReceipt = await sc.w3.eth.getTransactionReceipt( joSR.txHashSent );
    else {
        const serializedTx = tx.serialize();
        joReceipt = await safe_send_signed_transaction( sc.w3, serializedTx );
    }
    return joReceipt;
}

async function ima_addERC20TokenByOwnerMN( mn, joAccountSrc, strSChainName, strContractAddressOnMainnet ) {
    const contract = mn.jo_deposit_box_erc20;
    const methodWithArguments = contract.methods.addERC20TokenByOwner(
        strSChainName, strContractAddressOnMainnet // call params
    );
    const dataTx = methodWithArguments.encodeABI(); // the encoded ABI of the method
    const gasPrice = 10000000000;
    const strAddressFrom = get_account_wallet_address( mn.w3, joAccountSrc );
    const tcnt = await get_web3_transactionCount( 10, mn.w3, strAddressFrom, null ); // await mn.w3.eth.getTransactionCount( strAddressFrom, null );
    const rawTx = {
        chainId: mn.chainID,
        nonce: tcnt,
        gasPrice: gasPrice,
        gasLimit: 3000000,
        to: contract.options.address,
        data: dataTx
    };
    const tx = compose_tx_instance( rawTx );
    const joSR = await safe_sign_transaction_with_account( mn.w3, tx, rawTx, joAccountSrc );
    let joReceipt = null;
    if( joSR.joACI.isAutoSend )
        joReceipt = await get_web3_transactionReceipt( 10, mn.w3, joSR.txHashSent ); // joReceipt = await mn.w3.eth.getTransactionReceipt( joSR.txHashSent );
    else {
        const serializedTx = tx.serialize();
        joReceipt = await safe_send_signed_transaction( mn.w3, serializedTx );
    }
    return joReceipt;
}

async function ima_addERC721TokenByOwnerMN( mn, joAccountSrc, strSChainName, strContractAddressOnMainnet ) {
    const contract = mn.jo_deposit_box_erc721;
    const methodWithArguments = contract.methods.addERC721TokenByOwner(
        strSChainName, strContractAddressOnMainnet // call params
    );
    const dataTx = methodWithArguments.encodeABI(); // the encoded ABI of the method
    const gasPrice = 10000000000;
    const strAddressFrom = get_account_wallet_address( mn.w3, joAccountSrc );
    const tcnt = await get_web3_transactionCount( 10, mn.w3, strAddressFrom, null ); // await mn.w3.eth.getTransactionCount( strAddressFrom, null );
    const rawTx = {
        chainId: mn.chainID,
        nonce: tcnt,
        gasPrice: gasPrice,
        gasLimit: 3000000,
        to: contract.options.address,
        data: dataTx
    };
    const tx = compose_tx_instance( rawTx );
    const joSR = await safe_sign_transaction_with_account( mn.w3, tx, rawTx, joAccountSrc );
    let joReceipt = null;
    if( joSR.joACI.isAutoSend )
        joReceipt = await get_web3_transactionReceipt( 10, mn.w3, joSR.txHashSent ); // joReceipt = await mn.w3.eth.getTransactionReceipt( joSR.txHashSent );
    else {
        const serializedTx = tx.serialize();
        joReceipt = await safe_send_signed_transaction( mn.w3, serializedTx );
    }
    return joReceipt;
}

async function ima_addERC20TokenByOwnerSC( sc, joAccountSrc, strSChainName, strContractAddressOnMainnet, strContractAddressOnSchain ) {
    const contractTokenManagerErc20SC = new sc.w3.eth.Contract( sc.joABI.token_manager_erc20_abi, sc.joABI.token_manager_erc20_address );
    const methodWithArguments = contractTokenManagerErc20SC.methods.addERC20TokenByOwner(
        //strSChainName,
        strContractAddressOnMainnet, strContractAddressOnSchain // call params
    );
    const dataTx = methodWithArguments.encodeABI(); // the encoded ABI of the method
    const gasPrice = 10000000000;
    const strAddressFrom = get_account_wallet_address( sc.w3, joAccountSrc );
    const tcnt = await get_web3_transactionCount( 10, sc.w3, strAddressFrom, null ); // await sc.w3.eth.getTransactionCount( strAddressFrom, null );
    const rawTx = {
        chainId: sc.chainID,
        nonce: tcnt,
        gasPrice: gasPrice,
        gasLimit: 3000000,
        to: contractTokenManagerErc20SC.options.address,
        data: dataTx
    };
    const tx = compose_tx_instance( rawTx );
    const joSR = await safe_sign_transaction_with_account( sc.w3, tx, rawTx, joAccountSrc );
    let joReceipt = null;
    if( joSR.joACI.isAutoSend )
        joReceipt = await get_web3_transactionReceipt( 10, sc.w3, joSR.txHashSent ); // joReceipt = await sc.w3.eth.getTransactionReceipt( joSR.txHashSent );
    else {
        const serializedTx = tx.serialize();
        joReceipt = await safe_send_signed_transaction( sc.w3, serializedTx );
    }
    return joReceipt;
}

async function ima_addERC721TokenByOwnerSC( sc, joAccountSrc, strSChainName, strContractAddressOnMainnet, strContractAddressOnSchain ) {
    const contractTokenManagerErc721SC = new sc.w3.eth.Contract( sc.joABI.token_manager_erc721_abi, sc.joABI.token_manager_erc721_address );
    const methodWithArguments = contractTokenManagerErc721SC.methods.addERC721TokenByOwner(
        //strSChainName,
        strContractAddressOnMainnet, strContractAddressOnSchain // call params
    );
    const dataTx = methodWithArguments.encodeABI(); // the encoded ABI of the method
    const gasPrice = 10000000000;
    const strAddressFrom = get_account_wallet_address( sc.w3, joAccountSrc );
    const tcnt = await get_web3_transactionCount( 10, sc.w3, strAddressFrom, null ); // await sc.w3.eth.getTransactionCount( strAddressFrom, null );
    const rawTx = {
        chainId: sc.chainID,
        nonce: tcnt,
        gasPrice: gasPrice,
        gasLimit: 3000000,
        to: contractTokenManagerErc721SC.options.address,
        data: dataTx
    };
    const tx = compose_tx_instance( rawTx );
    const joSR = await safe_sign_transaction_with_account( sc.w3, tx, rawTx, joAccountSrc );
    let joReceipt = null;
    if( joSR.joACI.isAutoSend )
        joReceipt = await get_web3_transactionReceipt( 10, sc.w3, joSR.txHashSent ); // joReceipt = await sc.w3.eth.getTransactionReceipt( joSR.txHashSent );
    else {
        const serializedTx = tx.serialize();
        joReceipt = await safe_send_signed_transaction( sc.w3, serializedTx );
    }
    return joReceipt;
}

async function ima_getETHbalance( chain, walletAddress ) {
    if( chain.isMainNet() ) {
        const balance = await chain.w3.eth.getBalance( walletAddress );
        return balance;
    }
    const contract = chain.eth_erc20;
    const balance = await contract.methods.balanceOf( walletAddress ).call( { from: walletAddress } );
    return balance;
}

async function ima_getERC20balance( chain, walletAddress, tokenInfoOrAddress ) {
    const tokenInfo = chain.extractTokenInfo( tokenInfoOrAddress );
    const contract = new chain.w3.eth.Contract( tokenInfo.abi, tokenInfo.address );
    const balance = await contract.methods.balanceOf( walletAddress ).call( { from: walletAddress } );
    return balance;
}

async function ima_getERC721ownerOf( chain, walletAddress, tokenInfoOrAddress, tokenID ) {
    const tokenInfo = chain.extractTokenInfo( tokenInfoOrAddress );
    try {
        const contract = new chain.w3.eth.Contract( tokenInfo.abi, tokenInfo.address );
        const tokenOwner = await contract.methods.ownerOf( tokenID ).call( { from: walletAddress } );
        return tokenOwner;
    } catch ( err ) {
    }
    return "";
}

async function get_contract_call_events( w3, joContract, strEventName, nBlockNumber, strTxHash, joFilter ) {
    joFilter = joFilter || {};
    let nBlockFrom = nBlockNumber - 10, nBlockTo = nBlockNumber + 10;
    const nLatestBlockNumber = await get_web3_blockNumber( 10, w3 ); // await get_web3_universal_call( 10, "BlockNumber", w3, null, null );
    if( nBlockFrom < 0 )
        nBlockFrom = 0;
    if( nBlockTo > nLatestBlockNumber )
        nBlockTo = nLatestBlockNumber;
    const joAllEventsInBlock = await get_web3_pastEvents( 10, joContract, strEventName, nBlockFrom, nBlockTo, joFilter );
    const joAllTransactionEvents = []; let i;
    for( i = 0; i < joAllEventsInBlock.length; ++i ) {
        const joEvent = joAllEventsInBlock[i];
        if( "transactionHash" in joEvent && joEvent.transactionHash == strTxHash )
            joAllTransactionEvents.push( joEvent );
    }
    return joAllTransactionEvents;
}

function compose_tx_instance( rawTx ) {
    rawTx = JSON.parse( JSON.stringify( rawTx ) ); // clone
    let joOpts = null;
    if( "chainId" in rawTx && typeof rawTx.chainId == "number" ) {
        switch ( rawTx.chainId ) {
        case 1:
            delete rawTx.chainId;
            joOpts = joOpts || { };
            joOpts.chain = "mainnet";
            break;
        case 3:
            delete rawTx.chainId;
            joOpts = joOpts || { };
            joOpts.chain = "ropsten";
            break;
        case 4:
            delete rawTx.chainId;
            joOpts = joOpts || { };
            joOpts.chain = "rinkeby";
            break;
        case 5:
            delete rawTx.chainId;
            joOpts = joOpts || { };
            joOpts.chain = "goerli";
            break;
        case 2018:
            delete rawTx.chainId;
            joOpts = joOpts || { };
            joOpts.chain = "dev";
            break;
        // default:
        //     joOpts = joOpts || { };
        //     joOpts.common = joOpts.common || { };
        //     joOpts.common.name = "chain" + rawTx.chainId;
        //     // joOpts.common.networkId = 123;
        //     joOpts.common.chainId = parseInt( rawTx.chainId );
        //     // joOpts.hardfork = "petersburg";
        //     delete rawTx.chainId;
        //     break;
        } // switch( rawTx.chainId )
    }
    let tx = null;
    if( joOpts )
        tx = new ethereumjs_tx( rawTx, joOpts );
    else
        tx = new ethereumjs_tx( rawTx );
    return tx;
}

function get_account_connectivity_info( joAccount ) {
    const joACI = {
        isBad: true,
        strType: "bad",
        isAutoSend: false
    };
    if( "strTransactionManagerURL" in joAccount && typeof joAccount.strTransactionManagerURL == "string" && joAccount.strTransactionManagerURL.length > 0 ) {
        joACI.isBad = false;
        joACI.strType = "tm";
        joACI.isAutoSend = true;
    } else if( "strSgxURL" in joAccount && typeof joAccount.strSgxURL == "string" && joAccount.strSgxURL.length > 0 &&
        "strSgxKeyName" in joAccount && typeof joAccount.strSgxKeyName == "string" && joAccount.strSgxKeyName.length > 0
    ) {
        joACI.isBad = false;
        joACI.strType = "sgx";
    } else if( "privateKey" in joAccount && typeof joAccount.privateKey == "string" && joAccount.privateKey.length > 0 ) {
        joACI.isBad = false;
        joACI.strType = "direct";
    } else if( "isMetamask" in joAccount && joAccount.isMetamask === true ) {
        joACI.isBad = false;
        joACI.strType = "metamask";
        joACI.isAutoSend = true;
    } else {
        // bad by default
    }
    return joACI;
}

async function wait_for_transaction_receipt( w3, txHash, nMaxWaitAttempts, nSleepMilliseconds ) {
    if( w3 == null || w3 == undefined || txHash == null || txHash == undefined || typeof txHash != "string" || txHash.length == 0 )
        return null;
    nMaxWaitAttempts = nMaxWaitAttempts || 100;
    nSleepMilliseconds = nSleepMilliseconds || 5000;
    let idxAttempt;
    for( idxAttempt = 0; idxAttempt < nMaxWaitAttempts; ++ idxAttempt ) {
        try {
            const joReceipt = await get_web3_transactionReceipt( 10, w3, txHash ); // await w3.eth.getTransactionReceipt( txHash );
            if( joReceipt != null )
                return joReceipt;
        } catch ( err ) {
        }
        await sleep( nSleepMilliseconds );
    }
    return null;
}

async function safe_sign_transaction_with_account( w3, tx, rawTx, joAccount ) {
    const joSR = {
        joACI: get_account_connectivity_info( joAccount ),
        tx: null,
        txHashSent: null
    };
    switch ( joSR.joACI.strType ) {
    case "tm": {
        let rpcCallOpts = null;
        if( "strSslKey" in joAccount && typeof joAccount.strSslKey == "string" && joAccount.strSslKey.length > 0 &&
            "strSslCert" in joAccount && typeof joAccount.strSslCert == "string" && joAccount.strSslCert.length > 0
        ) {
            rpcCallOpts = {
            };
        }
        await rpc_call_create( joAccount.strTransactionManagerURL, rpcCallOpts, async function( joCall, err ) {
            if( err )
                return;
            const txAdjusted = JSON.parse( JSON.stringify( rawTx ) );
            if( "chainId" in txAdjusted )
                delete txAdjusted.chainId;
            if( "gasLimit" in txAdjusted && ( ! ( "gas" in txAdjusted ) ) ) {
                txAdjusted.gas = txAdjusted.gasLimit;
                delete txAdjusted.gasLimit;
            }
            const joIn = {
                "transaction_dict": JSON.stringify( txAdjusted )
            };
            await joCall.call( joIn, /*async*/ function( joIn, joOut, err ) {
                if( err )
                    return;
                if( joOut && "data" in joOut && joOut.data && "transaction_hash" in joOut.data )
                    joSR.txHashSent = "" + joOut.data.transaction_hash;
                else
                    return;
            } );
        } );
        await sleep( 5000 );
        await wait_for_transaction_receipt( w3, joSR.txHashSent );
    } break;
    case "sgx": {
        let rpcCallOpts = null;
        if( "strSslKey" in joAccount && typeof joAccount.strSslKey == "string" && joAccount.strSslKey.length > 0 &&
            "strSslCert" in joAccount && typeof joAccount.strSslCert == "string" && joAccount.strSslCert.length > 0
        ) {
            rpcCallOpts = {
                "cert": strSslKey, // fs.readFileSync( joAccount.strPathSslCert, "utf8" )
                "key": strSslCert // fs.readFileSync( joAccount.strPathSslKey, "utf8" )
            };
        }
        await rpc_call_create( joAccount.strSgxURL, rpcCallOpts, async function( joCall, err ) {
            if( err )
                return;
            const msgHash = tx.hash( false );
            const strHash = msgHash.toString( "hex" );
            const joIn = {
                "method": "ecdsaSignMessageHash",
                "params": {
                    "keyName": "" + joAccount.strSgxKeyName,
                    "messageHash": strHash,
                    "base": 16
                }
            };
            await joCall.call( joIn, function( joIn, joOut, err ) {
                if( err )
                    return;
                const joNeededResult = {
                    "v": parseInt( joOut.result.signature_v, 10 ),
                    "r": "" + joOut.result.signature_r,
                    "s": "" + joOut.result.signature_s
                };
                let chainId = -4;
                if( "_chainId" in tx && tx._chainId != null && tx._chainId != undefined ) {
                    chainId = tx._chainId;
                    if( chainId == 0 )
                        chainId = -4;
                }
                joNeededResult.v += chainId * 2 + 8 + 27;
                tx.v = joNeededResult.v;
                tx.r = joNeededResult.r;
                tx.s = joNeededResult.s;
            } );
        } );
        await sleep( 3000 );
    } break;
    case "direct": {
        const key = ethereumjs_util.toBuffer( ensure_starts_with_0x( joAccount.privateKey ) ); // convert private key to buffer
        tx.sign( key ); // arg is privateKey as buffer
    } break;
    case "metamask": {
        const mmTx = JSON.parse( JSON.stringify( rawTx ) );
        mmTx.from = joAccount.ethereum.selectedAddress; // joAccount.address();
        if( "nonce" in mmTx )
            mmTx.nonce = "" + mmTx.nonce;
        if( "gas" in mmTx )
            mmTx.gas = "" + mmTx.gas;
        if( "gasPrice" in mmTx )
            mmTx.gasPrice = "" + mmTx.gasPrice;
        joSR.txHashSent = await joAccount.ethereum.request( {
            method: "eth_sendTransaction",
            params: [ mmTx ]
        } );
    } break;
    default:
        throw new Error( "CRITICAL TRANSACTION SIGNING ERROR: bad credentials information specified" );
    } // switch( joSR.joACI.strType )
    joSR.tx = tx;
    return joSR;
}

async function safe_send_signed_transaction( w3, serializedTx ) {
    const strTX = "0x" + serializedTx.toString( "hex" ); // strTX is string starting from "0x"
    let joReceipt = null;
    let bHaveReceipt = false;
    try {
        joReceipt = await w3.eth.sendSignedTransaction( strTX );
        bHaveReceipt = ( joReceipt != null );
    } catch ( err ) {
    }
    if( !bHaveReceipt ) {
        try {
            joReceipt = await w3.eth.sendSignedTransaction( strTX );
        } catch ( err ) {
            throw err;
        }
    }
    return joReceipt;
}

function extract_dry_run_method_name( methodWithArguments ) {
    try {
        const s = "" + methodWithArguments._method.name;
        return s;
    } catch ( err ) {
    }
    return "N/A-method-name";
}

function dry_run_is_enabled() {
    return true;
}

function dry_run_is_ignored() {
    return true;
}

async function dry_run_call( w3, methodWithArguments, joAccount, isDryRunResultIgnore, gasPrice, gasValue ) {
    isDryRunResultIgnore = ( isDryRunResultIgnore != null && isDryRunResultIgnore != undefined ) ? ( isDryRunResultIgnore ? true : false ) : false;
    const strMethodName = extract_dry_run_method_name( methodWithArguments );
    if( ! dry_run_is_enabled() )
        return;

    try {
        const addressFrom = get_account_wallet_address( w3, joAccount );
        //const joResult =
        await methodWithArguments.call( {
            from: addressFrom,
            gasPrice: gasPrice,
            gas: ( typeof gasValue == "undefined" ) ? 0 : gasValue
        } );
    } catch ( err ) {
        if( ! ( isDryRunResultIgnore || dry_run_is_ignored() ) )
            throw new Error( "CRITICAL DRY RUN FAIL invoking the \"" + strMethodName + "\" method: " + err.toString() );
    }
}

async function ima_depositETHtoSchain( chainFrom, chainTo, joAccountFrom, joAccountTo, weiTransfer, opts ) {
    transactionCustomizer = opts.transactionCustomizer || g_transactionCustomizerMN;
    const jarrReceipts = [];
    const tcnt = await get_web3_transactionCount( 10, chainFrom.w3, get_account_wallet_address( chainFrom.w3, joAccountFrom ), null ); // await chainFrom.w3.eth.getTransactionCount( get_account_wallet_address( chainFrom.w3, joAccountFrom ), null );
    const methodWithArguments = chainFrom.jo_deposit_box_eth.methods.deposit(
        ( typeof chainTo == "string" ) ? chainTo : chainTo.chainName,
        get_account_wallet_address( chainFrom.w3, joAccountTo ) //  destination account on S-chain
    );
    const dataTx = methodWithArguments.encodeABI(); // the encoded ABI of the method
    const gasPrice = await transactionCustomizer.computeGasPrice( chainFrom.w3, 200000000000 );
    const estimatedGas = await transactionCustomizer.computeGas( methodWithArguments, chainFrom.w3, 3000000, gasPrice, get_account_wallet_address( chainFrom.w3, joAccountFrom ) );
    await dry_run_call( chainFrom.w3, methodWithArguments, joAccountFrom, opts.isIgnoreDRC ? true : false, gasPrice, estimatedGas );
    const rawTx = {
        chainId: chainFrom.chainID,
        nonce: tcnt,
        gasPrice: gasPrice,
        gas: estimatedGas,
        to: chainFrom.jo_deposit_box_eth.options.address,
        data: dataTx,
        value: "0x" + chainFrom.w3.utils.toBN( weiTransfer ).toString( 16 )
    };
    const tx = compose_tx_instance( rawTx );
    const joSR = await safe_sign_transaction_with_account( chainFrom.w3, tx, rawTx, joAccountFrom );
    let joReceipt = null;
    if( joSR.joACI.isAutoSend )
        joReceipt = await get_web3_transactionReceipt( 10, chainFrom.w3, joSR.txHashSent ); // await chainFrom.w3.eth.getTransactionReceipt( joSR.txHashSent );
    else {
        const serializedTx = tx.serialize();
        joReceipt = await safe_send_signed_transaction( chainFrom.w3, serializedTx );
    }
    if( joReceipt && typeof joReceipt == "object" && "gasUsed" in joReceipt ) {
        jarrReceipts.push( {
            "description": "do_eth_payment_from_main_net",
            "receipt": joReceipt
        } );
    }
    // Must-have event(s) analysis as indicator(s) of success
    if( chainFrom.jo_message_proxy_main_net ) {
        await sleep( g_nSleepBeforeFetchOutgoingMessageEvent );
        const joEvents = await get_contract_call_events( chainFrom.w3, chainFrom.jo_message_proxy_main_net, "OutgoingMessage", joReceipt.blockNumber, joReceipt.transactionHash, {} );
        if( joEvents.length <= 0 )
            throw new Error( "(depositETHtoSchain) Verification failed for the \"OutgoingMessage\" event of the \"MessageProxy\"/" + chainFrom.jo_message_proxy_main_net.options.address + " contract, no events found" );
    }
    // // Must-absent event(s) analysis as indicator(s) of success
    // if( chainFrom.jo_deposit_box_eth ) {
    //     const joEvents = await get_contract_call_events( chainFrom.w3, chainFrom.jo_deposit_box_eth, "Error", joReceipt.blockNumber, joReceipt.transactionHash, {} );
    //     if( joEvents.length != 0 )
    //         throw new Error( "(depositETHtoSchain) Verification failed for the \"Error\" event of the \"DepositBoxEth\"/" + chainFrom.jo_deposit_box_eth.options.address + " contract, no events found" );
    // }
    // print_gas_usage_report_from_array( "ETH PAYMENT FROM MAIN NET", jarrReceipts );
}

async function ima_withdrawETHfromSchain( chainFrom, chainTo, joAccountFrom, joAccountTo, weiTransfer, opts ) {
    transactionCustomizer = opts.transactionCustomizer || g_transactionCustomizerSC;
    const jarrReceipts = [];
    let gasPrice = await transactionCustomizer.computeGasPrice( chainFrom.w3, 200000000000 );
    const tcnt = await get_web3_transactionCount( 10, chainFrom.w3, get_account_wallet_address( chainFrom.w3, joAccountFrom ), null ); // await chainFrom.w3.eth.getTransactionCount( get_account_wallet_address( chainFrom.w3, joAccountFrom ), null );
    const methodWithArguments = chainFrom.jo_token_manager_eth.methods.exitToMain(
        get_account_wallet_address( chainTo.w3, joAccountTo ),
        "0x" + chainFrom.w3.utils.toBN( weiTransfer ).toString( 16 )
    );
    const dataTx = methodWithArguments.encodeABI(); // the encoded ABI of the method
    gasPrice = await transactionCustomizer.computeGasPrice( chainFrom.w3, 200000000000 );
    const estimatedGas = await transactionCustomizer.computeGas( methodWithArguments, chainFrom.w3, 6000000, gasPrice, get_account_wallet_address( chainFrom.w3, joAccountFrom ) );
    await dry_run_call( chainFrom.w3, methodWithArguments, joAccountFrom, opts.isIgnoreDRC ? true : false, gasPrice, estimatedGas );
    const rawTx = {
        chainId: chainFrom.chainID,
        nonce: tcnt,
        gasPrice: gasPrice,
        gas: estimatedGas,
        to: chainFrom.jo_token_manager_eth.options.address,
        data: dataTx,
        value: 0 // how much money to send
    };
    const tx = compose_tx_instance( rawTx );
    const joSR = await safe_sign_transaction_with_account( chainFrom.w3, tx, rawTx, joAccountFrom );
    let joReceipt = null;
    if( joSR.joACI.isAutoSend )
        joReceipt = await get_web3_transactionReceipt( 10, chainFrom.w3, joSR.txHashSent ); // await chainFrom.w3.eth.getTransactionReceipt( joSR.txHashSent );
    else {
        const serializedTx = tx.serialize();
        joReceipt = await safe_send_signed_transaction( chainFrom.w3, serializedTx );
    }
    if( joReceipt && typeof joReceipt == "object" && "gasUsed" in joReceipt ) {
        jarrReceipts.push( {
            "description": "do_eth_payment_from_s_chain",
            "receipt": joReceipt
        } );
    }
    // Must-have event(s) analysis as indicator(s) of success
    if( chainFrom.jo_message_proxy_s_chain ) {
        await sleep( g_nSleepBeforeFetchOutgoingMessageEvent );
        const joEvents = await get_contract_call_events( chainFrom.w3, chainFrom.jo_message_proxy_s_chain, "OutgoingMessage", joReceipt.blockNumber, joReceipt.transactionHash, {} );
        if( joEvents.length <= 0 )
            throw new Error( "(withdrawETHfromSchain) Verification failed for the \"OutgoingMessage\" event of the \"MessageProxy\"/" + chainFrom.jo_message_proxy_s_chain.options.address + " contract, no events found" );
    }
    // print_gas_usage_report_from_array( "ETH PAYMENT FROM S-CHAIN", jarrReceipts );
}

async function ima_depositERC20toSchain( chainFrom, chainTo, joAccountFrom, joAccountTo, tokenInfoOrAddressFrom, tokenAmount, opts ) {
    const tokenInfoFrom = chainFrom.extractTokenInfo( tokenInfoOrAddressFrom );
    transactionCustomizer = opts.transactionCustomizer || g_transactionCustomizerMN;
    const jarrReceipts = []; // do_erc20_payment_from_main_net
    let tcnt = await get_web3_transactionCount( 10, chainFrom.w3, get_account_wallet_address( chainFrom.w3, joAccountFrom ), null ); // await chainFrom.w3.eth.getTransactionCount( get_account_wallet_address( chainFrom.w3, joAccountFrom ), null );
    const contractERC20 = new chainFrom.w3.eth.Contract( tokenInfoFrom.abi, tokenInfoFrom.address );
    // prepare the smart contract function deposit(string schainID, address to)
    const depositBoxAddress = chainFrom.jo_deposit_box_erc20.options.address;
    const accountForSchain = get_account_wallet_address( chainTo.w3, joAccountTo );
    const methodWithArguments_approve = contractERC20.methods.approve(
        depositBoxAddress, "0x" + chainFrom.w3.utils.toBN( tokenAmount ).toString( 16 )
    );
    const dataTxApprove = methodWithArguments_approve.encodeABI();
    let dataTxDeposit = null;
    const methodWithArguments_rawDepositERC20 = chainFrom.jo_deposit_box_erc20.methods.depositERC20(
        chainTo.chainName,
        tokenInfoFrom.address,
        accountForSchain,
        "0x" + chainFrom.w3.utils.toBN( tokenAmount ).toString( 16 )
    );
    dataTxDeposit = methodWithArguments_rawDepositERC20.encodeABI();
    let gasPrice = await transactionCustomizer.computeGasPrice( chainFrom.w3, 200000000000 );
    const estimatedGas_approve = await transactionCustomizer.computeGas( methodWithArguments_approve, chainFrom.w3, 8000000, gasPrice, get_account_wallet_address( chainFrom.w3, joAccountFrom ) );
    await dry_run_call( chainFrom.w3, methodWithArguments_approve, joAccountFrom, opts.isIgnoreDRC_approve ? true : false, gasPrice, estimatedGas_approve );
    //
    const rawTxApprove = {
        chainId: chainFrom.chainID,
        from: get_account_wallet_address( chainFrom.w3, joAccountFrom ), // accountForMainnet
        nonce: "0x" + tcnt.toString( 16 ),
        data: dataTxApprove,
        to: tokenInfoFrom.address,
        gasPrice: gasPrice, // 0
        gas: estimatedGas_approve
    };
    const txApprove = compose_tx_instance( rawTxApprove );
    const joApproveSR = await safe_sign_transaction_with_account( chainFrom.w3, txApprove, rawTxApprove, joAccountFrom );
    let joReceiptApprove = null;
    if( joApproveSR.joACI.isAutoSend )
        joReceiptApprove = await get_web3_transactionReceipt( 10, chainFrom.w3, joApproveSR.txHashSent ); // joReceiptApprove = await chainFrom.w3.eth.getTransactionReceipt( joApproveSR.txHashSent );
    else {
        const serializedTxApprove = txApprove.serialize();
        joReceiptApprove = await safe_send_signed_transaction( chainFrom.w3, serializedTxApprove );
    }
    if( joReceiptApprove && typeof joReceiptApprove == "object" && "gasUsed" in joReceiptApprove ) {
        jarrReceipts.push( {
            "description": "do_erc20_payment_from_main_net/approve",
            "receipt": joReceiptApprove
        } );
    }
    if( g_nSleepBetweenTransactionsOnSChainMilliseconds )
        await sleep( g_nSleepBetweenTransactionsOnSChainMilliseconds );
    // if( g_bWaitForNextBlockOnSChain )
    //     await wait_for_next_block_to_appear( chainFrom.w3 );
    gasPrice = await transactionCustomizer.computeGasPrice( chainFrom.w3, 200000000000 );
    const estimatedGas_deposit = await transactionCustomizer.computeGas( methodWithArguments_rawDepositERC20, chainFrom.w3, 8000000, gasPrice, get_account_wallet_address( chainFrom.w3, joAccountFrom ) );
    await dry_run_call( chainFrom.w3, methodWithArguments_rawDepositERC20, joAccountFrom, opts.isIgnoreDRC_rawDepositERC20 ? true : false, gasPrice, estimatedGas_deposit );
    tcnt = await get_web3_transactionCount( 10, chainFrom.w3, get_account_wallet_address( chainFrom.w3, joAccountFrom ), null ); // await chainFrom.w3.eth.getTransactionCount( get_account_wallet_address( chainFrom.w3, joAccountFrom ), null );
    // tcnt += 1;
    const rawTxDeposit = {
        chainId: chainFrom.chainID,
        from: get_account_wallet_address( chainFrom.w3, joAccountFrom ), // accountForMainnet
        nonce: "0x" + tcnt.toString( 16 ),
        data: dataTxDeposit,
        to: depositBoxAddress,
        gasPrice: gasPrice, // 0
        gas: estimatedGas_deposit //,
        //value: "0x" + chainFrom.w3.utils.toBN( opts.weiReserve ).toString( 16 )
    };
    const txDeposit = compose_tx_instance( rawTxDeposit );
    const joDepositSR = await safe_sign_transaction_with_account( chainFrom.w3, txDeposit, rawTxDeposit, joAccountFrom );
    let joReceiptDeposit = null;
    if( joDepositSR.joACI.isAutoSend )
        joReceiptDeposit = await get_web3_transactionReceipt( 10, chainFrom.w3, joDepositSR.txHashSent ); // await chainFrom.w3.eth.getTransactionReceipt( joDepositSR.txHashSent );
    else {
        const serializedTxDeposit = txDeposit.serialize();
        joReceiptDeposit = await safe_send_signed_transaction( chainFrom.w3, serializedTxDeposit );
    }
    if( joReceiptDeposit && typeof joReceiptDeposit == "object" && "gasUsed" in joReceiptDeposit ) {
        jarrReceipts.push( {
            "description": "do_erc20_payment_from_main_net/deposit",
            "receipt": joReceiptDeposit
        } );
    }
    const joReceipt = joReceiptDeposit;
    if( chainFrom.jo_message_proxy_main_net ) {
        await sleep( g_nSleepBeforeFetchOutgoingMessageEvent );
        const joEvents = await get_contract_call_events( chainFrom.w3, chainFrom.jo_message_proxy_main_net, "OutgoingMessage", joReceipt.blockNumber, joReceipt.transactionHash, {} );
        if( joEvents.length <= 0 )
            throw new Error( "(depositERC20toSchain) Verification failed for the \"OutgoingMessage\" event of the \"MessageProxy\"/" + chainFrom.jo_message_proxy_main_net.options.address + " contract, no events found" );
    }
    // // Must-absent event(s) analysis as indicator(s) of success
    // if( chainFrom.jo_deposit_box_erc20 ) {
    //     const joEvents = await get_contract_call_events( chainFrom.w3, chainFrom.jo_deposit_box_erc20, "Error", joReceipt.blockNumber, joReceipt.transactionHash, {} );
    //     if( joEvents.length != 0 )
    //         throw new Error( "(depositERC20toSchain) Verification failed for the \"Error\" event of the \"DepositBoxERC20\"/" + chainFrom.jo_deposit_box_erc20.options.address + " contract, no events found" );
    // }
    // print_gas_usage_report_from_array( "ERC-20 PAYMENT FROM MAIN NET", jarrReceipts );
}

async function ima_withdrawERC20fromSchain( chainFrom, chainTo, joAccountFrom, joAccountTo, tokenInfoOrAddressFrom, tokenInfoOrAddressTo, tokenAmount, opts ) {
    const tokenInfoFrom = chainFrom.extractTokenInfo( tokenInfoOrAddressFrom );
    const tokenInfoTo = chainTo.extractTokenInfo( tokenInfoOrAddressTo );
    transactionCustomizer = opts.transactionCustomizer || g_transactionCustomizerSC;
    const jarrReceipts = []; // do_erc20_payment_from_s_chain
    const accountForMainnet = get_account_wallet_address( chainTo.w3, joAccountTo );
    const accountForSchain = get_account_wallet_address( chainFrom.w3, joAccountFrom );
    const tokenManagerAddress = chainFrom.jo_token_manager_erc20.options.address;
    const contractERC20 = new chainFrom.w3.eth.Contract( tokenInfoFrom.abi, tokenInfoFrom.address );
    const methodWithArguments_approve = contractERC20.methods.approve(
        tokenManagerAddress, "0x" + chainTo.w3.utils.toBN( tokenAmount ).toString( 16 )
    );
    const dataTxApprove = methodWithArguments_approve.encodeABI();
    const methodWithArguments_rawExitToMainERC20 = chainFrom.jo_token_manager_erc20.methods.exitToMainERC20(
        tokenInfoTo.address,
        accountForMainnet,
        "0x" + chainTo.w3.utils.toBN( tokenAmount ).toString( 16 )
    );
    const dataExitToMainERC20 = methodWithArguments_rawExitToMainERC20.encodeABI();
    let gasPrice = await transactionCustomizer.computeGasPrice( chainFrom.w3, 200000000000 );
    const estimatedGas_approve = await transactionCustomizer.computeGas( methodWithArguments_approve, chainFrom.w3, 8000000, gasPrice, get_account_wallet_address( chainFrom.w3, joAccountFrom ) );
    await dry_run_call( chainFrom.w3, methodWithArguments_approve, joAccountFrom, opts.isIgnoreDRC_approve ? true : false, gasPrice, estimatedGas_approve );
    let tcnt = await get_web3_transactionCount( 10, chainFrom.w3, get_account_wallet_address( chainFrom.w3, joAccountFrom ), null ); // parseInt( await chainFrom.w3.eth.getTransactionCount( get_account_wallet_address( chainFrom.w3, joAccountFrom ), null ) );
    const rawTxApprove = {
        chainId: chainFrom.chainID,
        from: accountForSchain,
        nonce: "0x" + tcnt.toString( 16 ),
        data: dataTxApprove,
        to: tokenInfoFrom.address,
        gasPrice: gasPrice,
        gas: estimatedGas_approve
    };
    const txApprove = compose_tx_instance( rawTxApprove );
    const joApproveSR = await safe_sign_transaction_with_account( chainFrom.w3, txApprove, rawTxApprove, joAccountFrom );
    let joReceiptApprove = null;
    if( joApproveSR.joACI.isAutoSend && joDepositSR.joACI.isAutoSend )
        joReceiptApprove = await get_web3_transactionReceipt( 10, chainFrom.w3, joApproveSR.txHashSent ); // await chainFrom.w3.eth.getTransactionReceipt( joApproveSR.txHashSent );
    else {
        const serializedTxApprove = txApprove.serialize();
        joReceiptApprove = await safe_send_signed_transaction( chainFrom.w3, serializedTxApprove );
    }
    if( joReceiptApprove && typeof joReceiptApprove == "object" && "gasUsed" in joReceiptApprove ) {
        jarrReceipts.push( {
            "description": "do_erc20_payment_from_s_chain/approve",
            "receipt": joReceiptApprove
        } );
    }
    if( g_nSleepBetweenTransactionsOnSChainMilliseconds )
        await sleep( g_nSleepBetweenTransactionsOnSChainMilliseconds );
    if( g_bWaitForNextBlockOnSChain )
        await wait_for_next_block_to_appear( chainFrom.w3 );
    const estimatedGas_rawExitToMainERC20 = await transactionCustomizer.computeGas( methodWithArguments_rawExitToMainERC20, chainFrom.w3, 8000000, gasPrice, get_account_wallet_address( chainFrom.w3, joAccountFrom ) );
    tcnt = await get_web3_transactionCount( 10, chainFrom.w3, get_account_wallet_address( chainFrom.w3, joAccountFrom ), null ); // parseInt( await chainFrom.w3.eth.getTransactionCount( get_account_wallet_address( chainFrom.w3, joAccountFrom ), null ) );
    gasPrice = await transactionCustomizer.computeGasPrice( chainFrom.w3, 200000000000 );
    await dry_run_call( chainFrom.w3, methodWithArguments_rawExitToMainERC20, joAccountFrom, opts.isIgnoreDRC_rawExitToMainERC20 ? true : false, gasPrice, estimatedGas_rawExitToMainERC20 );
    const rawTxExitToMainERC20 = {
        chainId: chainFrom.chainID,
        from: accountForSchain,
        nonce: "0x" + tcnt.toString( 16 ),
        data: dataExitToMainERC20,
        to: tokenManagerAddress,
        gasPrice: gasPrice,
        gas: estimatedGas_rawExitToMainERC20
    };
    const txExitToMainERC20 = compose_tx_instance( rawTxExitToMainERC20 );
    const joExitToMainERC20SR = await safe_sign_transaction_with_account( chainFrom.w3, txExitToMainERC20, rawTxExitToMainERC20, joAccountFrom );
    let joReceiptExitToMainERC20 = null;
    if( joExitToMainERC20SR.joACI.isAutoSend )
        joReceiptExitToMainERC20 = await get_web3_transactionReceipt( 10, chainFrom.w3, joExitToMainERC20SR.txHashSent ); // await chainFrom.w3.eth.getTransactionReceipt( joExitToMainERC20SR.txHashSent );
    else {
        const serializedTxExitToMainERC20 = txExitToMainERC20.serialize();
        joReceiptExitToMainERC20 = await safe_send_signed_transaction( chainFrom.w3, serializedTxExitToMainERC20 );
    }
    if( joReceiptExitToMainERC20 && typeof joReceiptExitToMainERC20 == "object" && "gasUsed" in joReceiptExitToMainERC20 ) {
        jarrReceipts.push( {
            "description": "do_erc20_payment_from_s_chain/exit-to-main",
            "receipt": joReceiptExitToMainERC20
        } );
    }
    const joReceipt = joReceiptExitToMainERC20;
    // Must-have event(s) analysis as indicator(s) of success
    if( chainFrom.jo_message_proxy_s_chain ) {
        await sleep( g_nSleepBeforeFetchOutgoingMessageEvent );
        const joEvents = await get_contract_call_events( chainFrom.w3, chainFrom.jo_message_proxy_s_chain, "OutgoingMessage", joReceipt.blockNumber, joReceipt.transactionHash, {} );
        if( joEvents.length <= 0 )
            throw new Error( "(withdrawERC20fromSchain) Verification failed for the \"OutgoingMessage\" event of the \"MessageProxy\"/" + chainFrom.jo_message_proxy_s_chain.options.address + " contract, no events found" );
    }
    // print_gas_usage_report_from_array( "ERC-20 PAYMENT FROM S-CHAIN", jarrReceipts );
}

async function ima_depositERC721toSchain( chainFrom, chainTo, joAccountFrom, joAccountTo, tokenInfoOrAddressFrom, tokenID, opts ) {
    const tokenInfoFrom = chainFrom.extractTokenInfo( tokenInfoOrAddressFrom );
    transactionCustomizer = opts.transactionCustomizer || g_transactionCustomizerMN;
    const jarrReceipts = []; // do_erc721_payment_from_main_net
    let tcnt = await get_web3_transactionCount( 10, chainFrom.w3, get_account_wallet_address( chainFrom.w3, joAccountFrom ), null ); // await chainFrom.w3.eth.getTransactionCount( get_account_wallet_address( chainFrom.w3, joAccountFrom ), null );
    const contractERC721 = new chainFrom.w3.eth.Contract( tokenInfoFrom.abi, tokenInfoFrom.address );
    // prepare the smart contract function deposit(string schainID, address to)
    const depositBoxAddress = chainFrom.jo_deposit_box_erc721.options.address;
    const accountForSchain = get_account_wallet_address( chainTo.w3, joAccountTo );
    const methodWithArguments_approve = contractERC721.methods.approve(
        depositBoxAddress,
        "0x" + chainFrom.w3.utils.toBN( tokenID ).toString( 16 )
    );
    const dataTxApprove = methodWithArguments_approve.encodeABI();
    let dataTxDeposit = null;
    const methodWithArguments_rawDepositERC721 = chainFrom.jo_deposit_box_erc721.methods.depositERC721(
        chainTo.chainName,
        tokenInfoFrom.address,
        accountForSchain,
        "0x" + chainFrom.w3.utils.toBN( tokenID ).toString( 16 )
    );
    dataTxDeposit = methodWithArguments_rawDepositERC721.encodeABI();
    let gasPrice = await transactionCustomizer.computeGasPrice( chainFrom.w3, 200000000000 );
    const estimatedGas_approve = await transactionCustomizer.computeGas( methodWithArguments_approve, chainFrom.w3, 8000000, gasPrice, get_account_wallet_address( chainFrom.w3, joAccountFrom ) );
    await dry_run_call( chainFrom.w3, methodWithArguments_approve, joAccountFrom, opts.isIgnoreDRC_approve ? true : false, gasPrice, estimatedGas_approve );
    const rawTxApprove = {
        chainId: chainFrom.chainID,
        from: get_account_wallet_address( chainFrom.w3, joAccountFrom ),
        nonce: "0x" + tcnt.toString( 16 ),
        data: dataTxApprove,
        to: tokenInfoFrom.address,
        gasPrice: gasPrice,
        gas: estimatedGas_approve
    };
    const txApprove = compose_tx_instance( rawTxApprove );
    const joApproveSR = await safe_sign_transaction_with_account( chainFrom.w3, txApprove, rawTxApprove, joAccountFrom );
    let joReceiptApprove = null;
    if( joApproveSR.joACI.isAutoSend )
        joReceiptApprove = await get_web3_transactionReceipt( 10, chainFrom.w3, joApproveSR.txHashSent ); // await chainFrom.w3.eth.getTransactionReceipt( joApproveSR.txHashSent );
    else {
        const serializedTxApprove = txApprove.serialize();
        joReceiptApprove = await safe_send_signed_transaction( chainFrom.w3, serializedTxApprove );
    }
    if( joReceiptApprove && typeof joReceiptApprove == "object" && "gasUsed" in joReceiptApprove ) {
        jarrReceipts.push( {
            "description": "do_erc721_payment_from_main_net/approve",
            "receipt": joReceiptApprove
        } );
    }
    tcnt += 1;
    gasPrice = await transactionCustomizer.computeGasPrice( chainFrom.w3, 200000000000 );
    const estimatedGas_deposit = await transactionCustomizer.computeGas( methodWithArguments_rawDepositERC721, chainFrom.w3, 8000000, gasPrice, get_account_wallet_address( chainFrom.w3, joAccountFrom ) );
    await dry_run_call( chainFrom.w3, methodWithArguments_rawDepositERC721, joAccountFrom, opts.isIgnoreDRC_rawDepositERC721 ? true : false, gasPrice, estimatedGas_deposit );
    const rawTxDeposit = {
        chainId: chainFrom.chainID,
        from: get_account_wallet_address( chainFrom.w3, joAccountFrom ),
        nonce: "0x" + tcnt.toString( 16 ),
        data: dataTxDeposit,
        to: depositBoxAddress,
        gasPrice: gasPrice,
        gas: estimatedGas_deposit //,
        // value: "0x" + chainFrom.w3.utils.toBN( opts.weiReserve ).toString( 16 )
    };
    const txDeposit = compose_tx_instance( rawTxDeposit );
    const joDepositSR = await safe_sign_transaction_with_account( chainFrom.w3, txDeposit, rawTxDeposit, joAccountFrom );
    let joReceiptDeposit = null;
    if( joDepositSR.joACI.isAutoSend )
        joReceiptDeposit = await get_web3_transactionReceipt( 10, chainFrom.w3, joDepositSR.txHashSent ); // await chainFrom.w3.eth.getTransactionReceipt( joDepositSR.txHashSent );
    else {
        const serializedTxDeposit = txDeposit.serialize();
        joReceiptDeposit = await safe_send_signed_transaction( chainFrom.w3, serializedTxDeposit );
    }
    if( joReceiptDeposit && typeof joReceiptDeposit == "object" && "gasUsed" in joReceiptDeposit ) {
        jarrReceipts.push( {
            "description": "do_erc721_payment_from_main_net/deposit",
            "receipt": joReceiptDeposit
        } );
    }
    const joReceipt = joReceiptDeposit;
    // Must-have event(s) analysis as indicator(s) of success
    if( chainFrom.jo_message_proxy_main_net ) {
        await sleep( g_nSleepBeforeFetchOutgoingMessageEvent );
        const joEvents = await get_contract_call_events( chainFrom.w3, chainFrom.jo_message_proxy_main_net, "OutgoingMessage", joReceipt.blockNumber, joReceipt.transactionHash, {} );
        if( joEvents.length <= 0 )
            throw new Error( "(depositERC721toSchain) Verification failed for the \"OutgoingMessage\" event of the \"MessageProxy\"/" + chainFrom.jo_message_proxy_main_net.options.address + " contract, no events found" );
    }
    // // Must-absent event(s) analysis as indicator(s) of success
    // if( chainFrom.jo_deposit_box_erc721 ) {
    //     const joEvents = await get_contract_call_events( chainFrom.w3, chainFrom.jo_deposit_box_erc721, "Error", joReceipt.blockNumber, joReceipt.transactionHash, {} );
    //     if( joEvents.length != 0 )
    //         throw new Error( "(depositERC721toSchain) Verification failed for the \"Error\" event of the \"DepositBoxERC721\"/" + chainFrom.jo_deposit_box_erc721.options.address + " contract, no events found" );
    // }
    // print_gas_usage_report_from_array( "ERC-721 PAYMENT FROM MAIN NET", jarrReceipts );
}

async function ima_withdrawERC721fromSchain( chainFrom, chainTo, joAccountFrom, joAccountTo, tokenInfoOrAddressFrom, tokenInfoOrAddressTo, tokenID, opts ) {
    const tokenInfoFrom = chainFrom.extractTokenInfo( tokenInfoOrAddressFrom );
    const tokenInfoTo = chainTo.extractTokenInfo( tokenInfoOrAddressTo );
    transactionCustomizer = opts.transactionCustomizer || g_transactionCustomizerSC;
    const jarrReceipts = []; // do_erc721_payment_from_s_chain
    const accountForMainnet = get_account_wallet_address( chainTo.w3, joAccountTo );
    const accountForSchain = get_account_wallet_address( chainFrom.w3, joAccountFrom );
    const tokenManagerAddress = chainFrom.jo_token_manager_erc721.options.address;
    const contractERC721 = new chainFrom.w3.eth.Contract( tokenInfoFrom.abi, tokenInfoFrom.address );
    // prepare the smart contract function deposit(string schainID, address to)
    const methodWithArguments_transferFrom = contractERC721.methods.approve(
        tokenManagerAddress,
        "0x" + chainTo.w3.utils.toBN( tokenID ).toString( 16 )
    );
    const dataTxTransferFrom = methodWithArguments_transferFrom.encodeABI();
    let dataTxExitToMainERC721 = null;
    const methodWithArguments_rawExitToMainERC721 = chainFrom.jo_token_manager_erc721.methods.exitToMainERC721(
        tokenInfoTo.address,
        accountForMainnet,
        "0x" + chainTo.w3.utils.toBN( tokenID ).toString( 16 )
    );
    dataTxExitToMainERC721 = methodWithArguments_rawExitToMainERC721.encodeABI();
    let gasPrice = await transactionCustomizer.computeGasPrice( chainFrom.w3, 200000000000 );
    let tcnt = await get_web3_transactionCount( 10, chainFrom.w3, get_account_wallet_address( chainFrom.w3, joAccountFrom ), null ); // await chainFrom.w3.eth.getTransactionCount( get_account_wallet_address( chainFrom.w3, joAccountFrom ), null );
    const estimatedGas_transferFrom = await transactionCustomizer.computeGas( methodWithArguments_transferFrom, chainFrom.w3, 8000000, gasPrice, get_account_wallet_address( chainFrom.w3, joAccountFrom ) );
    await dry_run_call( chainFrom.w3, methodWithArguments_transferFrom, joAccountFrom, opts.isIgnoreDRC_transferFrom ? true : false, gasPrice, estimatedGas_transferFrom );
    const rawTxTransferFrom = {
        chainId: chainFrom.chainID,
        from: accountForSchain,
        nonce: "0x" + tcnt.toString( 16 ),
        data: dataTxTransferFrom,
        to: tokenInfoFrom.address,
        gasPrice: gasPrice,
        gas: estimatedGas_transferFrom
    };
    const txTransferFrom = compose_tx_instance( rawTxTransferFrom );
    const joTransferFromSR = await safe_sign_transaction_with_account( chainFrom.w3, txTransferFrom, rawTxTransferFrom, joAccountFrom );
    let joReceiptTransferFrom = null;
    if( joTransferFromSR.joACI.isAutoSend )
        joReceiptTransferFrom = await get_web3_transactionReceipt( 10, chainFrom.w3, joTransferFromSR.txHashSent ); // await chainFrom.w3.eth.getTransactionReceipt( joTransferFromSR.txHashSent );
    else {
        const serializedTxTransferFrom = txTransferFrom.serialize();
        joReceiptTransferFrom = await safe_send_signed_transaction( chainFrom.w3, serializedTxTransferFrom );
    }
    if( joReceiptTransferFrom && typeof joReceiptTransferFrom == "object" && "gasUsed" in joReceiptTransferFrom ) {
        jarrReceipts.push( {
            "description": "do_erc721_payment_from_s_chain/transfer-from",
            "receipt": joReceiptTransferFrom
        } );
    }
    if( g_nSleepBetweenTransactionsOnSChainMilliseconds )
        await sleep( g_nSleepBetweenTransactionsOnSChainMilliseconds );
    if( g_bWaitForNextBlockOnSChain )
        await wait_for_next_block_to_appear( chainFrom.w3 );
    tcnt = await get_web3_transactionCount( 10, chainFrom.w3, get_account_wallet_address( chainFrom.w3, joAccountFrom ), null ); //  await chainFrom.w3.eth.getTransactionCount( get_account_wallet_address( chainFrom.w3, joAccountFrom ), null );
    gasPrice = await transactionCustomizer.computeGasPrice( chainFrom.w3, 200000000000 );
    const estimatedGas_exitToMainERC721 = await transactionCustomizer.computeGas( methodWithArguments_rawExitToMainERC721, chainFrom.w3, 8000000, gasPrice, get_account_wallet_address( chainFrom.w3, joAccountFrom ) );
    await dry_run_call( chainFrom.w3, methodWithArguments_rawExitToMainERC721, joAccountFrom, opts.isIgnoreDRC_rawExitToMainERC721 ? true : false, gasPrice, estimatedGas_exitToMainERC721 );
    const rawTxExitToMainERC721 = compose_tx_instance( {
        chainId: chainFrom.chainID,
        from: accountForSchain,
        nonce: "0x" + tcnt.toString( 16 ),
        data: dataTxExitToMainERC721,
        to: tokenManagerAddress,
        gasPrice: gasPrice,
        gas: estimatedGas_exitToMainERC721
    } );
    const txExitToMainERC721 = compose_tx_instance( rawTxExitToMainERC721 );
    const joExitToMainErc721SR = await safe_sign_transaction_with_account( chainFrom.w3, txExitToMainERC721, rawTxExitToMainERC721, joAccountFrom );
    let joReceiptExitToMainERC721 = null;
    if( joExitToMainErc721SR.joACI.isAutoSend )
        joReceiptExitToMainERC721 = await get_web3_transactionReceipt( 10, chainFrom.w3, joExitToMainErc721SR.txHashSent ); // await chainFrom.w3.eth.getTransactionReceipt( joExitToMainErc721SR.txHashSent );
    else {
        const serializedTxExitToMainERC721 = txExitToMainERC721.serialize();
        joReceiptExitToMainERC721 = await safe_send_signed_transaction( chainFrom.w3, serializedTxExitToMainERC721 );
    }
    const joReceipt = joReceiptExitToMainERC721;
    if( joReceiptExitToMainERC721 && typeof joReceiptExitToMainERC721 == "object" && "gasUsed" in joReceiptExitToMainERC721 ) {
        jarrReceipts.push( {
            "description": "do_erc721_payment_from_s_chain/exit-to-main",
            "receipt": joReceiptExitToMainERC721
        } );
    }
    // Must-have event(s) analysis as indicator(s) of success
    if( chainFrom.jo_message_proxy_s_chain ) {
        await sleep( g_nSleepBeforeFetchOutgoingMessageEvent );
        const joEvents = await get_contract_call_events( chainFrom.w3, chainFrom.jo_message_proxy_s_chain, "OutgoingMessage", joReceipt.blockNumber, joReceipt.transactionHash, {} );
        if( joEvents.length <= 0 )
            throw new Error( "(withdrawERC721fromSchain) Verification failed for the \"OutgoingMessage\" event of the \"MessageProxy\"/" + chainFrom.jo_message_proxy_s_chain.options.address + " contract, no events found" );
    }
    // print_gas_usage_report_from_array( "ERC-721 PAYMENT FROM S-CHAIN", jarrReceipts );
}

async function ima_viewETHtoReceive( chain, walletAddress ) {
    if( ! chain.isMainNet() )
        throw new Error( "Can view ETH to receive only on Main NET" );
    const wei = await chain.jo_deposit_box_eth.methods.approveTransfers( walletAddress ).call( {
        from: walletAddress
    } );
    return wei;
}

/*
    transactionCustomizer = opts.transactionCustomizer || g_transactionCustomizerMN;
    const jarrReceipts = [];
    const tcnt = await get_web3_transactionCount( 10, chainFrom.w3, get_account_wallet_address( chainFrom.w3, joAccountFrom ), null ); // await chainFrom.w3.eth.getTransactionCount( get_account_wallet_address( chainFrom.w3, joAccountFrom ), null );
    const methodWithArguments = chainFrom.jo_deposit_box_eth.methods.deposit(
        ( typeof chainTo == "string" ) ? chainTo : chainTo.chainName,
        get_account_wallet_address( chainFrom.w3, joAccountTo ) //  destination account on S-chain
    );
    const dataTx = methodWithArguments.encodeABI(); // the encoded ABI of the method
    const gasPrice = await transactionCustomizer.computeGasPrice( chainFrom.w3, 200000000000 );
    const estimatedGas = await transactionCustomizer.computeGas( methodWithArguments, chainFrom.w3, 3000000, gasPrice, get_account_wallet_address( chainFrom.w3, joAccountFrom ) );
    await dry_run_call( chainFrom.w3, methodWithArguments, joAccountFrom, opts.isIgnoreDRC ? true : false, gasPrice, estimatedGas );
 */

async function ima_receiveETH( chain, joAccount, opts ) {
    transactionCustomizer = opts.transactionCustomizer || g_transactionCustomizerMN;
    const jarrReceipts = [];
    if( ! chain.isMainNet() )
        throw new Error( "Can receive ETH only on Main NET" );
    const tcnt = await get_web3_transactionCount( 10, chain.w3, get_account_wallet_address( chain.w3, joAccount ), null );
    const methodWithArguments = chain.jo_deposit_box_eth.methods.getMyEth(
        // call params(empty)
    );
    const dataTx = methodWithArguments.encodeABI(); // the encoded ABI of the method
    const gasPrice = await transactionCustomizer.computeGasPrice( chain.w3, 200000000000 );
    const estimatedGas = await transactionCustomizer.computeGas( methodWithArguments, chain.w3, 3000000, gasPrice, get_account_wallet_address( chain.w3, joAccount ) );
    await dry_run_call( chain.w3, methodWithArguments, joAccount, opts.isIgnoreDRC ? true : false, gasPrice, estimatedGas );
    //
    const rawTx = {
        chainId: chain.chainID,
        nonce: tcnt,
        gas: estimatedGas, // 2100000
        gasPrice: gasPrice,
        // gasLimit: estimatedGas, // 3000000
        to: chain.jo_deposit_box_eth.options.address, // contract address
        data: dataTx,
        value: 0 // how much money to send
    };
    const tx = compose_tx_instance( rawTx );
    const joSR = await safe_sign_transaction_with_account( chain.w3, tx, rawTx, joAccount );
    let joReceipt = null;
    if( joSR.joACI.isAutoSend )
        joReceipt = await get_web3_transactionReceipt( 10, chain.w3, joSR.txHashSent );
    else {
        const serializedTx = tx.serialize();
        joReceipt = await safe_send_signed_transaction( chain.w3, serializedTx );
    }
    if( joReceipt && typeof joReceipt == "object" && "gasUsed" in joReceipt ) {
        jarrReceipts.push( {
            "description": "receive_eth_payment_from_s_chain_on_main_net",
            "receipt": joReceipt
        } );
    }
}

async function ima_reimbursementGetBalance(
    chain,
    walletAddress,
    strReimbursementChain
) {
    try {
        const xWei = await chain.jo_community_pool.methods.getBalance( strReimbursementChain ).call( {
            from: walletAddress
        } );
        // const xEth = chain.w3.utils.fromWei( xWei, "ether" );
        return xWei;
    } catch ( err ) {
        return 0;
    }
}

async function ima_reimbursementWalletRecharge(
    chain,
    joAccount,
    strReimbursementChain,
    nReimbursementRecharge,
    opts
) {
    transactionCustomizer = opts.transactionCustomizer || g_transactionCustomizerMN;
    const jarrReceipts = []; // reimbursement_wallet_recharge
    const tcnt = await get_web3_transactionCount( 10, chain.w3, get_account_wallet_address( chain.w3, joAccount ), null );
    const methodWithArguments = chain.jo_community_pool.methods.rechargeUserWallet(
        strReimbursementChain
    );
    const dataTx = methodWithArguments.encodeABI();
    const gasPrice = await transactionCustomizer.computeGasPrice( chain.w3, 200000000000 );
    const estimatedGas = await transactionCustomizer.computeGas( methodWithArguments, chain.w3, 3000000, gasPrice, get_account_wallet_address( chain.w3, joAccount ), nReimbursementRecharge );
    await dry_run_call( chain.w3, methodWithArguments, joAccount, opts.isIgnoreDRC ? true : false, gasPrice, estimatedGas, nReimbursementRecharge );
    const rawTx = {
        chainId: chain.chainID,
        nonce: tcnt,
        gasPrice: gasPrice,
        gas: estimatedGas,
        to: chain.jo_community_pool.options.address, // contract address
        data: dataTx,
        value: "0x" + chain.w3.utils.toBN( nReimbursementRecharge ).toString( 16 ) // wei_how_much // how much money to send
    };
    const tx = compose_tx_instance( rawTx );
    const joSR = await safe_sign_transaction_with_account( chain.w3, tx, rawTx, joAccount );
    let joReceipt = null;
    if( joSR.joACI.isAutoSend )
        joReceipt = await get_web3_transactionReceipt( 10, chain.w3, joSR.txHashSent );
    else {
        const serializedTx = tx.serialize();
        joReceipt = await safe_send_signed_transaction( chain.w3, serializedTx );
    }
    if( joReceipt && typeof joReceipt == "object" && "gasUsed" in joReceipt ) {
        jarrReceipts.push( {
            "description": "reimbursement_wallet_recharge",
            "receipt": joReceipt
        } );
    }
    // print_gas_usage_report_from_array( "REIMBURSEMENT_WALLET_RECHARGE", jarrReceipts );
    return true;
}

async function ima_reimbursementWalletWithdraw(
    chain,
    joAccount,
    strReimbursementChain,
    nReimbursementWithdraw,
    opts
) {
    transactionCustomizer = opts.transactionCustomizer || g_transactionCustomizerMN;
    const jarrReceipts = []; // reimbursement_wallet_withdraw
    const wei_how_much = 0;
    const tcnt = await get_web3_transactionCount( 10, chain.w3, get_account_wallet_address( chain.w3, joAccount ), null );
    const methodWithArguments = chain.jo_community_pool.methods.withdrawFunds(
        strReimbursementChain,
        "0x" + chain.w3.utils.toBN( nReimbursementWithdraw ).toString( 16 )
    );
    const dataTx = methodWithArguments.encodeABI(); // the encoded ABI of the method
    const gasPrice = await transactionCustomizer.computeGasPrice( chain.w3, 200000000000 );
    const estimatedGas = await transactionCustomizer.computeGas( methodWithArguments, chain.w3, 3000000, gasPrice, get_account_wallet_address( chain.w3, joAccount ), wei_how_much );
    await dry_run_call( chain.w3, methodWithArguments, joAccount, opts.isIgnoreDRC ? true : false, gasPrice, estimatedGas, wei_how_much );
    //
    const rawTx = {
        chainId: chain.chainID,
        nonce: tcnt,
        gasPrice: gasPrice,
        gas: estimatedGas,
        to: chain.jo_community_pool.options.address, // contract address
        data: dataTx,
        value: "0x" + chain.w3.utils.toBN( wei_how_much ).toString( 16 ) // wei_how_much // how much money to send
    };
    const tx = compose_tx_instance( rawTx );
    const joSR = await safe_sign_transaction_with_account( chain.w3, tx, rawTx, joAccount );
    let joReceipt = null;
    if( joSR.joACI.isAutoSend )
        joReceipt = await get_web3_transactionReceipt( 10, chain.w3, joSR.txHashSent );
    else {
        const serializedTx = tx.serialize();
        joReceipt = await safe_send_signed_transaction( chain.w3, serializedTx );
    }
    if( joReceipt && typeof joReceipt == "object" && "gasUsed" in joReceipt ) {
        jarrReceipts.push( {
            "description": "reimbursement_wallet_withdraw",
            "receipt": joReceipt
        } );
    }
    // print_gas_usage_report_from_array( "REIMBURSEMENT_WALLET_WITHDRAW", jarrReceipts );
    return true;
}

async function ima_reimbursementSetRange(
    chain,
    joAccount,
    nReimbursementRange,
    opts
) {
    transactionCustomizer = opts.transactionCustomizer || g_transactionCustomizerSC;
    const jarrReceipts = []; // reimbursement_set_range
    const wei_how_much = 0;
    const tcnt = await get_web3_transactionCount( 10, chain.w3, get_account_wallet_address( chain.w3, joAccount ), null );
    const methodWithArguments = chain.jo_community_locker.methods.setTimeLimitPerMessage(
        // call params, last is destination account on S-chain
        "0x" + chain.w3.utils.toBN( nReimbursementRange ).toString( 16 )
    );
    const dataTx = methodWithArguments.encodeABI(); // the encoded ABI of the method
    const gasPrice = await transactionCustomizer.computeGasPrice( chain.w3, 200000000000 );
    const estimatedGas = await transactionCustomizer.computeGas( methodWithArguments, chain.w3, 3000000, gasPrice, get_account_wallet_address( chain.w3, joAccount_s_chain ), wei_how_much );
    await dry_run_call( chain.w3, methodWithArguments, joAccount, opts.isIgnoreDRC ? true : false, gasPrice, estimatedGas, wei_how_much );
    const rawTx = {
        chainId: chain.chainID,
        nonce: tcnt,
        gasPrice: gasPrice,
        gas: estimatedGas,
        to: chain.jo_community_locker.options.address, // contract address
        data: dataTx,
        value: 0 // how much money to send
    };
    const tx = compose_tx_instance( rawTx );
    const joSR = await safe_sign_transaction_with_account( chain.w3, tx, rawTx, joAccount );
    let joReceipt = null;
    if( joSR.joACI.isAutoSend )
        joReceipt = await get_web3_transactionReceipt( 10, chain.w3, joSR.txHashSent );
    else {
        const serializedTx = tx.serialize();
        joReceipt = await safe_send_signed_transaction( chain.w3, serializedTx );
    }
    if( joReceipt && typeof joReceipt == "object" && "gasUsed" in joReceipt ) {
        jarrReceipts.push( {
            "description": "reimbursement_set_range",
            "receipt": joReceipt
        } );
    }
    // print_gas_usage_report_from_array( "REIMBURSEMENT_SET_RANGE", jarrReceipts );
    return true;
}

const IMA = {
    toURL: toURL,
    validateURL: validateURL,
    is_http_url: is_http_url,
    is_ws_url: is_ws_url,
    do_connect: do_connect,
    do_connect_if_needed: do_connect_if_needed,
    do_call: do_call,
    rpc_call_create: rpc_call_create,
    generate_random_integer_in_range: generate_random_integer_in_range,
    generate_random_rpc_call_id: generate_random_rpc_call_id,
    enrich_top_level_json_fields: enrich_top_level_json_fields,
    TransactionCustomizer: ima_TransactionCustomizer,
    Chain: ima_chain,
    ensure_starts_with_0x: ensure_starts_with_0x,
    remove_starting_0x: remove_starting_0x,
    private_key_2_public_key: private_key_2_public_key,
    public_key_2_account_address: public_key_2_account_address,
    private_key_2_account_address: private_key_2_account_address,
    fn_address_impl_: fn_address_impl_,
    get_account_wallet_address: get_account_wallet_address,
    safeURL: safeURL,
    w3provider_2_url: w3provider_2_url,
    w3_2_url: w3_2_url,
    parseIntSafer: parseIntSafer,
    wait_for_next_block_to_appear: wait_for_next_block_to_appear,
    sleep: sleep,
    disableAutomaticDeployERC20: ima_disableAutomaticDeployERC20,
    disableAutomaticDeployERC721: ima_disableAutomaticDeployERC721,
    addERC20TokenByOwnerMN: ima_addERC20TokenByOwnerMN,
    addERC721TokenByOwnerMN: ima_addERC721TokenByOwnerMN,
    addERC20TokenByOwnerSC: ima_addERC20TokenByOwnerSC,
    addERC721TokenByOwnerSC: ima_addERC721TokenByOwnerSC,
    getETHbalance: ima_getETHbalance,
    getERC20balance: ima_getERC20balance,
    getERC721ownerOf: ima_getERC721ownerOf,
    depositETHtoSchain: ima_depositETHtoSchain,
    depositERC20toSchain: ima_depositERC20toSchain,
    depositERC721toSchain: ima_depositERC721toSchain,
    withdrawETHfromSchain: ima_withdrawETHfromSchain,
    withdrawERC20fromSchain: ima_withdrawERC20fromSchain,
    withdrawERC721fromSchain: ima_withdrawERC721fromSchain,
    viewETHtoReceive: ima_viewETHtoReceive,
    receiveETH: ima_receiveETH,
    reimbursementGetBalance: ima_reimbursementGetBalance,
    reimbursementWalletRecharge: ima_reimbursementWalletRecharge,
    reimbursementWalletWithdraw: ima_reimbursementWalletWithdraw,
    reimbursementSetRange: ima_reimbursementSetRange
};

if( typeof module != "undefined" && "exports" in module )
    module.exports.IMA = IMA;

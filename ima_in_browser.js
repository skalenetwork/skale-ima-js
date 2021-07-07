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
 * @file ima_in_browser.js
 * @copyright SKALE Labs 2019-Present
 */

function clear_log() {
    document.getElementById( "idLog" ).innerHTML = "";
}

function write_log() {
    const args = Array.prototype.slice.call( arguments );
    const s = args.join( " " ) + "<br>";
    document.getElementById( "idLog" ).innerHTML += s;
    window.scrollTo( 0, document.body.scrollHeight );
}

const w3mod = Web3;

let pk_mn = "23ABDBD3C61B5330AF61EBE8BEF582F4E5CC08E554053A718BDCE7813B9DC1FC"; // address 0x7aa5E36AA15E93D10F4F26357C30F052DacDde5F
const pk_sc = "80ebc2e00b8f13c5e2622b5694ab63ee80f7c5399554d2a12feeb0212eb8c69e"; // address 0x66c5a87f4a49DD75e970055A265E8dd5C3F8f852
let url_mn = "http://127.0.0.1:8545";
const url_sc_00 = "http://127.0.0.1:15000";
// let url_sc_01 = "http://127.0.0.1:15100";
const path_abi_mn = "./test_data/proxyMainnet.json";
const path_abi_sc = "./test_data/proxySchain_Bob.json";
let chain_name_mn = "Mainnet";
let chain_name_sc = "Bob";
let chain_id_mn = 456;
let chain_id_sc = 123;

function getWeb3FromURL( strURL ) {
    let w3 = null;
    try {
        const u = safeURL( strURL );
        const strProtocol = u.protocol.trim().toLowerCase().replace( ":", "" ).replace( "/", "" );
        if( strProtocol == "ws" || strProtocol == "wss" ) {
            const w3ws = new w3mod.providers.WebsocketProvider( strURL );
            w3 = new w3mod( w3ws );
        } else {
            const w3http = new w3mod.providers.HttpProvider( strURL );
            w3 = new w3mod( w3http );
        }
    } catch ( err ) {
        w3 = null;
        write_log( "CRITICAL ERROR: Failed to initialize Web3 from URL \"" + strURL + "\":", err );
    }
    return w3;
}

let g_strLastAccountAddressInMetamask = "";
async function getWeb3FromMetamask() {
    try {
        if( typeof window.ethereum == "undefined" )
            throw new Error( "Metamask is not available" );
        window.ethereum.autoRefreshOnNetworkChange = false;
        const accounts = await window.ethereum.enable();
        write_log( "Metamask did provided accounts:", accounts );
        if( accounts.length < 1 )
            throw new Error( "no accounts found" );
        g_strLastAccountAddressInMetamask = "" + accounts[0].toString();
        w3 = new Web3( window.ethereum );
    } catch ( err ) {
        w3 = null;
        write_log( "CRITICAL ERROR: Failed to initialize Web3 from Metamask:", err );
    }
    return w3;
}

async function init_inputs() {
    load_inputs_mn();
    load_inputs_sc();
    document.getElementById( "idPrivateKeyMN" ).addEventListener( "input", onchange_pk_mn );
    document.getElementById( "idPrivateKeySC" ).addEventListener( "input", onchange_pk_mn );
    document.getElementById( "idUrlMN" ).addEventListener( "input", onchange_url_mn );
    document.getElementById( "idUrlSC" ).addEventListener( "input", onchange_url_sc );
    document.getElementById( "idChainNameMN" ).addEventListener( "input", onchange_chain_name_mn );
    document.getElementById( "idChainNameSC" ).addEventListener( "input", onchange_chain_name_sc );
    document.getElementById( "idChainIdMN" ).addEventListener( "input", onchange_chain_id_mn );
    document.getElementById( "idChainIdSC" ).addEventListener( "input", onchange_chain_id_sc );
    document.getElementById( "idValueReimbursement" ).value = 0;
    const weiAmount = "1000000000000000000";
    document.getElementById( "idValueWei" ).value = weiAmount;
    const tokenAmount = 1000;
    document.getElementById( "idValueAmountERC20" ).value = tokenAmount;
    document.getElementById( "idValueAmountERC1155" ).value = tokenAmount;
    document.getElementById( "idValuesAmountsERC1155" ).value = [ tokenAmount,tokenAmount,tokenAmount ].join( "," );
    const tokenID = 1;
    document.getElementById( "idValueIdOfERC721" ).value = tokenID;
    document.getElementById( "idValueIdOfERC1155" ).value = tokenID;
    document.getElementById( "idValuesIDsOfERC1155" ).value = "1,2,3";
    await init_mn_direct();
    await init_sc_direct();
    await load_tokens();
    await show_balance_eth();
    await show_balance_erc20();
    await show_balance_erc721();
    await show_balance_erc1155();
    document.getElementById( "idValueIdOfERC721" ).addEventListener( "input", show_balance_erc721 );
    document.getElementById( "idValueIdOfERC1155" ).addEventListener( "input", show_balance_erc1155 );
    document.getElementById( "idValuesIDsOfERC1155" ).addEventListener( "input", show_balance_erc1155 );
}

function load_inputs_mn() {
    document.getElementById( "idPrivateKeyMN" ).value = pk_mn.toLowerCase();
    try {
        document.getElementById( "idAddressMN" ).value = IMA.private_key_2_account_address( w3mod, pk_mn ).toLowerCase();
    } catch ( err ) {
        document.getElementById( "idAddressMN" ).value = "Error: " + err.toString();
    }
    document.getElementById( "idUrlMN" ).value = url_mn;
    document.getElementById( "idChainNameMN" ).value = chain_name_mn;
    document.getElementById( "idChainIdMN" ).value = chain_id_mn;
}
function load_inputs_sc() {
    document.getElementById( "idPrivateKeySC" ).value = pk_sc.toLowerCase();
    try {
        document.getElementById( "idAddressSC" ).value = IMA.private_key_2_account_address( w3mod, pk_sc ).toLowerCase();
    } catch ( err ) {
        document.getElementById( "idAddressSC" ).value = "Error: " + err.toString();
    }
    document.getElementById( "idUrlSC" ).value = url_sc_00;
    document.getElementById( "idChainNameSC" ).value = chain_name_sc;
    document.getElementById( "idChainIdSC" ).value = chain_id_sc;
}

function onchange_pk_mn() {
    pk_mn = document.getElementById( "idPrivateKeyMN" ).value.trim();
    load_inputs_mn();
    init_mn_direct();
    show_balance_mn();
}
function onchange_pk_sc() {
    pk_mn = document.getElementById( "idPrivateKeySC" ).value.trim();
    load_inputs_sc();
    init_sc_direct();
    show_balance_sc();
}

function onchange_url_mn() {
    url_mn = document.getElementById( "idUrlMN" ).value;
    load_inputs_mn();
}
function onchange_url_sc() {
    url_sc = document.getElementById( "idUrlSC" ).value;
    load_inputs_sc();
}

function onchange_chain_name_mn() {
    chain_name_mn = document.getElementById( "idChainNameMN" ).value;
    load_inputs_mn();
    load_inputs_sc();
}
function onchange_chain_name_sc() {
    chain_name_sc = document.getElementById( "idChainNameSC" ).value;
    load_inputs_sc();
}

function onchange_chain_id_mn() {
    chain_id_mn = document.getElementById( "idChainIdMN" ).value;
    load_inputs_mn();
}
function onchange_chain_id_sc() {
    chain_id_sc = document.getElementById( "idChainIdSC" ).value;
    load_inputs_sc();
}

async function show_reimbursement_balance() {
    const nValue = await IMA.reimbursementGetBalance( mn, addr_mn, /*sc.chainName*/ chain_name_sc );
    document.getElementById( "idValueReimbursement" ).value = nValue;
}

//run_m2s_eth_direct
async function reimbursement_recharge_direct() {
    try {
        const nValue = document.getElementById( "idValueReimbursement" ).value;
        write_log( "<h3 class=\"test_header\">Reimbursement - Recharge Wallet</h3>" );
        write_log( "Reimbursement recharge with", nValue, "wei..." );
        await init_mn_direct();
        await init_sc_direct();
        await IMA.reimbursementWalletRecharge(
            mn,
            joAccountMN,
            /*sc.chainName*/ chain_name_sc,
            nValue,
            opts
        );
        write_log( "Reimbursement recharge with", nValue, "wei, Done." );
    } catch ( err ) {
        write_log( "Reimbursement exception:", err.message );
    }
    show_balance_eth();
}
async function reimbursement_recharge_metamask() {
    try {
        const nValue = document.getElementById( "idValueReimbursement" ).value;
        write_log( "<h3 class=\"test_header\">Reimbursement - Recharge Wallet</h3>" );
        write_log( "Reimbursement recharge with", nValue, "wei..." );
        await init_mn_metamask();
        await init_sc_direct();
        await IMA.reimbursementWalletRecharge(
            mn,
            joAccountMN,
            /*sc.chainName*/ chain_name_sc,
            nValue,
            opts
        );
        write_log( "Reimbursement recharge with", nValue, "wei, Done." );
    } catch ( err ) {
        write_log( "Reimbursement exception:", err.message );
    }
    show_balance_eth();
}

async function reimbursement_withdraw_direct() {
    try {
        const nValue = document.getElementById( "idValueReimbursement" ).value;
        write_log( "<h3 class=\"test_header\">Reimbursement - Withdraw Wallet</h3>" );
        write_log( "Reimbursement wallet withdraw with", nValue, "wei..." );
        await init_mn_direct();
        await init_sc_direct();
        await IMA.reimbursementWalletWithdraw(
            mn,
            joAccountMN,
            /*sc.chainName*/ chain_name_sc,
            nValue,
            opts
        );
        write_log( "Reimbursement wallet withdraw with", nValue, "wei, Done." );
    } catch ( err ) {
        write_log( "Reimbursement exception:", err.message );
    }
    show_balance_eth();
}
async function reimbursement_withdraw_metamask() {
    try {
        const nValue = document.getElementById( "idValueReimbursement" ).value;
        write_log( "<h3 class=\"test_header\">Reimbursement - Withdraw Wallet</h3>" );
        write_log( "Reimbursement wallet withdraw with", nValue, "wei..." );
        await init_mn_metamask();
        await init_sc_direct();
        await IMA.reimbursementWalletWithdraw(
            mn,
            joAccountMN,
            /*sc.chainName*/ chain_name_sc,
            nValue,
            opts
        );
        write_log( "Reimbursement wallet withdraw with", nValue, "wei, Done." );
    } catch ( err ) {
        write_log( "Reimbursement exception:", err.message );
    }
    show_balance_eth();
}

let ethBalanceMN = 0, ethBalanceSC = 0, ethCanReceiveMN = 0;
async function show_balance_eth_mn() {
    ethBalanceMN = await IMA.getETHbalance( mn, addr_mn );
    document.getElementById( "idBalanceWeiMN" ).value = ethBalanceMN;
}
async function show_balance_eth_sc() {
    ethBalanceSC = await IMA.getETHbalance( sc, addr_sc );
    document.getElementById( "idBalanceWeiSC" ).value = ethBalanceSC;
}
async function show_can_receive_eth_mn() {
    ethCanReceiveMN = await IMA.viewETHtoReceive( mn, addr_mn );
    document.getElementById( "idCanReceiveWeiMN" ).value = ethCanReceiveMN;
}
async function show_balance_eth() {
    await show_balance_eth_mn();
    await show_balance_eth_sc();
    await show_can_receive_eth_mn();
    await show_reimbursement_balance();
}
async function print_eth_balance_mn() {
    ethBalanceMN = await IMA.getETHbalance( mn, addr_mn );
    write_log( "Main NET real ETH balance for", addr_mn, "is", ethBalanceMN );
}
async function print_eth_balance_sc() {
    ethBalanceSC = await IMA.getETHbalance( sc, addr_sc );
    write_log( "S-CHain  real ETH balance for", addr_sc, "is", ethBalanceSC );
}
async function print_eth_balances() {
    await print_eth_balance_mn();
    await print_eth_balance_sc();
}
async function print_eth_can_receive_mn() {
    ethCanReceiveMN = await IMA.viewETHtoReceive( mn, addr_mn );
    write_log( "Can receive on Main NET for", addr_sc, "is", ethCanReceiveMN );
}
async function wait_for_eth_balance_changed( chain, addr, oldBalance ) {
    write_log( "Waiting for ETH balance changed for", addr, "on chain", chain.chainName, "..." );
    for( ; true; ) {
        const newBalance = await IMA.getETHbalance( chain, addr );
        if( newBalance != oldBalance )
            break;
        await IMA.sleep( 1000 );
    }
}
async function wait_eth_can_receive_mn_changed() {
    write_log( "Waiting for MN/ETH to receive changed..." );
    for( ; true; ) {
        const ethCanReceiveMN_new = await IMA.viewETHtoReceive( mn, addr_mn );
        if( ethCanReceiveMN_new.toString() != ethCanReceiveMN.toString() )
            break;
        await IMA.sleep( 1000 );
    }
};

let erc20balanceMN = 0, erc20balanceSC = 0;
async function show_balance_erc20_mn() {
    erc20balanceMN = await IMA.getERC20balance( mn, addr_mn, tokenERC20MN );
    document.getElementById( "idBalanceAmountMN" ).value = erc20balanceMN;
}
async function show_balance_erc20_sc() {
    erc20balanceSC = await IMA.getERC20balance( sc, addr_sc, tokenERC20SC );
    document.getElementById( "idBalanceAmountSC" ).value = erc20balanceSC;
}
async function show_balance_erc20() {
    await show_balance_erc20_mn();
    await show_balance_erc20_sc();
}
async function print_erc20_balance_mn() {
    erc20balanceMN = await IMA.getERC20balance( mn, addr_mn, tokenERC20MN );
    write_log( "Main NET ERC20 balance for", addr_mn, "is", erc20balanceMN );
}
async function print_erc20_balance_sc() {
    erc20balanceSC = await IMA.getERC20balance( sc, addr_sc, tokenERC20SC );
    write_log( "S-CHain  ERC20 balance for", addr_sc, "is", erc20balanceSC );
}
async function print_erc20_balances() {
    await print_erc20_balance_mn();
    await print_erc20_balance_sc();
}
async function wait_erc20_balance_changed( chain, addr, tokenERC20, oldBalance ) {
    write_log( "Waiting for ERC20 balance changed for", addr, "on chain", chain.chainName, "..." );
    for( ; true; ) {
        const newBalance = await IMA.getERC20balance( chain, addr, tokenERC20 );
        if( newBalance.toString() != oldBalance.toString() )
            break;
        await IMA.sleep( 1000 );
    }
}

let erc721ownerMN = null, erc721ownerSC = null;
async function show_balance_erc721_mn() {
    const tokenID = document.getElementById( "idValueIdOfERC721" ).value.trim();
    erc721ownerMN = await IMA.getERC721ownerOf( mn, addr_mn, tokenERC721MN, tokenID );
    document.getElementById( "id721ownerMN" ).value = erc721ownerMN;
}
async function show_balance_erc721_sc() {
    const tokenID = document.getElementById( "idValueIdOfERC721" ).value.trim();
    erc721ownerSC = await IMA.getERC721ownerOf( sc, addr_sc, tokenERC721SC, tokenID );
    document.getElementById( "id721ownerSC" ).value = erc721ownerSC;
}
async function show_balance_erc721() {
    await show_balance_erc721_mn();
    await show_balance_erc721_sc();
}
async function print_erc721_owner_mn() {
    const tokenID = document.getElementById( "idValueIdOfERC721" ).value.trim();
    erc721ownerMN = await IMA.getERC721ownerOf( mn, addr_mn, tokenERC721MN, tokenID );
    write_log( "ERC721 token ID " + tokenID + " owner on MN is " + erc721ownerMN );
}
async function print_erc721_owner_sc() {
    const tokenID = document.getElementById( "idValueIdOfERC721" ).value.trim();
    erc721ownerSC = await IMA.getERC721ownerOf( sc, addr_sc, tokenERC721SC, tokenID );
    write_log( "ERC721 token ID " + tokenID + " owner on SC is " + erc721ownerSC );
}
async function print_erc721_owners() {
    await print_erc721_owner_mn();
    await print_erc721_owner_sc();
}
async function wait_erc721_owner_changed( chain, addr, tokenERC721, oldOwner ) {
    const tokenID = document.getElementById( "idValueIdOfERC721" ).value.trim();
    write_log( "Waiting for ERC721 owner changed on chain", chain.chainName, "..." );
    for( ; true; ) {
        const newOwner = await IMA.getERC721ownerOf( chain, addr, tokenERC721, tokenID );
        if( newOwner.toString() != oldOwner.toString() )
            break;
        await IMA.sleep( 1000 );
    }
}

let erc1155balanceMN = 0, erc1155balanceSC = 0;
let batchErc1155balanceMN = null, batchErc1155balanceSC = null;
async function show_balance_erc1155_mn() {
    const tokenID = document.getElementById( "idValueIdOfERC1155" ).value.trim();
    erc1155balanceMN = await IMA.getERC1155balance( mn, addr_mn, tokenERC1155MN, tokenID );
    document.getElementById( "idBalanceAmountMN1155" ).value = erc1155balanceMN;
    //
    const arrTokenIDs = document.getElementById( "idValuesIDsOfERC1155" ).value.trim().split( "," );
    const arrWalletAddressesMN = [];
    for( let i = 0; i < arrTokenIDs.length; ++ i )
        arrWalletAddressesMN.push( addr_mn );
    document.getElementById( "idBalancesAmountsMN1155" ).value = ( await IMA.getERC1155balanceOfBatch( mn, arrWalletAddressesMN, tokenERC1155MN, arrTokenIDs ) ).join( "," );
}
async function show_balance_erc1155_sc() {
    const tokenID = document.getElementById( "idValueIdOfERC1155" ).value.trim();
    erc1155balanceSC = await IMA.getERC1155balance( sc, addr_sc, tokenERC1155SC, tokenID );
    document.getElementById( "idBalanceAmountSC1155" ).value = erc1155balanceSC;
    //
    const arrTokenIDs = document.getElementById( "idValuesIDsOfERC1155" ).value.trim().split( "," );
    const arrWalletAddressesSC = [];
    for( let i = 0; i < arrTokenIDs.length; ++ i )
        arrWalletAddressesSC.push( addr_sc );
    document.getElementById( "idBalancesAmountsSC1155" ).value = ( await IMA.getERC1155balanceOfBatch( sc, arrWalletAddressesSC, tokenERC1155MN, arrTokenIDs ) ).join( "," );
}
async function show_balance_erc1155() {
    await show_balance_erc1155_mn();
    await show_balance_erc1155_sc();
}
async function print_erc1155_balance_mn() {
    const tokenID = document.getElementById( "idValueIdOfERC1155" ).value.trim();
    erc1155balanceMN = await IMA.getERC1155balance( mn, addr_mn, tokenERC1155MN, tokenID );
    write_log( "Main NET ERC1155 balance for", addr_mn, "is", erc1155balanceMN );
}
async function print_erc1155_balance_sc() {
    const tokenID = document.getElementById( "idValueIdOfERC1155" ).value.trim();
    erc1155balanceSC = await IMA.getERC1155balance( sc, addr_sc, tokenERC1155SC, tokenID );
    write_log( "S-CHain  ERC1155 balance for", addr_sc, "is", erc1155balanceSC );
}
async function print_erc1155_balances() {
    await print_erc1155_balance_mn();
    await print_erc1155_balance_sc();
}
async function wait_erc1155_balance_changed( chain, addr, tokenERC1155, oldBalance ) {
    const tokenID = document.getElementById( "idValueIdOfERC1155" ).value.trim();
    write_log( "Waiting for ERC1155 balance changed for", addr, "on chain", chain.chainName, "..." );
    for( ; true; ) {
        const newBalance = await IMA.getERC1155balance( chain, addr, tokenERC1155, tokenID );
        if( newBalance.toString() != oldBalance.toString() )
            break;
        await IMA.sleep( 1000 );
    }
}
async function print_batch_erc1155_balances() {
    const arrTokenIDs = document.getElementById( "idValuesIDsOfERC1155" ).value.trim().split( "," );
    const arrWalletAddressesMN = [];
    for( let i = 0; i < arrTokenIDs.length; ++ i )
        arrWalletAddressesMN.push( addr_mn );
    const arrWalletAddressesSC = [];
    for( let i = 0; i < arrTokenIDs.length; ++ i )
        arrWalletAddressesSC.push( addr_sc );
    batchErc1155balanceMN = await IMA.getERC1155balanceOfBatch( mn, arrWalletAddressesMN, tokenERC1155MN, arrTokenIDs );
    batchErc1155balanceSC = await IMA.getERC1155balanceOfBatch( sc, arrWalletAddressesSC, tokenERC1155SC, arrTokenIDs );
    write_log( "Main NET ERC1155 batch balances of tokens " + JSON.stringify( arrTokenIDs ) + " for", addr_mn, "is", batchErc1155balanceMN );
    write_log( "S-CHain  ERC1155 batch balances of tokens " + JSON.stringify( arrTokenIDs ) + " for", addr_sc, "is", batchErc1155balanceSC );
}
async function wait_batch_erc1155_balance_changed( chain, arrWalletAddresses, tokenERC1155, arrTokenIDs, arrOldBalances ) {
    write_log( "Waiting for batch ERC1155 balances changed for", arrWalletAddresses[0], "on chain", chain.chainName, "..." );
    for( ; true; ) {
        const arrNewBalances = await IMA.getERC1155balanceOfBatch( chain, arrWalletAddresses, tokenERC1155, arrTokenIDs );
        if( JSON.stringify( arrNewBalances ) != JSON.stringify( arrOldBalances ) )
            break;
        await IMA.sleep( 1000 );
    }
}

async function show_balance_mn() {
    await show_balance_eth_mn();
    await show_can_receive_eth_mn();
    await show_reimbursement_balance();
    await show_balance_erc20_mn();
    await show_balance_erc721_mn();
    await show_balance_erc1155_mn();
}
async function show_balance_sc() {
    await show_balance_eth_sc();
    await show_balance_erc20_sc();
    await show_balance_erc721_sc();
    await show_balance_erc1155_sc();
}
async function show_balance() {
    await show_balance_mn();
    await show_balance_sc();
}

async function async_load_test_tokens( opts ) {
    if( opts.strTruffleNetworkName == "mn" ) {
        opts.joABI = await ( await fetch( opts.strFolderTestTokensData + "/TestTokens.abi.mn.json" ) ).json();
        opts.contractERC20 = new opts.mn.w3.eth.Contract( opts.joABI.ERC20_abi, opts.joABI.ERC20_address );
        opts.contractERC721 = new opts.mn.w3.eth.Contract( opts.joABI.ERC721_abi, opts.joABI.ERC721_address );
        opts.contractERC1155 = new opts.mn.w3.eth.Contract( opts.joABI.ERC1155_abi, opts.joABI.ERC1155_address );
    } else if( opts.strTruffleNetworkName == "sc00" ) {
        opts.joABI = await ( await fetch( opts.strFolderTestTokensData + "/TestTokens.abi.sc00.json" ) ).json();
        opts.contractERC20 = new opts.sc.w3.eth.Contract( opts.joABI.ERC20_abi, opts.joABI.ERC20_address );
        opts.contractERC721 = new opts.sc.w3.eth.Contract( opts.joABI.ERC721_abi, opts.joABI.ERC721_address );
        opts.contractERC1155 = new opts.sc.w3.eth.Contract( opts.joABI.ERC1155_abi, opts.joABI.ERC1155_address );
    }
}

let mn = null,
    sc = null,
    addr_mn = null,
    addr_sc = null,
    joAccountMN = null,
    joAccountSC = null;

const opts = {
    isIgnoreDRC: false, // for ETH M<->S
    isIgnoreDRC_approve: false, // for ERC20 M<->S, ERC721 M->S
    isIgnoreDRC_rawDepositERC20: false, // for ERC20 M->S
    isIgnoreDRC_rawExitToMainERC20: false, // for ERC20 S->M
    isIgnoreDRC_rawDepositERC721: false, // for ERC721 M->S
    isIgnoreDRC_rawExitToMainERC721: false, // for ERC721 S->M
    isIgnoreDRC_rawDepositER1155: false, // for ERC20 M->S
    isIgnoreDRC_rawExitToMainERC1155: false, // for ERC20 S->M
    isIgnoreDRC_rawDepositER1155Batch: false, // for ERC20 M->S
    isIgnoreDRC_rawExitToMainERC1155Batch: false, // for ERC20 S->M
    isIgnoreDRC_transferFrom: false, // for ERC721 S->M
    transactionCustomizer: null
};

async function init_mn_direct() {
    mn = new IMA.Chain(
        getWeb3FromURL( url_mn ),
        await ( await fetch( path_abi_mn ) ).json(),
        chain_name_mn,
        chain_id_mn
    );
    addr_mn = IMA.private_key_2_account_address( w3mod, pk_mn );
    joAccountMN = {
        privateKey: pk_mn
    };
    load_inputs_mn();
    await show_balance_eth_mn();
    await show_can_receive_eth_mn();
    await show_reimbursement_balance();
    init_token_aliases();
}

async function init_mn_metamask() {
    mn = new IMA.Chain(
        await getWeb3FromMetamask(),
        await ( await fetch( path_abi_mn ) ).json(),
        chain_name_mn,
        chain_id_mn
    );
    addr_mn = "" + g_strLastAccountAddressInMetamask;
    joAccountMN = {
        address_: "" + g_strLastAccountAddressInMetamask,
        w3: mn.w3,
        ethereum: window.ethereum,
        isMetamask: true
    };
    load_inputs_mn();
    await show_balance_eth_mn();
    await show_can_receive_eth_mn();
    await show_reimbursement_balance();
    init_token_aliases();
}

async function init_sc_direct() {
    sc = new IMA.Chain(
        getWeb3FromURL( url_sc_00 ),
        await ( await fetch( path_abi_sc ) ).json(),
        chain_name_sc,
        chain_id_sc
    );
    addr_sc = IMA.private_key_2_account_address( w3mod, pk_sc );
    joAccountSC = {
        privateKey: pk_sc
    };
    load_inputs_sc();
    await show_balance_eth_sc();
    init_token_aliases();
}

async function init_sc_metamask() {
    sc = new IMA.Chain(
        await getWeb3FromMetamask(),
        await ( await fetch( path_abi_sc ) ).json(),
        chain_name_sc,
        chain_id_sc
    );
    addr_sc = "" + g_strLastAccountAddressInMetamask;
    joAccountSC = {
        address_: "" + g_strLastAccountAddressInMetamask,
        w3: sc.w3,
        ethereum: window.ethereum,
        isMetamask: true
    };
    load_inputs_sc();
    await show_balance_eth_sc();
    init_token_aliases();
}

let tokenInfoERC20MN = null;
let tokenInfoERC20SC = null;
let tokenInfoERC721MN = null;
let tokenInfoERC721SC = null;
let tokenInfoERC1155MN = null;
let tokenInfoERC1155SC = null;
let tokenERC20MN = null;
let tokenERC20SC = null;
let tokenERC721MN = null;
let tokenERC721SC = null;
let tokenERC1155MN = null;
let tokenERC1155SC = null;

let g_bTokensLoaded = false,
    tokensMN = null,
    tokensSC = null;

async function load_tokens() {
    if( g_bTokensLoaded )
        return false;
    try {
        const strFolderTestTokens = "./test_tokens";
        const strFolderTestTokensData = strFolderTestTokens + "/data";
        tokensMN = {
            IMA: IMA,
            mn: mn,
            sc: sc,
            strFolderTestTokens: strFolderTestTokens,
            strFolderTestTokensData: strFolderTestTokensData,
            strTruffleNetworkName: "mn",
            strDeployerPrivateKeyMN: pk_mn,
            strDeployerPrivateKeySC: pk_sc,
            strMintToAddress: addr_mn,
            isMint: true,
            joABI: null,
            contractERC20: null,
            contractERC721: null,
            contractERC1155: null
        };
        tokensSC = {
            tokensMN: tokensMN, // must-have additional reference option for S-Chain deployment only
            IMA: IMA,
            mn: mn,
            sc: sc,
            strFolderTestTokens: strFolderTestTokens,
            strFolderTestTokensData: strFolderTestTokensData,
            strTruffleNetworkName: "sc00",
            strDeployerPrivateKeyMN: pk_mn,
            strDeployerPrivateKeySC: pk_sc,
            strMintToAddress: addr_sc,
            isMint: false,
            joABI: null,
            contractERC20: null,
            contractERC721: null,
            contractERC1155: null
        };
        write_log( "Will load test token ABIs..." );
        await async_load_test_tokens( tokensMN );
        // write_log( JSON.stringify( tokensMN.joABI ) );
        write_log( "MN tokens loaded." );
        await async_load_test_tokens( tokensSC );
        // write_log( JSON.stringify( tokensSC.joABI ) );
        write_log( "SC tokens loaded." );
        // opts.weiReserve = "100000000000000000"; // 100 finney, 1 finney is 1000000000000000
        //
        //
        tokenInfoERC20MN = { abi: tokensMN.joABI.ERC20_abi, address: tokensMN.joABI.ERC20_address };
        tokenInfoERC20SC = { abi: tokensSC.joABI.ERC20_abi, address: tokensSC.joABI.ERC20_address };
        tokenInfoERC721MN = { abi: tokensMN.joABI.ERC721_abi, address: tokensMN.joABI.ERC721_address };
        tokenInfoERC721SC = { abi: tokensSC.joABI.ERC721_abi, address: tokensSC.joABI.ERC721_address };
        tokenInfoERC1155MN = { abi: tokensMN.joABI.ERC1155_abi, address: tokensMN.joABI.ERC1155_address };
        tokenInfoERC1155SC = { abi: tokensSC.joABI.ERC1155_abi, address: tokensSC.joABI.ERC1155_address };
        tokenERC20MN = tokenInfoERC20MN; // use token info object
        tokenERC20SC = tokenInfoERC20SC; // use token info object
        tokenERC721MN = tokenInfoERC721MN; // use token info object
        tokenERC721SC = tokenInfoERC721SC; // use token info object
        tokenERC1155MN = tokenInfoERC1155MN; // use token info object
        tokenERC1155SC = tokenInfoERC1155SC; // use token info object
        init_token_aliases();
        //
        //
        g_bTokensLoaded = true;
        await show_balance();
    } catch ( err ) {
        write_log( "Tokens load exception:", err );
    }
}

function init_token_aliases() {
    //
    // Register/use token aliases (comment this block to use token info objects as is)
    //
    if( mn ) {
        if( tokenInfoERC20MN ) {
            mn.defineTokenAlias( tokenInfoERC20MN.abi, tokenInfoERC20MN.address, "MyERC20" );
            tokenERC20MN = "MyERC20"; // use token alias
        }
        if( tokenInfoERC721MN ) {
            mn.defineTokenAlias( tokenInfoERC721MN.abi, tokenInfoERC721MN.address, "MyERC721" );
            tokenERC721MN = "MyERC721"; // use token alias
        }
        if( tokenInfoERC1155MN ) {
            mn.defineTokenAlias( tokenInfoERC1155MN.abi, tokenInfoERC1155MN.address, "MyERC1155" );
            tokenERC1155MN = "MyERC1155"; // use token alias
        }
    }
    if( sc ) {
        if( tokenInfoERC20SC ) {
            sc.defineTokenAlias( tokenInfoERC20SC.abi, tokenInfoERC20SC.address, "MyERC20" );
            tokenERC20SC = "MyERC20"; // use token alias
        }
        if( tokenInfoERC721SC ) {
            sc.defineTokenAlias( tokenInfoERC721SC.abi, tokenInfoERC721SC.address, "MyERC721" );
            tokenERC721SC = "MyERC721"; // use token alias
        }
        if( tokenInfoERC1155SC ) {
            sc.defineTokenAlias( tokenInfoERC1155SC.abi, tokenInfoERC1155SC.address, "MyERC1155" );
            tokenERC1155SC = "MyERC1155"; // use token alias
        }
    }
}

async function run_receive_eth_mn() {
    try {
        write_log( "<h3 class=\"test_header\">Receive ETH on MN</h3>" );
        await show_balance_eth();
        await print_eth_can_receive_mn();
        await IMA.receiveETH( mn, joAccountMN, opts );
        await wait_for_eth_balance_changed( mn, addr_mn, ethBalanceMN );
        await print_eth_can_receive_mn();
        await print_eth_balance_mn();
        write_log( "Done." );
        await show_balance_eth();
    } catch ( err ) {
        write_log( "Receive exception:", err.message );
    }
}

async function run_all() {

    //
    // Chains, Accounts, Test Tokens
    //
    await init_mn_direct();
    await init_sc_direct();
    await load_tokens();

    try {
        write_log( "<h3 class=\"test_header\">All Transfer Test</h3>" );

        //
        // ETH
        //
        await show_balance_eth();
        await print_eth_balances();
        const weiAmount = document.getElementById( "idValueWei" ).value.trim();
        write_log( "M2S ETH transfer of wei amount " + weiAmount + "..." );
        await IMA.depositETHtoSchain( mn, sc, joAccountMN, joAccountSC, weiAmount, opts );
        await wait_for_eth_balance_changed( sc, addr_sc, ethBalanceSC );
        await show_balance_eth();
        await print_eth_balances();
        write_log( "S2M ETH transfer of wei amount " + weiAmount + "..." );
        await IMA.withdrawETHfromSchain( sc, mn, joAccountSC, joAccountMN, weiAmount, opts );
        await wait_eth_can_receive_mn_changed();
        await print_eth_can_receive_mn();
        await print_eth_balances();
        await show_balance_eth();
        await print_eth_can_receive_mn();
        await IMA.receiveETH( mn, joAccountMN, opts );
        await wait_for_eth_balance_changed( mn, addr_mn, ethBalanceMN );
        await print_eth_balances();
        await show_balance_eth();

        //
        // ERC20
        //
        let tokenAmount = document.getElementById( "idValueAmountERC20" ).value.trim();
        await show_balance_erc20();
        await print_erc20_balances();
        write_log( "M2S ERC20 transfer of token amount " + tokenAmount + "..." );
        await IMA.depositERC20toSchain( mn, sc, joAccountMN, joAccountSC, tokenERC20MN, tokenAmount, opts );
        await wait_erc20_balance_changed( sc, addr_sc, tokenERC20SC, erc20balanceSC );
        await show_balance_erc20();
        await print_erc20_balances();
        write_log( "S2M ERC20 transfer of token amount " + tokenAmount + "..." );
        await IMA.withdrawERC20fromSchain( sc, mn, joAccountSC, joAccountMN, tokenERC20SC, tokenERC20MN, tokenAmount, opts );
        await wait_erc20_balance_changed( sc, addr_sc, tokenERC20SC, erc20balanceSC );
        await show_balance_erc20();
        await print_erc20_balances();

        //
        // ERC721
        //
        let tokenID = document.getElementById( "idValueIdOfERC721" ).value.trim();
        await show_balance_erc721();
        await print_erc721_owners();
        write_log( "M2S ERC721 transfer of token ID " + tokenID + "..." );
        await IMA.depositERC721toSchain( mn, sc, joAccountMN, joAccountSC, tokenERC721MN, tokenID, opts );
        await wait_erc721_owner_changed( sc, addr_sc, tokenERC721SC, erc721ownerSC );
        await show_balance_erc721();
        await print_erc721_owners();
        write_log( "S2M ERC721 transfer of token ID " + tokenID + "..." );
        await IMA.withdrawERC721fromSchain( sc, mn, joAccountSC, joAccountMN, tokenERC721SC, tokenERC721MN, tokenID, opts );
        await wait_erc721_owner_changed( mn, addr_mn, tokenERC721MN, erc721ownerMN );
        await show_balance_erc721();
        await print_erc721_owners();

        //
        // ERC1155
        //
        tokenID = document.getElementById( "idValueIdOfERC1155" ).value.trim();
        tokenAmount = document.getElementById( "idValueAmountERC1155" ).value.trim();
        await show_balance_erc1155();
        await print_erc1155_balances();
        write_log( "M2S ERC1155 transfer of token amount " + tokenAmount + "..." );
        await IMA.depositERC1155toSchain( mn, sc, joAccountMN, joAccountSC, tokenERC1155MN, tokenID, tokenAmount, opts );
        await wait_erc1155_balance_changed( sc, addr_sc, tokenERC1155SC, erc1155balanceSC );
        await show_balance_erc1155();
        await print_erc1155_balances();
        write_log( "S2M ERC1155 transfer of token amount " + tokenAmount + "..." );
        await IMA.withdrawERC1155fromSchain( sc, mn, joAccountSC, joAccountMN, tokenERC1155SC, tokenERC1155MN, tokenID, tokenAmount, opts );
        await wait_erc1155_balance_changed( mn, addr_mn, tokenERC1155MN, erc1155balanceMN );
        await show_balance_erc1155();
        await print_erc1155_balances();

        //
        // Batch ERC1155
        //
        const arrTokenId1155 = document.getElementById( "idValuesIDsOfERC1155" ).value.trim().split( "," );
        const arrWalletAddressesMN = [], arrWalletAddressesSC = [];
        for( let i = 0; i < arrTokenId1155.length; ++ i ) {
            arrWalletAddressesMN.push( addr_mn );
            arrWalletAddressesSC.push( addr_sc );
        }
        const arrTokenAmount1155 = document.getElementById( "idValuesAmountsERC1155" ).value.trim().split( "," );
        await show_balance_erc1155();
        await print_batch_erc1155_balances();
        write_log( "M2S ERC1155 batch transfer of tokens " + JSON.stringify( arrTokenId1155 ) + " amounts " + JSON.stringify( arrTokenAmount1155 ) + "..." );
        await IMA.depositBatchOfERC1155toSchain( mn, sc, joAccountMN, joAccountSC, tokenERC1155MN, arrTokenId1155, arrTokenAmount1155, opts );
        await wait_batch_erc1155_balance_changed( sc, arrWalletAddressesSC, tokenERC1155SC, arrTokenId1155, batchErc1155balanceSC );
        await show_balance_erc1155();
        await print_batch_erc1155_balances();
        write_log( "S2M ERC1155 batch transfer of tokens " + JSON.stringify( arrTokenId1155 ) + " amounts " + JSON.stringify( arrTokenAmount1155 ) + "..." );
        await IMA.withdrawBatchOfERC1155fromSchain( sc, mn, joAccountSC, joAccountMN, tokenERC1155SC, tokenERC1155MN, arrTokenId1155, arrTokenAmount1155, opts );
        await wait_batch_erc1155_balance_changed( mn, arrWalletAddressesMN, tokenERC1155MN, arrTokenId1155, batchErc1155balanceMN );
        await show_balance_erc1155();
        await print_batch_erc1155_balances();

        write_log( "Done." );
    } catch ( err ) {
        write_log( "Test exception:", err.message );
    }
}

async function run_m2s_eth_impl() {
    try {
        await show_balance_eth();
        await print_eth_balances();
        const weiAmount = document.getElementById( "idValueWei" ).value.trim();
        write_log( "M2S ETH transfer of wei amount " + weiAmount + "..." );
        await IMA.depositETHtoSchain( mn, sc, joAccountMN, joAccountSC, weiAmount, opts );
        await wait_for_eth_balance_changed( sc, addr_sc, ethBalanceSC );
        await show_balance_eth();
        await print_eth_balances();
        write_log( "Done." );
    } catch ( err ) {
        write_log( "Test exception:", err.message );
    }
}

async function run_m2s_eth_direct() {
    try {
        write_log( "<h3 class=\"test_header\">M&ndash;&gt;S ETH Transfer</h3>" );
        await init_mn_direct();
        await init_sc_direct();
        await run_m2s_eth_impl();
    } catch ( err ) {
        write_log( "Test exception:", err.message );
    }
}

async function run_m2s_eth_metamask() {
    try {
        write_log( "<h3 class=\"test_header\">M&ndash;&gt;S ETH Transfer</h3>" );
        await init_mn_metamask();
        await init_sc_direct();
        await run_m2s_eth_impl();
    } catch ( err ) {
        write_log( "Test exception:", err.message );
    }
}

async function run_s2m_eth_impl() {
    try {
        await show_balance_eth();
        await print_eth_balances();
        const weiAmount = document.getElementById( "idValueWei" ).value.trim();
        write_log( "S2M ETH transfer of wei amount " + weiAmount + "..." );
        await IMA.withdrawETHfromSchain( sc, mn, joAccountSC, joAccountMN, weiAmount, opts );
        await wait_eth_can_receive_mn_changed();
        await show_balance_eth();
        await print_eth_balances();
        write_log( "Done." );
    } catch ( err ) {
        write_log( "Test exception:", err.message );
    }
}

async function run_s2m_eth_direct() {
    try {
        write_log( "<h3 class=\"test_header\">S&ndash;&gt;M ETH Transfer</h3>" );
        await init_mn_direct();
        await init_sc_direct();
        await run_s2m_eth_impl();
    } catch ( err ) {
        write_log( "Test exception:", err.message );
    }
}

async function run_s2m_eth_metamask() {
    try {
        write_log( "<h3 class=\"test_header\">S&ndash;&gt;M ETH Transfer</h3>" );
        await init_mn_direct();
        await init_sc_metamask();
        await run_s2m_eth_impl();
    } catch ( err ) {
        write_log( "Test exception:", err.message );
    }
}

async function run_m2s_erc20_impl() {
    try {
        await show_balance_erc20();
        await print_erc20_balances();
        const tokenAmount = document.getElementById( "idValueAmountERC20" ).value.trim();
        write_log( "M2S ERC20 transfer of token amount " + tokenAmount + "..." );
        await IMA.depositERC20toSchain( mn, sc, joAccountMN, joAccountSC, tokenERC20MN, tokenAmount, opts );
        await wait_erc20_balance_changed( sc, addr_sc, tokenERC20SC, erc20balanceSC );
        await print_erc20_balances();
        await show_balance_erc20();
        write_log( "Done." );
    } catch ( err ) {
        write_log( "Test exception:", err.message );
    }
}

async function run_m2s_erc20_direct() {
    try {
        write_log( "<h3 class=\"test_header\">M&ndash;&gt;S ERC20 Transfer</h3>" );
        await init_mn_direct();
        await init_sc_direct();
        await run_m2s_erc20_impl();
    } catch ( err ) {
        write_log( "Test exception:", err.message );
    }
}

async function run_m2s_erc20_metamask() {
    try {
        write_log( "<h3 class=\"test_header\">M&ndash;&gt;S ERC20 Transfer</h3>" );
        await init_mn_metamask();
        await init_sc_direct();
        await run_m2s_erc20_impl();
    } catch ( err ) {
        write_log( "Test exception:", err.message );
    }
}

async function run_s2m_erc20_impl() {
    try {
        await show_balance_erc20();
        await print_erc20_balances();
        const tokenAmount = document.getElementById( "idValueAmountERC20" ).value.trim();
        write_log( "S2M ERC20 transfer of token amount " + tokenAmount + "..." );
        await IMA.withdrawERC20fromSchain( sc, mn, joAccountSC, joAccountMN, tokenERC20SC, tokenERC20MN, tokenAmount, opts );
        await wait_erc20_balance_changed( sc, addr_sc, tokenERC20SC, erc20balanceSC );
        await show_balance_erc20();
        await print_erc20_balances();
        write_log( "Done." );
    } catch ( err ) {
        write_log( "Test exception:", err.message );
    }
}

async function run_s2m_erc20_direct() {
    try {
        write_log( "<h3 class=\"test_header\">S&ndash;&gt;M ERC20 Transfer</h3>" );
        await init_mn_direct();
        await init_sc_direct();
        await run_s2m_erc20_impl();
    } catch ( err ) {
        write_log( "Test exception:", err.message );
    }
}

async function run_s2m_erc20_metamask() {
    try {
        write_log( "<h3 class=\"test_header\">S&ndash;&gt;M ERC20 Transfer</h3>" );
        await init_mn_direct();
        await init_sc_metamask();
        await run_s2m_erc20_impl();
    } catch ( err ) {
        write_log( "Test exception:", err.message );
    }
}

async function run_m2s_erc721_impl() {
    try {
        const tokenID = document.getElementById( "idValueIdOfERC721" ).value.trim();
        await show_balance_erc721();
        await print_erc721_owners();
        write_log( "M2S ERC721 transfer of token ID " + tokenID + "..." );
        await IMA.depositERC721toSchain( mn, sc, joAccountMN, joAccountSC, tokenERC721MN, tokenID, opts );
        await wait_erc721_owner_changed( sc, addr_sc, tokenERC721SC, erc721ownerSC );
        await show_balance_erc721();
        await print_erc721_owners();
        write_log( "Done." );
    } catch ( err ) {
        write_log( "Test exception:", err.message );
    }
}

async function run_m2s_erc721_direct() {
    try {
        write_log( "<h3 class=\"test_header\">M&ndash;&gt;S ERC721 Transfer</h3>" );
        await init_mn_direct();
        await init_sc_direct();
        await run_m2s_erc721_impl();
    } catch ( err ) {
        write_log( "Test exception:", err.message );
    }
}

async function run_m2s_erc721_metamask() {
    try {
        write_log( "<h3 class=\"test_header\">M&ndash;&gt;S ERC721 Transfer</h3>" );
        await init_mn_metamask();
        await init_sc_direct();
        await run_m2s_erc721_impl();
    } catch ( err ) {
        write_log( "Test exception:", err.message );
    }
}

async function run_s2m_erc721_impl() {
    try {
        const tokenID = document.getElementById( "idValueIdOfERC721" ).value.trim();
        await show_balance_erc721();
        await print_erc721_owners();
        write_log( "S2M ERC721 transfer of token ID " + tokenID + "..." );
        await IMA.withdrawERC721fromSchain( sc, mn, joAccountSC, joAccountMN, tokenERC721SC, tokenERC721MN, tokenID, opts );
        await wait_erc721_owner_changed( mn, addr_mn, tokenERC721MN, erc721ownerMN );
        await show_balance_erc721();
        await print_erc721_owners();
        write_log( "Done." );
    } catch ( err ) {
        write_log( "Test exception:", err.message );
    }
}

async function run_s2m_erc721_direct() {
    try {
        write_log( "<h3 class=\"test_header\">S&ndash;&gt;M ERC721 Transfer</h3>" );
        await init_mn_direct();
        await init_sc_direct();
        await run_s2m_erc721_impl();
    } catch ( err ) {
        write_log( "Test exception:", err.message );
    }
}

async function run_s2m_erc721_metamask() {
    try {
        write_log( "<h3 class=\"test_header\">S&ndash;&gt;M ERC721 Transfer</h3>" );
        await init_mn_direct();
        await init_sc_metamask();
        await run_s2m_erc721_impl();
    } catch ( err ) {
        write_log( "Test exception:", err.message );
    }
}

async function run_m2s_erc1155_impl() {
    try {
        const tokenId = document.getElementById( "idValueIdOfERC1155" ).value.trim();
        await show_balance_erc1155();
        await print_erc1155_balances();
        const tokenAmount = document.getElementById( "idValueAmountERC1155" ).value.trim();
        write_log( "M2S ERC1155 transfer of token amount " + tokenAmount + "..." );
        await IMA.depositERC1155toSchain( mn, sc, joAccountMN, joAccountSC, tokenERC1155MN, tokenId, tokenAmount, opts );
        await wait_erc1155_balance_changed( sc, addr_sc, tokenERC1155SC, erc1155balanceSC );
        await show_balance_erc1155();
        await print_erc1155_balances();
        write_log( "Done." );
    } catch ( err ) {
        write_log( "Test exception:", err.message );
    }
}

async function run_m2s_erc1155_direct() {
    try {
        write_log( "<h3 class=\"test_header\">M&ndash;&gt;S ERC1155 Transfer</h3>" );
        await init_mn_direct();
        await init_sc_direct();
        await run_m2s_erc1155_impl();
    } catch ( err ) {
        write_log( "Test exception:", err.message );
    }
}

async function run_m2s_erc1155_metamask() {
    try {
        write_log( "<h3 class=\"test_header\">M&ndash;&gt;S ERC1155 Transfer</h3>" );
        await init_mn_metamask();
        await init_sc_direct();
        await run_m2s_erc1155_impl();
    } catch ( err ) {
        write_log( "Test exception:", err.message );
    }
}

async function run_s2m_erc1155_impl() {
    try {
        const tokenId = document.getElementById( "idValueIdOfERC1155" ).value.trim();
        await show_balance_erc1155();
        await print_erc1155_balances();
        const tokenAmount = document.getElementById( "idValueAmountERC1155" ).value.trim();
        write_log( "S2M ERC1155 transfer of token amount " + tokenAmount + "..." );
        await IMA.withdrawERC1155fromSchain( sc, mn, joAccountSC, joAccountMN, tokenERC1155SC, tokenERC1155MN, tokenId, tokenAmount, opts );
        await wait_erc1155_balance_changed( mn, addr_mn, tokenERC1155MN, erc1155balanceMN );
        await show_balance_erc1155();
        await print_erc1155_balances();
        write_log( "Done." );
    } catch ( err ) {
        write_log( "Test exception:", err.message );
    }
}

async function run_s2m_erc1155_direct() {
    try {
        write_log( "<h3 class=\"test_header\">S&ndash;&gt;M ERC1155 Transfer</h3>" );
        await init_mn_direct();
        await init_sc_direct();
        await run_s2m_erc1155_impl();
    } catch ( err ) {
        write_log( "Test exception:", err.message );
    }
}

async function run_s2m_erc1155_metamask() {
    try {
        write_log( "<h3 class=\"test_header\">S&ndash;&gt;M ERC1155 Transfer</h3>" );
        await init_mn_direct();
        await init_sc_metamask();
        await run_s2m_erc1155_impl();
    } catch ( err ) {
        write_log( "Test exception:", err.message );
    }
}

async function run_m2s_batch_erc1155_impl() {
    try {
        const arrTokenId1155 = document.getElementById( "idValuesIDsOfERC1155" ).value.trim().split( "," );
        const arrWalletAddressesMN = [], arrWalletAddressesSC = [];
        for( let i = 0; i < arrTokenId1155.length; ++ i ) {
            arrWalletAddressesMN.push( addr_mn );
            arrWalletAddressesSC.push( addr_sc );
        }
        const arrTokenAmount1155 = document.getElementById( "idValuesAmountsERC1155" ).value.trim().split( "," );
        await show_balance_erc1155();
        await print_batch_erc1155_balances();
        write_log( "M2S ERC1155 transfer of token amount " + JSON.stringify( arrTokenAmount1155 ) + "..." );
        await IMA.depositBatchOfERC1155toSchain( mn, sc, joAccountMN, joAccountSC, tokenERC1155MN, arrTokenId1155, arrTokenAmount1155, opts );
        await wait_batch_erc1155_balance_changed( sc, arrWalletAddressesSC, tokenERC1155SC, arrTokenId1155, batchErc1155balanceSC );
        await show_balance_erc1155();
        await print_batch_erc1155_balances();
        write_log( "Done." );
    } catch ( err ) {
        write_log( "Test exception:", err.message );
    }
}

async function run_m2s_batch_erc1155_direct() {
    try {
        write_log( "<h3 class=\"test_header\">M&ndash;&gt;S Batch ERC1155 Transfer</h3>" );
        await init_mn_direct();
        await init_sc_direct();
        await run_m2s_batch_erc1155_impl();
    } catch ( err ) {
        write_log( "Test exception:", err.message );
    }
}

async function run_m2s_batch_erc1155_metamask() {
    try {
        write_log( "<h3 class=\"test_header\">M&ndash;&gt;S Batch ERC1155 Transfer</h3>" );
        await init_mn_metamask();
        await init_sc_direct();
        await run_m2s_batch_erc1155_impl();
    } catch ( err ) {
        write_log( "Test exception:", err.message );
    }
}

async function run_s2m_batch_erc1155_impl() {
    try {
        const arrTokenId1155 = document.getElementById( "idValuesIDsOfERC1155" ).value.trim().split( "," );
        const arrWalletAddressesMN = [], arrWalletAddressesSC = [];
        for( let i = 0; i < arrTokenId1155.length; ++ i ) {
            arrWalletAddressesMN.push( addr_mn );
            arrWalletAddressesSC.push( addr_sc );
        }
        const arrTokenAmount1155 = document.getElementById( "idValuesAmountsERC1155" ).value.trim().split( "," );
        await show_balance_erc1155();
        await print_batch_erc1155_balances();
        write_log( "S2M ERC1155 transfer of token amount " + JSON.stringify( arrTokenAmount1155 ) + "..." );
        await IMA.withdrawBatchOfERC1155fromSchain( sc, mn, joAccountSC, joAccountMN, tokenERC1155SC, tokenERC1155MN, arrTokenId1155, arrTokenAmount1155, opts );
        await wait_batch_erc1155_balance_changed( mn, arrWalletAddressesMN, tokenERC1155MN, arrTokenId1155, batchErc1155balanceMN );
        await show_balance_erc1155();
        await print_batch_erc1155_balances();
        write_log( "Done." );
    } catch ( err ) {
        write_log( "Test exception:", err.message );
    }
}

async function run_s2m_batch_erc1155_direct() {
    try {
        write_log( "<h3 class=\"test_header\">S&ndash;&gt;M Batch ERC1155 Transfer</h3>" );
        await init_mn_direct();
        await init_sc_direct();
        await run_s2m_batch_erc1155_impl();
    } catch ( err ) {
        write_log( "Test exception:", err.message );
    }
}

async function run_s2m_batch_erc1155_metamask() {
    try {
        write_log( "<h3 class=\"test_header\">S&ndash;&gt;M Batch ERC1155 Transfer</h3>" );
        await init_mn_direct();
        await init_sc_metamask();
        await run_s2m_batch_erc1155_impl();
    } catch ( err ) {
        write_log( "Test exception:", err.message );
    }
}

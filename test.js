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
 * @file test.js
 * @copyright SKALE Labs 2019-Present
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const path = require( "path" );
const IMA = require( "./ima.js" ).IMA;
const helper_test_tokens = require( "./helper_test_tokens.js" );
const helper_utils = require( "./helper_utils.js" );

const pk_mn = process.env.PRIVATE_KEY_FOR_ETHEREUM || "23ABDBD3C61B5330AF61EBE8BEF582F4E5CC08E554053A718BDCE7813B9DC1FC"; // address 0x7aa5E36AA15E93D10F4F26357C30F052DacDde5F
const pk_sc = process.env.PRIVATE_KEY_FOR_SCHAIN || "80ebc2e00b8f13c5e2622b5694ab63ee80f7c5399554d2a12feeb0212eb8c69e"; // address 0x66c5a87f4a49DD75e970055A265E8dd5C3F8f852
const url_mn = process.env.URL_W3_ETHEREUM || "http://127.0.0.1:8545";
const url_sc_00 = process.env.URL_W3_NODE_00 || process.env.URL_W3_SCHAIN || "http://127.0.0.1:15000";
// const url_sc_01 = process.env.URL_W3_NODE_01 || "http://127.0.0.1:15100";
const path_abi_mn = helper_utils.normalizePath( process.env.IMA_ABI_PATH_ETHEREUM || "~/Work/functional-test/functional_check/IMA/proxy/data/proxyMainnet.json" );
const path_abi_sc = helper_utils.normalizePath( process.env.IMA_ABI_PATH_SCHAIN || "~/Work/functional-test/functional_check/IMA/proxy/data/proxySchain_Bob.json" );
const chain_name_mn = process.env.CHAIN_NAME_ETHEREUM || "Mainnet";
const chain_name_sc = process.env.CHAIN_NAME_SCHAIN || "Bob";
const chain_id_mn = process.env.CID_ETHEREUM ? parseInt( process.env.CID_ETHEREUM ) : ( 456 );
const chain_id_sc = process.env.CID_SCHAIN ? parseInt( process.env.CID_SCHAIN ) : ( 123 );

async function run() {

    //
    // Chains
    //

    const mn = new IMA.Chain(
        helper_utils.getWeb3FromURL( url_mn ),
        helper_utils.jsonFileLoad( path_abi_mn ),
        chain_name_mn,
        chain_id_mn
    );
    const sc = new IMA.Chain(
        helper_utils.getWeb3FromURL( url_sc_00 ),
        helper_utils.jsonFileLoad( path_abi_sc ),
        chain_name_sc,
        chain_id_sc
    );
    const addr_mn = IMA.private_key_2_account_address( mn.w3, pk_mn );
    const addr_sc = IMA.private_key_2_account_address( sc.w3, pk_sc );

    //
    // Accounts
    //

    const joAccountMN = {
        privateKey: pk_mn
        // or ...
        // address_: "0x.....", // provide address for private key that is hidden inside SGX wallet
        // strTransactionManagerURL: ...
        // or ...
        // address_: "0x.....", // provide address for private key that is hidden inside SGX wallet
        // strSgxURL: ...
        // strSgxKeyName: ...
        // strSslKey: ... // key as text content
        // strSslCert: ... // cert as text content
    };
    // const joAccountMN = { // example: account for SGX wallet
    //     address_: "0x7aa5E36AA15E93D10F4F26357C30F052DacDde5F", // provide address for private key that is hidden inside SGX wallet
    //     strSgxURL: "https://127.0.0.1:1026",
    //     strSgxKeyName: "NEK:002",
    //     strSslKey: helper_utils.fileLoad( "/home/serge/Work/functional-test/functional_check/engine/create_pems/client.crt" ),
    //     strSslCert: helper_utils.fileLoad( "/home/serge/Work/functional-test/functional_check/engine/create_pems/k.key" )
    // };

    const joAccountSC = {
        privateKey: pk_sc
    };

    //
    //
    //

    console.log( "Initial ETH balances are:" );
    console.log( "Main NET real ETH balance for", addr_mn, "is:", await IMA.getETHbalance( mn, addr_mn ) );
    console.log( "S-CHain  real ETH balance for", addr_sc, "is:", await IMA.getETHbalance( sc, addr_sc ) );

    //
    // Common options
    //

    const opts = {
        isIgnoreDRC: false, // for ETH M<->S
        isIgnoreDRC_approve: false, // for ERC20 M<->S, ERC721 M->S
        isIgnoreDRC_rawDepositERC20: false, // for ERC20 M->S
        isIgnoreDRC_rawExitToMainERC20: false, // for ERC20 S->M
        isIgnoreDRC_rawDepositERC721: false, // for ERC721 M->S
        isIgnoreDRC_transferFrom: false, // for ERC721 S->M
        isIgnoreDRC_rawExitToMainERC721: false, // for ERC721 S->M
        transactionCustomizer: null
    };

    const weiAmount = "1000000000000000000";

    //
    // ETH
    //
    /**/
    console.log( "M2S ETH transfer of wei amount " + weiAmount + "..." );
    await IMA.depositETHtoSchain( mn, sc, joAccountMN, joAccountSC, weiAmount, opts );
    console.log( "Main NET real ETH balance for", addr_mn, "is:", await IMA.getETHbalance( mn, addr_mn ) );

    console.log( "S2M ETH transfer of wei amount " + weiAmount + "..." );
    await IMA.withdrawETHfromSchain( sc, mn, joAccountSC, joAccountMN, weiAmount, opts );
    console.log( "S-CHain  real ETH balance for", addr_sc, "is:", await IMA.getETHbalance( sc, addr_sc ) );
    console.log( "Main NET real ETH balance for", addr_mn, "is:", await IMA.getETHbalance( mn, addr_mn ) );

    await IMA.sleep( 5000 );
    console.log( "Can receive on Main NET for", addr_sc, "is:", await IMA.viewETHtoReceive( mn, addr_mn ) );
    await IMA.receiveETH( mn, joAccountMN, opts );
    console.log( "Can receive on Main NET for", addr_sc, "is:", await IMA.viewETHtoReceive( mn, addr_mn ) );
    console.log( "Main NET real ETH balance for", addr_mn, "is:", await IMA.getETHbalance( mn, addr_mn ) );
    /**/
    // process.exit( 0 );

    //
    // Test Tokens
    //

    const strFolderTestTokens = path.join( __dirname, "test_tokens" );
    const strFolderTestTokensData = path.join( strFolderTestTokens, "data" );
    const tokensMN = {
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
        contractERC721: null
    };
    const tokensSC = {
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
        contractERC721: null
    };
    if( helper_test_tokens.can_load_test_tokens( tokensMN ) && helper_test_tokens.can_load_test_tokens( tokensSC ) ) {
        console.log( "Will load test token ABIs..." );
        helper_test_tokens.load_test_tokens( tokensMN );
        console.log( JSON.stringify( tokensMN.joABI ) );
        console.log( "MN tokens loaded." );
        helper_test_tokens.load_test_tokens( tokensSC );
        console.log( JSON.stringify( tokensSC.joABI ) );
        console.log( "SC tokens loaded." );
    } else {
        console.log( "Will deploy new test tokens..." );
        await helper_test_tokens.deploy_test_tokens_to( tokensMN );
        console.log( JSON.stringify( tokensMN.joABI ) );
        console.log( "MN tokens deployed." );
        await helper_test_tokens.deploy_test_tokens_to( tokensSC );
        console.log( JSON.stringify( tokensSC.joABI ) );
        console.log( "SC tokens deployed." );
    }

    //
    // Add opts for token transfers
    //

    opts.weiReserve = "100000000000000000"; // 100 finney, 1 finney is 1000000000000000 // for ERC20 and ERC721 M<->S

    const tokenInfoERC20MN = { abi: tokensMN.joABI.ERC20_abi, address: tokensMN.joABI.ERC20_address };
    const tokenInfoERC20SC = { abi: tokensSC.joABI.ERC20_abi, address: tokensSC.joABI.ERC20_address };
    const tokenInfoERC721MN = { abi: tokensMN.joABI.ERC721_abi, address: tokensMN.joABI.ERC721_address };
    const tokenInfoERC721SC = { abi: tokensSC.joABI.ERC721_abi, address: tokensSC.joABI.ERC721_address };
    let tokenERC20MN = tokenInfoERC20MN; // use token info object
    let tokenERC20SC = tokenInfoERC20SC; // use token info object
    let tokenERC721MN = tokenInfoERC721MN; // use token info object
    let tokenERC721SC = tokenInfoERC721SC; // use token info object

    //
    // Register/use token aliases (comment this block to use token info objects as is)
    //

    mn.defineTokenAlias( tokenInfoERC20MN.abi, tokenInfoERC20MN.address, "MyERC20" );
    sc.defineTokenAlias( tokenInfoERC20SC.abi, tokenInfoERC20SC.address, "MyERC20" );
    mn.defineTokenAlias( tokenInfoERC721MN.abi, tokenInfoERC721MN.address, "MyERC721" );
    sc.defineTokenAlias( tokenInfoERC721SC.abi, tokenInfoERC721SC.address, "MyERC721" );
    tokenERC20MN = "MyERC20"; // use token alias
    tokenERC20SC = "MyERC20"; // use token alias
    tokenERC721MN = "MyERC721"; // use token alias
    tokenERC721SC = "MyERC721"; // use token alias

    //
    //
    //

    console.log( "Initial ERC20 balances are:" );
    console.log( "Main NET ERC20 balance for", addr_mn, "is:", await IMA.getERC20balance( mn, addr_mn, tokenERC20MN ) );
    console.log( "S-CHain  ERC20 balance for", addr_sc, "is:", await IMA.getERC20balance( sc, addr_sc, tokenERC20SC ) );

    // await IMA.sleep( 5000 );
    //
    // ERC20
    //

    const tokenAmount = 1000;
    /**/
    console.log( "M2S ERC20 transfer of token amount " + tokenAmount + "..." );
    await IMA.depositERC20toSchain( mn, sc, joAccountMN, joAccountSC, tokenERC20MN, tokenAmount, opts );
    console.log( "Main NET ERC20 balance for", addr_mn, "is:", await IMA.getERC20balance( mn, addr_mn, tokenERC20MN ) );

    await IMA.sleep( 5000 );
    console.log( "S2M ERC20 transfer of token amount " + tokenAmount + "..." );
    await IMA.withdrawERC20fromSchain( sc, mn, joAccountSC, joAccountMN, tokenERC20SC, tokenERC20MN, tokenAmount, opts );
    console.log( "S-CHain  ERC20 balance for", addr_sc, "is:", await IMA.getERC20balance( sc, addr_sc, tokenERC20SC ) );
    /**/
    //
    // ERC721
    //

    /**/
    const tokenID = 1;
    console.log( "ERC721 token ID " + tokenID + " owner on MN is " + await IMA.getERC721ownerOf( mn, addr_mn, tokenERC721MN, tokenID ) );
    console.log( "ERC721 token ID " + tokenID + " owner on SC is " + await IMA.getERC721ownerOf( sc, addr_sc, tokenERC721SC, tokenID ) );

    console.log( "M2S ERC721 transfer of token ID " + tokenID + "..." );
    await IMA.depositERC721toSchain( mn, sc, joAccountMN, joAccountSC, tokenERC721MN, tokenID, opts );
    console.log( "ERC721 token ID " + tokenID + " owner on MN is " + await IMA.getERC721ownerOf( mn, addr_mn, tokenERC721MN, tokenID ) );
    console.log( "ERC721 token ID " + tokenID + " owner on SC is " + await IMA.getERC721ownerOf( sc, addr_sc, tokenERC721SC, tokenID ) );

    await IMA.sleep( 5000 );
    console.log( "S2M ERC721 transfer of token ID " + tokenID + "..." );
    await IMA.withdrawERC721fromSchain( sc, mn, joAccountSC, joAccountMN, tokenERC721SC, tokenERC721MN, tokenID, opts );
    console.log( "ERC721 token ID " + tokenID + " owner on MN is " + await IMA.getERC721ownerOf( mn, addr_mn, tokenERC721MN, tokenID ) );
    console.log( "ERC721 token ID " + tokenID + " owner on SC is " + await IMA.getERC721ownerOf( sc, addr_sc, tokenERC721SC, tokenID ) );
    /**/

    console.log( "Success. Test finished." );
}

run();

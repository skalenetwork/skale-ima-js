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
const chain_id_mn = process.env.CID_ETHEREUM ? IMA.parseIntOrHex( process.env.CID_ETHEREUM ) : ( 456 );
const chain_id_sc = process.env.CID_SCHAIN ? IMA.parseIntOrHex( process.env.CID_SCHAIN ) : ( 123 );

console.log( "Main NET", "(\"" + chain_name_mn + "\", " + url_mn + ") chain ID is", chain_id_mn, "=", "0x" + chain_id_mn.toString( 16 ) );
console.log( "S_Chain", "(\"" + chain_name_sc + "\", " + url_sc_00 + ") chain ID is", chain_id_sc, "=", "0x" + chain_id_sc.toString( 16 ) );

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
    // Common options
    //

    const opts = {
        isIgnoreDRC: false, // for ETH M<->S
        isIgnoreDRC_approve: false, // for ERC20 M<->S, ERC721 M->S
        isIgnoreDRC_rawDepositERC20: false, // for ERC20 M->S
        isIgnoreDRC_rawExitToMainERC20: false, // for ERC20 S->M
        isIgnoreDRC_rawDepositERC721: false, // for ERC721 M->S
        isIgnoreDRC_rawExitToMainERC721: false, // for ERC721 S->M
        isIgnoreDRC_rawDepositERC1155: false, // for ERC20 M->S
        isIgnoreDRC_rawExitToMainERC1155: false, // for ERC20 S->M
        isIgnoreDRC_rawDepositERC1155Batch: false, // for ERC20 M->S
        isIgnoreDRC_rawExitToMainERC1155Batch: false, // for ERC20 S->M
        isIgnoreDRC_transferFrom: false, // for ERC721 S->M
        transactionCustomizer: null
    };

    //
    // Reimbursement
    //
    console.log( "Reimbursement ETH balance for", addr_mn, " on chain \"" + chain_name_sc + "\" is", await IMA.reimbursementGetBalance( mn, addr_mn, chain_name_sc ) );
    const weiAmountRecharge = "2000000000000000000";
    const weiAmountWithdraw = "1000000000000000000";
    console.log( "Reimbursement recharging wei amount " + weiAmountRecharge + "..." );
    await IMA.reimbursementWalletRecharge( mn, joAccountMN, chain_name_sc, weiAmountRecharge, opts );
    console.log( "Reimbursement ETH balance for", addr_mn, " on chain \"" + chain_name_sc + "\" is", await IMA.reimbursementGetBalance( mn, addr_mn, chain_name_sc ) );
    console.log( "Reimbursement withdrawing wei amount " + weiAmountWithdraw + "..." );
    await IMA.reimbursementWalletWithdraw( mn, joAccountMN, chain_name_sc, weiAmountWithdraw, opts );
    console.log( "Reimbursement ETH balance for", addr_mn, " on chain \"" + chain_name_sc + "\" is", await IMA.reimbursementGetBalance( mn, addr_mn, chain_name_sc ) );

    const weiAmount = "1000000000000000000";

    //
    // ETH
    //
    /**/
    console.log( "Main NET real ETH balance for", addr_mn, "is", await IMA.getETHbalance( mn, addr_mn ) );
    console.log( "S-CHain  real ETH balance for", addr_sc, "is", await IMA.getETHbalance( sc, addr_sc ) );
    console.log( "M2S ETH transfer of wei amount " + weiAmount + "..." );
    await IMA.depositETHtoSchain( mn, sc, joAccountMN, joAccountSC, weiAmount, opts );
    console.log( "Main NET real ETH balance for", addr_mn, "is", await IMA.getETHbalance( mn, addr_mn ) );
    console.log( "S-CHain  real ETH balance for", addr_sc, "is", await IMA.getETHbalance( sc, addr_sc ) );

    /**/
    console.log( "S2M ETH transfer of wei amount " + weiAmount + "..." );
    await IMA.withdrawETHfromSchain( sc, mn, joAccountSC, joAccountMN, weiAmount, opts );
    console.log( "Main NET real ETH balance for", addr_mn, "is", await IMA.getETHbalance( mn, addr_mn ) );
    console.log( "S-CHain  real ETH balance for", addr_sc, "is", await IMA.getETHbalance( sc, addr_sc ) );

    await IMA.sleep( 20000 );
    console.log( "Can receive on Main NET for", addr_sc, "is", await IMA.viewETHtoReceive( mn, addr_mn ) );
    await IMA.receiveETH( mn, joAccountMN, opts );
    console.log( "Can receive on Main NET for", addr_sc, "is", await IMA.viewETHtoReceive( mn, addr_mn ) );
    console.log( "Main NET real ETH balance for", addr_mn, "is", await IMA.getETHbalance( mn, addr_mn ) );
    console.log( "S-CHain  real ETH balance for", addr_sc, "is", await IMA.getETHbalance( sc, addr_sc ) );
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
        contractERC721: null,
        contractERC1155: null
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
        contractERC721: null,
        contractERC1155: null
    };
    let isNewTestTokensDeployment = false;
    if( helper_test_tokens.can_load_test_tokens( tokensMN ) && helper_test_tokens.can_load_test_tokens( tokensSC ) ) {
        console.log( "Will load test token ABIs..." );
        helper_test_tokens.load_test_tokens( tokensMN );
        console.log( JSON.stringify( tokensMN.joABI ) );
        console.log( "MN tokens loaded." );
        helper_test_tokens.load_test_tokens( tokensSC );
        console.log( JSON.stringify( tokensSC.joABI ) );
        console.log( "SC tokens loaded." );
    } else {
        isNewTestTokensDeployment = true;
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
    const tokenInfoERC1155MN = { abi: tokensMN.joABI.ERC1155_abi, address: tokensMN.joABI.ERC1155_address };
    const tokenInfoERC1155SC = { abi: tokensSC.joABI.ERC1155_abi, address: tokensSC.joABI.ERC1155_address };
    const chatParticipantInfoMN = { abi: tokensMN.joABI.ChatParticipant_abi, address: tokensMN.joABI.ChatParticipant_address };
    const chatParticipantInfoSC = { abi: tokensSC.joABI.ChatParticipant_abi, address: tokensSC.joABI.ChatParticipant_address };
    let tokenERC20MN = tokenInfoERC20MN; // use token info object
    let tokenERC20SC = tokenInfoERC20SC; // use token info object
    let tokenERC721MN = tokenInfoERC721MN; // use token info object
    let tokenERC721SC = tokenInfoERC721SC; // use token info object
    let tokenERC1155MN = tokenInfoERC1155MN; // use token info object
    let tokenERC1155SC = tokenInfoERC1155SC; // use token info object
    // let chatParticipantMN = chatParticipantInfoMN;
    // let chatParticipantSC = chatParticipantInfoSC;

    //
    // Register/use token aliases (comment this block to use token info objects as is)
    //

    mn.defineTokenAlias( tokenInfoERC20MN.abi, tokenInfoERC20MN.address, "MyERC20" );
    sc.defineTokenAlias( tokenInfoERC20SC.abi, tokenInfoERC20SC.address, "MyERC20" );
    mn.defineTokenAlias( tokenInfoERC721MN.abi, tokenInfoERC721MN.address, "MyERC721" );
    sc.defineTokenAlias( tokenInfoERC721SC.abi, tokenInfoERC721SC.address, "MyERC721" );
    mn.defineTokenAlias( tokenInfoERC1155MN.abi, tokenInfoERC1155MN.address, "MyERC1155" );
    sc.defineTokenAlias( tokenInfoERC1155SC.abi, tokenInfoERC1155SC.address, "MyERC1155" );
    // mn.defineTokenAlias( chatParticipantInfoMN.abi, chatParticipantInfoMN.address, "MyChatParticipant" );
    // sc.defineTokenAlias( chatParticipantInfoSC.abi, chatParticipantInfoSC.address, "MyChatParticipant" );
    tokenERC20MN = "MyERC20"; // use token alias
    tokenERC20SC = "MyERC20"; // use token alias
    tokenERC721MN = "MyERC721"; // use token alias
    tokenERC721SC = "MyERC721"; // use token alias
    tokenERC1155MN = "MyERC1155"; // use token alias
    tokenERC1155SC = "MyERC1155"; // use token alias
    // chatParticipantMN = "MyChatParticipant"; // alias
    // chatParticipantSC = "MyChatParticipant"; // alias

    //
    // ERC20
    //

    const tokenAmount = 1000;
    /**/
    await IMA.sleep( 20000 );
    console.log( "Initial ERC20 balances are:" );
    console.log( "Main NET ERC20 balance for", addr_mn, "is", await IMA.getERC20balance( mn, addr_mn, tokenERC20MN ) );
    console.log( "S-CHain  ERC20 balance for", addr_sc, "is", await IMA.getERC20balance( sc, addr_sc, tokenERC20SC ) );

    console.log( "M2S ERC20 transfer of token amount " + tokenAmount + "..." );
    await IMA.depositERC20toSchain( mn, sc, joAccountMN, joAccountSC, tokenERC20MN, tokenAmount, opts );
    console.log( "Main NET ERC20 balance for", addr_mn, "is", await IMA.getERC20balance( mn, addr_mn, tokenERC20MN ) );
    console.log( "S-CHain  ERC20 balance for", addr_sc, "is", await IMA.getERC20balance( sc, addr_sc, tokenERC20SC ) );

    await IMA.sleep( 20000 );
    console.log( "S2M ERC20 transfer of token amount " + tokenAmount + "..." );
    await IMA.withdrawERC20fromSchain( sc, mn, joAccountSC, joAccountMN, tokenERC20SC, tokenERC20MN, tokenAmount, opts );
    console.log( "Main NET ERC20 balance for", addr_mn, "is", await IMA.getERC20balance( mn, addr_mn, tokenERC20MN ) );
    console.log( "S-CHain  ERC20 balance for", addr_sc, "is", await IMA.getERC20balance( sc, addr_sc, tokenERC20SC ) );
    /**/
    //
    // ERC721
    //

    const tokenID = 1;
    /**/
    await IMA.sleep( 20000 );
    console.log( "ERC721 token ID " + tokenID + " owner on MN is " + await IMA.getERC721ownerOf( mn, addr_mn, tokenERC721MN, tokenID ) );
    console.log( "ERC721 token ID " + tokenID + " owner on SC is " + await IMA.getERC721ownerOf( sc, addr_sc, tokenERC721SC, tokenID ) );

    console.log( "M2S ERC721 transfer of token ID " + tokenID + "..." );
    await IMA.depositERC721toSchain( mn, sc, joAccountMN, joAccountSC, tokenERC721MN, tokenID, opts );
    console.log( "ERC721 token ID " + tokenID + " owner on MN is " + await IMA.getERC721ownerOf( mn, addr_mn, tokenERC721MN, tokenID ) );
    console.log( "ERC721 token ID " + tokenID + " owner on SC is " + await IMA.getERC721ownerOf( sc, addr_sc, tokenERC721SC, tokenID ) );

    await IMA.sleep( 20000 );
    console.log( "S2M ERC721 transfer of token ID " + tokenID + "..." );
    await IMA.withdrawERC721fromSchain( sc, mn, joAccountSC, joAccountMN, tokenERC721SC, tokenERC721MN, tokenID, opts );
    console.log( "ERC721 token ID " + tokenID + " owner on MN is " + await IMA.getERC721ownerOf( mn, addr_mn, tokenERC721MN, tokenID ) );
    console.log( "ERC721 token ID " + tokenID + " owner on SC is " + await IMA.getERC721ownerOf( sc, addr_sc, tokenERC721SC, tokenID ) );
    /**/
    //
    // ERC1155
    //

    const tokenId1155 = 1;
    const tokenAmount1155 = 1000;
    /** /
    await IMA.sleep( 20000 );
    console.log( "Main NET ERC1155 balance of token " + tokenId1155 + " for", addr_mn, "is", await IMA.getERC1155balance( mn, addr_mn, tokenERC1155MN, tokenId1155 ) );
    console.log( "S-CHain  ERC1155 balance of token " + tokenId1155 + " for", addr_sc, "is", await IMA.getERC1155balance( sc, addr_sc, tokenERC1155SC, tokenId1155 ) );
    console.log( "M2S ERC1155 transfer of token " + tokenId1155 + " amount " + tokenAmount1155 + "..." );
    await IMA.depositERC1155toSchain( mn, sc, joAccountMN, joAccountSC, tokenERC1155MN, tokenId1155, tokenAmount1155, opts );
    console.log( "Main NET ERC1155 balance of token " + tokenId1155 + " for", addr_mn, "is", await IMA.getERC1155balance( mn, addr_mn, tokenERC1155MN, tokenId1155 ) );
    console.log( "S-CHain  ERC1155 balance of token " + tokenId1155 + " for", addr_sc, "is", await IMA.getERC1155balance( sc, addr_sc, tokenERC1155SC, tokenId1155 ) );

    await IMA.sleep( 20000 );
    console.log( "S2M ERC1155 transfer of token " + tokenId1155 + " amount " + tokenAmount1155 + "..." );
    await IMA.withdrawERC1155fromSchain( sc, mn, joAccountSC, joAccountMN, tokenERC1155SC, tokenERC1155MN, tokenId1155, tokenAmount1155, opts );
    console.log( "Main NET ERC1155 balance of token " + tokenId1155 + " for", addr_mn, "is", await IMA.getERC1155balance( mn, addr_mn, tokenERC1155MN, tokenId1155 ) );
    console.log( "S-CHain  ERC1155 balance of token " + tokenId1155 + " for", addr_sc, "is", await IMA.getERC1155balance( sc, addr_sc, tokenERC1155SC, tokenId1155 ) );
    /**/
    //
    // Batch ERC1155
    //

    const arrTokenId1155 = [ 1,2,3 ];
    const arrTokenAmount1155 = [ 999,1000,1001 ];
    const arrWalletAddressesMN = [], arrWalletAddressesSC = [];
    for( let i = 0; i < arrTokenId1155.length; ++ i ) {
        arrWalletAddressesMN.push( addr_mn );
        arrWalletAddressesSC.push( addr_sc );
    }
    /**/
    console.log( "Main NET ERC1155 batch balances of tokens " + JSON.stringify( arrTokenId1155 ) + " for", addr_mn, "is", await IMA.getERC1155balanceOfBatch( mn, arrWalletAddressesMN, tokenERC1155MN, arrTokenId1155 ) );
    console.log( "S-CHain  ERC1155 batch balances of tokens " + JSON.stringify( arrTokenId1155 ) + " for", addr_sc, "is", await IMA.getERC1155balanceOfBatch( sc, arrWalletAddressesSC, tokenERC1155SC, arrTokenId1155 ) );
    console.log( "M2S ERC1155 batch transfer of tokens " + JSON.stringify( arrTokenId1155 ) + " amounts " + JSON.stringify( arrTokenAmount1155 ) + "..." );
    await IMA.depositBatchOfERC1155toSchain( mn, sc, joAccountMN, joAccountSC, tokenERC1155MN, arrTokenId1155, arrTokenAmount1155, opts );
    console.log( "Main NET ERC1155 batch balances of tokens " + JSON.stringify( arrTokenId1155 ) + " for", addr_mn, "is", await IMA.getERC1155balanceOfBatch( mn, arrWalletAddressesMN, tokenERC1155MN, arrTokenId1155 ) );
    console.log( "S-CHain  ERC1155 batch balances of tokens " + JSON.stringify( arrTokenId1155 ) + " for", addr_sc, "is", await IMA.getERC1155balanceOfBatch( sc, arrWalletAddressesSC, tokenERC1155SC, arrTokenId1155 ) );

    await IMA.sleep( 20000 );
    console.log( "S2M ERC1155 batch transfer of tokens " + JSON.stringify( arrTokenId1155 ) + " amounts " + JSON.stringify( arrTokenAmount1155 ) + "..." );
    await IMA.withdrawBatchOfERC1155fromSchain( sc, mn, joAccountSC, joAccountMN, tokenERC1155SC, tokenERC1155MN, arrTokenId1155, arrTokenAmount1155, opts );
    console.log( "Main NET ERC1155 batch balances of tokens " + JSON.stringify( arrTokenId1155 ) + " for", addr_mn, "is", await IMA.getERC1155balanceOfBatch( mn, arrWalletAddressesMN, tokenERC1155MN, arrTokenId1155 ) );
    console.log( "S-CHain  ERC1155 batch balances of tokens " + JSON.stringify( arrTokenId1155 ) + " for", addr_sc, "is", await IMA.getERC1155balanceOfBatch( sc, arrWalletAddressesSC, tokenERC1155SC, arrTokenId1155 ) );
    /**/
    //
    // Cross-chain chat
    //
    await IMA.sleep( 20000 );
    console.log( "Initializing cross-chain chat..." );
    const joChatParticipantMN = new mn.w3.eth.Contract( chatParticipantInfoMN.abi, chatParticipantInfoMN.address );
    const joChatParticipantSC = new sc.w3.eth.Contract( chatParticipantInfoSC.abi, chatParticipantInfoSC.address );
    //
    if( isNewTestTokensDeployment ) {
        console.log( "Initializing MN chat participant, chain name..." );
        const methodWithArguments_setThisChainName_MN = joChatParticipantMN.methods.setThisChainName( chain_name_mn );
        await IMA.execute_send_on_method_with_arguments( mn, joAccountMN, methodWithArguments_setThisChainName_MN, joChatParticipantMN.options.address );
        console.log( "Initializing MN chat participant, message proxy..." );
        const methodWithArguments_setMessageProxy_MN = joChatParticipantMN.methods.setMessageProxy( mn.jo_message_proxy_main_net.options.address );
        await IMA.execute_send_on_method_with_arguments( mn, joAccountMN, methodWithArguments_setMessageProxy_MN, joChatParticipantMN.options.address );
        console.log( "Initializing MN chat participant, other participant reference..." );
        const methodWithArguments_setOtherParticipant_MN = joChatParticipantMN.methods.setOtherParticipant( joChatParticipantSC.options.address );
        await IMA.execute_send_on_method_with_arguments( mn, joAccountMN, methodWithArguments_setOtherParticipant_MN, joChatParticipantMN.options.address );
        //
        console.log( "Initializing SC chat participant, chain name..." );
        const methodWithArguments_setThisChainName_SC = joChatParticipantSC.methods.setThisChainName( chain_name_sc );
        await IMA.execute_send_on_method_with_arguments( sc, joAccountSC, methodWithArguments_setThisChainName_SC, joChatParticipantSC.options.address );
        console.log( "Initializing SC chat participant, message proxy..." );
        const methodWithArguments_setMessageProxy_SC = joChatParticipantSC.methods.setMessageProxy( sc.jo_message_proxy_s_chain.options.address );
        await IMA.execute_send_on_method_with_arguments( sc, joAccountSC, methodWithArguments_setMessageProxy_SC, joChatParticipantSC.options.address );
        console.log( "Initializing SC chat participant, other participant reference..." );
        const methodWithArguments_setOtherParticipant_SC = joChatParticipantSC.methods.setOtherParticipant( joChatParticipantMN.options.address );
        await IMA.execute_send_on_method_with_arguments( sc, joAccountSC, methodWithArguments_setOtherParticipant_SC, joChatParticipantSC.options.address );
        //
        console.log( "Granting the EXTRA_CONTRACT_REGISTRAR_ROLE role on MN..." );
        await role_check_and_grant( mn, mn.jo_message_proxy_main_net, "EXTRA_CONTRACT_REGISTRAR_ROLE", joAccountMN );
        console.log( "Granting the EXTRA_CONTRACT_REGISTRAR_ROLE role on SC..." );
        await role_check_and_grant( sc, sc.jo_message_proxy_s_chain, "EXTRA_CONTRACT_REGISTRAR_ROLE", joAccountSC );
        console.log( "Registering MN chat participant..." );
        const methodWithArguments_registerExtraContractMN = mn.jo_message_proxy_main_net.methods.registerExtraContract( sc.chainName, joChatParticipantMN.options.address );
        await IMA.execute_send_on_method_with_arguments( mn, joAccountMN, methodWithArguments_registerExtraContractMN, mn.jo_message_proxy_main_net.options.address );
        console.log( "Registering SC chat participant..." );
        const methodWithArguments_registerExtraContractSC = sc.jo_message_proxy_s_chain.methods.registerExtraContract( mn.chainName, joChatParticipantSC.options.address );
        await IMA.execute_send_on_method_with_arguments( sc, joAccountSC, methodWithArguments_registerExtraContractSC, sc.jo_message_proxy_s_chain.options.address );
        //
        await IMA.sleep( 20000 );
    } // if( isNewTestTokensDeployment )
    const nicknameMN = "Alice", nicknameSC = "Bob";
    const arrChatPlan = [
        { direction: "M2S", text: "Hi Bob!" },
        { direction: "S2M", text: "Hi Alice!" },
        { direction: "M2S", text: "How are you, Bob?" },
        { direction: "S2M", text: "I am OKay, Alice, and you?" },
        { direction: "M2S", text: "Me is fine!" },
        { direction: "S2M", text: "Nice to meet you!" }
    ];
    for( let idxChatMessage = 0; idxChatMessage < arrChatPlan.length; ++ idxChatMessage ) {
        const joPlannedMessage = arrChatPlan[idxChatMessage];
        const nicknameSrc = ( joPlannedMessage.direction == "M2S" ) ? nicknameMN : nicknameSC;
        const nicknameDst = ( joPlannedMessage.direction == "M2S" ) ? nicknameSC : nicknameMN;
        const joChatParticipantSrc = ( joPlannedMessage.direction == "M2S" ) ? joChatParticipantMN : joChatParticipantSC;
        const joChatParticipantDst = ( joPlannedMessage.direction == "M2S" ) ? joChatParticipantSC : joChatParticipantMN;
        const chainSrc = ( joPlannedMessage.direction == "M2S" ) ? mn : sc;
        const chainDst = ( joPlannedMessage.direction == "M2S" ) ? sc : mn;
        const joAccountSrc = ( joPlannedMessage.direction == "M2S" ) ? joAccountMN : joAccountSC;
        const joAccountDst = ( joPlannedMessage.direction == "M2S" ) ? joAccountSC : joAccountMN;
        console.log( ">>> " + joPlannedMessage.direction + ", " + nicknameSrc + " to " + nicknameDst + " => " + joPlannedMessage.text );
        const methodWithArguments_sendToOtherChain = joChatParticipantSrc.methods.sendToOtherChain( chainDst.chainName, nicknameSrc, joPlannedMessage.text );
        if( ! await IMA.execute_send_on_method_with_arguments( chainSrc, joAccountSrc, methodWithArguments_sendToOtherChain, joChatParticipantSrc.options.address ) )
            continue;
        await IMA.sleep( 20000 );
        const lastReceivedMessage = await joChatParticipantDst.methods.getLastReceivedMessage().call( { from: IMA.get_account_wallet_address( chainDst.w3, joAccountDst ) } );
        const msg = { nickname: "" + lastReceivedMessage.nickname_, text: "" + lastReceivedMessage.text_ };
        if( ! ( nicknameSrc == msg.nickname && joPlannedMessage.text == msg.text ) ) {
            console.log( "<<< lastReceivedMessage:", msg );
            const strError = "INTERCHAIN CHAT ERROR: Last delivered message is different then last sent one";
            console.log( "!!!", strError );
            throw new Error( strError );
        }
    }

    console.log( "Success. Test finished." );
}

run();

async function role_check_and_grant( chain, jo_contract, strRoleName, joAccount ) { // for example "VALIDATOR_MANAGER_ROLE"
    const addressTo = IMA.get_account_wallet_address( chain.w3, joAccount );
    const role = await jo_contract.methods[strRoleName]().call( {
        chainId: chain.chainId,
        from: addressTo,
        gas: 8000000
    } );
    const has_role = await jo_contract.methods.hasRole( role, addressTo ).call( {
        chainId: chain.chainId,
        from: addressTo,
        gas: 8000000
    } );
    console.log( "    Have role", has_role );
    if( ! has_role ) {
        console.log( "    Granting role..." );
        const methodWithArguments_grantRole = jo_contract.methods.grantRole( role, addressTo );
        await IMA.execute_send_on_method_with_arguments( chain, joAccount, methodWithArguments_grantRole, jo_contract.options.address );
    }
}

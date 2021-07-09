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
 * @file helper_test_tokens.js
 * @copyright SKALE Labs 2019-Present
 */

const path = require( "path" );
const helper_shell = require( "./helper_shell.js" );
const helper_utils = require( "./helper_utils.js" );

async function deploy_test_tokens_to( opts ) {
    opts.IMA.write_log( "Deploying \"Test Tokens\" to \"" + opts.strTruffleNetworkName + "\"..." );
    const joEnv = {
        "ADDRESS_MINT_TO": "" + opts.strMintToAddress,
        "IS_SKIP_MINT": "" + ( opts.isMint ? "" : "true" ),
        "URL_W3_ETHEREUM": "" + opts.IMA.w3_2_url( opts.mn.w3 ),
        "URL_W3_SCHAIN": "" + opts.IMA.w3_2_url( opts.sc.w3 ),
        "URL_W3_NODE_00": "" + opts.IMA.w3_2_url( opts.sc.w3 ),
        "PRIVATE_KEY_FOR_ETHEREUM": "" + opts.strDeployerPrivateKeyMN,
        "PRIVATE_KEY_FOR_SCHAIN": "" + opts.strDeployerPrivateKeySC
    };
    if( opts.strTruffleNetworkName == "sc00" ) {
        joEnv.TOKEN_MINTERS =
            "" + opts.sc.joABI.token_manager_erc20_address +
            "," + opts.sc.joABI.token_manager_erc721_address +
            "," + opts.sc.joABI.token_manager_erc1155_address
        ;
    }
    await helper_shell.exec_array_of_commands_safe( [
        "yarn install",
        "rm -rf ./build || true",
        "rm -f ./data/TestTokens.abi." + opts.strTruffleNetworkName + ".json || true",
        "npx truffle compile",
        "npx truffle migrate --network=" + opts.strTruffleNetworkName,
        "ls -1 ./data"
    ], opts.strFolderTestTokens, joEnv, 1 );
    if( opts.strTruffleNetworkName == "mn" ) {
        if( opts.joABI == null ) {
            opts.joABI = helper_utils.jsonFileLoad( path.join( opts.strFolderTestTokensData, "TestTokens.abi.mn.json" ), null );
            opts.contractERC20 = new opts.mn.w3.eth.Contract( opts.joABI.ERC20_abi, opts.joABI.ERC20_address );
            opts.contractERC721 = new opts.mn.w3.eth.Contract( opts.joABI.ERC721_abi, opts.joABI.ERC721_address );
            opts.contractERC1155 = new opts.mn.w3.eth.Contract( opts.joABI.ERC1155_abi, opts.joABI.ERC1155_address );
        }
    } else if( opts.strTruffleNetworkName == "sc00" ) {
        if( opts.joABI == null ) {
            opts.joABI = helper_utils.jsonFileLoad( path.join( opts.strFolderTestTokensData, "TestTokens.abi.sc00.json" ), null );
            opts.contractERC20 = new opts.sc.w3.eth.Contract( opts.joABI.ERC20_abi, opts.joABI.ERC20_address );
            opts.contractERC721 = new opts.sc.w3.eth.Contract( opts.joABI.ERC721_abi, opts.joABI.ERC721_address );
            opts.contractERC1155 = new opts.sc.w3.eth.Contract( opts.joABI.ERC1155_abi, opts.joABI.ERC1155_address );
        }
        await opts.IMA.sleep( 5000 );
        const joAccountDeployerMN = {
            privateKey: opts.strDeployerPrivateKeyMN
        };
        const joAccountDeployerSC = {
            privateKey: opts.strDeployerPrivateKeySC
        };
        opts.IMA.write_log( "Adding/registering ERC20 contract on Main NET for \"" + opts.sc.chainName + "\". Main NET token address " + opts.tokensMN.contractERC20.options.address + "..." );
        await opts.IMA.addERC20TokenByOwnerMN(
            opts.mn,
            joAccountDeployerMN,
            opts.sc.chainName,
            opts.tokensMN.contractERC20.options.address
        );
        opts.IMA.write_log( "Adding/registering ERC721 contract on Main NET for \"" + opts.sc.chainName + "\". Main NET token address " + opts.tokensMN.contractERC721.options.address + "..." );
        await opts.IMA.addERC721TokenByOwnerMN(
            opts.mn,
            joAccountDeployerMN,
            opts.sc.chainName,
            opts.tokensMN.contractERC721.options.address
        );
        opts.IMA.write_log( "Adding/registering ERC1155 contract on Main NET for \"" + opts.sc.chainName + "\". Main NET token address " + opts.tokensMN.contractERC1155.options.address + "..." );
        await opts.IMA.addERC1155TokenByOwnerMN(
            opts.mn,
            joAccountDeployerMN,
            opts.sc.chainName,
            opts.tokensMN.contractERC1155.options.address
        );
        opts.IMA.write_log( "Adding/registering ERC20 contract on S-Chain for \"" + opts.mn.chainName + "\". Main NET token address " + opts.tokensMN.contractERC20.options.address + ". S-Chain token address " + opts.contractERC20.options.address + "..." );
        await opts.IMA.addERC20TokenByOwnerSC(
            opts.sc,
            joAccountDeployerSC,
            opts.mn.chainName,
            opts.tokensMN.contractERC20.options.address,
            opts.contractERC20.options.address
        );
        opts.IMA.write_log( "Adding/registering ERC721 contract on S-Chain for \"" + opts.mn.chainName + "\". Main NET token address " + opts.tokensMN.contractERC721.options.address + ". S-Chain token address " + opts.contractERC721.options.address + "..." );
        await opts.IMA.addERC721TokenByOwnerSC(
            opts.sc,
            joAccountDeployerSC,
            opts.mn.chainName,
            opts.tokensMN.contractERC721.options.address,
            opts.contractERC721.options.address
        );
        opts.IMA.write_log( "Adding/registering ERC1155 contract on S-Chain for \"" + opts.mn.chainName + "\". Main NET token address " + opts.tokensMN.contractERC1155.options.address + ". S-Chain token address " + opts.contractERC1155.options.address + "..." );
        await opts.IMA.addERC1155TokenByOwnerSC(
            opts.sc,
            joAccountDeployerSC,
            opts.mn.chainName,
            opts.tokensMN.contractERC1155.options.address,
            opts.contractERC1155.options.address
        );
    }
    opts.IMA.write_log( "Successful deployment of \"Test Tokens\" to \"" + opts.strTruffleNetworkName + "\"" );
}

function can_load_test_tokens( opts ) {
    if( opts.strTruffleNetworkName == "mn" ) {
        try {
            joABI = helper_utils.jsonFileLoad( path.join( opts.strFolderTestTokensData, "TestTokens.abi.mn.json" ), null );
            if( typeof joABI == "object" &&
                "ERC20_abi" in joABI &&
                "ERC20_address" in joABI &&
                "ERC721_abi" in joABI &&
                "ERC721_address" in joABI &&
                "ERC1155_abi" in joABI &&
                "ERC1155_address" in joABI
            )
                return true;
        } catch ( err ) {
        }
    } else if( opts.strTruffleNetworkName == "sc00" ) {
        try {
            joABI = helper_utils.jsonFileLoad( path.join( opts.strFolderTestTokensData, "TestTokens.abi.sc00.json" ), null );
            if( typeof joABI == "object" &&
                "ERC20_abi" in joABI &&
                "ERC20_address" in joABI &&
                "ERC721_abi" in joABI &&
                "ERC721_address" in joABI &&
                "ERC1155_abi" in joABI &&
                "ERC1155_address" in joABI
            )
                return true;
        } catch ( err ) {
        }
    }
    return false;
}

function load_test_tokens( opts ) {
    if( opts.strTruffleNetworkName == "mn" ) {
        opts.joABI = helper_utils.jsonFileLoad( path.join( opts.strFolderTestTokensData, "TestTokens.abi.mn.json" ), null );
        opts.contractERC20 = new opts.mn.w3.eth.Contract( opts.joABI.ERC20_abi, opts.joABI.ERC20_address );
        opts.contractERC721 = new opts.mn.w3.eth.Contract( opts.joABI.ERC721_abi, opts.joABI.ERC721_address );
        opts.contractERC1155 = new opts.mn.w3.eth.Contract( opts.joABI.ERC1155_abi, opts.joABI.ERC1155_address );
        opts.contractChatParticipant = new opts.mn.w3.eth.Contract( opts.joABI.ChatParticipant_abi, opts.joABI.ChatParticipant_address );
    } else if( opts.strTruffleNetworkName == "sc00" ) {
        opts.joABI = helper_utils.jsonFileLoad( path.join( opts.strFolderTestTokensData, "TestTokens.abi.sc00.json" ), null );
        opts.contractERC20 = new opts.sc.w3.eth.Contract( opts.joABI.ERC20_abi, opts.joABI.ERC20_address );
        opts.contractERC721 = new opts.sc.w3.eth.Contract( opts.joABI.ERC721_abi, opts.joABI.ERC721_address );
        opts.contractERC1155 = new opts.sc.w3.eth.Contract( opts.joABI.ERC1155_abi, opts.joABI.ERC1155_address );
        opts.contractChatParticipant = new opts.mn.w3.eth.Contract( opts.joABI.ChatParticipant_abi, opts.joABI.ChatParticipant_address );
    }
}

module.exports = {
    deploy_test_tokens_to: deploy_test_tokens_to,
    can_load_test_tokens: can_load_test_tokens,
    load_test_tokens: load_test_tokens
};

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
 * @file 1_initial_migration.js
 * @copyright SKALE Labs 2019-Present
 */

const fs = require( "fs" );
const path = require( "path" );
const os = require( "os" );
// const web3 = require( "web3" );

const strAbiJsonNameSuffix = process.env.ABI_JSON_NAME_SUFFIX || "";

const strLogPrefix = "   >>>>";

// const Migrations = artifacts.require( "Migrations" );
const ERC20 = artifacts.require( "ERC20" );
const ERC721 = artifacts.require( "ERC721" );
const ERC1155 = artifacts.require( "ERC1155" );
const ChatParticipant = artifacts.require( "ChatParticipant" );

function normalizePath( strPath ) {
    strPath = strPath.replace( /^~/, os.homedir() );
    strPath = path.normalize( strPath );
    strPath = path.resolve( strPath );
    return strPath;
}

module.exports = function( deployer, network, accounts ) {
    console.log( strLogPrefix, "Deployer network is", "\"" + network + "\"" );
    console.log( strLogPrefix, "Deployer accounts are", accounts );

    deployer.then( async() => {
        // deployer.deploy( Migrations );

        const name = "SERGE";
        const symbol = "SRG";
        const decimals = 18;
        const uri1155 = "say something";
        const contractERC20 = await deployer.deploy( ERC20, name, symbol, decimals );
        // console.log( contractERC20 );
        console.log( strLogPrefix, "Contract \"ERC20\" was successfully deployed at address", "\"" + ERC20.address + "\"" );

        const contractERC721 = await deployer.deploy( ERC721, name, symbol );
        console.log( strLogPrefix, "Contract \"ERC721\" was successfully deployed at address", "\"" + ERC721.address + "\"" );
        // console.log( contractERC721 );

        const contractERC1155 = await deployer.deploy( ERC1155, uri1155 );
        console.log( strLogPrefix, "Contract \"ERC1155\" was successfully deployed at address", "\"" + ERC1155.address + "\"" );
        // console.log( contractERC1155 );

        const contractChatParticipant = await deployer.deploy( ChatParticipant
            // , "", "0x0", "0x0"
            );

        const strAbiJsonNameSuffixEffective = strAbiJsonNameSuffix || ( "." + network.trim() );
        //
        // save summary ABI JSON
        //
        const joAbiSummary = {
            ERC20_address: ERC20.address,
            ERC20_abi: ERC20.abi,
            ERC721_address: ERC721.address,
            ERC721_abi: ERC721.abi,
            ERC1155_address: ERC1155.address,
            ERC1155_abi: ERC1155.abi,
            ChatParticipant_address: ChatParticipant.address,
            ChatParticipant_abi: ChatParticipant.abi,
        };
        let strPathAbiJsonFile = normalizePath( path.join( __dirname, "../data/TestTokens.abi" + strAbiJsonNameSuffixEffective + ".json" ) );
        try {
            fs.writeFileSync( strPathAbiJsonFile, JSON.stringify( joAbiSummary ) + "\n\n" );
            console.log( strLogPrefix, "Saved ABI JSON file \"" + strPathAbiJsonFile + "\"" );
        } catch ( err ) {
            console.warn( strLogPrefix, "CRITICAL ERROR: failed to save ABI JSON file \"" + strPathAbiJsonFile + "\", error is:", err );
            process.exit( 13 );
        }
        //
        // save standing alone ABI JSON for ERC20 only
        //
        const joAbiOnlyERC20 = {
            ERC20_address: ERC20.address,
            ERC20_abi: ERC20.abi
        };
        strPathAbiJsonFile = normalizePath( path.join( __dirname, "../data/TestToken.ERC20.abi" + strAbiJsonNameSuffixEffective + ".json" ) );
        try {
            fs.writeFileSync( strPathAbiJsonFile, JSON.stringify( joAbiOnlyERC20 ) + "\n\n" );
            console.log( strLogPrefix, "Saved ABI JSON file \"" + strPathAbiJsonFile + "\"" );
        } catch ( err ) {
            console.warn( strLogPrefix, "CRITICAL ERROR: failed to save ABI JSON file \"" + strPathAbiJsonFile + "\", error is:", err );
            process.exit( 13 );
        }
        //
        // save standing alone ABI JSON for ERC721 only
        //
        const joAbiOnlyERC721 = {
            ERC721_address: ERC721.address,
            ERC721_abi: ERC721.abi
        };
        strPathAbiJsonFile = normalizePath( path.join( __dirname, "../data/TestToken.ERC721.abi" + strAbiJsonNameSuffixEffective + ".json" ) );
        try {
            fs.writeFileSync( strPathAbiJsonFile, JSON.stringify( joAbiOnlyERC721 ) + "\n\n" );
            console.log( strLogPrefix, "Saved ABI JSON file \"" + strPathAbiJsonFile + "\"" );
        } catch ( err ) {
            console.warn( strLogPrefix, "CRITICAL ERROR: failed to save ABI JSON file \"" + strPathAbiJsonFile + "\", error is:", err );
            process.exit( 13 );
        }
        //
        // save standing alone ABI JSON for ERC1155 only
        //
        const joAbiOnlyERC1155 = {
            ERC1155_address: ERC1155.address,
            ERC1155_abi: ERC1155.abi
        };
        strPathAbiJsonFile = normalizePath( path.join( __dirname, "../data/TestToken.ERC1155.abi" + strAbiJsonNameSuffixEffective + ".json" ) );
        try {
            fs.writeFileSync( strPathAbiJsonFile, JSON.stringify( joAbiOnlyERC1155 ) + "\n\n" );
            console.log( strLogPrefix, "Saved ABI JSON file \"" + strPathAbiJsonFile + "\"" );
        } catch ( err ) {
            console.warn( strLogPrefix, "CRITICAL ERROR: failed to save ABI JSON file \"" + strPathAbiJsonFile + "\", error is:", err );
            process.exit( 13 );
        }
        //
        // save standing alone ABI JSON for ChatParticipant only
        //
        const joAbiOnlyChatParticipant = {
            ChatParticipant_address: ChatParticipant.address,
            ChatParticipant_abi: ChatParticipant.abi
        };
        strPathAbiJsonFile = normalizePath( path.join( __dirname, "../data/TestToken.ChatParticipant.abi" + strAbiJsonNameSuffixEffective + ".json" ) );
        try {
            fs.writeFileSync( strPathAbiJsonFile, JSON.stringify( joAbiOnlyChatParticipant ) + "\n\n" );
            console.log( strLogPrefix, "Saved ABI JSON file \"" + strPathAbiJsonFile + "\"" );
        } catch ( err ) {
            console.warn( strLogPrefix, "CRITICAL ERROR: failed to save ABI JSON file \"" + strPathAbiJsonFile + "\", error is:", err );
            process.exit( 13 );
        }

        //
        // mint required tokens initially, if needed
        //
        const isSkipMint = ( process.env.IS_SKIP_MINT ) ? true : false;
        if( isSkipMint )
            console.log( strLogPrefix, "Token minting is skipped.\n" );
        else {
            const strMintToAddress =
                ( process.env.ADDRESS_MINT_TO
                && typeof process.env.ADDRESS_MINT_TO == "string"
                && process.env.ADDRESS_MINT_TO.length > 0
                )   ? process.env.ADDRESS_MINT_TO
                    : "0x7aa5E36AA15E93D10F4F26357C30F052DacDde5F";
            const amountERC20 = 100000000000;
            console.log( strLogPrefix, "Minting ERC20 amount", amountERC20, "to", strMintToAddress, "..." );
            await contractERC20.mint( strMintToAddress, amountERC20 );
            console.log( strLogPrefix, "Done." );
            const firstTokenIdERC721 = 1;
            for( let i = 0; i < 5; ++ i ) {
                console.log( strLogPrefix, "Minting ERC721 token ID", firstTokenIdERC721 + i, "to", strMintToAddress, "..." );
                await contractERC721.mint( strMintToAddress, firstTokenIdERC721 + i );
                console.log( strLogPrefix, "Done." );
                //
                console.log( strLogPrefix, "Minting ERC1155 token ID", firstTokenIdERC721 + i, "(amount is" + amountERC20 + ")", "to", strMintToAddress, "..." );
                await contractERC1155.mint( strMintToAddress, firstTokenIdERC721 + i, amountERC20, [] );
                console.log( strLogPrefix, "Done." );
            }
        }

        //
        // register privileged token minters initially, if needed
        //
        const arrMinters = ( process.env.TOKEN_MINTERS
            && typeof process.env.TOKEN_MINTERS == "string"
            && process.env.TOKEN_MINTERS.length > 0
            )   ? process.env.TOKEN_MINTERS.split( "," )
            : [];
        if( arrMinters.length > 0 ) {
            console.log( strLogPrefix, "" );
            console.log( strLogPrefix, "Minters are: " + JSON.stringify( arrMinters ) );
            for( const strMinterAddressWalk of arrMinters ) {
                const strMinterAddress = strMinterAddressWalk.trim();
                if( strMinterAddress.length > 0 ) {
                    console.log( strLogPrefix, "" );
                    //
                    console.log( strLogPrefix, "Adding token minter", strMinterAddress, "to ERC20 contract", ERC20.address, "..." );
                    await contractERC20.privilegedAdd( strMinterAddress );
                    console.log( strLogPrefix, "Done." );
                    //
                    console.log( strLogPrefix, "Adding token minter", strMinterAddress, "to ERC721 contract", ERC721.address, "..." );
                    await contractERC721.privilegedAdd( strMinterAddress );
                    console.log( strLogPrefix, "Done." );
                    //
                    console.log( strLogPrefix, "Adding token minter", strMinterAddress, "to ERC1155 contract", ERC1155.address, "..." );
                    await contractERC1155.privilegedAdd( strMinterAddress );
                    console.log( strLogPrefix, "Done." );
                }
            }
        }

        console.log( strLogPrefix, "" );
        console.log( strLogPrefix, "All actions done.\n" );
    } );

};

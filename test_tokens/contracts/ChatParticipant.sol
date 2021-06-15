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
 * @file ChatParticipant.sol
 * @copyright SKALE Labs 2019-Present
 */

pragma solidity 0.6.12;
pragma experimental ABIEncoderV2;

import "./interfaces/IMessageProxy.sol";
import "./interfaces/IMessageReceiver.sol";

contract ChatParticipant is IMessageReceiver {

    event MessageArrivedEvent(bytes32 schainHash, string nickname, string text);

    //
    // Basic things
    //

    enum MessageTypeEnum {
        EMPTY,
        MSG_TYPE_CHAT_ITEM
    }

    struct BaseMessage {
        MessageTypeEnum messageType_;
    }

    struct ChatMessage {
        BaseMessage baseMessage_;
        string nickname_;
        string text_;
    }

    //
    // Data
    //

    address private messageProxy_;
    address private otherParticipant_;
    string private thisChainName_;
    ChatMessage[] private arrReceivedMessages_;

    //
    // Sending
    //

    function sendToOtherChain(
        string calldata destinationChainName,
        string calldata nickname,
        string calldata text
        )
        external
    {
        bytes32 destinationChainHash = keccak256( abi.encodePacked( destinationChainName ) );
        IMessageProxy messageProxy = IMessageProxy( messageProxy_ );
        messageProxy.postOutgoingMessage(
            destinationChainHash,
            otherParticipant_,
            encodeMessage( nickname, text )
            );
    }

    //
    // Receiving
    //

    function postMessage(
        bytes32 fromChainHash,
        address sender,
        bytes calldata data
        )
        external override
        returns (address)
    {
        require( msg.sender == address(messageProxy_), "Sender is not message proxy" );
        require( sender == otherParticipant_, "Sender is not correct" );
        // // // // require(fromChainHash == MAINNET_HASH, "Source chain name must be Mainnet");
        MessageTypeEnum operation = getMessageType( data );
        require(operation == MessageTypeEnum.MSG_TYPE_CHAT_ITEM, "Message type is not MSG_TYPE_CHAT_ITEM(point 1)");
        ChatMessage memory message = decodeMessage( data); 
        arrReceivedMessages_.push( message );
        emit MessageArrivedEvent( fromChainHash, message.nickname_, message.text_ );
        return address(0);
    }

    //
    // Code
    //

    constructor(
        // string memory thisChainName, IMessageProxy aMessageProxy, address anOtherParticipant
        )
        public
    {
        // thisChainName_ = thisChainName;
        // messageProxy_ = aMessageProxy;
        // otherParticipant_ = anOtherParticipant;
    }

    function setThisChainName( string memory thisChainName ) public {
        thisChainName_ = thisChainName;
    }

    function setMessageProxy( address aMessageProxy ) public {
        messageProxy_ = aMessageProxy;
    }

    function setOtherParticipant( address anOtherParticipant ) public {
        otherParticipant_ = anOtherParticipant;
    }

    function encodeMessage( string memory nickname, string memory text )
        internal pure
        returns ( bytes memory )
    {
        ChatMessage memory message = ChatMessage(
            BaseMessage( MessageTypeEnum.MSG_TYPE_CHAT_ITEM ),
            nickname,
            text
        );
        return abi.encode( message );
    }

    function decodeMessage( bytes calldata data )
        internal pure
        returns ( ChatMessage memory )
    {
        require( getMessageType(data) == MessageTypeEnum.MSG_TYPE_CHAT_ITEM, "Message type is not MSG_TYPE_CHAT_ITEM(point 2)" );
        return abi.decode( data, (ChatMessage) );
    }

    function getMessageType( bytes calldata data )
        internal pure
        returns ( MessageTypeEnum )
    {
        uint256 firstWord = abi.decode( data, (uint256) );
        if( firstWord % 32 == 0 ) {
            return getMessageType (data[ firstWord: ]) ;
        } else {
            return abi.decode( data, (MessageTypeEnum) );
        }
    }

    function getReceivedMessageCount()
        public view
        returns ( uint256 )
    {
        return arrReceivedMessages_.length;
    }

    function getReceivedMessageAt( uint256 i )
        public view
        returns ( ChatMessage memory )
    {
        require( i < arrReceivedMessages_.length, "Index of message out of range" );
        return arrReceivedMessages_[ i ];
    }

    function getLastReceivedMessage()
        public view
        returns ( ChatMessage memory )
    {
        require( arrReceivedMessages_.length > 0, "No messages were received yet" );
        return getReceivedMessageAt( getReceivedMessageCount() - 1 );
    }

    // function isMainNet()
    //     public view
    //     returns ( bool )
    // {
    //     return ( keccak256( abi.encodePacked( thisChainName_ ) ) == keccak256( abi.encodePacked( "Mainnet" ) ) ) ? true : false;
    // }

}

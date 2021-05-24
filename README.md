<!-- SPDX-License-Identifier: (AGPL-3.0-only OR CC-BY-4.0) -->

# IMA JS

## At a Glance

**IMA.JS** library implements easiest and minimal possible API to transfer **ETH**, **ERC20** and **ERC721** between **Main NET** and **S-Chain**. Additionally, **IMA.JS** provides the following services and utility operations:

- Fetch **ETH** and **ERC20** balances, **ERC721** token owners
- Disable automatic token deployment(instantiation) on **S-Chain**
- **ERC20** and **ERC721** tokens registration on **Main NET** and **S-Chain** parts of **IMA**.

Full set of supported features is demonstrated in pretty short `test.js` sample application.

Sample implementations of **ERC20** and **ERC721** tokens are provided in the `test_tokens` folder.

**IMA.JS** library provided as is, no build required. Both server side and browser versions are single `ima.js` file.

## Initialization

For server side **Node JS** version:

```js
const IMA = require( "./ima.js" ).IMA;
```

For browser version:

```js
<script src="ima.js"></script>
```

## Objects

### Chain

The **Chain** object defines **Main NET** or **S-Chain** access API:

```js
const chain = new IMA.Chain( w3, joABI, chainName, chainID );
```

To get **Web3 JS** object, ABI object, chain name and chain ID from `chain` object:

```js
const w3 = sc.w3;
const jsonABI = sc.joABI;
const strChainName = sc.chainName;
const chainID = sc.chainID;
```

Where:

- `w3` is **Web3 JS** instance
- `joABI` is **IMA** ABI for **Main NET** or **S-Chain**
- `chainName` is name of registered in **IMA** chain, `"Mainnet"` is for **Main NET**
- `chainID` chain ID, `1` for **Main NET**, `4` for **Rinkeby**, etc

To define token alias:

```js
chain.defineTokenAlias( tokenInfo.abi, tokenInfo.address, "MyTokenAliasName" );
```

To undefine token alias:

```js
chain.undefineTokenAlias( "MyTokenAliasName" );
```

To check token alias is defined:

```js
const isRegisteredTokenAlias = chain.isTokenAlias( "MyTokenAliasName" );
console.log( "isRegisteredTokenAlias =", isRegisteredTokenAlias );
```

To get array of all defined token alias names:

```js
const arr = chain.getTokenAliases();
console.log( "aliases =", arr );
```

To get token alias `{ abi: ...; address: ...}` by name:

```js
const tokenAlias = chain.resolveTokenAlias( "MyTokenAliasName" );
console.log( "tokenAlias =", tokenAlias );
```

### Account

The **Account** object defines wallet to use. It can be:

- Explicit and insecure private key reference
- **SGX Wallet** reference
- **Transaction Manager** reference

To initialize explicit and insecure private reference account:

```js
const joAccount = {
    privateKey: "0x..."
};
```

To initialize **SGX Wallet** reference:

```js
const joAccount = {
    address_: "0x.....", // provide address for private key that is hidden inside SGX wallet
    strSgxURL: ...,
    strSgxKeyName: ...,
    strSslKey: ..., // key as text content
    strSslCert: ... // cert as text content
};
```

To initialize **Transaction Manager** reference:

```js
const joAccount = {
    address_: "0x.....", // provide address for private key that is hidden inside SGX wallet
    strTransactionManagerURL: ...
};
```

To get wallet address from account object:

```js
const strWalletAddress = IMA.get_account_wallet_address( sc.w3, joAccount );
```

### Transaction Customizer

The **Transaction Customizer** object allows to customize gas consumptions:

```js
const gasPriceMultiplier = 1.25;
const gasMultiplier = 1.25;
const transactionCustomizer =
    new IMA.TransactionCustomizer( gasPriceMultiplier, gasMultiplier );
```

The `gasPriceMultiplier` will be used to multiply provided by chain gas price and use result gas price when submitting transaction.

The `gasMultiplier` will be used to multiply estimated and use result gas value when submitting transaction.

Any or both of `gasPriceMultiplier` and `gasMultiplier` values can be `null` to disable customization.

## Basic Operations

Most of APIs exposed by **IMA JS** are `async` functions because they invoke potentially lengthy network operations.

### Getting ETH balance

```js
const ethBalance = await IMA.getETHbalance(
    chain, strWalletAddress );
```

### Getting ERC20 balance

```js
const erc20balance = await IMA.getERC20balance
    chain, strWalletAddress, { abi: ERC20_abi_json, address: ERC20_contract_address } );
```

or

```js
const erc20balance = await IMA.getERC20balance
    chain, strWalletAddress, strTokenAlias );
```

### Getting ERC721 balance

```js
const erc721tokenOwnerWalletAddress = await IMA.getERC721ownerOf(
    chain, strWalletAddress, { abi: ERC721_abi_json, address: ERC721_contract_address }, tokenID );
```

or

```js
const erc721tokenOwnerWalletAddress = await IMA.getERC721ownerOf(
    chain, strWalletAddress, strTokenAlias, tokenID );
```

## Transfer Operations

### ETH Transfers

#### Transferring ETH from Main NET to S-Chain

```js
const opts = {
    isIgnoreDRC: false,
    transactionCustomizer: null
};
await IMA.depositETHtoSchain(
    chainMN, chainSC,
    joAccountMN, joAccountSC,
    weiTransfer,
    opts );
```

#### Transferring ETH from S-Chain to Main NET

```js
const opts = {
    isIgnoreDRC: false,
    transactionCustomizer: null
};
await IMA.withdrawETHfromSchain(
    chainSC, chainMN,
    joAccountSC, joAccountMN,
    weiTransfer,
    opts );
```

### ERC20 Transfers

#### Transferring ERC20 from Main NET to S-Chain

```js
const opts = {
    isIgnoreDRC_approve: false,
    isIgnoreDRC_rawDepositERC20: false,
    transactionCustomizer: null,
    weiReserve: "100000000000000000" // 100 finney
};
await IMA.depositERC20toSchain(
    chainMN, chainSC,
    joAccountMN, joAccountSC,
    { abi: ERC20_abi_json, address: ERC20_contract_address }, // or token alias on S-Chain
    tokenAmount,
    opts );
```

#### Transferring ERC20 from S-Chain to Main NET

```js
const opts = {
    isIgnoreDRC_approve: false,
    isIgnoreDRC_rawExitToMainERC20: false,
    transactionCustomizer: null,
    weiReserve: "100000000000000000" // 100 finney
};
await IMA.withdrawERC20fromSchain(
    chainSC, chainMN,
    joAccountSC, joAccountMN,
    { abi: ERC20_abi_SC_json, address: ERC20_contract_address_SC }, // or token alias on S-Chain
    { abi: ERC20_abi_MN_json, address: ERC20_contract_address_MN }, // or token alias on Main NET
    tokenAmount,
    opts );
```

### ERC721 Transfers

#### Transferring ERC721 from Main NET to S-Chain

```js
const opts = {
    isIgnoreDRC_approve: false,
    isIgnoreDRC_rawDepositERC721: false,
    transactionCustomizer: null,
    weiReserve: "100000000000000000" // 100 finney
};
await IMA.depositERC721toSchain(
    chainMN, chainSC,
    joAccountMN, joAccountSC,
    { abi: ERC721_abi_MN_json, address: ERC721_contract_address_MN }, // or token alias on Main NET
    tokenID,
    opts );
```

#### Transferring ERC721 from S-Chain to Main NET

```js
const opts = {
    isIgnoreDRC_transferFrom: false,
    isIgnoreDRC_rawExitToMainERC721: false,
    transactionCustomizer: null,
    weiReserve: "100000000000000000" // 100 finney
};
await IMA.withdrawERC721fromSchain(
    chainSC, chainMN,
    joAccountSC, joAccountMN,
    { abi: ERC721_abi_SC_json, address: ERC721_contract_address_SC }, // or token alias on S-Chain
    { abi: ERC721_abi_MN_json, address: ERC721_contract_address_MN }, // or token alias on Main NET
    tokenID,
    opts );
```

### Gas Reimbursement

The following set of APIs allow to control Gas Reimbursement expenses for cross-chain asset transfers.

#### Show Wallet Balance

```js
const nValue =
    await IMA.reimbursementGetBalance(
        chain, // Main NET
        walletAddress,
        strChainName // Name of S-Chain
        );
```

#### Recharge Wallet

```js
const opts = {
    isIgnoreDRC: false,
    transactionCustomizer: null
};
const nValue = "1000000000000000000"; // 1 ETH in Wei
await IMA.reimbursementWalletRecharge(
    chain, // Main NET
    joAccount,
    strChainName, // Name of S-Chain
    nValue,
    opts
);
```

#### Withdraw Wallet

```js
const opts = {
    isIgnoreDRC: false,
    transactionCustomizer: null
};
const nValue = "1000000000000000000"; // 1 ETH in Wei
await IMA.reimbursementWalletWithdraw(
    chain, // Main NET
    joAccount,
    strChainName, // Name of S-Chain
    nValue,
    opts
);
```

## Implementation Notes

### Web3 JS Usage

**IMA JS** does not instantiate **Web3 JS** objects. However you can use utility call to do this:

```js
const w3 =  helper_utils.getWeb3FromURL( "http://127.0.0.1:8545" );
```

### IMA Usage

**IMA** must be preliminary deployed to **Main NET** and **S-Chain** and fully initialized. You should provide both **Main NET** and **S-Chain** IMA ABIs to the `test.js` test application.

### How IMA JS works?

**IMA JS** only does **IMA**'s smart contracts invocations on both **Main NET** and **S-Chain**.

**IMA JS** does not invoke any other network or local services or APIs.

**IMA JS** does not generate or tries to access any files outside its folder. Excluding reading operations for **IMA** ABI JSON files you provide to `test.js` application.

**IMA JS** does not install any software or dependencies outside its folder.

## Other Notes

- Server side **Node JS** version requires dependencies to be installed with `npm install` or `yarn install`
- CJS version only
- **SGX** and **Transaction Manager** are supported by server side version only

# Hierarchical Deterministic (HD) Wallets

📌 **NOTE: This assignment is compulsory. You need to complete this in order to generate your own mnemonic phrase in a .env file which will be used for future labs.**

## 1. From Keys to Wallets

We have learnt that an Ethereum account is represented by an address derived from a private key. In practice, however, users often need many addresses — for privacy, account separation, or interacting with different apps. Since private keys are cryptic, managing dozens of unrelated private keys would be cumbersome and risky. To solve this, modern wallets use a system called Hierarchical Deterministic (HD) wallets, which can generate and manage unlimited addresses from a single master seed.

### Core Concepts

HD Wallets use cryptographic principles to generate multiple addresses from a single seed phrase (mnemonic). This system provides:

-   **Deterministic Generation**: Same seed always produces same address sequence
-   **Infinite Addresses**: Can generate unlimited addresses from one seed
-   **Backup Simplicity**: One mnemonic backs up entire wallet
-   **Cross-Wallet Compatibility**: Standard ensures wallet interoperability

### Mnemonic Seed Phrases

Typically consist of 12 or 24 words that encode the master seed for address generation. Each word comes from a standardized list of 2048 words (BIP39 standard).

### Protecting Your Mnemonic

This mnemonic phrase is imported into wallet software to generate your private keys and addresses, for example, Metamask. But sometimes, we may need to save the mnemonic in server-side applications such as Hardhat Network for automated tasks like contract deployment or scheduled transactions.

The mnemonic we generated from the Lab Practice is sensitive information that should not be stored as plain text in the config file or hard-coded in your code base.

-   **Single Point of Failure**: Compromised mnemonic exposes all derived addresses
-   **Backup Critical**: Loss of mnemonic means loss of all funds
-   **Storage Best Practices**: Never store digitally, use secure physical storage

In the following lab, we will learn how to use the `dotenv` package to securely manage environment variables like mnemonics.

---

## 🛠️ Lab Practice: Using Mnemonic Phrase

In this lab, we will learn how to configure HD wallets in Hardhat Network and manage mnemonics securely using environment variables.

Hardhat uses a well-known default mnemonic for its local network:

```txt
test test test test test test test test test test test junk
```

We will prove that this is indeed the default mnemonic by comparing the addresses generated from this mnemonic with the accounts provided by Hardhat Network.

### Step 1: Start Hardhat Local Node

-   **Install packages**

    ```bash
    cd /workspace/day-1/home-assignments/06-hd-wallet
    npm i
    ```

-   **Startup Hardhat Standalone Network**

    If the node is already running from previous lab, press `Ctrl+C` to stop it first before starting again.

    ```bash
     hh node

     # Output:

     # Accounts
     # ========
     #
     # WARNING: These accounts, and their private keys, are publicly known.
     # Any funds sent to them on Mainnet or any other live network WILL BE  # LOST.
     #
     # Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (10000 ETH)
     # Private Key:  # 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
    ```

    Keep this running till the end of this lab as we want to compare the addresses generated from the mnemonic after we set it in the config file.

### Step 2: Configure Hardhat Network with Default Mnemonic

-   **Set Mnemonic Phrase for Hardhat Network**

    Open hardhat.config.js and add a **hardhat** network configuration with
    the mnemonic "test test test test test test test test test test test junk"

    ```javascript
    module.exports = {
        solidity: "0.8.20",
        networks: {
            localhost: {
                url: "http://localhost:8545",
            },
            hardhat: {
                accounts: {
                    mnemonic:
                        "test test test test test test test test test test test junk",
                },
            },
        },
    };
    ```

-   **Start Hardhat Console**

    Open a parallel terminal window and run:

    ```bash
    hh console
    ```

    NOTE: Do not connect to localhost because we want to use the Hardhat Network built-in provider which uses the mnemonic we just set in the config file.

-   **Get account addresses**

    In the Hardhat console, run the following command to address of the first account:

    ```js
    > const { ethers } = require("hardhat");
    > accounts = await ethers.getSigners();
    > accounts[0].address
    // '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'

    ```

    Compare this address with the first account address printed in the Hardhat Node terminal. They should match.

### Step 3: Generate Custom Mnemonic and Configure Hardhat Network

**NOTE:📌** This is the most important part of this lab. Please follow the instructions carefully.

-   **Generate New Mnemonic Phrase**

    In the Hardhat console, run the following commands line by line after the `>` prompt to generate a new mnemonic phrase:

    ```js
    > mnemonic = ethers.Wallet.createRandom().mnemonic.phrase;

    // Sample Output:
    // 'hill drive sure whip bargain horn raven sunny claw example merit income'
    ```

    Record the generated mnemonic as we will need it in the next step.

    Type "CTRL+C" to exit the Hardhat console.

-   **Install dotenv package**

    We need to install a package called `dotenv` that allow us to load environment variables from a `.env` file.

    ```bash
    npm i dotenv
    ```

-   **Create .env file**
    Create a file named `.env` in the lesson directory and add the following content:

    ```env
    FIN556_MNEMONIC="your mnemonic phrase here"
    ```

    Replace `your mnemonic phrase here` with the mnemonic you generated earlier.

-   **Update hardhat.config.js**

    Open `hardhat.config.js`.

    Replace the mnemonic in the **hardhat** network configuration from this:

    ```javascript
    mnemonic:
        "test test test test test test test test test test test junk",
    ```

    to this:

    ```javascript
    mnemonic: process.env.FIN556_MNEMONIC,
    ```

### Step 4: Verify New Mnemonic is Used

-   **Restart Hardhat Console**

    ```bash
    hh console
    ```

-   **Get account addresses again**

    In the Hardhat console, run the following command to address of the first account:

    ```js
    > const { ethers } = require("hardhat");
    > accounts = await ethers.getSigners();
    > accounts[0].address

    // '0x...' Your new address from the new mnemonic will show here

    ```

    Compare this address with the first account address printed in the Hardhat Node terminal. They will not match because we have changed the mnemonic.

**NOTE:📌** Pay attention to the **".env"** file and **hardhat.config.js** changes you made in this lab. It will be used in future labs.

---

## 2. Derivation Paths

You may have noticed that Hardhat Local Node generates 20 accounts by default. And each time you run the following commands:

```js
const accounts = await ethers.getSigners();
accounts[0].address
accounts[1].address
accounts[2].address
...
```

You get the same 20 addresses.

That is because unlike a single private key wallet, HD wallets can generate multiple addresses from the same mnemonic using a concept called derivation paths.

Addresses are generated using derivation paths like `m/44'/60'/0'/0` where:

-   `m`: Master key
-   `44'`: Purpose (HD wallets)
-   `60'`: Coin type (Ethereum)
-   `0'`: Account index
-   `0`: Change index (external addresses)

By changing the last segment of the derivation path, we can generate different addresses from the same mnemonic.

For example, the first three addresses are derived using the following paths:

-   First address: `m/44'/60'/0'/0/0`
-   Second address: `m/44'/60'/0'/0/1`
-   Third address: `m/44'/60'/0'/0/2`

Notice how only the last segment changes to generate different addresses.

---

## 🛠️ Lab Practice: Using Derivation Paths

-   **Start Hardhat Console**

    ```bash
    hh console
    ```

-   **Generate New Mnemonic Phrase**

    Generate a new mnemonic phrase and save it into a variable:

    ```js
    > const { ethers } = require("ethers");
    > mnemonic = ethers.Wallet.createRandom().mnemonic.phrase;

    // Sample Output:
    // 'hill drive sure whip bargain horn raven sunny claw example merit income'
    ```

-   **Generate Accounts**

    Use the generated mnemonic to derive the first three Ethereum accounts using the standard derivation path `m/44'/60'/0'/0/n` where `n` is the account index (0, 1, 2).

    ```js

    // Derive the first account (Ethereum derivation path: m/44'/60'/0'/0/0)

    > const wallet0 = ethers.HDNodeWallet.fromPhrase(
        mnemonic,
        null,
        "m/44'/60'/0'/0/0"
    );
    > wallet0.address

    // Sample Output:
    // '0x18b2Ba693Fc01A6e7e6031e5a31936AC8ED8Aef5'

    // ------------------------------------------------------------------

    // Derive the second account (m/44'/60'/0'/0/1)

    > const wallet1 = ethers.HDNodeWallet.fromPhrase(
        mnemonic,
        null,
        "m/44'/60'/0'/0/1"
    );
    > wallet1.address

    // Sample Output:
    // '0x1B1256AD2F06d73F44C211660124c3d1ad706369'

    // ------------------------------------------------------------------

    // Derive the third account (m/44'/60'/0'/0/2)

    > const wallet2 = ethers.HDNodeWallet.fromPhrase(
        mnemonic,
        null,
        "m/44'/60'/0'/0/2"
    );
    > wallet2.address

    // Sample Output:
    //'0x56EDa570299e4e28B8dA016E1eFABc2FB8872A4f'

    ```

    Record the generated mnemonic and the first three account addresses.

    You can see that by changing the last segment of the derivation path, we can generate different addresses from the same mnemonic.

-   **Task Completed ✅**

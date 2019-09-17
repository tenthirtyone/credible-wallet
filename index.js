const ethers = require("ethers");
const Notary = require("./abi/Notary");
const Credible = require("./abi/Credible");

class Wallet {
  constructor() {
    this.ethers = ethers;
    this.Notary = Notary;
    this.Credible = Credible;
    this.wallet = null;
    this.provider = null;
    this.mnemonic = process.env.MNEMONIC || null;
    this.network = "rinkeby";

    this.init();
  }
  async deployNotary() {
    if (!this.provider) {
      return undefined;
    }

    const { abi, bytecode } = Notary;

    const factory = new this.ethers.ContractFactory(abi, bytecode, this.wallet);
    let contract;
    try {
      contract = await factory.deploy();
    } catch (e) {
      return console.log(e);
    }

    await contract.deployed();

    const newNotary = {
      name: "Notary",
      abi,
      bytecode,
      address: contract.address,
      deployTx: contract.deployTransaction.hash,
      deployer: this.address,
      owner: this.address
    };

    return newNotary;
  }
  async deployCredible() {
    if (!this.provider) {
      return undefined;
    }

    const { abi, bytecode } = Credible;

    const factory = new this.ethers.ContractFactory(abi, bytecode, this.wallet);
    let contract;
    try {
      contract = await factory.deploy("Credible", "CRED");
    } catch (e) {
      return console.log(e);
    }

    await contract.deployed();

    const newCredible = {
      name: "Credible",
      abi,
      bytecode,
      address: contract.address,
      deployTx: contract.deployTransaction.hash,
      deployer: this.address,
      owner: this.address
    };

    return newCredible;
  }
  async createAsset(uri, asset) {
    const { abi } = this.Credible;
    const address = "0xB5c61b66eeC8F7633A055c6De6f573e63E928182";
    const contract = new this.ethers.Contract(address, abi, this.provider);
    const contractWithSigner = contract.connect(this.wallet);

    const bytes32 = asset;

    const tx = await contractWithSigner.mint(uri, bytes32);

    return await tx.wait();
  }
  async updateAsset(uri, asset, tokenId) {
    const { abi } = this.Credible;
    const address = "0xB5c61b66eeC8F7633A055c6De6f573e63E928182";
    const contract = new this.ethers.Contract(address, abi, this.provider);
    const contractWithSigner = contract.connect(this.wallet);

    const bytes32 = asset;

    const tx = await contractWithSigner.update(uri, bytes32, tokenId);

    return await tx.wait();
  }
  async getAsset(tokenId) {
    const { abi } = this.Credible;
    const address = "0xB5c61b66eeC8F7633A055c6De6f573e63E928182";
    const contract = new this.ethers.Contract(address, abi, this.provider);
    const asset = await contract.getAsset(tokenId);

    return asset;
  }
  async notarize(hash) {
    const { abi } = this.Notary;
    const address = "0x715AE18208c2B9AE261FDd32B225129C098A46D7";
    const contract = new this.ethers.Contract(address, abi, this.provider);
    const contractWithSigner = contract.connect(this.wallet);

    const tx = await contractWithSigner.notarize(hash);

    await tx.wait();
    return {
      txHash: tx.hash,
      hash
    };
  }
  async isNotarized(data) {
    const { abi } = Notary;
    const address = "0x715AE18208c2B9AE261FDd32B225129C098A46D7";
    const contract = new this.ethers.Contract(address, abi, this.provider);

    const bytes32 = this.ethers.utils.formatBytes32String(data);

    return await contract.isNotarized(bytes32);
  }
  async getTransaction(txHash) {
    let tx;
    try {
      tx = await this.provider.getTransaction(txHash);
    } catch (e) {
      console.error(e);
    }

    return tx;
  }
  init() {
    if (!this.mnemonic) {
      return undefined;
    }

    const privateKey = this.ethers.Wallet.fromMnemonic(this.mnemonic).privateKey;

    this.provider = this.ethers.getDefaultProvider(this.network);
    this.wallet = new this.ethers.Wallet(privateKey, this.provider);
    return this.wallet;
  }
  get address() {
    if (!this.wallet) {
      return undefined;
    }

    return this.wallet.address;
  }
  get pubkey() {
    if (!this.wallet) {
      return undefined;
    }

    return this.wallet.keyPair.publickey;
  }
  async info() {
    if (!this.wallet) {
      return undefined;
    }

    return {
      address: this.address,
      transactionCount: await this.transactionCount(),
      balance: await this.getBalance()
    };
  }
  async sendTransaction(tx) {
    const parsedTx = {
      to: tx.to,
      value: this.ethers.utils.parseEther(tx.value)
    };
    return await this.wallet.sendTransaction(parsedTx);
  }
  async transactionCount() {
    if (!this.provider) {
      return undefined;
    }

    return await this.provider.getTransactionCount(this.address);
  }
  async getBalance() {
    if (!this.provider) {
      return undefined;
    }

    const balance = await this.provider.getBalance(this.address);
    return balance.toString("utf8") / 1e18;
  }
  async signMessage(message) {
    if (!this.wallet) {
      return undefined;
    }

    const signature = await this.wallet.signMessage(message);
    const { r, s, v, recoveryParam } = this.ethers.utils.splitSignature(signature);

    return {
      message,
      signature,
      r,
      s,
      v,
      recoveryParam
    };
  }
}

module.exports = Wallet;

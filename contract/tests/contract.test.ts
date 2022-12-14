import fs from 'fs';
import ArLocal from 'arlocal';
import Arweave from 'arweave';
import { JWKInterface } from 'arweave/node/lib/wallet';
import path from 'path';
import { addFunds, mineBlock } from '../utils/_helpers';
import {
  Warp,
  WarpFactory,
  LoggerFactory,
  Contract,
  PstContract,
} from 'warp-contracts';

describe('Testing thetAR Project', () => {
  console.log = function() {};

  let arweave: Arweave;
  let arlocal: ArLocal;
  let warp: Warp;

  let walletJwk: JWKInterface;
  let user1WalletJwk: JWKInterface;
  let user2WalletJwk: JWKInterface;
  let walletAddress: string;
  let user1WalletAddress: string;
  let user2WalletAddress: string;

  let contractSrc: string;
  let contractInit: Object;
  let user1Contract: Contract;
  let user2Contract: Contract;
  let contractTxId: string;
  let karInit: Object;
  let tarInit: Object;
  let karTxId: string;
  let tarTxId: string;
  let testPstTxId: string;

  let user1Tar: PstContract;
  let user1Kar: PstContract;
  let user2Tar: PstContract;
  let user2Kar: PstContract;
  let user1TestPst: PstContract;
  let user2TestPst: PstContract;
  

  beforeAll(async () => {
    arlocal = new ArLocal(1820);
    await arlocal.start();

    LoggerFactory.INST.logLevel('error');

    warp = WarpFactory.forLocal(1820);
    arweave = warp.arweave;
  });

  afterAll(async () => {
    await arlocal.stop();
  });

  const calcHash = (string) => {
    var hash: number = 0, i, chr;
    if (string.length === 0) return hash;
    for (i = 0; i < string.length; i++) {
      chr = string.charCodeAt(i);
      hash = ((hash << 5) - hash) + chr;
      hash |= 0; // Convert to 32bit integer
    }
      return hash;
  }

  async function Initialize() {
    ({ jwk: walletJwk, address: walletAddress } = await warp.testing.generateWallet());
    await addFunds(arweave, walletJwk);
    await mineBlocks(1);

    user1WalletJwk = await arweave.wallets.generate();
    await addFunds(arweave, user1WalletJwk);
    user1WalletAddress = await arweave.wallets.jwkToAddress(user1WalletJwk);
    await mineBlocks(1);

    user2WalletJwk = await arweave.wallets.generate();
    await addFunds(arweave, user2WalletJwk);
    user2WalletAddress = await arweave.wallets.jwkToAddress(user2WalletJwk);
    await mineBlocks(1);

    // calc hashs
    const fixedPstSrcHash = calcHash(fs.readFileSync(path.join(__dirname, '../dist/pst/contract.js'), 'utf8'));
    const dedicatedWalletHash = calcHash(fs.readFileSync(path.join(__dirname, '../dist/dedicated_wallet/contract.js'), 'utf8'));

    // deploy TAR & KAR pst
    let pstContractSrc = fs.readFileSync(path.join(__dirname, '../dist/pst/contract.js'), 'utf8');
    tarInit = {
      tiker: 'TAR',
      name: 'thetAR exchange token',
      owner: walletAddress,
      balances: {},
    };
    tarInit['balances'][user1WalletAddress] = 10000;
    tarInit['balances'][user2WalletAddress] = 10000;
    tarTxId = (await warp.createContract.deploy({
      wallet: walletJwk,
      initState: JSON.stringify(tarInit),
      src: pstContractSrc,
    })).contractTxId;
    user1Tar = warp.pst(tarTxId);
    user1Tar.setEvaluationOptions({
      ignoreExceptions: false,
    }).connect(user1WalletJwk);
    user2Tar = warp.pst(tarTxId);
    user2Tar.setEvaluationOptions({
      ignoreExceptions: false,
    }).connect(user2WalletJwk);
    await mineBlocks(1);

    pstContractSrc = fs.readFileSync(path.join(__dirname, '../dist/pst/contract.js'), 'utf8');
    karInit = {
      tiker: 'KAR',
      name: 'Kontractized AR token',
      owner: walletAddress,
      balances: {},
    };
    karInit['balances'][user1WalletAddress] = 10000;
    karInit['balances'][user2WalletAddress] = 10000;
    karTxId = (await warp.createContract.deploy({
      wallet: walletJwk,
      initState: JSON.stringify(karInit),
      src: pstContractSrc,
    })).contractTxId;
    user1Kar = warp.pst(karTxId);
    user1Kar.setEvaluationOptions({
      ignoreExceptions: false,
    }).connect(user1WalletJwk);
    user2Kar = warp.pst(karTxId);
    user2Kar.setEvaluationOptions({
      ignoreExceptions: false,
    }).connect(user2WalletJwk);
    await mineBlocks(1);


    // deploy thetAR contract
    contractSrc = fs.readFileSync(path.join(__dirname, '../dist/thetAR/contract.js'), 'utf8');
    const initFromFile = JSON.parse(
      fs.readFileSync(path.join(__dirname, '../dist/thetAR/initial-state.json'), 'utf8')
    );
    contractInit = {
      ...initFromFile,
      logs: [], // only for debug
      owner: walletAddress,
      pstSrcTemplateHashs: [fixedPstSrcHash],
      dedicatedWalletTemplateHash: dedicatedWalletHash,
      thetarTokenAddress: tarTxId,
      karTokenAddress: karTxId,
    
      tokenInfos: [
        {
          tokenAddress: tarTxId,
          tokenName: "thetAR coin",
          ticker: "TAR",
          logo: ""
        },
        {
          tokenAddress: karTxId,
          tokenName: "Kontractized AR",
          ticker: "KAR",
          logo: ""
        }
      ],
      pairInfos: [
        {
          pairId: 0,
          tokenAddress: tarTxId,
          dominantTokenAddress: karTxId
        }
      ],
      orderInfos: {
        0: { currentPrice: undefined, orders: [] },
      }
    };

    contractTxId = (await warp.createContract.deploy({
      wallet: walletJwk,
      initState: JSON.stringify(contractInit),
      src: contractSrc,
    })).contractTxId;
    user1Contract = warp.contract(contractTxId);
    user1Contract.setEvaluationOptions({
      // ignoreExceptions: false,
      internalWrites: true,
      allowUnsafeClient: true,
    }).connect(user1WalletJwk);
    user2Contract = warp.contract(contractTxId);
    user2Contract.setEvaluationOptions({
      // ignoreExceptions: false,
      internalWrites: true,
      allowUnsafeClient: true,
    }).connect(user2WalletJwk);
    await mineBlocks(1);

    // deploy test pst
    let testPstSrc = fs.readFileSync(path.join(__dirname, '../dist/pst/contract.js'), 'utf8');
    let testPstInit = {
      ticker: 'TEST',
      name: 'test token',
      owner: walletAddress,
      balances: {},
    };
    testPstInit['balances'][user1WalletAddress] = 10000;
    testPstInit['balances'][user2WalletAddress] = 10000;
    testPstTxId = (await warp.createContract.deploy({
      wallet: walletJwk,
      initState: JSON.stringify(testPstInit),
      src: testPstSrc,
    })).contractTxId;
    user1TestPst = warp.pst(testPstTxId);
    user1TestPst.setEvaluationOptions({
      ignoreExceptions: false,
    }).connect(user1WalletJwk);
    user2TestPst = warp.pst(testPstTxId);
    user2TestPst.setEvaluationOptions({
      ignoreExceptions: false,
    }).connect(user2WalletJwk);
  
    await mineBlocks(1);
  }

  async function mineBlocks(times: number) {
    for (var i = 0; i < times; i ++) {
      await mineBlock(arweave);
    }
  }

  async function deployDedicatedWallet(jwk: JWKInterface) {
    const dedicatedSrc = fs.readFileSync(path.join(__dirname, '../dist/dedicated_wallet/contract.js'), 'utf8');
    const walletAddr = await arweave.wallets.jwkToAddress(jwk);
    const dedicatedInit = {
      owner: walletAddr,
      admin: contractTxId
    };
    const dedicatedTxId = (await warp.createContract.deploy({
      wallet: walletJwk,
      initState: JSON.stringify(dedicatedInit),
      src: dedicatedSrc,
    })).contractTxId;
    await mineBlocks(1);

    return dedicatedTxId;
  }

  async function createDedicatedWallet() {

    const u1DWalletTxId = await deployDedicatedWallet(user1WalletJwk);
    await user1Contract.writeInteraction({
      function: "registerDedicatedWallet",
      params: {
        address: u1DWalletTxId,
      }
    });
    await mineBlocks(1);
    expect((await user1Contract.readState()).cachedValue.state['userInfos'][user1WalletAddress]).toEqual({
      dedicatedWallet: u1DWalletTxId,
      walletStatus: 'pending',
      orders: {'0': []},
    });

    await user1Contract.writeInteraction({
      function: "activateDedicatedWallet",
    });
    await mineBlocks(1);
    expect((await user1Contract.readState()).cachedValue.state['userInfos'][user1WalletAddress]).toEqual({
      dedicatedWallet: u1DWalletTxId,
      walletStatus: 'normal',
      orders: {'0': []},
    });

    const u2DWalletTxId = await deployDedicatedWallet(user2WalletJwk);
    await user2Contract.writeInteraction({
      function: "registerDedicatedWallet",
      params: {
        address: u2DWalletTxId,
      }
    });
    await mineBlocks(1);
    expect((await user1Contract.readState()).cachedValue.state['userInfos'][user2WalletAddress]).toEqual({
      dedicatedWallet: u2DWalletTxId,
      walletStatus: 'pending',
      orders: {'0': []},
    });

    await user2Contract.writeInteraction({
      function: "activateDedicatedWallet",
    });
    await mineBlocks(1);
    expect((await user2Contract.readState()).cachedValue.state['userInfos'][user2WalletAddress]).toEqual({
      dedicatedWallet: u2DWalletTxId,
      walletStatus: 'normal',
      orders: {'0': []},
    });
  }

  async function addPair() {
    await user1Contract.writeInteraction(
      {
        function: 'addPair',
        params: {
          pstAddress: testPstTxId
        }
      },
      { transfer: {
          target: walletAddress,
          winstonQty: await arweave.ar.arToWinston("10"),
        }
      }
    );
    await mineBlocks(1);

    expect((await user1Contract.readState()).cachedValue.state['maxPairId']).toEqual(2);

    expect((await user1Contract.readState()).cachedValue.state['tokenInfos'].length).toEqual(3);
    expect((await user1Contract.readState()).cachedValue.state['tokenInfos'][2]).toEqual({
      tokenAddress: testPstTxId,
      tokenName: 'test token',
      ticker: 'TEST',
      logo: ''
    });

    expect((await user1Contract.readState()).cachedValue.state['pairInfos'].length).toEqual(3);
    expect((await user1Contract.readState()).cachedValue.state['pairInfos'][1]).toEqual({
      pairId: 1,
      tokenAddress: testPstTxId,
      dominantTokenAddress: tarTxId
    });
    expect((await user1Contract.readState()).cachedValue.state['pairInfos'][2]).toEqual({
      pairId: 2,
      tokenAddress: testPstTxId,
      dominantTokenAddress: karTxId
    });

    expect(Object.keys((await user1Contract.readState()).cachedValue.state['orderInfos']).length).toEqual(3);
  }

  async function createOrder(
    user: number, 
    direction: 'buy'|'sell', 
    quantity: number,
    price?: number
  ) {
    const usersInfo = [
      {},
      {
        contract: user1Contract,
        walletAddress: user1WalletAddress,
        tar: user1Tar,
        testPst: user1TestPst
      },
      {
        contract: user2Contract,
        walletAddress: user2WalletAddress,
        tar: user2Tar,
        testPst: user2TestPst
      },
    ]
    const dedicatedWalletAddr = (await usersInfo[user].contract.dryWrite({
      function: 'dedicatedWalletStatus',
      params: {
        owner: usersInfo[user].walletAddress
      }
    })).result['dedicatedWallet'];

    const pst = direction === 'buy' ? usersInfo[user].tar : usersInfo[user].testPst;
    await pst.writeInteraction({
      function: 'transfer',
      target: dedicatedWalletAddr,
      qty: quantity
    });
    await mineBlocks(1);

    const txId = await usersInfo[user].contract.writeInteraction({
      function: 'createOrder',
      params: {
        pairId: 1,
        direction: direction,
        price: price
      }
    });
    await mineBlocks(1);
  }

  async function cancelOrder(
    user: number, 
    orderIndex: number,
  ) {
    const usersInfo = [
      {},
      {
        contract: user1Contract,
        walletAddress: user1WalletAddress,
        tar: user1Tar,
        testPst: user1TestPst
      },
      {
        contract: user2Contract,
        walletAddress: user2WalletAddress,
        tar: user2Tar,
        testPst: user2TestPst
      },
    ];
    const orderId = (await user1Contract.readState()).cachedValue.state['orderInfos']['1']['orders'][orderIndex]['orderId'];

    const txId = await usersInfo[user].contract.writeInteraction({
      function: 'cancelOrder',
      params: {
        pairId: 1,
        orderId: orderId
      }
    });
    await mineBlocks(1);
  }

  it('test deploy contract', async () => {
    await Initialize();
    expect(contractTxId.length).toEqual(43);
    expect(tarTxId.length).toEqual(43);
    expect(karTxId.length).toEqual(43);
    expect(await (await user1Contract.readState()).cachedValue.state).toEqual(contractInit);
    expect(await (await user2Contract.readState()).cachedValue.state).toEqual(contractInit);
    expect(await (await user1Kar.readState()).cachedValue.state).toEqual(karInit);
    expect(await (await user1Tar.readState()).cachedValue.state).toEqual(tarInit);
    expect(await (await user2Kar.readState()).cachedValue.state).toEqual(karInit);
    expect(await (await user2Tar.readState()).cachedValue.state).toEqual(tarInit);
  });

  it('test create dedicated wallet', async () => {
    await Initialize();
    await createDedicatedWallet();
  });

  it('test add pair', async () => {
    await Initialize();
    await createDedicatedWallet();
    await addPair();
  });

  it('test pairInfo function', async () => {
    await Initialize();
    await createDedicatedWallet();
    await addPair();

    const pairInfo = (await user1Contract.dryWrite({
      function: 'pairInfo',
      params: {
        pairId: 1
      }
    })).result;

    expect(pairInfo).toEqual({
      pairId: 1,
      tokenAddress: testPstTxId,
      dominantTokenAddress: tarTxId,
    })
  });

  it('test create order', async () => {
    await Initialize();
    await createDedicatedWallet();
    await addPair();

    const dedicatedWalletAddr = (await user1Contract.dryWrite({
      function: 'dedicatedWalletStatus',
      params: {
        owner: user1WalletAddress
      }
    })).result['dedicatedWallet'];

    await user1Tar.writeInteraction({
      function: 'transfer',
      target: dedicatedWalletAddr,
      qty: 10
    });
    await mineBlocks(1);

    const txId = (await user1Contract.writeInteraction({
      function: 'createOrder',
      params: {
        pairId: 1,
        direction: 'buy',
        price: 10
      }
    })).originalTxId;
    await mineBlocks(1);

    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['1'].orders[0]).toEqual({
        creator: user1WalletAddress,
        orderId: txId,
        direction: 'buy',
        quantity: 1,
        price: 10
    });
    expect((await user1Contract.readState()).cachedValue.state['userInfos'][user1WalletAddress]['orders'][1][0]).toEqual({
      creator: user1WalletAddress,
      orderId: txId,
      direction: 'buy',
      quantity: 1,
      price: 10
    });
  });

  it('test limit order', async () => {
    await Initialize();
    await createDedicatedWallet();
    await addPair();

    await createOrder(1, 'buy', 100, 10);
    await createOrder(2, 'sell', 10, 10);
  
    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['1']['orders']).toEqual([]);
    expect((await user1Contract.readState()).cachedValue.state['userInfos'][user1WalletAddress]['orders']['1'].length).toEqual(0);
    expect((await user1Contract.readState()).cachedValue.state['userInfos'][user2WalletAddress]['orders']['1'].length).toEqual(0);
    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['1']['currentPrice']).toEqual(10);

    expect((await user1Tar.currentBalance(user1WalletAddress)).balance).toEqual(10000 - 100);
    expect((await user2Tar.currentBalance(user2WalletAddress)).balance).toEqual(10000 + 100);

    expect((await user1TestPst.currentBalance(user1WalletAddress)).balance).toEqual(10000 + 10);
    expect((await user2TestPst.currentBalance(user2WalletAddress)).balance).toEqual(10000 - 10);
  });

  it('test limit order - not fill full order - sell', async () => {
    await Initialize();
    await createDedicatedWallet();
    await addPair();

    await createOrder(1, 'buy', 100, 10);
    await createOrder(2, 'sell', 5, 10);

    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['1']['orders'][0]['quantity']).toEqual(5);
    expect((await user1Contract.readState()).cachedValue.state['userInfos'][user1WalletAddress]['orders']['1'][0]['quantity']).toEqual(5);
    expect((await user1Contract.readState()).cachedValue.state['userInfos'][user2WalletAddress]['orders']['1'].length).toEqual(0);
    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['1']['currentPrice']).toEqual(10);

    expect((await user1Tar.currentBalance(user1WalletAddress)).balance).toEqual(10000 - 100);
    expect((await user2Tar.currentBalance(user2WalletAddress)).balance).toEqual(10000 + 50);

    expect((await user1TestPst.currentBalance(user1WalletAddress)).balance).toEqual(10000 + 5);
    expect((await user2TestPst.currentBalance(user2WalletAddress)).balance).toEqual(10000 - 5);
  });

  it('test limit order - exceed full order - sell', async () => {
    await Initialize();
    await createDedicatedWallet();
    await addPair();

    await createOrder(1, 'buy', 100, 10);
    await createOrder(2, 'sell', 20, 10);

    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['1']['orders'][0]['quantity']).toEqual(10);
    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['1']['orders'][0]['direction']).toEqual('sell');
    expect((await user1Contract.readState()).cachedValue.state['userInfos'][user1WalletAddress]['orders']['1'].length).toEqual(0);
    expect((await user1Contract.readState()).cachedValue.state['userInfos'][user2WalletAddress]['orders']['1'][0]['quantity']).toEqual(10);
    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['1']['currentPrice']).toEqual(10);

    expect((await user1Tar.currentBalance(user1WalletAddress)).balance).toEqual(10000 - 100);
    expect((await user2Tar.currentBalance(user2WalletAddress)).balance).toEqual(10000 + 100);

    expect((await user1TestPst.currentBalance(user1WalletAddress)).balance).toEqual(10000 + 10);
    expect((await user2TestPst.currentBalance(user2WalletAddress)).balance).toEqual(10000 - 20);
  });

  it('test limit order - not fill full order - buy', async () => {
    await Initialize();
    await createDedicatedWallet();
    await addPair();

    await createOrder(1, 'sell', 10, 10);
    await createOrder(2, 'buy', 50, 10);

    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['1']['orders'][0]['quantity']).toEqual(5);
    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['1']['orders'][0]['direction']).toEqual('sell');
    expect((await user1Contract.readState()).cachedValue.state['userInfos'][user1WalletAddress]['orders']['1'][0]['quantity']).toEqual(5);
    expect((await user1Contract.readState()).cachedValue.state['userInfos'][user1WalletAddress]['orders']['1'][0]['direction']).toEqual('sell');
    expect((await user1Contract.readState()).cachedValue.state['userInfos'][user2WalletAddress]['orders']['1'].length).toEqual(0);
    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['1']['currentPrice']).toEqual(10);

    expect((await user1Tar.currentBalance(user1WalletAddress)).balance).toEqual(10000 + 50);
    expect((await user2Tar.currentBalance(user2WalletAddress)).balance).toEqual(10000 - 50);

    expect((await user1TestPst.currentBalance(user1WalletAddress)).balance).toEqual(10000 - 10);
    expect((await user2TestPst.currentBalance(user2WalletAddress)).balance).toEqual(10000 + 5);
  });

  it('test limit order - exceed full order - buy', async () => {
    await Initialize();
    await createDedicatedWallet();
    await addPair();

    await createOrder(1, 'sell', 10, 10);
    await createOrder(2, 'buy', 200, 10);

    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['1']['orders'][0]['quantity']).toEqual(10);
    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['1']['orders'][0]['direction']).toEqual('buy');
    expect((await user1Contract.readState()).cachedValue.state['userInfos'][user1WalletAddress]['orders']['1'].length).toEqual(0);
    expect((await user1Contract.readState()).cachedValue.state['userInfos'][user2WalletAddress]['orders']['1'][0]['quantity']).toEqual(10);
    expect((await user1Contract.readState()).cachedValue.state['userInfos'][user2WalletAddress]['orders']['1'][0]['direction']).toEqual('buy');
    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['1']['currentPrice']).toEqual(10);

    expect((await user1Tar.currentBalance(user1WalletAddress)).balance).toEqual(10000 + 100);
    expect((await user2Tar.currentBalance(user2WalletAddress)).balance).toEqual(10000 - 200);

    expect((await user1TestPst.currentBalance(user1WalletAddress)).balance).toEqual(10000 - 10);
    expect((await user2TestPst.currentBalance(user2WalletAddress)).balance).toEqual(10000 + 10);
  });

  it('test limit order - 2 vs 1', async () => {
    await Initialize();
    await createDedicatedWallet();
    await addPair();

    await createOrder(1, 'buy', 100, 10);
    await createOrder(1, 'buy', 200, 20);
    await createOrder(2, 'sell', 10, 20);

    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['1']['orders'].length).toEqual(1);
    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['1']['orders'][0]['quantity']).toEqual(10);
    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['1']['orders'][0]['direction']).toEqual('buy');
    expect((await user1Contract.readState()).cachedValue.state['userInfos'][user2WalletAddress]['orders']['1'].length).toEqual(0);
    expect((await user1Contract.readState()).cachedValue.state['userInfos'][user1WalletAddress]['orders']['1'].length).toEqual(1);
    expect((await user1Contract.readState()).cachedValue.state['userInfos'][user1WalletAddress]['orders']['1'][0]['quantity']).toEqual(10);
    expect((await user1Contract.readState()).cachedValue.state['userInfos'][user1WalletAddress]['orders']['1'][0]['direction']).toEqual('buy');
    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['1']['currentPrice']).toEqual(20);

    expect((await user1Tar.currentBalance(user1WalletAddress)).balance).toEqual(10000 - 300);
    expect((await user2Tar.currentBalance(user2WalletAddress)).balance).toEqual(10000 + 200);

    expect((await user1TestPst.currentBalance(user1WalletAddress)).balance).toEqual(10000 + 10);
    expect((await user2TestPst.currentBalance(user2WalletAddress)).balance).toEqual(10000 - 10);
  });

  it('test limit order - 1 vs 2', async () => {
    await Initialize();
    await createDedicatedWallet();
    await addPair();

    await createOrder(1, 'buy', 100, 10);
    await createOrder(2, 'sell', 5, 10);
    await createOrder(2, 'sell', 10, 10);

    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['1']['orders'].length).toEqual(1);
    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['1']['orders'][0]['quantity']).toEqual(5);
    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['1']['orders'][0]['direction']).toEqual('sell');
    expect((await user1Contract.readState()).cachedValue.state['userInfos'][user1WalletAddress]['orders']['1'].length).toEqual(0);
    expect((await user1Contract.readState()).cachedValue.state['userInfos'][user2WalletAddress]['orders']['1'].length).toEqual(1);
    expect((await user1Contract.readState()).cachedValue.state['userInfos'][user2WalletAddress]['orders']['1'][0]['quantity']).toEqual(5);
    expect((await user1Contract.readState()).cachedValue.state['userInfos'][user2WalletAddress]['orders']['1'][0]['direction']).toEqual('sell');
    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['1']['currentPrice']).toEqual(10);

    expect((await user1Tar.currentBalance(user1WalletAddress)).balance).toEqual(10000 - 100);
    expect((await user2Tar.currentBalance(user2WalletAddress)).balance).toEqual(10000 + 100);

    expect((await user1TestPst.currentBalance(user1WalletAddress)).balance).toEqual(10000 + 10);
    expect((await user2TestPst.currentBalance(user2WalletAddress)).balance).toEqual(10000 - 15);
  });

  it('test market order - exactly fill - buy', async () => {
    await Initialize();
    await createDedicatedWallet();
    await addPair();

    await createOrder(1, 'sell', 10, 10);
    await createOrder(2, 'buy', 100);

    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['1']['orders'].length).toEqual(0);
    expect((await user1Contract.readState()).cachedValue.state['userInfos'][user1WalletAddress]['orders']['1'].length).toEqual(0);
    expect((await user1Contract.readState()).cachedValue.state['userInfos'][user2WalletAddress]['orders']['1'].length).toEqual(0);
    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['1']['currentPrice']).toEqual(10);

    expect((await user1Tar.currentBalance(user1WalletAddress)).balance).toEqual(10000 + 100);
    expect((await user2Tar.currentBalance(user2WalletAddress)).balance).toEqual(10000 - 100);

    expect((await user1TestPst.currentBalance(user1WalletAddress)).balance).toEqual(10000 - 10);
    expect((await user2TestPst.currentBalance(user2WalletAddress)).balance).toEqual(10000 + 10);
  });

  it('test market order - not fill order - buy', async () => {
    await Initialize();
    await createDedicatedWallet();
    await addPair();

    await createOrder(1, 'sell', 10, 10);
    await createOrder(2, 'buy', 50);

    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['1']['orders'].length).toEqual(1);
    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['1']['orders'][0]['quantity']).toEqual(5);
    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['1']['orders'][0]['direction']).toEqual('sell');
    expect((await user1Contract.readState()).cachedValue.state['userInfos'][user2WalletAddress]['orders']['1'].length).toEqual(0);
    expect((await user1Contract.readState()).cachedValue.state['userInfos'][user1WalletAddress]['orders']['1'].length).toEqual(1);
    expect((await user1Contract.readState()).cachedValue.state['userInfos'][user1WalletAddress]['orders']['1'][0]['quantity']).toEqual(5);
    expect((await user1Contract.readState()).cachedValue.state['userInfos'][user1WalletAddress]['orders']['1'][0]['direction']).toEqual('sell');
    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['1']['currentPrice']).toEqual(10);

    expect((await user1Tar.currentBalance(user1WalletAddress)).balance).toEqual(10000 + 50);
    expect((await user2Tar.currentBalance(user2WalletAddress)).balance).toEqual(10000 - 50);

    expect((await user1TestPst.currentBalance(user1WalletAddress)).balance).toEqual(10000 - 10);
    expect((await user2TestPst.currentBalance(user2WalletAddress)).balance).toEqual(10000 + 5);
  });

  it('test market order - exceed fill order - buy', async () => {
    await Initialize();
    await createDedicatedWallet();
    await addPair();

    await createOrder(1, 'sell', 10, 10);
    await createOrder(2, 'buy', 200);

    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['1']['orders'].length).toEqual(0);
    expect((await user1Contract.readState()).cachedValue.state['userInfos'][user2WalletAddress]['orders']['1'].length).toEqual(0);
    expect((await user1Contract.readState()).cachedValue.state['userInfos'][user1WalletAddress]['orders']['1'].length).toEqual(0);
    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['1']['currentPrice']).toEqual(10);

    expect((await user1Tar.currentBalance(user1WalletAddress)).balance).toEqual(10000 + 100);
    expect((await user2Tar.currentBalance(user2WalletAddress)).balance).toEqual(10000 - 100);

    expect((await user1TestPst.currentBalance(user1WalletAddress)).balance).toEqual(10000 - 10);
    expect((await user2TestPst.currentBalance(user2WalletAddress)).balance).toEqual(10000 + 10);
  });

  it('test market order - exactly fill order - sell', async () => {
    await Initialize();
    await createDedicatedWallet();
    await addPair();

    await createOrder(1, 'buy', 100, 10);
    await createOrder(2, 'sell', 10);

    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['1']['orders'].length).toEqual(0);
    expect((await user1Contract.readState()).cachedValue.state['userInfos'][user2WalletAddress]['orders']['1'].length).toEqual(0);
    expect((await user1Contract.readState()).cachedValue.state['userInfos'][user1WalletAddress]['orders']['1'].length).toEqual(0);
    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['1']['currentPrice']).toEqual(10);

    expect((await user1Tar.currentBalance(user1WalletAddress)).balance).toEqual(10000 - 100);
    expect((await user2Tar.currentBalance(user2WalletAddress)).balance).toEqual(10000 + 100);

    expect((await user1TestPst.currentBalance(user1WalletAddress)).balance).toEqual(10000 + 10);
    expect((await user2TestPst.currentBalance(user2WalletAddress)).balance).toEqual(10000 - 10);
  });

  it('test market order - not fill order - sell', async () => {
    await Initialize();
    await createDedicatedWallet();
    await addPair();

    await createOrder(1, 'buy', 100, 10);
    await createOrder(2, 'sell', 5);

    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['1']['orders'].length).toEqual(1);
    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['1']['orders'][0]['quantity']).toEqual(5);
    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['1']['orders'][0]['direction']).toEqual('buy');
    expect((await user1Contract.readState()).cachedValue.state['userInfos'][user1WalletAddress]['orders']['1'].length).toEqual(1);
    expect((await user1Contract.readState()).cachedValue.state['userInfos'][user1WalletAddress]['orders']['1'][0]['quantity']).toEqual(5);
    expect((await user1Contract.readState()).cachedValue.state['userInfos'][user1WalletAddress]['orders']['1'][0]['direction']).toEqual('buy');
    expect((await user1Contract.readState()).cachedValue.state['userInfos'][user2WalletAddress]['orders']['1'].length).toEqual(0);
    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['1']['currentPrice']).toEqual(10);

    expect((await user1Tar.currentBalance(user1WalletAddress)).balance).toEqual(10000 - 100);
    expect((await user2Tar.currentBalance(user2WalletAddress)).balance).toEqual(10000 + 50);

    expect((await user1TestPst.currentBalance(user1WalletAddress)).balance).toEqual(10000 + 5);
    expect((await user2TestPst.currentBalance(user2WalletAddress)).balance).toEqual(10000 - 5);
  });

  it('test market order - exceed fill order - sell', async () => {
    await Initialize();
    await createDedicatedWallet();
    await addPair();

    await createOrder(1, 'buy', 100, 10);
    await createOrder(2, 'sell', 20);

    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['1']['orders'].length).toEqual(0);
    expect((await user1Contract.readState()).cachedValue.state['userInfos'][user1WalletAddress]['orders']['1'].length).toEqual(0);
    expect((await user1Contract.readState()).cachedValue.state['userInfos'][user2WalletAddress]['orders']['1'].length).toEqual(0);
    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['1']['currentPrice']).toEqual(10);

    expect((await user1Tar.currentBalance(user1WalletAddress)).balance).toEqual(10000 - 100);
    expect((await user2Tar.currentBalance(user2WalletAddress)).balance).toEqual(10000 + 100);

    expect((await user1TestPst.currentBalance(user1WalletAddress)).balance).toEqual(10000 + 10);
    expect((await user2TestPst.currentBalance(user2WalletAddress)).balance).toEqual(10000 - 10);
  });

  it('test market order - 1 vs 2 - not fill orders - buy', async () => {
    await Initialize();
    await createDedicatedWallet();
    await addPair();

    await createOrder(1, 'sell', 10, 10);
    await createOrder(1, 'sell', 10, 5);
    await createOrder(2, 'buy', 120);

    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['1']['orders'].length).toEqual(1);
    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['1']['orders'][0]['quantity']).toEqual(3);
    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['1']['orders'][0]['direction']).toEqual('sell');
    expect((await user1Contract.readState()).cachedValue.state['userInfos'][user1WalletAddress]['orders']['1'].length).toEqual(1);
    expect((await user1Contract.readState()).cachedValue.state['userInfos'][user1WalletAddress]['orders']['1'][0]['quantity']).toEqual(3);
    expect((await user1Contract.readState()).cachedValue.state['userInfos'][user1WalletAddress]['orders']['1'][0]['direction']).toEqual('sell');
    expect((await user1Contract.readState()).cachedValue.state['userInfos'][user2WalletAddress]['orders']['1'].length).toEqual(0);
    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['1']['currentPrice']).toEqual((10 * 5 + 7 * 10)/(10 + 7));

    expect((await user1Tar.currentBalance(user1WalletAddress)).balance).toEqual(10000 + 120);
    expect((await user2Tar.currentBalance(user2WalletAddress)).balance).toEqual(10000 - 120);

    expect((await user1TestPst.currentBalance(user1WalletAddress)).balance).toEqual(10000 - 20);
    expect((await user2TestPst.currentBalance(user2WalletAddress)).balance).toEqual(10000 + 17);
  });

  it('test market order - 1 vs 2 - exceed fill orders - buy', async () => {
    await Initialize();
    await createDedicatedWallet();
    await addPair();

    await createOrder(1, 'sell', 10, 10);
    await createOrder(1, 'sell', 10, 5);
    await createOrder(2, 'buy', 200);

    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['1']['orders'].length).toEqual(0);
    expect((await user1Contract.readState()).cachedValue.state['userInfos'][user1WalletAddress]['orders']['1'].length).toEqual(0);
    expect((await user1Contract.readState()).cachedValue.state['userInfos'][user2WalletAddress]['orders']['1'].length).toEqual(0);
    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['1']['currentPrice']).toEqual((10 * 5 + 10 * 10)/(10 + 10));

    expect((await user1Tar.currentBalance(user1WalletAddress)).balance).toEqual(10000 + 150);
    expect((await user2Tar.currentBalance(user2WalletAddress)).balance).toEqual(10000 - 150);

    expect((await user1TestPst.currentBalance(user1WalletAddress)).balance).toEqual(10000 - 20);
    expect((await user2TestPst.currentBalance(user2WalletAddress)).balance).toEqual(10000 + 20);
  });

  it('test market order - 1 vs 2 - exactly fill orders - sell', async () => {
    await Initialize();
    await createDedicatedWallet();
    await addPair();

    await createOrder(1, 'buy', 100, 10);
    await createOrder(1, 'buy', 100, 5);
    await createOrder(2, 'sell', 30);

    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['1']['orders'].length).toEqual(0);
    expect((await user1Contract.readState()).cachedValue.state['userInfos'][user1WalletAddress]['orders']['1'].length).toEqual(0);
    expect((await user1Contract.readState()).cachedValue.state['userInfos'][user2WalletAddress]['orders']['1'].length).toEqual(0);
    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['1']['currentPrice']).toEqual((10 * 10 + 20 * 5)/(10 + 20));

    expect((await user1Tar.currentBalance(user1WalletAddress)).balance).toEqual(10000 - 200);
    expect((await user2Tar.currentBalance(user2WalletAddress)).balance).toEqual(10000 + 200);

    expect((await user1TestPst.currentBalance(user1WalletAddress)).balance).toEqual(10000 + 30);
    expect((await user2TestPst.currentBalance(user2WalletAddress)).balance).toEqual(10000 - 30);
  });

  it('test market order - 1 vs 2 - exceed fill orders - sell', async () => {
    await Initialize();
    await createDedicatedWallet();
    await addPair();

    await createOrder(1, 'buy', 100, 10);
    await createOrder(1, 'buy', 100, 5);
    await createOrder(2, 'sell', 50);

    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['1']['orders'].length).toEqual(0);
    expect((await user1Contract.readState()).cachedValue.state['userInfos'][user1WalletAddress]['orders']['1'].length).toEqual(0);
    expect((await user1Contract.readState()).cachedValue.state['userInfos'][user2WalletAddress]['orders']['1'].length).toEqual(0);
    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['1']['currentPrice']).toEqual((10 * 10 + 20 * 5)/(10 + 20));

    expect((await user1Tar.currentBalance(user1WalletAddress)).balance).toEqual(10000 - 200);
    expect((await user2Tar.currentBalance(user2WalletAddress)).balance).toEqual(10000 + 200);

    expect((await user1TestPst.currentBalance(user1WalletAddress)).balance).toEqual(10000 + 30);
    expect((await user2TestPst.currentBalance(user2WalletAddress)).balance).toEqual(10000 - 30);
  });

  it('test market order - 1 vs 2 - not fill orders - sell', async () => {
    await Initialize();
    await createDedicatedWallet();
    await addPair();

    await createOrder(1, 'buy', 100, 10);
    await createOrder(1, 'buy', 100, 5);
    await createOrder(2, 'sell', 25);

    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['1']['orders'].length).toEqual(1);
    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['1']['orders'][0]['quantity']).toEqual(5);
    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['1']['orders'][0]['price']).toEqual(5);
    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['1']['orders'][0]['direction']).toEqual('buy');
    expect((await user1Contract.readState()).cachedValue.state['userInfos'][user1WalletAddress]['orders']['1'].length).toEqual(1);
    expect((await user1Contract.readState()).cachedValue.state['userInfos'][user1WalletAddress]['orders']['1'][0]['quantity']).toEqual(5);
    expect((await user1Contract.readState()).cachedValue.state['userInfos'][user1WalletAddress]['orders']['1'][0]['direction']).toEqual('buy');
    expect((await user1Contract.readState()).cachedValue.state['userInfos'][user2WalletAddress]['orders']['1'].length).toEqual(0);
    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['1']['currentPrice']).toEqual((10 * 10 + 15 * 5)/(10 + 15));

    expect((await user1Tar.currentBalance(user1WalletAddress)).balance).toEqual(10000 - 200);
    expect((await user2Tar.currentBalance(user2WalletAddress)).balance).toEqual(10000 + 100 + 75);

    expect((await user1TestPst.currentBalance(user1WalletAddress)).balance).toEqual(10000 + 25);
    expect((await user2TestPst.currentBalance(user2WalletAddress)).balance).toEqual(10000 - 25);
  });

  it('test non-integer order quantity', async () => {
    await Initialize();
    await createDedicatedWallet();
    await addPair();

    await createOrder(1, 'buy', 100, 13);
    await createOrder(2, 'sell', 10);

    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['1']['orders'].length).toEqual(0);
    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['1']['currentPrice']).toEqual(13);

    expect((await user1Tar.currentBalance(user1WalletAddress)).balance).toEqual(10000 - 100);
    expect((await user2Tar.currentBalance(user2WalletAddress)).balance).toEqual(10000 + 91);

    expect((await user1TestPst.currentBalance(user1WalletAddress)).balance).toEqual(10000 + 7);
    expect((await user2TestPst.currentBalance(user2WalletAddress)).balance).toEqual(10000 - 7);

    await createOrder(1, 'buy', 1, 10);
    await createOrder(2, 'sell', 1);

    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['1']['orders'].length).toEqual(0);
    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['1']['currentPrice']).toEqual(10);
  });

  it('test currentPrice calculation', async () => {
    await Initialize();
    await createDedicatedWallet();
    await addPair();

    await createOrder(1, 'buy', 100, 10);
    await createOrder(2, 'sell', 10);
    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['1']['currentPrice']).toEqual(10);

    await createOrder(1, 'buy', 100, 20);
    await createOrder(2, 'sell', 20);
    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['1']['currentPrice']).toEqual(20);

    await createOrder(1, 'buy', 100, 15);
    await createOrder(2, 'sell', 15);
    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['1']['currentPrice']).toEqual(15);

    await createOrder(1, 'buy', 100, 13);
    await createOrder(2, 'sell', 10, 10);
    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['1']['currentPrice']).toEqual(15);
  });

  it('test create order with 0 price', async () => {
    await Initialize();
    await createDedicatedWallet();
    await addPair();

    await createOrder(1, 'buy', 100, 0);
    await createOrder(2, 'sell', 10);

    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['1']['orders'].length).toEqual(0);
    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['1']['currentPrice']).toEqual(undefined);

    expect((await user1Tar.currentBalance(user1WalletAddress)).balance).toEqual(10000 - 100);
    expect((await user2Tar.currentBalance(user2WalletAddress)).balance).toEqual(10000);

    expect((await user1TestPst.currentBalance(user1WalletAddress)).balance).toEqual(10000);
    expect((await user2TestPst.currentBalance(user2WalletAddress)).balance).toEqual(10000 - 10);
  });

  it('test create order with 0 quantity', async () => {
    await Initialize();
    await createDedicatedWallet();
    await addPair();

    await createOrder(1, 'buy', 0, 10);
    await createOrder(2, 'sell', 0, 10);

    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['1']['orders'].length).toEqual(0);
    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['1']['currentPrice']).toEqual(undefined);

    expect((await user1Tar.currentBalance(user1WalletAddress)).balance).toEqual(10000);
    expect((await user2Tar.currentBalance(user2WalletAddress)).balance).toEqual(10000);

    expect((await user1TestPst.currentBalance(user1WalletAddress)).balance).toEqual(10000);
    expect((await user2TestPst.currentBalance(user2WalletAddress)).balance).toEqual(10000);
  });

  it('test cancel order - buy', async () => {
    await Initialize();
    await createDedicatedWallet();
    await addPair();

    await createOrder(1, 'buy', 100, 10);
    await cancelOrder(1, 0);

    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['1']['orders'].length).toEqual(0);
    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['1']['currentPrice']).toEqual(undefined);

    expect((await user1Tar.currentBalance(user1WalletAddress)).balance).toEqual(10000);
    expect((await user2Tar.currentBalance(user2WalletAddress)).balance).toEqual(10000);
    expect((await user1TestPst.currentBalance(user1WalletAddress)).balance).toEqual(10000);
    expect((await user2TestPst.currentBalance(user2WalletAddress)).balance).toEqual(10000);
  });

  it('test cancel order - sell', async () => {
    await Initialize();
    await createDedicatedWallet();
    await addPair();

    await createOrder(1, 'sell', 10, 10);
    await cancelOrder(1, 0);

    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['1']['orders'].length).toEqual(0);
    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['1']['currentPrice']).toEqual(undefined);

    expect((await user1Tar.currentBalance(user1WalletAddress)).balance).toEqual(10000);
    expect((await user2Tar.currentBalance(user2WalletAddress)).balance).toEqual(10000);
    expect((await user1TestPst.currentBalance(user1WalletAddress)).balance).toEqual(10000);
    expect((await user2TestPst.currentBalance(user2WalletAddress)).balance).toEqual(10000);
  });

  it('test invalid dedicated wallet address', async () => {
    await Initialize();
    
    await user1Contract.writeInteraction({
      function: "registerDedicatedWallet",
      params: {
        address: "invalid_address",
      }
    });
    await mineBlocks(1);

    expect((await user1Contract.readState()).cachedValue.state['userInfos'][user1WalletAddress]).toEqual(undefined);

    await user1Contract.writeInteraction({
      function: "activateDedicatedWallet"
    });
    await mineBlocks(1);

    expect((await user1Contract.readState()).cachedValue.state['userInfos'][user1WalletAddress]).toEqual(undefined);

    await user1Contract.writeInteraction({
      function: "registerDedicatedWallet",
      params: {
        address: "01234567890123456789012345678901234567890123",
      }
    });
    await mineBlocks(1);

    expect((await user1Contract.readState()).cachedValue.state['userInfos'][user1WalletAddress]).toEqual({
      dedicatedWallet: "01234567890123456789012345678901234567890123",
      walletStatus: 'pending',
      orders: {'0': []},
    });

    await user1Contract.writeInteraction({
      function: "activateDedicatedWallet"
    });
    await mineBlocks(1);

    expect((await user1Contract.readState()).cachedValue.state['userInfos'][user1WalletAddress]).toEqual({
      dedicatedWallet: "01234567890123456789012345678901234567890123",
      walletStatus: 'pending',
      orders: {'0': []},
    });

    const dedicatedTxId = (await warp.createContract.deploy({
      wallet: walletJwk,
      initState: JSON.stringify({}),
      src: "test_invalid_src",
    })).contractTxId;
    await mineBlocks(1);

    await user1Contract.writeInteraction({
      function: "registerDedicatedWallet",
      params: {
        address: dedicatedTxId,
      }
    });
    await mineBlocks(1);

    await user1Contract.writeInteraction({
      function: "activateDedicatedWallet"
    });
    await mineBlocks(1);

    expect((await user1Contract.readState()).cachedValue.state['userInfos'][user1WalletAddress]).toEqual({
      dedicatedWallet: dedicatedTxId,
      walletStatus: 'invalid',
      orders: {'0': []},
    });

    await createDedicatedWallet();
  });

  it('test invalid pst address', async () => {
    await Initialize();

    await user1Contract.writeInteraction(
      {
        function: 'addPair',
        params: {
          pstAddress: 123456,
        }
      },
      { transfer: {
          target: walletAddress,
          winstonQty: await arweave.ar.arToWinston("10"),
        }
      }
    );
    await mineBlocks(1);

    await user1Contract.writeInteraction(
      {
        function: 'addPair',
        params: {
          pstAddress: '01234567890123456789012345678901234567890123',
        }
      },
      { transfer: {
          target: walletAddress,
          winstonQty: await arweave.ar.arToWinston("10"),
        }
      }
    );
    await mineBlocks(1);

    const txId = (await warp.createContract.deploy({
      wallet: walletJwk,
      initState: JSON.stringify({}),
      src: "invalid_src",
    }));
    await mineBlocks(1);

    await user1Contract.writeInteraction(
      {
        function: 'addPair',
        params: {
          pstAddress: txId,
        }
      },
      { transfer: {
          target: walletAddress,
          winstonQty: await arweave.ar.arToWinston("10"),
        }
      }
    );
    await mineBlocks(1);

    expect((await user1Contract.readState()).cachedValue.state['maxPairId']).toEqual(0);
  });

  it('test invalid fee', async () => {
    await Initialize();

    await user1Contract.writeInteraction(
      {
        function: 'addPair',
        params: {
          pstAddress: testPstTxId,
        }
      },
      { transfer: {
          target: walletAddress,
          winstonQty: await arweave.ar.arToWinston("9"),
        }
      }
    );
    await mineBlocks(1);

    expect((await user1Contract.readState()).cachedValue.state['maxPairId']).toEqual(0);
  });

  it('test add same pst twice', async () => {
    await Initialize();
    await addPair();
    await addPair();

    expect((await user1Contract.readState()).cachedValue.state['maxPairId']).toEqual(2);
  });

  it('test insufficient funds', async () => {
    await Initialize();
    await createDedicatedWallet();
    await addPair();

    await createOrder(1, 'buy', 100000, 1);
    await createOrder(2, 'sell', 100000);
    
    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['1']['orders'].length).toEqual(0);
    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['1']['currentPrice']).toEqual(undefined);

    expect((await user1Tar.currentBalance(user1WalletAddress)).balance).toEqual(10000);
    expect((await user2Tar.currentBalance(user2WalletAddress)).balance).toEqual(10000);

    expect((await user1TestPst.currentBalance(user1WalletAddress)).balance).toEqual(10000);
    expect((await user2TestPst.currentBalance(user2WalletAddress)).balance).toEqual(10000);
  });

  it('test invalid pst state', async () => {
    await Initialize();
    let testPstSrc = fs.readFileSync(path.join(__dirname, '../dist/pst/contract.js'), 'utf8');
    let testPstInit = {
      ticker: 'TEST',
      name: 'test token',
    };
    testPstTxId = (await warp.createContract.deploy({
      wallet: walletJwk,
      initState: JSON.stringify(testPstInit),
      src: testPstSrc,
    })).contractTxId;
    user1TestPst = warp.pst(testPstTxId);
    user1TestPst.setEvaluationOptions({
      ignoreExceptions: false,
    }).connect(user1WalletJwk);
    user2TestPst = warp.pst(testPstTxId);
    user2TestPst.setEvaluationOptions({
      ignoreExceptions: false,
    }).connect(user2WalletJwk);
    await createDedicatedWallet();
    await addPair();

    await createOrder(1, 'buy', 100, 1);
    await createOrder(2, 'sell', 100, 1);
    await cancelOrder(1, 0);
    
    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['1']['orders'].length).toEqual(0);
    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['1']['currentPrice']).toEqual(undefined);

    expect((await user1Tar.currentBalance(user1WalletAddress)).balance).toEqual(10000);
    expect((await user2Tar.currentBalance(user2WalletAddress)).balance).toEqual(10000);
  });

  it('test create invalid dedicated wallet', async () => {
    await Initialize();
    
    const u1DWalletTxId = await deployDedicatedWallet(user1WalletJwk);
    await user1Contract.writeInteraction({
      function: "registerDedicatedWallet",
      params: {
        address: u1DWalletTxId,
      }
    });
    await mineBlocks(1);

    await user2Contract.writeInteraction({
      function: "registerDedicatedWallet",
      params: {
        address: u1DWalletTxId,
      }
    });

    expect((await user1Contract.readState()).cachedValue.state['userInfos'][user2WalletAddress]).toEqual(undefined);
  });

  it('test userInfo function', async () => {
    await Initialize();
    await createDedicatedWallet();

    const ret = await user1Contract.dryWrite({
      function: 'userInfo',
      params: {
        address: user1WalletAddress
      }
    })

    expect(ret.result['walletStatus']).toEqual('normal');
  });

  it('test cont create & cancel orders', async () => {
    await Initialize();
    await createDedicatedWallet();
    await addPair();

    await createOrder(1, 'buy', 1, 1);
    await createOrder(1, 'buy', 1, 1);
    await cancelOrder(1, 0);
    await cancelOrder(1, 0);

    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['1']['orders'].length).toEqual(0);
    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['1']['currentPrice']).toEqual(undefined);

    expect((await user1Tar.currentBalance(user1WalletAddress)).balance).toEqual(10000);
    expect((await user2Tar.currentBalance(user2WalletAddress)).balance).toEqual(10000);
    expect((await user1TestPst.currentBalance(user1WalletAddress)).balance).toEqual(10000);
    expect((await user2TestPst.currentBalance(user2WalletAddress)).balance).toEqual(10000);
  });

  it('test match self order', async () => {
    await Initialize();
    await createDedicatedWallet();
    await addPair();

    await createOrder(1, 'buy', 1, 1);
    await createOrder(1, 'sell', 1, 1);

    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['1']['orders']).toEqual([]);
    expect((await user1Contract.readState()).cachedValue.state['userInfos'][user1WalletAddress]['orders']['1'].length).toEqual(0);
    expect((await user1Contract.readState()).cachedValue.state['userInfos'][user2WalletAddress]['orders']['1'].length).toEqual(0);
    expect((await user1Contract.readState()).cachedValue.state['orderInfos']['1']['currentPrice']).toEqual(1);

    expect((await user1Tar.currentBalance(user1WalletAddress)).balance).toEqual(10000);
    expect((await user2Tar.currentBalance(user2WalletAddress)).balance).toEqual(10000);

    expect((await user1TestPst.currentBalance(user1WalletAddress)).balance).toEqual(10000);
    expect((await user2TestPst.currentBalance(user2WalletAddress)).balance).toEqual(10000);
  });

});

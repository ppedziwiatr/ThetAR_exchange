import dedicatedWalletSrc from './dedicatedWallet.txt';

import {
  WarpFactory,
  LoggerFactory,
  sleep,
} from 'warp-contracts';
import { selectWeightedPstHolder } from 'smartweave';
/* global BigInt */

LoggerFactory.INST.logLevel('error');

// addresses
const thetARContractAddress = 'yC2KBRKFyP87uta5ecFkV8u3Ho0-ocHXZ926f26p9-E';
const feeWalletAdrress = 'qsrUupCYM7qOY3ZERVemPoWyHhB1PpU219cGfKMOJNI';

const warp = WarpFactory.forLocal(1984);
// const warp = WarpFactory.forTestnet();
// const warp = WarpFactory.forMainnet();
const arweave = warp.arweave;
let walletAddress = undefined;
export let isConnectWallet = false;

let thetARContract = undefined;

export async function connectWallet(walletJwk) {
  thetARContract.connect(walletJwk);
  isConnectWallet = true;
  walletAddress = await arweave.wallets.jwkToAddress(walletJwk);
}

export async function connectContract() {
  thetARContract = warp.contract(thetARContractAddress);
  thetARContract.setEvaluationOptions({
    internalWrites: true,
    allowUnsafeClient: true,
  });

  return {status: true, result: 'Connect contract success!'};
}

export function getWalletAddress() {
  return walletAddress;
}

export function arLessThan(a, b) {
  return arweave.ar.isLessThan(arweave.ar.arToWinston(a), arweave.ar.arToWinston(b));
}

export async function registerDedicatedWallet() {
  if (!isConnectWallet) {
    return {status: false, result: 'Please connect your wallet first!'};
  }
  if (!thetARContract) {
    return {status: false, result: 'Please connect contract first!'};
  }
  
  const srcFromFile = await fetch(dedicatedWalletSrc);
  const src = await srcFromFile.text();

  let result = "";
  let status = true;
  try {
    const txId = (await warp.createContract.deploy({
      wallet: 'use_wallet',
      initState: JSON.stringify({
        "owner": getWalletAddress(),
        "admin": thetARContractAddress,
      }),
      src: src,
    },
    true
    )).contractTxId;

    await thetARContract.writeInteraction({
      function: "registerDedicatedWallet",
      params: {
        address: txId,
      }
    });
    result = 'Register dedicated wallet success! Click again to activate!';
  } catch (error) {
    status = false;
    result = error.message;
  }

  return {status: status, result: result};
}

export async function activateDedicatedWallet() {
  if (!isConnectWallet) {
    return {status: false, result: 'Please connect your wallet first!'};
  }
  if (!thetARContract) {
    return {status: false, result: 'Please connect contract first!'};
  }

  let result = "";
  let status = true;
  try {
    await thetARContract.writeInteraction({
      function: "activateDedicatedWallet",
    });
    result = 'Dedicated wallet is successfully activated!'
  } catch (error) {
    status = false;
    result = error.message;
  }

  return {status: status, result: result};
}

export async function addPair(pstAddress) {
  if (!isConnectWallet) {
    return {status: false, result: 'Please connect your wallet first!'};
  }
  if (!thetARContract) {
    return {status: false, result: 'Please connect contract first!'};
  }

  if (!isWellFormattedAddress(pstAddress)) {
    return {status: false, result: 'Pst address not valid!'};
  }

  let result = "";
  let status = true;
  try {
    await thetARContract.writeInteraction(
      {
        function: 'addPair',
        params: {
          pstAddress: pstAddress
        }
      },
      {
        transfer: {
          target: feeWalletAdrress,
          winstonQty: await arweave.ar.arToWinston("0"),
        },
        disableBundling: true
      }
    );
    result = 'Add pair succeed!'
  } catch (error) {
    status = false;
    result = error.message;
  }

  return {status: status, result: result};
}

export async function getBalance(pstAddress) {
  if (!isConnectWallet) {
    return {status: false, result: 'Please connect your wallet first!'};
  }
  if (!thetARContract) {
    return {status: false, result: 'Please connect contract first!'};
  }

  if (!isWellFormattedAddress(pstAddress) && pstAddress !== 'ar') {
    return {status: false, result: 'Pst address not valid!'};
  }

  let result = "";
  let status = true;
  try {
    if (pstAddress === 'ar') {
      result = arweave.ar.winstonToAr(await arweave.wallets.getBalance(getWalletAddress()));
    } else {
      result = await (await warp.pst(pstAddress).currentBalance(getWalletAddress())).balance.toString();
    }
  } catch (error) {
    status = false;
    result = error.message;
  }

  return {status: status, result: result};
}

export async function createOrder(direction, quantity, price, pairId) {
  if (!isConnectWallet) {
    return {status: false, result: 'Please connect your wallet first!'};
  }
  if (!thetARContract) {
    return {status: false, result: 'Please connect contract first!'};
  }
  if (direction !== 'sell' && direction !== 'buy') {
    return {status: false, result: 'Direction must either be BUY or SELL!'};
  }
  if (!Number.isInteger(quantity) || quantity <= 0) {
    return {status: false, result: 'Quantity must be positive integer!'};
  }
  if (price !== undefined && (!Number.isInteger(price) || price <= 0)) {
    return {status: false, result: 'Price must either be positive integer or undefined!'};
  }
  if (!Number.isInteger(pairId) || pairId < 0) {
    return {status: false, result: 'PairId must be non-negative integer!'};
  }

  let result = "";
  let status = true;
  try {
    const dedicatedWalletAddr = (await thetARContract.dryWrite({
      function: 'dedicatedWalletStatus',
      params: {
        owner: getWalletAddress()
      }
    })).result['dedicatedWallet'];

    const pairInfo = (await thetARContract.dryWrite({
      function: 'pairInfo',
      params: {
        pairId: pairId
      }
    })).result;


    let pst = warp.pst(direction === 'buy' ? pairInfo['dominantTokenAddress'] : pairInfo['tokenAddress']);
    pst.connect('use_wallet');
    const transferTx = (await pst.writeInteraction({
      function: 'transfer',
      target: dedicatedWalletAddr,
      qty: quantity
    })).originalTxId;

    await thetARContract.writeInteraction({
      function: 'createOrder',
      params: {
        pairId: pairId,
        direction: direction,
        price: price
      }
    });
    result = 'Create order success!';
  } catch (error) {
    status = false;
    result = error.message;
  }

  return {status: status, result: result};
}

export async function txStatus(tx) {
  return (await arweave.transactions.getStatus(tx)).status;
}

export async function pairInfo(pairId) {
  if (!thetARContract) {
    return {status: false, result: 'Please connect contract first!'};
  }

  let result = "";
  let status = true;
  try {
    result = (await thetARContract.dryWrite({
      function: "pairInfo",
      params: {
        pairId: pairId
      }
    })).result;
  } catch (error) {
    status = false;
    result = error.message;
  }

  return {status: status, result: result};
}

export async function cancelOrder(pairId, orderId) {
  if (!isConnectWallet) {
    return {status: false, result: 'Please connect your wallet first!'};
  }
  if (!thetARContract) {
    return {status: false, result: 'Please connect contract first!'};
  }
  if (!Number.isInteger(pairId) || pairId < 0) {
    return {status: false, result: 'PairId must be non-negative integer!'};
  }
  if (!isWellFormattedAddress(orderId)) {
    return {status: false, result: 'orderId not valid!'};
  }

  let result = "";
  let status = true;
  try {
    const txId = await thetARContract.writeInteraction({
      function: 'cancelOrder',
      params: {
        pairId: pairId,
        orderId: orderId
      }
    });
    result = 'Order cancelled successfully!';
  } catch (error) {
    status = false;
    result = error.message;
  }

  return {status: status, result: result};
}

export async function pairInfos() {
  if (!thetARContract) {
    return {status: false, result: 'Please connect contract first!'};
  }

  let result = "";
  let status = true;
  try {
    result = (await thetARContract.dryWrite({
      function: "pairInfos",
    })).result;
  } catch (error) {
    status = false;
    result = error.message;
  }

  return {status: status, result: result};
}

export async function tokenInfos() {
  if (!thetARContract) {
    return {status: false, result: 'Please connect contract first!'};
  }

  let result = "";
  let status = true;
  try {
    result = (await thetARContract.dryWrite({
      function: "tokenInfos",
    })).result;
  } catch (error) {
    status = false;
    result = error.message;
  }

  return {status: status, result: result};
}

export async function tokenInfo(pstAddress) {
  if (!thetARContract) {
    return {status: false, result: 'Please connect contract first!'};
  }
  if (!isWellFormattedAddress(pstAddress)) {
    return {status: false, result: 'Token address format error!'};
  }

  let result = "";
  let status = true;
  try {
    result = (await thetARContract.dryWrite({
      function: "tokenInfo",
      params: {
        pstAddress: pstAddress
      }
    })).result;
  } catch (error) {
    status = false;
    result = error.message;
  }

  return {status: status, result: result};
}

export async function orderInfos() {
  if (!thetARContract) {
    return {status: false, result: 'Please connect contract first!'};
  }

  let result = "";
  let status = true;
  try {
    result = (await thetARContract.dryWrite({
      function: "orderInfos",
    })).result;
  } catch (error) {
    status = false;
    result = error.message;
  }

  return {status: status, result: result};
}

export async function orderInfo(pairId) {
  if (!thetARContract) {
    return {status: false, result: 'Please connect contract first!'};
  }
  if (!Number.isInteger(pairId) || pairId < 0) {
    return {status: false, result: 'PairId must be non-negative integer!'};
  }

  let result = "";
  let status = true;
  try {
    result = (await thetARContract.dryWrite({
      function: "orderInfo",
      params: {
        pairId: pairId
      }
    })).result;
  } catch (error) {
    status = false;
    result = error.message;
  }

  return {status: status, result: result};
}

export async function userInfo(address) {
  if (!thetARContract) {
    return {status: false, result: 'Please connect contract first!'};
  }
  if (!isWellFormattedAddress(address)) {
    return {status: false, result: 'Wallet address format error!'};
  }

  let result = "";
  let status = true;
  try {
    result = (await thetARContract.dryWrite({
      function: "userInfo",
      params: {
        address: address
      }
    })).result;
  } catch (error) {
    status = false;
    result = error.message;
  }

  return {status: status, result: result};
}

export async function readState() {
  if (!thetARContract) {
    return {status: false, result: 'Please connect contract first!'};
  }

  let result = "";
  let status = true;
  try {
    result = await thetARContract.readState();
    // result = await warp.pst('lgtwZTcbVe6PXcWDHBeuL4a__QfC_TRjUAKGsNJcvJU')
    // .setEvaluationOptions({allowUnsafeClient:true, internalWrites:true}).readState();
  } catch (error) {
    status = false;
    result = error.message;
  }

  return {status: status, result: result};
}


// export async function txInfo() {
//   const txs = [
//     "jrvTC4GntH-6VzspWT-egJEYg70Z8l3Wk_mYr9MFhGw",
//     "jyn6pBF-SafJjIPdpScJxBu6syzEv0mR1L-faEIesmw",
//     "QpC_9cx-vpZFGxMEXn9vChRssBeqcQbP1EXQtRcody0",
//     "SdBKfDYdrhZdOyA7tO7RDiJ2vK_XgNs8PzJRLQSoOaI",
//   ]
//   let res = [];

//   for (let i = 0; i < txs.length; i++) {
//     const tx = txs[i];
//     let ret = {tx: tx, k_v: {}};
//     const info = await arweave.transactions.get(tx);
//     info.get('tags').forEach(tag => {
//       const key = tag.get('name', {decode: true, string: true});
//       const value = tag.get('value', {decode: true, string: true});
//       ret.k_v[key] = value;
//     });
//     res.push(ret);
//   }

//   console.log('txInfo: ', res);
// }

export const isWellFormattedAddress = (input) => {
  const re = /^[a-zA-Z0-9_-]{43}$/;
  return re.test(input);
}
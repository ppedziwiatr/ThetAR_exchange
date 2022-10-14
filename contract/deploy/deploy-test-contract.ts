import fs from 'fs';
import Arweave from 'arweave';
import { JWKInterface } from 'arweave/node/lib/wallet';
import path from 'path';
import { addFunds, mineBlock } from '../utils/_helpers';
import {
  PstState,
  Warp,
  WarpNodeFactory,
  LoggerFactory,
} from 'warp-contracts';

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

(async () => {
  console.log('running...');
  const arweave = Arweave.init({
    // host: 'testnet.redstone.tools',
    // port: 443,
    // protocol: 'https',
    host: 'localhost',
    port: 1984,
    protocol: 'http',
  });

  LoggerFactory.INST.logLevel('error');

  const warp = WarpNodeFactory.memCachedBased(arweave).useArweaveGateway().build();

  const walletJwk = await arweave.wallets.generate();
  await addFunds(arweave, walletJwk);
  const walletAddress = await arweave.wallets.jwkToAddress(walletJwk);
  await mineBlock(arweave);

  // deploy KAR & TAR tokens
  const pstSrc = fs.readFileSync(path.join(__dirname, 'fixed_pst.js'), 'utf8');
  const init = {
    type: "fixed_supply",
    maxSupply: 1000000000,
    ticker: "kar",
    name: "kar",
    owner: walletAddress,
    balances: {}
  };
  init.balances[walletAddress] = 10000;
  const karTxId = (await warp.createContract.deploy({
    wallet: walletJwk,
    initState: JSON.stringify(init),
    src: pstSrc,
  }));
  await mineBlock(arweave);

  init.ticker = 'tar';
  init.name = 'tar';
  const tarTxId = (await warp.createContract.deploy({
    wallet: walletJwk,
    initState: JSON.stringify(init),
    src: pstSrc,
  }));
  await mineBlock(arweave);

  // calc hashs
  const fixedPstSrcHash = calcHash(fs.readFileSync(path.join(__dirname, 'fixed_pst.js'), 'utf8'));
  const mintablePstSrcHash = calcHash(fs.readFileSync(path.join(__dirname, 'mintable_pst.js'), 'utf8'));
  const dedicatedWalletHash = calcHash(fs.readFileSync(path.join(__dirname, '../dist/dedicated_wallet/contract.js'), 'utf8'));

  const contractSrc = fs.readFileSync(path.join(__dirname, '../dist/thetAR/contract.js'), 'utf8');
    const initFromFile = JSON.parse(
      fs.readFileSync(path.join(__dirname, '../dist/thetAR/initial-state.json'), 'utf8')
    );
  const contractInit = {
    ...initFromFile,
    logs: [], //debug
    owner: walletAddress,
    pstSrcTemplateHashs: [fixedPstSrcHash, mintablePstSrcHash],
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

  const contractTxId = (await warp.createContract.deploy({
    wallet: walletJwk,
    initState: JSON.stringify(contractInit),
    src: contractSrc,
  }));
  console.log('txid: ', contractTxId);
  console.log('wallet address: ', walletAddress);
  fs.writeFileSync(path.join(__dirname, 'key-file-for-test.json'), JSON.stringify(walletJwk));
  fs.writeFileSync(path.join(__dirname, 'thetAR-txid-for-test.json'), contractTxId);
})();

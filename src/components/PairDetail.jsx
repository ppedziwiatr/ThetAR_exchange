import React from 'react';
import { useParams } from "react-router-dom";
import { sleep } from 'warp-contracts';
import { 
  pairInfo,
  tokenInfo,
  orderInfo,
  getWalletAddress,
  getBalance
} from '../lib/api';
import { MakeOrder } from './MakeOrder';
import { OrderList } from './OrderList';
import { PageLoading } from './PageLoading/PageLoading';

export const PairDetail = (props) => {
  const params = useParams();
  const [walletAddress, setWalletAddress] = React.useState();

  const [arBalance, setArBalance] = React.useState('N/A');
  const [pstBalance, setPstBalance] = React.useState('N/A');
  const [dominentBalance, setDominentBalance] = React.useState('N/A');

  const [pair, setPair] = React.useState();
  const [pst, setPst] = React.useState();
  const [dominent, setDominent] = React.useState();
  const [order, setOrder] = React.useState();
  
  React.useEffect(async () => {
    const tryGetWalletAddress = async () => {
      const walletAddress = getWalletAddress();
      if (!walletAddress) {
        await sleep(5000);
        tryGetWalletAddress();
      } else {
        setWalletAddress(walletAddress);
      }
    }

    tryGetWalletAddress();
  }, []);

  React.useEffect(async () => {
    const arBalanceRet = await getBalance('ar');
    if (!arBalanceRet.status) {
      return;
    }
    setArBalance(arBalanceRet.result);

    const pstBalanceRet = await getBalance(pair.tokenAddress);
    if (!pstBalanceRet.status) {
      return;
    }
    setPstBalance(pstBalanceRet.result);

    const dominentBalanceRet = await getBalance(pair.dominantTokenAddress);
    if (!dominentBalanceRet.status) {
      return;
    }
    setDominentBalance(dominentBalanceRet.result);

  }, [pair&&walletAddress]);

  async function fetchInfos() {
    const pairId = parseInt(params.pairId);
    const pairInfoRet = await pairInfo(pairId);
    if (!pairInfoRet.status) {
      return pairInfoRet;
    }
    setPair(pairInfoRet.result);

    const orderInfoRet = await orderInfo(pairId);
    if (!orderInfoRet.status) {
      return orderInfoRet;
    }
    setOrder(orderInfoRet.result);

    const pstInfoRet = await tokenInfo(pairInfoRet.result.tokenAddress);
    if (!pstInfoRet.status) {
      return pstInfoRet;
    }
    const dominentInfoRet = await tokenInfo(pairInfoRet.result.dominantTokenAddress);
    if (!dominentInfoRet.status) {
      return dominentInfoRet;
    }
    setPst(pstInfoRet.result);
    setDominent(dominentInfoRet.result);
    return {status: true, result: "Fetch infos sucessful!"}
  }

  return (
    <>
      <PageLoading 
        submitTask={fetchInfos}
      />
      {pair && pst && dominent && order &&
        <>
          <div className='PairDetailTitle'>
            Pair:&nbsp;&nbsp;
            #{pair.pairId}&nbsp;&nbsp;
            ${pst.ticker} / ${dominent.ticker}
          </div>

          <div className='PairDetailInfo'>
            Token Address:&nbsp;&nbsp;
            <a href='https://www.arweave.net/s7ksIBcS3fPMuKcoQEGNg0R-QyDmx5sZria00t9ydDw'> 
              {pst.tokenAddress} 
            </a>
          </div>
          <div className='PairDetailInfo'>$AR Balance: {arBalance}</div>
          <div className='PairDetailInfo'>${pst.ticker} Balance: {pstBalance}</div>
          <div className='PairDetailInfo'>${dominent.ticker} Balance: {dominentBalance}</div>

          <hr width="90%" SIZE='1' color='#6f7a88'/>
          <MakeOrder 
            pstTicker={pst.ticker}
            pstBalance={pstBalance}
            dominentTicker={dominent.ticker}
            dominentBalance={dominentBalance}
            arBalance={arBalance}
            orders={order}
            pairId={pair.pairId}
          />
          <hr width="90%" SIZE='1' color='#6f7a88'/>

          <OrderList 
            orders={order}
            pairId={pair.pairId}
          />
        </>
      }
    </>
  );
};
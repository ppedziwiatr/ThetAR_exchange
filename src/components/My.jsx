import React from 'react';
import { sleep } from 'warp-contracts';
import { 
  getBalance, 
  getWalletAddress,
  userInfo,
  registerDedicatedWallet,
  activateDedicatedWallet,
  txStatus,
} from '../lib/api';
import { MyOrders } from './MyOrders';
import { ProgressSpinner } from './ProgressSpinner/ProgressSpinner';
import { SubmitButton } from './SubmitButton/SubmitButton';

export const My = (props) => {
  const [walletAddress, setWalletAddress] = React.useState();
  const [balance, setBalance] = React.useState('N/A');
  const [userOrders, setUserOrders] = React.useState([]);
  const [dWalletStatus, setDWalletStatus] = React.useState('none');
  const [loadingRes, setLoadingRes] = React.useState("");

  React.useEffect(async () => {
    const tryGetWalletAddress = async () => {
      const walletAddress = getWalletAddress();
      if (!walletAddress) {
        await sleep(1000);
        tryGetWalletAddress();
      } else {
        setWalletAddress(walletAddress);
      }
    }

    if (props.walletConnect) {
      tryGetWalletAddress();
    }
  }, [props.walletConnect]);

  React.useEffect(async () => {
    const balanceRet = await getBalance('ar');
    if (balanceRet.status) {
      setBalance(balanceRet.result);
    }

    const userDetailRet = await userInfo(walletAddress);
    console.log('userDetailRet: ', userDetailRet, 'dwalletstatus: ', dWalletStatus);
    if (userDetailRet.status === true) {
      setLoadingRes('');
      if (!userDetailRet.result) {
        setDWalletStatus('none');
        return;
      }

      if (userDetailRet.result.walletStatus === 'pending') {
        if (await txStatus(userDetailRet.result.dedicatedWallet) !== 200) {
          setDWalletStatus('waiting');
        } else {
          setDWalletStatus('pending');
        }
        return;
      }

      setDWalletStatus(userDetailRet.result.walletStatus);
      setUserOrders(userDetailRet.result.orders);
    } else {
      setLoadingRes(userDetailRet.result);
    }
  }, [walletAddress]);

  async function onSubmit(){
    console.log('dWalletStatus: ', dWalletStatus);
    if (dWalletStatus === 'none') {
      const ret = await registerDedicatedWallet();
      setDWalletStatus('waiting');
      return ret;
    } 
    if (dWalletStatus === 'pending') {
      const ret = await activateDedicatedWallet();
      setDWalletStatus('normal');
      return ret;
    }
  }

  if (!props.walletConnect) {
    return (
      <div className='darkRow'>
        Please connect wallet first!
      </div>
    );
  }

  if (!walletAddress) {
    return (<ProgressSpinner />);
  }

  if (loadingRes !== '') {
    return (<div className='darkRow'>{loadingRes}</div>)
  }

  if (dWalletStatus === 'none') {
    return (
      <>
        <div className='center'>Welcome to ThetAR exchange!</div>
        <div className='center'>Please register for Dedicated Wallet!</div>
        <SubmitButton 
          buttonText='Register'
          buttonSize='Large'
          submitTask={onSubmit}
        />
      </>
    );
  }

  if (dWalletStatus === 'waiting') {
    return (
      <div className='center'>
        You have registered dedicated wallet, please wait for tx mined by Arweave and refresh this page!
        This might take several minutes! Have a rest!☕️
      </div>
    );
  }

  if (dWalletStatus === 'pending') {
    return (
      <>
        <div className='center'>Click button to activate Dedicated Wallet!</div>
        <SubmitButton 
          buttonText='Activate'
          buttonSize='Large'
          submitTask={onSubmit}
        />
      </>
    );
  }
  
  return (
    <>
      <MyOrders />
    </>
  );
};
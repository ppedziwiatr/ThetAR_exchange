import React from 'react';
import { sleep } from 'warp-contracts';
import { 
  addPair,
  getBalance,
  connectWallet,
} from '../lib/api';
import { SubmitButton } from './SubmitButton/SubmitButton';
import { TextInput } from './TextInput/TextInput';

export const AddPair = (props) => {
  const [pstAddress, setPstAddress] = React.useState();
  const [balance, setBalance] = React.useState('N/A');

  React.useEffect(async () => {
    const tryGetBalance = () => {
      getBalance('ar').then(async ret=>{
        if (ret.status === false) {
          await sleep(5000);
          tryGetBalance();
        } else {
          setBalance(ret.result);
        }
      });
    }
    tryGetBalance();
  }, []);
  
  return (
    <>
      <div className='instruction'>
        ⚠️ ThetAR exchange adheres to the concept of community autonomy - Everyone can add trading pairs. 
        At the same time, in order to avoid flooding attacks, there is a fee for adding pairs(10 $AR). Your $AR balance 
        is: {balance}.
      </div>
      <TextInput 
        title='Pst address:'
        tip={<>❕Note: For security, only support pst generated by <a href='https://www.arweave.net/jDGJJFifbOd8HZVjbEL20fO0uT5DoPUVZCgreVHfn0M'>WeaveMint</a>. 
            If not, please contact <a href='mailto: marslab.2022@gmail.com'>mARsLab</a> team to add pairs for you.</>}
        onChange={setPstAddress}
        placeholder='e.g. KmGb0DGNRfSlQzBYkHRbZYU8TEwaiNtoO-AH-ln1dJg'
      />
      <SubmitButton 
        buttonText='Submit'
        buttonSize='Large'
        submitTask={()=>addPair(pstAddress)}
      />
    </>
  );
};
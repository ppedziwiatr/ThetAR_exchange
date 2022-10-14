import * as type from '../../types/types';
import { isAddress } from '../common';

declare const ContractError;

export const registerDedicatedWallet = async (
  state: type.State,
  action: type.Action,
): Promise<type.ContractResult> => {
  const param: type.registerDedicatedWalletParam = <type.registerDedicatedWalletParam>action.input.params;
  const address: string = param.address;
  if (!isAddress(address)) {
    throw new ContractError('Dedicated wallet address format error!');
  }

  for (const userAddr in state.userInfos) {
    if (Object.prototype.hasOwnProperty.call(state.userInfos, userAddr)) {
      const info = state.userInfos[userAddr];
      if (info.dedicatedWallet === address) {
        throw new ContractError('Dedicated wallet address already used!');
      }
    }
  }

  const initOrders = {};
  state.pairInfos.forEach(e => {
    initOrders[e.pairId.toString()] = [];
  });
  
  state.userInfos[action.caller] = {
    dedicatedWallet: address,
    walletStatus: 'pending',
    orders: initOrders,
  };

  return { state };
};
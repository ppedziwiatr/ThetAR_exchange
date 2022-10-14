import * as type from '../../types/types';
import { isAddress } from '../common';

declare const ContractError;

export const dedicatedWalletStatus = async (
  state: type.State,
  action: type.Action,
): Promise<type.ContractResult> => {
  const param: type.dedicatedWalletStatusParam = <type.dedicatedWalletStatusParam>action.input.params;
  let walletOwner: string = param.owner;
  let result: type.Result;

  if (!isAddress(walletOwner)) {
    throw new ContractError(`Address format error!`);
  }
  const userInfos = state.userInfos[walletOwner];
  if (!userInfos) {
    throw new ContractError(`Unknown target address!`);
  }

  result = {
    dedicatedWallet: userInfos.dedicatedWallet,
    walletStatus: userInfos.walletStatus,
  }

  return { result };
};

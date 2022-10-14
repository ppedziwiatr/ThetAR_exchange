import * as type from '../../types/types';
import { hashCheck, isAddress } from '../common';

declare const ContractError;

export const activateDedicatedWallet = async (
  state: type.State,
  action: type.Action,
): Promise<type.ContractResult> => {
  const userInfos: {dedicatedWallet: string, walletStatus: "pending" | "normal" | "invalid"} = state.userInfos[action.caller];
  if (!userInfos) {
    throw new ContractError('UserInfos not exist in state!');
  }
  if (userInfos.walletStatus === 'normal') {
    throw new ContractError('Your dedicated wallet is already in active!');
  }
  if (userInfos.walletStatus === 'invalid') {
    throw new ContractError('Your dedicated wallet is not valid!');
  }
  const dedicatedWallet: string = userInfos.dedicatedWallet;

  if (!await hashCheck([state.dedicatedWalletTemplateHash], dedicatedWallet) || !await initialStateCheck(dedicatedWallet)) {
    userInfos.walletStatus = 'invalid';
  } else {
    userInfos.walletStatus = 'normal';
  }

  return { state };
};

const initialStateCheck = async (
  dedicatedWallet: string
): Promise<boolean> => {
  const state = await SmartWeave.contracts.readContractState(dedicatedWallet);
  if (state.admin !== SmartWeave.contract.id) {
    return false;
  }
  return true;
}
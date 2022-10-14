import * as type from '../../types/types';
import { hashCheck, isAddress } from '../common';

declare const ContractError;

export const addPair = async (
  state: type.State,
  action: type.Action,
): Promise<type.ContractResult> => {
  const param: type.addPairParam = <type.addPairParam>action.input.params;
  const pstAddress: string = param.pstAddress;
  if (!isAddress(pstAddress)) {
    throw new ContractError('Pst address format error!');
  }

  if (action.caller !== state.owner) {
    const txQty = SmartWeave.transaction.quantity;
    const txTarget = SmartWeave.transaction.target;
    if (txTarget !== state.owner) {
      throw new ContractError('AddPair fee sent to wrong target!');
    }
    if (SmartWeave.arweave.ar.isLessThan(txQty, SmartWeave.arweave.ar.arToWinston('10'))) {
      throw new ContractError('AddPair fee not right!');
    }
    
    if (!await hashCheck(state.pstSrcTemplateHashs, pstAddress)) {
      throw new ContractError('Pst contract validation check failed!');
    }
  }
  if (state.tokenInfos.map(info=>info.tokenAddress).includes(pstAddress)) {
    throw new ContractError('Pair already exists!');
  }

  const pstState = await SmartWeave.contracts.readContractState(pstAddress);

  state.tokenInfos.push({
    tokenAddress: pstAddress,
    tokenName: pstState.name,
    ticker: pstState.ticker,
    logo: "",
  });

  [state.thetarTokenAddress, state.karTokenAddress].forEach(dominantToken => {
    state.maxPairId ++;
    state.pairInfos.push({
      pairId: state.maxPairId,
      tokenAddress: pstAddress,
      dominantTokenAddress: dominantToken,
    });
    state.orderInfos[state.maxPairId] = {
      currentPrice: undefined,
      orders: [],
    };
    for (const user in state.userInfos) {
      if (Object.prototype.hasOwnProperty.call(state.userInfos, user)) {
        let userInfo = state.userInfos[user];
        userInfo.orders[state.maxPairId] = [];
      }
    }
  });

  return { state };
};
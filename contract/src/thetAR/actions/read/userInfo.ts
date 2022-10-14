import * as type from '../../types/types';
import { isAddress } from '../common';

declare const ContractError;

export const userInfo = async (
  state: type.State,
  action: type.Action,
): Promise<type.ContractResult> => {
  const param: type.userInfoParam = <type.userInfoParam>action.input.params;
  let address: string = param.address;
  let result: type.Result;

  if (!isAddress(address)) {
    throw new ContractError(`Invalid wallet address!`);
  }

  result = state.userInfos[address];

  return { result };
};

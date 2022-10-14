import * as type from '../../types/types';
import { isAddress } from '../common';

declare const ContractError;

export const tokenInfo = async (
  state: type.State,
  action: type.Action,
): Promise<type.ContractResult> => {
  const param: type.tokenInfoParam = <type.tokenInfoParam>action.input.params;
  let pstAddress: string = param.pstAddress;
  let result: type.Result;

  if (!isAddress(pstAddress)) {
    throw new ContractError(`Invalid pstAddress!`);
  }

  result = state.tokenInfos.filter(i=>i.tokenAddress===pstAddress)[0];

  return { result };
};

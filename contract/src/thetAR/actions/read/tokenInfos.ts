import * as type from '../../types/types';

declare const ContractError;

export const tokenInfos = async (
  state: type.State,
  action: type.Action,
): Promise<type.ContractResult> => {
  let result: type.Result;

  result = state.tokenInfos;

  return { result };
};

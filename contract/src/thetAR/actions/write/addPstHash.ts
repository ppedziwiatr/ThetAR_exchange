import * as type from '../../types/types';
import { isAddress } from '../common';

declare const ContractError;

export const addPstHash = async (
  state: type.State,
  action: type.Action,
): Promise<type.ContractResult> => {
  const param: type.addPstHashParam = <type.addPstHashParam>action.input.params;
  const hash: number = param.hash;
  
  if (action.caller !== state.owner) {
    throw new ContractError('You have no permission to modify hash list!');
  }

  state.pstSrcTemplateHashs.push(hash);

  return { state };
};
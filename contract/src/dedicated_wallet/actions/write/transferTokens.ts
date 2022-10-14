import { ContractResult, Action, State } from '../../types/types';
import { isAddress } from '../common';

declare const ContractError;

export const transferTokens = async (
  state: State,
  { caller, input: { pst, target, qty } }: Action
): Promise<ContractResult> => {
  if (caller !== state.admin) {
    throw new ContractError('You have no permission to transfer token!');
  }
  if (!isAddress(pst)) {
    throw new ContractError('Not valid pst address!');
  }
  if (!isAddress(target)) {
    throw new ContractError('Not valid target address!');
  }

  await SmartWeave.contracts.write(pst, { function: 'transfer', target: target, qty: qty });

  return { state };
};

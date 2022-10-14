import { isAddress } from '../common';
import { ContractResult, PstAction, PstState } from '../../types/types';

declare const ContractError;

export const balance = async (
  state: PstState,
  { input: { target } }: PstAction
): Promise<ContractResult> => {
  const ticker = state.ticker;
  const balances = state.balances;

  if (!target || typeof target !== 'string') {
    throw new ContractError('target format error');
  }
  if (!isAddress(target)) {
    throw new ContractError('not valid address');
  }
  if (typeof balances[target] !== 'number') {
    throw new ContractError('Cannot get balance, target does not exist');
  }

  return { result: { target, ticker, balance: balances[target] } };
};
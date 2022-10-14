import { ContractResult, PstAction, PstState } from '../../types/types';
import { isAddress } from '../common';

declare const ContractError;

export const transferTokens = async (
  state: PstState,
  { caller, input: { target, qty } }: PstAction
): Promise<ContractResult> => {
  const balances = state.balances;

  if (!target || typeof(target) !== 'string') {
    throw new ContractError('target format error');
  }
  if (!isAddress(target)) {
    throw new ContractError('not valid address');
  }
  if (!qty || !Number.isInteger(qty)) {
    throw new ContractError('quantity format error');
  }
  if (qty <= 0 || caller === target) {
    throw new ContractError('Invalid token transfer');
  }
  if (!balances[caller]) {
    throw new ContractError(`Caller balance is not defined!`);
  }
  if (balances[caller] < qty) {
    throw new ContractError(`Caller balance not high enough to send ${qty} token(s)!`);
  }

  balances[caller] -= qty;
  if (target in balances) {
    balances[target] += qty;
  } else {
    balances[target] = qty;
  }

  return { state };
};

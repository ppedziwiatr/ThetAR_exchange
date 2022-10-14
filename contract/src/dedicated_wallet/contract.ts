import { transferTokens } from './actions/write/transferTokens';
import { ContractResult, Action, State } from './types/types';

declare const ContractError;

export async function handle(state: State, action: Action): Promise<ContractResult> {
  const input = action.input;

  switch (input.function) {
    case 'transfer':
      return await transferTokens(state, action);
    default:
      throw new ContractError(`No function supplied or function not recognised: "${input.function}"`);
  }
}

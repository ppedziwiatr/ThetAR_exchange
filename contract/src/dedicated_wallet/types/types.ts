export interface State {
  owner: string;
  admin: string;
}

export interface Action {
  input: Input;
  caller: string;
}

export interface Input {
  function: Function;
  pst: string;
  target: string;
  qty: number;
}

export interface Result {
}

export type Function = 'transfer';

export type ContractResult = { state: State } | { result: Result };

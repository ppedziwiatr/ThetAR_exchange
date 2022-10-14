export interface registerDedicatedWalletParam {
  address: string;
}

export interface dedicatedWalletStatusParam {
  owner: string;
}

export interface addPairParam {
  pstAddress: string;
}

export interface createOrderParam {
  pairId: number;
  direction: 'buy' | 'sell';
  price?: number;
}

export interface cancelOrderParam {
  pairId: number;
  orderId: string;
}

export interface pairInfoParam {
  pairId: number;
}

export interface tokenInfoParam {
  pstAddress: string;
}

export interface addPstHashParam {
  hash: number;
}

export type orderInfoParam = pairInfoParam;

export interface userInfoParam {
  address: string;
}

export interface dedicatedWalletStatusResult {
  dedicatedWallet: string;
  walletStatus: 'pending' | 'normal' | 'invalid';
}

export interface currentPriceResult {
  currentPrice: number;
}

export interface userInfoResult {
  dedicatedWallet: string;
  walletStatus: 'pending' | 'normal' | 'invalid';
  orders: {
    [pairId: number]: orderInterface[];
  }
}

export type pairInfoResult = pairInfoInterface;

export type tokenInfoResult = tokenInfoInterface;

export interface orderInfoResult {
  currentPrice: number;
  orders: orderInterface[];
}

export interface orderInfosResult {
  [pairId: number]: { 
    currentPrice: number;
    orders: orderInterface[];
  };
}

export interface Action {
  input: Input;
  caller: string;
}

export interface Input {
  function: Function;
  params: Params;
}

export interface tokenInfoInterface {
  tokenAddress: string;
  tokenName: string;
  ticker: string;
  logo: string; // reserved
}

export interface orderInterface {
  creator: string;
  direction: 'sell' | 'buy';
  quantity: number;
  price: number;
  orderId: string;
}

export interface pairInfoInterface {
  pairId: number;
  tokenAddress: string;
  dominantTokenAddress: string;
}

export interface State {
  logs: string[]; //debug
  owner: string;
  pstSrcTemplateHashs: number[];
  dedicatedWalletTemplateHash: number;
  thetarTokenAddress: string;
  karTokenAddress: string;
  maxPairId: number;

  tokenInfos: tokenInfoInterface[];
  pairInfos: pairInfoInterface[];
  userInfos: {
    [walletAddress: string]: {
      dedicatedWallet: string;
      walletStatus: 'pending' | 'normal' | 'invalid';
      orders: {
        [pairId: number]: orderInterface[];
      }
    }
  }
  orderInfos: {
    [pairId: number]: { 
      currentPrice: number;
      orders: orderInterface[];
    };
  };
}

export type Function = 
    'createOrder' | 
    'cancelOrder' | 
    'addPair' | 
    'registerDedicatedWallet' | 
    'activateDedicatedWallet' |
    'dedicatedWalletStatus' |
    'pairInfo' |
    'tokenInfo' |
    'pairInfos' |
    'tokenInfos' |
    'orderInfo' |
    'orderInfos' |
    'addPstHash' |
    'userInfo';
export type Params = 
    createOrderParam |
    registerDedicatedWalletParam | 
    dedicatedWalletStatusParam |
    addPairParam |
    cancelOrderParam |
    pairInfoParam |
    tokenInfoParam |
    orderInfoParam |
    addPstHashParam |
    userInfoParam;
export type Result = 
    dedicatedWalletStatusResult | 
    pairInfoResult |
    tokenInfoResult |
    pairInfoResult[] |
    tokenInfoResult[] |
    orderInfoResult |
    orderInfosResult |
    userInfoResult;
export type ContractResult = { state: State } | { result: Result };

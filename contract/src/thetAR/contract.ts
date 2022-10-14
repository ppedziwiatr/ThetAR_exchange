import * as type from './types/types';
import { registerDedicatedWallet } from './actions/write/registerDedicatedWallet';
import { activateDedicatedWallet } from './actions/write/activateDedicatedWallet';
import { addPair } from './actions/write/addPair';
import { createOrder } from './actions/write/createOrder';
import { cancelOrder } from './actions/write/cancelOrder';
import { addPstHash } from './actions/write/addPstHash';
import { dedicatedWalletStatus } from './actions/read/dedicatedWalletStatus';
import { pairInfo } from './actions/read/pairInfo';
import { tokenInfo } from './actions/read/tokenInfo';
import { pairInfos } from './actions/read/pairInfos';
import { tokenInfos } from './actions/read/tokenInfos';
import { orderInfos } from './actions/read/orderInfos';
import { orderInfo } from './actions/read/orderInfo';
import { userInfo } from './actions/read/userInfo';

declare const ContractError;

export async function handle(state: type.State, action: type.Action): Promise<type.ContractResult> {
  const func = action.input.function;

  switch (func) {
    case 'registerDedicatedWallet':
      return await registerDedicatedWallet(state, action);
    case 'activateDedicatedWallet':
      return await activateDedicatedWallet(state, action);
    case 'dedicatedWalletStatus':
      return await dedicatedWalletStatus(state, action);
    case 'addPair':
      return await addPair(state, action);
    case 'createOrder':
      return await createOrder(state, action);
    case 'cancelOrder':
      return await cancelOrder(state, action);
    case 'pairInfo':
      return await pairInfo(state, action);
    case 'tokenInfo':
      return await tokenInfo(state, action);
    case 'pairInfos':
      return await pairInfos(state, action);
    case 'tokenInfos':
      return await tokenInfos(state, action);
    case 'orderInfo':
      return await orderInfo(state, action);
    case 'orderInfos':
      return await orderInfos(state, action);
    case 'addPstHash':
      return await addPstHash(state, action);
    case 'userInfo':
      return await userInfo(state, action);
    default:
      throw new ContractError(`No function supplied or function not recognised: "${func}"`);
  }
}

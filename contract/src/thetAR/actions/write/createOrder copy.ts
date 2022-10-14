import * as type from '../../types/types';

declare const ContractError;
interface Transaction {
  tokenType: 'trade' | 'dominent';
  from: string;
  to: string;
  quantity: number;
}

interface MatchLog {
  userAddress: string;
  orderId: string;
}

export const createOrder = async (
  state: type.State,
  action: type.Action,
): Promise<type.ContractResult> => {
  const param: type.createOrderParam = <type.createOrderParam>action.input.params;
  if (!(param.pairId <= state.maxPairId && param.pairId >= 0)) {
    throw new ContractError('PairId not valid!');
  }
  if (param.price !== undefined && param.price !== null) {
    if (typeof(param.price) !== 'number') {
      throw new ContractError('Price must be a number!');
    }
    if (param.price <= 0 || !Number.isInteger(param.price)) {
      throw new ContractError('Price must be positive integer!');
    }
  }
  if (state.userInfos[action.caller].walletStatus !== 'normal') {
    throw new ContractError(`Your dedicated wallet must be in active state!`);
  }

  const newOrder: type.orderInterface = {
    creator: action.caller,
    orderId: SmartWeave.transaction.id,
    direction: param.direction,
    quantity: await calcOrderQuantity(state, action),
    price: param.price,
  }

  const { newOrderbook, transactions, currentPrice, remainOrder, matchLogs } = matchOrder(
    newOrder,
    state.orderInfos[param.pairId].orders
  );

  // update orderInfos and userInfos
  state.log.push(JSON.stringify(newOrderbook)); //debug
  state.log.push(JSON.stringify(transactions)); //debug
  state.log.push(JSON.stringify(remainOrder)); //debug
  state.orderInfos[param.pairId].orders = newOrderbook;
  if (remainOrder.quantity !== 0) {
    state.userInfos[action.caller].orders[param.pairId].push(remainOrder);
  }
  state.log.push(JSON.stringify(matchLogs)); //debug
  matchLogs.forEach(log => {
    let userOrders = state.userInfos[log.userAddress].orders[param.pairId];
    let matchedOrder = userOrders.find(value=>value.orderId===log.orderId);
    if (matchedOrder.quantity === 0) {
      state.userInfos[log.userAddress].orders[param.pairId] = 
          userOrders.filter(v=>v.orderId !== log.orderId);
    }
  });

  // update pair's current price
  if (!isNaN(currentPrice) && isFinite(currentPrice)) {
    state.orderInfos[param.pairId].currentPrice = currentPrice;
  }
  
  // make transactions
  for await (const tx of transactions) {
    const matchedPair = state.pairInfos.find(i=>i.pairId===param.pairId);
    const targetPstAdrress = tx.tokenType === 'dominent' ? 
        matchedPair.dominantTokenAddress : matchedPair.tokenAddress;

    await SmartWeave.contracts.write(
      state.userInfos[tx.from].dedicatedWallet, 
      { function: 'transfer', pst:  targetPstAdrress, target: tx.to, qty: tx.quantity},
    );
  }
  
  return { state };
};

const calcOrderQuantity = async (
  state: type.State,
  action: type.Action,
): Promise<number> => {
  const param: type.createOrderParam = <type.createOrderParam>action.input.params;

  // fetch wallet balance
  const dedicatedWallet = state.userInfos[action.caller].dedicatedWallet;
  let pairInfo = state.pairInfos.find(pair=>pair.pairId===param.pairId);
  const tokenAddress: string = param.direction === 'buy' ? pairInfo.dominantTokenAddress : pairInfo.tokenAddress;
  const tokenBalance = await SmartWeave.contracts.readContractState(tokenAddress);
  let walletBalance = tokenBalance.balances[dedicatedWallet];
  if (!walletBalance) {
    throw new ContractError(`Token quantity in your dedicated wallet is 0!`);
  }

  // calc in-order token quantity
  let inOrderQuantity = 0;
  if (param.direction === 'sell') {
    const userOrders = state.userInfos[action.caller].orders[param.pairId];
    if (userOrders !== undefined) {
      userOrders.filter(order => order.direction==='sell').forEach(order => {inOrderQuantity += order.quantity;});
    }
  } else {
    const userOrders = state.userInfos[action.caller].orders;
    for (const orders in userOrders) {
      if (Object.prototype.hasOwnProperty.call(userOrders, orders)) {
        const element = userOrders[orders];
        element.filter(order => order.direction==='buy').forEach(order => {
          inOrderQuantity += order.quantity * order.price;
        });
      }
    }
  }

  // calc trade quantity in this order
  let orderQuantity = walletBalance - inOrderQuantity;
  if (!(orderQuantity > 0)) {
    throw new ContractError(`Order quantity must be positive number: ${walletBalance}-${inOrderQuantity}!`);
  }

  // If direction is buy and order type is limit, covert quantity metric to that of wanted token
  // All quantity in orderbook should metric in trade token, 
  // but in `market` order type & `buy` direction we don't know that.
  if (param.direction === 'buy' && param.price) {
    orderQuantity = Math.floor(orderQuantity / param.price);
  }
  return orderQuantity;
};

const matchOrder = (
  newOrder: type.orderInterface,
  orderbook: type.orderInterface[],
): {
  newOrderbook: type.orderInterface[], 
  transactions: Transaction[],
  currentPrice: number,
  remainOrder: type.orderInterface,
  matchLogs: MatchLog[],
} => {
  let transactions: Transaction[] = Array<Transaction>();
  let matchLogs: MatchLog[] = Array<MatchLog>();
  const targetSortDirection = newOrder.direction === 'buy' ? 'sell' : 'buy';
  let totalTradePrice = 0;
  let totalTradeVolume = 0;

  const reverseOrderbook = orderbook.filter(order=>
    order.direction===targetSortDirection
  ).sort((a, b) => {
    if (newOrder.direction === 'buy') {
      return a.price > b.price ? 1 : -1;
    } else {
      return a.price > b.price ? -1 : 1;
    }
  });

  const orderType = newOrder.price ? 'limit' : 'market';
  if (reverseOrderbook.length === 0 && orderType === 'market') {
    throw new ContractError(`The first order must be limit type!`);
  }
  const newOrderTokenType = 
        orderType === 'market' && newOrder.direction === 'buy' ? 
        'dominent' : 'trade';

  for (let i = 0; i < reverseOrderbook.length; i ++) {
    const order = reverseOrderbook[i];

    // For limit type order, we only process orders which price equals to newOrder.price
    if (orderType === 'limit' && order.price !== newOrder.price) {
      continue;
    }

    const targetPrice = order.price;
    const orderAmount = order.quantity;
    const newOrderAmoumt = newOrderTokenType === 'trade' ? 
        newOrder.quantity : Math.floor(newOrder.quantity / targetPrice);
    const targetAmout = orderAmount < newOrderAmoumt ? orderAmount : newOrderAmoumt;

    totalTradePrice += targetPrice * targetAmout;
    totalTradeVolume += targetAmout;

    if (targetAmout === 0) {
      break;
    }

    // generate transactions
    const buyer = newOrder.direction === 'buy' ? newOrder : order;
    const seller = newOrder.direction === 'buy' ? order : newOrder;
    transactions.push({
      tokenType: 'dominent',
      from: buyer.creator,
      to: seller.creator,
      quantity: targetAmout * targetPrice,
    });
    transactions.push({
      tokenType: 'trade',
      from: seller.creator,
      to: buyer.creator,
      quantity: targetAmout,
    });

    // record to matchLogs
    matchLogs.push({
      userAddress: order.creator,
      orderId: order.orderId,
    });
    
    // update orderbook and new order object
    order.quantity -= targetAmout;
    newOrder.quantity -= newOrderTokenType === 'trade' ? 
        targetAmout : targetAmout * targetPrice;
    if (order.quantity === 0) {
      orderbook = orderbook.filter(v=>v.orderId!==order.orderId);
    }
  }
  /// if there are remaining tokens:

  // case1: refund user 
  if (orderType === 'market' && newOrder.quantity !== 0) {
    transactions.push({
      tokenType: newOrderTokenType,
      from: newOrder.creator,
      to: newOrder.creator,
      quantity: newOrder.quantity,
    });
    newOrder.quantity = 0;
  }
  // case2: add to orderbook
  if (orderType === 'limit' && newOrder.quantity !== 0) {
    orderbook.push(newOrder);
  }


  return {
    newOrderbook: orderbook,
    transactions: transactions,
    currentPrice: totalTradePrice / totalTradeVolume,
    remainOrder: newOrder,
    matchLogs: matchLogs,
  };
};

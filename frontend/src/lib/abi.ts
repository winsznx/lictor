// Full ABI extracted from contracts/Lictor.sol

const signalComponents = [
  { name: 'sourceType', type: 'uint8' },
  { name: 'sourceUrl', type: 'string' },
  { name: 'parseSelector', type: 'string' },
  { name: 'comparator', type: 'uint8' },
  { name: 'threshold', type: 'uint256' },
  { name: 'decimals', type: 'uint8' },
  { name: 'latestValue', type: 'uint256' },
  { name: 'lastUpdated', type: 'uint256' },
  { name: 'triggered', type: 'bool' },
  { name: 'lastRequestId', type: 'uint256' },
] as const

export const lictorAbi = [
  // ─── Events ───────────────────────────────────────────────────────────────
  {
    type: 'event',
    name: 'MandateSubmitted',
    inputs: [
      { name: 'mandateId', type: 'uint256', indexed: true },
      { name: 'owner', type: 'address', indexed: true },
      { name: 'thesis', type: 'string', indexed: false },
      { name: 'tokenIn', type: 'address', indexed: false },
      { name: 'tokenOut', type: 'address', indexed: false },
      { name: 'amountIn', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'MandateArmed',
    inputs: [
      { name: 'mandateId', type: 'uint256', indexed: true },
      { name: 'signalCount', type: 'uint256', indexed: false },
      { name: 'conjunctive', type: 'bool', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'SignalUpdated',
    inputs: [
      { name: 'mandateId', type: 'uint256', indexed: true },
      { name: 'signalIdx', type: 'uint256', indexed: true },
      { name: 'latestValue', type: 'uint256', indexed: false },
      { name: 'triggered', type: 'bool', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'MandateTriggered',
    inputs: [
      { name: 'mandateId', type: 'uint256', indexed: true },
      { name: 'triggeredAt', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'MandateExecuted',
    inputs: [
      { name: 'mandateId', type: 'uint256', indexed: true },
      { name: 'amountOut', type: 'uint256', indexed: false },
      { name: 'executedAt', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'MandateFailed',
    inputs: [
      { name: 'mandateId', type: 'uint256', indexed: true },
      { name: 'reason', type: 'string', indexed: false },
    ],
  },
  // ─── Write functions ───────────────────────────────────────────────────────
  {
    type: 'function',
    name: 'submitMandate',
    stateMutability: 'payable',
    inputs: [
      { name: 'thesis', type: 'string' },
      { name: 'tokenIn', type: 'address' },
      { name: 'tokenOut', type: 'address' },
      { name: 'amountIn', type: 'uint256' },
      { name: 'minOut', type: 'uint256' },
    ],
    outputs: [{ name: 'mandateId', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'tick',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'mandateId', type: 'uint256' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'executeIfReady',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'mandateId', type: 'uint256' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'closeMandate',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'mandateId', type: 'uint256' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'pause',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
  {
    type: 'function',
    name: 'unpause',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
  // ─── View functions ────────────────────────────────────────────────────────
  {
    type: 'function',
    name: 'getMandate',
    stateMutability: 'view',
    inputs: [{ name: 'mandateId', type: 'uint256' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'owner', type: 'address' },
          { name: 'thesis', type: 'string' },
          { name: 'budgetWei', type: 'uint256' },
          { name: 'signals', type: 'tuple[]', components: signalComponents },
          { name: 'conjunctive', type: 'bool' },
          { name: 'tokenIn', type: 'address' },
          { name: 'tokenOut', type: 'address' },
          { name: 'amountIn', type: 'uint256' },
          { name: 'minOut', type: 'uint256' },
          { name: 'status', type: 'uint8' },
          { name: 'createdAt', type: 'uint256' },
          { name: 'triggeredAt', type: 'uint256' },
          { name: 'executedAt', type: 'uint256' },
        ],
      },
    ],
  },
  {
    type: 'function',
    name: 'getSignals',
    stateMutability: 'view',
    inputs: [{ name: 'mandateId', type: 'uint256' }],
    outputs: [
      { name: '', type: 'tuple[]', components: signalComponents },
    ],
  },
  {
    type: 'function',
    name: 'paused',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'owner',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }],
  },
  // ─── Errors ────────────────────────────────────────────────────────────────
  { type: 'error', name: 'TokenNotAllowed', inputs: [{ name: 'token', type: 'address' }] },
  { type: 'error', name: 'SameToken', inputs: [] },
  { type: 'error', name: 'ZeroAmount', inputs: [] },
  {
    type: 'error',
    name: 'InsufficientDeposit',
    inputs: [
      { name: 'required', type: 'uint256' },
      { name: 'provided', type: 'uint256' },
    ],
  },
  { type: 'error', name: 'NotOwner', inputs: [] },
  { type: 'error', name: 'WrongStatus', inputs: [{ name: 'current', type: 'uint8' }] },
  { type: 'error', name: 'OnlyPlatform', inputs: [] },
  { type: 'error', name: 'NotSelf', inputs: [] },
  { type: 'error', name: 'Paused', inputs: [] },
] as const

export type LictorAbi = typeof lictorAbi

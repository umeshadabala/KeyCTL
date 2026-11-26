// Local practice only: plaintext state, no cryptography or concurrency safety.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const statePath = path.join(process.env.TRACK4_STATE_DIR || os.tmpdir(), 'track4-practice-state.json');
exports.dispatch = function dispatch(request) {
  let state, response;
  if (request.op === 'setup') {
    state = { owners: request.owners, contents: request.contents,
      disabled: [...(request.disabled || [])], events: {} };
    response = { ready: true };
  } else if (['read', 'revoke', 'audit'].includes(request.op)) {
    state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    if (request.op === 'revoke') {
      if (!state.disabled.includes(request.actor)) state.disabled.push(request.actor);
      response = {};
    } else if (request.op === 'audit') {
      response = Object.hasOwn(state.events, request.request_id)
        ? state.events[request.request_id] : { error: 'unknown_request' };
    } else {
      const rule = state.disabled.includes(request.actor) ? 'identity_disabled'
        : !Object.hasOwn(state.owners, request.asset) || state.owners[request.asset] !== request.actor
          ? 'owner_required' : 'owner_allowed';
      response = { decision: rule === 'owner_allowed' ? 'allow' : 'deny', rule };
      if (response.decision === 'allow') response.body = state.contents[request.asset];
      Object.defineProperty(state.events, request.request_id, {
        value: { request_id: request.request_id, decision: response.decision, rule },
        enumerable: true, writable: true, configurable: true,
      });
    }
  } else return { error: 'unsupported_operation' };
  fs.writeFileSync(statePath, JSON.stringify(state));
  return response;
};

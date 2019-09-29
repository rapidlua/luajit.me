import * as State from "./State.js";

const actionMap = {};

export function apply(state, action) {
  for (let action of Array.prototype.slice.call(arguments, 1))
    state = actionMap[action.id](state, action);
  return state;
}

/* propertySet - generic toplevel property setter */
export function propertySet(properties) {
  return { id: propertySet, properties };
}
actionMap[propertySet] = (state, action) => Object.assign(
  {}, state, action.properties
);

/* inputSetProperty - generic input property setter */
export function inputPropertySet(properties) {
  return { id: inputPropertySet, properties };
}
actionMap[inputPropertySet] = (state, action) => {
  const input = Object.assign({}, state._input || {});
  delete input._delay;
  return Object.assign(
    {}, state,
    { _input: Object.assign(input, action.properties) }
  );
}

/* Layout management */
const layoutMap = {
  [State.inspectorTab.paneLayout]:
    require("./InspectorTabPaneLayout.js").default
};

export function windowResize(width, height) {
  return { id: windowResize, width, height };
}
actionMap[windowResize] = (state, action) => {
  const state2 = Object.assign(
    {}, state, { _windowWidth: action.width, _windowHeight: action.height }
  );
  for (let layoutId in layoutMap)
    state2[layoutId] = layoutMap[layoutId](state2[layoutId], action, state2);
  return state2;
}

export function paneResize(layoutId, paneId, size) {
  return { id: paneResize, layoutId, paneId, size };
}

export function paneVisibilitySet(layoutId, paneId, isVisible) {
  return { id: paneVisibilitySet, layoutId, paneId, isVisible };
}

actionMap[paneResize] =
actionMap[paneVisibilitySet] = (state, action) => Object.assign(
  {}, state,
  { [layoutId]: layoutMap[layoutId](state[layoutId], action, state) }
);

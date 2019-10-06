import * as Action from './Action.js';

const TRACE_PANE_WIDTH_MIN            = 250;
const TRACE_PANE_VISIBILITY_DEFAULT   = true;
const TRACE_PANE_WIDTH_DEFAULT        = 300;
const SOURCE_PANE_WIDTH_MIN           = 300;
const DETAILS_PANE_WIDTH_MIN          = 250;
const DETAILS_PANE_VISIBILITY_DEFAULT = true;
const DETAILS_PANE_WIDTH_DEFAULT      = 300;

function updateInternal(layout, action, ww) {
  // TracePane
  const tpWidthInitial = layout.tracePaneWidth;
  let tpWidth = tpWidthInitial;
  let tpVisible = layout.tracePaneIsVisible;
  // DetailsPane
  const dpWidthInitial = layout.detailsPaneWidth;
  let dpWidth = dpWidthInitial;
  let dpVisible = layout.detailsPaneIsVisible;
  // Apply PaneVisibilitySet action
  if (action.id === Action.paneVisibilitySet) {
    switch (action.paneId) {
    case 'tracePane':
      tpVisible = action.isVisible; break;
    case 'detailsPane':
      dpVisible = action.isVisible; break;
    }
  }
  // Apply paneResize action
  if (action.id === Action.paneResize) {
    switch (action.paneId) {
    case 'tracePane':
      tpWidth = action.size;
      tpVisible = tpWidth >= TRACE_PANE_WIDTH_MIN;
      break;
    case 'detailsPane':
      dpWidth = ww - action.size;
      dpVisible = dpWidth >= DETAILS_PANE_WIDTH_MIN;
      break;
    }
  }
  // Apply constraints (1)
  let d;
  if (tpVisible && dpVisible) {
    if ((d = ww - tpWidth - dpWidth - SOURCE_PANE_WIDTH_MIN) < 0) {
      if (ww >= TRACE_PANE_WIDTH_MIN + SOURCE_PANE_WIDTH_MIN + DETAILS_PANE_WIDTH_MIN
          && action.id !== Action.paneResize) {
        if (tpWidth + d/2 >= TRACE_PANE_WIDTH_MIN && dpWidth + d/2 >= DETAILS_PANE_WIDTH_MIN) {
          tpWidth += d/2;
          dpWidth += d/2;
        } else if (tpWidth - TRACE_PANE_WIDTH_MIN < dpWidth - DETAILS_PANE_WIDTH_MIN) {
          tpWidth = TRACE_PANE_WIDTH_MIN;
          dpWidth = ww - SOURCE_PANE_WIDTH_MIN - TRACE_PANE_WIDTH_MIN;
        } else {
          tpWidth = ww - SOURCE_PANE_WIDTH_MIN - DETAILS_PANE_WIDTH_MIN;
          dpWidth = DETAILS_PANE_WIDTH_MIN;
        }
      } else if (action.paneId !== 'tracePane') {
        tpWidth += d;
      } else {
        dpWidth += d;
      }
    }
  }
  // Apply constraints (2)
  if (tpVisible && (d = ww - tpWidth - SOURCE_PANE_WIDTH_MIN) < 0) { tpWidth += d; }
  if (dpVisible && (d = ww - dpWidth - SOURCE_PANE_WIDTH_MIN) < 0) { dpWidth += d; }
  if (tpWidth < TRACE_PANE_WIDTH_MIN) { tpVisible = false; tpWidth = tpWidthInitial; }
  if (dpWidth < DETAILS_PANE_WIDTH_MIN) { dpVisible = false; dpWidth = dpWidthInitial; }
  
  return {
    tracePaneIsVisible: tpVisible,
    tracePaneWidth: tpWidth,
    detailsPaneIsVisible: dpVisible,
    detailsPaneWidth: dpWidth
  };
}

export default function update(layout, action, appState) {
  const ww = appState._windowWidth || 0;
  const newLayout = updateInternal(layout || {
    tracePaneIsVisible: TRACE_PANE_VISIBILITY_DEFAULT,
    tracePaneWidth: TRACE_PANE_WIDTH_DEFAULT,
    detailsPaneIsVisible: DETAILS_PANE_VISIBILITY_DEFAULT,
    detailsPaneWidth: DETAILS_PANE_WIDTH_DEFAULT
  }, action, ww);
  if (!newLayout.tracePaneIsVisible)
    newLayout._tracePaneCanShow = updateInternal(
      newLayout, Action.paneVisibilitySet(undefined, 'tracePane', true), ww
    ).tracePaneIsVisible;
  if (!newLayout.detailsPaneIsVisible)
    newLayout._detailsPaneCanShow = updateInternal(
      newLayout, Action.paneVisibilitySet(undefined, 'detailsPane', true), ww
    ).detailsPaneIsVisible;
  return newLayout;
}

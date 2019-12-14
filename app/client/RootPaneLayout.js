import * as Action from './Action.js';

const INLINE_EDITOR_LINE_HEIGHT        = 16;
const INLINE_EDITOR_MARGIN             = 8;
const INLINE_EDITOR_HEIGHT_MIN         = 2*INLINE_EDITOR_MARGIN
  + 3*INLINE_EDITOR_LINE_HEIGHT;
const INLINE_EDITOR_VISIBILITY_DEFAULT = false;
const INLINE_EDITOR_HEIGHT_DEFAULT     = 2*INLINE_EDITOR_MARGIN
  + 5*INLINE_EDITOR_LINE_HEIGHT;
const CONTENT_AREA_HEIGHT_MIN          = 200;

function updateInternal(layout, action, wh) {
  // Inline Editor
  const ieHeightInitial = layout.inlineEditorHeight;
  let ieHeight = ieHeightInitial;
  let ieVisible = layout.inlineEditorIsVisible;

  // Apply PaneVisibilitySet action
  if (action.id === Action.paneVisibilitySet && action.paneId === 'inlineEditor') {
    ieVisible = action.isVisible;
  }

  // Apply PaneResize action
  if (action.id === Action.paneResize && action.paneId === 'inlineEditor') {
    ieVisible = true;
    ieHeight = action.size;
  }

  // Apply constraints
  if (ieVisible) {
    ieHeight = Math.min(ieHeight,  wh - CONTENT_AREA_HEIGHT_MIN);
    if (ieHeight < INLINE_EDITOR_HEIGHT_MIN) {
      ieVisible = false;
      ieHeight = ieHeightInitial;
    } else if (action.id !== Action.paneResize ||
       action.paneId !== 'inlineEditor' || action.commit
    ) {
      ieHeight += INLINE_EDITOR_LINE_HEIGHT/2+1;
      ieHeight -= (ieHeight - 2*INLINE_EDITOR_MARGIN) % INLINE_EDITOR_LINE_HEIGHT;
    }
  }
  
  return {
    inlineEditorIsVisible: ieVisible,
    inlineEditorHeight: ieHeight
  };
}

export default function update(layout, action, appState) {
  const wh = appState._windowHeight || 0;
  let newLayout = updateInternal(layout || {
    inlineEditorIsVisible: INLINE_EDITOR_VISIBILITY_DEFAULT,
    inlineEditorHeight: INLINE_EDITOR_HEIGHT_DEFAULT
  }, action, wh);
  if (!newLayout.inlineEditorIsVisible)
    newLayout._inlineEditorCanShow = updateInternal(
      newLayout, Action.paneVisibilitySet(undefined, 'inlineEditor', true), wh
    ).inlineEditorIsVisible;
  return newLayout;
}

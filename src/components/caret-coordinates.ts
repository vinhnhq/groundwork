/**
 * Where the caret is, in pixels relative to a textarea's top-left.
 *
 * A textarea exposes a caret *index* and nothing about its position, so the only
 * way to place a menu at the caret is to re-lay-out the same text somewhere
 * measurable: a mirror div that copies every property affecting line breaking,
 * filled with the text up to the caret, ending in a marker span whose offset is
 * then the caret's offset.
 *
 * The alternative is a contenteditable, which brings its own sanitisation and
 * paste-handling burden to a field that is otherwise plain text.
 */

/**
 * Everything that affects how text wraps. Missing one here shows up as a menu
 * that drifts further from the caret the longer the line gets, so the list is
 * deliberately exhaustive rather than "the ones that seemed to matter".
 */
const MIRRORED = [
  "boxSizing",
  "width",
  "borderTopWidth",
  "borderRightWidth",
  "borderBottomWidth",
  "borderLeftWidth",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "fontStyle",
  "fontVariant",
  "fontWeight",
  "fontStretch",
  "fontSize",
  "fontFamily",
  "lineHeight",
  "letterSpacing",
  "wordSpacing",
  "textTransform",
  "textIndent",
  "textRendering",
  "tabSize",
  "whiteSpace",
  "wordBreak",
  "overflowWrap",
] as const satisfies readonly (keyof CSSStyleDeclaration)[];

export type CaretPoint = { top: number; left: number; lineHeight: number };

export function caretCoordinates(el: HTMLTextAreaElement, index: number): CaretPoint {
  const style = window.getComputedStyle(el);
  const mirror = document.createElement("div");

  for (const prop of MIRRORED) {
    mirror.style.setProperty(
      // camelCase → kebab-case, which `setProperty` requires.
      prop.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`),
      style.getPropertyValue(prop.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)),
    );
  }

  // Off-screen but laid out — `display: none` would report zero offsets.
  mirror.style.position = "absolute";
  mirror.style.visibility = "hidden";
  mirror.style.top = "0";
  mirror.style.left = "-9999px";
  // A textarea always wraps and always shows its overflow as scroll, so the
  // mirror has to do the same or long text measures on the wrong line.
  mirror.style.whiteSpace = "pre-wrap";
  mirror.style.overflowWrap = "break-word";
  mirror.style.height = "auto";

  mirror.textContent = el.value.slice(0, index);

  // A zero-width marker: an empty span has no box, so it needs content to sit at
  // the caret. `​` is zero-width and does not shift the line.
  const marker = document.createElement("span");
  marker.textContent = "​";
  mirror.appendChild(marker);

  document.body.appendChild(mirror);
  const lineHeight = Number.parseFloat(style.lineHeight) || Number.parseFloat(style.fontSize) * 1.2;
  const point: CaretPoint = {
    // Subtract the scroll: the caret can sit above the visible area in a
    // textarea the user has scrolled.
    top: marker.offsetTop - el.scrollTop,
    left: marker.offsetLeft - el.scrollLeft,
    lineHeight,
  };
  document.body.removeChild(mirror);

  return point;
}

// ==UserScript==
// @name        TextMark
// @match       *://*/*
// @grant       none
// @version     1.2
// @author      none
// @description Basic UI to create text bookmarks.
// @license     MIT
// @run-at      document-end
// ==/UserScript==

let BOOKMARK_SVG = `
  <svg fill="#fc0" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
     viewBox="0 0 463.273 463.273" xml:space="preserve">
  <g>
    <g>
      <path d="M313.874,0H149.398c-16.28,0-29.477,13.197-29.476,29.477v422.368c0,4.532,2.679,8.637,6.827,10.461
        c4.148,1.824,8.983,1.025,12.324-2.038l84.84-77.788c4.369-4.006,11.076-4.006,15.446,0l84.84,77.788
        c3.34,3.063,8.175,3.863,12.324,2.038s6.827-5.929,6.827-10.461h0.001V29.477C343.351,13.197,330.154,0,313.874,0z"/>
    </g>
  </g>
  </svg>
`;

let CUSTOM_CSS = `
  .text-frag-ui-svg {
    background-image: url("data:image/svg+xml,${encodeURIComponent(BOOKMARK_SVG)}");
    background-repeat: no-repeat;
  }

  .text-frag-ui {
    z-index: 1000;
    position: fixed;
    font-size: 1vh;
    right: 1vh;
    bottom: 1vh;
    opacity: 0.25;
    transition: all 150ms;
  }

  .text-frag-ui:hover {
    opacity: 1.0;
  }

  .text-frag-ui a {
    user-select: none;
    color: #000;
    font-weight: bold;
    filter: hue-rotate(0deg);
    cursor: pointer;
    text-decoration: none;
    width: 5vh;
    height: 5vh;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .text-frag-ui-mark {
    background: #ff06;
  }
`;

const LSID = location.pathname + location.search;
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

init();

function init() {
  let style = document.createElement('style');
  style.append(CUSTOM_CSS);
  document.head.append(style);

  let uiroot = document.createElement('div');
  uiroot.className = 'text-frag-ui';
  let link = document.createElement('a');
  link.className = 'text-frag-ui-svg';
  link.textContent = '↺';
  uiroot.append(link);
  document.body.append(uiroot);

  let url = new URL(location.href);

  document.addEventListener('selectionchange', () => {
    let sel = document.getSelection();
    url.hash = ':~:text=' + encodeURIComponent(sel.toString().trim());
    //link.href = url + '';
    //console.debug('Text anchor:', url + '');
  });

  link.onclick = () => {
    //navigator.clipboard?.writeText(link.href);
    let sel = document.getSelection();
    if (!sel) return;
    let str = sel.toString().trim();
    if (!str) return;
    console.log('Selection:', str);
    let texts = localStorage[LSID] || '';
    texts = texts + (texts ? '|' : '') + str;
    localStorage[LSID] = texts;
    console.log('Updated bookmarks:', localStorage[LSID]);
    let r = sel.getRangeAt(0);
    highlightRange(r);
    sel.empty();
  };

  let num = highlightBookmarks();
  link.textContent = num;
}

function highlightBookmarks() {
  let num = 0, len = 0, ts = Date.now();
  let texts = localStorage[LSID] || '';
  let regex = new RegExp(texts, 'g');
  let ranges = [];

  if (!texts) return 0;
  console.log('Bookmarks:', texts);

  enumNodes(document.body, (range) => {
    num++;
    len += range.endOffset - range.startOffset;
    if (texts.length > 0)
      findTexts(range, regex, ranges);
  });

  for (let r of ranges)
    highlightRange(r);

  console.log('enumNodes:', Date.now() - ts, 'ms', num, 'nodes', len, 'chars');
  return ranges.length;
}

function enumNodes(root, callback) {
  let nodes = root.childNodes;

  if (!nodes.length) {
    let range = document.createRange();
    range.selectNodeContents(root);
    callback(range);
    return;
  }

  for (let node of nodes)
    enumNodes(node, callback);
}

function findTexts(range, regex, res) {
  let m = null, s = range.toString(), n = 0;

  regex.lastIndex = 0;

  while (m = regex.exec(s)) {
    let r = document.createRange();
    r.setStart(range.startContainer, m.index);
    r.setEnd(range.endContainer, m.index + m[0].length);
    res.push(r);
    n++;
    if (res.length > 1000)
      throw new Error('Too many matches');
  }

  return n;
}

function highlightRange(range) {
  let mark = document.createElement("mark");
  mark.className = 'text-frag-ui-mark';
  range.surroundContents(mark);
}

// ==UserScript==
// @name        TextMark
// @match       *://*/*
// @grant       GM.setValue
// @grant       GM.getValue
// @version     1.7
// @author      none
// @description Basic UI to create text bookmarks.
// @license     MIT
// @run-at      document-end
// ==/UserScript==

const WWW_SOURCES = [
  ['#f0f', 'https://raw.githubusercontent.com/hncompact/hncompact.github.io/refs/heads/main/textmark2'],
];

const BOOKMARK_SVG = `
  <svg fill="#fc0" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
     viewBox="0 0 463.273 463.273" xml:space="preserve">
    <path d="M313.874,0H149.398c-16.28,0-29.477,13.197-29.476,29.477v422.368c0,4.532,2.679,8.637,6.827,10.461
      c4.148,1.824,8.983,1.025,12.324-2.038l84.84-77.788c4.369-4.006,11.076-4.006,15.446,0l84.84,77.788
      c3.34,3.063,8.175,3.863,12.324,2.038s6.827-5.929,6.827-10.461h0.001V29.477C343.351,13.197,330.154,0,313.874,0z"/>
  </svg>
`;

const CUSTOM_CSS = `
  .text-frag-ui-svg {
    background-image: url("data:image/svg+xml,{encodeURIComponent(BOOKMARK_SVG)}");
    background-repeat: no-repeat;
  }

  .text-frag-ui {
    z-index: 1000;
    position: fixed;
    font-size: 1vh;
    right: 0.5vh;
    bottom: 1vh;
    opacity: 0.5;
    transition: all 150ms;
  }

  .text-frag-ui:hover {
    opacity: 1;
  }

  .text-frag-ui a {
    user-select: none;
    color: #000;
    font-weight: bold;
    cursor: pointer;
    text-decoration: none;
    width: 5vh;
    height: 5vh;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
  }

  .text-frag-ui a span {
    position: absolute;
  }

  .text-frag-ui-mark {
    background: #ff0;
    border-top-left-radius: 3pt;
    border-bottom-right-radius: 3pt;
  }
`;

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
const LSID = location.hostname + location.pathname.replace(/\/+$/, '') + location.search.replace(/\?+$/, '');

init().catch((e) => {
  setLinkText('!', 'data:,' + encodeURIComponent(e + ''));
  console.error(e);
});

function setLinkText(text, href) {
  $('.text-frag-ui a span').textContent = text;
  if (href) $('.text-frag-ui a').href = href;
}

async function init() {
  let style = document.createElement('style');
  style.append(CUSTOM_CSS);
  document.head.append(style);

  let uiroot = document.createElement('div');
  uiroot.className = 'text-frag-ui';
  let link = document.createElement('a');
  link.innerHTML = BOOKMARK_SVG;
  let span = document.createElement('span');
  link.append(span);
  uiroot.append(link);
  document.body.append(uiroot);

  setLinkText('↺');

  /*let url = new URL(location.href);
  document.addEventListener('selectionchange', () => {
    let sel = document.getSelection();
    url.hash = ':~:text=' + encodeURIComponent(sel.toString().trim());
    console.debug('Text anchor:', url + '');
  });*/

  let bookmarks = await pullLocalBookmarks();
  let highlights = 0;

  link.onclick = async () => {
    try {
      await addSelectionToBookmarks(bookmarks);
      setLinkText(++highlights);
    } catch (e) {
      setLinkText('!', 'data:,' + encodeURIComponent(e + ''));
      console.error(e);
    }
  };

  for (let [bgcolor, href] of WWW_SOURCES) {
    try {
      let texts = await pullRemoteBookmarks(href);
      highlights += highlightBookmarks(texts, bgcolor);
    } catch (e) {
      console.warn(e);
    }
  }

  highlights += highlightBookmarks(bookmarks);
  setLinkText(highlights);

  if (highlights.length)
    uiroot.style.opacity = 1;
}

function serializeBookmarksToDataURI(bookmarks) {
  let text = serializeBookmarksToText(bookmarks);
  return 'data:text/plain;charset=UTF-8,' + encodeURIComponent(text);
}

function serializeBookmarksToText(bookmarks) {
  return bookmarks.map(b => '> ' + b).join('\n\n');
}

async function addSelectionToBookmarks(bookmarks) {
  let sel = document.getSelection();
  if (!sel) return;
  let str = sel.toString().trim();
  if (!str) return;
  console.log('Selection:', str);
  let r = sel.getRangeAt(0);
  highlightRange(r);
  sel.empty();
  bookmarks.push(str);
  await saveLocalBookmarks(bookmarks);
}

async function saveLocalBookmarks(texts) {
  await GM.setValue(LSID, texts.join('|'));
}

async function pullLocalBookmarks() {
  let texts = await GM.getValue(LSID);
  return texts ? texts.split('|') : [];
}

async function pullRemoteBookmarks(href) {
  let bookmarks = [];
  let url = href + '/' + LSID;
  console.log('Pulling remote bookmarks:', url);
  //let res = await fetch(url, {method:'HEAD'});
  //if (res.status != 200) return [];
  let res = await fetch(url);
  if (res.status != 200) return [];
  let text = await res.text();
  //console.log('parsing:', text);
  let m, regex = /^>.+$/gm;
  while (m = regex.exec(text)) {
    let s = m[0].slice(1).trim();
    if (s) bookmarks.push(s);
  }
  //console.log('parsed:', bookmarks);
  return bookmarks;
}

function escapeRegex(rtext) {
  return rtext.replace(/[}|{$^?)(.*+-]|\[|\]|\\|^./gm, (c) => '\\' + c);
}

function highlightBookmarks(bookmarks, bgcolor) {
  if (!bookmarks.length)
    return 0;

  let num = 0, len = 0, ts = Date.now();
  let texts = bookmarks.map(escapeRegex);
  let rtext = texts.join('|').replace(/\s/gm, '\\s');
  let regex = new RegExp(rtext, 'gm');
  let ranges = [];

  console.log('Bookmarks:', regex);

  enumNodes(document.body, (range) => {
    num++;
    len += range.endOffset - range.startOffset;
    if (texts.length > 0)
      findTexts(range, regex, ranges);
  });

  for (let r of ranges)
    highlightRange(r, bgcolor);

  console.log('enumNodes:', Date.now() - ts, 'ms', num, 'nodes', len, 'chars');
  return ranges.length;
}

function highlightRange(range, bgcolor) {
  let mark = document.createElement("mark");
  mark.className = 'text-frag-ui-mark';
  if (bgcolor) mark.style.background = bgcolor;
  range.surroundContents(mark);
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


// ==UserScript==
// @name        TextMark
// @match       *://*/*
// @grant       GM.setValue
// @grant       GM.getValue
// @version     1.10
// @author      none
// @description Basic UI to create text bookmarks.
// @license     MIT
// @run-at      document-end
// ==/UserScript==

const WWW_SOURCES = [
  ['#f0f', 'https://raw.githubusercontent.com/hncompact/hncompact.github.io/refs/heads/main/textmark2'],
];

const SVG_BOOKMARK = `
  <svg fill="#fc0" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
     viewBox="100 0 263.273 463.273" xml:space="preserve">
    <path d="M313.874,0H149.398c-16.28,0-29.477,13.197-29.476,29.477v422.368c0,4.532,2.679,8.637,6.827,10.461
      c4.148,1.824,8.983,1.025,12.324-2.038l84.84-77.788c4.369-4.006,11.076-4.006,15.446,0l84.84,77.788
      c3.34,3.063,8.175,3.863,12.324,2.038s6.827-5.929,6.827-10.461h0.001V29.477C343.351,13.197,330.154,0,313.874,0z"/>
  </svg>
`;

const CUSTOM_CSS = `
  .text-frag-ui {
    all: revert;
    z-index: 1000;
    position: fixed;
    display: flex;
    flex-direction: row;
    font-size: 1.5vh;
    right: 2vh;
    bottom: 3vh;
  }

  .text-frag-ui a {
    user-select: none;
    opacity: 0.5;
    transition: all 150ms;
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

  .text-frag-ui a:hover {
    opacity: 1;
  }

  .text-frag-ui a span {
    position: absolute;
    font-family: monospace;
  }

  .text-frag-ui-mark {
    all: revert;
    background: #ff08;
    cursor: pointer;
  }

  .text-frag-ui-mark-selected {
    background: #fc0;
  }

  .text-frag-ui-delete svg {
    fill: #f40;
    opacity: 1;
  }
`;

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
const LSID = location.hostname + location.pathname.replace(/\/+$/, '') + location.search.replace(/\?+$/, '');

let bookmarks = [];
let highlights = 0;
let nextBookmarkId = 0;

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
  link.innerHTML = SVG_BOOKMARK;
  let span = document.createElement('span');
  link.append(span);
  uiroot.append(link);
  document.body.append(uiroot);

  setLinkText('↺');

  document.addEventListener('selectionchange', () => {
    let sel = document.getSelection();
    if (sel.toString() != '') {
      clearSelectedBookmark();
      setLinkText('+');
    } else {
      setLinkText(highlights);
    }
  });

  bookmarks = await pullLocalBookmarks();

  link.onclick = () => {
    if ($('.text-frag-ui-mark-selected')) {
      removeSelectedBookmark();
      return;
    }

    let sel = document.getSelection();
    if (sel.toString() != '') {
      addSelectionToBookmarks(bookmarks);
      return;
    }

    let marks = $$('.text-frag-ui-mark');
    let mark = marks[nextBookmarkId++ % marks.length];
    if (mark) mark.scrollIntoView();
  };

  for (let [bgcolor, href] of WWW_SOURCES) {
    try {
      let texts = await pullRemoteBookmarks(href);
      highlights += highlightBookmarks(texts, bgcolor, true);
    } catch (e) {
      console.warn(e);
    }
  }

  highlights += highlightBookmarks(bookmarks);
  setLinkText(highlights);

  if (highlights.length)
    uiroot.style.opacity = 1;

  document.body.addEventListener('click', (e) => {
    toggleSelectedBookmark(e.target);
  });
}

function removeSelectedBookmark(t = $('.text-frag-ui-mark-selected')) {
  if (!t) return;
  let str = t.textContent;
  highlights--;
  clearSelectedBookmark(t);
  let r = document.createRange();
  r.selectNodeContents(t);
  t.replaceWith(r);

  let regex = new RegExp('^' + escapeRegex(str) + '$');
  for (let i = 0; i < bookmarks.length; i++)
    if (regex.test(bookmarks[i]))
      bookmarks[i] = '';
  bookmarks = bookmarks.filter(x => !!x);
  saveLocalBookmarks(bookmarks);
}

function toggleSelectedBookmark(t) {
  if (!t.classList.contains('text-frag-ui-mark'))
      return;

  let s = $('.text-frag-ui-mark-selected');

  if (!s) {
    setSelectedBookmark(t);
  } else {
    clearSelectedBookmark(s);
    if (s != t) setSelectedBookmark(t);
  }
}

function setSelectedBookmark(t) {
  t.classList.add('text-frag-ui-mark-selected');
  setLinkText('×');
  $('.text-frag-ui').classList.add('text-frag-ui-delete');
}

function clearSelectedBookmark(t = $('.text-frag-ui-mark-selected')) {
  if (!t) return;
  t.classList.remove('text-frag-ui-mark-selected');
  setLinkText(highlights);
  $('.text-frag-ui').classList.remove('text-frag-ui-delete');
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
  sel.empty();
  let m = highlightRange(r);
  highlights++;
  //toggleSelectedBookmark(m);
  bookmarks.push(str);
  await saveLocalBookmarks(bookmarks);
}

async function saveLocalBookmarks(texts) {
  await GM.setValue(LSID, texts.join('|'));
}

async function pullLocalBookmarks() {
  let texts = await GM.getValue(LSID);
  return texts ? texts.split('|').filter(t => !!t.trim()) : [];
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
  return rtext.replace(/[}|{$^?)(.*+-]|\[|\]|\\/gm, (c) => '\\' + c).replace(/\s/gm, '\\s');
}

function highlightBookmarks(bookmarks, bgcolor) {
  if (!bookmarks.length)
    return 0;

  let num = 0, len = 0, ts = Date.now();
  let texts = bookmarks.map(escapeRegex);
  let rtext = texts.join('|');
  let regex = new RegExp(rtext, 'gm');
  let ranges = [];

  console.log('Bookmarks:', regex);

  enumNodes(document.body, (range) => {
    num++;
    len += range.endOffset - range.startOffset;
    if (texts.length > 0)
      findTexts(range, regex, ranges);
  });

  for (let i = 0; i < ranges.length; i++)
    highlightRange(ranges[i], bgcolor);

  console.log('enumNodes:', Date.now() - ts, 'ms', num, 'nodes', len, 'chars');
  return ranges.length;
}

function highlightRange(range, bgcolor) {
  let mark = document.createElement("mark");
  mark.className = 'text-frag-ui-mark';
  if (bgcolor) mark.style.background = bgcolor;
  range.surroundContents(mark);
  return mark;
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


// ==UserScript==
// @name        Text Anchor UI
// @match       *://*/*
// @grant       none
// @version     1.0
// @author      none
// @description Basic UI to create text anchors.
// @license     MIT
// @run-at      document-end
// ==/UserScript==

let CUSTOM_CSS = `
  .text-anchor-ui {
    z-index: 1000;
    position: fixed;
    font-size: 10pt;
    right: 1em;
    bottom: 1em;
    border-radius: 1em;
    background: #fc0;
    border: 1px solid #fc0;
    opacity: 0.5;
    cursor: pointer;
    padding: 0.5em;
  }

  .text-anchor-ui:hover {
    opacity: 1.0;
  }

  .text-anchor-ui a {
    text-decoration: none;
  }
`;

let $ = (s) => document.querySelector(s);
let $$ = (s) => document.querySelectorAll(s);

init();

function init() {
  console.log('Adding text anchor UI...');

  let style = document.createElement('style');
  style.append(CUSTOM_CSS);
  document.head.append(style);

  let root = document.createElement('div');
  root.className = 'text-anchor-ui';
  let link = document.createElement('a');
  link.textContent = 'A';
  root.append(link);
  document.body.append(root);

  let url = new URL(location.href);

  document.addEventListener('selectionchange', () => {
    let sel = document.getSelection();
    url.hash = ':~:text=' + encodeURIComponent(sel + '');
    link.href = url + '';
    //console.debug('Text anchor:', url + '');
  });

  root.onclick = () => {
    //navigator.clipboard?.writeText(link.href);
  };
}

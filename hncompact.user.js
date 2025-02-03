// ==UserScript==
// @name        HN SuperCompact UI
// @match       https://news.ycombinator.com/*
// @grant       none
// @version     1.4
// @author      hncompact
// @description Makes the HN UI even more compact than it is now.
// @license     MIT
// @run-at      document-end
// ==/UserScript==

let POSTS_CSS = `
  <style>
  .votelinks a { display:none }
  tr.submission .votelinks center { min-width:1em }
  tr.submission.recent .votelinks center::before { content:'*'; color:#6f0; }
  tr.submission + tr { display:none }
  tr.submission td:not(:last-child) { font-size:8pt; white-space:nowrap; text-align:right; vertical-align:top; }
  tr.submission td:first-child a:hover { text-decoration:underline }
  tr.submission .titleline .sitebit {  }
  </style>
`;

let COMMENTS_CSS = `
  <style>
  tr.comtr .votelinks center { min-width:1em }
  tr.comtr .votelinks a { display:none }
  tr.comtr:not(.coll) .reply { font-size:8pt; opacity:0.5; }
  td.ind[indent="0"] + .votelinks center::before { content:'*'; color:#444; }
  tr.comtr.recent .votelinks center::before { content:'*'; color:#6f0 !important; }
  tr.comtr .default > *:not(.comment) { display:none }
  tr.comtr a.hnuser { text-decoration:none }
  tr.comtr .navs *:not(.togg) { display:none }
  tr.comtr.coll .comment.noshow { display:inherit }
  tr.comtr.coll .comment.noshow .commtext { display:none }
  tr.comtr.coll .comment.noshow .reply > p > *:not(.comhead) { display:none }
  </style>
`;

let $ = (s) => document.querySelector(s);
let $$ = (s) => document.querySelectorAll(s);

if ($$('tr.submission').length > 0)
  init();
else
  document.addEventListener("DOMContentLoaded", init);

function init() {
  switch (location.pathname) {
    case '/':
    case '/news':
      initPosts();
      break;
    case '/item':
      initComments();
      break;
  }
}

function initPosts() {
  console.debug('Compacting the list of posts...');
  document.head.insertAdjacentHTML('beforeend', POSTS_CSS);

  for (let tr of $$('tr.submission')) {
    //console.debug('tr.id=' + tr.id);
    let tr2 = tr.nextElementSibling;
    let subtext = tr2.textContent.trim();
    let [,comms='0'] = subtext.match(/(\d+)\scomments/)||[];
    let [,score='0'] = subtext.match(/(\d+)\spoints/)||[];
    let [,time='0', units=''] = subtext.match(/(\d+)\s(\w+)\sago/)||[];
    let td1 = tr.children[0];
    td1.className = '';
    td1.textContent = '';

    let bcomms = document.createElement('b');
    bcomms.textContent = comms;

    let link = tr2.querySelector('a:last-child');
    link.remove();
    link.textContent = '';
    link.append('+' + score + ':', bcomms, '-' + time, units[0]||'');
    td1.append(link);

    for (let a of tr.querySelectorAll('.votelinks a'))
      a.remove();

    if (units.match(/minute/))
      tr.classList.add('recent');
  }
}

function initComments() {
  console.debug('Compacting the list of comments...');
  document.head.insertAdjacentHTML('beforeend', COMMENTS_CSS);

  for (let tr of $$('tr.comtr')) {
    //console.debug('tr.id=' + tr.id);
    let reply = tr.querySelector('.reply > p');
    if (!reply) continue;

    for (let a of tr.querySelectorAll('.votelinks a')) {
      let va = a.querySelector('.votearrow');
      a.textContent = va ? va.getAttribute('title') : '';
      a.remove();
      reply.append(a, ' ');
    }

    let comhead = tr.querySelector('.comhead');
    comhead.remove();
    reply.append(comhead);

    let age = reply.querySelector('.age a');
    if (age) {
      let [time, units=''] = age.textContent.split(' ');
      age.textContent = '-' + time + units[0];
      if (units.match(/minute/))
        tr.classList.add('recent');
    }

    let navs = comhead.querySelector('.navs');
    for (let node of navs ? navs.childNodes : [])
      if (node.nodeName == '#text')
        node.remove();

    let collapse = navs && navs.querySelector('a.togg');
    if (collapse && collapse.textContent.match(/^\[.\]$/))
      collapse.textContent = '[collapse]';
  }
}

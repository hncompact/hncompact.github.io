// ==UserScript==
// @name        HN SuperCompact
// @namespace   Violentmonkey Scripts
// @match       https://news.ycombinator.com/*
// @grant       none
// @version     1.0
// @author      hncompact
// @description Makes the HN UI even more compact than it is now.
// @license     MIT
// @run-at      document-end
// @include     *
// @icon        https://hncompact.github.io/favicon.ico
// ==/UserScript==

let $ = (s) => document.querySelector(s);
let $$ = (s) => document.querySelectorAll(s);

if ($$('tr.submission').length > 0)
  init();
else
  document.addEventListener("DOMContentLoaded", init);

function init() {
  if (location.pathname == '/news')
    initPosts();
  if (location.pathname == '/item')
    initComments();
}

function initPosts() {
  console.debug('Compacting the list of posts...');

  document.head.insertAdjacentHTML('beforeend',`
    <style>
    .votelinks a { display:none }
    tr.submission.recent .votelinks center::before { content:'*'; color:#6f0; }
    tr.submission + tr { display:none }
    tr.submission td:not(:last-child) { line-height:2em; font-size:8pt; white-space:nowrap; text-align:right; vertical-align:top; }
    tr.submission td:first-child a { text-decoration:underline }
    tr.submission .titleline .sitebit { display:none }
    </style>
  `);

  for (let tr of $$('tr.submission')) {
    //console.debug('tr.id=' + tr.id);
    let tr2 = tr.nextElementSibling;
    let subtext = tr2.textContent.trim();
    let [,comms='0'] = subtext.match(/(\d+)\scomments/)||[];
    let [,score='0'] = subtext.match(/(\d+)\spoints/)||[];
    let [,time='0', timeUnits=''] = subtext.match(/(\d+)\s(\w+)\sago/)||[];
    let td1 = tr.children[0];
    td1.className = '';
    td1.textContent = '';

    let link = tr2.querySelector('a:last-child');
    link.remove();
    link.textContent = comms;
    td1.append('+' + score + ':', link, '-' + time + (timeUnits[0]||''));

    for (let a of tr.querySelectorAll('.votelinks a'))
      a.remove();

    if (timeUnits.match(/minute/))
      tr.classList.add('recent');
  }
}

function initComments() {
  console.debug('Compacting the list of comments...');

  document.head.insertAdjacentHTML('beforeend',`
    <style>
    tr.comtr .votelinks a { display:none }
    tr.comtr .reply { font-size:8pt; opacity:0.5; }
    td.ind[indent="0"] + .votelinks + .default .commtext::first-letter { text-decoration:underline }
    tr.comtr.recent .votelinks center::before { content:'*'; color:#6f0 !important; }
    tr.comtr .default > *:not(.comment) { display:none }
    </style>
  `);

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

    let age = reply.querySelector('.age');
    if (age && age.textContent.match(/minute/))
      tr.classList.add('recent');
  }
}

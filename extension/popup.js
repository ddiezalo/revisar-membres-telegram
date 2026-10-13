'use strict';
document.getElementById('history').addEventListener('click', () => chrome.runtime.openOptionsPage());
document.getElementById('compare').addEventListener('click', () =>
  chrome.windows.create({url:chrome.runtime.getURL('dashboard.html'),type:'popup',width:760,height:790})
);

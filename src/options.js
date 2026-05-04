const manifest = chrome.runtime.getManifest();
const i18n = chrome.i18n.getMessage.bind(chrome.i18n);

document.querySelector('#page-title').textContent = i18n('optionsAboutTitle');
/* Commented: document.querySelector('#ext-name').textContent = manifest.name; */
document.querySelector('#ext-description').textContent = i18n('extDescription');
document.querySelector('#ext-version').textContent = manifest.version;
document.querySelector('#ext-author').textContent = manifest.author;

const homepageLink = document.querySelector('#ext-homepage');
homepageLink.href = manifest.homepage_url;
homepageLink.textContent = manifest.homepage_url;

document.querySelector('#label-version').textContent = i18n('optionsVersion');
document.querySelector('#label-author').textContent = i18n('optionsAuthor');
document.querySelector('#label-website').textContent = i18n('optionsWebsite');
document.querySelector('#label-source').textContent = i18n('optionsSourceCode');

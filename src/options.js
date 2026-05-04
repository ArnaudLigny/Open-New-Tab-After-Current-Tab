const manifest = chrome.runtime.getManifest();
const i18n = chrome.i18n.getMessage.bind(chrome.i18n);

document.getElementById('page-title').textContent = i18n('optionsAboutTitle');
/*document.getElementById('ext-name').textContent = manifest.name;*/
document.getElementById('ext-description').textContent = i18n('extDescription');
document.getElementById('ext-version').textContent = manifest.version;
document.getElementById('ext-author').textContent = manifest.author;

const homepageLink = document.getElementById('ext-homepage');
homepageLink.href = manifest.homepage_url;
homepageLink.textContent = manifest.homepage_url;

document.getElementById('label-version').textContent = i18n('optionsVersion');
document.getElementById('label-author').textContent = i18n('optionsAuthor');
document.getElementById('label-website').textContent = i18n('optionsWebsite');
document.getElementById('label-source').textContent = i18n('optionsSourceCode');

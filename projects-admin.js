const ADMIN_LOGINS = [
  { id: 'advit', password: 'admin@123' }
];

const SESSION_KEY = 'admin-logged-in';
const DRAFT_KEY = 'projects-draft';
const LAST_EXPORT_KEY = 'projects-last-export'; 

function loadDraft() {
  const saved = localStorage.getItem(DRAFT_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (err) {
      console.error('Saved draft was unreadable, starting from projects-data.js instead.', err);
    }
  }
  return typeof PROJECTS !== 'undefined' ? JSON.parse(JSON.stringify(PROJECTS)) : [];
}

let draftProjects = loadDraft();
let isAdminMode = false;
let currentOpenFolderId = null;
let formContext = { mode: 'add', lockedFolderId: null, editingId: null };
let uploadedImageDataUrl = '';

function saveDraft() {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(draftProjects));
}

function refreshGrid() {
  window.renderProjectsGrid(draftProjects, isAdminMode);
}

function moveEntryInArray(array, id, direction) {
  const sorted = array.slice().sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
  const index = sorted.findIndex(function (entry) { return entry.id === id; });
  const swapIndex = index + direction;
  if (index === -1 || swapIndex < 0 || swapIndex >= sorted.length) return false;

  const thisOrder = sorted[index].order || 0;
  sorted[index].order = sorted[swapIndex].order || 0;
  sorted[swapIndex].order = thisOrder;
  return true;
}

function getFolder(folderId) {
  return draftProjects.find(function (p) { return p.id === folderId && p.kind === 'folder'; });
}

const loginDialog = document.getElementById('login-dialog');
const loginIdInput = document.getElementById('login-id');
const loginPasswordInput = document.getElementById('login-password');
const loginError = document.getElementById('login-error');
const adminToolbar = document.getElementById('admin-toolbar');
const adminTrigger = document.getElementById('admin-trigger');

function enterAdminMode() {
  isAdminMode = true;
  sessionStorage.setItem(SESSION_KEY, 'true');
  adminToolbar.style.display = 'block';
  refreshGrid();
}

function attemptLogin() {
  const enteredId = loginIdInput.value.trim();
  const enteredPassword = loginPasswordInput.value;

  const matchFound = ADMIN_LOGINS.some(function (login) {
    return login.id === enteredId && login.password === enteredPassword;
  });

  if (matchFound) {
    loginError.textContent = '';
    loginDialog.close();
    enterAdminMode();
  } else {
    loginError.textContent = 'Incorrect ID or password.';
  }
}

document.getElementById('login-submit-btn').addEventListener('click', attemptLogin);
loginPasswordInput.addEventListener('keydown', function (event) {
  if (event.key === 'Enter') attemptLogin();
});
document.getElementById('login-cancel-btn').addEventListener('click', function () {
  loginDialog.close();
});

if (adminTrigger) {
  adminTrigger.addEventListener('click', function (event) {
    event.preventDefault();
    loginIdInput.value = '';
    loginPasswordInput.value = '';
    loginError.textContent = '';
    loginDialog.showModal();
  });
}

if (window.location.hash === '#admin' && sessionStorage.getItem(SESSION_KEY) !== 'true') {
  loginDialog.showModal();
}

if (sessionStorage.getItem(SESSION_KEY) === 'true') {
  enterAdminMode();
}

function hasUnexportedChanges() {
  const lastExport = localStorage.getItem(LAST_EXPORT_KEY);
  return lastExport !== JSON.stringify(draftProjects);
}

document.getElementById('logout-btn').addEventListener('click', function () {
  if (hasUnexportedChanges()) {
    const keepGoing = confirm(
      "You have changes that haven't been exported yet.\n\n" +
      'Logging out just switches back to viewing the published projects-data.js ' +
      "— your draft will still be here next time you log in, but the public page " +
      "won't show these changes until you Export, download the file, and redeploy it.\n\n" +
      'Log out anyway?'
    );
    if (!keepGoing) return;
  }

  sessionStorage.removeItem(SESSION_KEY);
  isAdminMode = false;
  adminToolbar.style.display = 'none';
  refreshGrid();
});

document.getElementById('projects-grid').addEventListener('click', function (event) {
  const button = event.target.closest('[data-admin-action]');
  if (!button || !isAdminMode) return;

  const card = button.closest('.project-card');
  const id = card.dataset.id;
  const entry = draftProjects.find(function (p) { return p.id === id; });
  if (!entry) return;

  const action = button.dataset.adminAction;

  if (action === 'up' || action === 'down') {
    if (moveEntryInArray(draftProjects, id, action === 'up' ? -1 : 1)) {
      saveDraft();
      refreshGrid();
    }
  } else if (action === 'delete') {
    const label = entry.kind === 'folder' ? 'this folder and everything inside it' : 'this project';
    if (!confirm('Delete ' + label + ' from your draft?')) return;
    draftProjects = draftProjects.filter(function (p) { return p.id !== id; });
    saveDraft();
    refreshGrid();
  } else if (action === 'edit') {
    if (entry.kind === 'folder') {
      openFolderDialog(id);
    } else {
      openProjectDialog({ mode: 'edit', lockedFolderId: null, editingId: id });
    }
  }
});

document.getElementById('add-project-btn').addEventListener('click', function () {
  openProjectDialog({ mode: 'add', lockedFolderId: null });
});

document.getElementById('add-folder-btn').addEventListener('click', function () {
  const name = (prompt('Folder name (e.g. "Figma Website Clones"):') || '').trim();
  if (!name) return;

  const highestOrder = draftProjects.reduce(function (max, p) { return Math.max(max, p.order || 0); }, 0);
  draftProjects.push({
    id: 'folder-' + Date.now(),
    kind: 'folder',
    title: name,
    category: 'uiux',
    description: '',
    order: highestOrder + 1,
    source: 'manual',
    items: []
  });
  saveDraft();
  refreshGrid();
});

document.getElementById('reset-draft-btn').addEventListener('click', function () {
  if (!confirm('Discard your current draft and start again from the published projects-data.js?')) return;
  localStorage.removeItem(DRAFT_KEY);
  draftProjects = typeof PROJECTS !== 'undefined' ? JSON.parse(JSON.stringify(PROJECTS)) : [];
  saveDraft();
  refreshGrid();
});

const projectDialog = document.getElementById('project-dialog');
const projectDialogHeading = document.getElementById('project-dialog-heading');
const titleInput = document.getElementById('field-title');
const categoryInput = document.getElementById('field-category');
const categoryFieldWrap = document.getElementById('category-field-wrap');
const folderSelectInput = document.getElementById('field-folder');
const folderFieldWrap = document.getElementById('folder-field-wrap');
const linkInput = document.getElementById('field-link');
const descriptionInput = document.getElementById('field-description');
const tagsInput = document.getElementById('field-tags');
const mediaTypeInput = document.getElementById('field-media-type');
const mediaUploadWrap = document.getElementById('field-media-upload-wrap');
const mediaUploadInput = document.getElementById('field-media-upload');
const mediaUrlWrap = document.getElementById('field-media-url-wrap');
const mediaUrlInput = document.getElementById('field-media-url');
const saveProjectBtn = document.getElementById('save-project-btn');
const formError = document.getElementById('project-form-error');

mediaTypeInput.addEventListener('change', function () {
  const type = mediaTypeInput.value;
  mediaUploadWrap.style.display = type === 'image' ? 'block' : 'none';
  mediaUrlWrap.style.display = (type === 'image' || type === 'embed') ? 'block' : 'none';
});

mediaUploadInput.addEventListener('change', function () {
  const file = mediaUploadInput.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function () {
    uploadedImageDataUrl = reader.result;
  };
  reader.readAsDataURL(file);
});

function populateFolderOptions(selectedFolderId) {
  folderSelectInput.innerHTML = '<option value="">— Standalone project —</option>';
  draftProjects.filter(function (p) { return p.kind === 'folder'; }).forEach(function (folder) {
    const option = document.createElement('option');
    option.value = folder.id;
    option.textContent = folder.title;
    folderSelectInput.appendChild(option);
  });
  const newFolderOption = document.createElement('option');
  newFolderOption.value = '__new__';
  newFolderOption.textContent = '+ Create new folder…';
  folderSelectInput.appendChild(newFolderOption);
  folderSelectInput.value = selectedFolderId || '';
}

function openProjectDialog(context) {
  formContext = context;
  formError.textContent = '';
  uploadedImageDataUrl = '';
  mediaUploadInput.value = '';

  const isItemContext = !!context.lockedFolderId;
  categoryFieldWrap.style.display = isItemContext ? 'none' : 'block';
  folderFieldWrap.style.display = isItemContext ? 'none' : 'block';
  if (!isItemContext) populateFolderOptions(null);

  if (context.mode === 'edit') {
    const array = isItemContext ? getFolder(context.lockedFolderId).items : draftProjects;
    const entry = array.find(function (p) { return p.id === context.editingId; });

    projectDialogHeading.textContent = 'Edit project';
    saveProjectBtn.textContent = 'Save changes';
    titleInput.value = entry.title;
    categoryInput.value = entry.category || 'uiux';
    linkInput.value = entry.link || '';
    descriptionInput.value = entry.description || '';
    tagsInput.value = (entry.tags || []).join(', ');

    const mediaType = entry.media ? entry.media.type : 'none';
    const mediaSrc = (entry.media && entry.media.src) || '';
    mediaTypeInput.value = mediaType;
    mediaUploadWrap.style.display = mediaType === 'image' ? 'block' : 'none';
    mediaUrlWrap.style.display = (mediaType === 'image' || mediaType === 'embed') ? 'block' : 'none';

    const isDataUrl = mediaSrc.indexOf('data:') === 0;
    mediaUrlInput.value = isDataUrl ? '' : mediaSrc;
    uploadedImageDataUrl = isDataUrl ? mediaSrc : '';
  } else {
    projectDialogHeading.textContent = isItemContext ? 'Add project to folder' : 'Add a project';
    saveProjectBtn.textContent = 'Add project';
    titleInput.value = '';
    categoryInput.value = 'uiux';
    linkInput.value = '';
    descriptionInput.value = '';
    tagsInput.value = '';
    mediaTypeInput.value = 'none';
    mediaUploadWrap.style.display = 'none';
    mediaUrlWrap.style.display = 'none';
    mediaUrlInput.value = '';
  }

  projectDialog.showModal();
}

document.getElementById('cancel-project-btn').addEventListener('click', function () {
  projectDialog.close();
});

function resolveFolderSelection(value) {
  if (value !== '__new__') return value || null;

  const name = (prompt('New folder name:') || '').trim();
  if (!name) return null;

  const highestOrder = draftProjects.reduce(function (max, p) { return Math.max(max, p.order || 0); }, 0);
  const newFolder = {
    id: 'folder-' + Date.now(),
    kind: 'folder',
    title: name,
    category: categoryInput.value,
    description: '',
    order: highestOrder + 1,
    source: 'manual',
    items: []
  };
  draftProjects.push(newFolder);
  return newFolder.id;
}

saveProjectBtn.addEventListener('click', function () {
  const title = titleInput.value.trim();
  if (!title) {
    formError.textContent = 'Give the project a title first.';
    return;
  }

  const mediaType = mediaTypeInput.value;
  let mediaSrc = '';
  if (mediaType === 'image') {
    mediaSrc = uploadedImageDataUrl || mediaUrlInput.value.trim();
  } else if (mediaType === 'embed') {
    mediaSrc = mediaUrlInput.value.trim();
  }

  const projectData = {
    kind: 'project',
    title: title,
    category: categoryInput.value,
    description: descriptionInput.value.trim(),
    tags: tagsInput.value.split(',').map(function (tag) { return tag.trim(); }).filter(Boolean),
    media: mediaType === 'none' ? { type: 'none' } : { type: mediaType, src: mediaSrc },
    link: linkInput.value.trim(),
    source: 'manual'
  };

  const isItemContext = !!formContext.lockedFolderId;

  if (formContext.mode === 'edit') {
    const array = isItemContext ? getFolder(formContext.lockedFolderId).items : draftProjects;
    const existing = array.find(function (p) { return p.id === formContext.editingId; });
    Object.assign(existing, projectData);

    if (!isItemContext && folderSelectInput.value) {
      const destinationFolderId = resolveFolderSelection(folderSelectInput.value);
      if (destinationFolderId) {
        draftProjects = draftProjects.filter(function (p) { return p.id !== existing.id; });
        const destinationItems = getFolder(destinationFolderId).items;
        existing.order = destinationItems.reduce(function (max, p) { return Math.max(max, p.order || 0); }, 0) + 1;
        destinationItems.push(existing);
      }
    }
  } else {
    let targetArray = draftProjects;
    if (isItemContext) {
      targetArray = getFolder(formContext.lockedFolderId).items;
    } else if (folderSelectInput.value) {
      const destinationFolderId = resolveFolderSelection(folderSelectInput.value);
      if (destinationFolderId) targetArray = getFolder(destinationFolderId).items;
    }

    const highestOrder = targetArray.reduce(function (max, p) { return Math.max(max, p.order || 0); }, 0);
    projectData.id = 'proj-' + Date.now();
    projectData.order = highestOrder + 1;
    targetArray.push(projectData);
  }

  saveDraft();
  projectDialog.close();
  refreshGrid();
  if (currentOpenFolderId) renderFolderDialogContents(currentOpenFolderId);
});

const folderDialog = document.getElementById('folder-dialog');
const folderDialogTitle = document.getElementById('folder-dialog-title');
const folderDialogDesc = document.getElementById('folder-dialog-desc');
const folderItemsList = document.getElementById('folder-items-list');
const folderAdminRow = document.getElementById('folder-admin-row');

function openFolderDialog(folderId) {
  currentOpenFolderId = folderId;
  renderFolderDialogContents(folderId);
  folderDialog.showModal();
}
window.openFolderDialog = openFolderDialog;

function renderFolderDialogContents(folderId) {
  // The public page (not logged in) renders from PROJECTS, not the draft.
  const source = isAdminMode ? draftProjects : (typeof PROJECTS !== 'undefined' ? PROJECTS : []);
  const folder = source.find(function (p) { return p.id === folderId; });
  if (!folder) {
    folderDialog.close();
    return;
  }

  folderDialogTitle.textContent = folder.title;
  folderDialogDesc.textContent = folder.description || '';
  folderAdminRow.style.display = isAdminMode ? 'flex' : 'none';

  folderItemsList.innerHTML = '';
  const sortedItems = (folder.items || []).slice().sort(function (a, b) {
    return (a.order || 0) - (b.order || 0);
  });

  if (sortedItems.length === 0) {
    folderItemsList.innerHTML = '<p class="admin-subtext">Nothing in this folder yet.</p>';
  }

  sortedItems.forEach(function (item) {
    const row = document.createElement('div');
    row.className = 'admin-list-item';

    let mediaPreview = '';
    if (item.media && item.media.type === 'image' && item.media.src) {
      mediaPreview = '<img src="' + item.media.src + '" alt="" style="width:50px; height:50px; object-fit:cover; border:2px solid #1E2A4A; border-radius:4px; flex-shrink:0;">';
    }

    row.innerHTML =
      mediaPreview +
      '<div class="admin-list-item-info">' +
        '<div class="admin-list-item-title">' + item.title + '</div>' +
        '<div class="admin-list-item-meta">' + (item.description || '') + '</div>' +
      '</div>';

    if (isAdminMode) {
      const actions = document.createElement('div');
      actions.className = 'admin-list-item-actions';
      actions.innerHTML =
        '<button class="admin-btn secondary small" data-action="up">&uarr;</button>' +
        '<button class="admin-btn secondary small" data-action="down">&darr;</button>' +
        '<button class="admin-btn secondary small" data-action="edit">Edit</button>' +
        '<button class="admin-btn danger small" data-action="delete">Delete</button>';

      actions.querySelector('[data-action="up"]').addEventListener('click', function () {
        if (moveEntryInArray(folder.items, item.id, -1)) {
          saveDraft();
          renderFolderDialogContents(folderId);
        }
      });
      actions.querySelector('[data-action="down"]').addEventListener('click', function () {
        if (moveEntryInArray(folder.items, item.id, 1)) {
          saveDraft();
          renderFolderDialogContents(folderId);
        }
      });
      actions.querySelector('[data-action="edit"]').addEventListener('click', function () {
        openProjectDialog({ mode: 'edit', lockedFolderId: folderId, editingId: item.id });
      });
      actions.querySelector('[data-action="delete"]').addEventListener('click', function () {
        if (!confirm('Delete this item from the folder?')) return;
        folder.items = folder.items.filter(function (p) { return p.id !== item.id; });
        saveDraft();
        renderFolderDialogContents(folderId);
        refreshGrid();
      });

      row.appendChild(actions);
    } else if (item.link) {
      const link = document.createElement('a');
      link.href = item.link;
      link.target = '_blank';
      link.rel = 'noopener';
      link.className = 'project-link';
      link.textContent = 'View \u2192';
      row.appendChild(link);
    }

    folderItemsList.appendChild(row);
  });
}

document.getElementById('add-item-to-folder-btn').addEventListener('click', function () {
  openProjectDialog({ mode: 'add', lockedFolderId: currentOpenFolderId });
});

document.getElementById('delete-folder-btn').addEventListener('click', function () {
  if (!confirm('Delete this whole folder and everything inside it?')) return;
  draftProjects = draftProjects.filter(function (p) { return p.id !== currentOpenFolderId; });
  saveDraft();
  folderDialog.close();
  refreshGrid();
});

document.getElementById('close-folder-btn').addEventListener('click', function () {
  folderDialog.close();
});

const githubUsernameInput = document.getElementById('github-username');
const githubIncludeForks = document.getElementById('github-include-forks');
const githubStatus = document.getElementById('github-status');
const githubListEl = document.getElementById('github-list');

function guessCategory(language) {
  if (!language) return 'webdev';
  const lang = language.toLowerCase();
  if (lang === 'python') return 'python';
  if (lang === 'java') return 'java';
  return 'webdev';
}

document.getElementById('github-fetch-btn').addEventListener('click', async function () {
  const username = githubUsernameInput.value.trim();
  if (!username) {
    githubStatus.textContent = 'Enter a GitHub username first.';
    return;
  }

  githubStatus.textContent = 'Fetching…';
  githubListEl.innerHTML = '';

  try {
    const response = await fetch(
      'https://api.github.com/users/' + encodeURIComponent(username) + '/repos?per_page=100&sort=pushed'
    );
    if (!response.ok) throw new Error('GitHub returned ' + response.status);

    const repos = await response.json();
    const includeForks = githubIncludeForks.checked;
    const filteredRepos = repos.filter(function (repo) { return includeForks || !repo.fork; });

    if (filteredRepos.length === 0) {
      githubStatus.textContent = 'No public repos found for that username.';
      return;
    }

    githubStatus.textContent = filteredRepos.length + ' repos found — add the ones you want below.';

    const alreadyAddedLinks = draftProjects
      .filter(function (p) { return p.source === 'github'; })
      .map(function (p) { return p.link; });

    filteredRepos.forEach(function (repo) {
      const row = document.createElement('div');
      row.className = 'admin-github-item';

      if (alreadyAddedLinks.indexOf(repo.html_url) !== -1) {
        row.innerHTML = '<div class="admin-github-item-info"><strong>' + repo.name + '</strong> — already added</div>';
        githubListEl.appendChild(row);
        return;
      }

      row.innerHTML =
        '<div class="admin-github-item-info">' +
          '<strong>' + repo.name + '</strong>' +
          (repo.description ? '<div class="admin-list-item-meta">' + repo.description + '</div>' : '') +
        '</div>' +
        '<select class="repo-category"></select>' +
        '<button class="admin-btn small" data-action="add-repo" type="button">Add</button>';

      const select = row.querySelector('.repo-category');
      ['uiux', 'webdev', 'python', 'java', 'prompt'].forEach(function (category) {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        select.appendChild(option);
      });
      select.value = guessCategory(repo.language);

      row.querySelector('[data-action="add-repo"]').addEventListener('click', function () {
        const highestOrder = draftProjects.reduce(function (max, p) { return Math.max(max, p.order || 0); }, 0);
        draftProjects.push({
          id: 'proj-' + Date.now(),
          kind: 'project',
          title: repo.name,
          category: select.value,
          description: repo.description || '',
          tags: repo.language ? [repo.language] : [],
          media: { type: 'none' },
          link: repo.html_url,
          order: highestOrder + 1,
          source: 'github'
        });
        saveDraft();
        refreshGrid();
        row.innerHTML = '<div class="admin-github-item-info"><strong>' + repo.name + '</strong> — added</div>';
      });

      githubListEl.appendChild(row);
    });
  } catch (err) {
    githubStatus.textContent = 'Could not fetch repos (' + err.message + '). Double check the username and your connection.';
  }
});

const exportDialog = document.getElementById('export-dialog');
const exportBox = document.getElementById('export-box');
const exportStatus = document.getElementById('export-status');

function buildExportFileText() {
  const sorted = draftProjects.slice().sort(function (a, b) { return (a.order || 0) - (b.order || 0); });

  const header =
    '// ---------------------------------------------------------\n' +
    '// projects-data.js\n' +
    '// Generated from the admin panel on ' + new Date().toISOString().slice(0, 10) + '.\n' +
    '// Replace the existing projects-data.js in your project folder with\n' +
    '// this file, then redeploy.\n' +
    '// ---------------------------------------------------------\n\n';

  return header + 'const PROJECTS = ' + JSON.stringify(sorted, null, 2) + ';\n';
}

document.getElementById('export-btn').addEventListener('click', function () {
  exportBox.value = buildExportFileText();
  exportStatus.textContent = 'Generated from your current draft.';
  exportDialog.showModal();
});

document.getElementById('close-export-btn').addEventListener('click', function () {
  exportDialog.close();
});

document.getElementById('download-btn').addEventListener('click', function () {
  const text = exportBox.value || buildExportFileText();
  const blob = new Blob([text], { type: 'text/javascript' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'projects-data.js';
  link.click();
  URL.revokeObjectURL(url);
  localStorage.setItem(LAST_EXPORT_KEY, JSON.stringify(draftProjects));
  exportStatus.textContent = 'Downloaded. Replace projects-data.js in your project folder, then redeploy.';
});

document.getElementById('copy-btn').addEventListener('click', async function () {
  const text = exportBox.value || buildExportFileText();
  try {
    await navigator.clipboard.writeText(text);
    localStorage.setItem(LAST_EXPORT_KEY, JSON.stringify(draftProjects));
    exportStatus.textContent = 'Copied to clipboard.';
  } catch (err) {
    exportStatus.textContent = 'Could not copy automatically — select the text above and copy it manually.';
  }
});
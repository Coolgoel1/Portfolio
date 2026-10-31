const hamburger = document.getElementById('hamburger');
const navLinks = document.querySelector('.navlinks');

if (hamburger && navLinks) {
  hamburger.addEventListener('click', function () {
    const isOpen = navLinks.classList.toggle('open');
    hamburger.classList.toggle('active', isOpen);
    hamburger.setAttribute('aria-expanded', isOpen);
  });

  const links = navLinks.querySelectorAll('a');
  links.forEach(function (link) {
    link.addEventListener('click', function () {
      navLinks.classList.remove('open');
      hamburger.classList.remove('active');
      hamburger.setAttribute('aria-expanded', 'false');
    });
  });
}
const header = document.querySelector('header');

if (header) {
  window.addEventListener('scroll', function () {
    header.classList.toggle('scrolled', window.scrollY > 10);
  });
}

function buildProjectCardInner(project) {
  let mediaHtml = '';
  if (project.media && project.media.type === 'image' && project.media.src) {
    mediaHtml = '<img class="project-media" src="' + project.media.src + '" alt="' + project.title + '">';
  } else if (project.media && project.media.type === 'embed' && project.media.src) {
    mediaHtml = '<iframe class="project-media project-embed" src="' + project.media.src + '" loading="lazy"></iframe>';
  }

  const tagsHtml = (project.tags || [])
    .map(function (tag) { return '<span class="project-tag">' + tag + '</span>'; })
    .join('');

  const linkHtml = project.link
    ? '<br><a class="project-link" href="' + project.link + '" target="_blank" rel="noopener">View project &rarr;</a>'
    : '';

  return (
    mediaHtml +
    '<h2 class="project-card-title">' + project.title + '</h2>' +
    '<p class="project-card-body">' + (project.description || '') + '</p>' +
    tagsHtml +
    linkHtml
  );
}

function buildFolderCardInner(folder) {
  const count = (folder.items || []).length;
  return (
    '<div class="folder-badge">📁 ' + count + (count === 1 ? ' project inside' : ' projects inside') + '</div>' +
    '<h2 class="project-card-title">' + folder.title + '</h2>' +
    '<p class="project-card-body">' + (folder.description || '') + '</p>' +
    '<span class="project-link">View all &rarr;</span>'
  );
}

function renderProjectsGrid(source, adminMode) {
  const grid = document.getElementById('projects-grid');
  if (!grid) return;

  grid.innerHTML = '';

  const sorted = source.slice().sort(function (a, b) { return a.order - b.order; });

  sorted.forEach(function (entry) {
    const card = document.createElement('div');
    card.className = entry.kind === 'folder' ? 'project-card folder-card' : 'project-card';
    card.dataset.category = entry.category;
    card.dataset.id = entry.id;

    card.innerHTML = entry.kind === 'folder' ? buildFolderCardInner(entry) : buildProjectCardInner(entry);

    if (adminMode) {
      const controls = document.createElement('div');
      controls.className = 'card-admin-controls';
      controls.innerHTML =
        '<button type="button" class="card-admin-btn" data-admin-action="up" title="Move up">&uarr;</button>' +
        '<button type="button" class="card-admin-btn" data-admin-action="down" title="Move down">&darr;</button>' +
        '<button type="button" class="card-admin-btn" data-admin-action="edit" title="Edit">&#9998;</button>' +
        '<button type="button" class="card-admin-btn" data-admin-action="delete" title="Delete">&#128465;</button>';
      card.appendChild(controls);
    }

    grid.appendChild(card);
  });

  reapplyActiveFilter();
}
window.renderProjectsGrid = renderProjectsGrid;

function reapplyActiveFilter() {
  const activeButton = document.querySelector('.filter-btn.active') || document.querySelector('.filter-btn[data-filter="all"]');
  if (!activeButton) return;

  const chosenCategory = activeButton.dataset.filter;
  document.querySelectorAll('.project-card').forEach(function (card) {
    const cardMatches = chosenCategory === 'all' || card.dataset.category === chosenCategory;
    card.style.display = cardMatches ? '' : 'none';
  });
}

if (document.getElementById('projects-grid') && typeof PROJECTS !== 'undefined') {
  renderProjectsGrid(PROJECTS, false);
}

document.querySelectorAll('.filter-btn').forEach(function (button) {
  button.addEventListener('click', function () {
    document.querySelectorAll('.filter-btn').forEach(function (btn) {
      btn.classList.remove('active');
    });
    button.classList.add('active');
    reapplyActiveFilter();
  });
});

document.addEventListener('click', function (event) {
  const adminButton = event.target.closest('[data-admin-action]');
  if (adminButton) return; // let projects-admin.js handle these

  const folderCard = event.target.closest('.folder-card');
  if (folderCard && typeof window.openFolderDialog === 'function') {
    window.openFolderDialog(folderCard.dataset.id);
  }
});
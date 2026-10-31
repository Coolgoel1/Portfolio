// ---------------------------------------------------------
// script.js
// Two small, independent behaviours for the site:
//   1. The mobile hamburger menu (open/close + close on link tap)
//   2. A tiny header shadow change once you scroll the page
// Nothing here needs more than querySelector, classList and
// addEventListener, so feel free to read through and tweak it.
// ---------------------------------------------------------

// Grab the hamburger button and the nav links list.
// Every page has the same header, so this file works unchanged
// on index.html, about.html, resume.html, projects.html and contact.html.
const hamburger = document.getElementById('hamburger');
const navLinks = document.querySelector('.navlinks');

if (hamburger && navLinks) {
  hamburger.addEventListener('click', function () {
    // classList.toggle returns true if the class ended up being added,
    // so we can reuse that to keep the button and the menu in sync.
    const isOpen = navLinks.classList.toggle('open');
    hamburger.classList.toggle('active', isOpen);
    hamburger.setAttribute('aria-expanded', isOpen);
  });

  // Once someone taps a link in the open mobile menu, close it again
  // instead of leaving it open behind the new page.
  const links = navLinks.querySelectorAll('a');
  links.forEach(function (link) {
    link.addEventListener('click', function () {
      navLinks.classList.remove('open');
      hamburger.classList.remove('active');
      hamburger.setAttribute('aria-expanded', 'false');
    });
  });
}

// Give the header a very slightly deeper shadow once the page has
// scrolled a bit, just enough to show it's sitting above the content.
const header = document.querySelector('header');

if (header) {
  window.addEventListener('scroll', function () {
    header.classList.toggle('scrolled', window.scrollY > 10);
  });
}

// ---------------------------------------------------------
// Projects page: build cards from a PROJECTS-shaped array, then let
// the filter buttons show/hide by category.
//
// renderProjectsGrid() is shared with projects-admin.js: the public
// page calls it once with the published PROJECTS array, and the admin
// panel calls it again (with adminMode: true) every time something is
// added, edited, reordered or deleted, so the grid you're looking at
// is always exactly what's about to be exported — no separate preview.
// ---------------------------------------------------------

// Turns one project object into <div class="project-card"> markup.
// Handles the three media types a project can have: none, an image,
// or an embed (e.g. a Figma "Share > Embed" link).
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

// A folder card looks like a normal card but shows how many projects
// are inside instead of a description, and opens the folder dialog
// (handled in projects-admin.js) when clicked.
function buildFolderCardInner(folder) {
  const count = (folder.items || []).length;
  return (
    '<div class="folder-badge">📁 ' + count + (count === 1 ? ' project inside' : ' projects inside') + '</div>' +
    '<h2 class="project-card-title">' + folder.title + '</h2>' +
    '<p class="project-card-body">' + (folder.description || '') + '</p>' +
    '<span class="project-link">View all &rarr;</span>'
  );
}

// Builds the full grid of cards. source = the PROJECTS-shaped array
// to render (either the published PROJECTS, or the admin's draft).
// adminMode = true adds the small edit/delete/reorder controls onto
// each card (projects-admin.js wires those buttons up afterwards).
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

// Re-runs whichever filter button is currently marked .active, so
// re-rendering the grid (e.g. after an edit) doesn't reset the filter
// the visitor had picked.
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

// Clicking a folder card (but not one of its admin buttons) opens the
// folder dialog if projects-admin.js has defined one; harmless no-op
// on pages/sessions where it hasn't.
document.addEventListener('click', function (event) {
  const adminButton = event.target.closest('[data-admin-action]');
  if (adminButton) return; // let projects-admin.js handle these

  const folderCard = event.target.closest('.folder-card');
  if (folderCard && typeof window.openFolderDialog === 'function') {
    window.openFolderDialog(folderCard.dataset.id);
  }
});
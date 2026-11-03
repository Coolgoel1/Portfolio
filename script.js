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

const projectsGridEl = document.getElementById('projects-grid');

if (projectsGridEl) {
  fetch('./projects-data.json')
    .then(function (response) {
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return response.json();
    })
    .then(function (projects) {
      renderProjectsGrid(projects);
    })
    .catch(function (err) {
      console.error('Could not load projects-data.json:', err);
      projectsGridEl.innerHTML = '<p class="admin-subtext">Could not load projects right now.</p>';
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

  const tagsHtml = (folder.tags || [])
    .map(function (tag) { return '<span class="project-tag">' + tag + '</span>'; })
    .join('');

  return (
    '<div class="folder-badge">📁 ' + count + (count === 1 ? ' project inside' : ' projects inside') + '</div>' +
    '<h2 class="project-card-title">' + folder.title + '</h2>' +
    '<p class="project-card-body">' + (folder.description || '') + '</p>' +
    tagsHtml +
    '<span class="project-link">View all &rarr;</span>'
  );
}

let currentProjects = [];

function renderProjectsGrid(projects) {
  currentProjects = projects;

  const grid = document.getElementById('projects-grid');
  if (!grid) return;

  grid.innerHTML = '';

  projects.forEach(function (entry) {
    const card = document.createElement('div');
    card.className = entry.kind === 'folder' ? 'project-card folder-card' : 'project-card';
    card.dataset.category = entry.category;
    card.dataset.id = entry.id;
    card.innerHTML = entry.kind === 'folder' ? buildFolderCardInner(entry) : buildProjectCardInner(entry);
    grid.appendChild(card);
  });

  reapplyActiveFilter();
}

function reapplyActiveFilter() {
  const activeButton = document.querySelector('.filter-btn.active') || document.querySelector('.filter-btn[data-filter="all"]');
  if (!activeButton) return;

  const chosenCategory = activeButton.dataset.filter;
  document.querySelectorAll('.project-card').forEach(function (card) {
    const cardMatches = chosenCategory === 'all' || card.dataset.category === chosenCategory;
    card.style.display = cardMatches ? '' : 'none';
  });
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

const folderDialog = document.getElementById('folder-dialog');

function openFolderDialog(folderId) {
  const folder = currentProjects.find(function (p) { return p.id === folderId; });
  if (!folder || !folderDialog) return;

  document.getElementById('folder-dialog-title').textContent = folder.title;
  document.getElementById('folder-dialog-desc').textContent = folder.description || '';

  const listEl = document.getElementById('folder-items-list');
  listEl.innerHTML = '';

  const items = folder.items || [];
  if (items.length === 0) {
    listEl.innerHTML = '<p class="dialog-subtext">Nothing in this folder yet.</p>';
  }

  items.forEach(function (item) {
    const row = document.createElement('div');
    row.className = 'item-row';

    let mediaPreview = '';
    if (item.media && item.media.type === 'image' && item.media.src) {
      mediaPreview = '<img src="' + item.media.src + '" alt="" class="item-row-thumb">';
    }

    const linkHtml = item.link
      ? '<a class="project-link" href="' + item.link + '" target="_blank" rel="noopener">View &rarr;</a>'
      : '';

    row.innerHTML =
      mediaPreview +
      '<div class="item-row-info">' +
        '<div class="item-row-title">' + item.title + '</div>' +
        '<div class="item-row-meta">' + (item.description || '') + '</div>' +
      '</div>' +
      linkHtml;

    listEl.appendChild(row);
  });

  folderDialog.showModal();
}

if (folderDialog) {
  document.getElementById('close-folder-btn').addEventListener('click', function () {
    folderDialog.close();
  });
}

document.addEventListener('click', function (event) {
  const folderCard = event.target.closest('.folder-card');
  if (folderCard) openFolderDialog(folderCard.dataset.id);
});

const contactForm = document.getElementById('contact-form');

const CONTACT_EMAIL = 'advitgoel2811@gmail.com';

if (contactForm) {
  contactForm.addEventListener('submit', function (event) {
    event.preventDefault();

    const name = document.getElementById('contact-name').value.trim();
    const email = document.getElementById('contact-email').value.trim();
    const message = document.getElementById('contact-message').value.trim();

    const subject = 'Portfolio contact from ' + name;
    const body = 'Name: ' + name + '\nEmail: ' + email + '\n\n' + message;

    const isMobileDevice = /Android|iPhone|iPad|iPod|Windows Phone/i.test(navigator.userAgent);

    if (isMobileDevice) {
      const mailtoLink =
        'mailto:' + CONTACT_EMAIL +
        '?subject=' + encodeURIComponent(subject) +
        '&body=' + encodeURIComponent(body);
      window.location.href = mailtoLink;
    } else {
      const gmailComposeLink =
        'https://mail.google.com/mail/?view=cm&fs=1' +
        '&to=' + encodeURIComponent(CONTACT_EMAIL) +
        '&su=' + encodeURIComponent(subject) +
        '&body=' + encodeURIComponent(body);
      window.open(gmailComposeLink, '_blank', 'noopener');
    }
    contactForm.reset();
  });
}
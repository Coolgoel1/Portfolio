let hamburger = document.getElementById('hamburger');
let navLinks = document.querySelector('.navlinks');

if (hamburger && navLinks) {
  hamburger.addEventListener('click', function () {
    let isOpen = navLinks.classList.toggle('open');
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

let filterButtons = document.querySelectorAll('.filter-btn');
let projectCards = document.querySelectorAll('.project-card');

filterButtons.forEach(function (button) {
  button.addEventListener('click', function () {
    filterButtons.forEach(function (btn) {
      btn.classList.remove('active');
    });
    button.classList.add('active');
    const chosenCategory = button.dataset.filter;

    projectCards.forEach(function (card) {
      const cardMatches = chosenCategory === 'all' || card.dataset.category === chosenCategory;
      card.style.display = cardMatches ? '' : 'none';
    });
  });
});
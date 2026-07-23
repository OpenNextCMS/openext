document.addEventListener('DOMContentLoaded', function () {
  // Scroll-reveal fade up
  var animated = document.querySelectorAll('[data-animate]');
  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    animated.forEach(function (el) {
      observer.observe(el);
    });
  } else {
    animated.forEach(function (el) {
      el.classList.add('is-visible');
    });
  }

  // Mobile menu toggle
  var toggle = document.querySelector('[data-nexus-menu-toggle]');
  var menu = document.querySelector('[data-nexus-mobile-menu]');

  if (toggle && menu) {
    toggle.addEventListener('click', function () {
      var isOpen = menu.classList.toggle('is-open');
      toggle.classList.toggle('is-open', isOpen);
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    menu.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        menu.classList.remove('is-open');
        toggle.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }
});

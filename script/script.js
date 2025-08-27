document.addEventListener("DOMContentLoaded", function() {
    const elementsToAnimate = document.querySelectorAll('.fade-in-element, .timeline-container');
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    elementsToAnimate.forEach(element => {
        observer.observe(element);
    });
});

(() => {
  const nav = document.getElementById('navbarNav');
  const toggler = document.querySelector('.navbar-toggler');
  if (!nav || !toggler) return;

  const bsCollapse = bootstrap.Collapse.getOrCreateInstance(nav, { toggle: false });

  nav.querySelectorAll('.nav-link, .dropdown-item').forEach(link => {
    link.addEventListener('click', () => {
      const isMobile = getComputedStyle(toggler).display !== 'none';
      if (isMobile) bsCollapse.hide();
    });
  });

  document.addEventListener('click', (e) => {
    const clickedInside = e.target.closest('#navbarNav') || e.target.closest('.navbar-toggler');
    if (nav.classList.contains('show') && !clickedInside) bsCollapse.hide();
  });
})();

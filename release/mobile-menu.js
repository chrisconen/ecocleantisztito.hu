/* ===== ECO CLEAN V6 - MOBILE MENU JAVASCRIPT ===== */
/* Ezt add hozzá a script.js végéhez */

// ===== MOBILE MENU SYSTEM =====
const mobileToggle = document.querySelector('.nav-mobile-toggle');
const mobileMenu = document.querySelector('.nav-mobile');
const mobileOverlay = document.querySelector('.mobile-menu-overlay');
const mobileItems = document.querySelectorAll('.nav-mobile-item');

// Hamburger toggle
if (mobileToggle) {
    mobileToggle.addEventListener('click', () => {
        mobileToggle.classList.toggle('active');
        mobileMenu.classList.toggle('active');
        mobileOverlay.classList.toggle('active');
        document.body.style.overflow = mobileMenu.classList.contains('active') ? 'hidden' : '';
    });
}

// Overlay click to close
if (mobileOverlay) {
    mobileOverlay.addEventListener('click', () => {
        mobileToggle.classList.remove('active');
        mobileMenu.classList.remove('active');
        mobileOverlay.classList.remove('active');
        document.body.style.overflow = '';
    });
}

// Accordion submenu toggle
mobileItems.forEach(item => {
    const link = item.querySelector('.nav-mobile-link');
    if (link) {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            // Close other open items
            mobileItems.forEach(other => {
                if (other !== item) other.classList.remove('open');
            });
            // Toggle current item
            item.classList.toggle('open');
        });
    }
});

// Close menu when clicking a submenu link
document.querySelectorAll('.nav-mobile-submenu a').forEach(link => {
    link.addEventListener('click', () => {
        mobileToggle.classList.remove('active');
        mobileMenu.classList.remove('active');
        mobileOverlay.classList.remove('active');
        document.body.style.overflow = '';
    });
});

// Close menu on escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mobileMenu && mobileMenu.classList.contains('active')) {
        mobileToggle.classList.remove('active');
        mobileMenu.classList.remove('active');
        mobileOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }
});

// Close menu on window resize (if goes to desktop)
window.addEventListener('resize', () => {
    if (window.innerWidth > 768 && mobileMenu && mobileMenu.classList.contains('active')) {
        mobileToggle.classList.remove('active');
        mobileMenu.classList.remove('active');
        mobileOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }
});

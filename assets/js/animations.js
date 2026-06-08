// ═══════════════════════════════════════════════════════════════
// ECO CLEAN - ANIMATIONS.JS
// Scroll Reveal & Interaction Animations
// ═══════════════════════════════════════════════════════════════

(function () {
    'use strict';

    // ═══════════════════════════════════════════════════════════════
    // SCROLL REVEAL
    // ═══════════════════════════════════════════════════════════════

    const revealElements = document.querySelectorAll('.reveal, .trust-item, .service-card, .why-card, .review-card, .timeline-item');

    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
                revealObserver.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    revealElements.forEach(el => {
        revealObserver.observe(el);
    });

    // ═══════════════════════════════════════════════════════════════
    // COUNTER ANIMATION
    // ═══════════════════════════════════════════════════════════════

    function animateCounter(element, target, duration = 2000) {
        let start = 0;
        const increment = target / (duration / 16);

        const timer = setInterval(() => {
            start += increment;
            element.textContent = Math.floor(start);

            if (start >= target) {
                element.textContent = target + '+';
                clearInterval(timer);
            }
        }, 16);
    }

    const counterElements = document.querySelectorAll('.trust-number[data-target]');

    const counterObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const target = parseInt(entry.target.getAttribute('data-target'));
                animateCounter(entry.target, target);
                counterObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    counterElements.forEach(el => {
        counterObserver.observe(el);
    });

    // ═══════════════════════════════════════════════════════════════
    // RIPPLE EFFECT
    // ═══════════════════════════════════════════════════════════════

    const serviceCards = document.querySelectorAll('.service-card');

    serviceCards.forEach(card => {
        card.addEventListener('click', function (e) {
            const rippleContainer = this.querySelector('.ripple-container');
            if (!rippleContainer) return;

            const ripple = document.createElement('span');
            ripple.classList.add('ripple');

            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;

            ripple.style.width = ripple.style.height = size + 'px';
            ripple.style.left = x + 'px';
            ripple.style.top = y + 'px';

            rippleContainer.appendChild(ripple);

            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // 3D TILT EFFECT
    // ═══════════════════════════════════════════════════════════════

    const tiltElements = document.querySelectorAll('[data-tilt]');

    tiltElements.forEach(element => {
        element.addEventListener('mousemove', function (e) {
            const rect = this.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const centerX = rect.width / 2;
            const centerY = rect.height / 2;

            const rotateX = (y - centerY) / 10;
            const rotateY = (centerX - x) / 10;

            this.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.05, 1.05, 1.05)`;
        });

        element.addEventListener('mouseleave', function () {
            this.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
        });
    });

    // ═══════════════════════════════════════════════════════════════
    // BEFORE/AFTER SLIDER
    // ═══════════════════════════════════════════════════════════════

    const sliders = document.querySelectorAll('.before-after-slider input[type="range"]');

    sliders.forEach(slider => {
        const container = slider.parentElement;
        const afterImage = container.querySelector('.after-image');
        const arrows = container.querySelector('.slider-arrows');

        slider.addEventListener('input', function () {
            const value = this.value;
            const percentage = value + '%';

            // Update after image clip
            afterImage.style.clipPath = `inset(0 ${100 - value}% 0 0)`;

            // Move vertical line (::before pseudo-element via CSS variable)
            container.style.setProperty('--slider-position', percentage);

            // Move handle and arrows
            if (arrows) {
                arrows.style.left = percentage;
            }
        });

        // Set initial position
        const initialValue = slider.value;
        const initialPercentage = initialValue + '%';
        container.style.setProperty('--slider-position', initialPercentage);
        if (arrows) {
            arrows.style.left = initialPercentage;
        }
    });

})();

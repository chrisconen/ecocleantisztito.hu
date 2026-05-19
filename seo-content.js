// ECO Clean - SEO Content Interactive Features
// FAQ Accordion functionality

document.addEventListener('DOMContentLoaded', function () {
    // FAQ Accordion – egyszerre csak egy item nyitva
    const faqItems = document.querySelectorAll('.faq-item');

    faqItems.forEach((item) => {
        item.addEventListener('click', function () {
            const isActive = this.classList.contains('faq-active');

            // Zárjuk be az összes többi item-et
            faqItems.forEach((other) => {
                other.classList.remove('faq-active');
                other.setAttribute('aria-expanded', 'false');
            });

            // Ha nem volt nyitva, nyissuk ki
            if (!isActive) {
                this.classList.add('faq-active');
                this.setAttribute('aria-expanded', 'true');
            }
        });

        // Keyboard accessibility
        item.setAttribute('tabindex', '0');
        item.setAttribute('role', 'button');
        item.setAttribute('aria-expanded', 'false');

        item.addEventListener('keypress', function (e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.click();
            }
        });
    });

    // Smooth scroll for service area links
    const zoneCards = document.querySelectorAll('.zone-card');
    zoneCards.forEach(card => {
        card.addEventListener('click', function () {
            this.style.transform = 'scale(0.98)';
            setTimeout(() => {
                this.style.transform = '';
            }, 200);
        });
    });

    // Intersection Observer for fade-in animations
    // (NEM faq-item-ekre – azok accordion-ként működnek)
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function (entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // Csak a kártyákat animáljuk, a faq-item-eket NEM
    const animatedElements = document.querySelectorAll('.content-block, .benefit-card, .audience-card, .zone-card, .why-us-card');
    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
});


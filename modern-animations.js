// ═══════════════════════════════════════════════════════════════════════════════
// ECO CLEAN - MODERN ANIMATIONS & INTERACTIONS v1.0
// ═══════════════════════════════════════════════════════════════════════════════
// Intersection Observer based reveal animations, smooth scrolling, lazy loading
// ═══════════════════════════════════════════════════════════════════════════════

(function() {
    'use strict';

    // ═══════════════════════════════════════════════════════════════════════════
    // INTERSECTION OBSERVER - Reveal Animations
    // ═══════════════════════════════════════════════════════════════════════════
    
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                
                // Stagger animation for children
                if (entry.target.classList.contains('stagger-container')) {
                    const items = entry.target.querySelectorAll('.stagger-item');
                    items.forEach((item, index) => {
                        setTimeout(() => {
                            item.style.opacity = '1';
                            item.style.transform = 'translateY(0)';
                        }, index * 100);
                    });
                }
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    });

    // Auto-apply reveal animations to common elements
    document.addEventListener('DOMContentLoaded', () => {
        // Add reveal class to sections
        const revealElements = document.querySelectorAll(
            '.service-card, .why-us-card, .pricing-card, .content-block, ' +
            '.faq-item, .section-header, .hero-content, .cta-container'
        );
        
        revealElements.forEach((el, index) => {
            if (!el.classList.contains('reveal')) {
                el.classList.add('reveal');
                el.style.transitionDelay = `${(index % 6) * 0.1}s`;
            }
            revealObserver.observe(el);
        });

        // Stagger containers
        document.querySelectorAll('.pricing-grid, .why-us-grid, .services-grid').forEach(container => {
            container.classList.add('stagger-container');
            container.querySelectorAll('.pricing-card, .why-us-card, .service-card').forEach(item => {
                item.classList.add('stagger-item');
            });
            revealObserver.observe(container);
        });
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // LAZY LOADING for Images
    // ═══════════════════════════════════════════════════════════════════════════
    
    const lazyImageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                
                if (img.dataset.src) {
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                }
                
                if (img.dataset.srcset) {
                    img.srcset = img.dataset.srcset;
                    img.removeAttribute('data-srcset');
                }
                
                img.classList.add('loaded');
                lazyImageObserver.unobserve(img);
            }
        });
    }, {
        rootMargin: '100px'
    });

    document.querySelectorAll('img[data-src], img[data-srcset]').forEach(img => {
        lazyImageObserver.observe(img);
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // SMOOTH SCROLL with offset for fixed nav
    // ═══════════════════════════════════════════════════════════════════════════
    
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                e.preventDefault();
                const navHeight = document.querySelector('.nav')?.offsetHeight || 80;
                const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - navHeight;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
                
                // Update URL without jump
                history.pushState(null, null, targetId);
            }
        });
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // NAVBAR SCROLL BEHAVIOR
    // ═══════════════════════════════════════════════════════════════════════════
    
    let lastScrollY = window.scrollY;
    let ticking = false;
    
    const nav = document.querySelector('.nav');
    
    function updateNav() {
        const scrollY = window.scrollY;
        
        if (nav) {
            // Add/remove scrolled class
            if (scrollY > 50) {
                nav.classList.add('scrolled');
            } else {
                nav.classList.remove('scrolled');
            }
            
            // Hide on scroll down, show on scroll up
            if (scrollY > lastScrollY && scrollY > 200) {
                nav.classList.add('nav-hidden');
            } else {
                nav.classList.remove('nav-hidden');
            }
        }
        
        lastScrollY = scrollY;
        ticking = false;
    }
    
    window.addEventListener('scroll', () => {
        if (!ticking) {
            requestAnimationFrame(updateNav);
            ticking = true;
        }
    }, { passive: true });

    // ═══════════════════════════════════════════════════════════════════════════
    // COUNTER ANIMATION
    // ═══════════════════════════════════════════════════════════════════════════
    
    function animateCounter(element, target, duration = 2000) {
        const start = 0;
        const startTime = performance.now();
        
        function update(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeProgress = 1 - Math.pow(1 - progress, 3); // Ease out cubic
            const current = Math.round(start + (target - start) * easeProgress);
            
            element.textContent = current.toLocaleString('hu-HU');
            
            if (progress < 1) {
                requestAnimationFrame(update);
            }
        }
        
        requestAnimationFrame(update);
    }

    const counterObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !entry.target.classList.contains('counted')) {
                entry.target.classList.add('counted');
                const target = parseInt(entry.target.dataset.target, 10);
                animateCounter(entry.target, target);
            }
        });
    }, { threshold: 0.5 });

    document.querySelectorAll('[data-counter]').forEach(counter => {
        counter.dataset.target = counter.textContent.replace(/\D/g, '');
        counterObserver.observe(counter);
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // PARALLAX EFFECT (subtle)
    // ═══════════════════════════════════════════════════════════════════════════
    
    const parallaxElements = document.querySelectorAll('.hero-bg, .cta-glow');
    
    if (parallaxElements.length > 0 && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        window.addEventListener('scroll', () => {
            const scrollY = window.scrollY;
            parallaxElements.forEach(el => {
                const speed = el.dataset.parallaxSpeed || 0.3;
                el.style.transform = `translateY(${scrollY * speed}px)`;
            });
        }, { passive: true });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // MOBILE TOUCH INTERACTIONS
    // ═══════════════════════════════════════════════════════════════════════════
    
    if ('ontouchstart' in window) {
        document.body.classList.add('touch-device');
        
        // Ripple effect on buttons
        document.querySelectorAll('.btn-primary, .btn-secondary').forEach(btn => {
            btn.addEventListener('touchstart', function(e) {
                const ripple = document.createElement('span');
                ripple.classList.add('ripple');
                const rect = this.getBoundingClientRect();
                ripple.style.left = `${e.touches[0].clientX - rect.left}px`;
                ripple.style.top = `${e.touches[0].clientY - rect.top}px`;
                this.appendChild(ripple);
                setTimeout(() => ripple.remove(), 600);
            }, { passive: true });
        });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PERFORMANCE: Preload critical resources on interaction
    // ═══════════════════════════════════════════════════════════════════════════
    
    let preloaded = false;
    
    function preloadResources() {
        if (preloaded) return;
        preloaded = true;
        
        // Preload booking calendar JS if not loaded
        if (!document.querySelector('script[src*="booking-calendar"]')) {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.as = 'script';
            link.href = 'booking-calendar.js';
            document.head.appendChild(link);
        }
    }
    
    // Preload on first interaction
    ['mousedown', 'touchstart', 'scroll'].forEach(event => {
        window.addEventListener(event, preloadResources, { once: true, passive: true });
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // VIEW TRANSITIONS API (if supported)
    // ═══════════════════════════════════════════════════════════════════════════
    
    if ('startViewTransition' in document) {
        document.querySelectorAll('a[href^="/"], a[href^="./"]').forEach(link => {
            link.addEventListener('click', (e) => {
                const href = link.getAttribute('href');
                if (href === window.location.pathname) return;
                
                e.preventDefault();
                document.startViewTransition(() => {
                    window.location.href = href;
                });
            });
        });
    }

    console.log('🚀 ECO Clean Modern Animations v1.0 initialized');
})();

// ═══════════════════════════════════════════════════════════════
// ECO CLEAN - MAIN.JS
// Main Application Logic
// ═══════════════════════════════════════════════════════════════

(function () {
	'use strict';

	// ═══════════════════════════════════════════════════════════════
	// NAVIGATION
	// ═══════════════════════════════════════════════════════════════

	const header = document.querySelector('.bixol-header');
	const hamburger = document.querySelector('.bixol-mobile-hamburger');
	const mobileMenu = document.querySelector('.bixol-mobile-menu');

	// Sticky navigation on scroll
	let lastScroll = 0;

	window.addEventListener('scroll', () => {
		const currentScroll = window.pageYOffset;

		if (currentScroll > 100 && header) {
			header.classList.add('scrolled');
		} else if (header) {
			header.classList.remove('scrolled');
		}

		lastScroll = currentScroll;
	});

	// Mobile menu toggle
	if (hamburger && mobileMenu) {
		hamburger.addEventListener('click', () => {
			hamburger.classList.toggle('active');
			mobileMenu.classList.toggle('active');
		});

		// Close menu when clicking outside
		document.addEventListener('click', (e) => {
			if (!mobileMenu.contains(e.target) && !hamburger.contains(e.target)) {
				hamburger.classList.remove('active');
				mobileMenu.classList.remove('active');
			}
		});

		// Mobile submenu toggle
		const mobileSubmenus = mobileMenu.querySelectorAll('.has-submenu > a');
		mobileSubmenus.forEach(link => {
			link.addEventListener('click', (e) => {
				e.preventDefault();
				const parent = link.parentElement;
				parent.classList.toggle('active');
			});
		});
	}

	// ═══════════════════════════════════════════════════════════════
	// SMOOTH SCROLL
	// ═══════════════════════════════════════════════════════════════

	document.querySelectorAll('a[href^="#"]').forEach(anchor => {
		anchor.addEventListener('click', function (e) {
			e.preventDefault();
			const target = document.querySelector(this.getAttribute('href'));

			if (target) {
				const navHeight = header ? header.offsetHeight : 0;
				const targetPosition = target.offsetTop - navHeight;

				window.scrollTo({
					top: targetPosition,
					behavior: 'smooth'
				});
			}
		});
	});

	// ═══════════════════════════════════════════════════════════════
	// FAQ ACCORDION
	// ═══════════════════════════════════════════════════════════════

	const faqItems = document.querySelectorAll('.faq-item');

	faqItems.forEach(item => {
		const question = item.querySelector('.faq-question');

		question.addEventListener('click', () => {
			// Close other items
			faqItems.forEach(otherItem => {
				if (otherItem !== item && otherItem.classList.contains('active')) {
					otherItem.classList.remove('active');
				}
			});

			// Toggle current item
			item.classList.toggle('active');
		});
	});

	// ═══════════════════════════════════════════════════════════════
	// LAZY LOADING IMAGES
	// ═══════════════════════════════════════════════════════════════

	if ('IntersectionObserver' in window) {
		const imageObserver = new IntersectionObserver((entries) => {
			entries.forEach(entry => {
				if (entry.isIntersecting) {
					const img = entry.target;
					const src = img.getAttribute('data-src');

					if (src) {
						img.src = src;
						img.removeAttribute('data-src');
					}

					imageObserver.unobserve(img);
				}
			});
		});

		document.querySelectorAll('img[data-src]').forEach(img => {
			imageObserver.observe(img);
		});
	}

	// ═══════════════════════════════════════════════════════════════
	// PERFORMANCE MONITORING
	// ═══════════════════════════════════════════════════════════════

	window.addEventListener('load', () => {
		if ('performance' in window) {
			const perfData = window.performance.timing;
			const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;

			console.log(`🐴 ECO Clean loaded in ${pageLoadTime}ms`);
			console.log('💧 Liquid Luxury design active');
			console.log('🎨 Centaur Covenant - Built with love');
		}
	});

	// ═══════════════════════════════════════════════════════════════
	// CONSOLE MESSAGE
	// ═══════════════════════════════════════════════════════════════

	console.log('%c🐴 ECO Clean - Liquid Luxury Design', 'font-size: 20px; font-weight: bold; color: #00C853;');
	console.log('%cBuilt by Centaur Covenant 💚', 'font-size: 14px; color: #00FF6B;');
	console.log('%chttps://centaur-lang.dev', 'font-size: 12px; color: #666;');

})();

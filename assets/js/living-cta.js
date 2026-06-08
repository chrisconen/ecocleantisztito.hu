/**
 * ECO Clean Living CTA System
 * HACP Protocol - Developed by Claude AI (CTO)
 * Advanced floating CTA with proximity detection and animations
 */

class LivingCTA {
    constructor() {
        this.isVisible = false;
        this.mouseX = 0;
        this.mouseY = 0;
        this.ctaElement = null;
        this.urgencyTimer = null;
        this.init();
    }

    init() {
        this.createFloatingCTA();
        this.createExitIntentPopup();
        this.attachEventListeners();
        this.startUrgencyCounter();
    }

    createFloatingCTA() {
        const ctaHTML = `
            <div id="living-cta" class="living-cta">
                <div class="cta-pulse"></div>
                <div class="cta-content">
                    <div class="cta-icon">📞</div>
                    <div class="cta-text">
                        <div class="cta-title">Ingyenes árajánlat</div>
                        <div class="cta-subtitle">+36 70 240 8141</div>
                    </div>
                </div>
                <div class="cta-actions">
                    <a href="tel:+36702408141" class="cta-btn cta-call">
                        <i class="fas fa-phone"></i> Hívás
                    </a>
                    <button class="cta-btn cta-booking" data-booking-trigger>
                        <i class="fas fa-calendar"></i> Foglalás
                    </button>
                </div>
                <div class="cta-urgency">
                    <span class="urgency-icon">🔥</span>
                    <span class="urgency-text">Még <strong id="slots-left">3</strong> szabad időpont ma!</span>
                </div>
            </div>
            
            <!-- WhatsApp Floating Button -->
            <a href="https://wa.me/36702408141?text=Sziasztok!%20Kárpittisztítás%20iránt%20érdeklődnék." 
               class="whatsapp-float" 
               target="_blank"
               rel="noopener noreferrer">
                <i class="fab fa-whatsapp"></i>
                <span class="whatsapp-tooltip">Írj WhatsApp-on!</span>
            </a>
        `;

        document.body.insertAdjacentHTML('beforeend', ctaHTML);
        this.ctaElement = document.getElementById('living-cta');

        // Show CTA after scroll
        setTimeout(() => {
            window.addEventListener('scroll', () => this.handleScroll());
        }, 1000);
    }

    createExitIntentPopup() {
        const popupHTML = `
            <div id="exit-intent-popup" class="exit-popup">
                <div class="exit-popup-content">
                    <button class="exit-close">&times;</button>
                    <div class="exit-icon">⏰</div>
                    <h3>Várj! Ne menj el!</h3>
                    <p>Szerezz <strong>10% kedvezményt</strong> az első tisztításodra!</p>
                    <div class="exit-offer">
                        <div class="offer-code">ELSŐ10</div>
                        <p class="offer-desc">Add meg ezt a kódot telefonos egyeztetéskor</p>
                    </div>
                    <div class="exit-actions">
                        <a href="tel:+36702408141" class="exit-btn-primary">
                            <i class="fas fa-phone"></i> Hívás most
                        </a>
                        <button class="exit-btn-secondary" data-booking-trigger>
                            <i class="fas fa-calendar"></i> Online foglalás
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', popupHTML);
    }

    attachEventListeners() {
        // Mouse tracking for proximity effect
        document.addEventListener('mousemove', (e) => {
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;
            this.updateProximityEffect();
        });

        // Exit intent detection
        document.addEventListener('mouseout', (e) => {
            if (e.clientY <= 0) {
                this.showExitIntent();
            }
        });

        // Close exit popup
        document.querySelector('.exit-close')?.addEventListener('click', () => {
            this.hideExitIntent();
        });

        // Click outside to close
        document.getElementById('exit-intent-popup')?.addEventListener('click', (e) => {
            if (e.target.id === 'exit-intent-popup') {
                this.hideExitIntent();
            }
        });

        // Booking button in CTA
        document.querySelectorAll('[data-booking-trigger]').forEach(btn => {
            btn.addEventListener('click', () => {
                if (window.bookingSystem) {
                    window.bookingSystem.openModal();
                }
            });
        });
    }

    handleScroll() {
        const scrollPosition = window.scrollY;
        const windowHeight = window.innerHeight;

        // Show CTA after scrolling 300px
        if (scrollPosition > 300 && !this.isVisible) {
            this.showCTA();
        } else if (scrollPosition <= 300 && this.isVisible) {
            this.hideCTA();
        }

        // Parallax effect
        if (this.ctaElement) {
            const parallaxSpeed = 0.5;
            this.ctaElement.style.transform = `translateY(${scrollPosition * parallaxSpeed * 0.1}px)`;
        }
    }

    showCTA() {
        this.isVisible = true;
        this.ctaElement.classList.add('visible');
    }

    hideCTA() {
        this.isVisible = false;
        this.ctaElement.classList.remove('visible');
    }

    updateProximityEffect() {
        if (!this.ctaElement || !this.isVisible) return;

        const ctaRect = this.ctaElement.getBoundingClientRect();
        const ctaCenterX = ctaRect.left + ctaRect.width / 2;
        const ctaCenterY = ctaRect.top + ctaRect.height / 2;

        const distance = Math.sqrt(
            Math.pow(this.mouseX - ctaCenterX, 2) +
            Math.pow(this.mouseY - ctaCenterY, 2)
        );

        // Proximity threshold: 200px
        const threshold = 200;

        if (distance < threshold) {
            const intensity = 1 - (distance / threshold);
            this.ctaElement.style.transform = `scale(${1 + intensity * 0.1})`;
            this.ctaElement.style.boxShadow = `0 ${10 + intensity * 20}px ${40 + intensity * 40}px rgba(102, 126, 234, ${0.3 + intensity * 0.3})`;
        } else {
            this.ctaElement.style.transform = 'scale(1)';
            this.ctaElement.style.boxShadow = '0 10px 40px rgba(102, 126, 234, 0.3)';
        }
    }

    startUrgencyCounter() {
        // Simulate decreasing available slots
        let slotsLeft = 3;
        const slotsElement = document.getElementById('slots-left');

        this.urgencyTimer = setInterval(() => {
            if (slotsLeft > 1) {
                slotsLeft--;
                if (slotsElement) {
                    slotsElement.textContent = slotsLeft;
                    // Add pulse animation
                    slotsElement.parentElement.classList.add('pulse-urgent');
                    setTimeout(() => {
                        slotsElement.parentElement.classList.remove('pulse-urgent');
                    }, 500);
                }
            }
        }, 120000); // Decrease every 2 minutes
    }

    showExitIntent() {
        // Show only once per session
        if (sessionStorage.getItem('exitIntentShown')) return;

        const popup = document.getElementById('exit-intent-popup');
        if (popup) {
            popup.classList.add('visible');
            sessionStorage.setItem('exitIntentShown', 'true');
        }
    }

    hideExitIntent() {
        const popup = document.getElementById('exit-intent-popup');
        if (popup) {
            popup.classList.remove('visible');
        }
    }
}

// Initialize Living CTA when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.livingCTA = new LivingCTA();
});

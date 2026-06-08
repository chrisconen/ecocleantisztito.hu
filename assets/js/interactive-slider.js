/**
 * ECO Clean Interactive Before/After Slider
 * HACP Protocol - Developed by Claude AI (CTO)
 * Enhanced drag-to-compare with zoom and mobile swipe support
 */

class InteractiveSlider {
    constructor(containerSelector) {
        this.containers = document.querySelectorAll(containerSelector);
        this.activeSlider = null;
        this.isDragging = false;
        this.isZoomed = false;

        this.init();
    }

    init() {
        this.containers.forEach(container => {
            this.setupSlider(container);
        });
    }

    setupSlider(container) {
        // Create slider structure
        const beforeImg = container.querySelector('.before-image');
        const afterImg = container.querySelector('.after-image');

        if (!beforeImg || !afterImg) return;

        // Wrap images
        container.classList.add('interactive-slider-container');

        // Create slider handle
        const handle = document.createElement('div');
        handle.className = 'slider-handle';
        handle.innerHTML = `
            <div class="handle-line"></div>
            <div class="handle-circle">
                <i class="fas fa-arrows-alt-h"></i>
            </div>
            <div class="handle-line"></div>
        `;

        // Create labels
        const beforeLabel = document.createElement('div');
        beforeLabel.className = 'slider-label label-before';
        beforeLabel.textContent = 'Előtte';

        const afterLabel = document.createElement('div');
        afterLabel.className = 'slider-label label-after';
        afterLabel.textContent = 'Utána';

        // Create zoom button
        const zoomBtn = document.createElement('button');
        zoomBtn.className = 'slider-zoom-btn';
        zoomBtn.innerHTML = '<i class="fas fa-search-plus"></i>';

        container.appendChild(handle);
        container.appendChild(beforeLabel);
        container.appendChild(afterLabel);
        container.appendChild(zoomBtn);

        // Set initial position
        this.setSliderPosition(container, 50);

        // Attach event listeners
        this.attachSliderEvents(container, handle);
        this.attachZoomEvents(container, zoomBtn);
    }

    attachSliderEvents(container, handle) {
        // Mouse events
        handle.addEventListener('mousedown', (e) => {
            this.isDragging = true;
            this.activeSlider = container;
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (this.isDragging && this.activeSlider) {
                this.updateSliderPosition(e.clientX);
            }
        });

        document.addEventListener('mouseup', () => {
            this.isDragging = false;
            this.activeSlider = null;
        });

        // Touch events for mobile
        handle.addEventListener('touchstart', (e) => {
            this.isDragging = true;
            this.activeSlider = container;
            e.preventDefault();
        });

        document.addEventListener('touchmove', (e) => {
            if (this.isDragging && this.activeSlider) {
                const touch = e.touches[0];
                this.updateSliderPosition(touch.clientX);
            }
        });

        document.addEventListener('touchend', () => {
            this.isDragging = false;
            this.activeSlider = null;
        });

        // Click anywhere on container to move slider
        container.addEventListener('click', (e) => {
            if (e.target !== handle && !handle.contains(e.target)) {
                this.activeSlider = container;
                this.updateSliderPosition(e.clientX);
            }
        });
    }

    updateSliderPosition(clientX) {
        if (!this.activeSlider) return;

        const rect = this.activeSlider.getBoundingClientRect();
        const x = clientX - rect.left;
        const percentage = (x / rect.width) * 100;

        // Clamp between 0 and 100
        const clampedPercentage = Math.max(0, Math.min(100, percentage));

        this.setSliderPosition(this.activeSlider, clampedPercentage);
    }

    setSliderPosition(container, percentage) {
        const handle = container.querySelector('.slider-handle');
        const afterImg = container.querySelector('.after-image');

        if (handle && afterImg) {
            handle.style.left = `${percentage}%`;
            afterImg.style.clipPath = `inset(0 ${100 - percentage}% 0 0)`;
        }
    }

    attachZoomEvents(container, zoomBtn) {
        zoomBtn.addEventListener('click', () => {
            this.toggleZoom(container);
        });

        // Double-click to zoom
        container.addEventListener('dblclick', () => {
            this.toggleZoom(container);
        });
    }

    toggleZoom(container) {
        if (this.isZoomed) {
            container.classList.remove('zoomed');
            container.querySelector('.slider-zoom-btn').innerHTML = '<i class="fas fa-search-plus"></i>';
            this.isZoomed = false;
        } else {
            container.classList.add('zoomed');
            container.querySelector('.slider-zoom-btn').innerHTML = '<i class="fas fa-search-minus"></i>';
            this.isZoomed = true;
        }
    }
}

// Initialize sliders when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Target existing before/after image containers
    window.interactiveSlider = new InteractiveSlider('.img-wrapper');
});

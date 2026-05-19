/**

* ECO Clean — Before/After Image Comparison Slider
 * Touch + Mouse support, smooth, performant
 */
(function () {
    'use strict';

    document.querySelectorAll('.ba-slider-wrapper').forEach(function (wrapper) {
        var beforeImg = wrapper.querySelector('.ba-img-before');
        var handle = wrapper.querySelector('.ba-slider-handle');
        var knob = wrapper.querySelector('.ba-slider-knob');
        var isDragging = false;

        function setPosition(x) {
            var rect = wrapper.getBoundingClientRect();
            var pos = (x - rect.left) / rect.width;
            pos = Math.max(0.02, Math.min(0.98, pos));
            var pct = pos * 100;

            beforeImg.style.clipPath = 'inset(0 ' + (100 - pct) + '% 0 0)';
            handle.style.left = pct + '%';
            knob.style.left = pct + '%';
        }

        // Mouse events
        wrapper.addEventListener('mousedown', function (e) {
            isDragging = true;
            setPosition(e.clientX);
            e.preventDefault();
        });

        document.addEventListener('mousemove', function (e) {
            if (!isDragging) return;
            setPosition(e.clientX);
        });

        document.addEventListener('mouseup', function () {
            isDragging = false;
        });

        // Touch events
        wrapper.addEventListener('touchstart', function (e) {
            isDragging = true;
            setPosition(e.touches[0].clientX);
        }, { passive: true });

        wrapper.addEventListener('touchmove', function (e) {
            if (!isDragging) return;
            setPosition(e.touches[0].clientX);
            e.preventDefault();
        }, { passive: false });

        wrapper.addEventListener('touchend', function () {
            isDragging = false;
        });
    });
})();

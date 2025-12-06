// === UI Enhancements for GeminiAnswerBot ===
// Author: Hafizh Rizqullah
// Purpose: Add collapsible Analysis section functionality
// Safe to remove if issues occur

(function () {
    'use strict';

    // Wait for DOM to be ready
    function initCollapsibleSection() {
        const contentDisplayWrapper = document.getElementById('contentDisplayWrapper');
        if (!contentDisplayWrapper) {
            console.log('[UI Enhancement] contentDisplayWrapper not found, skipping');
            return;
        }

        // Add collapsible classes
        contentDisplayWrapper.classList.add('collapsible', 'collapsed');

        const panelHeader = contentDisplayWrapper.querySelector('.panel-header');
        if (!panelHeader) {
            console.log('[UI Enhancement] panel-header not found');
            return;
        }

        // Create chevron icon (using inline SVG to avoid dependencies)
        const chevron = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        chevron.classList.add('chevron-icon');
        chevron.setAttribute('width', '16');
        chevron.setAttribute('height', '16');
        chevron.setAttribute('viewBox', '0 0 24 24');
        chevron.setAttribute('fill', 'none');
        chevron.setAttribute('stroke', 'currentColor');
        chevron.setAttribute('stroke-width', '2.5');
        chevron.setAttribute('stroke-linecap', 'round');
        chevron.setAttribute('stroke-linejoin', 'round');
        chevron.innerHTML = '<polyline points="6 9 12 15 18 9"></polyline>';

        panelHeader.appendChild(chevron);

        // Add click handler to toggle
        panelHeader.addEventListener('click', function () {
            contentDisplayWrapper.classList.toggle('collapsed');
            console.log('[UI Enhancement] Toggled Analysis section');
        });

        console.log('[UI Enhancement] Collapsible section initialized successfully');
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initCollapsibleSection);
    } else {
        initCollapsibleSection();
    }
})();

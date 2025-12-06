/**
 * @file js/ui/ViewRenderer.js
 * @description Pure functions to render specific views and handle DOM updates.
 */

export class ViewRenderer {
    constructor(elements) {
        this.elements = elements;
    }

    /**
     * Switch the visible view.
     * @param {'loading'|'onboarding'|'quiz'|'general'|'error'} viewName 
     */
    showView(viewName) {
        const views = {
            loading: this.elements.loadingContainer, // You might need to add this to HTML
            onboarding: this.elements.onboardingContainer,
            quiz: this.elements.quizModeContainer,
            general: this.elements.generalTaskContainer,
            error: this.elements.errorContainer // You might need to add this to HTML
        };

        // Hide all
        Object.values(views).forEach(el => {
            if (el) el.classList.add('hidden');
        });

        // Show target
        const target = views[viewName];
        if (target) {
            target.classList.remove('hidden');
        } else {
            // Fallback for loading if no container exists (overlay style)
            if (viewName === 'loading') {
                // Handle loading overlay if implemented
            }
        }
    }

    renderContent(content) {
        if (this.elements.contentDisplay) {
            this.elements.contentDisplay.textContent = content;
        }
    }

    renderAnswer(html) {
        if (this.elements.answerDisplay) {
            this.elements.answerDisplay.innerHTML = html;
        }
    }

    renderExplanation(html) {
        if (this.elements.explanationDisplay) {
            this.elements.explanationDisplay.innerHTML = html;
        }
    }

    renderError(title, message) {
        // If you have a dedicated error container
        if (this.elements.errorTitle) this.elements.errorTitle.textContent = title;
        if (this.elements.errorMessage) this.elements.errorMessage.textContent = message;
        this.showView('error');
    }

    updateImageStatus(text) {
        if (this.elements.imageStatusText) {
            this.elements.imageStatusText.textContent = text;
        }
    }

    toggleCollapse(isCollapsed) {
        const wrapper = this.elements.contentDisplayWrapper;
        const icon = wrapper?.querySelector('.toggle-icon');

        if (wrapper) {
            if (isCollapsed) {
                wrapper.classList.add('collapsed');
                if (icon) icon.setAttribute('data-lucide', 'chevron-down');
            } else {
                wrapper.classList.remove('collapsed');
                if (icon) icon.setAttribute('data-lucide', 'chevron-up');
            }
            if (window.lucide) lucide.createIcons();
        }
    }
}

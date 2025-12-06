// Initialize Lucide icons when DOM is ready
document.addEventListener('DOMContentLoaded', function () {
    if (typeof lucide !== 'undefined' && lucide.createIcons) {
        lucide.createIcons();
    }
});

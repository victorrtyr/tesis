document.addEventListener('DOMContentLoaded', () => {
    // 1. Sidebar Active State
    const currentPath = window.location.pathname.split('/').pop() || 'content.html';
    const navLinks = document.querySelectorAll('.nav-item a');

    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href === currentPath) {
            link.parentElement.classList.add('active');
        }
    });

    // 2. Image Lightbox Interaction
    const figures = document.querySelectorAll('.figure img');

    // Create Modal Element
    const modal = document.createElement('div');
    modal.className = 'lightbox-modal';
    modal.style.display = 'none';
    modal.style.position = 'fixed';
    modal.style.zIndex = '1000';
    modal.style.left = '0';
    modal.style.top = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0,0,0,0.9)';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.cursor = 'zoom-out';
    modal.style.opacity = '0';
    modal.style.transition = 'opacity 0.3s ease';

    const modalImg = document.createElement('img');
    modalImg.style.maxHeight = '90%';
    modalImg.style.maxWidth = '90%';
    modalImg.style.borderRadius = '8px';
    modalImg.style.boxShadow = '0 0 20px rgba(0,0,0,0.5)';
    modalImg.style.transform = 'scale(0.9)';
    modalImg.style.transition = 'transform 0.3s ease';

    modal.appendChild(modalImg);
    document.body.appendChild(modal);

    figures.forEach(img => {
        img.addEventListener('click', () => {
            modalImg.src = img.src;
            modal.style.display = 'flex';
            // Force reflow
            void modal.offsetWidth;
            modal.style.opacity = '1';
            modalImg.style.transform = 'scale(1)';
        });
    });

    modal.addEventListener('click', () => {
        modal.style.opacity = '0';
        modalImg.style.transform = 'scale(0.9)';
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    });
});

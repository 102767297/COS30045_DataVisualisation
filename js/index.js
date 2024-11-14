function toggleSidebar() {
    const nav = document.querySelector('nav');
    const main = document.querySelector('main');
    const overlay = document.querySelector('.overlay');

    nav.classList.toggle('visible');
    main.classList.toggle('shift');
    overlay.classList.toggle('active');
}

document.addEventListener('click', function (event) {
    const nav = document.querySelector('nav');
    const main = document.querySelector('main');
    const overlay = document.querySelector('.overlay');
    const toggleBtn = document.querySelector('.toggle-btn');

    if (overlay.classList.contains('active') && !nav.contains(event.target) && event.target !== toggleBtn) {
        nav.classList.remove('visible');
        main.classList.remove('shift');
        overlay.classList.remove('active');
    }
});
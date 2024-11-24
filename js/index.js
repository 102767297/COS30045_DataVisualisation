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

// Function to load the navigation HTML into the current page
function loadNavigation() {
    fetch('./nav.html')
        .then(response => response.text())
        .then(data => {
            console.log('Fetched nav content:', data); // Log the fetched content
            const navElement = document.querySelector('nav');
            if (navElement) {
                navElement.innerHTML = data;
            } else {
                console.error('Nav element not found!');
            }
        })
        .catch(error => {
            console.error('Error loading navigation:', error);
        });
}


// Call the function when the page loads
document.addEventListener('DOMContentLoaded', function() {
    loadNavigation();
});
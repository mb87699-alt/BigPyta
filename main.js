document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. Navbar Sticky Effect ---
    const navbar = document.querySelector('.navbar');
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.style.background = 'rgba(26, 26, 26, 1)';
            navbar.style.padding = '1rem 5%';
        } else {
            navbar.style.background = 'rgba(26, 26, 26, 0.95)';
            navbar.style.padding = '1.5rem 5%';
        }
    });

    // --- 2. Smooth Scrolling dla linków ---
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });

    // --- 3. Animacje wejścia (Intersection Observer) ---
    const observerOptions = {
        threshold: 0.2
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target); // Animuj tylko raz
            }
        });
    }, observerOptions);

    const animatedElements = document.querySelectorAll('.fade-in-left, .fade-in-right');
    animatedElements.forEach(el => observer.observe(el));

    // --- 4. Obsługa Formularza (Zapis do Storage) ---
    const contactForm = document.getElementById('contactForm');
    
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const message = document.getElementById('message').value;

            // Zapisz wiadomość w LocalStorage (jako symulacja backendu)
            const newMessage = {
                id: Date.now(),
                name: name,
                email: email,
                message: message,
                date: new Date().toISOString()
            };

            // Pobierz istniejące wiadomości lub stwórz tablicę
            let messages = JSON.parse(localStorage.getItem('parkscan_messages')) || [];
            messages.push(newMessage);
            localStorage.setItem('parkscan_messages', JSON.stringify(messages));

            alert('Dziękujemy! Wiadomość została "wysłana" (zapisana w localStorage).');
            contactForm.reset();
        });
    }
});
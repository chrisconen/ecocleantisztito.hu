/* ===== ECO CLEAN V6 - JAVASCRIPT ===== */

// Theme Toggle
const themeToggle = document.getElementById('themeToggle');
const html = document.documentElement;
const savedTheme = localStorage.getItem('ecoclean-theme');

if (savedTheme) {
    html.setAttribute('data-theme', savedTheme);
} else {
    html.setAttribute('data-theme', 'dark');
}

themeToggle.addEventListener('click', () => {
    const newTheme = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', newTheme);
    localStorage.setItem('ecoclean-theme', newTheme);
});

// Nav scroll effect
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 50);
});

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
        e.preventDefault();
        const target = document.querySelector(a.getAttribute('href'));
        if (target) target.scrollIntoView({ behavior: 'smooth' });
    });
});

// ===== NEW MEGA MENU SYSTEM =====
const megaMenuContainer = document.getElementById('megaMenuContainer');
const megaMenuOverlay = document.getElementById('megaMenuOverlay');
const megaMenuContent = document.getElementById('megaMenuContent');
const navItems = document.querySelectorAll('.nav-item[data-menu]');

// Menu data for each service
const menuData = {
    karpittisztitas: {
        icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v3"/><path d="M2 11v5a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-5a2 2 0 0 0-4 0v2H6v-2a2 2 0 0 0-4 0Z"/></svg>',
        title: 'Kárpittisztítás',
        subtitle: 'Kanapé, fotel, székek mélytisztítása',
        badge: 'both',
        desc: 'Vegyszermentes kárpittisztítás otthonokba és irodákba egyaránt. Kanapékhoz, kanapéágyakhoz, fotelekhez, ebédlő székekhez és irodai székekhez.',
        cities: ['Győr', 'Sopron', 'Szombathely', 'Veszprém', 'Tatabánya', 'Komárom', 'Pápa', 'Mosonmagyaróvár', 'Tata', 'Balatonfüred', 'Siófok', 'Keszthely', 'Hévíz', 'Tihany', 'Balatonalmádi', 'Tapolca', 'Révfülöp', 'Badacsony', 'Balatonföldvár', 'Balatonlelle', 'Balatonboglár', 'Fonyód', 'Balatonszemes', 'Zamárdi', 'Balatonfűzfő', 'Balatonkenese']
    },
    matractisztitas: {
        icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/></svg>',
        title: 'Matractisztítás',
        subtitle: 'Mélytisztítás, atkairtás, fertőtlenítés',
        badge: 'both',
        desc: 'Otthoni matracok és szálláshelyek (hotelek, kollégiumok, gyermektáborok) matracainak professzionális tisztítása. Atkairtás tanúsítvánnyal.',
        cities: ['Győr', 'Sopron', 'Szombathely', 'Veszprém', 'Tatabánya', 'Komárom', 'Pápa', 'Mosonmagyaróvár', 'Tata', 'Balatonfüred', 'Siófok', 'Keszthely', 'Hévíz', 'Tihany', 'Balatonalmádi', 'Tapolca', 'Révfülöp', 'Badacsony', 'Balatonföldvár', 'Balatonlelle', 'Balatonboglár', 'Fonyód', 'Balatonszemes', 'Zamárdi', 'Balatonfűzfő', 'Balatonkenese']
    },
    szonyegtisztitas: {
        icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M2 10h20"/></svg>',
        title: 'Ipari szőnyegtisztítás',
        subtitle: 'Szőnyegpadlók, nagy felületek',
        badge: 'business',
        desc: 'Kizárólag vállalati ügyfeleknek: irodaházak, hotelek, bankok, hivatali ügyfél fogadó- és konferenciatermek szőnyegpadlóinak tisztítása.',
        cities: ['Győr', 'Sopron', 'Szombathely', 'Veszprém', 'Tatabánya', 'Komárom', 'Pápa', 'Mosonmagyaróvár', 'Tata', 'Balatonfüred', 'Siófok', 'Keszthely', 'Hévíz', 'Tihany', 'Balatonalmádi', 'Tapolca', 'Révfülöp', 'Badacsony', 'Balatonföldvár', 'Balatonlelle', 'Fonyód', 'Zamárdi']
    },
    takaritas: {
        icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 17 2 2 4-4"/><path d="m3 7 2 2 4-4"/><path d="M13 6h8"/><path d="M13 12h8"/><path d="M13 18h8"/></svg>',
        title: 'Ipari takarítás',
        subtitle: 'Irodák, üzemek, gyárak',
        badge: 'business',
        desc: 'Komplex takarítási szolgáltatások vállalatoknak: napi takarítás, nagytakarítás, építés utáni takarítás. Hivatalok, irodák rendszeres takarítása.',
        cities: ['Győr', 'Sopron', 'Szombathely', 'Veszprém', 'Tatabánya', 'Komárom', 'Pápa', 'Mosonmagyaróvár', 'Tata', 'Balatonfüred', 'Siófok', 'Keszthely', 'Hévíz', 'Tihany', 'Balatonalmádi', 'Tapolca', 'Révfülöp', 'Badacsony', 'Balatonföldvár', 'Balatonlelle', 'Fonyód', 'Zamárdi']
    },
    ablaktisztitas: {
        icon: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>',
        title: 'Ablak és kirakatmosás',
        subtitle: 'Nagy üvegfelületek tisztítása',
        badge: 'business',
        desc: 'Üzletkirakatok, irodaház homlokzatok, bevásárlóközpontok, autószalonok alkalmi és rendszeres  ablaktisztítása ipari berendezésekkel.',
        cities: ['Győr', 'Sopron', 'Szombathely', 'Veszprém', 'Tatabánya', 'Komárom', 'Pápa', 'Mosonmagyaróvár', 'Tata', 'Balatonfüred', 'Siófok', 'Keszthely', 'Hévíz', 'Tihany', 'Balatonalmádi', 'Tapolca', 'Révfülöp', 'Badacsony', 'Balatonföldvár', 'Balatonlelle', 'Fonyód', 'Zamárdi']
    }
};

let currentOpenMenu = null;

// Normalize accented menu keys to match menuData keys
function normalizeMenuKey(key) {
    return key.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ő/g, 'o').replace(/ű/g, 'u').replace(/Ő/g, 'O').replace(/Ű/g, 'U');
}

function openMegaMenu(menuKey) {
    const normalizedKey = normalizeMenuKey(menuKey);
    const data = menuData[normalizedKey];
    if (!data) return;

    // Update active state on nav items
    navItems.forEach(item => item.classList.remove('active'));
    const activeItem = document.querySelector('.nav-item[data-menu="' + menuKey + '"]');
    if (activeItem) activeItem.classList.add('active');

    // Build badge HTML
    const badgeHtml = data.badge === 'both'
        ? '<span class="badge-both">Privát + céges</span>'
        : '<span class="badge-business">Csak céges</span>';

    // Build cities HTML
    const citiesHtml = data.cities.map(city => {
        const slug = city.toLowerCase()
            .replace(/á/g, 'a').replace(/é/g, 'e').replace(/í/g, 'i')
            .replace(/ó/g, 'o').replace(/ö/g, 'o').replace(/ő/g, 'o')
            .replace(/ú/g, 'u').replace(/ü/g, 'u').replace(/ű/g, 'u');
        const href = data.directLink ? slug + '.html' : normalizedKey + '-' + slug + '.html';
        return '<a href="' + href + '" class="mega-city"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>' + city + '</a>';
    }).join('');

    // Build content
    megaMenuContent.innerHTML =
        '<div class="mega-menu-grid">' +
        '<div class="mega-menu-left">' +
        '<div class="mega-header">' +
        '<div class="mega-icon">' + data.icon + '</div>' +
        '<div class="mega-title-wrap">' +
        '<div class="mega-title">' + data.title + '</div>' +
        '<div class="mega-subtitle">' + data.subtitle + '</div>' +
        '</div>' +
        '</div>' +
        badgeHtml +
        '<p class="mega-desc" style="margin-top: 1rem;">' + data.desc + '</p>' +

        '</div>' +
        '<div class="mega-menu-right">' +
        '<div class="mega-section-label"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg> Válasszon várost</div>' +
        '<div class="mega-cities">' + citiesHtml + '</div>' +
        '</div>' +
        '</div>' +
        '<button class="mega-menu-close" id="megaMenuCloseBtn" aria-label="Bezárás"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>';

    // Show menu
    megaMenuContainer.classList.add('active');
    megaMenuOverlay.classList.add('active');
    currentOpenMenu = menuKey;

    // Attach close button event
    document.getElementById('megaMenuCloseBtn').addEventListener('click', closeMegaMenu);
}

function closeMegaMenu() {
    megaMenuContainer.classList.remove('active');
    megaMenuOverlay.classList.remove('active');
    navItems.forEach(item => item.classList.remove('active'));
    currentOpenMenu = null;
}

// Event listeners for nav items
navItems.forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const menuKey = item.getAttribute('data-menu');

        if (currentOpenMenu === menuKey) {
            closeMegaMenu();
        } else {
            openMegaMenu(menuKey);
        }
    });
});

// Close on overlay click
megaMenuOverlay.addEventListener('click', closeMegaMenu);

// Close on escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && currentOpenMenu) {
        closeMegaMenu();
    }
});

// Prevent closing when clicking inside the menu
megaMenuContainer.addEventListener('click', (e) => {
    e.stopPropagation();
});

// ===== 3D Toggle Switch with Scanner Animation =====
const btnPrivate = document.getElementById('btnPrivate');
const btnBusiness = document.getElementById('btnBusiness');
const toggleIndicator = document.getElementById('toggleIndicator');
const cardPrivate = document.getElementById('cardPrivate');
const cardBusiness = document.getElementById('cardBusiness');
let currentCard = 'private';

function switchTo(target) {
    if (currentCard === target) return;
    currentCard = target;

    btnPrivate.classList.toggle('active', target === 'private');
    btnBusiness.classList.toggle('active', target === 'business');

    toggleIndicator.classList.remove('private', 'business');
    toggleIndicator.classList.add(target);

    const hideCard = target === 'private' ? cardBusiness : cardPrivate;
    const showCard = target === 'private' ? cardPrivate : cardBusiness;

    hideCard.classList.remove('active', 'scanning');

    setTimeout(() => {
        showCard.classList.add('scanning');
        setTimeout(() => {
            showCard.classList.remove('scanning');
            showCard.classList.add('active');
        }, 600);
    }, 100);
}

if (btnPrivate && btnBusiness) {
    btnPrivate.addEventListener('click', () => switchTo('private'));
    btnBusiness.addEventListener('click', () => switchTo('business'));
}

// ===== STEP CARDS SCANNER ANIMATION =====
const stepCards = document.querySelectorAll('.step-card');

const stepObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            // Trigger scanner animation for each card in sequence
            stepCards.forEach((card, index) => {
                setTimeout(() => {
                    card.classList.add('scanning');
                    setTimeout(() => {
                        card.classList.remove('scanning');
                        card.classList.add('revealed');
                    }, 3200);
                }, index * 800); // 400ms delay between each card
            });
            stepObserver.disconnect(); // Only animate once
        }
    });
}, { threshold: .8 });

if (stepCards.length > 0) {
    stepObserver.observe(document.querySelector('.how-it-works'));
}

// Scroll reveal animations
const observerOptions = { threshold: 0.1 };
const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

document.querySelectorAll('.service-card, .coverage-card').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
});
